import { createClient } from "@supabase/supabase-js";

export const SOURCE_KEYS = [
  "laifaxin:xiaofupo",
  "email:anne@skincarepkg.com",
  "email:christina@skincarepkg.com",
  "email:christina.s@chinabeautytools.com",
  "email:christina.s@acfoldingbox.com",
  "email:anne@oceanpackagings.com",
  "email:angela.s@skincareform.com",
  "whatsapp:business-1",
  "whatsapp:business-2",
] as const;

export type SourceKey = (typeof SOURCE_KEYS)[number];

export function serviceDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("缺少 Supabase 服务端配置");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function authorized(request: Request, secretName = "COMMUNICATION_SYNC_SECRET") {
  const secret = process.env[secretName];
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizePhone(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  return digits ? `+${digits.replace(/^00/, "")}` : "";
}

export function isSourceKey(value: unknown): value is SourceKey {
  return SOURCE_KEYS.includes(value as SourceKey);
}
