"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isLocalMode, localSaveDetailedResearch, localUpdateCustomerResearch } from "@/lib/local-db";

const schema = z.object({
  customer_id: z.string().uuid(),
  background_summary: z.string().max(8000).optional(),
  latest_result: z.string().max(4000).optional(),
  next_action: z.string().max(4000).optional(),
  notes: z.string().max(4000).optional(),
});

export async function saveCustomerResearch(formData: FormData) {
  const values = schema.parse(Object.fromEntries(formData));
  const { customer_id, ...updates } = values;
  if (isLocalMode()) {
    localUpdateCustomerResearch(customer_id, updates);
  } else {
    const db = await createClient();
    const { error } = await db
      .from("customers")
      .update(updates)
      .eq("id", customer_id)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/customer-research");
  revalidatePath("/customers");
}

const detailSchema = z.object({
  customer_id: z.string().uuid(),
  verification_status: z.enum(["已核验", "部分核验", "待核验"]),
  researched_at: z.string().max(10).optional(),
}).passthrough();

const reportFields = [
  "brand_name", "brand_alias", "legal_name", "founded_at", "headquarters", "business_address", "public_phone", "public_email",
  "customer_identity", "business_role", "production_model", "brand_history", "main_products", "quality_judgement", "production_judgement", "packaging_judgement",
  "packaging_needs", "product_match", "moq_analysis", "purchasing_authority", "company_scale", "payment_capacity", "purchase_scale", "growth_potential", "financial_risk",
  "sales_channels", "pain_points", "entry_strategy", "recommended_contact", "development_risk", "customer_grade", "development_priority", "final_recommendation",
  "verified_facts", "reasoned_inferences", "pending_verification",
] as const;

function parseLines(value: unknown, type: "contact" | "source"): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
  for (const line of String(value ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const p = line.split("|").map((item) => item.trim());
    const item: Record<string, string> = type === "contact"
      ? { name: p[0] || "", position: p[1] || "", email: p[2] || "", phone: p[3] || "", linkedin: p[4] || "", source_url: p[5] || "", verification_status: p[6] || "待核验" }
      : { title: p[0] || "", url: p[1] || "", fact_summary: p[2] || "", verification_status: p[3] || "待核验" };
    if (type === "contact" ? Boolean(item.name || item.email || item.phone) : Boolean(item.url)) items.push(item);
  }
  return items;
}

export async function saveDetailedCustomerResearch(formData: FormData) {
  const raw = Object.fromEntries(formData);
  const base = detailSchema.parse(raw);
  const report = Object.fromEntries(reportFields.map((key) => [key, String(raw[key] ?? "").slice(0, 12000)]));
  const contacts = parseLines(raw.public_contacts, "contact");
  const sources = parseLines(raw.evidence_sources, "source");
  if (isLocalMode()) {
    localSaveDetailedResearch(base.customer_id, { report, contacts, sources, verificationStatus: base.verification_status, researchedAt: base.researched_at });
  } else {
    const db = await createClient();
    const { error: reportError } = await db.from("customer_research_reports").upsert({ customer_id: base.customer_id, report_data: report, verification_status: base.verification_status, researched_at: base.researched_at || null, updated_at: new Date().toISOString() }, { onConflict: "customer_id" });
    if (reportError) throw new Error(reportError.message);
    await db.from("customer_research_contacts").delete().eq("customer_id", base.customer_id);
    await db.from("customer_research_sources").delete().eq("customer_id", base.customer_id);
    if (contacts.length) { const { error } = await db.from("customer_research_contacts").insert(contacts.map((item) => ({ ...item, customer_id: base.customer_id }))); if (error) throw new Error(error.message); }
    if (sources.length) { const { error } = await db.from("customer_research_sources").insert(sources.map((item) => ({ ...item, customer_id: base.customer_id, checked_at: base.researched_at || null }))); if (error) throw new Error(error.message); }
  }
  revalidatePath("/customer-research");
}
