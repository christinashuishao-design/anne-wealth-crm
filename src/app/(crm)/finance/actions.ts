"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  isLocalMode,
  localCreateFinancialRecord,
  localRows,
  localSoftDeleteMany,
  localUpdateFinancialRecord,
} from "@/lib/local-db";
import { createClient } from "@/lib/supabase/server";
import { calculateFinance } from "@/lib/finance";
const schema = z.object({
  record_type: z.enum(["收入", "支出"]),
  category: z.string().optional(),
  counterparty: z.string().optional(),
  amount: z.coerce.number().nonnegative(),
  currency: z.string(),
  exchange_rate: z.coerce.number().positive(),
  occurred_at: z.string().min(1),
  status: z.string(),
  notes: z.string().optional(),
  order_id: z.string().optional(),
  product_cost_cny: z.coerce.number().nonnegative().default(0),
  freight_cny: z.coerce.number().nonnegative().default(0),
  miscellaneous_cny: z.coerce.number().nonnegative().default(0),
  other_cost_cny: z.coerce.number().nonnegative().default(0),
});
async function calculate(v: z.infer<typeof schema>) {
  const amount_cny = v.amount * v.exchange_rate,
    order = v.order_id
      ? isLocalMode()
        ? localRows("orders").find(
            (row) =>
              String(row.id) === v.order_id ||
              String(row.order_number) === v.order_id,
          )
        : (
            await (await createClient())
              .from("orders")
              .select("id,order_number,revenue_cny,sales_amount")
              .or(`id.eq.${v.order_id},order_number.eq.${v.order_id}`)
              .is("deleted_at", null)
              .maybeSingle()
          ).data
      : null,
    order_revenue_cny = Number(order?.revenue_cny || order?.sales_amount || 0),
    profit_base = order_revenue_cny || (v.record_type === "收入" ? amount_cny : 0),
    result = calculateFinance(profit_base, 1, [
      { amount: v.product_cost_cny, rate: 1 },
      { amount: v.freight_cny, rate: 1 },
      { amount: v.miscellaneous_cny, rate: 1 },
      { amount: v.other_cost_cny, rate: 1 },
    ]),
    total_cost_cny = result.totalCost.toNumber(),
    calculated_profit_cny = result.profit.toNumber(),
    profit_margin = result.margin.toNumber(),
    record: Record<string, unknown> = { ...v };
  delete record.exchange_rate;
  return {
    ...record,
    amount_cny,
    order_revenue_cny,
    total_cost_cny,
    calculated_profit_cny,
    profit_margin,
  };
}
export async function createFinancialRecord(fd: FormData) {
  const record = await calculate(schema.parse(Object.fromEntries(fd)));
  if (isLocalMode()) localCreateFinancialRecord(record);
  else {
    const db = await createClient();
    const { error } = await db.from("financial_records").insert(record);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/finance");
}
export async function updateFinancialRecord(id: string, fd: FormData) {
  const record = await calculate(schema.parse(Object.fromEntries(fd)));
  if (isLocalMode()) localUpdateFinancialRecord(id, record);
  else {
    const db = await createClient();
    const { error } = await db
      .from("financial_records")
      .update(record)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/finance");
}
export async function deleteFinancialRecords(ids: string[]) {
  const valid = z.array(z.string().uuid()).min(1).parse(ids);
  if (isLocalMode()) localSoftDeleteMany("financial_records", valid);
  else {
    const db = await createClient();
    const { error } = await db
      .from("financial_records")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", valid);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/finance");
}
