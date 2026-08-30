"use client";

import { useRef, useState } from "react";
import { useModalFormComplete } from "@/components/modal-form";

export function TaskCreateForm({
  action,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const complete = useModalFormComplete();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(formData: FormData) {
    setSaving(true);
    setError("");
    try {
      await action(formData);
      formRef.current?.reset();
      complete();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form action={save} className="grid gap-4 sm:grid-cols-2" ref={formRef}>
      {children}
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      )}
      <button
        className="rounded-xl bg-[#173b34] py-3 text-white disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
        disabled={saving}
        type="submit"
      >
        {saving ? "正在保存…" : "保存任务"}
      </button>
    </form>
  );
}
