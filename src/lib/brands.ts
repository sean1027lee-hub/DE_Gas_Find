/**
 * Brand normalisation for Tankerkönig `brand` strings.
 * Single source of truth for display labels and Fleet Card discount groups.
 */

export type BrandGroup = "total" | "partner";

interface BrandRule {
  label: string;
  group: BrandGroup | null;
  /** Matched against the normalised brand (lowercase, no punctuation). */
  patterns: RegExp[];
}

const BRAND_RULES: BrandRule[] = [
  { label: "TotalEnergies", group: "total", patterns: [/^total( ?energies)?\b/, /^totalenergies/] },
  { label: "Circle K", group: "total", patterns: [/^circle ?k\b/] },
  { label: "Aral", group: "partner", patterns: [/^aral\b/] },
  { label: "AVIA", group: "partner", patterns: [/^avia\b/] },
  { label: "Eni", group: "partner", patterns: [/^eni\b/, /^agip\b/, /^eni ?agip\b/] },
  { label: "Westfalen", group: "partner", patterns: [/^westfalen\b/] },
  { label: "Shell", group: null, patterns: [/^shell\b/] },
  { label: "Esso", group: null, patterns: [/^esso\b/] },
  { label: "JET", group: null, patterns: [/^jet\b/] },
  { label: "bft", group: null, patterns: [/^bft\b/] },
  { label: "OMV", group: null, patterns: [/^omv\b/] },
  { label: "ORLEN", group: null, patterns: [/^orlen\b/] },
  { label: "STAR", group: null, patterns: [/^star\b/] },
  { label: "HEM", group: null, patterns: [/^hem\b/] },
  { label: "Raiffeisen", group: null, patterns: [/^raiffeisen\b/] },
  { label: "Hoyer", group: null, patterns: [/^hoyer\b/] },
  { label: "Tamoil", group: null, patterns: [/^tamoil\b/] },
  { label: "Q1", group: null, patterns: [/^q1\b/] },
  { label: "Globus", group: null, patterns: [/^globus\b/] },
  { label: "Supermarkt-Tankstelle", group: null, patterns: [/^supermarkt/] },
];

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeBrandKey(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchRule(key: string): BrandRule | undefined {
  if (!key) return undefined;
  return BRAND_RULES.find((rule) => rule.patterns.some((p) => p.test(key)));
}

export interface BrandInfo {
  /** Display label; falls back to the raw brand (trimmed) or an empty string. */
  label: string;
  group: BrandGroup | null;
}

/**
 * Resolve brand label and discount group. Falls back to the station name when the
 * brand field is empty (Tankerkönig sometimes leaves it blank), but only when the
 * name *starts* with a known brand to avoid matches like "Aralstraße".
 */
export function resolveBrand(brand: string | null | undefined, name?: string | null): BrandInfo {
  const brandKey = normalizeBrandKey(brand);
  const rule = matchRule(brandKey) ?? (brandKey ? undefined : matchRule(normalizeBrandKey(name)));
  if (rule) return { label: rule.label, group: rule.group };
  return { label: (brand ?? "").trim(), group: null };
}

export const BRAND_GROUP_LABELS: Record<BrandGroup, string> = {
  total: "TotalEnergies · Circle K",
  partner: "Aral · AVIA · Eni · Westfalen",
};
