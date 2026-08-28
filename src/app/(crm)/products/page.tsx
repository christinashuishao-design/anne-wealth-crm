import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ModalForm } from "@/components/modal-form";
import { createProduct } from "./actions";
import { isLocalMode, localRows } from "@/lib/local-db";
import { ProductTable, type ProductRow } from "@/components/product-table";
import { ProductImageInput } from "@/components/product-image-input";
import { SearchableSelect } from "@/components/searchable-select";
import { ScreenshotPriceImporter } from "@/components/screenshot-price-importer";
const field = "w-full rounded-lg border border-[#ded5c6] px-3 py-2.5";
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; material?: string }>;
}) {
  const { q = "", material = "" } = await searchParams;
  let data: ProductRow[] | null,
    error: { message: string } | null = null,
    categories: { id: string; category_name: string }[] | null,
    suppliers: { id: string; company_name: string }[] = [];
  if (isLocalMode()) {
    const names = [
      "PET瓶",
      "真空瓶",
      "膏霜罐",
      "化妆品软管",
      "乳液泵",
      "喷雾泵",
      "纸盒",
      "礼品盒",
      "美妆工具",
      "酒店洗护包装",
      "其他",
    ];
    categories = names.map((x) => ({ id: x, category_name: x }));
    suppliers = localRows("suppliers").map((supplier) => ({
      id: String(supplier.id),
      company_name: String(supplier.company_name),
    }));
    data = localRows("products")
      .filter(
        (p) =>
          (!q ||
            (String(p.product_name) + String(p.product_code))
              .toLowerCase()
              .includes(q.toLowerCase())) &&
          (!material || p.material === material),
      )
      .slice(0, 100)
      .map(
        (p) =>
          ({
            ...p,
            product_categories: { category_name: p.category },
            supplier_products: [],
          }) as unknown as ProductRow,
      );
  } else {
    const db = await createClient();
    let query = db
      .from("products")
      .select(
        "*,product_categories(category_name),supplier_products(id,standard_moq)",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (q)
      query = query.or(
        `product_name.ilike.%${q}%,product_code.ilike.%${q}%,search_keywords.ilike.%${q}%`,
      );
    if (material) query = query.eq("material", material);
    const results = await Promise.all([
      query,
      db
        .from("product_categories")
        .select("id,category_name")
        .is("deleted_at", null)
        .order("sort_order"),
      db
        .from("suppliers")
        .select("id,company_name")
        .is("deleted_at", null)
        .order("company_name"),
    ]);
    data = results[0].data as ProductRow[] | null;
    error = results[0].error;
    categories = results[1].data;
    suppliers = results[2].data ?? [];
  }
  const supplierOptions = suppliers.map((supplier) => ({
      value: supplier.id,
      label: supplier.company_name,
    })),
    supplierNames = new Map(
      supplierOptions.map((supplier) => [supplier.value, supplier.label]),
    );
  data = data?.map((product) => ({
    ...product,
    primary_supplier_name:
      supplierNames.get(String(product.primary_supplier_id || "")) || undefined,
  })) ?? null;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="PRODUCT LIBRARY"
        title="产品资料库"
        description="管理产品图片、规格、供应能力和有效报价。"
        action={<div className="flex gap-2"><ScreenshotPriceImporter products={(data ?? []).map((p) => ({value:String(p.id),label:String(p.product_name)}))} suppliers={supplierOptions}/><ModalForm title="新建产品">
            <form action={createProduct} className="grid gap-4 sm:grid-cols-2">
              {[
                ["产品名称*", "product_name"],
                ["英文名称", "product_name_en"],
                ["材质", "material"],
                ["瓶口", "neck_size"],
                ["关键词", "search_keywords"],
              ].map(([label, name]) => (
                <label className="text-sm" key={name}>
                  {label}
                  <input
                    className={field}
                    name={name}
                    required={name === "product_name"}
                  />
                </label>
              ))}
              <label className="text-sm">
                分类
                <select className={field} name="category_id" required>
                  {categories?.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                容量
                <input
                  className={field}
                  name="capacity_value"
                  type="number"
                  step="0.01"
                />
              </label>
              <label className="text-sm">
                单位
                <select className={field} name="capacity_unit">
                  <option>ml</option>
                  <option>g</option>
                  <option>L</option>
                </select>
              </label>
              <label className="text-sm">
                状态
                <select className={field} name="product_status">
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
                <select className={field} name="commercial_status">
                  {["未成交","已报价","已打样","已下单","已成交"].map((x) => <option key={x}>{x}</option>)}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                产品主图（JPG/PNG/WebP，最大5MB）
                <ProductImageInput className={field} />
              </label>
              <label className="text-sm">
                采购单价（人民币）
                <input
                  className={field}
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
                  options={supplierOptions}
                  placeholder="输入供应商名称搜索"
                />
              </label>
              <label className="text-sm">
                MOQ
                <input className={field} min="0" name="purchase_moq" step="1" type="number" />
              </label>
              <label className="text-sm">
                交货时间（天）
                <input
                  className={field}
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
                  name="purchase_notes"
                  placeholder="可填写价格条件、供应商、MOQ、含税/未税等说明"
                />
              </label>
              <label className="text-sm sm:col-span-2">
                特别注意事项
                <textarea
                  className={`${field} min-h-24`}
                  name="special_notes"
                  placeholder="填写质量要求、包装要求、易错点等"
                />
              </label>
              <button className="rounded-xl bg-[#173b34] py-3 text-white sm:col-span-2">
                保存产品
              </button>
            </form>
          </ModalForm></div>}
      />
      <form className="flex gap-3 rounded-2xl border bg-white p-4">
        <div className="flex flex-1 items-center rounded-xl border px-3">
          <Search size={17} />
          <input
            name="q"
            defaultValue={q}
            placeholder="产品名称、编号或关键词"
            className="w-full p-2.5 outline-none"
          />
        </div>
        <input
          name="material"
          defaultValue={material}
          placeholder="材质"
          className="rounded-xl border px-3"
        />
        <button className="rounded-xl bg-[#f1eadc] px-5">筛选</button>
      </form>
      {error ? (
        <div className="rounded-xl bg-red-50 p-5 text-red-600">
          {error.message}
        </div>
      ) : data?.length ? (
        <ProductTable rows={data} suppliers={supplierOptions} />
      ) : (
        <div className="rounded-2xl border bg-white p-12 text-center text-neutral-400">
          产品库为空
        </div>
      )}
    </div>
  );
}
