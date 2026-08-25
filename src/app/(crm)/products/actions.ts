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
async function saveImage(value: FormDataEntryValue | null) {
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
    dir = path.join(process.cwd(), "data", "uploads", "products");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await value.arrayBuffer()));
  return name;
}
export async function createProduct(fd: FormData) {
  const v = schema.parse(Object.fromEntries(fd)),
    image_path = await saveImage(fd.get("image"));
  if (isLocalMode()) {
    localCreateProduct({ ...v, image_path });
    revalidatePath("/products");
    return;
  }
  const db = await createClient();
  const { error } = await db
    .from("products")
    .insert({
      ...v,
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
export async function updateProduct(id: string, fd: FormData) {
  const v = schema.parse(Object.fromEntries(fd)),
    image_path = await saveImage(fd.get("image"));
  if (isLocalMode()) {
    localUpdateProduct(id, { ...v, image_path });
    revalidatePath("/products");
    return;
  }
  const db = await createClient();
  const { error } = await db.from("products").update(v).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/products");
}
