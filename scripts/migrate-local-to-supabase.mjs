import Database from "better-sqlite3";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("缺少 Supabase 服务端配置");

const local = new Database("data/anne-crm.db", { readonly: true });
const cloud = createClient(url, key, { auth: { persistSession: false } });
const chunk = (rows, size = 100) => Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));
const only = (row, columns) => Object.fromEntries(columns.filter((column) => row[column] !== undefined).map((column) => [column, row[column]]));
const jsonValue = (value, fallback = {}) => {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
const dateValue = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value).trim();
  if (/^\d{10,13}$/.test(text)) {
    const numeric = Number(text);
    const milliseconds = text.length <= 10 ? numeric * 1000 : numeric;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const normalizeDates = (row, columns) => {
  const normalized = { ...row };
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(normalized, column)) normalized[column] = dateValue(normalized[column]);
  }
  return normalized;
};
const rows = (table) => local.prepare(`select * from ${table}`).all();

async function upsert(table, data, onConflict = "id") {
  let migrated = 0;
  for (const part of chunk(data)) {
    const { error } = await cloud.from(table).upsert(part, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    migrated += part.length;
  }
  console.log(`${table}=${migrated}`);
}

const customerColumns = ["id","customer_code","company_name","website","country","stage","grade","source","latest_result","next_action","next_follow_up_at","last_follow_up_at","background_summary","company_size","notes","created_at","deleted_at","lark_record_id","lark_updated_at","lark_created_at","customer_type","business_products","inquiry_grade","email_content","contact_name","email","position","social_media","phone","follow_up_reminder","follow_up_checkin"];
await upsert("customers", rows("customers").map((row) => normalizeDates(only(row, customerColumns), ["next_follow_up_at","last_follow_up_at","created_at","deleted_at","lark_updated_at","lark_created_at"])));

await upsert("opportunities", rows("opportunities").map((row) => normalizeDates(only(row, ["id","opportunity_code","title","customer_id","status","project_progress","estimated_amount","currency","expected_close_date","created_at","deleted_at"]), ["expected_close_date","created_at","deleted_at"])));
await upsert("follow_ups", rows("follow_ups").map((row) => normalizeDates(only(row, ["id","customer_id","opportunity_id","channel","content","result","followed_at","created_at","deleted_at"]), ["followed_at","created_at","deleted_at"])));
await upsert("tasks", rows("tasks").map((row) => normalizeDates({ ...only(row, ["id","title","task_type","customer_id","opportunity_id","priority","status","auto_rule","created_at","deleted_at"]), due_at: row.due_at || row.created_at || new Date().toISOString() }, ["due_at","created_at","deleted_at"])));

await upsert("suppliers", rows("suppliers").map((row) => normalizeDates(only(row, ["id","supplier_code","company_name","supplier_type","standard_moq","lead_time_days","status","location","created_at","deleted_at"]), ["created_at","deleted_at"])));
await upsert("products", rows("products").map((row) => normalizeDates(only(row, ["id","product_code","product_name","category","material","capacity_value","capacity_unit","neck_size","product_status","image_path","purchase_unit_price_cny","purchase_notes","primary_supplier_id","purchase_moq","delivery_lead_time_days","special_notes","created_at","deleted_at"]), ["created_at","deleted_at"])));
await upsert("orders", rows("orders").map((row) => normalizeDates(only(row, ["id","order_number","customer_id","status","order_date","sales_amount","sales_currency","total_cost_cny","order_categories","created_at","deleted_at"]), ["order_date","created_at","deleted_at"])));
await upsert("financial_records", rows("financial_records").map((row) => normalizeDates(only(row, ["id","record_type","category","counterparty","amount","currency","amount_cny","occurred_at","status","notes","order_id","product_cost_cny","freight_cny","miscellaneous_cny","other_cost_cny","total_cost_cny","calculated_profit_cny","profit_margin","order_revenue_cny","created_at","deleted_at"]), ["occurred_at","created_at","deleted_at"])));

await upsert("customer_research_reports", rows("customer_research_reports").map((row) => normalizeDates({ ...only(row, ["id","customer_id","verification_status","researched_at","created_at","updated_at"]), report_data: jsonValue(row.report_data) }, ["researched_at","created_at","updated_at"])));
await upsert("customer_research_contacts", rows("customer_research_contacts").map((row) => normalizeDates(only(row, ["id","customer_id","name","position","email","phone","linkedin","source_url","verification_status","created_at"]), ["created_at"])));
await upsert("customer_research_sources", rows("customer_research_sources").map((row) => normalizeDates(only(row, ["id","customer_id","title","url","fact_summary","verification_status","checked_at","created_at"]), ["checked_at","created_at"])));
await upsert("communication_sync_events", rows("communication_sync_events").map((row) => normalizeDates(only(row, ["id","source","external_id","customer_id","occurred_at","summary","task_id","created_at"]), ["occurred_at","created_at"])), "source,external_id");

console.log("migration_complete=true");
