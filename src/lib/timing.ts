/**
 * Intraday price pattern under Germany's 12:00 rule (in force since 1 April 2026):
 * stations may raise prices only once a day at 12:00; cuts are allowed any time.
 * ADAC's May 2026 analysis: highest right after 12:00, falling through the
 * afternoon (below the daily mean from ~17:30), lowest just before 12:00.
 *
 * `typicalOffsetCt` is a schematic of that shape — not measured data. The app
 * replaces it with a curve learned from prices seen on this device once enough
 * observations exist (`learnCurve`). The mock simulation uses the same shape so
 * the prediction UI can be checked end to end.
 */
import type { Fuel } from "./types";

export const RAISE_HOUR = 12;
export const TZ = "Europe/Berlin";

/** Hours since 12:00 → ct above the day's mean (before normalisation). */
const ANCHORS: [number, number][] = [
  [0, 10],
  [1, 7.6],
  [2, 5.8],
  [3, 4.3],
  [4, 3.0],
  [5, 1.9],
  [6, 1.0],
  [8, -0.2],
  [10, -1.0],
  [12, -1.6],
  [16, -2.4],
  [20, -3.0],
  [24, -3.7],
];

function rawOffset(sinceNoon: number): number {
  for (let i = 1; i < ANCHORS.length; i++) {
    const [h1, v1] = ANCHORS[i];
    const [h0, v0] = ANCHORS[i - 1];
    if (sinceNoon <= h1) return v0 + ((sinceNoon - h0) / (h1 - h0)) * (v1 - v0);
  }
  return ANCHORS[ANCHORS.length - 1][1];
}

const MEAN = (() => {
  let s = 0;
  const n = 24 * 12;
  for (let i = 0; i < n; i++) s += rawOffset(i / 12);
  return s / n;
})();

/** Diesel moves a little more than petrol (ADAC: 4.3 vs 3.7 ct below mean before noon). */
const AMPLITUDE: Record<Fuel, number> = { e10: 1, e5: 1, diesel: 1.15 };

/** Typical offset from the daily mean in ct for a local clock time (0–24h). */
export function typicalOffsetCt(hour: number, fuel: Fuel = "e10"): number {
  const sinceNoon = (((hour - RAISE_HOUR) % 24) + 24) % 24;
  return (rawOffset(sinceNoon) - MEAN) * AMPLITUDE[fuel];
}

