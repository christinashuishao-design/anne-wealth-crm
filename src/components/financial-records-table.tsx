"use client";
import { useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import {
  SearchableSelect,
  type SearchOption,
} from "@/components/searchable-select";
import {
  deleteFinancialRecords,
  updateFinancialRecord,
} from "@/app/(crm)/finance/actions";
import { money } from "@/lib/utils";
type RecordRow = Record<string, unknown> & { id: string };
const input = "mt-1 w-full rounded-xl border border-[#d8ccb8] px-3 py-2.5";
export function FinancialRecordsTable({
  rows,
  suppliers,
  orders,
}: {
  rows: RecordRow[];
  suppliers: SearchOption[];
  orders: SearchOption[];
}) {
  const [checked, setChecked] = useState<string[]>([]),
    [selected, setSelected] = useState<RecordRow | null>(null),
    [targets, setTargets] = useState<string[]>([]),
    [pending, start] = useTransition(),
    all = rows.length > 0 && checked.length === rows.length;
  const remove = () =>
    start(async () => {
      await deleteFinancialRecords(targets);
      setChecked([]);
      setTargets([]);
    });
  return (
    <>
      <div className="mb-3 flex items-center justify-between rounded-xl border bg-white p-3">
        <span className="text-sm text-neutral-500">
          {checked.length
            ? `已选择 ${checked.length} 条记录`
            : "可全选或勾选财务记录"}
        </span>
        <button
          disabled={!checked.length}
          onClick={() => setTargets(checked)}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:bg-neutral-300"
        >
          批量删除
        </button>
      </div>
      <section className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#faf7f1]">
            <tr>
              <th className="p-3">
                <input
                  aria-label="全选财务记录"
                  type="checkbox"
                  checked={all}
                  onChange={() => setChecked(all ? [] : rows.map((r) => r.id))}
                />
              </th>
              {[
                "日期",
                "类型",
                "分类",
                "往来单位",
                "原币金额",
                "折合人民币",
                "订单金额",
                "总成本",
                "净利润",
                "利润率",
                "状态",
                "备注",
                "操作",
              ].map((x) => (
                <th className="p-3 text-left" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr className="border-t" key={r.id}>
                <td className="p-4">
                  <input
                    type="checkbox"
                    checked={checked.includes(r.id)}
                    onChange={() =>
                      setChecked((v) =>
                        v.includes(r.id)
                          ? v.filter((id) => id !== r.id)
                          : [...v, r.id],
                      )
                    }
                  />
                </td>
                <td className="p-4">{String(r.occurred_at)}</td>
                <td className="p-4">{String(r.record_type)}</td>
                <td className="p-4">{String(r.category || "—")}</td>
                <td className="p-4">{String(r.counterparty || "—")}</td>
                <td className="p-4">
                  {String(r.currency)} {Number(r.amount).toLocaleString()}
                </td>
                <td className="p-4">{money(String(r.amount_cny))}</td>
                <td className="p-4">{money(String(r.order_revenue_cny || 0))}</td>
                <td className="p-4">{money(String(r.total_cost_cny || 0))}</td>
                <td className="p-4">
                  {money(String(r.calculated_profit_cny || 0))}
                </td>
                <td className="p-4">
                  {Number(r.profit_margin || 0).toFixed(2)}%
                </td>
                <td className="p-4">{String(r.status)}</td>
                <td className="p-4">{String(r.notes || "—")}</td>
                <td className="p-4">
                  <div className="flex gap-3">
                    <button title="编辑财务记录" onClick={() => setSelected(r)}>
                      <Pencil size={16} />
                    </button>
                    <button
                      title="删除财务记录"
                      onClick={() => setTargets([r.id])}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="p-12 text-center text-neutral-400">
            暂无收支记录，点击右上角新增。
          </div>
        )}
      </section>
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white">
            <header className="flex justify-between border-b p-5">
              <h2 className="text-xl font-semibold">编辑收支记录</h2>
              <button title="关闭" onClick={() => setSelected(null)}>
                <X />
              </button>
            </header>
            <form
              action={updateFinancialRecord.bind(null, selected.id)}
              onSubmit={() => setSelected(null)}
              className="grid gap-4 p-5 sm:grid-cols-2"
            >
              <label className="text-sm">
                类型
                <select
                  className={input}
                  name="record_type"
                  defaultValue={String(selected.record_type)}
                >
                  <option>收入</option>
                  <option>支出</option>
                </select>
              </label>
              <label className="text-sm">
                分类
                <input
                  className={input}
                  name="category"
                  defaultValue={String(selected.category || "")}
                />
              </label>
              <label className="text-sm">
                往来单位
                <SearchableSelect
                  name="counterparty"
                  options={suppliers}
                  defaultValue={String(selected.counterparty || "")}
                  placeholder="输入供应商名称搜索"
                  allowCustom
                />
              </label>
              <label className="text-sm">
                原币金额
                <input
                  aria-label="编辑原币金额"
                  className={input}
                  name="amount"
                  type="number"
                  step="0.01"
                  defaultValue={Number(selected.amount)}
                />
              </label>
              <label className="text-sm">
                币种
                <select
                  className={input}
                  name="currency"
                  defaultValue={String(selected.currency)}
                >
                  {["CNY", "USD", "EUR", "GBP"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                兑人民币汇率
                <input
                  aria-label="编辑兑人民币汇率"
                  className={input}
                  name="exchange_rate"
                  type="number"
                  step="0.0001"
                  defaultValue={
                    Number(selected.amount)
                      ? Number(selected.amount_cny) / Number(selected.amount)
                      : 1
                  }
                />
              </label>
              <label className="text-sm">
                发生日期
                <input
                  className={input}
                  name="occurred_at"
                  type="date"
                  defaultValue={String(selected.occurred_at).slice(0, 10)}
                />
              </label>
              <label className="text-sm">
                状态
                <select
                  className={input}
                  name="status"
                  defaultValue={String(selected.status)}
                >
                  <option>已完成</option>
                  <option>待收款</option>
                  <option>待付款</option>
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                关联订单（自动带入订单金额）
                <SearchableSelect
                  name="order_id"
                  options={orders}
                  defaultValue={String(selected.order_id || "")}
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
                    defaultValue={Number(selected[name] || 0)}
                  />
                </label>
              ))}
              <div className="rounded-xl bg-[#faf7f1] p-4 text-sm">
                <div>
                  订单收入：{money(String(selected.order_revenue_cny || 0))}
                </div>
                <div className="mt-1">
                  总成本：{money(String(selected.total_cost_cny || 0))}
                </div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                <div>
                  净利润：{money(String(selected.calculated_profit_cny || 0))}
                </div>
                <div className="mt-1">
                  利润率：{Number(selected.profit_margin || 0).toFixed(2)}%
                </div>
              </div>
              <label className="text-sm sm:col-span-2">
                备注
                <textarea
                  className={input}
                  name="notes"
                  defaultValue={String(selected.notes || "")}
                />
              </label>
              <button className="rounded-xl bg-[#173b34] py-3 text-white sm:col-span-2">
                保存修改并重新核算
              </button>
            </form>
          </div>
        </div>
      )}
      {!!targets.length && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/35">
          <div className="rounded-2xl bg-white p-6">
            <h2 className="font-semibold">
              确认删除 {targets.length} 条财务记录？
            </h2>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setTargets([])}
                className="rounded-xl border px-5 py-2"
              >
                取消
              </button>
              <button
                disabled={pending}
                onClick={remove}
                className="rounded-xl bg-red-600 px-5 py-2 text-white"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
