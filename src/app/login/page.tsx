import { Coins, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { isLocalMode } from "@/lib/local-db";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; setup?: string }> }) {
  const { error, setup } = await searchParams;
  const local=isLocalMode(), configured=local||Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return <main className="min-h-screen bg-[#f7f2e8] grid lg:grid-cols-2">
    <section className="hidden lg:flex p-16 bg-[#173b34] text-[#f7f2e8] flex-col justify-between">
      <div className="flex items-center gap-3 text-xl"><Coins className="text-[#d4af67]" />Anne小富婆CRM</div>
      <div><p className="text-[#d4af67] tracking-[.25em] text-sm mb-5">ANNE WEALTH CRM</p><h1 className="text-5xl leading-tight font-semibold">让每一次跟进<br />都有结果。</h1><p className="mt-6 text-white/65 max-w-md">客户、产品、供应商、订单与利润，都在一个清晰而可靠的工作空间里。</p></div>
      <p className="text-sm text-white/45">外贸客户与利润管理系统</p>
    </section>
    <section className="flex items-center justify-center p-6"><div className="w-full max-w-md bg-white rounded-3xl border border-[#e7dece] shadow-xl shadow-[#173b34]/5 p-9">
      <div className="lg:hidden text-[#173b34] font-semibold mb-10">Anne小富婆CRM</div>
      <h2 className="text-3xl font-semibold text-[#173b34]">欢迎回来，Anne</h2><p className="text-neutral-500 mt-3 mb-8">管理客户、产品、供应商与利润，让每一次跟进都有结果。</p>
      {local&&<div className="mb-5 rounded-xl bg-emerald-50 text-emerald-800 p-3 text-sm">本地数据库模式已启用，数据保存在当前电脑中。</div>}
      {!local&&(!configured||setup) && <div className="mb-5 rounded-xl bg-amber-50 text-amber-800 p-3 text-sm">网站已启动。登录功能需要先按照 <b>README.md</b> 配置 <b>.env.local</b> 中的 Supabase 地址和密钥。</div>}
      {error && <div className="mb-5 rounded-xl bg-red-50 text-red-700 p-3 text-sm">{error}</div>}
      <form action={login} className="space-y-5">
        <label className="block text-sm font-medium">登录邮箱<div className="mt-2 flex items-center border rounded-xl px-3"><Mail size={17} className="text-neutral-400"/><input name="email" type="email" required className="w-full p-3 outline-none" placeholder="anne@example.com" /></div></label>
        <label className="block text-sm font-medium">密码<div className="mt-2 flex items-center border rounded-xl px-3"><LockKeyhole size={17} className="text-neutral-400"/><input name="password" type="password" required className="w-full p-3 outline-none" placeholder="••••••••" /></div></label>
        {configured?<button className="w-full rounded-xl bg-[#173b34] text-white py-3.5 font-medium hover:bg-[#204c43]">登录 Anne CRM</button>:<Link href="/setup" className="block text-center w-full rounded-xl bg-[#173b34] text-white py-3.5 font-medium hover:bg-[#204c43]">打开首次配置向导</Link>}
      </form>
    </div></section>
  </main>;
}
