import { Search } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ModalForm } from "@/components/modal-form";
import { createCustomer } from "./actions";
import { isLocalMode, localRows } from "@/lib/local-db";
import { CustomerTable } from "@/components/customer-table";

const field =
  "w-full border border-[#ded5c6] rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#c79f52]/30";
type CustomerRow = Record<string, unknown> & {
  id: string;
  customer_code?: string;
  company_name: string;
  country?: string;
  stage: string;
  grade: string;
  source?: string;
  next_follow_up_at?: string;
  notes?: string;
  customer_type?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  latest_result?: string;
  next_action?: string;
  contacts?: { count: number }[];
  opportunities?: { count: number }[];
};
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const {
    q = "",
    stage = "",
    page: pageValue = "1",
    pageSize: pageSizeValue = "50",
  } = await searchParams;
  const pageSize = pageSizeValue === "100" ? 100 : 50;
  const requestedPage = Math.max(1, Number.parseInt(pageValue, 10) || 1);
  let total = 0;
  let data: CustomerRow[] | null,
    error: { message: string } | null = null;
  if (isLocalMode()) {
    const filtered = localRows("customers").filter(
      (c) =>
        (!q ||
          String(c.company_name).toLowerCase().includes(q.toLowerCase())) &&
        (!stage || c.stage === stage),
    );
    total = filtered.length;
    const safePage = Math.min(
      requestedPage,
      Math.max(1, Math.ceil(total / pageSize)),
    );
    data = filtered.slice((safePage - 1) * pageSize, safePage * pageSize).map(
      (c) =>
        ({
          ...c,
          contacts: [{ count: 0 }],
          opportunities: [{ count: 0 }],
        }) as CustomerRow,
    );
  } else {
    const supabase = await createClient();
    let query = supabase
      .from("customers")
      .select("*,contacts(count),opportunities(count)", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1);
    if (q) query = query.ilike("company_name", `%${q}%`);
    if (stage) query = query.eq("stage", stage);
    const result = await query;
    data = result.data as CustomerRow[] | null;
    error = result.error;
    total = result.count ?? 0;
  }
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const hrefFor = (targetPage: number, targetSize = pageSize) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (stage) params.set("stage", stage);
    params.set("page", String(targetPage));
    params.set("pageSize", String(targetSize));
    return `/customers?${params.toString()}`;
  };
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (number) =>
      number === 1 || number === totalPages || Math.abs(number - page) <= 2,
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CUSTOMERS"
        title="客户资料"
        description="管理客户资产、阶段、等级与下一次跟进。"
        action={
          <ModalForm title="新建客户">
            <form action={createCustomer} className="grid sm:grid-cols-2 gap-4">
              <label className="text-sm">
                公司名称*
                <input className={field} name="company_name" required />
              </label>
              <label className="text-sm">
                国家
                <input className={field} name="country" />
              </label>
              <label className="text-sm">
                客户阶段
                <select className={field} name="stage">
                  {[
                    "待开发",
                    "已回复",
                    "需求确认中",
                    "有明确询盘",
                    "已报价",
                    "样品准备中",
                    "样品已寄",
                    "客户测试中",
                    "价格谈判",
                    "等待订单",
                    "已成交",
                    "沉睡",
                    "已流失",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                客户等级
                <select className={field} name="grade">
                  {["A", "B", "C"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                网站
                <input className={field} name="website" />
              </label>
              <label className="text-sm">
                来源
                <input className={field} name="source" />
              </label>
              <label className="text-sm">
                下次跟进
                <input
                  className={field}
                  name="next_follow_up_at"
                  type="datetime-local"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                备注
                <textarea className={field} name="notes" />
              </label>
              <button className="sm:col-span-2 bg-[#173b34] text-white rounded-xl py-3">
                保存客户
              </button>
            </form>
          </ModalForm>
        }
      />
      <form className="bg-white border border-[#e7dece] rounded-2xl p-4 flex flex-wrap gap-3">
        <input type="hidden" name="pageSize" value={pageSize} />
        <div className="flex items-center border rounded-xl px-3 flex-1 min-w-60">
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            className="p-2.5 outline-none w-full"
            placeholder="搜索公司名称"
          />
        </div>
        <select
          name="stage"
          defaultValue={stage}
          className="border rounded-xl px-3"
        >
          <option value="">全部阶段</option>
          {[
            "待开发",
            "已回复",
            "已报价",
            "样品已寄",
            "价格谈判",
            "等待订单",
            "已成交",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <button className="px-5 rounded-xl bg-[#f1eadc] text-[#173b34]">
          筛选
        </button>
      </form>
      {!error && data && (
        <div className="text-sm text-neutral-500">
          当前共显示{" "}
          <span className="font-semibold text-[#173b34]">{data.length}</span>{" "}
          位客户
        </div>
      )}
      {!error && data && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
          <div>
            客户总数{" "}
            <span className="font-semibold text-[#173b34]">{total}</span>
            ，本页显示第 {start}–{end} 位
          </div>
          <div className="flex items-center gap-2">
            <span>每页显示</span>
            {[50, 100].map((size) => (
              <Link
                key={size}
                href={hrefFor(1, size)}
                className={`rounded-lg border px-3 py-1.5 ${pageSize === size ? "border-[#173b34] bg-[#173b34] text-white" : "bg-white"}`}
              >
                {size}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div>
        {error ? (
          <div className="p-10 text-red-600">加载失败：{error.message}</div>
        ) : data?.length ? (
          <CustomerTable rows={data} />
        ) : (
          <div className="rounded-2xl border border-[#e7dece] bg-white p-12 text-center text-neutral-400">
            还没有客户
          </div>
        )}
      </div>
      {!error && totalPages > 1 && (
        <nav
          aria-label="客户分页"
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <Link
            aria-disabled={page === 1}
            href={page === 1 ? hrefFor(1) : hrefFor(page - 1)}
            className={`rounded-lg border bg-white px-4 py-2 text-sm ${page === 1 ? "pointer-events-none opacity-40" : "hover:border-[#173b34]"}`}
          >
            上一页
          </Link>
          {pageNumbers.map((number, index) => (
            <span className="contents" key={number}>
              {index > 0 && number - pageNumbers[index - 1] > 1 ? (
                <span className="px-1 text-neutral-400">…</span>
              ) : null}
              <Link
                href={hrefFor(number)}
                aria-current={number === page ? "page" : undefined}
                className={`min-w-10 rounded-lg border px-3 py-2 text-center text-sm ${number === page ? "border-[#173b34] bg-[#173b34] text-white" : "bg-white hover:border-[#173b34]"}`}
              >
                {number}
              </Link>
            </span>
          ))}
          <Link
            aria-disabled={page === totalPages}
            href={page === totalPages ? hrefFor(totalPages) : hrefFor(page + 1)}
            className={`rounded-lg border bg-white px-4 py-2 text-sm ${page === totalPages ? "pointer-events-none opacity-40" : "hover:border-[#173b34]"}`}
          >
            下一页
          </Link>
        </nav>
      )}
    </div>
  );
}
