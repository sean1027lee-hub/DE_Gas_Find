import { describe, expect, it } from "vitest";
import { parseDetailResponse, parseListResponse, parsePricesResponse, UpstreamError } from "../tankerkoenig";
import { mockDetailResponse, mockListResponse, mockPricesResponse } from "./api";
import { isOpenAt, simulatePrice } from "./simulate";
import { MOCK_CENTER, MOCK_STATIONS } from "./stations";

// 2026-10-21 is a Wednesday; Berlin is UTC+2.
const berlin = (hhmm: string, day = 21) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(2026, 9, day, h - 2, m));
};

describe("mock list.php", () => {
  it("has Tankerkönig's raw shape and passes the real parser", () => {
    const raw = mockListResponse(MOCK_CENTER, 25, { now: berlin("10:00") }) as {
      ok: boolean;
      license: string;
      stations: Record<string, unknown>[];
    };
    expect(raw.ok).toBe(true);
    expect(raw.license).toMatch(/CC BY 4.0/);
    expect(raw.stations).toHaveLength(25);
    const first = raw.stations[0];
    for (const key of ["id", "name", "brand", "street", "place", "lat", "lng", "dist", "e5", "e10", "diesel", "isOpen", "houseNumber", "postCode"]) {
      expect(first).toHaveProperty(key);
    }
    expect(typeof first.postCode).toBe("number");
    const stations = parseListResponse(raw);
    expect(stations).toHaveLength(25);
    // Fuels not sold come through as null.
    expect(stations.find((s) => s.name.startsWith("Freie"))!.prices.e5).toBeNull();
    expect(stations.find((s) => s.name.includes("Groß-Zimmern"))!.prices.diesel).toBeNull();
  });

  it("filters by radius and sorts by distance", () => {
    const raw = mockListResponse(MOCK_CENTER, 5, { now: berlin("10:00") }) as { stations: { dist: number }[] };
    expect(raw.stations.length).toBeGreaterThan(8);
    expect(raw.stations.length).toBeLessThan(25);
    const d = raw.stations.map((s) => s.dist);
    expect(d).toEqual([...d].sort((a, b) => a - b));
  });

  it("follows the user when far from Darmstadt", () => {
    const berlinCity = { lat: 52.52, lng: 13.405 };
    const raw = mockListResponse(berlinCity, 10, { now: berlin("10:00") }) as { stations: unknown[] };
    expect(raw.stations.length).toBeGreaterThan(5);
  });

  it("supports empty and error scenarios", () => {
    expect((mockListResponse(MOCK_CENTER, 25, { now: berlin("10:00"), scenario: "empty" }) as { stations: unknown[] }).stations).toEqual([]);
    expect(() => mockListResponse(MOCK_CENTER, 25, { now: berlin("10:00"), scenario: "error" })).toThrow(UpstreamError);
  });
});

describe("price simulation", () => {
  const aral = MOCK_STATIONS[0];

  it("produces pump prices ending in 9", () => {
    const p = simulatePrice(aral, "e10", berlin("09:13"))!;
    expect(Math.round(p * 1000) % 10).toBe(9);
    expect(p).toBeGreaterThan(1);
    expect(p).toBeLessThan(3.5);
  });

  it("is deterministic", () => {
    expect(simulatePrice(aral, "diesel", berlin("15:40"))).toBe(simulatePrice(aral, "diesel", berlin("15:40")));
  });

  it("only raises at 12:00, then cuts until 11:59", () => {
    for (const s of MOCK_STATIONS) {
      let prev = Infinity;
      for (let m = 0; m < 24 * 60; m += 10) {
        const t = new Date(berlin("12:00").getTime() + m * 60_000);
        const p = simulatePrice(s, "e10", t)!;
        if (p === null) continue;
        expect(p).toBeLessThanOrEqual(prev);
        prev = p;
      }
      const before = simulatePrice(s, "e10", berlin("11:55"))!;
      const after = simulatePrice(s, "e10", berlin("12:00"))!;
      expect(after).toBeGreaterThan(before);
    }
  });

  it("makes the motorway station clearly the most expensive", () => {
    const now = berlin("16:00");
    const prices = MOCK_STATIONS.map((s) => simulatePrice(s, "e10", now)!);
    const motorway = simulatePrice(MOCK_STATIONS.find((s) => s.name.includes("A5"))!, "e10", now)!;
    expect(motorway).toBe(Math.max(...prices));
  });

  it("closes stations according to their hours", () => {
    const std = MOCK_STATIONS.find((s) => s.hours === "std")!;
    const h24 = MOCK_STATIONS.find((s) => s.hours === "h24")!;
    const short = MOCK_STATIONS.find((s) => s.hours === "short")!;
    expect(isOpenAt(std, berlin("23:30"))).toBe(false);
    expect(isOpenAt(h24, berlin("23:30"))).toBe(true);
    expect(isOpenAt(std, berlin("10:00"))).toBe(true);
    expect(isOpenAt(short, berlin("10:00", 25))).toBe(false); // Sunday
  });
});

describe("mock prices.php and detail.php", () => {
  it("returns statuses the parser understands", () => {
    const ids = [MOCK_STATIONS[0].id, MOCK_STATIONS[1].id, "00000000-0000-4000-8000-000000000000"];
    const parsed = parsePricesResponse(mockPricesResponse(ids, { now: berlin("23:30") }));
    expect(parsed[MOCK_STATIONS[0].id].status).toBe("open");
    expect(parsed[MOCK_STATIONS[1].id].status).toBe("closed");
    expect(parsed["00000000-0000-4000-8000-000000000000"].status).toBe("not found");
  });

  it("detail has opening hours", () => {
    const d = parseDetailResponse(mockDetailResponse(MOCK_STATIONS[1].id, { now: berlin("10:00") }));
    expect(d.wholeDay).toBe(false);
    expect(d.openingTimes.length).toBeGreaterThan(0);
    expect(() => parseDetailResponse(mockDetailResponse("nope", { now: berlin("10:00") }))).toThrow(UpstreamError);
  });
});
