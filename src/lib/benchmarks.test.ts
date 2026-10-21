import { describe, expect, it } from "vitest";
import data from "@/data/benchmarks.json";
import {
  benchmarkFuel,
  germanyRank,
  rankCountries,
  seriesOf,
  taxShare,
  verdictFor,
  windowOf,
  windowStats,
  yearlySummary,
  type Benchmarks,
  type Point,
} from "./benchmarks";

const weekly = (start: string, prices: number[]): Point[] =>
  prices.map((price, i) => {
    const d = new Date(`${start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return { date: d.toISOString().slice(0, 10), price };
  });

describe("windowStats", () => {
  // 2 years of weekly prices rising 1.50 → ~1.71, last week jumps to 2.00.
  const series = weekly("2024-01-01", [...Array.from({ length: 104 }, (_, i) => 1.5 + i * 0.002), 2.0]);

  it("averages, extremes and percentile over the window", () => {
    const s = windowStats(series, 1)!;
    expect(s.latest.price).toBe(2.0);
    expect(s.max.price).toBe(2.0);
    expect(s.percentile).toBe(100);
    expect(s.min.price).toBeGreaterThan(1.5);
    expect(s.average).toBeGreaterThan(1.6);
    expect(s.average).toBeLessThan(1.72);
  });

  it("finds the value one year earlier", () => {
    const s = windowStats(series, 3)!;
    expect(s.yearAgo).not.toBeNull();
    // Latest week is 2025-12-29 → closest week on or before 2024-12-29.
    expect(s.yearAgo!.date).toBe("2024-12-23");
    expect(s.yearAgo!.price).toBeCloseTo(1.5 + 51 * 0.002, 3);
  });

  it("returns null without enough data", () => {
    expect(windowStats([], 3)).toBeNull();
    expect(windowStats(weekly("2025-01-06", [1.7]), 3)).toBeNull();
  });

  it("limits the window by years", () => {
    expect(windowOf(series, 1).length).toBe(53);
  });
});

describe("verdict", () => {
  it("splits at the quartiles", () => {
    expect(verdictFor(0)).toBe("low");
    expect(verdictFor(25)).toBe("low");
    expect(verdictFor(50)).toBe("mid");
    expect(verdictFor(75)).toBe("high");
  });
});

describe("yearlySummary", () => {
  it("groups by calendar year, newest first", () => {
    const y = yearlySummary([...weekly("2024-12-16", [1.6, 1.8, 2.0]), ...weekly("2025-01-06", [1.7])]);
    expect(y.map((r) => r.year)).toEqual([2025, 2024]);
    expect(y[1].average).toBeCloseTo(1.8 * 1, 5);
    expect(y[1].weeks).toBe(3);
  });
});

describe("fuel mapping", () => {
  it("maps E5/E10 to Super 95", () => {
    expect(benchmarkFuel("e10")).toBe("euro95");
    expect(benchmarkFuel("e5")).toBe("euro95");
    expect(benchmarkFuel("diesel")).toBe("diesel");
  });
});

// The bundled file is produced by scripts/update-benchmarks.mjs in CI — check its shape.
describe("bundled benchmarks.json", () => {
  const b = data as unknown as Benchmarks;

  it("has a plausible, aligned German series", () => {
    expect(b.germany.dates.length).toBeGreaterThan(150);
    expect(b.germany.euro95).toHaveLength(b.germany.dates.length);
    expect(b.germany.dates.at(-1)).toBe(b.latestDate);
    for (const p of seriesOf(b, "euro95")) {
      expect(p.price).toBeGreaterThan(0.5);
      expect(p.price).toBeLessThan(4);
    }
  });

  it("ranks Germany among EU countries", () => {
    const rank = germanyRank(b, "euro95")!;
    expect(rank.of).toBeGreaterThanOrEqual(20);
    expect(rank.rank).toBeGreaterThanOrEqual(1);
    const ranked = rankCountries(b, "diesel", ["FR", "PL"]);
    expect(ranked.map((c) => c.code).sort()).toEqual(["DE", "FR", "PL"]);
    expect(ranked.find((c) => c.isGermany)!.diffToGermany).toBe(0);
  });

  it("computes the tax share", () => {
    const t = taxShare(b, "euro95")!;
    expect(t.share).toBeGreaterThan(20);
    expect(t.share).toBeLessThan(80);
    expect(t.net + t.tax).toBeCloseTo(t.total, 3);
  });
});
