const COUNTRY_CODES: Record<string, string> = {
  中国: "CN", 美国: "US", 英国: "GB", 法国: "FR", 德国: "DE",
  意大利: "IT", 西班牙: "ES", 葡萄牙: "PT", 荷兰: "NL", 比利时: "BE",
  瑞士: "CH", 奥地利: "AT", 波兰: "PL", 土耳其: "TR", 俄罗斯: "RU",
  加拿大: "CA", 墨西哥: "MX", 巴西: "BR", 阿根廷: "AR", 智利: "CL",
  澳大利亚: "AU", 新西兰: "NZ", 日本: "JP", 韩国: "KR", 印度: "IN",
  印度尼西亚: "ID", 马来西亚: "MY", 新加坡: "SG", 泰国: "TH", 越南: "VN",
  菲律宾: "PH", 阿联酋: "AE", 沙特阿拉伯: "SA", 南非: "ZA", 摩洛哥: "MA",
  美国USA: "US", 英国UK: "GB",
};

export function countryCode(country: unknown) {
  const raw = String(country ?? "").trim();
  const explicit = raw.match(/^([A-Za-z]{2})(?:\s*[-—_/·]|\s|$)/);
  if (explicit) return explicit[1].toUpperCase();
  const compact = raw.replace(/\s/g, "");
  for (const [name, code] of Object.entries(COUNTRY_CODES))
    if (compact.includes(name)) return code;
  return "XX";
}

export function formatCustomerCode(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}
