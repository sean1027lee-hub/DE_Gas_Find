import { describe, expect, it } from "vitest";
import { DARMSTADT } from "./geo";
import { rankStations, roundPrice, savingsFor, tierFor, tierThresholds, type RankOptions } from "./pricing";
import type { Station } from "./types";

function station(id: string, over: Partial<Station> & { km?: number } = {}): Station {
  const { km = 1, ...rest } = over;
  return {
    id,
    name: id,
    brand: "",
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

const e10 = (p: number) => ({ e10: p, e5: null, diesel: null });
const opts: RankOptions = { fuel: "e10", origin: DARMSTADT, radiusKm: 10, sort: "price" };

describe("rankStations", () => {
  it("sorts open first, then price, then distance", () => {
    const result = rankStations(
      [
        station("closed-cheap", { isOpen: false, prices: e10(1.599) }),
        station("shell", { km: 1, prices: e10(1.729) }),
        station("mid", { km: 3, prices: e10(1.719) }),
        station("near-same", { km: 0.5, prices: e10(1.709) }),
        station("far-same", { km: 4, prices: e10(1.709) }),
      ],
      opts,
    );
    expect(result.open.map((r) => r.station.id)).toEqual(["near-same", "far-same", "mid", "shell"]);
    expect(result.closed.map((r) => r.station.id)).toEqual(["closed-cheap"]);
    expect(result.cheapest?.station.id).toBe("near-same");
    expect(result.cheapest?.isCheapest).toBe(true);
    expect(result.open[2].diffToMin).toBe(0.01);
  });

  it("sorts by distance when requested, still open first", () => {
    const result = rankStations(
      [station("a", { km: 5, prices: e10(1.6) }), station("b", { km: 1 }), station("c", { km: 0.2, isOpen: false })],
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
    expect(rankStations([], opts)).toEqual({ open: [], closed: [], withoutPrice: 0, cheapest: null, average: null });
  });

  it("assigns relative tiers", () => {
    const prices = [1.699, 1.709, 1.719, 1.729, 1.739, 1.749, 1.759, 1.769, 1.779];
    const result = rankStations(
      prices.map((p, i) => station(`s${i}`, { prices: e10(p) })),
      opts,
    );
    const tiers = result.open.map((r) => r.tier);
    expect(tiers[0]).toBe("low");
    expect(tiers.at(-1)).toBe("high");
    expect(tiers).toContain("mid");
  });
});

describe("helpers", () => {
  it("rounds to 0.1 ct", () => {
    expect(roundPrice(1.739 - 0.03)).toBe(1.709);
  });

  it("returns no thresholds with fewer than 3 distinct prices", () => {
    expect(tierThresholds([1.7, 1.7, 1.8])).toBeNull();
    expect(tierFor(1.8, 1.7, null)).toBe("mid");
    expect(tierFor(1.7, 1.7, null)).toBe("low");
  });

  it("computes savings for a fill-up", () => {
    expect(savingsFor(1.709, 1.751, 50)).toBe(2.1);
    expect(savingsFor(1.8, 1.7, 50)).toBe(0);
  });
});
