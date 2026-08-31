"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Mail, X } from "lucide-react";

type Project = Record<string, unknown>;

function templateFor(project: Project) {
  const contact = String(project.customer_contact_name || "").trim();
  const greetingName = contact ? contact.split(/\s+/)[0] : "there";
  const company = String(project.customer_name || "your company");
  const title = String(project.title || "your packaging project");
  const stage = String(project.status || "");
  const progress = String(project.project_progress || "").trim();
  const progressLine = progress
    ? `\nI am following up on our latest progress: ${progress}.\n`
    : "\n";

  const bodies: Record<string, string> = {
    "有明确询盘": `To help us prepare the right packaging proposal, could you please confirm the required capacity, material preference, target quantity, decoration, and expected delivery schedule? If the formula is available, please also share its key characteristics so we can review packaging compatibility before confirming a solution.`,
    "已报价": `I would like to check whether you have had a chance to review our quotation. Please let me know if you would like us to adjust the quantity, decoration, material, or packaging combination. We can then update the proposal based on your priorities.`,
    "样品准备中": `We are following up on the sample preparation. Please confirm the final sample specifications, color, decoration artwork, delivery address, consignee details, and courier account if applicable. We will confirm feasibility and timing after these details are checked.`,
    "样品已寄": `May I ask whether the samples have arrived safely and whether you have completed the initial evaluation? We would appreciate your feedback on appearance, function, fit, and formula compatibility. Any changes can be reviewed before moving to the next stage.`,
    "价格谈判": `Thank you for your feedback on the commercial terms. To review the best workable option, could you confirm your target quantity, target price, required decoration, packaging standard, and delivery expectation? We will reassess the proposal without making assumptions about specifications or quality requirements.`,
    "等待订单": `I am checking whether you need any final information before confirming the order. Please let us know if the specification, artwork, quantity, shipping terms, payment details, or proforma invoice requires clarification. We can prepare the next documents after your confirmation.`,
    "已流失": `I wanted to reconnect regarding this packaging project. If the project is still active, we would be glad to review any updated requirements for material, capacity, quantity, decoration, or budget. If priorities have changed, a brief update would also help us support you more appropriately in the future.`,
  };
  const body =
    bodies[stage] ||
    `I am following up to see whether there are any updates or questions regarding this project. Please let us know the next information you need from us, and we will prepare it accordingly.`;
  return {
    subject: `Follow-up: ${title}`,
    body: `Dear ${greetingName},\n\nI hope you are doing well.${progressLine}\n${body}\n\nWe would be pleased to continue supporting ${company} with the most suitable paper, glass, plastic, metal, or combined packaging direction based on the product requirements. Any MOQ, pricing, lead time, certification, or compatibility point will be confirmed after the final specifications are reviewed.\n\nBest regards,\nAnne`,
  };
}

export function OpportunityEmailTemplate({ project }: { project: Project }) {
  const initial = useMemo(() => templateFor(project), [project]);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [copied, setCopied] = useState(false);

  async function copyDraft() {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <button
        className="flex items-center gap-2 rounded-xl border border-[#d8ccb8] px-5 py-2.5 text-[#173b34]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Mail size={16} /> 跟进邮件模板
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b p-5">
              <div>
                <h2 className="text-lg font-semibold text-[#173b34]">客户跟进邮件草稿</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  收件人：{String(project.customer_email || "客户邮箱未填")}
                  · 客户：{String(project.customer_name || "未关联")}
                </p>
              </div>
              <button aria-label="关闭" onClick={() => setOpen(false)} type="button">
                <X />
              </button>
            </header>
            <div className="space-y-4 p-5">
              <label className="block text-sm">
                主题
                <input
                  className="mt-1 w-full rounded-xl border border-[#d8ccb8] px-3 py-2.5 outline-none"
                  onChange={(event) => setSubject(event.target.value)}
                  value={subject}
                />
              </label>
              <label className="block text-sm">
                正文（可编辑）
                <textarea
                  className="mt-1 min-h-96 w-full rounded-xl border border-[#d8ccb8] p-4 font-sans leading-7 outline-none"
                  onChange={(event) => setBody(event.target.value)}
                  value={body}
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">
                  草稿不会自动发送；报价、MOQ、交期、认证与兼容性仍需人工确认。
                </p>
                <button
                  className="flex items-center gap-2 rounded-xl bg-[#173b34] px-5 py-2.5 text-white"
                  onClick={copyDraft}
                  type="button"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "已复制" : "复制邮件草稿"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
