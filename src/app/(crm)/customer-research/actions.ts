"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode, localUpdateCustomerResearch } from "@/lib/local-db";

const schema = z.object({
  customer_id: z.string().uuid(),
  background_summary: z.string().max(8000).optional(),
  latest_result: z.string().max(4000).optional(),
  next_action: z.string().max(4000).optional(),
  notes: z.string().max(4000).optional(),
});

export async function saveCustomerResearch(formData: FormData) {
  const values = schema.parse(Object.fromEntries(formData));
  const { customer_id, ...updates } = values;
  if (isLocalMode()) {
    localUpdateCustomerResearch(customer_id, updates);
  } else {
    const db = await createClient();
    const { error } = await db
      .from("customers")
      .update(updates)
      .eq("id", customer_id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/customer-research");
  revalidatePath("/customers");
}
