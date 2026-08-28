export type FreePricingResult = {
  product_name: string | null;
  supplier_name: string | null;
  material: string | null;
  capacity: string | null;
  currency: "CNY" | "USD" | "EUR" | "GBP";
  minimum_quantity: number;
  maximum_quantity: number | null;
  unit_price: number;
  tax_included: "true" | "false" | "unknown";
  trade_term: string | null;
  valid_until: string | null;
  notes: string | null;
  raw_text: string;
  confidence: number;
  source_image_path: null;
};

function normalize(text: string) {
  return text
    .normalize("NFKC")
    .replace(/[，]/g, ",")
    .replace(/[：]/g, ":")
    .replace(/[–—]/g, "-")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toNumber(value?: string) {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function detectCurrency(text: string): FreePricingResult["currency"] {
  if (/[€]|\bEUR\b/i.test(text)) return "EUR";
  if (/[£]|\bGBP\b/i.test(text)) return "GBP";
  if (/\bUSD\b|US\$|\$/i.test(text)) return "USD";
  return "CNY";
}

function extractQuantity(text: string) {
  const patterns = [
    /(?:MOQ|起订(?:量|数量)?|最低数量|最小数量|minimum\s*quantity)\s*[:=]?\s*(\d[\d,]*)/i,
    /(\d[\d,]*)\s*(?:个|只|套|件|pcs?|sets?)\s*(?:起订|以上)/i,
    /(?:数量|qty)\s*[:=]?\s*(\d[\d,]*)/i,
  ];
  for (const pattern of patterns) {
    const quantity = toNumber(text.match(pattern)?.[1]);
    if (quantity && Number.isInteger(quantity) && quantity > 0) return quantity;
  }
  return 1;
}

function priceCandidates(text: string) {
  const rows = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const candidates: Array<{ value: number; score: number; line: string }> = [];
  for (const line of rows) {
    const contextual = /单价|价格|报价|采购价|unit\s*price|price|[¥￥$€£]/i.test(line);
    const patterns = [
      /(?:单价|价格|报价|采购价|unit\s*price|price)\s*[:=]?\s*(?:RMB|CNY|USD|EUR|GBP|[¥￥$€£])?\s*(\d+(?:\.\d{1,6})?)/ig,
      /(?:RMB|CNY|USD|EUR|GBP|[¥￥$€£])\s*(\d+(?:\.\d{1,6})?)/ig,
      /(\d+(?:\.\d{1,6})?)\s*(?:元|块)?\s*\/\s*(?:个|只|套|件|pcs?|sets?)/ig,
      /(\d+(?:\.\d{1,6})?)\s*(?:元|块|RMB|CNY|USD|EUR|GBP)\b/ig,
    ];
    for (const pattern of patterns) {
      for (const match of line.matchAll(pattern)) {
        const value = toNumber(match[1]);
        if (value === null || value < 0) continue;
        candidates.push({ value, score: (contextual ? 3 : 0) + (value > 0 && value < 1000 ? 1 : 0), line });
      }
    }
  }
  return candidates.filter((candidate, index, all) => all.findIndex((item) => item.value === candidate.value && item.line === candidate.line) === index).sort((a, b) => b.score - a.score);
}

function extractProductName(text: string) {
  const line = text.split(/\n+/).find((item) => /\d+(?:\.\d+)?\s*(?:元|块)?\s*\//.test(item));
  if (!line) return null;
  const candidate = line
    .split(/(?:RMB|CNY|USD|EUR|GBP|[¥￥$€£])?\s*\d+(?:\.\d+)?\s*(?:元|块)?\s*\//i)[0]
    .replace(/^(?:报价|产品|品名)\s*[:：]?\s*/i, "")
    .trim();
  return candidate.length >= 3 && candidate.length <= 80 ? candidate : null;
}

export function parsePricingOcr(rawText: string, ocrConfidence = 0): FreePricingResult {
  const text = normalize(rawText);
  const prices = priceCandidates(text);
  const price = prices[0]?.value ?? 0;
  const quantity = extractQuantity(text);
  const material = text.match(/\b(PETG|HDPE|LDPE|PCR|ABS|SAN|AS|PET|PP|PE|PS|PMMA|铝|玻璃|纸)\b/i)?.[1] ?? null;
  const capacityMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(ml|mL|ML|g|kg|oz|L)\b/);
  const taxIncluded = /不含税|未税|税外|excluding\s*tax/i.test(text)
    ? "false"
    : /含税|含发票|including\s*tax/i.test(text)
      ? "true"
      : "unknown";
  const tradeTerm = text.match(/\b(EXW|FOB|CIF|CFR|DDP|DAP)\b/i)?.[1]?.toUpperCase() ?? null;
  const warnings = [
    "免费本地 OCR 结果，请人工核对后再保存",
    price ? null : "未可靠识别单价，已暂填 0",
    quantity === 1 && !/(?:MOQ|起订|数量|qty)/i.test(text) ? "未可靠识别 MOQ，已暂填 1" : null,
    prices.length > 1 ? `识别到其他可能价格：${prices.slice(1, 8).map((item) => item.value).join("、")}` : null,
    text ? `识别原文：${text.slice(0, 900)}` : null,
  ].filter(Boolean);
  const parsedFields = [price > 0, quantity > 1, Boolean(material), Boolean(capacityMatch), taxIncluded !== "unknown"].filter(Boolean).length;
  const confidence = Math.max(0.2, Math.min(0.9, (ocrConfidence / 100) * 0.55 + (parsedFields / 5) * 0.35));

  return {
    product_name: extractProductName(text),
    supplier_name: null,
    material,
    capacity: capacityMatch ? `${capacityMatch[1]}${capacityMatch[2].toLowerCase()}` : null,
    currency: detectCurrency(text),
    minimum_quantity: quantity,
    maximum_quantity: null,
    unit_price: price,
    tax_included: taxIncluded,
    trade_term: tradeTerm,
    valid_until: null,
    notes: warnings.join("；") || null,
    raw_text: text,
    confidence,
    source_image_path: null,
  };
}
