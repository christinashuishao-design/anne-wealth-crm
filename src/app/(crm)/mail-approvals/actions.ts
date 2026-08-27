"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hasLocalSession } from "@/lib/local-session";
import { isLocalMode, localDb } from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const decisionSchema = z.enum(["已批准，等待发送", "需修改"]);
const draftSchema = z.string().trim().min(20, "邮件正文太短").max(30000, "邮件正文过长");

async function requireUser() {
  if (isLocalMode()) {
    if (!(await hasLocalSession())) throw new Error("请先登录 CRM");
    return;
  }
  const db = await createClient();
  const { data } = await db.auth.getUser();
  if (!data.user) throw new Error("请先登录 CRM");
}

export async function reviewMailDraft(
  followUpId: string,
  decision: "已批准，等待发送" | "需修改",
) {
  await requireUser();
  const id = idSchema.parse(followUpId);
  const nextResult = decisionSchema.parse(decision);

  if (isLocalMode()) {
    const db = localDb();
    const followUp = db
      .prepare("select id,customer_id from follow_ups where id=? and deleted_at is null")
      .get(id) as { id: string; customer_id: string | null } | undefined;
    if (!followUp) throw new Error("邮件草稿不存在");
    db.transaction(() => {
      db.prepare("update follow_ups set result=? where id=?").run(nextResult, id);
      const event = db
        .prepare("select task_id from communication_sync_events where customer_id=? and task_id is not null order by created_at desc limit 1")
        .get(followUp.customer_id) as { task_id: string } | undefined;
      if (event?.task_id) {
        db.prepare("update tasks set status=? where id=? and deleted_at is null").run(
          nextResult === "已批准，等待发送" ? "处理中" : "待处理",
          event.task_id,
        );
      }
    })();
  } else {
    const db = await createClient();
    const { data: followUp, error: readError } = await db
      .from("follow_ups")
      .select("id,customer_id")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (readError || !followUp) throw new Error("邮件草稿不存在");
    const { error } = await db.from("follow_ups").update({ result: nextResult }).eq("id", id);
    if (error) throw new Error(error.message);
    const { data: event } = await db
      .from("communication_sync_events")
      .select("task_id")
      .eq("customer_id", followUp.customer_id)
      .not("task_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (event?.task_id) {
      const { error: taskError } = await db
        .from("tasks")
        .update({ status: nextResult === "已批准，等待发送" ? "处理中" : "待处理" })
        .eq("id", event.task_id);
      if (taskError) throw new Error(taskError.message);
    }
  }

  revalidatePath("/mail-approvals");
  revalidatePath("/tasks");
  revalidatePath("/follow-ups");
}

export async function saveMailDraft(followUpId: string, draft: string) {
  await requireUser();
  const id = idSchema.parse(followUpId);
  const nextDraft = draftSchema.parse(draft);
  const marker = "待审批回复草稿：";

  if (isLocalMode()) {
    const db = localDb();
    const row = db
      .prepare("select content from follow_ups where id=? and deleted_at is null")
      .get(id) as { content: string } | undefined;
    if (!row) throw new Error("邮件草稿不存在");
    const index = row.content.indexOf(marker);
    const research = index >= 0 ? row.content.slice(0, index).trim() : row.content.trim();
    db.prepare("update follow_ups set content=?,result='待审批' where id=?")
      .run(`${research}\n\n${marker}\n\n${nextDraft}`, id);
  } else {
    const db = await createClient();
    const { data: row, error: readError } = await db
      .from("follow_ups")
      .select("content")
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    if (readError || !row) throw new Error("邮件草稿不存在");
    const content = String(row.content ?? "");
    const index = content.indexOf(marker);
    const research = index >= 0 ? content.slice(0, index).trim() : content.trim();
    const { error } = await db
      .from("follow_ups")
      .update({ content: `${research}\n\n${marker}\n\n${nextDraft}`, result: "待审批" })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/mail-approvals");
  revalidatePath("/follow-ups");
}
