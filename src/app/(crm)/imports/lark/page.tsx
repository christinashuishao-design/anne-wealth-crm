import { Cloud, DatabaseZap, RefreshCw, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { isLocalMode } from "@/lib/local-db";
import { larkCloudConfig } from "@/lib/lark-cloud";
import { dateTime } from "@/lib/utils";
import { saveConnection } from "./actions";

const field = "mt-1 w-full border border-[#ded5c6] rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c79f52]/30";
const mappingFields = [
  ["公司名称*", "company_name"], ["客户类型", "customer_type"], ["我司产品", "business_products"], ["客户阶段", "stage"],
  ["询盘等级", "inquiry_grade"], ["邮件内容", "email_content"], ["联系人", "contact_name"], ["邮箱", "email"],
  ["职位", "position"], ["社媒", "social_media"], ["电话", "phone"], ["最近沟通情况", "latest_result"],
  ["下一步跟进", "next_action"], ["提醒跟进", "follow_up_reminder"], ["跟进打卡", "follow_up_checkin"],
  ["创建时间", "lark_created_at"], ["最后跟进时间", "last_follow_up_at"], ["背调", "background_summary"],
  ["客户规模", "company_size"], ["国家", "country"], ["网站", "website"],
] as const;

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams;
  if (!isLocalMode()) {
    const config = larkCloudConfig();
    return <div className="space-y-6">
      <PageHeader eyebrow="LARK SYNC" title="Lark 多维表格客户同步" description="Cloudflare 云端直接读取 Lark，并增量新增 CRM 中不存在的客户。" />
      {p.error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{p.error}</div>}
      {p.synced && <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">同步完成：读取 {p.synced}，新增 {p.created || 0}，已有保持不变 {p.unchanged || 0}，跳过 {p.skipped || 0}，失败 {p.failed || 0}。</div>}
      <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-[#e7dece] bg-white p-7">
          <h2 className="flex items-center gap-2 font-semibold text-[#173b34]"><Cloud size={19} />云端直接同步</h2>
          <div className={`mt-5 rounded-xl p-4 text-sm ${config.configured ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{config.configured ? "Lark 服务端凭据已配置，可以直接同步。" : "同步代码已接入，等待配置 Lark 服务端凭据。"}</div>
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-[#faf7f1] p-3"><dt className="text-neutral-500">平台</dt><dd className="mt-1 font-medium">{config.region === "feishu" ? "飞书中国版" : "Lark 国际版"}</dd></div>
            <div className="rounded-xl bg-[#faf7f1] p-3"><dt className="text-neutral-500">App ID</dt><dd className="mt-1 font-medium">{config.appIdHint}</dd></div>
            <div className="rounded-xl bg-[#faf7f1] p-3"><dt className="text-neutral-500">Base Token</dt><dd className="mt-1 font-medium">{config.baseTokenHint}</dd></div>
            <div className="rounded-xl bg-[#faf7f1] p-3"><dt className="text-neutral-500">Table ID</dt><dd className="mt-1 font-medium">{config.tableIdHint}</dd></div>
          </dl>
          <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-neutral-500"><ShieldCheck size={16} className="mt-0.5 shrink-0" />App Secret 仅保存在 Cloudflare Secret；页面、浏览器和数据库都不会显示或保存明文。</div>
        </div>
        <aside className="rounded-2xl border border-[#e7dece] bg-white p-7">
          <h2 className="font-semibold text-[#173b34]">同步操作</h2>
          <p className="mt-3 text-sm leading-6 text-neutral-600">只新增 CRM 中不存在的客户；已有客户、项目关联和跟进记录不会被覆盖、恢复或删除。</p>
          <form action="/api/lark/sync" method="post"><button disabled={!config.configured} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b18436] py-3 text-white disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={16} />立即云端同步</button></form>
          {!config.configured && <p className="mt-3 text-xs text-amber-700">需要 LARK_APP_ID、LARK_APP_SECRET、LARK_BASE_TOKEN 和 LARK_TABLE_ID。</p>}
        </aside>
      </section>
    </div>;
  }

  const { getLarkConnection, larkSyncRuns } = await import("@/lib/lark");
  const connection = getLarkConnection(), runs = larkSyncRuns();
  const mapping = connection ? JSON.parse(connection.field_mapping) as Record<string, string> : {};
  return <div className="space-y-6">
    <PageHeader eyebrow="LARK SYNC" title="Lark 多维表格客户同步" description="本机模式：仅新增 CRM 中不存在的客户。" />
    {p.error && <div className="rounded-xl bg-red-50 p-4 text-red-700">{p.error}</div>}
    {p.saved && <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">连接测试成功，配置已加密保存在本机。</div>}
    {p.synced && <div className="rounded-xl bg-emerald-50 p-4 text-emerald-700">同步完成：读取 {p.synced}，新增 {p.created || 0}，已有保持不变 {p.unchanged || 0}，跳过 {p.skipped || 0}，失败 {p.failed || 0}。</div>}
    <section className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
      <div className="rounded-2xl border border-[#e7dece] bg-white p-6">
        <h2 className="flex gap-2 font-semibold text-[#173b34]"><DatabaseZap size={19} />连接设置</h2>
        <form action={saveConnection} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">连接名称<input className={field} name="name" defaultValue={connection?.name || "客户资料总表"} required /></label>
          <label className="text-sm">平台<select className={field} name="region" defaultValue={connection?.region || "feishu"}><option value="feishu">飞书中国版</option><option value="lark">Lark 国际版</option></select></label>
          <label className="text-sm">App ID<input className={field} name="appId" defaultValue={connection?.app_id || ""} required /></label>
          <label className="text-sm">App Secret<input className={field} name="appSecret" type="password" required /></label>
          <label className="text-sm">Base App Token<input className={field} name="baseToken" defaultValue={connection?.base_token || ""} required /></label>
          <label className="text-sm">Table ID<input className={field} name="tableId" defaultValue={connection?.table_id || ""} required /></label>
          <div className="border-t pt-5 sm:col-span-2"><h3 className="font-medium">字段映射</h3></div>
          {mappingFields.map(([label, name]) => <label className="text-sm" key={name}>{label}<input className={field} name={name} required={name === "company_name"} defaultValue={mapping[name] || label.replace("*", "")} /></label>)}
          <button className="rounded-xl bg-[#173b34] py-3 text-white sm:col-span-2">保存并测试连接</button>
        </form>
      </div>
      <aside className="space-y-5">
        <div className="rounded-2xl border border-[#e7dece] bg-white p-6"><h2 className="font-semibold text-[#173b34]">同步状态</h2><div className="mt-4 text-sm text-neutral-500">上次同步：{dateTime(connection?.last_synced_at)}</div>{connection ? <form action="/api/lark/sync" method="post"><input type="hidden" name="connectionId" value={connection.id} /><button className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#b18436] py-3 text-white"><RefreshCw size={16} />同步新增客户</button></form> : <p className="mt-4 text-sm text-amber-700">请先保存并测试连接。</p>}</div>
        <div className="rounded-2xl border border-[#e7dece] bg-white p-6"><h2 className="font-semibold text-[#173b34]">同步历史</h2><div className="mt-3 space-y-2 text-sm text-neutral-500">{runs.length ? runs.slice(0, 10).map((run) => <div className="border-b py-2" key={String(run.id)}>{String(run.status)} · 新增 {String(run.created_records || 0)} · {dateTime(String(run.started_at))}</div>) : "还没有同步记录"}</div></div>
      </aside>
    </section>
  </div>;
}
