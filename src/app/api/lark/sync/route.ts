import { NextRequest, NextResponse } from "next/server";
import { hasLocalSession } from "@/lib/local-session";
import { isLocalMode } from "@/lib/local-db";
import { syncLarkCustomers } from "@/lib/lark";

export async function POST(request: NextRequest) {
  if (!isLocalMode() || !(await hasLocalSession()))
    return NextResponse.redirect(new URL("/login", request.url), 303);

  const formData = await request.formData();
  const connectionId = String(formData.get("connectionId") || "");
  if (!connectionId)
    return NextResponse.redirect(
      new URL("/imports/lark?error=连接不存在", request.url),
      303,
    );

  try {
    const result = await syncLarkCustomers(connectionId);
    const target = new URL("/imports/lark", request.url);
    target.searchParams.set("synced", String(result.total));
    target.searchParams.set("created", String(result.created));
    target.searchParams.set("updated", String(result.updated));
    target.searchParams.set("failed", String(result.failed));
    target.searchParams.set("skipped", String(result.skipped));
    target.searchParams.set("unchanged", String(result.unchanged));
    return NextResponse.redirect(target, 303);
  } catch (error) {
    const target = new URL("/imports/lark", request.url);
    target.searchParams.set(
      "error",
      error instanceof Error ? error.message : "同步失败",
    );
    return NextResponse.redirect(target, 303);
  }
}
