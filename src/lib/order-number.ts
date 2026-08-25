export function chinaDateStamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: "year" | "month" | "day") =>
    parts.find((part) => part.type === type)?.value || "00";
  return `${value("year")}${value("month")}${value("day")}`;
}

export function orderNumberPrefix(date = new Date()) {
  return `PI#AC${chinaDateStamp(date)}`;
}

export function nextOrderNumber(existing: unknown[], date = new Date()) {
  const prefix = orderNumberPrefix(date);
  const next =
    existing.reduce<number>((largest, value) => {
      const number = String(value || "");
      if (!number.startsWith(prefix)) return largest;
      const sequence = Number(number.slice(prefix.length));
      return Number.isInteger(sequence) ? Math.max(largest, sequence) : largest;
    }, 0) + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}

export function nextProjectNumber(existing: unknown[], date = new Date()) {
  const prefix = chinaDateStamp(date);
  const next =
    existing.reduce<number>((largest, value) => {
      const number = String(value || "");
      if (!number.startsWith(prefix)) return largest;
      const sequence = Number(number.slice(prefix.length));
      return Number.isInteger(sequence) ? Math.max(largest, sequence) : largest;
    }, 0) + 1;
  return `${prefix}${String(next).padStart(2, "0")}`;
}
