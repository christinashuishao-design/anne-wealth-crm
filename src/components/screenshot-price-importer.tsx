"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Worker } from "tesseract.js";
import { ClipboardPaste, ImagePlus, ScanLine, X } from "lucide-react";
import { saveRecognizedProduct } from "@/app/(crm)/products/actions";
import { SearchableSelect } from "@/components/searchable-select";
import { parsePricingOcr } from "@/lib/free-pricing-ocr";

type Option = { value: string; label: string };
type Result = ReturnType<typeof parsePricingOcr>;
const field = "mt-1 w-full rounded-lg border border-[#ded5c6] px-3 py-2.5";

async function enhancedTextRegion(image: File) {
  const bitmap = await createImageBitmap(image);
  const sourceWidth = Math.max(1, Math.round(bitmap.width * 0.68));
  const sourceTop = Math.round(bitmap.height * 0.16);
  const sourceHeight = Math.max(1, Math.round(bitmap.height * 0.5));
  const scale = Math.max(1, Math.min(3.5, 2800 / sourceWidth, 2200 / sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sourceWidth * scale);
  canvas.height = Math.round(sourceHeight * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("无法创建图片处理画布");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.filter = "grayscale(1) contrast(1.65)";
  context.drawImage(bitmap, 0, sourceTop, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图片增强失败")), "image/png"));
}

function mergeOcrText(...texts: string[]) {
  const seen = new Set<string>();
  return texts.flatMap((text) => text.split(/\n+/)).map((line) => line.trim()).filter((line) => {
    const key = line.replace(/\s+/g, "").toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join("\n");
}

export function ScreenshotPriceImporter({ categories, suppliers }: { categories: Option[]; suppliers: Option[] }) {
  const router=useRouter();
  const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[progress,setProgress]=useState(""),[error,setError]=useState(""),[result,setResult]=useState<Result|null>(null),[image,setImage]=useState<File|null>(null);
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
    setLoading(true); setProgress("正在加载免费识别引擎…"); setError(""); setResult(null);
    let worker: Worker | null = null;
    try {
      const { createWorker, PSM } = await import("tesseract.js");
      worker = await createWorker(["chi_sim", "eng"], undefined, {
        logger: (message) => {
          if (message.status === "recognizing text") setProgress(`正在识别文字… ${Math.round((message.progress || 0) * 100)}%`);
          else if (message.status === "loading language traineddata") setProgress("首次使用正在下载中英文识别字库…");
        },
      });
      setProgress("正在放大并增强聊天文字区域…");
      const enhanced = await enhancedTextRegion(image);
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN, preserve_interword_spaces: "1" });
      const focused = await worker.recognize(enhanced);
      setProgress("正在检查截图其他区域…");
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, preserve_interword_spaces: "1" });
      const full = await worker.recognize(image);
      const merged = mergeOcrText(focused.data.text, full.data.text);
      setResult(parsePricingOcr(merged, Math.max(focused.data.confidence, full.data.confidence)));
    } catch (reason) {
      console.error(reason);
      setError("免费识别加载失败，请检查网络后重试；也可以手动录入价格。");
    } finally {
      await worker?.terminate().catch(() => undefined);
      setLoading(false); setProgress("");
    }
  }
  async function saveProduct(formData: FormData) {
    setSaving(true); setError("");
    try {
      const response = await saveRecognizedProduct(formData);
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setOpen(false); setResult(null); setImage(null); router.refresh();
    } catch {
      setError("保存失败，请检查网络后重试");
    } finally {
      setSaving(false);
    }
  }
  return <>
    <button onClick={()=>setOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#173b34] bg-white px-4 py-2.5 text-sm text-[#173b34]"><ScanLine size={17}/>截图识别价格</button>
    {open&&<div className="fixed inset-0 z-[70] grid place-items-center bg-black/35 p-4"><div className="max-h-[92vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white">
      <header className="flex items-center justify-between border-b p-5"><div><h2 className="text-xl font-semibold">截图识别录入</h2><p className="mt-1 text-xs text-neutral-500">免费 OCR 在当前浏览器处理图片；识别结果需确认后才写入价格系统。</p></div><button onClick={()=>setOpen(false)}><X/></button></header>
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
        {loading&&progress&&<p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{progress}</p>}
        <button disabled={loading||!image} className="w-full rounded-xl bg-[#173b34] py-3 text-white disabled:opacity-50">{loading?"正在免费识别…":"开始免费识别"}</button>
      </form>:
      <form action={saveProduct} className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">识别置信度：{Math.round(result.confidence*100)}%。未识别字段已留空，请确认后保存。</div>
        {error&&<p className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700" aria-live="polite">{error}</p>}
        <label className="text-sm sm:col-span-2">产品名称*<input className={field} name="product_name" defaultValue={result.product_name||""} required/></label>
        <label className="text-sm">分类*<SearchableSelect name="category_id" options={categories} placeholder="选择产品分类" required/></label>
        <label className="text-sm">材质<input className={field} name="material" defaultValue={result.material||""}/></label>
        <label className="text-sm">容量<input className={field} name="capacity_value" type="number" step="0.01" defaultValue={result.capacity_value??""}/></label>
        <label className="text-sm">容量单位<select className={field} name="capacity_unit" defaultValue={result.capacity_unit}><option>ml</option><option>g</option><option>L</option><option>oz</option><option>kg</option></select></label>
        <label className="text-sm">瓶口<input className={field} name="neck_size" defaultValue={result.neck_size||""}/></label>
        <label className="text-sm">供应商<SearchableSelect name="primary_supplier_id" options={suppliers} placeholder={result.supplier_name||"搜索供应商"}/></label>
        <label className="text-sm">MOQ<input className={field} name="purchase_moq" type="number" min="0" defaultValue={result.minimum_quantity??""} placeholder="未识别，待确认"/></label>
        <label className="text-sm">采购单价（人民币）<input className={field} name="purchase_unit_price_cny" type="number" min="0" step="0.0001" defaultValue={result.currency==="CNY"?(result.unit_price??""):""} placeholder="未识别，待确认"/></label>
        <label className="text-sm">交货时间（天）<input className={field} name="delivery_lead_time_days" type="number" min="0" placeholder="待确认"/></label>
        <label className="text-sm">成交状态<select className={field} name="commercial_status" defaultValue="未成交">{["未成交","已报价","已打样","已下单","已成交"].map(x=><option key={x}>{x}</option>)}</select></label>
        <label className="text-sm sm:col-span-2">采购备注<textarea className={`${field} min-h-24`} name="purchase_notes" defaultValue={[result.minimum_order_amount?`最低订单金额：${result.minimum_order_amount}元`:null,result.tax_included==="true"?"含税":result.tax_included==="false"?"未税":null,result.trade_term,result.notes].filter(Boolean).join("；")}/></label>
        <label className="text-sm sm:col-span-2">特别注意事项<textarea className={`${field} min-h-20`} name="special_notes" placeholder="质量要求、包装要求、易错点等（未识别可留空）"/></label>
        <input type="hidden" name="product_name_en" value=""/><input type="hidden" name="product_status" value="待整理"/><input type="hidden" name="search_keywords" value=""/>
        <button type="button" disabled={saving} onClick={()=>{setResult(null);setImage(null);}} className="rounded-xl border py-3 disabled:opacity-50">重新识别</button><button disabled={saving} className="rounded-xl bg-[#173b34] py-3 text-white disabled:opacity-50">{saving?"正在保存…":"确认写入产品资料库"}</button>
      </form>}
    </div></div>}
  </>;
}
