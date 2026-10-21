/**
 * Geocoding via OpenStreetMap Nominatim (server only).
 * Usage policy: ≤ 1 request/second, identifying User-Agent, no search-as-you-type.
 * https://operations.osmfoundation.org/policies/nominatim/
 */
import { z } from "zod";
import type { GeocodeResult } from "./types";

const BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Tankpreis-PWA/0.1 (+https://github.com/sean1027lee-hub/DE_Gas_Find)";

const addressSchema = z
  .object({
    postcode: z.string().optional(),
    city: z.string().optional(),
    town: z.string().optional(),
    village: z.string().optional(),
    municipality: z.string().optional(),
    suburb: z.string().optional(),
    city_district: z.string().optional(),
    road: z.string().optional(),
    house_number: z.string().optional(),
    state: z.string().optional(),
  })
  .partial()
  .optional();

const placeSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  name: z.string().optional(),
  display_name: z.string(),
  address: addressSchema,
});

type Place = z.infer<typeof placeSchema>;

let lastCall = 0;
async function throttle() {
  const wait = lastCall + 1100 - Date.now();
  lastCall = Math.max(Date.now(), lastCall + 1100);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

async function call(path: string, params: Record<string, string>): Promise<unknown> {
  await throttle();
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries({ format: "jsonv2", addressdetails: "1", "accept-language": "de", ...params })) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  return res.json();
}

function locality(a: NonNullable<Place["address"]>): string {
  return a.city ?? a.town ?? a.village ?? a.municipality ?? "";
}

export function toResult(p: Place): GeocodeResult {
  const a = p.address ?? {};
  const city = locality(a);
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const label = p.name && p.name !== city ? p.name : street || city || p.display_name.split(",")[0];
  const sublabel = [a.postcode, city !== label ? city : a.state].filter(Boolean).join(" ");
  return { label, sublabel, lat: Number(p.lat), lng: Number(p.lon) };
}

export async function searchPlaces(query: string): Promise<GeocodeResult[]> {
  const json = await call("search", { q: query, countrycodes: "de", limit: "6" });
  const places = z.array(placeSchema).parse(json);
  const seen = new Set<string>();
  return places.map(toResult).filter((r) => {
    const key = `${r.label}|${r.sublabel}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Short neighbourhood label for a coordinate, e.g. "Darmstadt-Bessungen". */
export async function reverseLabel(lat: number, lng: number): Promise<string | null> {
  const json = await call("reverse", { lat: String(lat), lon: String(lng), zoom: "14" });
  const p = placeSchema.safeParse(json);
  if (!p.success) return null;
  const a = p.data.address ?? {};
  const city = locality(a);
  const part = a.suburb ?? a.city_district;
  if (city && part && part !== city) return `${city}-${part}`;
  return city || part || null;
}

/** Offline list for mock mode / E2E. */
const MOCK_PLACES: GeocodeResult[] = [
  { label: "Darmstadt", sublabel: "64283 Hessen", lat: 49.8728, lng: 8.6512 },
  { label: "Frankfurt am Main", sublabel: "60311 Hessen", lat: 50.1109, lng: 8.6821 },
  { label: "Mainz", sublabel: "55116 Rheinland-Pfalz", lat: 49.9929, lng: 8.2473 },
  { label: "Heidelberg", sublabel: "69117 Baden-Württemberg", lat: 49.4094, lng: 8.6947 },
  { label: "Wiesbaden", sublabel: "65183 Hessen", lat: 50.0782, lng: 8.2398 },
  { label: "Griesheim", sublabel: "64347 Darmstadt-Dieburg", lat: 49.8634, lng: 8.5638 },
];

export function mockSearch(query: string): GeocodeResult[] {
  const q = query.toLowerCase();
  return MOCK_PLACES.filter((p) => p.label.toLowerCase().includes(q) || p.sublabel.startsWith(q));
}
