"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  isLocalMode,
  localCreateCustomer,
  localSoftDelete,
  localSoftDeleteMany,
  localUpdateCustomer,
} from "@/lib/local-db";

const schema = z.object({
  company_name: z.string().min(2),
  country: z.string().optional(),
  stage: z.string(),
  grade: z.string(),
  website: z.string().optional(),
  source: z.string().optional(),
  next_follow_up_at: z.string().optional(),
  notes: z.string().optional(),
});
const updateSchema = schema.extend({
  customer_type: z.string().optional(),
  business_products: z.string().optional(),
  inquiry_grade: z.string().optional(),
  email_content: z.string().optional(),
  contact_name: z.string().optional(),
  email: z.string().optional(),
  position: z.string().optional(),
  social_media: z.string().optional(),
  phone: z.string().optional(),
  latest_result: z.string().optional(),
  next_action: z.string().optional(),
  follow_up_reminder: z.string().optional(),
  follow_up_checkin: z.string().optional(),
  background_summary: z.string().optional(),
  company_size: z.string().optional(),
  last_follow_up_at: z.string().optional(),
  lark_created_at: z.string().optional(),
});
export async function createCustomer(formData: FormData) {
  const values = schema.parse(Object.fromEntries(formData));
  if (isLocalMode()) {
    localCreateCustomer(values);
    revalidatePath("/customers");
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    ...values,
    customer_code: `CUS-${Date.now().toString().slice(-8)}`,
    next_follow_up_at: values.next_follow_up_at || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}
export async function deleteCustomer(id: string) {
  if (isLocalMode()) {
    localSoftDelete("customers", id);
    revalidatePath("/customers");
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}
export async function deleteCustomers(ids: string[]) {
  const valid = z.array(z.string().uuid()).min(1).parse(ids);
  if (isLocalMode()) {
    localSoftDeleteMany("customers", valid);
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("customers")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", valid);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/customers");
  revalidatePath("/dashboard");
}
export async function updateCustomer(id: string, formData: FormData) {
  const values = updateSchema.parse(Object.fromEntries(formData));
  if (isLocalMode()) {
    localUpdateCustomer(id, values);
    revalidatePath("/customers");
    return;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({ ...values, next_follow_up_at: values.next_follow_up_at || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}
