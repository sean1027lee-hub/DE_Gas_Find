/**
 * Deterministic sample data for development and E2E tests (TANKERKOENIG_MOCK=1).
 * The UI shows a "샘플 데이터" banner whenever this source is used.
 */
import { resolveBrand } from "./brands";
import type { LatLng } from "./geo";
import type { FuelPrices, PriceUpdate, Station, StationDetail } from "./types";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function uuidFrom(rand: () => number): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(rand() * 16).toString(16)).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const BRANDS = [
  "TotalEnergies", "Aral", "Shell", "ESSO", "JET", "AVIA", "Westfalen", "bft", "Raiffeisen", "Agip", "STAR", "HEM", "",
];
const STREETS = [
  "Heidelberger Straße", "Frankfurter Landstraße", "Rheinstraße", "Pfungstädter Straße", "Dieburger Straße",
  "Kasinostraße", "Landwehrstraße", "Odenwaldring", "Mainzer Straße", "Bensheimer Straße", "Nieder-Ramstädter Straße",
  "Am Kavalleriesand", "Groß-Gerauer Weg", "Eschollbrücker Straße", "Otto-Röhm-Straße",
];
const PLACES = [
  ["64283", "Darmstadt"], ["64289", "Darmstadt"], ["64293", "Darmstadt"], ["64295", "Darmstadt"],
  ["64297", "Darmstadt"], ["64319", "Pfungstadt"], ["64331", "Weiterstadt"], ["64347", "Griesheim"],
  ["64367", "Mühltal"], ["64372", "Ober-Ramstadt"], ["64390", "Erzhausen"], ["64807", "Dieburg"],
] as const;

const registry = new Map<string, Station>();

function priceFrom(base: number, rand: () => number, spread: number): number {
  // Pump prices end in 9 tenths of a cent.
  const cents = Math.round((base + (rand() - 0.5) * spread) * 100);
  return (cents + 0.9) / 100;
}

export function mockStations(center: LatLng, radiusKm: number): Station[] {
  const rand = mulberry32(hash(`${center.lat.toFixed(2)},${center.lng.toFixed(2)}`));
  const count = 42;
  const stations: Station[] = [];
  for (let i = 0; i < count; i++) {
    // Denser near the centre, like a real city.
    const r = Math.min(radiusKm, 25) * Math.pow(rand(), 1.6);
    const angle = rand() * Math.PI * 2;
    const lat = center.lat + (r / 111.32) * Math.cos(angle);
    const lng = center.lng + (r / (111.32 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle);
    const rawBrand = BRANDS[Math.floor(rand() * BRANDS.length)];
    const { label } = resolveBrand(rawBrand);
    const [postCode, place] = PLACES[Math.floor(rand() * PLACES.length)];
    const street = STREETS[Math.floor(rand() * STREETS.length)];
    const premium = label === "Shell" || label === "Aral" ? 0.04 : label === "JET" || label === "bft" ? -0.03 : 0;
    const e10 = priceFrom(1.709 + premium, rand, 0.14);
    const noDiesel = rand() < 0.08;
    const noE10 = rand() < 0.05;
    const station: Station = {
      id: uuidFrom(rand),
      name: label ? `${label} ${place} ${street.split(" ")[0]}` : `Freie Tankstelle ${place}`,
      brand: label,
      street,
      houseNumber: String(1 + Math.floor(rand() * 180)),
      postCode,
      place,
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
      isOpen: rand() > 0.14,
      prices: {
        e10: noE10 ? null : e10,
        e5: Math.round((e10 + 0.06) * 1000) / 1000,
        diesel: noDiesel ? null : priceFrom(1.619 + premium, rand, 0.16),
      },
    };
    registry.set(station.id, station);
    stations.push(station);
  }
  return stations;
}

export function mockPrices(ids: string[]): Record<string, PriceUpdate> {
  const out: Record<string, PriceUpdate> = {};
  for (const id of ids) {
    const s = registry.get(id);
    if (s) {
      out[id] = { status: s.isOpen ? "open" : "closed", prices: s.prices };
      continue;
    }
    const rand = mulberry32(hash(id));
    const e10 = priceFrom(1.709, rand, 0.14);
    const prices: FuelPrices = { e10, e5: Math.round((e10 + 0.06) * 1000) / 1000, diesel: priceFrom(1.619, rand, 0.16) };
    out[id] = { status: "open", prices };
  }
  return out;
}

export function mockDetail(id: string): StationDetail {
  const s = registry.get(id);
  const rand = mulberry32(hash(id));
  const wholeDay = rand() < 0.3;
  return {
    id,
    wholeDay,
    isOpen: s?.isOpen ?? true,
    overrides: [],
    openingTimes: wholeDay
      ? []
      : [
          { text: "Mo-Fr", start: "06:00:00", end: "22:00:00" },
          { text: "Samstag", start: "07:00:00", end: "22:00:00" },
          { text: "Sonntag, Feiertag", start: "08:00:00", end: "21:00:00" },
        ],
  };
}
