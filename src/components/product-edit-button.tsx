"use client";
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { updateProduct } from "@/app/(crm)/products/actions";
import { ProductImageInput } from "@/components/product-image-input";
import type { ProductRow } from "@/components/product-table";
import { SearchableSelect } from "@/components/searchable-select";
const field = "mt-1 w-full rounded-lg border border-[#ded5c6] px-3 py-2.5";
export function ProductEditButton({
  product,
  suppliers,
}: {
  product: ProductRow;
  suppliers: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button title="编辑产品" onClick={() => setOpen(true)}>
        <Pencil size={16} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white">
            <header className="flex justify-between border-b p-5">
              <h2 className="text-xl font-semibold">编辑产品</h2>
              <button title="关闭" onClick={() => setOpen(false)}>
                <X />
              </button>
            </header>
            <form
              action={updateProduct.bind(null, product.id)}
              onSubmit={() => setOpen(false)}
              className="grid gap-4 p-5 sm:grid-cols-2"
            >
              <label className="text-sm sm:col-span-2">
                产品名称*
                <input
                  aria-label="产品名称"
                  className={field}
                  name="product_name"
                  required
                  defaultValue={product.product_name}
                />
              </label>
              <input type="hidden" name="product_name_en" value="" />
              <label className="text-sm">
                分类
                <input
                  className={field}
                  name="category_id"
                  defaultValue={product.category || "其他"}
                />
              </label>
              <label className="text-sm">
                材质
                <input
                  className={field}
                  name="material"
                  defaultValue={product.material}
                />
              </label>
              <label className="text-sm">
                容量
                <input
                  className={field}
                  type="number"
                  step="0.01"
                  name="capacity_value"
                  defaultValue={product.capacity_value}
                />
              </label>
              <label className="text-sm">
                单位
                <select
                  className={field}
                  name="capacity_unit"
                  defaultValue={product.capacity_unit || "ml"}
                >
                  <option>ml</option>
                  <option>g</option>
                  <option>L</option>
                </select>
              </label>
              <label className="text-sm">
                瓶口
                <input
                  className={field}
                  name="neck_size"
                  defaultValue={product.neck_size}
                />
              </label>
              <label className="text-sm">
                状态
                <select
                  className={field}
                  name="product_status"
                  defaultValue={product.product_status}
                >
                  {[
                    "待整理",
                    "可推荐",
                    "打样中",
                    "已验证",
                    "暂停推荐",
                    "已淘汰",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                成交状态
                <select className={field} name="commercial_status" defaultValue={product.commercial_status || "未成交"}>
                  {["未成交","已报价","已打样","已下单","已成交"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                更换产品主图（JPG/PNG/WebP，最大5MB）
                <ProductImageInput className={field} />
              </label>
              <label className="text-sm">
                采购单价（人民币）
                <input
                  className={field}
                  defaultValue={product.purchase_unit_price_cny}
                  min="0"
                  name="purchase_unit_price_cny"
                  step="0.0001"
                  type="number"
                />
              </label>
              <label className="text-sm">
                供应商
                <SearchableSelect
                  name="primary_supplier_id"
                  options={suppliers}
                  defaultValue={product.primary_supplier_id || ""}
                  placeholder="输入供应商名称搜索"
                />
              </label>
              <label className="text-sm">
                MOQ
                <input
                  className={field}
                  defaultValue={product.purchase_moq}
                  min="0"
                  name="purchase_moq"
                  step="1"
                  type="number"
                />
              </label>
              <label className="text-sm">
                交货时间（天）
                <input
                  className={field}
                  defaultValue={product.delivery_lead_time_days}
                  min="0"
                  name="delivery_lead_time_days"
                  step="1"
                  type="number"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                采购备注
                <textarea
                  className={`${field} min-h-24`}
                  defaultValue={product.purchase_notes}
                  name="purchase_notes"
                  placeholder="可填写价格条件、供应商、MOQ、含税/未税等说明"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                特别注意事项
                <textarea
                  className={`${field} min-h-24`}
                  defaultValue={product.special_notes}
                  name="special_notes"
                  placeholder="填写质量要求、包装要求、易错点等"
                />
              </label>
              <input type="hidden" name="search_keywords" value="" />
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border px-5 py-2.5"
                >
                  取消
                </button>
                <button className="rounded-xl bg-[#173b34] px-6 py-2.5 text-white">
                  保存修改
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
