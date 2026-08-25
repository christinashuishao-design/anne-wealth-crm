import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { isLocalMode, localImportSuppliers } from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";
import { formatSupplierCode, supplierCodePrefix } from "@/lib/supplier-code";

const aliases: Record<string, string[]> = {
  company_name: ["供应商名称", "供应商", "公司名称", "企业名称", "厂家名称", "工厂名称", "厂商", "生产厂家", "company_name", "supplier"],
  location: ["所在地区", "地区", "城市", "所在地", "地址", "location", "city"],
  supplier_type: ["供应商类型", "类型", "主营品类", "产品类别", "品类", "supplier_type"],
  standard_moq: ["MOQ", "起订量", "标准MOQ", "最小起订量", "最低起订量", "standard_moq"],
  lead_time_days: ["交期（天）", "交期(天)", "交货时间", "生产周期", "货期", "交期", "lead_time_days"],
  total_score: ["总分", "评分", "分数", "total_score"],
  grade: ["等级", "供应商等级", "grade"],
  status: ["状态", "合作状态", "status"],
};
const clean = (value: string) => value.toLowerCase().replace(/[\s_\-—/\\()（）【】\[\]：:，,.]/g, "");
function normalize(raw: Record<string, unknown>, mapping: Record<string, string>) {
  const result: Record<string, unknown> = {};
  for (const [key, names] of Object.entries(aliases)) {
    const explicit = mapping[key];
    const found = explicit && raw[explicit] !== undefined ? explicit : Object.keys(raw).find((header) => {
      const normalized = clean(header);
      return names.some((name) => { const expected = clean(name); return normalized === expected || normalized.includes(expected) || expected.includes(normalized); }) && String(raw[header] ?? "").trim() !== "";
    });
    if (found) result[key] = String(raw[found]).trim();
  }
  return result;
}
function decodeCsv(buffer: ArrayBuffer) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { return new TextDecoder("gb18030").decode(buffer); }
}
export async function POST(request: Request) {
  try {
    const form = await request.formData(), file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择文件" }, { status: 400 });
    let raw: Record<string, unknown>[];
    if (file.name.toLowerCase().endsWith(".csv")) raw = Papa.parse<Record<string, unknown>>(decodeCsv(await file.arrayBuffer()), { header: true, skipEmptyLines: true }).data;
    else { const workbook = XLSX.read(await file.arrayBuffer()); raw = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" }); }
    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(String(form.get("mapping") || "{}")); } catch { mapping = {}; }
    const rows = raw.map((row) => normalize(row, mapping)).filter((row) => row.company_name);
    if (!rows.length) return NextResponse.json({ error: "没有识别到“供应商名称”列，请检查表头" }, { status: 400 });
    if (isLocalMode()) return NextResponse.json(localImportSuppliers(rows));
    const db = await createClient(); let created = 0, updated = 0;
    const existingCodes = (await db.from("suppliers").select("supplier_code")).data ?? [];
    let sequence = existingCodes.reduce((max, row) => Math.max(max, Number(String(row.supplier_code || "").match(/(\d+)$/)?.[1] || 0)), 0);
    for (const row of rows) {
      const old = (await db.from("suppliers").select("id").ilike("company_name", String(row.company_name)).limit(1).maybeSingle()).data;
      if (old) { const { error } = await db.from("suppliers").update({ ...row, deleted_at: null }).eq("id", old.id); if (error) throw error; updated++; }
      else { sequence++; const { error } = await db.from("suppliers").insert({ ...row, supplier_code: formatSupplierCode(supplierCodePrefix(row.location, row.company_name), sequence), grade: row.grade || "B", status: row.status || "可合作" }); if (error) throw error; created++; }
    }
    return NextResponse.json({ total: rows.length, created, updated, skipped: raw.length - rows.length });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "导入失败" }, { status: 500 }); }
}
