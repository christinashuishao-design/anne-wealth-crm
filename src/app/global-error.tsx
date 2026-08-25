"use client";

import { useEffect } from "react";

const RELOAD_KEY = "anne-crm-last-error-reload";
const RELOAD_COOLDOWN_MS = 15_000;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("CRM 页面加载失败", error);

    // Open tabs can briefly retain an old Next.js payload after the local
    // background service restarts. Reload once, with a cooldown to prevent
    // a real persistent error from becoming an infinite refresh loop.
    const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return;

    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    const timer = window.setTimeout(() => window.location.reload(), 800);
    return () => window.clearTimeout(timer);
  }, [error]);

  const reloadNow = () => {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  };

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#f7f2e8] grid place-items-center p-6">
        <main className="w-full max-w-lg bg-white border border-[#e7dece] rounded-3xl p-10 text-center shadow-xl shadow-[#173b34]/5">
          <div className="text-2xl font-semibold text-[#173b34]">
            Anne小富婆CRM
          </div>
          <h1 className="text-xl mt-6">正在恢复页面</h1>
          <p className="text-neutral-500 mt-3">
            CRM 正在自动重新连接，本地数据不会受到影响。
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <button
              onClick={reloadNow}
              className="rounded-xl bg-[#173b34] text-white px-6 py-3"
            >
              立即重新加载
            </button>
            <button
              onClick={retry}
              className="rounded-xl border border-[#173b34] text-[#173b34] px-6 py-3"
            >
              重试页面
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
