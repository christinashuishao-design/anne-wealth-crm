import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";
import { isLocalMode } from "@/lib/local-db";
import { hasLocalSession } from "@/lib/local-session";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  if(isLocalMode()){if(!await hasLocalSession())redirect("/login");return <AppShell>{children}</AppShell>}
  // Cloud sessions are already verified once in proxy.ts. Repeating getUser()
  // here added a second cross-region auth round trip to every page navigation.
  return <AppShell>{children}</AppShell>;
}
