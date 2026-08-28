"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ClipboardPaste, ImagePlus, ScanLine, X } from "lucide-react";
import { saveRecognizedPrice } from "@/app/(crm)/products/actions";
import { SearchableSelect } from "@/components/searchable-select";

type Option = { value: string; label: string };
type Result = { product_name?: string | null; supplier_name?: string | null; material?: string | null; capacity?: string | null; currency: string; minimum_quantity: number; maximum_quantity?: number | null; unit_price: number; tax_included: string; trade_term?: string | null; valid_until?: string | null; notes?: string | null; raw_text: string; confidence: number; source_image_path?: string | null };
const field = "mt-1 w-full rounded-lg border border-[#ded5c6] px-3 py-2.5";

export function ScreenshotPriceImporter({ products, suppliers }: { products: Option[]; suppliers: Option[] }) {
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(""),[result,setResult]=useState<Result|null>(null),[image,setImage]=useState<File|null>(null);
  const fileInput=useRef<HTMLInputElement>(null);
  const preview=useMemo(()=>image?URL.createObjectURL(image):"",[image]);

  function chooseImage(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请粘贴或选择图片文件");
      return;
    }
    setError("");
    setImage(file);
  }

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  },[preview]);

  useEffect(() => {
    if (!open || result) return;
    const paste=(event: ClipboardEvent) => {
      const file=Array.from(event.clipboardData?.files||[]).find((item)=>item.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        chooseImage(new File([file],file.name||`clipboard-${Date.now()}.png`,{type:file.type||"image/png"}));
      }
    };
    document.addEventListener("paste",paste);
    return () => document.removeEventListener("paste",paste);
  },[open,result]);

  async function recognize(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!image) {
      setError("请先粘贴、拖入或选择一张图片");
      return;
    }
    const form=new FormData();
    form.set("image",image,image.name||`clipboard-${Date.now()}.png`);
    setLoading(true); setError(""); setResult(null);
    const response=await fetch("/api/pricing/recognize",{method:"POST",body:form});
    const json=await response.json().catch(()=>({error:"识别服务返回异常"})) as {error?:string;data?:Result}; setLoading(false);
    if(!response.ok||!json.data){setError(json.error||"识别失败");return;} setResult(json.data);
  }
  return <>
    <button onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#173b34] bg-white px-4 py-2.5 text-sm text-[#173b34]"><ScanLine size={17}/>截图识别价格</button>
    {open&&<div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white">
      <header className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-semibold">截图识别录入</h2><p className="mt-1 text-xs text-neutral-500">图片会发送至 OpenAI 视觉模型；识别结果需确认后才写入价格系统。</p></div><button onClick={()=>setOpen(false)}><X/></button></header>
      {!result?<form onSubmit={recognize} className="space-y-4 p-5">
        <div
          className="grid min-h-48 cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-[#cfc3ae] bg-[#faf7f1] p-4 text-center outline-none transition hover:border-[#173b34] focus:border-[#173b34]"
          role="button"
          tabIndex={0}
          onClick={()=>fileInput.current?.click()}
          onKeyDown={(event)=>{if(event.key==="Enter"||event.key===" ")fileInput.current?.click();}}
          onDragOver={(event)=>event.preventDefault()}
          onDrop={(event)=>{event.preventDefault();chooseImage(event.dataTransfer.files[0]);}}
        >
          {preview?<div className="space-y-2"><Image src={preview} alt="待识别截图预览" width={640} height={360} unoptimized className="mx-auto max-h-64 w-auto rounded-xl object-contain"/><p className="text-sm font-medium text-[#173b34]">{image?.name||"已粘贴截图"}</p><p className="text-xs text-neutral-500">点击可更换图片</p></div>:<div><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#173b34]"><ClipboardPaste size={24}/></div><p className="font-medium text-[#173b34]">直接按 Ctrl + V 粘贴截图</p><p className="mt-2 text-sm text-neutral-500">也可以把图片拖到这里，或点击选择文件</p><ImagePlus className="mx-auto mt-4 text-neutral-400" size={20}/></div>}
        </div>
        <input ref={fileInput} className="hidden" type="file" accept="image/*" onChange={(event)=>chooseImage(event.target.files?.[0])}/>
        {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={loading||!image} className="w-full rounded-xl bg-[#173b34] py-3 text-white disabled:opacity-50">{loading?"正在识别…":"开始识别"}</button>
      </form>:
      <form action={saveRecognizedPrice} onSubmit={()=>setOpen(false)} className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">识别置信度：{Math.round(result.confidence*100)}%。请重点核对价格、币种、MOQ和含税条件。</div>
        <label className="text-sm sm:col-span-2">关联产品<SearchableSelect name="product_id" options={products} placeholder={result.product_name||"搜索产品"}/></label>
        <label className="text-sm sm:col-span-2">关联供应商<SearchableSelect name="supplier_id" options={suppliers} placeholder={result.supplier_name||"搜索供应商"}/></label>
        <label className="text-sm">币种<select className={field} name="currency" defaultValue={result.currency}>{["CNY","USD","EUR","GBP"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm">单价<input className={field} name="unit_price" type="number" step="0.000001" defaultValue={result.unit_price} required/></label>
        <label className="text-sm">起订数量<input className={field} name="minimum_quantity" type="number" defaultValue={result.minimum_quantity} required/></label>
        <label className="text-sm">最高数量（可空）<input className={field} name="maximum_quantity" type="number" defaultValue={result.maximum_quantity||""}/></label>
        <label className="text-sm">含税<select className={field} name="tax_included" defaultValue={result.tax_included}><option value="unknown">待确认</option><option value="true">含税</option><option value="false">未税</option></select></label>
        <label className="text-sm">贸易条款<input className={field} name="trade_term" defaultValue={result.trade_term||""}/></label>
        <label className="text-sm">有效期<input className={field} name="valid_until" type="date" defaultValue={result.valid_until||""}/></label>
        <label className="text-sm">报价日期<input className={field} name="source_date" type="date" defaultValue={new Date().toISOString().slice(0,10)}/></label>
        <label className="text-sm sm:col-span-2">备注<textarea className={`${field} min-h-20`} name="notes" defaultValue={[result.material,result.capacity,result.notes].filter(Boolean).join("；")}/></label>
        <input type="hidden" name="confidence" value={result.confidence}/><input type="hidden" name="raw_text" value={result.raw_text}/><input type="hidden" name="source_image_path" value={result.source_image_path||""}/>
        <button type="button" onClick={()=>{setResult(null);setImage(null);}} className="rounded-xl border py-3">重新识别</button><button className="rounded-xl bg-[#173b34] py-3 text-white">确认写入价格系统</button>
      </form>}
    </div></div>}
  </>;
}
