"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function ResetPasswordPage() {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
    [],
  );
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setReady(Boolean(data.session));
      if (!data.session) setMessage("重设链接无效或已过期，请重新发送密码恢复邮件。");
    });
    return () => { active = false; };
  }, [supabase]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) return setMessage("密码至少需要 8 个字符。");
    if (password !== confirmPassword) return setMessage("两次输入的密码不一致。");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return setMessage("密码更新失败，请重新发送恢复邮件后再试。");
    await supabase.auth.signOut();
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-[#f7f2e8] flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-[#e7dece] bg-white p-9 shadow-xl shadow-[#173b34]/5">
        <p className="text-xs tracking-[.2em] text-[#a57d34]">ANNE WEALTH CRM</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#173b34]">设置新密码</h1>
        {done ? (
          <div className="mt-7">
            <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">密码已更新，请使用新密码登录。</p>
            <Link href="/login" className="mt-5 block rounded-xl bg-[#173b34] py-3.5 text-center font-medium text-white">返回登录</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-5">
            {message && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{message}</p>}
            <label className="block text-sm font-medium">新密码
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3 outline-none" />
            </label>
            <label className="block text-sm font-medium">再次输入新密码
              <input type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3 outline-none" />
            </label>
            <button disabled={!ready || saving} className="w-full rounded-xl bg-[#173b34] py-3.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "正在更新…" : "保存新密码"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
