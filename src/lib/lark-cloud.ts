import { serviceDb } from "@/lib/communications";

type LarkRecord = {
  record_id: string;
  fields: Record<string, unknown>;
  last_modified_time?: number;
};

const defaultMapping: Record<string, string> = {
  company_name: "公司名称",
  customer_type: "客户类型",
  business_products: "我司产品",
  stage: "客户阶段",
  inquiry_grade: "询盘等级",
  email_content: "邮件内容",
  contact_name: "联系人",
  email: "邮箱",
  position: "职位",
  social_media: "社媒",
  phone: "电话",
  latest_result: "最近沟通情况",
  next_action: "下一步跟进",
  follow_up_reminder: "提醒跟进",
  follow_up_checkin: "跟进打卡",
  lark_created_at: "创建时间",
  last_follow_up_at: "最后跟进时间",
  background_summary: "背调",
  company_size: "客户规模",
  country: "国家",
  website: "网站",
};

const customerColumns = [
  "customer_type", "business_products", "stage", "inquiry_grade",
  "email_content", "contact_name", "email", "position", "social_media",
  "phone", "latest_result", "next_action", "follow_up_reminder",
  "follow_up_checkin", "lark_created_at", "last_follow_up_at",
  "background_summary", "company_size", "country", "website",
] as const;

export function larkCloudConfig() {
  const region: "feishu" | "lark" = process.env.LARK_REGION === "feishu" ? "feishu" : "lark";
  const required = {
    appId: process.env.LARK_APP_ID,
    appSecret: process.env.LARK_APP_SECRET,
    baseToken: process.env.LARK_BASE_TOKEN,
    tableId: process.env.LARK_TABLE_ID,
  };
  return {
    region,
    configured: Object.values(required).every(Boolean),
    appIdHint: required.appId ? `${required.appId.slice(0, 6)}…` : "未配置",
    baseTokenHint: required.baseToken ? `${required.baseToken.slice(0, 6)}…` : "未配置",
    tableIdHint: required.tableId || "未配置",
  };
}

function fullConfig() {
  const status = larkCloudConfig();
  const appId = process.env.LARK_APP_ID;
  const appSecret = process.env.LARK_APP_SECRET;
  const baseToken = process.env.LARK_BASE_TOKEN;
  const tableId = process.env.LARK_TABLE_ID;
  if (!status.configured || !appId || !appSecret || !baseToken || !tableId)
    throw new Error("Lark 云端凭据尚未配置完整");
  let mapping = defaultMapping;
  if (process.env.LARK_FIELD_MAPPING_JSON) {
    try { mapping = { ...mapping, ...JSON.parse(process.env.LARK_FIELD_MAPPING_JSON) }; }
    catch { throw new Error("LARK_FIELD_MAPPING_JSON 不是有效 JSON"); }
  }
  return { ...status, appId, appSecret, baseToken, tableId, mapping };
}

function apiHost(region: "lark" | "feishu") {
  return region === "feishu" ? "https://open.feishu.cn" : "https://open.larksuite.com";
}

async function tenantToken() {
  const config = fullConfig();
  const response = await fetch(`${apiHost(config.region)}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_id: config.appId, app_secret: config.appSecret }),
    cache: "no-store",
  });
  const body = await response.json() as { code?: number; msg?: string; tenant_access_token?: string };
  if (!response.ok || body.code !== 0 || !body.tenant_access_token)
    throw new Error(`Lark 鉴权失败：${body.msg || response.status}`);
  return { config, accessToken: body.tenant_access_token };
}

function text(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean).join(", ") || null;
  if (typeof value === "object") {
    const item = value as Record<string, unknown>;
    return text(item.text ?? item.name ?? item.link ?? item.value) || JSON.stringify(value);
  }
  return String(value).trim() || null;
}

function dateValue(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const numeric = Number(raw);
  const date = Number.isFinite(numeric) && numeric > 10_000_000_000
    ? new Date(numeric)
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mappedValues(record: LarkRecord, mapping: Record<string, string>) {
  const values: Record<string, string | null> = {};
  for (const [column, fieldName] of Object.entries(mapping))
    values[column] = ["lark_created_at", "last_follow_up_at"].includes(column)
      ? dateValue(record.fields[fieldName])
      : text(record.fields[fieldName]);
  return values;
}

export async function testLarkCloudConnection() {
  const { config, accessToken } = await tenantToken();
  const url = `${apiHost(config.region)}/open-apis/bitable/v1/apps/${encodeURIComponent(config.baseToken)}/tables/${encodeURIComponent(config.tableId)}/records?page_size=1`;
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const body = await response.json() as { code?: number; msg?: string };
  if (!response.ok || body.code !== 0) throw new Error(`无法读取多维表格：${body.msg || response.status}`);
  return true;
}

export async function syncLarkCloudCustomers() {
  const { config, accessToken } = await tenantToken();
  const db = serviceDb();
  let pageToken = "";
  let hasMore = true;
  let total = 0, created = 0, unchanged = 0, skipped = 0, failed = 0;
  const failures: Array<{ recordId: string; companyName: string; reason: string }> = [];

  while (hasMore) {
    const query = new URLSearchParams({ page_size: "100" });
    if (pageToken) query.set("page_token", pageToken);
    const url = `${apiHost(config.region)}/open-apis/bitable/v1/apps/${encodeURIComponent(config.baseToken)}/tables/${encodeURIComponent(config.tableId)}/records?${query}`;
    const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const body = await response.json() as { code?: number; msg?: string; data?: { items?: LarkRecord[]; has_more?: boolean; page_token?: string } };
    if (!response.ok || body.code !== 0 || !body.data) throw new Error(`Lark 读取失败：${body.msg || response.status}`);
    const records = body.data.items || [];
    total += records.length;
    for (const record of records) {
      const values = mappedValues(record, config.mapping);
      const companyName = values.company_name;
      if (!companyName) { skipped++; continue; }
      try {
        const { data: byRecord, error: recordError } = await db.from("customers").select("id").eq("lark_record_id", record.record_id).limit(1).maybeSingle();
        if (recordError) throw recordError;
        if (byRecord) { unchanged++; continue; }
        const { data: byName, error: nameError } = await db.from("customers").select("id").ilike("company_name", companyName).is("deleted_at", null).limit(1).maybeSingle();
        if (nameError) throw nameError;
        if (byName) { unchanged++; continue; }
        const payload: Record<string, unknown> = {
          company_name: companyName,
          customer_code: `LARK-${Date.now().toString(36).toUpperCase()}-${created}`,
          stage: values.stage || "待开发",
          grade: "C",
          source: "Lark 多维表格",
          lark_record_id: record.record_id,
          lark_updated_at: record.last_modified_time ? new Date(Number(record.last_modified_time)).toISOString() : new Date().toISOString(),
        };
        for (const column of customerColumns) if (values[column]) payload[column] = values[column];
        const { error } = await db.from("customers").insert(payload);
        if (error) throw error;
        created++;
      } catch (error) {
        failed++;
        failures.push({ recordId: record.record_id, companyName, reason: error instanceof Error ? error.message : "未知错误" });
      }
    }
    hasMore = Boolean(body.data.has_more);
    pageToken = body.data.page_token || "";
  }
  return { total, created, unchanged, skipped, failed, failures: failures.slice(0, 50) };
}
