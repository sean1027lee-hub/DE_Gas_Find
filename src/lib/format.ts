/** Formatting helpers. Numbers use German conventions (decimal comma); UI copy is Korean. */

export interface PriceParts {
  /** e.g. "1,73" */
  main: string;
  /** Third decimal shown as superscript on pump displays, e.g. "9" */
  sup: string;
}

/** 1.739 → { main: "1,73", sup: "9" } */
export function priceParts(price: number): PriceParts {
  const tenthCents = Math.round(price * 1000);
  const euros = Math.floor(tenthCents / 1000);
  const rest = String(tenthCents - euros * 1000).padStart(3, "0");
  return { main: `${euros},${rest.slice(0, 2)}`, sup: rest.slice(2) };
}

/** Plain string for screen readers and copy: 1.739 → "1,739" */
export function priceString(price: number): string {
  const { main, sup } = priceParts(price);
  return `${main}${sup}`;
}

/** Cent difference with sign: 0.02 → "+2ct", 0.025 → "+2,5ct", 0 → "±0ct" */
export function formatCtDiff(diffEuro: number): string {
  const tenths = Math.round(diffEuro * 1000);
  if (tenths === 0) return "±0ct";
  const sign = tenths > 0 ? "+" : "−";
  return `${sign}${formatCt(Math.abs(tenths) / 1000)}`;
}

/** 0.03 → "3ct", 0.025 → "2,5ct" */
export function formatCt(euro: number): string {
  const tenths = Math.round(Math.abs(euro) * 1000);
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return frac === 0 ? `${whole}ct` : `${whole},${frac}ct`;
}

/** 0.85 → "850 m", 1.234 → "1,2 km", 12.6 → "13 km" */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  if (km < 10) return `${(Math.round(km * 10) / 10).toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}

/** 2.1 → "2,10 €" */
export function formatEuro(amount: number): string {
  return `${amount.toFixed(2).replace(".", ",")} €`;
}

/** Date → "07:04" in the device's time zone. */
export function formatClock(date: Date): string {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Relative age as an i18n key + count: "age.min" + 3 → "3분 전" / "vor 3 Min." */
export function ageParts(from: Date, now: Date = new Date()): { key: "age.now" | "age.min" | "age.hour" | "age.day"; n: number } {
  const minutes = Math.floor((now.getTime() - from.getTime()) / 60000);
  if (minutes < 1) return { key: "age.now", n: 0 };
  if (minutes < 60) return { key: "age.min", n: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { key: "age.hour", n: hours };
  return { key: "age.day", n: Math.floor(hours / 24) };
}

/** "Heidelberger Str." + "12" → "Heidelberger Str. 12" */
export function formatStreet(street: string, houseNumber: string): string {
  return [street, houseNumber].filter(Boolean).join(" ").trim();
}

/** Title-case ALL-CAPS station data ("DARMSTADT" → "Darmstadt"), leave mixed case alone. */
export function tidyCase(text: string): string {
  if (!text || text !== text.toUpperCase() || !/[A-ZÄÖÜ]/.test(text)) return text;
  return text
    .toLowerCase()
    .replace(/(^|[\s\-/(.])([a-zäöüß])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** 2.214 → "2,214 €" (per litre, three decimals as published). */
export function formatLitrePrice(price: number): string {
  return `${price.toFixed(3).replace(".", ",")} €`;
}

/** "2026-10-12" → "2026.10.12" */
export function formatIsoDate(iso: string): string {
  return iso.replaceAll("-", ".");
}

const LOCALES: Record<string, string> = { ko: "ko-KR", de: "de-DE", en: "en-GB" };

/** "2026-10-12" → "10월 12일" / "12. Okt." / "12 Oct" */
export function formatMonthDay(iso: string, lang = "ko"): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat(LOCALES[lang] ?? "en-GB", {
    month: lang === "ko" ? "long" : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}
