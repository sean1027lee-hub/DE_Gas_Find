/**
 * Deterministic price simulation for mock mode, following the 12:00 rule:
 * each station raises once at 12:00 and then cuts in steps until 11:59 next day.
 * Same station + time always gives the same price (seeded), so screenshots and
 * tests are reproducible.
 */
import benchmarks from "@/data/benchmarks.json";
import { berlinClock, RAISE_HOUR, typicalOffsetCt } from "../timing";
import type { Fuel } from "../types";
import type { HoursKind, MockStation } from "./stations";

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Stable pseudo-random number in [0, 1) for a key. */
export function seeded(key: string): number {
  let t = (hash(key) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** National level from the bundled EU Oil Bulletin, so mock prices look current. */
function nationalBase(fuel: Fuel): number {
  const de = (benchmarks as { countries: { code: string; euro95: number | null; diesel: number | null }[] }).countries.find(
    (c) => c.code === "DE",
  );
  const e5 = de?.euro95 ?? 1.799;
  if (fuel === "diesel") return de?.diesel ?? 1.699;
  return fuel === "e5" ? e5 : e5 - 0.06;
}

/** Date key of the most recent 12:00 raise ("price day"). */
function priceDay(date: Date): string {
  const { hour } = berlinClock(date);
  const d = hour < RAISE_HOUR ? new Date(date.getTime() - 86_400_000) : date;
  return berlinClock(d).dateKey;
}

export function simulatePrice(station: MockStation, fuel: Fuel, date: Date): number | null {
  if (!station.sells[fuel]) return null;
  const { hour, minute } = berlinClock(date);
  const day = priceDay(date);
  // Each station cuts prices on its own rhythm (every 40–100 min, own phase).
  const step = 40 + Math.floor(seeded(`${station.id}:step`) * 60);
  const phase = Math.floor(seeded(`${station.id}:phase`) * step);
  const sinceNoonMin = ((((hour - RAISE_HOUR) * 60 + minute) % 1440) + 1440) % 1440;
  const snappedMin = sinceNoonMin < phase ? 0 : Math.floor((sinceNoonMin - phase) / step) * step + phase;
  const clock = (RAISE_HOUR + snappedMin / 60) % 24;

  const amplitude = 0.85 + seeded(`${station.id}:amp`) * 0.3;
  const stationOffset = (seeded(`${station.id}:${fuel}:off`) - 0.5) * 4; // ±2 ct
  const dayDrift = (seeded(`${day}:${fuel}:drift`) - 0.5) * 3; // ±1.5 ct, changes only at 12:00
  const ct =
    nationalBase(fuel) * 100 + station.premiumCt + stationOffset + dayDrift + typicalOffsetCt(clock, fuel) * amplitude;
  // Pump prices end in 9 tenths of a cent.
  return (Math.floor(ct) + 0.9) / 100;
}

const WINDOWS: Record<HoursKind, (weekday: number) => [number, number] | null> = {
  h24: () => [0, 24 * 60],
  std: (wd) => (wd === 0 ? [8 * 60, 21 * 60] : wd === 6 ? [7 * 60, 22 * 60] : [6 * 60, 22 * 60]),
  short: (wd) => (wd === 0 ? null : wd === 6 ? [8 * 60, 18 * 60] : [7 * 60, 20 * 60]),
};

export function isOpenAt(station: MockStation, date: Date): boolean {
  const { hour, minute, weekday } = berlinClock(date);
  const w = WINDOWS[station.hours](weekday);
  if (!w) return false;
  const m = hour * 60 + minute;
  return m >= w[0] && m < w[1];
}
