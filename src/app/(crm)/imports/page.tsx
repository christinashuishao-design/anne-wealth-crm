"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { CheckCircle2, UploadCloud } from "lucide-react";

export default function Page() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null),
    [rows, setRows] = useState<Record<string, unknown>[]>([]),
    [columns, setColumns] = useState<string[]>([]),
    [error, setError] = useState(""),
    [importing, setImporting] = useState(false);
  async function read(selected: File) {
    setError("");
    try {
      let data: Record<string, unknown>[] = [];
      if (selected.name.toLowerCase().endsWith(".csv"))
        data = Papa.parse<Record<string, unknown>>(await selected.text(), {
          header: true,
          skipEmptyLines: true,
        }).data;
      else {
        const wb = XLSX.read(await selected.arrayBuffer());
        data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
          defval: "",
        });
      }
      setFile(selected);
      setRows(data);
      setColumns(Object.keys(data[0] ?? {}));
    } catch {
      setError("文件解析失败，请检查格式。");
    }
  }
  async function confirmImport() {
    if (!file) return;
    setImporting(true);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/imports/customers", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "导入失败");
      router.push(`/customers?imported=${result.total}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "导入失败");
      setImporting(false);
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-widest text-[#a57d34]">DATA IMPORT</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#173b34]">
          Excel / CSV / Lark 数据导入
        </h1>
        <p className="mt-2 text-neutral-500">
          上传并预览文件，确认后写入客户数据库；同名公司会更新，不会重复创建。
        </p>
      </div>
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-[#d7c9b3] bg-white p-12 text-center">
        <UploadCloud className="mx-auto text-[#a57d34]" size={40} />
        <div className="mt-4 font-medium">选择 XLSX 或 CSV 文件</div>
        <div className="mt-2 text-sm text-neutral-400">
          支持自动识别公司名称、客户类型、阶段、联系人、邮箱、电话、国家等中文表头
        </div>
        <input
          className="hidden"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => e.target.files?.[0] && read(e.target.files[0])}
        />
      </label>
      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-red-700">{error}</div>
      )}
      {rows.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d7c9b3] bg-[#fffaf0] p-4">
            <div>
              <div className="flex items-center gap-2 font-medium text-[#173b34]">
                <CheckCircle2 size={18} />
                文件已解析：{rows.length} 行
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                当前只是预览，点击右侧按钮才会写入“所有客户”。
              </p>
            </div>
            <button
              type="button"
              disabled={importing}
              onClick={confirmImport}
              className="rounded-xl bg-[#173b34] px-6 py-3 text-white disabled:opacity-60"
            >
              {importing ? "正在导入…" : `确认导入 ${rows.length} 条客户`}
            </button>
          </div>
          <div className="overflow-auto rounded-2xl border bg-white">
            <div className="border-b p-4 font-medium">
              数据预览（共 {rows.length} 行，展示前 20 行）
            </div>
            <table className="text-sm">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      className="whitespace-nowrap bg-[#faf7f1] p-3 text-left"
                      key={c}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 20).map((r, i) => (
                  <tr className="border-t" key={i}>
                    {columns.map((c) => (
                      <td
                        className="max-w-80 truncate whitespace-nowrap p-3"
                        key={c}
                      >
                        {String(r[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
