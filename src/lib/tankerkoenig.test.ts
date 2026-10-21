import { describe, expect, it } from "vitest";
import { parseDetailResponse, parseListResponse, parsePricesResponse, UpstreamError } from "./tankerkoenig";

const listPayload = {
  ok: true,
  license: "CC BY 4.0 -  https://creativecommons.tankerkoenig.de",
  data: "MTS-K",
  status: "ok",
  stations: [
    {
      id: "51d4b55e-a095-1aa0-e100-80009459e03a",
      name: "TotalEnergies Darmstadt",
      brand: "TOTAL",
      street: "Heidelberger Str.",
      place: "DARMSTADT",
      lat: 49.86,
      lng: 8.64,
      dist: 1.4,
      diesel: 1.659,
      e5: 1.809,
      e10: 1.749,
      isOpen: true,
      houseNumber: "51",
      postCode: 4283,
    },
    {
      id: "005056ba-7cb6-1ed2-bceb-82ea369c0d2d",
      name: "Autohof",
      brand: "",
      street: "Weg",
      place: "Griesheim",
      lat: 49.86,
      lng: 8.56,
      dist: 6.1,
      diesel: 1.629,
      e5: false,
      e10: null,
      isOpen: false,
      houseNumber: null,
      postCode: 64347,
    },
    { id: "broken", lat: "not a number" },
  ],
};

describe("parseListResponse", () => {
  it("normalises stations and drops invalid rows", () => {
    const stations = parseListResponse(listPayload);
    expect(stations).toHaveLength(2);
    expect(stations[0]).toMatchObject({
      brand: "TotalEnergies",
      brandGroup: "total",
      postCode: "04283",
      houseNumber: "51",
      prices: { e10: 1.749, e5: 1.809, diesel: 1.659 },
    });
    expect(stations[1].prices).toEqual({ e10: null, e5: null, diesel: 1.629 });
    expect(stations[1].houseNumber).toBe("");
    expect(stations[1].isOpen).toBe(false);
  });

  it("throws UpstreamError on ok:false", () => {
    expect(() => parseListResponse({ ok: false, message: "apikey nicht angegeben" })).toThrow(UpstreamError);
  });
});

describe("parsePricesResponse", () => {
  it("handles open, closed and no-price stations", () => {
    const prices = parsePricesResponse({
      ok: true,
      license: "CC BY 4.0",
      data: "MTS-K",
      prices: {
        a: { status: "open", e5: 1.809, e10: 1.749, diesel: false },
        b: { status: "closed" },
        c: { status: "no prices" },
        d: { status: "weird" },
      },
    });
    expect(prices.a).toEqual({ status: "open", prices: { e5: 1.809, e10: 1.749, diesel: null } });
    expect(prices.b).toEqual({ status: "closed", prices: { e5: null, e10: null, diesel: null } });
    expect(prices.c.status).toBe("no prices");
    expect(prices.d.status).toBe("no prices");
  });
});

describe("parseDetailResponse", () => {
  it("parses opening times and defaults missing arrays", () => {
    const detail = parseDetailResponse({
      ok: true,
      station: {
        id: "x",
        openingTimes: [{ text: "Mo-Fr", start: "06:00:00", end: "22:00:00" }],
        overrides: null,
        wholeDay: false,
        isOpen: true,
      },
    });
    expect(detail.openingTimes).toHaveLength(1);
    expect(detail.overrides).toEqual([]);
  });
});
