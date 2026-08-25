import { Search, LogOut } from "lucide-react";
import { Sidebar } from "./sidebar";
import { logout } from "@/app/login/actions";
import { ExportAllButton } from "./export-all-button";

export function AppShell({ children }: { children: React.ReactNode }) { return <div><Sidebar/><div className="lg:ml-64 min-h-screen"><header className="h-20 sticky top-0 z-20 bg-[#f7f2e8]/90 backdrop-blur border-b border-[#e7dece] px-5 lg:px-8 flex items-center justify-between"><div className="flex items-center gap-2 text-neutral-500"><Search size={18}/><span className="hidden sm:inline">搜索客户、产品、供应商...</span></div><div className="flex items-center gap-3"><ExportAllButton/><form action={logout}><button className="flex gap-2 items-center text-sm text-neutral-600 hover:text-[#173b34]"><span className="w-8 h-8 bg-[#d4af67] text-[#173b34] rounded-full grid place-items-center font-bold">A</span><span className="hidden sm:inline">管理员 Anne</span><LogOut size={16}/></button></form></div></header><main className="p-5 lg:p-8">{children}</main></div></div>; }
