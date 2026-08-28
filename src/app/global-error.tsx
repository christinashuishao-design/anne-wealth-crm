"use client";

import { useEffect } from "react";

const RELOAD_KEY = "anne-crm-last-error-reload";
const RELOAD_COOLDOWN_MS = 15_000;

function reloadWithFreshVersion() {
  const url = new URL(window.location.href);
  url.searchParams.set("crm_refresh", Date.now().toString());
  window.location.replace(url.toString());
}

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
    const timer = window.setTimeout(reloadWithFreshVersion, 800);
    return () => window.clearTimeout(timer);
  }, [error]);

  const reloadNow = () => {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    reloadWithFreshVersion();
  };

  return (
    <html lang="zh-CN">
      <body
        className="min-h-screen bg-[#f7f2e8] grid place-items-center p-6"
        style={{ margin: 0, background: "#f7f2e8", fontFamily: "sans-serif" }}
      >
        <main
          className="w-full max-w-lg bg-white border border-[#e7dece] rounded-3xl p-10 text-center shadow-xl shadow-[#173b34]/5"
          style={{ maxWidth: 520, margin: "12vh auto", padding: 40, textAlign: "center", background: "white", border: "1px solid #e7dece", borderRadius: 24 }}
        >
          <div className="text-2xl font-semibold text-[#173b34]" style={{ color: "#173b34", fontSize: 24, fontWeight: 600 }}>
            Anne小富婆CRM
          </div>
          <h1 className="text-xl mt-6">正在恢复页面</h1>
          <p className="text-neutral-500 mt-3">
            CRM 正在载入最新版本，云端数据不会受到影响。
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <button
              onClick={reloadNow}
              className="rounded-xl bg-[#173b34] text-white px-6 py-3"
              style={{ margin: 6, padding: "12px 24px", border: 0, borderRadius: 12, background: "#173b34", color: "white", cursor: "pointer" }}
            >
              立即重新加载
            </button>
            <button
              onClick={retry}
              className="rounded-xl border border-[#173b34] text-[#173b34] px-6 py-3"
              style={{ margin: 6, padding: "12px 24px", border: "1px solid #173b34", borderRadius: 12, background: "white", color: "#173b34", cursor: "pointer" }}
            >
              重试页面
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
