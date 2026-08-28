import Link from "next/link";
import { BarChart3, Bell, Boxes, Building2, CircleDollarSign, ClipboardList, Coins, Database, Factory, Settings, Users } from "lucide-react";

const groups = [
  ["工作台", BarChart3, [["数据看板","/dashboard"],["今日待办","/tasks?view=today"],["逾期提醒","/tasks?view=overdue"],["通知中心","/notifications"]]],
  ["客户管理", Users, [["所有客户","/customers"],["客户背调","/customer-research"],["客户联系人","/contacts"]]],
  ["项目管理", ClipboardList, [["全部项目","/opportunities"],["项目看板","/opportunities?view=board"],["报价后待回复","/opportunities?status=已报价"]]],
  ["跟进中心", Bell, [["邮件审批","/mail-approvals"],["跟进任务","/tasks"],["跟进记录","/follow-ups"]]],
  ["产品中心", Boxes, [["全部产品","/products"],["产品分类","/product-categories"],["供应商产品","/supplier-products"],["供应商报价","/quotations"],["报价即将到期","/quotations?view=expiring"]]],
  ["供应商管理", Factory, [["全部供应商","/suppliers"],["供应商评分","/suppliers?view=ratings"]]],
  ["订单管理", Building2, [["全部订单","/orders"],["生产中","/orders?status=生产中"]]],
  ["财务管理", CircleDollarSign, [["财务总览","/finance"],["收付款记录","/payments"],["订单利润","/finance?view=profit"]]],
  ["数据工具", Database, [["数据导入","/imports"],["Lark客户同步","/imports/lark"],["导入历史","/imports/history"]]],
  ["系统设置", Settings, [["用户管理","/settings/users"],["角色权限","/settings/roles"],["操作日志","/settings/audit"]]],
] as const;

export function Sidebar() { return <aside className="w-56 bg-[#173b34] text-white h-screen fixed left-0 top-0 overflow-y-auto hidden lg:block">
  <div className="h-14 px-4 flex items-center gap-2.5 border-b border-white/10 sticky top-0 bg-[#173b34] z-10"><Coins size={20} className="text-[#d4af67]"/><div><b className="text-sm">Anne小富婆CRM</b><div className="text-[9px] tracking-widest text-white/45">ANNE WEALTH CRM</div></div></div>
  <nav className="p-2 pb-3">{groups.map(([label,Icon,links])=><div key={label} className="mb-1"><div className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40 flex gap-1.5 items-center leading-4"><Icon size={11}/>{label}</div>{links.map(([name,href])=><Link key={name} href={href} className="block px-7 py-0.5 rounded-md text-[13px] leading-[18px] text-white/72 hover:bg-white/10 hover:text-white">{name}</Link>)}</div>)}</nav>
  </aside>; }
