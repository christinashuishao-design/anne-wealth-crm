"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode,verifyLocalLogin } from "@/lib/local-db";
import { clearLocalSession,createLocalSession } from "@/lib/local-session";

export async function login(formData: FormData) {
  if(isLocalMode()){
    const user=verifyLocalLogin(String(formData.get("email")??""),String(formData.get("password")??""));
    if(!user)redirect(`/login?error=${encodeURIComponent("邮箱或密码不正确")}`);
    await createLocalSession(user.id);redirect("/dashboard");
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect("/login?setup=1");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect(`/login?error=${encodeURIComponent("邮箱或密码不正确")}`);
  redirect("/dashboard");
}

export async function logout() {
  if(isLocalMode()){await clearLocalSession();redirect("/login");}
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
