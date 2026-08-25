"use client";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { CustomerEditButton } from "@/components/customer-edit-button";
import { deleteCustomers } from "@/app/(crm)/customers/actions";
type Customer = Record<string, unknown> & {
  id: string;
  company_name: string;
  stage: string;
  grade: string;
};
const columns: [[string, string], ...[string, string][]] = [
  ["customer_code", "客户编号"],
  ["company_name", "公司名称"],
  ["customer_type", "客户类型"],
  ["business_products", "我司产品"],
  ["stage", "客户阶段"],
  ["inquiry_grade", "询盘等级"],
  ["email_content", "邮件内容"],
  ["contact_name", "联系人"],
  ["email", "邮箱"],
  ["position", "职位"],
  ["social_media", "社媒"],
  ["phone", "电话"],
  ["latest_result", "最近沟通情况"],
  ["next_action", "下一步跟进"],
  ["follow_up_reminder", "提醒跟进"],
  ["follow_up_checkin", "跟进打卡"],
  ["lark_created_at", "创建时间"],
  ["last_follow_up_at", "最后跟进时间"],
  ["background_summary", "背调"],
  ["company_size", "客户规模"],
  ["country", "国家"],
  ["website", "网站"],
  ["grade", "等级"],
  ["source", "来源"],
  ["notes", "备注"],
  ["next_follow_up_at", "下次跟进"],
];
const value = (c: Customer, key: string) => {
  const v = c[key];
  if (v === null || v === undefined || v === "") return "—";
  if (key.includes("_at")) return new Date(String(v)).toLocaleString("zh-CN");
  return String(v);
};
export function CustomerTable({ rows }: { rows: Customer[] }) {
  const [checked, setChecked] = useState<string[]>([]),
    [targets, setTargets] = useState<string[]>([]);
  const [pending, start] = useTransition(),
    all = rows.length > 0 && checked.length === rows.length;
  const remove = () =>
    start(async () => {
      await deleteCustomers(targets);
      setChecked([]);
      setTargets([]);
    });
  return (
    <>
      <div className="mb-3 flex min-h-12 items-center justify-between rounded-xl border border-[#e7dece] bg-white px-4 py-2">
        <span className="text-sm text-neutral-500">
          {checked.length
            ? `已选择 ${checked.length} 位客户`
            : "全选仅选择当前页，可批量操作"}
        </span>
        <button
          disabled={!checked.length}
          onClick={() => setTargets(checked)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:bg-neutral-300"
        >
          <Trash2 size={16} />
          批量删除
        </button>
      </div>
      <div className="max-h-[calc(100vh-300px)] min-h-[360px] overflow-auto rounded-2xl border border-[#e7dece] bg-white">
        <table className="min-w-max text-sm">
          <thead className="sticky top-0 bg-[#faf7f1] text-neutral-600">
            <tr>
              <th className="sticky left-0 z-20 bg-[#faf7f1] p-3">
                <input
                  aria-label="全选客户"
                  type="checkbox"
                  checked={all}
                  onChange={() => setChecked(all ? [] : rows.map((r) => r.id))}
                />
              </th>
              {columns.map(([, label]) => (
                <th className="whitespace-nowrap p-3 text-left" key={label}>
                  {label}
                </th>
              ))}
              <th className="sticky right-0 bg-[#faf7f1] p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr className="border-t hover:bg-[#fdfbf7]" key={c.id}>
                <td className="sticky left-0 bg-white p-4">
                  <input
                    aria-label={`选择 ${c.company_name}`}
                    type="checkbox"
                    checked={checked.includes(c.id)}
                    onChange={() =>
                      setChecked((v) =>
                        v.includes(c.id)
                          ? v.filter((id) => id !== c.id)
                          : [...v, c.id],
                      )
                    }
                  />
                </td>
                {columns.map(([key]) => (
                  <td
                    title={value(c, key)}
                    className={`max-w-64 truncate whitespace-nowrap p-4 ${key === "company_name" ? "font-medium text-[#173b34]" : ""}`}
                    key={key}
                  >
                    {value(c, key)}
                  </td>
                ))}
                <td className="sticky right-0 bg-white p-4">
                  <div className="flex gap-3">
                    <CustomerEditButton customer={c} />
                    <button
                      title="删除客户"
                      onClick={() => setTargets([c.id])}
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
      {!!targets.length && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold">
              确认删除 {targets.length} 位客户？
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              采用软删除，避免永久丢失。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={pending}
                onClick={() => setTargets([])}
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
