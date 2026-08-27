"use client";

import { Check, Clipboard, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { saveMailDraft } from "./actions";

export function MailDraftEditor({ id, initialDraft }: { id: string; initialDraft: string }) {
  const [draft, setDraft] = useState(initialDraft);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    startTransition(async () => {
      await saveMailDraft(id, draft);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    });
  }

  async function copy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="space-y-3">
      <textarea
        aria-label="邮件主题和正文"
        className="min-h-[520px] w-full resize-y rounded-xl border border-[#cfded8] bg-white p-4 font-sans text-sm leading-7 text-neutral-800 outline-none focus:border-[#2d6a5d] focus:ring-2 focus:ring-[#2d6a5d]/15"
        onChange={(event) => {
          setDraft(event.target.value);
          setSaved(false);
        }}
        spellCheck
        value={draft}
      />
      <div className="flex flex-wrap justify-between gap-3">
        <p className="text-xs text-neutral-500">可直接修改 Subject 和正文；修改后请先保存，再批准。</p>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[#cbbfae] bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            onClick={copy}
            type="button"
          >
            {copied ? <Check size={16}/> : <Clipboard size={16}/>}
            {copied ? "已复制" : "复制邮件"}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-[#b98b3f] px-4 py-2 text-sm font-medium text-white hover:bg-[#a07835] disabled:opacity-60"
            disabled={pending}
            onClick={save}
            type="button"
          >
            {saved ? <Check size={16}/> : <Save size={16}/>}
            {pending ? "保存中..." : saved ? "已保存" : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}
