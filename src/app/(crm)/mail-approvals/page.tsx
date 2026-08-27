import { MailCheck, RotateCcw, Send } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { isLocalMode, localRows } from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";
import { reviewMailDraft } from "./actions";
import { MailDraftEditor } from "./mail-draft-editor";

function splitDraft(content: unknown) {
  const text = String(content ?? "");
  const marker = "待审批回复草稿：";
  const index = text.indexOf(marker);
  if (index < 0) return { research: "", draft: text };
  return {
    research: text.slice(0, index).trim(),
    draft: text.slice(index + marker.length).trim(),
  };
}

export default async function Page() {
  const db = isLocalMode() ? null : await createClient();
  const [followUps, customers] = isLocalMode()
    ? [localRows("follow_ups"), localRows("customers")]
    : await Promise.all([
        db!.from("follow_ups").select("*").eq("channel", "来发信邮件").is("deleted_at", null).order("created_at", { ascending: false }),
        db!.from("customers").select("id,company_name,contact_name,email,website").is("deleted_at", null),
      ]).then(([draftRows, customerRows]) => [draftRows.data ?? [], customerRows.data ?? []]);

  const customerMap = new Map(customers.map((row) => [String(row.id), row]));
  const drafts = followUps
    .filter((row) => String(row.channel) === "来发信邮件")
    .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime());

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="MAIL APPROVAL"
        title="邮件审批"
        description="先查看客户背调和完整回复草稿，批准后仅进入等待发送状态，不会在本页直接发邮件。"
      />

      {!drafts.length && (
        <section className="rounded-2xl border border-[#e7dece] bg-white p-12 text-center text-neutral-400">
          暂无待审批的来发信邮件草稿。
        </section>
      )}

      {drafts.map((row) => {
        const customer = customerMap.get(String(row.customer_id));
        const { research, draft } = splitDraft(row.content);
        const approved = String(row.result) === "已批准，等待发送";
        const needsRevision = String(row.result) === "需修改";
        return (
          <article key={String(row.id)} className="overflow-hidden rounded-2xl border border-[#e7dece] bg-white shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#eee6d8] bg-[#faf7f1] p-5">
              <div>
                <div className="flex items-center gap-2 text-lg font-semibold text-[#173b34]"><MailCheck size={20}/>{String(customer?.company_name || "未匹配客户")}</div>
                <div className="mt-2 space-y-1 text-sm text-neutral-600">
                  <p>收件人：{String(customer?.contact_name || "—")} &lt;{String(customer?.email || "—")}&gt;</p>
                  <p>官网：{String(customer?.website || "—")}</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${approved ? "bg-emerald-100 text-emerald-800" : needsRevision ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
                {String(row.result || "待审批")}
              </span>
            </header>

            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]">
              <section className="rounded-xl border border-[#eee6d8] bg-[#fffcf7] p-4">
                <h2 className="mb-3 font-semibold text-[#173b34]">客户背调与询盘</h2>
                <div className="whitespace-pre-wrap text-sm leading-7 text-neutral-700">{research || "暂无背调摘要"}</div>
              </section>
              <section className="rounded-xl border border-[#d9e4df] bg-white p-4">
                <h2 className="mb-3 font-semibold text-[#173b34]">可编辑回复邮件</h2>
                <MailDraftEditor id={String(row.id)} initialDraft={draft}/>
              </section>
            </div>

            <footer className="flex flex-wrap justify-end gap-3 border-t border-[#eee6d8] bg-[#faf7f1] p-4">
              <form action={reviewMailDraft.bind(null, String(row.id), "需修改")}>
                <button className="inline-flex items-center gap-2 rounded-lg border border-[#cbbfae] bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50" type="submit">
                  <RotateCcw size={16}/>退回修改
                </button>
              </form>
              {approved ? (
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800">
                  <MailCheck size={16}/>已批准，等待发送
                </div>
              ) : (
                <form action={reviewMailDraft.bind(null, String(row.id), "已批准，等待发送")}>
                  <button className="inline-flex items-center gap-2 rounded-lg bg-[#173b34] px-4 py-2 text-sm font-medium text-white hover:bg-[#245449]" type="submit">
                    <Send size={16}/>批准草稿
                  </button>
                </form>
              )}
            </footer>
          </article>
        );
      })}
    </div>
  );
}
