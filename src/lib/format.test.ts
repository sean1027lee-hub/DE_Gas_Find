import { describe, expect, it } from "vitest";
import { formatCt, formatCtDiff, formatDistance, formatEuro, priceParts, priceString, tidyCase } from "./format";

describe("priceParts", () => {
  it.each([
    [1.739, "1,73", "9"],
    [1.709, "1,70", "9"],
    [2.0, "2,00", "0"],
    [1.7, "1,70", "0"],
    [0.999, "0,99", "9"],
    [1.7089999999, "1,70", "9"],
    [1.6990000001, "1,69", "9"],
  ])("%d → %s + sup %s", (price, main, sup) => {
    expect(priceParts(price)).toEqual({ main, sup });
  });

  it("joins into a plain string", () => {
    expect(priceString(1.739)).toBe("1,739");
  });
});

describe("cent formatting", () => {
  it("formats differences with sign", () => {
    expect(formatCtDiff(0.02)).toBe("+2ct");
    expect(formatCtDiff(0.025)).toBe("+2,5ct");
    expect(formatCtDiff(0)).toBe("±0ct");
    expect(formatCtDiff(-0.03)).toBe("−3ct");
    expect(formatCtDiff(0.0199999)).toBe("+2ct");
  });

  it("formats absolute cents", () => {
    expect(formatCt(0.03)).toBe("3ct");
    expect(formatCt(0.015)).toBe("1,5ct");
  });
});

describe("other formats", () => {
  it("distance", () => {
    expect(formatDistance(0.234)).toBe("230 m");
    expect(formatDistance(0.001)).toBe("10 m");
    expect(formatDistance(1.234)).toBe("1,2 km");
    expect(formatDistance(9.96)).toBe("10,0 km");
    expect(formatDistance(12.6)).toBe("13 km");
  });

  it("euro", () => {
    expect(formatEuro(2.1)).toBe("2,10 €");
  });

  it("tidyCase only touches all-caps text", () => {
    expect(tidyCase("DARMSTADT")).toBe("Darmstadt");
    expect(tidyCase("OBER-RAMSTADT")).toBe("Ober-Ramstadt");
    expect(tidyCase("HEIDELBERGER STR.")).toBe("Heidelberger Str.");
    expect(tidyCase("Groß-Gerau")).toBe("Groß-Gerau");
    expect(tidyCase("123")).toBe("123");
  });
});

describe("benchmark formats", async () => {
  const { formatLitrePrice, formatIsoDate, formatMonthDay } = await import("./format");
  it("formats per-litre prices and dates", () => {
    expect(formatLitrePrice(2.214)).toBe("2,214 €");
    expect(formatLitrePrice(1.5)).toBe("1,500 €");
    expect(formatIsoDate("2026-10-12")).toBe("2026.10.12");
    expect(formatMonthDay("2026-03-02")).toBe("3월 2일");
    expect(formatMonthDay("2026-03-02", "de")).toBe("2. März");
    expect(formatMonthDay("2026-10-12", "en")).toBe("12 Oct");
  });
});

describe("formatEuroRange", async () => {
  const { formatEuroRange } = await import("./format");
  it("rounds to 0,50 € and merges equal ends", () => {
    expect(formatEuroRange(1.37, 2.81)).toBe("1,50–3,00 €");
    expect(formatEuroRange(2.1, 2.2)).toBe("2,00 €");
    expect(formatEuroRange(0.1, 0.3)).toBe("0,50 €");
  });
});
