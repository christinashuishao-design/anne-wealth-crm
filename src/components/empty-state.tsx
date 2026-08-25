import { Inbox } from "lucide-react";
export function EmptyState({ title="暂无数据", description="创建第一条记录开始使用。" }: {title?:string;description?:string}) { return <div className="py-16 text-center"><Inbox className="mx-auto text-[#c3b69e]" size={36}/><h3 className="mt-4 font-medium text-[#173b34]">{title}</h3><p className="text-sm text-neutral-500 mt-1">{description}</p></div> }
