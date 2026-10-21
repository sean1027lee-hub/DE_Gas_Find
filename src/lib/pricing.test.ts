import { describe, expect, it } from "vitest";
import { DARMSTADT } from "./geo";
import {
  DEFAULT_DISCOUNT,
  discountFor,
  rankStations,
  roundPrice,
  savingsVsAverage,
  tierFor,
  tierThresholds,
  type RankOptions,
} from "./pricing";
import type { Station } from "./types";

function station(id: string, over: Partial<Station> & { km?: number } = {}): Station {
  const { km = 1, ...rest } = over;
  return {
    id,
    name: id,
    brand: "",
    brandGroup: null,
    street: "",
    houseNumber: "",
    postCode: "",
    place: "",
    // ~km north of Darmstadt
    lat: DARMSTADT.lat + km / 111.2,
    lng: DARMSTADT.lng,
    isOpen: true,
    prices: { e10: 1.749, e5: 1.809, diesel: 1.659 },
    ...rest,
  };
}

const opts: RankOptions = { fuel: "e10", rules: DEFAULT_DISCOUNT, origin: DARMSTADT, radiusKm: 10, sort: "price" };

describe("discount", () => {
  it("applies group discounts", () => {
    expect(discountFor("total", DEFAULT_DISCOUNT)).toBe(0.03);
    expect(discountFor("partner", DEFAULT_DISCOUNT)).toBe(0.02);
    expect(discountFor(null, DEFAULT_DISCOUNT)).toBe(0);
  });

  it("respects disabled rules and custom values", () => {
    expect(discountFor("total", { ...DEFAULT_DISCOUNT, enabled: false })).toBe(0);
    expect(discountFor("partner", { enabled: true, totalCt: 3, partnerCt: 2.5 })).toBe(0.025);
    expect(discountFor("total", { enabled: true, totalCt: -1, partnerCt: 0 })).toBe(0);
  });

  it("rounds to 0.1 ct", () => {
    expect(roundPrice(1.739 - 0.03)).toBe(1.709);
  });
});

describe("rankStations", () => {
  it("sorts open first, then expected price, then distance", () => {
    const result = rankStations(
      [
        station("closed-cheap", { isOpen: false, prices: { e10: 1.599, e5: null, diesel: null } }),
        station("shell", { km: 1, prices: { e10: 1.729, e5: null, diesel: null } }),
        station("total", { km: 3, brandGroup: "total", prices: { e10: 1.749, e5: null, diesel: null } }),
        station("near-same", { km: 0.5, prices: { e10: 1.719, e5: null, diesel: null } }),
        station("far-same", { km: 4, prices: { e10: 1.719, e5: null, diesel: null } }),
      ],
      opts,
    );
    expect(result.open.map((r) => r.station.id)).toEqual(["near-same", "total", "far-same", "shell"]);
    expect(result.closed.map((r) => r.station.id)).toEqual(["closed-cheap"]);
    expect(result.open.find((r) => r.station.id === "total")?.price).toBe(1.719);
    expect(result.cheapest?.station.id).toBe("near-same");
    expect(result.cheapest?.isCheapest).toBe(true);
  });

  it("card discount can make a pricier pump the cheapest", () => {
    const result = rankStations(
      [
        station("jet", { prices: { e10: 1.719, e5: null, diesel: null } }),
        station("total", { brandGroup: "total", prices: { e10: 1.739, e5: null, diesel: null } }),
      ],
      opts,
    );
    expect(result.cheapest?.station.id).toBe("total");
    expect(result.cheapest?.price).toBe(1.709);
    expect(result.cheapest?.pumpPrice).toBe(1.739);
    expect(result.open[1].diffToMin).toBe(0.01);
  });

  it("sorts by distance when requested, still open first", () => {
    const result = rankStations(
      [
        station("a", { km: 5, prices: { e10: 1.6, e5: null, diesel: null } }),
        station("b", { km: 1 }),
        station("c", { km: 0.2, isOpen: false }),
      ],
      { ...opts, sort: "distance" },
    );
    expect(result.open.map((r) => r.station.id)).toEqual(["b", "a"]);
    expect(result.cheapest?.station.id).toBe("a");
  });

  it("filters by radius and counts stations without a price", () => {
    const result = rankStations(
      [
        station("in", { km: 2 }),
        station("out", { km: 12 }),
        station("nodiesel", { km: 1, prices: { e10: 1.7, e5: 1.8, diesel: null } }),
      ],
      { ...opts, fuel: "diesel" },
    );
    expect(result.open.map((r) => r.station.id)).toEqual(["in"]);
    expect(result.withoutPrice).toBe(1);
  });

  it("handles an empty result", () => {
    const result = rankStations([], opts);
    expect(result).toEqual({ open: [], closed: [], withoutPrice: 0, cheapest: null, average: null });
  });

  it("assigns relative tiers", () => {
    const prices = [1.699, 1.709, 1.719, 1.729, 1.739, 1.749, 1.759, 1.769, 1.779];
    const result = rankStations(
      prices.map((p, i) => station(`s${i}`, { prices: { e10: p, e5: null, diesel: null } })),
      { ...opts, rules: { ...DEFAULT_DISCOUNT, enabled: false } },
    );
    const tiers = result.open.map((r) => r.tier);
    expect(tiers[0]).toBe("low");
    expect(tiers.at(-1)).toBe("high");
    expect(tiers).toContain("mid");
  });
});

describe("tiers", () => {
  it("returns no thresholds with fewer than 3 distinct prices", () => {
    expect(tierThresholds([1.7, 1.7, 1.8])).toBeNull();
    expect(tierFor(1.8, 1.7, null)).toBe("mid");
    expect(tierFor(1.7, 1.7, null)).toBe("low");
  });
});

describe("savings", () => {
  it("computes savings for a fill-up", () => {
    expect(savingsVsAverage(1.709, 1.751, 50)).toBe(2.1);
    expect(savingsVsAverage(1.8, 1.7, 50)).toBe(0);
  });
});
