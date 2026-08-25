"use client";
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateCustomer } from "@/app/(crm)/customers/actions";
type Customer = Record<string, unknown> & {
  id: string;
  company_name: string;
  stage: string;
  grade: string;
};
const field = "mt-1 w-full rounded-lg border border-[#ded5c6] px-3 py-2.5";
const textFields = [
  ["公司名称*", "company_name"],
  ["客户类型", "customer_type"],
  ["我司产品", "business_products"],
  ["询盘等级", "inquiry_grade"],
  ["邮件内容", "email_content"],
  ["联系人", "contact_name"],
  ["邮箱", "email"],
  ["职位", "position"],
  ["社媒", "social_media"],
  ["电话", "phone"],
  ["最近沟通情况", "latest_result"],
  ["下一步跟进", "next_action"],
  ["提醒跟进", "follow_up_reminder"],
  ["跟进打卡", "follow_up_checkin"],
  ["背调", "background_summary"],
  ["客户规模", "company_size"],
  ["国家", "country"],
  ["网站", "website"],
  ["客户来源", "source"],
];
export function CustomerEditButton({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title="编辑客户"
        onClick={() => setOpen(true)}
        className="text-neutral-400 hover:text-[#173b34]"
      >
        <Pencil size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <header className="flex justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-semibold text-[#173b34]">
                  编辑客户完整资料
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {customer.company_name}
                </p>
              </div>
              <button title="关闭" onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            <form
              action={updateCustomer.bind(null, customer.id)}
              className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={() => setOpen(false)}
            >
              {textFields.map(([label, name]) => (
                <label
                  className={`text-sm ${["email_content", "background_summary"].includes(name) ? "lg:col-span-2" : ""}`}
                  key={name}
                >
                  {label}
                  <input
                    className={field}
                    name={name}
                    defaultValue={String(customer[name] ?? "")}
                    required={name === "company_name"}
                  />
                </label>
              ))}
              <label className="text-sm">
                客户阶段
                <select
                  className={field}
                  name="stage"
                  defaultValue={String(customer.stage)}
                >
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
                <select
                  className={field}
                  name="grade"
                  defaultValue={String(customer.grade)}
                >
                  {["A", "B", "C"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              {[
                ["下次跟进", "next_follow_up_at"],
                ["最后跟进时间", "last_follow_up_at"],
                ["创建时间", "lark_created_at"],
              ].map(([label, name]) => (
                <label className="text-sm" key={name}>
                  {label}
                  <input
                    className={field}
                    name={name}
                    type="datetime-local"
                    defaultValue={String(customer[name] ?? "").slice(0, 16)}
                  />
                </label>
              ))}
              <label className="text-sm lg:col-span-3">
                备注
                <textarea
                  className={field}
                  name="notes"
                  rows={3}
                  defaultValue={String(customer.notes ?? "")}
                />
              </label>
              <div className="flex justify-end gap-3 lg:col-span-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border px-5 py-2.5"
                >
                  取消
                </button>
                <button className="rounded-xl bg-[#173b34] px-6 py-2.5 text-white">
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
