"use client";
import { useState, useTransition } from "react";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { deleteEntities, updateEntity } from "@/app/(crm)/entity-actions";
import { SearchableSelect } from "@/components/searchable-select";
import { MultiSelectInput } from "@/components/multi-select-input";
import { OpportunityEmailTemplate } from "@/components/opportunity-email-template";

type Row = Record<string, unknown> & { id: string };
export type ManagedColumn = {
  key: string;
  label: string;
  format?: "money" | "date" | "percent";
};
export type ManagedField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "multiselect" | "textarea";
  options?: (string | { value: string; label: string })[];
};
const inputClass =
  "mt-1 w-full rounded-xl border border-[#d8ccb8] px-3 py-2.5 outline-none focus:border-[#173b34]";
const show = (row: Row, column: ManagedColumn) => {
  const value = row[column.key];
  if (value === null || value === undefined || value === "") return "—";
  if (column.format === "date")
    return new Date(String(value)).toLocaleDateString("zh-CN");
  if (column.format === "money")
    return `${row.currency || row.sales_currency || "CNY"} ${Number(value).toLocaleString()}`;
  if (column.format === "percent") return `${Number(value).toFixed(1)}%`;
  return String(value);
};
export function ManagedEntityTable({
  rows,
  columns,
  fields,
  table,
  label,
}: {
  rows: Row[];
  columns: ManagedColumn[];
  fields: ManagedField[];
  table: "suppliers" | "opportunities" | "orders";
  label: string;
}) {
  const [checked, setChecked] = useState<string[]>([]),
    [selected, setSelected] = useState<Row | null>(null),
    [editing, setEditing] = useState(false),
    [orderRevenue, setOrderRevenue] = useState(0),
    [orderCost, setOrderCost] = useState(0),
    [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  const [pending, startTransition] = useTransition(),
    all = rows.length > 0 && checked.length === rows.length;
  const open = (row: Row, edit = false) => {
    setSelected(row);
    setEditing(edit);
    setOrderRevenue(Number(row.revenue_cny || 0));
    setOrderCost(Number(row.total_cost_cny || 0));
  };
  const orderProfit = orderRevenue - orderCost,
    orderMargin = orderRevenue ? (orderProfit / orderRevenue) * 100 : 0;
  const remove = () =>
    startTransition(async () => {
      await deleteEntities(table, deleteTargets);
      setChecked([]);
      setDeleteTargets([]);
    });
  return (
    <>
      <div className="mb-3 flex min-h-12 items-center justify-between rounded-xl border border-[#e7dece] bg-white px-4 py-2">
        <span className="text-sm text-neutral-500">
          {checked.length
            ? `已选择 ${checked.length} 条${label}`
            : `可勾选或全选${label}进行批量操作`}
        </span>
        <button
          disabled={!checked.length}
          onClick={() => setDeleteTargets(checked)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:bg-neutral-300"
        >
          <Trash2 size={16} />
          批量删除
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-[#e7dece] bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#faf7f1]">
            <tr>
              <th className="w-12 p-3">
                <input
                  type="checkbox"
                  aria-label={`全选${label}`}
                  checked={all}
                  onChange={() => setChecked(all ? [] : rows.map((r) => r.id))}
                />
              </th>
              {columns.map((c) => (
                <th className="whitespace-nowrap p-3 text-left" key={c.key}>
                  {c.label}
                </th>
              ))}
              <th className="p-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t hover:bg-[#fdfbf7]" key={row.id}>
                <td className="p-4">
                  <input
                    type="checkbox"
                    aria-label={`选择${label}`}
                    checked={checked.includes(row.id)}
                    onChange={() =>
                      setChecked((v) =>
                        v.includes(row.id)
                          ? v.filter((id) => id !== row.id)
                          : [...v, row.id],
                      )
                    }
                  />
                </td>
                {columns.map((c, i) => (
                  <td
                    className={`whitespace-nowrap p-4 ${i === 1 ? "font-medium text-[#173b34]" : ""}`}
                    key={c.key}
                  >
                    {i === 1 ? (
                      <button
                        onClick={() => open(row)}
                        className="hover:underline"
                      >
                        {show(row, c)}
                      </button>
                    ) : (
                      show(row, c)
                    )}
                  </td>
                ))}
                <td className="p-4">
                  <div className="flex gap-3">
                    <button title={`查看${label}`} onClick={() => open(row)}>
                      <Eye size={16} />
                    </button>
                    <button
                      title={`编辑${label}`}
                      onClick={() => open(row, true)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      title={`删除${label}`}
                      onClick={() => setDeleteTargets([row.id])}
                      className="hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <header className="flex justify-between border-b p-5">
              <h2 className="text-xl font-semibold text-[#173b34]">
                {editing ? `编辑${label}` : `${label}详情`}
              </h2>
              <button title="关闭" onClick={() => setSelected(null)}>
                <X />
              </button>
            </header>
            {editing ? (
              <form
                action={updateEntity.bind(null, table, selected.id)}
                onSubmit={() => setSelected(null)}
                className="grid gap-4 p-5 sm:grid-cols-2"
              >
                {fields.map((field) => (
                  <label className="text-sm" key={field.key}>
                    {field.label}
                    {field.type === "select" &&
                    field.options?.some(
                      (option) => typeof option !== "string",
                    ) ? (
                      <SearchableSelect
                        name={field.key}
                        options={
                          field.options as { value: string; label: string }[]
                        }
                        defaultValue={String(selected[field.key] ?? "")}
                        placeholder={`搜索${field.label}`}
                      />
                    ) : field.type === "multiselect" ? (
                      <MultiSelectInput
                        name={field.key}
                        options={field.options as string[]}
                        defaultValue={String(selected[field.key] ?? "")}
                      />
                    ) : field.type === "textarea" ? (
                      <textarea
                        aria-label={field.label}
                        className={`${inputClass} min-h-24`}
                        defaultValue={String(selected[field.key] ?? "")}
                        name={field.key}
                      />
                    ) : field.type === "select" ? (
                      <select
                        className={inputClass}
                        name={field.key}
                        defaultValue={String(selected[field.key] ?? "")}
                      >
                        {field.options?.map((option) => {
                          const value =
                              typeof option === "string"
                                ? option
                                : option.value,
                            label =
                              typeof option === "string"
                                ? option
                                : option.label;
                          return (
                            <option value={value} key={value}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    ) : (
                      <input
                        aria-label={field.label}
                        className={inputClass}
                        name={field.key}
                        type={field.type || "text"}
                        defaultValue={
                          table === "orders" &&
                          ["net_profit_cny", "profit_margin"].includes(
                            field.key,
                          )
                            ? undefined
                            : String(selected[field.key] ?? "")
                        }
                        readOnly={
                          table === "orders" &&
                          ["net_profit_cny", "profit_margin"].includes(
                            field.key,
                          )
                        }
                        value={
                          table === "orders" && field.key === "net_profit_cny"
                            ? orderProfit
                            : table === "orders" &&
                                field.key === "profit_margin"
                              ? orderMargin.toFixed(2)
                              : undefined
                        }
                        onChange={
                          table === "orders" && field.key === "revenue_cny"
                            ? (e) => setOrderRevenue(Number(e.target.value))
                            : table === "orders" &&
                                field.key === "total_cost_cny"
                              ? (e) => setOrderCost(Number(e.target.value))
                              : undefined
                        }
                      />
                    )}
                  </label>
                ))}
                <div className="flex justify-end gap-3 sm:col-span-2">
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-xl border px-5 py-2.5"
                  >
                    取消
                  </button>
                  <button className="rounded-xl bg-[#173b34] px-6 py-2.5 text-white">
                    保存修改
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5">
                <dl className="grid gap-5 sm:grid-cols-2">
                  {columns.map((c) => (
                    <div key={c.key}>
                      <dt className="text-xs text-neutral-500">{c.label}</dt>
                      <dd className="mt-1 font-medium">{show(selected, c)}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  {table === "opportunities" && (
                    <OpportunityEmailTemplate project={selected} />
                  )}
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-xl bg-[#173b34] px-5 py-2.5 text-white"
                  >
                    编辑{label}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {!!deleteTargets.length && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold">
              确认删除{deleteTargets.length}条{label}？
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              系统采用软删除，避免数据永久丢失。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={pending}
                onClick={() => setDeleteTargets([])}
                className="rounded-xl border px-5 py-2.5"
              >
                取消
              </button>
              <button
                disabled={pending}
                onClick={remove}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-white"
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
