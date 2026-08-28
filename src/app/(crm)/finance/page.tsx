import Decimal from "decimal.js";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { ModalForm } from "@/components/modal-form";
import { isLocalMode, localRows } from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/utils";
import { createFinancialRecord } from "./actions";
import { SearchableSelect } from "@/components/searchable-select";
import { FinancialRecordsTable } from "@/components/financial-records-table";
const input = "mt-1 w-full rounded-xl border border-[#d8ccb8] px-3 py-2.5";
export default async function Page() {
  let records: Record<string, unknown>[] = [];
  let suppliers: Record<string, unknown>[];
  let orders: Record<string, unknown>[];
  if (isLocalMode()) {
    records = localRows("financial_records");
    suppliers = localRows("suppliers");
    orders = localRows("orders");
  } else {
    const db = await createClient();
    const [recordsResult, suppliersResult, ordersResult] = await Promise.all([
      db.from("financial_records").select("*").is("deleted_at", null).order("occurred_at", { ascending: false }),
      db.from("suppliers").select("id,company_name").is("deleted_at", null).order("company_name"),
      db.from("orders").select("id,order_number,sales_amount,sales_currency,revenue_cny").is("deleted_at", null).order("order_date", { ascending: false }),
    ]);
    records = recordsResult.data ?? [];
    suppliers = suppliersResult.data ?? [];
    orders = ordersResult.data ?? [];
  }
  const supplierOptions = suppliers.map((s) => ({
    value: String(s.company_name),
    label: String(s.company_name),
  }));
  const orderOptions = orders.map((order) => ({
    value: String(order.id),
    label: `${String(order.order_number)} · ${String(order.sales_currency || "CNY")} ${Number(order.sales_amount || order.revenue_cny || 0).toLocaleString()}`,
  }));
  const sum = (type: string) =>
      records
        .filter((r) => r.record_type === type)
        .reduce((s, r) => s.plus(String(r.amount_cny || 0)), new Decimal(0)),
    income = sum("收入"),
    expense = sum("支出"),
    profit = income.minus(expense);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FINANCE"
        title="财务总览"
        description="新增收支记录后，收入、支出和净利润自动核算。"
        action={
          <ModalForm title="新增收支记录">
            <form
              action={createFinancialRecord}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label className="text-sm">
                类型
                <select className={input} name="record_type">
                  <option>收入</option>
                  <option>支出</option>
                </select>
              </label>
              <label className="text-sm">
                分类
                <input
                  className={input}
                  name="category"
                  placeholder="货款、样品费、运费等"
                />
              </label>
              <label className="text-sm">
                往来单位
                <SearchableSelect
                  name="counterparty"
                  options={supplierOptions}
                  placeholder="输入供应商名称搜索"
                  allowCustom
                />
              </label>
              <label className="text-sm">
                原币金额
                <input
                  aria-label="原币金额"
                  className={input}
                  name="amount"
                  type="number"
                  step="0.01"
                  required
                />
              </label>
              <label className="text-sm">
                币种
                <select className={input} name="currency">
                  <option>CNY</option>
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                </select>
              </label>
              <label className="text-sm">
                兑人民币汇率
                <input
                  aria-label="兑人民币汇率"
                  className={input}
                  name="exchange_rate"
                  type="number"
                  step="0.0001"
                  defaultValue="1"
                  required
                />
              </label>
              <label className="text-sm">
                发生日期
                <input
                  aria-label="发生日期"
                  className={input}
                  name="occurred_at"
                  type="date"
                  required
                />
              </label>
              <label className="text-sm">
                状态
                <select className={input} name="status">
                  <option>已完成</option>
                  <option>待收款</option>
                  <option>待付款</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                关联订单（自动带入订单金额）
                <SearchableSelect
                  name="order_id"
                  options={orderOptions}
                  placeholder="输入订单号或金额搜索"
                />
              </label>
              {[
                ["产品采购成本", "product_cost_cny"],
                ["运费", "freight_cny"],
                ["杂费", "miscellaneous_cny"],
                ["其他成本", "other_cost_cny"],
              ].map(([label, name]) => (
                <label className="text-sm" key={name}>
                  {label}
                  <input
                    className={input}
                    name={name}
                    type="number"
                    step="0.01"
                    defaultValue="0"
                  />
                </label>
              ))}
              <label className="text-sm sm:col-span-2">
                备注
                <textarea className={input} name="notes" />
              </label>
              <button className="rounded-xl bg-[#173b34] py-3 text-white sm:col-span-2">
                保存并核算
              </button>
            </form>
          </ModalForm>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="累计收入" value={money(income.toFixed(2))} />
        <StatCard
          label="累计支出"
          value={money(expense.toFixed(2))}
          tone="red"
        />
        <StatCard label="净利润" value={money(profit.toFixed(2))} />
      </section>
      <FinancialRecordsTable
        rows={records as (Record<string, unknown> & { id: string })[]}
        suppliers={supplierOptions}
        orders={orderOptions}
      />
      <section className="hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#faf7f1]">
            <tr>
              {[
                "日期",
                "类型",
                "分类",
                "往来单位",
                "原币金额",
                "折合人民币",
                "状态",
                "备注",
              ].map((x) => (
                <th className="p-3 text-left" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr className="border-t" key={String(r.id)}>
                <td className="p-4">{String(r.occurred_at)}</td>
                <td className="p-4">{String(r.record_type)}</td>
                <td className="p-4">{String(r.category || "—")}</td>
                <td className="p-4">{String(r.counterparty || "—")}</td>
                <td className="p-4">
                  {String(r.currency)} {Number(r.amount).toLocaleString()}
                </td>
                <td className="p-4">{money(String(r.amount_cny))}</td>
                <td className="p-4">{String(r.status)}</td>
                <td className="p-4">{String(r.notes || "—")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length && (
          <div className="p-12 text-center text-neutral-400">
            暂无收支记录，点击右上角新增。
          </div>
        )}
      </section>
    </div>
  );
}
