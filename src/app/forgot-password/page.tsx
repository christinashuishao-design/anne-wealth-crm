import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  return (
    <main className="min-h-screen bg-[#f7f2e8] flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-[#e7dece] bg-white p-9 shadow-xl shadow-[#173b34]/5">
        <p className="text-xs tracking-[.2em] text-[#a57d34]">ANNE WEALTH CRM</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#173b34]">重设登录密码</h1>
        {sent ? (
          <div className="mt-7">
            <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">如果该邮箱存在，密码恢复邮件已经发送。请使用最新一封邮件中的链接。</p>
            <Link href="/login" className="mt-5 block text-center text-sm text-[#173b34] underline">返回登录</Link>
          </div>
        ) : (
          <form action={requestPasswordReset} className="mt-7 space-y-5">
            <label className="block text-sm font-medium">管理员邮箱
              <input name="email" type="email" required className="mt-2 w-full rounded-xl border p-3 outline-none" placeholder="anne@skincarepkg.com" />
            </label>
            <button className="w-full rounded-xl bg-[#173b34] py-3.5 font-medium text-white">发送密码恢复邮件</button>
            <Link href="/login" className="block text-center text-sm text-neutral-600 underline">返回登录</Link>
          </form>
        )}
      </section>
    </main>
  );
}
