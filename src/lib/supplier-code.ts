import { pinyin } from "pinyin-pro";

const LOCATIONS = [
  "广州", "深圳", "东莞", "佛山", "中山", "珠海", "惠州", "汕头",
  "上海", "北京", "天津", "重庆", "杭州", "宁波", "温州", "义乌",
  "苏州", "无锡", "南京", "常州", "青岛", "济南", "厦门", "泉州",
  "福州", "成都", "武汉", "长沙", "郑州", "合肥", "南昌", "石家庄",
];
const GENERIC = /(有限责任公司|股份有限公司|有限公司|集团|塑胶模具|玻璃制品|日用品|塑业|包装|制品|科技|实业|工贸|工业|贸易|日化|化妆品|模具|塑胶|公司|厂)/g;

function initials(value: string) {
  const latin = value.match(/[A-Za-z]+/g)?.join("") || "";
  const chinese = value.replace(/[A-Za-z0-9\s,，.。()（）\-_/]/g, "");
  const converted = chinese
    ? pinyin(chinese, { pattern: "first", toneType: "none", type: "array" }).join("")
    : "";
  return `${latin}${converted}`.replace(/[^A-Za-z]/g, "").toUpperCase();
}

export function supplierCodePrefix(location: unknown, companyName: unknown) {
  const company = String(companyName ?? "").trim();
  const suppliedLocation = String(location ?? "").trim();
  const locationInAddress = LOCATIONS.find((item) => suppliedLocation.includes(item));
  const cityInAddress = suppliedLocation.match(/省([\u4e00-\u9fff]{2,4})市/)?.[1];
  const cityInCompany = company.match(/^([\u4e00-\u9fff]{2,4})市/)?.[1];
  const detectedLocation = locationInAddress || cityInAddress || LOCATIONS.find((item) => company.startsWith(item)) || cityInCompany || suppliedLocation;
  const locationCode = initials(detectedLocation).slice(0, 4) || "XX";
  let brand = company;
  if (detectedLocation && brand.startsWith(detectedLocation)) brand = brand.slice(detectedLocation.length).replace(/^市/, "");
  brand = brand.replace(GENERIC, "");
  const brandCode = initials(brand).slice(0, 6) || "SUP";
  return `${locationCode}${brandCode}`;
}

export function formatSupplierCode(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}
