"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { ImageIcon, Trash2 } from "lucide-react";
import { deleteProducts } from "@/app/(crm)/products/actions";
import { ProductEditButton } from "@/components/product-edit-button";
export type ProductRow = Record<string, unknown> & {
  id: string;
  product_code: string;
  product_name: string;
  category?: string;
  material?: string;
  capacity_value?: number;
  capacity_unit?: string;
  neck_size?: string;
  product_status: string;
  image_path?: string;
  purchase_unit_price_cny?: number;
  purchase_notes?: string;
  primary_supplier_id?: string;
  primary_supplier_name?: string;
  purchase_moq?: number;
  delivery_lead_time_days?: number;
  special_notes?: string;
  product_categories?: { category_name: string };
  supplier_products?: { standard_moq: number }[];
};
export function ProductTable({
  rows,
  suppliers,
}: {
  rows: ProductRow[];
  suppliers: { value: string; label: string }[];
}) {
  const [checked, setChecked] = useState<string[]>([]),
    [targets, setTargets] = useState<string[]>([]);
  const [pending, start] = useTransition(),
    all = rows.length > 0 && checked.length === rows.length;
  const remove = () =>
    start(async () => {
      await deleteProducts(targets);
      setChecked([]);
      setTargets([]);
    });
  return (
    <>
      <div className="mb-3 flex min-h-12 items-center justify-between rounded-xl border bg-white px-4 py-2">
        <span className="text-sm text-neutral-500">
          {checked.length
            ? `已选择 ${checked.length} 个产品`
            : "可全选或勾选产品进行批量操作"}
        </span>
        <button
          disabled={!checked.length}
          onClick={() => setTargets(checked)}
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:bg-neutral-300"
        >
          <Trash2 size={16} />
          批量删除
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#faf7f1]">
            <tr>
              <th className="p-3">
                <input
                  aria-label="全选产品"
                  type="checkbox"
                  checked={all}
                  onChange={() => setChecked(all ? [] : rows.map((r) => r.id))}
                />
              </th>
              {[
                "图片",
                "产品",
                "分类",
                "材质",
                "容量",
                "瓶口",
                "供应商",
                "MOQ",
                "采购单价",
                "采购备注",
                "交货时间",
                "特别注意事项",
                "状态",
                "操作",
              ].map((x) => (
                <th className="whitespace-nowrap p-3 text-left" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const moqs = (p.supplier_products ?? [])
                .map((s) => s.standard_moq)
                .filter(Boolean);
              return (
                <tr className="border-t" key={p.id}>
                  <td className="p-4">
                    <input
                      aria-label={`选择 ${p.product_name}`}
                      type="checkbox"
                      checked={checked.includes(p.id)}
                      onChange={() =>
                        setChecked((v) =>
                          v.includes(p.id)
                            ? v.filter((id) => id !== p.id)
                            : [...v, p.id],
                        )
                      }
                    />
                  </td>
                  <td className="p-3">
                    {p.image_path ? (
                      <Image
                        src={`/api/product-images/${p.image_path}`}
                        alt={p.product_name}
                        width={56}
                        height={56}
                        unoptimized
                        className="h-14 w-14 rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="grid h-14 w-14 place-items-center rounded-lg bg-neutral-100 text-neutral-400">
                        <ImageIcon size={20} />
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-[#173b34]">
                      {p.product_name}
                    </div>
                    <small className="text-neutral-400">{p.product_code}</small>
                  </td>
                  <td className="p-4">
                    {p.product_categories?.category_name || p.category || "—"}
                  </td>
                  <td className="p-4">{p.material || "—"}</td>
                  <td className="p-4">
                    {p.capacity_value
                      ? `${p.capacity_value}${p.capacity_unit}`
                      : "—"}
                  </td>
                  <td className="p-4">{p.neck_size || "—"}</td>
                  <td className="p-4">{p.primary_supplier_name || "—"}</td>
                  <td className="p-4">
                    {p.purchase_moq ?? (moqs.length ? Math.min(...moqs) : "—")}
                  </td>
                  <td className="whitespace-nowrap p-4">
                    {p.purchase_unit_price_cny !== null &&
                    p.purchase_unit_price_cny !== undefined
                      ? `¥${Number(p.purchase_unit_price_cny).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                      : "—"}
                  </td>
                  <td className="max-w-64 truncate p-4" title={p.purchase_notes || ""}>
                    {p.purchase_notes || "—"}
                  </td>
                  <td className="whitespace-nowrap p-4">
                    {p.delivery_lead_time_days !== null &&
                    p.delivery_lead_time_days !== undefined
                      ? `${p.delivery_lead_time_days}天`
                      : "—"}
                  </td>
                  <td className="max-w-64 truncate p-4" title={p.special_notes || ""}>
                    {p.special_notes || "—"}
                  </td>
                  <td className="p-4">
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      {p.product_status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-3">
                      <ProductEditButton product={p} suppliers={suppliers} />
                      <button
                        title="删除产品"
                        onClick={() => setTargets([p.id])}
                        className="hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!!targets.length && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold">
              确认删除 {targets.length} 个产品？
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              采用软删除，不会立即永久清除图片文件。
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={pending}
                onClick={() => setTargets([])}
                className="rounded-xl border px-5 py-2.5"
              >
                取消
              </button>
              <button
                disabled={pending}
                onClick={remove}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-white"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
