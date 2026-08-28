import { NextResponse } from "next/server";
import { z } from "zod";
import { authorized, isSourceKey, normalizeEmail, normalizePhone, serviceDb } from "@/lib/communications";

const eventSchema = z.object({
  source: z.string(),
  externalId: z.string().min(1).max(500),
  occurredAt: z.string().datetime(),
  direction: z.enum(["inbound", "outbound"]),
  senderName: z.string().max(500).optional(),
  senderEmail: z.string().max(500).optional(),
  senderPhone: z.string().max(100).optional(),
  companyName: z.string().max(500).optional(),
  subject: z.string().max(1000).optional(),
  body: z.string().max(100000).optional(),
  summaryZh: z.string().max(10000).optional(),
  isRealCustomer: z.boolean().default(true),
  needsReply: z.boolean().default(false),
  nextAction: z.string().max(3000).optional(),
  replyDraft: z.string().max(30000).optional(),
  researchSummary: z.string().max(30000).optional(),
});

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  const item = parsed.data;
  if (!isSourceKey(item.source)) return NextResponse.json({ error: "Source is not allowlisted" }, { status: 400 });

  const db = serviceDb();
  const now = new Date().toISOString();
  const { data: existing } = await db.from("communication_sync_events").select("id").eq("source", item.source).eq("external_id", item.externalId).maybeSingle();
  if (existing) {
    await db.rpc("add_communication_counts", { p_source_key: item.source, p_duplicate: 1 });
    return NextResponse.json({ ok: true, duplicate: true });
  }

  let customerId: string | null = null;
  let matchReason = "待人工匹配";
  const email = normalizeEmail(item.senderEmail);
  const phone = normalizePhone(item.senderPhone);
  if (phone) {
    const { data } = await db.from("contacts").select("customer_id").or(`phone.eq.${phone},whatsapp.eq.${phone}`).is("deleted_at", null).limit(2);
    if (data?.length === 1) { customerId = data[0].customer_id; matchReason = "规范化手机号完全匹配"; }
  }
  if (!customerId && email) {
    const { data } = await db.from("contacts").select("customer_id").eq("email", email).is("deleted_at", null).limit(2);
    if (data?.length === 1) { customerId = data[0].customer_id; matchReason = "邮箱完全匹配"; }
  }
  if (!customerId && item.companyName) {
    const { data } = await db.from("customers").select("id").ilike("company_name", item.companyName.trim()).is("deleted_at", null).limit(2);
    if (data?.length === 1) { customerId = data[0].id; matchReason = "唯一公司名匹配"; }
  }

  const summary = item.summaryZh || [item.subject, item.body].filter(Boolean).join("\n\n").slice(0, 10000);
  let taskId: string | null = null;
  if (item.isRealCustomer && customerId) {
    const content = item.replyDraft
      ? `${item.researchSummary || summary}\n\n待审批回复草稿：\n\n${item.replyDraft}`
      : summary || "已收到客户沟通，待人工查看原始内容。";
    const channel = item.replyDraft ? (item.source.startsWith("whatsapp:") ? "WhatsApp待审批" : "来发信邮件") : item.source;
    await db.from("follow_ups").insert({ customer_id: customerId, channel, content, result: item.replyDraft ? "待审批" : "已记录", next_action: item.nextAction || null, followed_at: item.occurredAt });
    if (item.needsReply || item.nextAction) {
      const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { data: task } = await db.from("tasks").insert({ title: item.replyDraft ? `审批并回复：${item.subject || item.senderName || "客户消息"}` : `跟进：${item.subject || item.senderName || "客户消息"}`, task_type: item.replyDraft ? "沟通审批" : "客户跟进", customer_id: customerId, due_at: dueAt, priority: "高", notes: `来源：${item.source}\n${item.nextAction || "查看新沟通并决定下一步"}` }).select("id").single();
      taskId = task?.id ?? null;
    }
  }

  const processingStatus = !item.isRealCustomer ? "已忽略非客户沟通" : customerId ? "已匹配" : "待人工匹配";
  const { error } = await db.from("communication_sync_events").insert({ source: item.source, external_id: item.externalId, customer_id: customerId, occurred_at: item.occurredAt, summary, task_id: taskId, processing_status: processingStatus, match_reason: matchReason, payload: { direction: item.direction, senderName: item.senderName, senderEmail: email, senderPhone: phone, subject: item.subject, needsReply: item.needsReply } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.rpc("add_communication_counts", {
    p_source_key: item.source,
    p_read: 1,
    p_customer: item.isRealCustomer ? 1 : 0,
    p_matched: customerId ? 1 : 0,
    p_research: item.researchSummary ? 1 : 0,
    p_follow_up: item.isRealCustomer && customerId ? 1 : 0,
    p_task: taskId ? 1 : 0,
    p_draft: item.replyDraft ? 1 : 0,
    p_manual: item.isRealCustomer && !customerId ? 1 : 0,
  });
  await db.from("communication_connections").update({ status: "已连接", last_attempt_at: now, last_success_at: now, last_error: null, cursor: item.externalId, updated_at: now }).eq("source_key", item.source);
  return NextResponse.json({ ok: true, duplicate: false, customerId, processingStatus, taskId });
}
