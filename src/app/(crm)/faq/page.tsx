import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode, localRows } from "@/lib/local-db";
import { FaqLibrary, type FaqItem } from "./faq-library";

const MARKER = "FAQ_KB_V1\n";

export default async function Page() {
  const [records, customerRecords] = isLocalMode()
    ? [localRows("follow_ups", "deleted_at is null and channel=?", ["问题知识库"]), localRows("customers")]
    : await (async () => {
        const db = await createClient();
        const [faq, customers] = await Promise.all([
          db.from("follow_ups").select("id,customer_id,content,result,followed_at,created_at").eq("channel", "问题知识库").is("deleted_at", null).order("created_at", { ascending: false }),
          db.from("customers").select("id,company_name").is("deleted_at", null).order("company_name"),
        ]);
        if (faq.error) throw new Error(faq.error.message);
        return [faq.data ?? [], customers.data ?? []];
      })();
  const customers = customerRecords.map(row => ({ id: String(row.id), company_name: String(row.company_name) }));
  const customerNames = new Map(customers.map(row => [row.id, row.company_name]));
  const rows = records.flatMap((record): FaqItem[] => {
    const content = String(record.content || "");
    if (!content.startsWith(MARKER)) return [];
    try {
      const item = JSON.parse(content.slice(MARKER.length)) as Record<string, string>;
      return [{ id: String(record.id), question: item.question || "", answer: item.answer || "", category: item.category || "客户问题", topic: item.topic || "", customer_id: String(record.customer_id || ""), customer_name: customerNames.get(String(record.customer_id)) || "", product_name: item.product_name || "", keywords: item.keywords || "", source: item.source || "", status: String(record.result || item.status || "待整理"), updated_at: String(record.followed_at || record.created_at || "") }];
    } catch { return []; }
  });
  return <div className="space-y-6">
    <PageHeader eyebrow="KNOWLEDGE BASE" title="客户问题库 FAQ" description="集中记录客户遇到的问题、产品问题和已验证答案，形成可搜索、可复用的业务资料库。" />
    <FaqLibrary rows={rows} customers={customers} />
  </div>;
}
