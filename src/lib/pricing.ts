/** Discount, ranking and price-tier logic. Pure functions, shared by list, map and favourites. */
import type { BrandGroup } from "./brands";
import { distanceKm, type LatLng } from "./geo";
import type { Fuel, Station } from "./types";

export interface DiscountRules {
  enabled: boolean;
  /** Cents per litre at TotalEnergies / Circle K. */
  totalCt: number;
  /** Cents per litre at partner brands (Aral, AVIA, Eni, Westfalen). */
  partnerCt: number;
}

export const DEFAULT_DISCOUNT: DiscountRules = { enabled: true, totalCt: 3, partnerCt: 2 };

/** Discount in euros per litre for a brand group. */
export function discountFor(group: BrandGroup | null, rules: DiscountRules): number {
  if (!rules.enabled || !group) return 0;
  const ct = group === "total" ? rules.totalCt : rules.partnerCt;
  return Math.max(0, ct) / 100;
}

/** Round to 0.1 ct to avoid floating point noise (1.739 - 0.03 = 1.7089999…). */
export function roundPrice(price: number): number {
  return Math.round(price * 1000) / 1000;
}

export type SortMode = "price" | "distance";
export type PriceTier = "low" | "mid" | "high";

export interface RankedStation {
  station: Station;
  /** Pump price for the selected fuel. */
  pumpPrice: number;
  /** Discount per litre (euros). */
  discount: number;
  /** Expected price after card discount. */
  price: number;
  distanceKm: number;
  tier: PriceTier;
  /** Difference to the cheapest open station (euros, ≥ 0). */
  diffToMin: number;
  isCheapest: boolean;
}

export interface RankResult {
  open: RankedStation[];
  closed: RankedStation[];
  /** Stations in range that do not report a price for this fuel. */
  withoutPrice: number;
  cheapest: RankedStation | null;
  /** Mean expected price of open stations in range. */
  average: number | null;
}

export interface RankOptions {
  fuel: Fuel;
  rules: DiscountRules;
  origin: LatLng;
  radiusKm: number;
  sort: SortMode;
}

/** Open first, then by the chosen key, then the other key as tie-breaker. */
export function compareRanked(a: RankedStation, b: RankedStation, sort: SortMode): number {
  if (a.station.isOpen !== b.station.isOpen) return a.station.isOpen ? -1 : 1;
  if (sort === "price") {
    return a.price - b.price || a.distanceKm - b.distanceKm || a.station.id.localeCompare(b.station.id);
  }
  return a.distanceKm - b.distanceKm || a.price - b.price || a.station.id.localeCompare(b.station.id);
}

/**
 * Tier thresholds from the 33rd/67th percentile of the current result set.
 * With fewer than 3 distinct prices everything except the cheapest is "mid".
 */
export function tierThresholds(prices: number[]): { low: number; high: number } | null {
  const distinct = [...new Set(prices)].sort((a, b) => a - b);
  if (distinct.length < 3) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
  return { low: q(1 / 3), high: q(2 / 3) };
}

export function tierFor(price: number, min: number, t: { low: number; high: number } | null): PriceTier {
  if (price <= min) return "low";
  if (!t) return "mid";
  if (price <= t.low) return "low";
  if (price >= t.high && t.high > t.low) return "high";
  return "mid";
}

export function rankStations(stations: Station[], opts: RankOptions): RankResult {
  const inRange: Omit<RankedStation, "tier" | "diffToMin" | "isCheapest">[] = [];
  let withoutPrice = 0;
  for (const station of stations) {
    const d = distanceKm(opts.origin, station);
    if (d > opts.radiusKm) continue;
    const pumpPrice = station.prices[opts.fuel];
    if (pumpPrice === null) {
      withoutPrice++;
      continue;
    }
    const discount = discountFor(station.brandGroup, opts.rules);
    inRange.push({ station, pumpPrice, discount, price: roundPrice(pumpPrice - discount), distanceKm: d });
  }

  const openPrices = inRange.filter((r) => r.station.isOpen).map((r) => r.price);
  const min = openPrices.length ? Math.min(...openPrices) : null;
  const thresholds = tierThresholds(openPrices);
  const average = openPrices.length ? openPrices.reduce((s, p) => s + p, 0) / openPrices.length : null;

  const ranked: RankedStation[] = inRange.map((r) => ({
    ...r,
    tier: min === null ? "mid" : tierFor(r.price, min, thresholds),
    diffToMin: min === null ? 0 : roundPrice(Math.max(0, r.price - min)),
    isCheapest: false,
  }));

  const open = ranked.filter((r) => r.station.isOpen).sort((a, b) => compareRanked(a, b, opts.sort));
  const closed = ranked.filter((r) => !r.station.isOpen).sort((a, b) => compareRanked(a, b, opts.sort));

  // The cheapest is the lowest price; ties go to the nearer station.
  const cheapest = open.length ? [...open].sort((a, b) => compareRanked(a, b, "price"))[0] : null;
  if (cheapest) cheapest.isCheapest = true;

  return { open, closed, withoutPrice, cheapest, average };
}

/** Savings of the cheapest vs. the average for a given fill-up. */
export function savingsVsAverage(cheapest: number, average: number, litres: number): number {
  return Math.max(0, Math.round((average - cheapest) * litres * 100) / 100);
}
