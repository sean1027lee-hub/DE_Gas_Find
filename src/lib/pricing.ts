/** Ranking and price-tier logic. Pure functions, shared by list, map and favourites. */
import { distanceKm, type LatLng } from "./geo";
import type { Fuel, Station } from "./types";

/** Round to 0.1 ct to avoid floating point noise. */
export function roundPrice(price: number): number {
  return Math.round(price * 1000) / 1000;
}

export type SortMode = "price" | "distance";
export type PriceTier = "low" | "mid" | "high";

export interface RankedStation {
  station: Station;
  /** Pump price for the selected fuel. */
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
  /** Mean price of open stations in range. */
  average: number | null;
}

export interface RankOptions {
  fuel: Fuel;
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
    const price = station.prices[opts.fuel];
    if (price === null) {
      withoutPrice++;
      continue;
    }
    inRange.push({ station, price, distanceKm: d });
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

/** Savings for a fill-up when paying `cheaper` instead of `reference` per litre. */
export function savingsFor(cheaper: number, reference: number, litres: number): number {
  return Math.max(0, Math.round((reference - cheaper) * litres * 100) / 100);
}
