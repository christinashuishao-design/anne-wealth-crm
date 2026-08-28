import { NextResponse } from "next/server";
import { authorized, SOURCE_KEYS, serviceDb } from "@/lib/communications";

type Connector = { url: string; token: string };

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = serviceDb();
  let config: Partial<Record<(typeof SOURCE_KEYS)[number], Connector>> = {};
  try { config = JSON.parse(process.env.COMMUNICATION_CONNECTORS_JSON || "{}"); } catch { return NextResponse.json({ error: "COMMUNICATION_CONNECTORS_JSON 格式错误" }, { status: 503 }); }
  const results = [];
  for (const source of SOURCE_KEYS) {
    if (source.startsWith("whatsapp:")) { results.push({ source, status: "等待 webhook" }); continue; }
    const connector = config[source];
    const attemptedAt = new Date().toISOString();
    if (!connector?.url || !connector?.token) {
      await db.from("communication_connections").update({ status: "待配置", last_attempt_at: attemptedAt, last_error: "未配置该来源的只读连接器 URL/Token", updated_at: attemptedAt }).eq("source_key", source);
      results.push({ source, status: "待配置" });
      continue;
    }
    const { data: state } = await db.from("communication_connections").select("cursor").eq("source_key", source).single();
    try {
      const response = await fetch(connector.url, { method: "POST", headers: { authorization: `Bearer ${connector.token}`, "content-type": "application/json" }, body: JSON.stringify({ source, cursor: state?.cursor || null, callbackUrl: new URL("/api/communications/ingest", request.url).toString() }) });
      if (!response.ok) throw new Error(`连接器返回 HTTP ${response.status}`);
      await db.from("communication_connections").update({ status: "已连接", last_attempt_at: attemptedAt, last_success_at: attemptedAt, last_error: null, updated_at: attemptedAt }).eq("source_key", source);
      results.push({ source, status: "同步请求成功" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知连接错误";
      await db.from("communication_connections").update({ status: "连接失败", last_attempt_at: attemptedAt, last_error: message, updated_at: attemptedAt }).eq("source_key", source);
      results.push({ source, status: "连接失败", error: message });
    }
  }
  return NextResponse.json({ ok: true, results });
}
