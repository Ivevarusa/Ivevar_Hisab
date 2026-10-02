type Num = number | string | { toString(): string } | null | undefined;

export const num = (v: Num) => (v == null ? 0 : Number(v.toString()));

export function money(v: Num, currency = "INR") {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(num(v));
}

export const inr = (v: Num) => money(v, "INR");
export const usd = (v: Num) => money(v, "USD");

export function day(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

/** yyyy-mm-dd for <input type="date"> */
export const isoDay = (d: Date = new Date()) => d.toISOString().slice(0, 10);

export const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replaceAll("_", " ");
