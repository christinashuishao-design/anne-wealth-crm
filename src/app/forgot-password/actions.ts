"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://anne-wealth-crm.christinashuishao.workers.dev";
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/reset-password`,
  });
  redirect("/forgot-password?sent=1");
}
