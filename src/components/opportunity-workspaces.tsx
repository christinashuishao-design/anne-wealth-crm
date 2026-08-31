"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Mail,
  Phone,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { OpportunityEmailTemplate } from "@/components/opportunity-email-template";

export type OpportunityWorkspaceRow = Record<string, unknown> & { id: string };

const stages = [
  "需求确认中",
  "有明确询盘",
  "已报价",
  "样品准备中",
  "样品已寄",
  "价格谈判",
  "等待订单",
  "已成交",
] as const;

const stageTone: Record<string, string> = {
  需求确认中: "bg-slate-100 text-slate-700",
  有明确询盘: "bg-sky-100 text-sky-700",
  已报价: "bg-amber-100 text-amber-800",
  样品准备中: "bg-violet-100 text-violet-700",
  样品已寄: "bg-indigo-100 text-indigo-700",
  价格谈判: "bg-orange-100 text-orange-800",
  等待订单: "bg-emerald-100 text-emerald-800",
  已成交: "bg-[#173b34] text-white",
  已流失: "bg-rose-100 text-rose-700",
};

function money(row: OpportunityWorkspaceRow) {
  const amount = Number(row.estimated_amount || 0);
  return amount
    ? `${String(row.currency || "USD")} ${amount.toLocaleString()}`
    : "金额待确认";
}

function dateText(value: unknown) {
  if (!value) return "日期待确认";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("zh-CN");
}

