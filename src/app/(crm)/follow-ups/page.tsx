import { PageHeader } from "@/components/page-header";
import { isLocalMode, localRows } from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const db = isLocalMode() ? null : await createClient();
  const [records, customers, opportunities] = isLocalMode()
    ? [localRows("follow_ups", "deleted_at is null and channel<>?", ["问题知识库"]), localRows("customers"), localRows("opportunities")]
    : await Promise.all([
        db!.from("follow_ups").select("*").is("deleted_at", null).neq("channel", "问题知识库").order("followed_at", { ascending: false }),
        db!.from("customers").select("id,company_name").is("deleted_at", null),
        db!.from("opportunities").select("id,title").is("deleted_at", null),
      ]).then(([followUps, customerRows, opportunityRows]) => [
        followUps.data ?? [],
        customerRows.data ?? [],
        opportunityRows.data ?? [],
      ]);
  const customerNames = new Map(
      customers.map((row) => [String(row.id), String(row.company_name)]),
    ),
    projectNames = new Map(
      opportunities.map((row) => [String(row.id), String(row.title)]),
    ),
    rows = [...records].sort(
      (a, b) =>
        new Date(String(b.followed_at)).getTime() -
        new Date(String(a.followed_at)).getTime(),
    );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FOLLOW UP"
        title="跟进记录"
        description="项目进度保存后会自动同步到这里，形成连续的客户跟进时间线。"
      />
      <section className="overflow-x-auto rounded-2xl border border-[#e7dece] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#faf7f1]">
            <tr>
              {['跟进时间', '客户公司', '项目', '阶段', '渠道', '进度内容'].map((title) => (
                <th className="whitespace-nowrap p-3 text-left" key={title}>{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t" key={String(row.id)}>
                <td className="whitespace-nowrap p-4">{new Date(String(row.followed_at)).toLocaleString('zh-CN')}</td>
                <td className="p-4 font-medium text-[#173b34]">{customerNames.get(String(row.customer_id)) || '未关联客户'}</td>
                <td className="p-4">{projectNames.get(String(row.opportunity_id)) || '—'}</td>
                <td className="p-4">{String(row.result || '—')}</td>
                <td className="p-4">{String(row.channel || '项目进度')}</td>
                <td className="min-w-80 p-4">{String(row.content)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="p-12 text-center text-neutral-400">暂无跟进记录；在项目中填写进度后会自动同步。</div>}
      </section>
    </div>
  );
}