/** Local (Berlin) clock parts for a timestamp. */
export function berlinClock(date: Date): { hour: number; minute: number; weekday: number; dateKey: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return {
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday,
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export type TimingPhase = "beforeNoon" | "afterRaise" | "evening" | "night";

export function phaseAt(hour: number): TimingPhase {
  if (hour >= 6 && hour < 12) return "beforeNoon";
  if (hour >= 12 && hour < 17) return "afterRaise";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export interface HourPoint {
  /** Hours from now (0 = now). */
  inHours: number;
  /** Local clock hour 0–23. */
  hour: number;
  price: number;
}

export type Curve = (hour: number) => number;

/**
 * Expected price for each of the next `hours` hours, anchored at the current price:
 * expected(h) = now + curve(h) − curve(now).
 */
export function forecast(nowPrice: number, nowHour: number, curve: Curve, hours = 24): HourPoint[] {
  const base = curve(nowHour);
  return Array.from({ length: hours }, (_, i) => {
    const hour = (Math.floor(nowHour) + i) % 24;
    const at = i === 0 ? nowHour : hour + 0.5;
    return { inHours: i, hour, price: Math.round((nowPrice + (curve(at) - base) / 100) * 1000) / 1000 };
  });
}

/**
 * ADAC analysis of ~14,000 stations, May 2026: average gap between a day's highest
 * and lowest price. Used only as an upper bound for the 12:00 rise — we never show
 * a precise per-hour price, because the curve above is a schematic, not measured data.
 */
export const DAILY_SPREAD_CT: Record<Fuel, number> = { e10: 14.6, e5: 14.6, diesel: 18.4 };

/** The rule this feature rests on; set NEXT_PUBLIC_FUEL_TIMING=off to hide it if the rule changes. */
export const RULE_SINCE = "2026-04-01";
export const TIMING_ENABLED = process.env.NEXT_PUBLIC_FUEL_TIMING !== "off";

/** Longest wait we suggest during the day (hours). */
export const MAX_WAIT_HOURS = 8;

export type Trend = "lower" | "same" | "higher";

/** Direction of an expected change; within ±1 ct counts as "about the same". */
export function trendOf(deltaCt: number): Trend {
  if (deltaCt <= -1) return "lower";
  if (deltaCt >= 1) return "higher";
  return "same";
}

export interface Advice {
  phase: TimingPhase;
  /** When it is typically cheapest before the next 12:00 raise. */
  best: { hour: number; inHours: number };
  /**
   * Possible saving per litre (ct) by waiting until `best`, as a range [low, high];
   * null when the expected difference is under 1 ct.
   */
  waitRangeCt: [number, number] | null;
  /** Upper bound of the next 12:00 rise (ct/L), shown before noon. */
  noonMaxCt: number | null;
}

export function advise(nowPrice: number, nowHour: number, curve: Curve, fuel: Fuel = "e10"): Advice {
  const points = forecast(nowPrice, nowHour, curve, 24);
  const phase = phaseAt(Math.floor(nowHour));
  // Only look ahead until the next raise; after it the comparison is a new day.
  // During the day, waiting is only practical for a few hours, so cap the window;
  // at night "tomorrow morning" is the natural suggestion.
  const nextNoon = points.findIndex((p) => p.inHours > 0 && p.hour === RAISE_HOUR);
  const untilNoon = nextNoon > 0 ? points.slice(0, nextNoon) : points;
  const window = phase === "night" ? untilNoon : untilNoon.slice(0, MAX_WAIT_HOURS + 1);
  const best = window.reduce((a, b) => (b.price < a.price ? b : a), window[0]);
  const dropCt = (nowPrice - best.price) * 100;
  return {
    phase,
    best: { hour: best.hour, inHours: best.inHours },
    // The schematic can over- or understate; show half to the full modelled drop.
    waitRangeCt: dropCt >= 1 ? [Math.max(1, Math.round(dropCt * 0.5)), Math.max(1, Math.round(dropCt))] : null,
    noonMaxCt: phase === "beforeNoon" || phase === "night" ? Math.round(DAILY_SPREAD_CT[fuel]) : null,
  };
}

/* ---------- Learning from prices seen on this device ---------- */

export interface Observation {
  /** Epoch ms. */
  t: number;
  fuel: Fuel;
  /** Cheapest open price in the area at that time. */
  price: number;
  /** ~1 km grid cell, so moving around does not mix areas. */
  cell: string;
}

export const MIN_DAYS_FOR_LEARNING = 3;

/**
 * Per-hour median offset (ct) from each day's mean, using days with at least
 * 4 distinct observed hours. Returns null until `MIN_DAYS_FOR_LEARNING` such days
 * exist; hours never observed fall back to the typical curve.
 */
export function learnCurve(obs: Observation[], fuel: Fuel): { curve: Curve; days: number } | null {
  const byDay = new Map<string, Map<number, number[]>>();
  for (const o of obs) {
    if (o.fuel !== fuel) continue;
    const { hour, dateKey } = berlinClock(new Date(o.t));
    const day = byDay.get(dateKey) ?? byDay.set(dateKey, new Map()).get(dateKey)!;
    (day.get(hour) ?? day.set(hour, []).get(hour)!).push(o.price);
  }
  const residuals = new Map<number, number[]>();
  let days = 0;
  for (const hours of byDay.values()) {
    if (hours.size < 4) continue;
    days++;
    const hourly = [...hours.entries()].map(([h, ps]) => [h, ps.reduce((s, p) => s + p, 0) / ps.length] as const);
    // Remove the typical shape before averaging so a day observed only in the
    // morning does not look "cheap" overall.
    const level = hourly.reduce((s, [h, p]) => s + p * 100 - typicalOffsetCt(h + 0.5, fuel), 0) / hourly.length;
    for (const [h, p] of hourly) (residuals.get(h) ?? residuals.set(h, []).get(h)!).push(p * 100 - level);
  }
  if (days < MIN_DAYS_FOR_LEARNING) return null;
  const median = (xs: number[]) => {
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  const table = Array.from({ length: 24 }, (_, h) => {
    const r = residuals.get(h);
    return r && r.length >= 2 ? median(r) : typicalOffsetCt(h + 0.5, fuel);
  });
  return { curve: (hour: number) => table[((Math.floor(hour) % 24) + 24) % 24], days };
}

/**
 * How often the curve predicted the direction of real changes between two
 * observations on the same "price day" (no 12:00 in between). Changes under
 * 0.5 ct are ignored. Returns null with fewer than 8 usable pairs.
 */
export function directionHitRate(obs: Observation[], fuel: Fuel, curve: Curve): number | null {
  const list = obs.filter((o) => o.fuel === fuel).sort((a, b) => a.t - b.t);
  let hits = 0;
  let total = 0;
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1];
    const b = list[i];
    if (a.cell !== b.cell || b.t - a.t > 12 * 3_600_000) continue;
    const ca = berlinClock(new Date(a.t));
    const cb = berlinClock(new Date(b.t));
    const ha = ca.hour + ca.minute / 60;
    const hb = cb.hour + cb.minute / 60;
    const crossesNoon = ca.dateKey === cb.dateKey ? ha < RAISE_HOUR && hb >= RAISE_HOUR : hb >= RAISE_HOUR || ha < RAISE_HOUR;
    if (crossesNoon) continue;
    const actual = (b.price - a.price) * 100;
    if (Math.abs(actual) < 0.5) continue;
    const predicted = curve(hb) - curve(ha);
    total++;
    if (Math.sign(predicted) === Math.sign(actual)) hits++;
  }
  return total >= 8 ? Math.round((hits / total) * 100) : null;
}

/** Keep the last 14 days, at most one observation per fuel and cell every 20 minutes. */
export function addObservation(list: Observation[], o: Observation): Observation[] {
  const cutoff = o.t - 14 * 86_400_000;
  const recent = list.filter((x) => x.t >= cutoff);
  const dup = recent.some((x) => x.fuel === o.fuel && x.cell === o.cell && Math.abs(x.t - o.t) < 20 * 60_000);
  return dup ? recent : [...recent, o].slice(-1500);
}
