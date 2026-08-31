"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode, localDb } from "@/lib/local-db";

const MARKER = "FAQ_KB_V1\n";
const schema = z.object({
  question: z.string().trim().min(2, "请输入问题"),
  answer: z.string().trim().optional().default(""),
  category: z.enum(["客户问题", "产品问题"]),
  topic: z.string().trim().optional().default(""),
  customer_id: z.string().uuid().or(z.literal("")).optional().default(""),
  product_name: z.string().trim().optional().default(""),
  keywords: z.string().trim().optional().default(""),
  source: z.string().trim().optional().default(""),
  status: z.enum(["待整理", "需补充", "已验证"]),
});

function values(formData: FormData) {
  return schema.parse(Object.fromEntries(formData));
}

export async function createFaq(formData: FormData) {
  const item = values(formData), now = new Date().toISOString();
  const content = `${MARKER}${JSON.stringify(item)}`;
  if (isLocalMode()) {
    localDb().prepare("insert into follow_ups(id,customer_id,channel,content,result,followed_at,created_at) values(?,?,?,?,?,?,?)")
      .run(crypto.randomUUID(), item.customer_id || null, "问题知识库", content, item.status, now, now);
  } else {
    const db = await createClient();
    const { error } = await db.from("follow_ups").insert({ customer_id: item.customer_id || null, channel: "问题知识库", content, result: item.status, followed_at: now });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/faq");
}

export async function updateFaq(id: string, formData: FormData) {
  const safeId = z.string().uuid().parse(id), item = values(formData);
  const payload = { customer_id: item.customer_id || null, content: `${MARKER}${JSON.stringify(item)}`, result: item.status };
  if (isLocalMode()) {
    localDb().prepare("update follow_ups set customer_id=?,content=?,result=? where id=? and channel='问题知识库' and deleted_at is null")
      .run(payload.customer_id, payload.content, payload.result, safeId);
  } else {
    const db = await createClient();
    const { error } = await db.from("follow_ups").update(payload).eq("id", safeId).eq("channel", "问题知识库").is("deleted_at", null);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/faq");
}

export async function deleteFaq(id: string) {
  const safeId = z.string().uuid().parse(id), deletedAt = new Date().toISOString();
  if (isLocalMode()) {
    localDb().prepare("update follow_ups set deleted_at=? where id=? and channel='问题知识库'").run(deletedAt, safeId);
  } else {
    const db = await createClient();
    const { error } = await db.from("follow_ups").update({ deleted_at: deletedAt }).eq("id", safeId).eq("channel", "问题知识库");
    if (error) throw new Error(error.message);
  }
  revalidatePath("/faq");
}
