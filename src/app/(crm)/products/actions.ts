"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import {
  isLocalMode,
  localCreateProduct,
  localSoftDelete,
  localSoftDeleteMany,
  localUpdateProduct,
} from "@/lib/local-db";
const schema = z.object({
  product_name: z.string().min(2),
  product_name_en: z.string().optional(),
  category_id: z.string().min(1),
  material: z.string().optional(),
  capacity_value: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().optional(),
  ),
  capacity_unit: z.string(),
  neck_size: z.string().optional(),
  product_status: z.string(),
  commercial_status: z.enum(["未成交", "已报价", "已打样", "已下单", "已成交"]),
  search_keywords: z.string().optional(),
  purchase_unit_price_cny: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().nonnegative().optional(),
  ),
  purchase_notes: z.string().optional(),
  primary_supplier_id: z.string().optional(),
  purchase_moq: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int().nonnegative().optional(),
  ),
  delivery_lead_time_days: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.coerce.number().int().nonnegative().optional(),
  ),
  special_notes: z.string().optional(),
});

const recognizedPriceSchema = z.object({
  product_id: z.string().uuid(),
  supplier_id: z.string().uuid().optional().or(z.literal("")),
  source_date: z.string().optional(),
  currency: z.enum(["CNY", "USD", "EUR", "GBP"]),
  minimum_quantity: z.coerce.number().int().positive(),
  maximum_quantity: z.preprocess((v) => v === "" ? undefined : v, z.coerce.number().int().positive().optional()),
  unit_price: z.coerce.number().nonnegative(),
  tax_included: z.enum(["true", "false", "unknown"]),
  trade_term: z.string().optional(),
  valid_until: z.string().optional(),
  confidence: z.coerce.number().min(0).max(1).optional(),
  raw_text: z.string().optional(),
  source_image_path: z.string().optional(),
  notes: z.string().optional(),
});

export async function saveRecognizedPrice(fd: FormData) {
  const v = recognizedPriceSchema.parse(Object.fromEntries(fd));
  if (isLocalMode()) throw new Error("截图价格录入目前仅支持云端 CRM");
  const db = await createClient();
  const { error } = await db.from("product_price_records").insert({
    product_id: v.product_id,
    supplier_id: v.supplier_id || null,
    source_date: v.source_date || new Date().toISOString().slice(0, 10),
    currency: v.currency,
    minimum_quantity: v.minimum_quantity,
    maximum_quantity: v.maximum_quantity || null,
    unit_price: v.unit_price,
    tax_included: v.tax_included === "unknown" ? null : v.tax_included === "true",
    trade_term: v.trade_term || null,
    valid_until: v.valid_until || null,
    status: "待核验",
    confidence: v.confidence,
    raw_text: v.raw_text,
    source_image_path: v.source_image_path || null,
    notes: v.notes,
  });
  if (error) throw new Error(error.message);
  await db.from("products").update({ purchase_unit_price_cny: v.currency === "CNY" ? v.unit_price : undefined, purchase_moq: v.minimum_quantity }).eq("id", v.product_id);
  revalidatePath("/products");
  revalidatePath("/pricing");
}
async function saveImage(value: FormDataEntryValue | null, local: boolean) {
  if (!(value instanceof File) || !value.size) return null;
  if (!["image/jpeg", "image/png", "image/webp"].includes(value.type))
    throw new Error("仅支持 JPG、PNG、WebP 图片");
  if (value.size > 5 * 1024 * 1024) throw new Error("图片不能超过 5MB");
  const ext =
      value.type === "image/png"
        ? "png"
        : value.type === "image/webp"
          ? "webp"
          : "jpg",
    name = `${crypto.randomUUID()}.${ext}`,
    bytes = Buffer.from(await value.arrayBuffer());
  if (local) {
    const dir = path.join(process.cwd(), "data", "uploads", "products");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);
    return name;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("云端图片存储配置缺失");
  const response = await fetch(`${url}/storage/v1/object/product-images/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": value.type,
      "x-upsert": "true",
    },
    body: bytes,
  });
  if (!response.ok) throw new Error("产品图片上传失败");
  return name;
}
export async function createProduct(fd: FormData) {
  const v = schema.parse(Object.fromEntries(fd)),
    local = isLocalMode(),
    image_path = await saveImage(fd.get("image"), local);
  if (local) {
    localCreateProduct({ ...v, image_path });
    revalidatePath("/products");
    return;
  }
  const db = await createClient();
  const { error } = await db
    .from("products")
    .insert({
      ...v,
      image_path,
      product_code: `PRD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
    });
  if (error) throw new Error(error.message);
  revalidatePath("/products");
}
export async function deleteProduct(id: string) {
  if (isLocalMode()) {
    localSoftDelete("products", id);
    revalidatePath("/products");
    return;
  }
  const db = await createClient();
  const { error } = await db
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/products");
}
export async function deleteProducts(ids: string[]) {
  const valid = z.array(z.string().uuid()).min(1).parse(ids);
  if (isLocalMode()) localSoftDeleteMany("products", valid);
  else {
    const db = await createClient();
    const { error } = await db
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", valid);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/products");
}

const commercialStatusSchema = z.enum([
  "未成交",
  "已报价",
  "已打样",
  "已下单",
  "已成交",
]);

export async function updateProductCommercialStatus(id: string, status: string) {
  const validId = z.string().uuid().parse(id);
  const validStatus = commercialStatusSchema.parse(status);
  if (isLocalMode()) {
    localUpdateProduct(validId, { commercial_status: validStatus });
  } else {
    const db = await createClient();
    const { error } = await db
      .from("products")
      .update({ commercial_status: validStatus })
      .eq("id", validId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/products");
  revalidatePath("/pricing");
}

export async function updateProduct(id: string, fd: FormData) {
  const v = schema.parse(Object.fromEntries(fd)),
    local = isLocalMode(),
    image_path = await saveImage(fd.get("image"), local);
  if (local) {
    localUpdateProduct(id, { ...v, image_path });
    revalidatePath("/products");
    return;
  }
  const db = await createClient();
  const { error } = await db
    .from("products")
    .update(image_path ? { ...v, image_path } : v)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/products");
}
