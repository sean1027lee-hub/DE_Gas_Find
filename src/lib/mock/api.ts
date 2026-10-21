/**
 * Mock transport: answers list.php / prices.php / detail.php with JSON shaped
 * exactly like Tankerkönig's, so mock data goes through the same Zod parsers,
 * cache and error handling as live data.
 */
import { distanceKm, type LatLng } from "../geo";
import { UpstreamError } from "../tankerkoenig";
import { isOpenAt, simulatePrice } from "./simulate";
import { MOCK_CENTER, MOCK_STATIONS, OPENING_TIMES, type MockStation } from "./stations";

const LICENSE = "CC BY 4.0 -  https://creativecommons.tankerkoenig.de";

/** Scenarios for previewing UI states (mock mode only). */
export type MockScenario = "empty" | "error" | "loading" | "night";

export interface MockOptions {
  now: Date;
  scenario?: MockScenario | null;
}

/**
 * Place the sample stations around the requested point when it is far from
 * Darmstadt, so mock mode works wherever the app is opened.
 */
function positioned(center: LatLng): { station: MockStation; lat: number; lng: number }[] {
  const shift = distanceKm(center, MOCK_CENTER) > 30;
  const origin = shift ? center : MOCK_CENTER;
  return MOCK_STATIONS.map((station) => {
    const [east, north] = station.km;
    const lat = origin.lat + north / 111.32;
    const lng = origin.lng + east / (111.32 * Math.cos((origin.lat * Math.PI) / 180));
    return { station, lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
  });
}

const priceOrFalse = (v: number | null) => (v === null ? false : v);

function rawPrices(s: MockStation, now: Date) {
  return {
    e5: priceOrFalse(simulatePrice(s, "e5", now)),
    e10: priceOrFalse(simulatePrice(s, "e10", now)),
    diesel: priceOrFalse(simulatePrice(s, "diesel", now)),
  };
}

export function mockListResponse(center: LatLng, radiusKm: number, opts: MockOptions): unknown {
  if (opts.scenario === "error") throw new UpstreamError("Mock scenario: upstream error", 502);
  const stations =
    opts.scenario === "empty"
      ? []
      : positioned(center)
          .map(({ station, lat, lng }) => ({ station, lat, lng, dist: distanceKm(center, { lat, lng }) }))
          .filter((x) => x.dist <= radiusKm)
          .sort((a, b) => a.dist - b.dist)
          .map(({ station: s, lat, lng, dist }) => ({
            id: s.id,
            name: s.name,
            brand: s.brand,
            street: s.street,
            place: s.place,
            lat,
            lng,
            dist: Math.round(dist * 10) / 10,
            ...rawPrices(s, opts.now),
            isOpen: isOpenAt(s, opts.now),
            houseNumber: s.houseNumber,
            postCode: s.postCode,
          }));
  return { ok: true, license: LICENSE, data: "MTS-K", status: "ok", stations };
}

export function mockPricesResponse(ids: string[], opts: MockOptions): unknown {
  if (opts.scenario === "error") throw new UpstreamError("Mock scenario: upstream error", 502);
  const prices: Record<string, unknown> = {};
  for (const id of ids) {
    const s = MOCK_STATIONS.find((x) => x.id === id);
    if (!s) prices[id] = { status: "not found" };
    else if (!isOpenAt(s, opts.now)) prices[id] = { status: "closed" };
    else prices[id] = { status: "open", ...rawPrices(s, opts.now) };
  }
  return { ok: true, license: LICENSE, data: "MTS-K", prices };
}

export function mockDetailResponse(id: string, opts: MockOptions): unknown {
  const s = MOCK_STATIONS.find((x) => x.id === id);
  if (!s) return { ok: false, message: "Tankstelle nicht gefunden" };
  const [placed] = positioned(MOCK_CENTER).filter((p) => p.station.id === id);
  return {
    ok: true,
    license: LICENSE,
    data: "MTS-K",
    status: "ok",
    station: {
      id: s.id,
      name: s.name,
      brand: s.brand,
      street: s.street,
      houseNumber: s.houseNumber,
      postCode: s.postCode,
      place: s.place,
      openingTimes: OPENING_TIMES[s.hours],
      overrides: [],
      wholeDay: s.hours === "h24",
      isOpen: isOpenAt(s, opts.now),
      ...rawPrices(s, opts.now),
      lat: placed.lat,
      lng: placed.lng,
      state: null,
    },
  };
}
