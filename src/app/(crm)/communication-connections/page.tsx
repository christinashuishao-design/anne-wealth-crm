import { Cable, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const db = await createClient();
  const { data, error } = await db.from("communication_connections").select("*").order("source_type").order("display_name");
  const rows = data || [];
  return <div className="space-y-6">
    <PageHeader eyebrow="COMMUNICATION SYNC" title="通信来源" description="九个来源分别记录连接、游标、最近成功时间和具体错误。CRM 只读取并生成待审批内容，永不自动发送。" />
    {error && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">数据库尚未执行通信连接迁移：{error.message}</div>}
    <div className="grid gap-4 xl:grid-cols-2">
      {rows.map((row) => {
        const ok = row.status === "已连接";
        return <article key={row.source_key} className="rounded-2xl border border-[#e7dece] bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 font-semibold text-[#173b34]"><Cable size={18}/>{row.display_name}</h2><p className="mt-1 text-sm text-neutral-500">{row.account_identifier} · {row.transport}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${ok ? "bg-emerald-100 text-emerald-800" : row.status === "连接失败" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{ok ? <CheckCircle2 size={13}/> : <CircleAlert size={13}/>} {row.status}</span></div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-lg bg-[#faf7f1] p-2"><b className="block text-base text-[#173b34]">{row.read_count}</b>读取</div><div className="rounded-lg bg-[#faf7f1] p-2"><b className="block text-base text-[#173b34]">{row.matched_count}</b>匹配</div><div className="rounded-lg bg-[#faf7f1] p-2"><b className="block text-base text-[#173b34]">{row.draft_count}</b>草稿</div></div>
          <p className="mt-4 flex items-center gap-2 text-xs text-neutral-500"><Clock3 size={13}/>最近成功：{row.last_success_at ? new Date(row.last_success_at).toLocaleString("zh-CN") : "尚未成功同步"}</p>
          {row.last_error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">{row.last_error}</p>}
        </article>;
      })}
    </div>
  </div>;
}
