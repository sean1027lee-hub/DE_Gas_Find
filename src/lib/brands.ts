/**
 * Brand normalisation for Tankerkönig `brand` strings: one display label per brand,
 * whatever spelling the station operator reported ("ARAL", "Total", "CircleK" …).
 */

interface BrandRule {
  label: string;
  /** Matched against the normalised brand (lowercase, no punctuation). */
  patterns: RegExp[];
}

const BRAND_RULES: BrandRule[] = [
  { label: "TotalEnergies", patterns: [/^total( ?energies)?\b/, /^totalenergies/] },
  { label: "Circle K", patterns: [/^circle ?k\b/] },
  { label: "Aral", patterns: [/^aral\b/] },
  { label: "AVIA", patterns: [/^avia\b/] },
  { label: "Eni", patterns: [/^eni\b/, /^agip\b/, /^eni ?agip\b/] },
  { label: "Westfalen", patterns: [/^westfalen\b/] },
  { label: "Shell", patterns: [/^shell\b/] },
  { label: "Esso", patterns: [/^esso\b/] },
  { label: "JET", patterns: [/^jet\b/] },
  { label: "bft", patterns: [/^bft\b/] },
  { label: "OMV", patterns: [/^omv\b/] },
  { label: "ORLEN", patterns: [/^orlen\b/] },
  { label: "STAR", patterns: [/^star\b/] },
  { label: "HEM", patterns: [/^hem\b/] },
  { label: "Raiffeisen", patterns: [/^raiffeisen\b/] },
  { label: "Hoyer", patterns: [/^hoyer\b/] },
  { label: "Tamoil", patterns: [/^tamoil\b/] },
  { label: "Q1", patterns: [/^q1\b/] },
  { label: "Globus", patterns: [/^globus\b/] },
  { label: "Supermarkt-Tankstelle", patterns: [/^supermarkt/] },
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
}

/**
 * Resolve the display label. Falls back to the station name when the
 * brand field is empty (Tankerkönig sometimes leaves it blank), but only when the
 * name *starts* with a known brand to avoid matches like "Aralstraße".
 */
export function resolveBrand(brand: string | null | undefined, name?: string | null): BrandInfo {
  const brandKey = normalizeBrandKey(brand);
  const rule = matchRule(brandKey) ?? (brandKey ? undefined : matchRule(normalizeBrandKey(name)));
  if (rule) return { label: rule.label };
  return { label: (brand ?? "").trim() };
}
