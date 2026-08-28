import { NextResponse } from "next/server";
import { normalizePhone, serviceDb } from "@/lib/communications";

type WhatsAppMessage = { id?: string; from?: string; timestamp?: string; type?: string; text?: { body?: string }; button?: { text?: string } };
type WhatsAppValue = { metadata?: { phone_number_id?: string; display_phone_number?: string }; messages?: WhatsAppMessage[] };
type WhatsAppWebhook = { entry?: Array<{ changes?: Array<{ value?: WhatsAppValue }> }> };

function hex(bytes: ArrayBuffer) { return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }

async function validSignature(raw: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const expected = `sha256=${hex(digest)}`;
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index++) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) return new Response(url.searchParams.get("hub.challenge") || "", { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!(await validSignature(raw, request.headers.get("x-hub-signature-256")))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  let body: WhatsAppWebhook | null = null;
  try { body = JSON.parse(raw) as WhatsAppWebhook; } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const changes = body?.entry?.flatMap((entry) => entry.changes || []) || [];
  const db = serviceDb();
  let accepted = 0;
  for (const change of changes) {
    const value = change?.value;
    const phoneNumberId = String(value?.metadata?.phone_number_id || "");
    const source = phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID_1 ? "whatsapp:business-1" : phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID_2 ? "whatsapp:business-2" : null;
    if (!source) continue;
    for (const message of value?.messages || []) {
      const text = message?.text?.body || message?.button?.text || `[${message?.type || "非文本消息"}]`;
      const externalId = String(message?.id || "");
      if (!externalId) continue;
      const from = normalizePhone(message?.from);
      const { data: contacts } = await db.from("contacts").select("customer_id").or(`phone.eq.${from},whatsapp.eq.${from}`).is("deleted_at", null).limit(2);
      const customerId = contacts?.length === 1 ? contacts[0].customer_id : null;
      const occurredAt = new Date(Number(message?.timestamp || Date.now() / 1000) * 1000).toISOString();
      const { error } = await db.from("communication_sync_events").insert({ source, external_id: externalId, customer_id: customerId, occurred_at: occurredAt, summary: text.slice(0, 10000), processing_status: customerId ? "已匹配" : "待人工匹配", match_reason: customerId ? "规范化手机号完全匹配" : "待人工匹配", payload: { direction: "inbound", senderPhone: from, type: message?.type } });
      if (!error) {
        accepted++;
        await db.rpc("add_communication_counts", { p_source_key: source, p_read: 1, p_customer: 1, p_matched: customerId ? 1 : 0, p_manual: customerId ? 0 : 1 });
        if (customerId) await db.from("follow_ups").insert({ customer_id: customerId, channel: "WhatsApp", content: text.slice(0, 10000), result: "已记录", followed_at: occurredAt });
      } else if (error.code === "23505") {
        await db.rpc("add_communication_counts", { p_source_key: source, p_duplicate: 1 });
      }
    }
    const now = new Date().toISOString();
    await db.from("communication_connections").update({ status: "已连接", account_identifier: value?.metadata?.display_phone_number || phoneNumberId, last_attempt_at: now, last_success_at: now, last_error: null, updated_at: now }).eq("source_key", source);
  }
  return NextResponse.json({ ok: true, accepted });
}
