"use client";
import { Download } from "lucide-react";

export function ExportAllButton() {
  return <a href="/api/exports/all" className="flex items-center gap-2 rounded-lg border border-[#d8ccb8] bg-white px-3 py-2 text-sm text-[#173b34] hover:bg-[#fffaf0]" title="导出全部 CRM 数据为 Excel">
    <Download size={16}/><span className="hidden md:inline">一键导出全部</span>
  </a>;
}
