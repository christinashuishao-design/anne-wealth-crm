import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { isLocalMode, localRows } from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";
import { hasLocalSession } from "@/lib/local-session";

const tables = [
  ["客户", "customers"], ["供应商", "suppliers"], ["产品", "products"],
  ["项目", "opportunities"], ["跟进任务", "tasks"], ["跟进记录", "follow_ups"],
  ["订单", "orders"], ["财务", "financial_records"],
] as const;

export async function GET() {
  if (isLocalMode() && !(await hasLocalSession()))
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const workbook = XLSX.utils.book_new();
  if (isLocalMode()) {
    for (const [sheet, table] of tables) {
      const rows = localRows(table);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.length ? rows : [{ 提示: "暂无数据" }]), sheet);
    }
  } else {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    for (const [sheet, table] of tables) {
      const { data, error } = await db.from(table).select("*").is("deleted_at", null);
      if (error) throw new Error(error.message);
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data?.length ? data : [{ 提示: "暂无数据" }]), sheet);
    }
  }
  const content = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(content), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="Anne-CRM-${date}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}