function ageDays(row: OpportunityWorkspaceRow) {
  const raw = row.quoted_at || row.updated_at || row.created_at;
  if (!raw) return 0;
  const date = new Date(String(raw));
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function ContactLines({ row }: { row: OpportunityWorkspaceRow }) {
  return (
    <div className="mt-3 space-y-1.5 text-xs text-neutral-500">
      <p className="flex items-center gap-2"><UserRound size={13}/>{String(row.customer_contact_name || "联系人待补充")}</p>
      {row.customer_email ? <p className="flex items-center gap-2"><Mail size={13}/>{String(row.customer_email)}</p> : null}
      {row.customer_phone ? <p className="flex items-center gap-2"><Phone size={13}/>{String(row.customer_phone)}</p> : null}
    </div>
  );
}

function ProjectDrawer({ row, onClose }: { row: OpportunityWorkspaceRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-[#fbf8f1] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e7dece] bg-white/95 p-6 backdrop-blur">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-[#a87522]">PROJECT BRIEF</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#173b34]">{String(row.title || "未命名项目")}</h2>
            <p className="mt-1 text-sm text-neutral-500">{String(row.opportunity_code || "暂无项目编号")}</p>
          </div>
          <button className="rounded-full border border-[#ded5c5] bg-white p-2 hover:bg-neutral-50" onClick={onClose} title="关闭"><X size={18}/></button>
        </header>
        <div className="space-y-5 p-6">
          <section className="rounded-2xl border border-[#e7dece] bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${stageTone[String(row.status)] || stageTone["需求确认中"]}`}>{String(row.status || "需求确认中")}</span>
              <strong className="text-lg text-[#173b34]">{money(row)}</strong>
            </div>
            <h3 className="mt-5 text-sm font-semibold text-neutral-500">客户</h3>
            <p className="mt-1 text-lg font-semibold">{String(row.customer_name || "未关联客户")}</p>
            <ContactLines row={row}/>
          </section>
          <section className="rounded-2xl border border-[#e7dece] bg-white p-5">
            <h3 className="font-semibold text-[#173b34]">当前进度</h3>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{String(row.project_progress || "暂未填写项目进度")}</p>
            <div className="mt-5 flex items-center gap-2 border-t border-[#eee7dc] pt-4 text-sm text-neutral-500"><CalendarClock size={16}/>预计成交：{dateText(row.expected_close_date)}</div>
          </section>
          <div className="flex flex-wrap justify-end gap-3">
            <OpportunityEmailTemplate project={row}/>
            <Link href="/opportunities" className="inline-flex items-center gap-2 rounded-xl bg-[#173b34] px-5 py-2.5 text-sm font-medium text-white">进入全部项目编辑<ArrowRight size={15}/></Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

export function OpportunityBoard({ rows }: { rows: OpportunityWorkspaceRow[] }) {
  const [selected, setSelected] = useState<OpportunityWorkspaceRow | null>(null);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword
      ? rows.filter((row) => [row.title, row.customer_name, row.opportunity_code].some((value) => String(value || "").toLowerCase().includes(keyword)))
      : rows;
  }, [query, rows]);
  const active = visible.filter((row) => !["已成交", "已流失"].includes(String(row.status)));
  const pipeline = active.reduce((sum, row) => sum + Number(row.estimated_amount || 0), 0);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-[#173b34] p-5 text-white"><p className="text-xs text-white/60">活跃项目</p><strong className="mt-2 block text-3xl">{active.length}</strong><p className="mt-2 text-xs text-white/55">不含已成交与已流失</p></div>
        <div className="rounded-2xl border border-[#e7dece] bg-white p-5"><p className="text-xs text-neutral-500">管道预计金额</p><strong className="mt-2 block text-3xl text-[#173b34]">{pipeline.toLocaleString()}</strong><p className="mt-2 text-xs text-neutral-400">按项目原币种金额汇总，仅供推进参考</p></div>
        <div className="rounded-2xl border border-[#ead9b8] bg-[#fff9ec] p-5"><p className="flex items-center gap-2 text-xs text-[#91651d]"><Sparkles size={14}/>当前重点</p><strong className="mt-2 block text-xl text-[#704b10]">报价与样品推进</strong><p className="mt-2 text-xs text-[#9b783e]">优先处理等待客户确认的项目</p></div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e7dece] bg-white p-3">
        <div className="relative min-w-64 flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-xl border border-[#ded5c5] py-2.5 pl-10 pr-3 outline-none focus:border-[#173b34]" placeholder="搜索项目、客户或编号"/></div>
        <Link href="/opportunities" className="text-sm font-medium text-[#173b34] hover:underline">切换到表格管理</Link>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="grid min-w-[1500px] grid-cols-8 gap-4">
          {stages.map((stage) => {
            const stageRows = visible.filter((row) => String(row.status || "需求确认中") === stage);
            return (
              <section key={stage} className="min-h-[420px] rounded-2xl border border-[#e5dccd] bg-[#f4efe6]/70 p-3">
                <header className="mb-3 flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stageTone[stage]}`}>{stage}</span><span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">{stageRows.length}</span></header>
                <div className="space-y-3">
                  {stageRows.map((row) => <button key={row.id} onClick={() => setSelected(row)} className="w-full rounded-xl border border-[#e7dece] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#c9b891] hover:shadow-md"><p className="text-xs text-neutral-400">{String(row.opportunity_code || "未编号")}</p><h3 className="mt-1 line-clamp-2 font-semibold text-[#173b34]">{String(row.title || "未命名项目")}</h3><p className="mt-2 line-clamp-1 text-xs text-neutral-600">{String(row.customer_name || "未关联客户")}</p><div className="mt-4 flex items-center justify-between border-t border-[#f0ebe2] pt-3 text-xs"><span className="font-semibold text-[#9a6c20]">{money(row)}</span><ChevronRight size={14} className="text-neutral-400"/></div></button>)}
                  {!stageRows.length && <div className="rounded-xl border border-dashed border-[#d8cebd] p-5 text-center text-xs text-neutral-400">暂无项目</div>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      {selected && <ProjectDrawer row={selected} onClose={() => setSelected(null)}/>} 
    </>
  );
}

export function QuotedFollowUpWorkspace({ rows }: { rows: OpportunityWorkspaceRow[] }) {
  const [selected, setSelected] = useState<OpportunityWorkspaceRow | null>(null);
  const [query, setQuery] = useState("");
  const quoted = useMemo(() => rows
    .filter((row) => String(row.status) === "已报价")
    .filter((row) => !query.trim() || [row.title, row.customer_name, row.customer_contact_name].some((value) => String(value || "").toLowerCase().includes(query.trim().toLowerCase())))
    .sort((a, b) => ageDays(b) - ageDays(a)), [query, rows]);
  const urgent = quoted.filter((row) => ageDays(row) >= 7).length;
  const value = quoted.reduce((sum, row) => sum + Number(row.estimated_amount || 0), 0);

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#173b34] to-[#28594f] text-white shadow-lg">
        <div className="grid gap-6 p-7 md:grid-cols-[1.4fr_1fr] md:p-9">
          <div><p className="text-xs font-semibold tracking-[0.22em] text-[#e1bf7a]">QUOTE FOLLOW-UP</p><h2 className="mt-3 text-3xl font-semibold">把已报价项目变成下一步行动</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">按等待时间自动排序，先处理超过 7 天未推进的客户。点击卡片即可查看联系人、项目进度并生成针对性邮件。</p></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/55">待跟进</p><strong className="mt-2 block text-3xl">{quoted.length}</strong></div><div className="rounded-2xl bg-[#d8ab55] p-4 text-[#173b34]"><p className="text-xs text-[#173b34]/60">等待 ≥ 7天</p><strong className="mt-2 block text-3xl">{urgent}</strong></div><div className="col-span-2 rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/55">报价项目金额</p><strong className="mt-2 block text-2xl">{value.toLocaleString()}</strong></div></div>
        </div>
      </section>
      <div className="relative max-w-xl"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-2xl border border-[#ded5c5] bg-white py-3 pl-11 pr-4 outline-none focus:border-[#173b34]" placeholder="搜索报价项目、客户或联系人"/></div>
      <section className="grid gap-4 xl:grid-cols-2">
        {quoted.map((row) => {
          const days = ageDays(row);
          return <article key={row.id} className="group rounded-2xl border border-[#e7dece] bg-white p-5 shadow-sm transition hover:border-[#c8b58d] hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><p className="text-xs text-neutral-400">{String(row.opportunity_code || "未编号")}</p><h3 className="mt-1 text-lg font-semibold text-[#173b34]">{String(row.title || "未命名项目")}</h3><p className="mt-1 text-sm text-neutral-600">{String(row.customer_name || "未关联客户")}</p></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${days >= 7 ? "bg-rose-100 text-rose-700" : days >= 3 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}><Clock3 className="mr-1 inline" size={13}/>{days} 天</span></div><div className="my-4 rounded-xl bg-[#faf7f1] p-4"><p className="text-xs text-neutral-400">最近进度</p><p className="mt-1 line-clamp-2 text-sm leading-6 text-neutral-700">{String(row.project_progress || "尚未填写进度，建议先确认报价是否已送达客户。")}</p></div><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-xs text-neutral-500"><UserRound size={13}/>{String(row.customer_contact_name || "联系人待补充")}</p><p className="mt-2 flex items-center gap-2 text-sm font-semibold text-[#9a6c20]"><CircleDollarSign size={15}/>{money(row)}</p></div><button onClick={() => setSelected(row)} className="inline-flex items-center gap-2 rounded-xl bg-[#173b34] px-4 py-2.5 text-sm font-medium text-white">查看并跟进<ChevronRight size={15}/></button></div></article>;
        })}
        {!quoted.length && <div className="col-span-full rounded-2xl border border-dashed border-[#d8cebd] bg-white p-14 text-center"><p className="text-lg font-semibold text-[#173b34]">暂无符合条件的报价项目</p><p className="mt-2 text-sm text-neutral-500">新的“已报价”项目会自动出现在这里。</p></div>}
      </section>
      {selected && <ProjectDrawer row={selected} onClose={() => setSelected(null)}/>} 
    </>
  );
}
