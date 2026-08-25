"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";

const targets = [
  ["company_name", "供应商名称（必选）"], ["location", "所在地区"],
  ["supplier_type", "供应商类型/品类"], ["standard_moq", "MOQ"],
  ["lead_time_days", "交期（天）"], ["total_score", "总分"],
  ["grade", "等级"], ["status", "状态"],
] as const;
const hints: Record<string, string[]> = {
  company_name: ["供应商名称", "供应商", "公司名称", "厂家名称", "工厂名称", "厂商", "生产厂家", "企业名称"],
  location: ["所在地区", "地区", "城市", "所在地", "地址"],
  supplier_type: ["供应商类型", "类型", "主营品类", "产品类别", "品类"],
  standard_moq: ["MOQ", "起订量", "最小起订量", "最低起订量"],
  lead_time_days: ["交期", "交货时间", "生产周期", "货期"],
  total_score: ["总分", "评分", "分数"], grade: ["等级", "级别"], status: ["状态", "合作状态"],
};
const clean = (value: string) => value.toLowerCase().replace(/[\s_\-—/\\()（）【】\[\]：:，,.]/g, "");
function guess(headers: string[]) {
  return Object.fromEntries(targets.map(([key]) => {
    const names = hints[key].map(clean);
    const found = headers.find((header) => {
      const normalized = clean(header);
      return names.some((name) => normalized === name || normalized.includes(name) || name.includes(normalized));
    });
    return [key, found || ""];
  }));
}
function decodeCsv(buffer: ArrayBuffer) {
  try { return new TextDecoder("utf-8", { fatal: true }).decode(buffer); }
  catch { return new TextDecoder("gb18030").decode(buffer); }
}

export function SupplierImportButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false), [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [headers, setHeaders] = useState<string[]>([]), [mapping, setMapping] = useState<Record<string, string>>({});
  async function choose(selected: File) {
    setFile(selected); setMessage("");
    try {
      let rows: Record<string, unknown>[];
      if (selected.name.toLowerCase().endsWith(".csv")) rows = Papa.parse<Record<string, unknown>>(decodeCsv(await selected.arrayBuffer()), { header: true, preview: 3, skipEmptyLines: true }).data;
      else { const workbook = XLSX.read(await selected.arrayBuffer()); rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" }); }
      const columns = Object.keys(rows[0] || {}).filter(Boolean);
      setHeaders(columns); setMapping(guess(columns));
      if (!columns.length) setMessage("没有读取到表头，请检查文件第一行");
    } catch { setHeaders([]); setMapping({}); setMessage("文件解析失败，请检查文件格式"); }
  }
  async function upload() {
    if (!file) return setMessage("请先选择文件");
    if (!mapping.company_name) return setMessage("请选择哪一列对应“供应商名称”");
    setBusy(true); setMessage("");
    try {
      const body = new FormData(); body.set("file", file); body.set("mapping", JSON.stringify(mapping));
      const response = await fetch("/api/imports/suppliers", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "导入失败");
      setMessage(`导入完成：新增 ${result.created}，更新 ${result.updated}，跳过 ${result.skipped}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "导入失败"); }
    finally { setBusy(false); }
  }
  return <>
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl border border-[#173b34] bg-white px-4 py-2.5 text-sm text-[#173b34]"><FileSpreadsheet size={16}/>导入供应商</button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b p-5"><h2 className="text-lg font-semibold text-[#173b34]">导入供应商信息</h2><button title="关闭" onClick={() => setOpen(false)}><X/></button></header>
      <div className="space-y-4 p-5">
        <p className="text-sm text-neutral-600">表头名称可以不同。上传后请确认每个文件列对应的 CRM 字段，同名供应商会自动更新。</p>
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-[#d8ccb8] p-7 text-center"><UploadCloud className="mx-auto text-[#a57d34]"/><div className="mt-2">{file?.name || "选择 XLSX、XLS 或 CSV 文件"}</div><input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && choose(event.target.files[0])}/></label>
        {!!headers.length && <div><div className="mb-2 text-sm font-medium">确认字段对应关系</div><div className="grid max-h-72 gap-3 overflow-auto rounded-xl border p-4 sm:grid-cols-2">{targets.map(([key, label]) => <label className="text-sm" key={key}>{label}<select className="mt-1 w-full rounded-lg border border-[#d8ccb8] bg-white px-3 py-2" value={mapping[key] || ""} onChange={(event) => setMapping((current) => ({ ...current, [key]: event.target.value }))}><option value="">不导入此字段</option>{headers.map((header) => <option value={header} key={header}>{header}</option>)}</select></label>)}</div></div>}
        {message && <div className="rounded-xl bg-[#faf5e8] p-3 text-sm">{message}</div>}
        <button disabled={busy || !file || !headers.length} onClick={upload} className="w-full rounded-xl bg-[#173b34] py-3 text-white disabled:opacity-50">{busy ? "正在导入…" : "按以上对应关系导入"}</button>
      </div>
    </div></div>}
  </>;
}
