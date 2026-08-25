import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isLocalMode } from "@/lib/local-db";
import { hasLocalSession } from "@/lib/local-session";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  if(isLocalMode()){if(!await hasLocalSession())redirect("/login");return <AppShell>{children}</AppShell>}
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
