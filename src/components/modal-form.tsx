"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export function ModalForm({ title, children }: {title:string;children:React.ReactNode}) { const [open,setOpen]=useState(false); return <><button onClick={()=>setOpen(true)} className="bg-[#173b34] text-white rounded-xl px-4 py-2.5 text-sm flex gap-2 items-center"><Plus size={16}/>{title}</button>{open&&<div className="fixed inset-0 z-50 bg-black/30 grid place-items-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto"><div className="p-5 border-b flex justify-between"><h2 className="font-semibold text-lg text-[#173b34]">{title}</h2><button onClick={()=>setOpen(false)}><X/></button></div><div className="p-5">{children}</div></div></div>}</> }
