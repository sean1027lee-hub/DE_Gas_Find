/**
 * National benchmarks from the EU Weekly Oil Bulletin (src/data/benchmarks.json,
 * refreshed weekly by GitHub Actions). Pure functions; the UI imports the JSON lazily.
 */
import type { Fuel } from "./types";

export type BenchmarkFuel = "euro95" | "diesel";

export interface CountryPrice {
  code: string;
  euro95: number | null;
  diesel: number | null;
  euro95Date: string | null;
  dieselDate: string | null;
  euro95YearAgo: number | null;
  dieselYearAgo: number | null;
}

export interface Benchmarks {
  source: { name: string; publisher: string; url: string; license: string; note: string };
  generatedAt: string;
  /** Monday of the latest bulletin week (YYYY-MM-DD). */
  latestDate: string;
  /** Germany, weekly, oldest → newest, €/L incl. taxes. */
  germany: { dates: string[]; euro95: (number | null)[]; diesel: (number | null)[] };
  germanyTax: { date: string } & Record<BenchmarkFuel, { total: number; net: number } | null>;
  countries: CountryPrice[];
}

/** Super E5/E10 → Euro-super 95; Diesel → diesel. The bulletin has no separate E10 series. */
export function benchmarkFuel(fuel: Fuel): BenchmarkFuel {
  return fuel === "diesel" ? "diesel" : "euro95";
}

export interface Point {
  date: string;
  price: number;
}

export function seriesOf(b: Benchmarks, fuel: BenchmarkFuel): Point[] {
  const out: Point[] = [];
  b.germany.dates.forEach((date, i) => {
    const price = b.germany[fuel][i];
    if (price !== null) out.push({ date, price });
  });
  return out;
}

function addYears(iso: string, years: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/** Points within the last `years` years up to and including the latest point. */
export function windowOf(series: Point[], years: number): Point[] {
  if (series.length === 0) return [];
  const from = addYears(series[series.length - 1].date, -years);
  return series.filter((p) => p.date > from);
}

export interface WindowStats {
  latest: Point;
  average: number;
  min: Point;
  max: Point;
  /** Share of weeks in the window that were cheaper than the latest week, 0–100. */
  percentile: number;
  /** Closest point ~52 weeks before the latest, if any. */
  yearAgo: Point | null;
}

export function windowStats(series: Point[], years: number): WindowStats | null {
  const win = windowOf(series, years);
  if (win.length < 2) return null;
  const latest = win[win.length - 1];
  let min = win[0];
  let max = win[0];
  let sum = 0;
  let cheaper = 0;
  for (const p of win) {
    sum += p.price;
    if (p.price < min.price) min = p;
    if (p.price > max.price) max = p;
    if (p.price < latest.price) cheaper++;
  }
  const target = addYears(latest.date, -1);
  const yearAgo =
    series.filter((p) => p.date <= target).at(-1) ?? null;
  return {
    latest,
    average: sum / win.length,
    min,
    max,
    percentile: Math.round((cheaper / (win.length - 1)) * 100),
    yearAgo: yearAgo && daysBetween(yearAgo.date, target) <= 10 ? yearAgo : null,
  };
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86_400_000;
}

export type Verdict = "low" | "mid" | "high";

/** Where the latest week sits in its window: bottom quarter = cheap, top quarter = expensive. */
export function verdictFor(percentile: number): Verdict {
  if (percentile <= 25) return "low";
  if (percentile >= 75) return "high";
  return "mid";
}

export interface YearSummary {
  year: number;
  average: number;
  min: number;
  max: number;
  weeks: number;
}

/** Calendar-year averages (newest first). Partial years are flagged by `weeks`. */
export function yearlySummary(series: Point[]): YearSummary[] {
  const byYear = new Map<number, number[]>();
  for (const p of series) {
    const y = Number(p.date.slice(0, 4));
    (byYear.get(y) ?? byYear.set(y, []).get(y)!).push(p.price);
  }
  return [...byYear.entries()]
    .map(([year, prices]) => ({
      year,
      average: prices.reduce((s, x) => s + x, 0) / prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      weeks: prices.length,
    }))
    .sort((a, b) => b.year - a.year);
}

/** Germany's land neighbours that report to the Oil Bulletin (Switzerland is not in the EU). */
export const NEIGHBOURS = ["DK", "NL", "BE", "LU", "FR", "AT", "CZ", "PL"] as const;

export interface RankedCountry {
  code: string;
  price: number;
  /** Price minus Germany's price (€/L). */
  diffToGermany: number;
  yearAgo: number | null;
  isGermany: boolean;
  isAggregate: boolean;
}

/** Countries with a price for `fuel`, cheapest first. `codes` limits the set (Germany is always kept). */
export function rankCountries(b: Benchmarks, fuel: BenchmarkFuel, codes?: readonly string[]): RankedCountry[] {
  const de = b.countries.find((c) => c.code === "DE")?.[fuel];
  if (de == null) return [];
  return b.countries
    .filter((c) => c[fuel] !== null && (!codes || codes.includes(c.code) || c.code === "DE"))
    .map((c) => ({
      code: c.code,
      price: c[fuel] as number,
      diffToGermany: Math.round(((c[fuel] as number) - de) * 1000) / 1000,
      yearAgo: c[`${fuel}YearAgo`],
      isGermany: c.code === "DE",
      isAggregate: c.code === "EU" || c.code === "EUR",
    }))
    .sort((a, b2) => a.price - b2.price || a.code.localeCompare(b2.code));
}

/** Position of Germany among the 27 member states (1 = cheapest). */
export function germanyRank(b: Benchmarks, fuel: BenchmarkFuel): { rank: number; of: number } | null {
  const members = rankCountries(b, fuel).filter((c) => !c.isAggregate);
  const i = members.findIndex((c) => c.isGermany);
  return i < 0 ? null : { rank: i + 1, of: members.length };
}

export function taxShare(b: Benchmarks, fuel: BenchmarkFuel): { total: number; net: number; tax: number; share: number } | null {
  const t = b.germanyTax[fuel];
  if (!t) return null;
  const tax = Math.round((t.total - t.net) * 1000) / 1000;
  return { total: t.total, net: t.net, tax, share: Math.round((tax / t.total) * 100) };
}

let cache: Promise<Benchmarks> | null = null;

/** Lazily loads the bundled JSON (kept out of the initial bundle). */
export function loadBenchmarks(): Promise<Benchmarks> {
  cache ??= import("@/data/benchmarks.json").then((m) => (m.default ?? m) as unknown as Benchmarks);
  return cache;
}
