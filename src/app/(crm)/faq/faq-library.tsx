"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpenText, CheckCircle2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { createFaq, deleteFaq, updateFaq } from "./actions";

export type FaqItem = {
  id: string; question: string; answer: string; category: string; topic: string;
  customer_id: string; customer_name: string; product_name: string; keywords: string;
  source: string; status: string; updated_at: string;
};
type Customer = { id: string; company_name: string };
const input = "mt-1 w-full rounded-xl border border-[#d8ccb8] bg-white px-3 py-2.5 outline-none focus:border-[#173b34]";

function Editor({ item, customers, close }: { item?: FaqItem; customers: Customer[]; close: () => void }) {
  const [pending, startTransition] = useTransition();
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
    <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
        <div><h2 className="text-xl font-semibold text-[#173b34]">{item ? "编辑知识条目" : "记录新问题"}</h2><p className="mt-1 text-sm text-neutral-500">沉淀可重复使用的客户与产品问答</p></div>
        <button aria-label="关闭" onClick={close}><X /></button>
      </header>
      <form className="grid gap-4 p-5 sm:grid-cols-2" onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        startTransition(async () => { item ? await updateFaq(item.id, data) : await createFaq(data); close(); });
      }}>
        <label className="text-sm">问题类型<select className={input} defaultValue={item?.category || "客户问题"} name="category"><option>客户问题</option><option>产品问题</option></select></label>
        <label className="text-sm">主题分类<input className={input} defaultValue={item?.topic} name="topic" placeholder="例如：MOQ、材质兼容、交期" /></label>
        <label className="text-sm sm:col-span-2">客户遇到的问题*<textarea className={`${input} min-h-24`} defaultValue={item?.question} name="question" placeholder="完整记录客户原始问题或产品问题" required /></label>
        <label className="text-sm sm:col-span-2">标准答案 / 处理方案<textarea className={`${input} min-h-32`} defaultValue={item?.answer} name="answer" placeholder="填写已确认的答案；尚未确认时可以留空并设为待整理" /></label>
        <label className="text-sm">关联客户<select className={input} defaultValue={item?.customer_id || ""} name="customer_id"><option value="">不关联具体客户</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></label>
        <label className="text-sm">关联产品<input className={input} defaultValue={item?.product_name} name="product_name" placeholder="产品名称、型号或包装类型" /></label>
        <label className="text-sm">关键词<input className={input} defaultValue={item?.keywords} name="keywords" placeholder="用逗号分隔，便于检索" /></label>
        <label className="text-sm">信息来源<input className={input} defaultValue={item?.source} name="source" placeholder="邮件、WhatsApp、客户名称等" /></label>
        <label className="text-sm">资料状态<select className={input} defaultValue={item?.status || "待整理"} name="status"><option>待整理</option><option>需补充</option><option>已验证</option></select></label>
        <div className="flex items-end justify-end gap-3 sm:col-span-2"><button type="button" className="rounded-xl border px-5 py-2.5" onClick={close}>取消</button><button disabled={pending} className="rounded-xl bg-[#173b34] px-6 py-2.5 text-white disabled:opacity-50">{pending ? "保存中…" : "保存到问题库"}</button></div>
      </form>
    </div>
  </div>;
}

export function FaqLibrary({ rows, customers }: { rows: FaqItem[]; customers: Customer[] }) {
  const [query, setQuery] = useState(""), [category, setCategory] = useState("全部"), [status, setStatus] = useState("全部"), [editing, setEditing] = useState<FaqItem | "new" | null>(null), [pending, startTransition] = useTransition();
  const filtered = useMemo(() => rows.filter(row => {
    const haystack = [row.question,row.answer,row.topic,row.customer_name,row.product_name,row.keywords,row.source].join(" ").toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (category === "全部" || row.category === category) && (status === "全部" || row.status === status);
  }), [rows, query, category, status]);
  const verified = rows.filter(row => row.status === "已验证").length;
  return <>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#e7dece] bg-white p-4"><div className="text-sm text-neutral-500">知识条目</div><div className="mt-1 text-2xl font-semibold text-[#173b34]">{rows.length}</div></div>
      <div className="rounded-2xl border border-[#e7dece] bg-white p-4"><div className="text-sm text-neutral-500">已验证答案</div><div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-emerald-700"><CheckCircle2 size={20}/>{verified}</div></div>
      <div className="rounded-2xl border border-[#e7dece] bg-white p-4"><div className="text-sm text-neutral-500">待补充整理</div><div className="mt-1 text-2xl font-semibold text-amber-700">{rows.length - verified}</div></div>
    </div>
    <section className="rounded-2xl border border-[#e7dece] bg-white">
      <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 text-neutral-400" size={17}/><input className="w-full rounded-xl border border-[#d8ccb8] py-2.5 pl-10 pr-3" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索问题、答案、客户、产品或关键词" /></div>
        <select className="rounded-xl border border-[#d8ccb8] px-3 py-2.5" value={category} onChange={e=>setCategory(e.target.value)}><option>全部</option><option>客户问题</option><option>产品问题</option></select>
        <select className="rounded-xl border border-[#d8ccb8] px-3 py-2.5" value={status} onChange={e=>setStatus(e.target.value)}><option>全部</option><option>待整理</option><option>需补充</option><option>已验证</option></select>
        <button onClick={()=>setEditing("new")} className="flex items-center justify-center gap-2 rounded-xl bg-[#173b34] px-4 py-2.5 text-white"><Plus size={17}/>记录新问题</button>
      </div>
      <div className="divide-y divide-[#eee7dc]">
        {filtered.map(row => <article className="p-5 hover:bg-[#fdfbf7]" key={row.id}>
          <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs"><span className={`rounded-full px-2.5 py-1 ${row.category === "产品问题" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{row.category}</span><span className="rounded-full bg-neutral-100 px-2.5 py-1">{row.topic || "未分类"}</span><span className={`rounded-full px-2.5 py-1 ${row.status === "已验证" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{row.status}</span></div>
              <h3 className="mt-3 text-base font-semibold leading-7 text-[#173b34]">{row.question}</h3>
              <div className="mt-3 rounded-xl bg-[#f7f4ee] p-4 text-sm leading-6 text-neutral-700"><span className="font-medium text-[#173b34]">参考答案：</span>{row.answer || "尚未填写，等待补充或验证。"}</div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-500"><span>客户：{row.customer_name || "通用问题"}</span><span>产品：{row.product_name || "—"}</span><span>关键词：{row.keywords || "—"}</span><span>来源：{row.source || "—"}</span></div>
            </div>
            <div className="flex shrink-0 items-start gap-2"><button title="编辑" onClick={()=>setEditing(row)} className="rounded-lg border p-2 text-neutral-600 hover:text-[#173b34]"><Pencil size={16}/></button><button title="删除" disabled={pending} onClick={()=>{ if (window.confirm("确认删除这条问题知识吗？")) startTransition(()=>deleteFaq(row.id)); }} className="rounded-lg border p-2 text-neutral-600 hover:text-red-600"><Trash2 size={16}/></button></div>
          </div>
        </article>)}
        {!filtered.length && <div className="grid place-items-center px-5 py-16 text-center text-neutral-400"><BookOpenText size={36}/><p className="mt-3">暂无符合条件的问题知识</p><p className="mt-1 text-sm">记录客户常见问题后，可以在这里快速检索复用。</p></div>}
      </div>
    </section>
    {editing && <Editor item={editing === "new" ? undefined : editing} customers={customers} close={()=>setEditing(null)} />}
  </>;
}
