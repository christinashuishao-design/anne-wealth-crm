"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  isLocalMode,
  localCreateEntity,
  localCreateProjectFollowUp,
  localRows,
  localSoftDeleteMany,
  localUpdateEntity,
} from "@/lib/local-db";
import { nextOrderNumber, nextProjectNumber } from "@/lib/order-number";
import { formatSupplierCode, supplierCodePrefix } from "@/lib/supplier-code";

const tableSchema = z.enum(["suppliers", "opportunities", "orders"]);
const paths = {
  suppliers: "/suppliers",
  opportunities: "/opportunities",
  orders: "/orders",
} as const;
const fields = {
  suppliers: [
    "company_name",
    "location",
    "supplier_type",
    "standard_moq",
    "lead_time_days",
    "total_score",
    "grade",
    "status",
  ],
  opportunities: [
    "title",
    "customer_id",
    "status",
    "project_progress",
    "estimated_amount",
    "currency",
    "expected_close_date",
  ],
  orders: [
    "order_number",
    "customer_id",
    "order_categories",
    "status",
    "order_date",
    "sales_amount",
    "sales_currency",
    "revenue_cny",
    "total_cost_cny",
    "net_profit_cny",
    "profit_margin",
  ],
} as const;
async function syncProjectProgress(
  opportunityId: string,
  values: Record<string, unknown>,
) {
  if (!String(values.project_progress || "").trim()) return;
  if (isLocalMode())
    localCreateProjectFollowUp({
      customer_id: values.customer_id,
      opportunity_id: opportunityId,
      content: values.project_progress,
      result: values.status,
    });
  else {
    const db = await createClient();
    const { error } = await db.from("follow_ups").insert({
      customer_id: values.customer_id || null,
      opportunity_id: opportunityId,
      channel: "项目进度",
      content: String(values.project_progress),
      result: values.status || null,
      followed_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/follow-ups");
}
export async function updateEntity(
  tableInput: string,
  id: string,
  formData: FormData,
) {
  const table = tableSchema.parse(tableInput),
    safeId = z.string().uuid().parse(id),
    raw = Object.fromEntries(formData),
    values = Object.fromEntries(
      fields[table]
        .filter((key) => key in raw)
        .map((key) => [key, raw[key] === "" ? null : raw[key]]),
    ) as Record<string, unknown>;
  const previousProgress =
    table === "opportunities"
      ? isLocalMode()
        ? String(
            localRows("opportunities").find((row) => String(row.id) === safeId)
              ?.project_progress || "",
          )
        : String(
            (
              await (await createClient())
                .from("opportunities")
                .select("project_progress")
                .eq("id", safeId)
                .maybeSingle()
            ).data?.project_progress || "",
          )
      : "";
  if (table === "orders") {
    const orderNumber = String(values.order_number || "").trim();
    if (!orderNumber) throw new Error("请输入PI号码");
    values.order_number = orderNumber;
    const revenue = Number(values.revenue_cny || 0),
      cost = Number(values.total_cost_cny || 0),
      profit = revenue - cost;
    values.net_profit_cny = profit;
    values.profit_margin = revenue ? (profit / revenue) * 100 : 0;
  }
  if (isLocalMode()) localUpdateEntity(table, safeId, values);
  else {
    const db = await createClient();
    const { error } = await db.from(table).update(values).eq("id", safeId);
    if (error) throw new Error(error.message);
  }
  if (
    table === "opportunities" &&
    String(values.project_progress || "").trim() !== previousProgress.trim()
  )
    await syncProjectProgress(safeId, values);
  revalidatePath(paths[table]);
  revalidatePath("/dashboard");
}
export async function createEntity(tableInput: string, formData: FormData) {
  const table = tableSchema.parse(tableInput),
    raw = Object.fromEntries(formData),
    values = Object.fromEntries(
      fields[table]
        .filter((key) => key in raw)
        .map((key) => [key, raw[key] === "" ? null : raw[key]]),
    ) as Record<string, unknown>;
  if (table === "opportunities") {
    const existing = isLocalMode()
      ? localRows("opportunities").map((project) => project.opportunity_code)
      : (
          (
            await (await createClient())
              .from("opportunities")
              .select("opportunity_code")
              .is("deleted_at", null)
          ).data ?? []
        ).map((project) => project.opportunity_code);
    values.opportunity_code = nextProjectNumber(existing);
  }
  if (table === "orders") {
    if (!String(values.order_number || "").trim()) {
      const existing = isLocalMode()
        ? localRows("orders").map((order) => order.order_number)
        : (
            (
              await (await createClient())
                .from("orders")
                .select("order_number")
                .is("deleted_at", null)
            ).data ?? []
          ).map((order) => order.order_number);
      values.order_number = nextOrderNumber(existing);
    } else values.order_number = String(values.order_number).trim();
    const revenue = Number(values.revenue_cny || 0),
      cost = Number(values.total_cost_cny || 0),
      profit = revenue - cost;
    values.net_profit_cny = profit;
    values.profit_margin = revenue ? (profit / revenue) * 100 : 0;
  }
  if (table === "suppliers" && !values.company_name)
    throw new Error("请输入供应商名称");
  if (table === "opportunities" && !values.title)
    throw new Error("请输入项目名称");
  let createdId = "";
  if (isLocalMode()) createdId = localCreateEntity(table, values);
  else {
    const db = await createClient(),
      suffix = Date.now().toString().slice(-7),
      codes = {
        suppliers: { supplier_code: "" },
        opportunities: { opportunity_code: values.opportunity_code },
        orders: { order_number: values.order_number },
      };
    if (table === "suppliers") {
      const existing = (await db.from("suppliers").select("supplier_code")).data ?? [];
      const sequence = existing.reduce((max, row) => Math.max(max, Number(String(row.supplier_code || "").match(/(\d+)$/)?.[1] || 0)), 0) + 1;
      codes.suppliers.supplier_code = formatSupplierCode(supplierCodePrefix(values.location, values.company_name), sequence);
    }
    const { data, error } = await db
      .from(table)
      .insert({ ...values, ...codes[table] })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    createdId = String(data.id);
  }
  if (table === "opportunities") await syncProjectProgress(createdId, values);
  revalidatePath(paths[table]);
  revalidatePath("/dashboard");
}
export async function deleteEntities(tableInput: string, ids: string[]) {
  const table = tableSchema.parse(tableInput),
    valid = z.array(z.string().uuid()).min(1).parse(ids);
  if (isLocalMode()) localSoftDeleteMany(table, valid);
  else {
    const db = await createClient();
    const { error } = await db
      .from(table)
      .update({ deleted_at: new Date().toISOString() })
      .in("id", valid);
    if (error) throw new Error(error.message);
  }
  revalidatePath(paths[table]);
  revalidatePath("/dashboard");
}
