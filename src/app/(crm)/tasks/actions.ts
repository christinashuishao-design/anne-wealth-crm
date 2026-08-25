"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  isLocalMode,
  localCreateTask,
  localSoftDeleteMany,
  localUpdateTask,
} from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";

const taskSchema = z.object({
  title: z.string().min(1, "请输入任务名称"),
  task_type: z.string().min(1),
  customer_id: z.string().optional(),
  opportunity_id: z.string().optional(),
  due_at: z.string().min(1, "请选择截止时间"),
  priority: z.string().min(1),
  status: z.string().min(1),
  auto_rule: z.string().optional(),
});

export async function createTask(formData: FormData) {
  const values = taskSchema.parse(Object.fromEntries(formData));
  if (isLocalMode()) localCreateTask(values);
  else {
    const db = await createClient();
    const { error } = await db
      .from("tasks")
      .insert({
        ...values,
        customer_id: values.customer_id || null,
        opportunity_id: values.opportunity_id || null,
        auto_rule: values.auto_rule || null,
      });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function updateTask(id: string, formData: FormData) {
  const values = taskSchema.parse(Object.fromEntries(formData));
  if (isLocalMode()) {
    localUpdateTask(id, values);
  } else {
    const db = await createClient();
    const { error } = await db
      .from("tasks")
      .update({
        ...values,
        customer_id: values.customer_id || null,
        opportunity_id: values.opportunity_id || null,
        auto_rule: values.auto_rule || null,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTasks(ids: string[]) {
  const validIds = z.array(z.string().uuid()).min(1).parse(ids);
  if (isLocalMode()) {
    localSoftDeleteMany("tasks", validIds);
  } else {
    const db = await createClient();
    const { error } = await db
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", validIds);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
