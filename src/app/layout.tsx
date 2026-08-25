import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Anne小富婆CRM｜外贸客户与利润管理", description: "Anne Wealth CRM" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
