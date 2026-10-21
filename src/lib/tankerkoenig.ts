/**
 * Tankerkönig API client (server only) — https://creativecommons.tankerkoenig.de
 * Prices: MTS-K via Tankerkönig, licensed CC BY 4.0.
 *
 * Response shapes follow the public documentation. Prices may be a number, `null`
 * or `false` (fuel not sold / not reported); all of those normalise to `null`.
 */
import { z } from "zod";
import { resolveBrand } from "./brands";
import type { FuelPrices, OpeningTime, PriceStatus, PriceUpdate, Station, StationDetail } from "./types";

const API_BASE = "https://creativecommons.tankerkoenig.de/json";
const TIMEOUT_MS = 7000;

/** number > 0 → number; anything else (null, false, 0, missing) → null */
const priceSchema = z
  .union([z.number(), z.literal(false), z.null()])
  .optional()
  .transform((v) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null));

const textSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => (v === null || v === undefined ? "" : String(v).trim()));

const postCodeSchema = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return "";
    const s = String(v).trim();
    return /^\d{1,5}$/.test(s) ? s.padStart(5, "0") : s;
  });

export const listStationSchema = z.object({
  id: z.string(),
  name: textSchema,
  brand: textSchema,
  street: textSchema,
  houseNumber: textSchema,
  postCode: postCodeSchema,
  place: textSchema,
  lat: z.number(),
  lng: z.number(),
  dist: z.number().optional(),
  isOpen: z.boolean().optional().default(false),
  e5: priceSchema,
  e10: priceSchema,
  diesel: priceSchema,
});

export const listResponseSchema = z.object({
  ok: z.literal(true),
  stations: z.array(z.unknown()),
});

export const pricesResponseSchema = z.object({
  ok: z.literal(true),
  prices: z.record(
    z.string(),
    z.object({
      status: z.string(),
      e5: priceSchema,
      e10: priceSchema,
      diesel: priceSchema,
    }),
  ),
});

const openingTimeSchema = z.object({
  text: textSchema,
  start: textSchema,
  end: textSchema,
});

export const detailResponseSchema = z.object({
  ok: z.literal(true),
  station: z.object({
    id: z.string(),
    openingTimes: z.array(openingTimeSchema).nullish().transform((v) => v ?? []),
    overrides: z.array(z.string()).nullish().transform((v) => v ?? []),
    wholeDay: z.boolean().nullish().transform((v) => v ?? false),
    isOpen: z.boolean().nullish().transform((v) => v ?? false),
  }),
});

const errorResponseSchema = z.object({ ok: z.literal(false), message: z.string().optional() });

export class UpstreamError extends Error {
  constructor(message: string, readonly status = 502) {
    super(message);
    this.name = "UpstreamError";
  }
}

export type ListStation = z.infer<typeof listStationSchema>;

export function normalizeStation(s: ListStation): Station {
  const { label, group } = resolveBrand(s.brand, s.name);
  return {
    id: s.id,
    name: s.name || label || "Tankstelle",
    brand: label,
    brandGroup: group,
    street: s.street,
    houseNumber: s.houseNumber,
    postCode: s.postCode,
    place: s.place,
    lat: s.lat,
    lng: s.lng,
    isOpen: s.isOpen,
    prices: { e5: s.e5, e10: s.e10, diesel: s.diesel },
  };
}

/**
 * Parse a list.php payload. Invalid individual stations are dropped instead of
 * failing the whole response — one malformed row should not blank the screen.
 */
export function parseListResponse(json: unknown): Station[] {
  const err = errorResponseSchema.safeParse(json);
  if (err.success) throw new UpstreamError(err.data.message ?? "Tankerkönig error");
  const parsed = listResponseSchema.safeParse(json);
  if (!parsed.success) throw new UpstreamError("Unexpected list response");
  const stations: Station[] = [];
  for (const raw of parsed.data.stations) {
    const s = listStationSchema.safeParse(raw);
    if (s.success) stations.push(normalizeStation(s.data));
  }
  return stations;
}

const KNOWN_STATUS: PriceStatus[] = ["open", "closed", "no prices", "not found"];

export function parsePricesResponse(json: unknown): Record<string, PriceUpdate> {
  const err = errorResponseSchema.safeParse(json);
  if (err.success) throw new UpstreamError(err.data.message ?? "Tankerkönig error");
  const parsed = pricesResponseSchema.safeParse(json);
  if (!parsed.success) throw new UpstreamError("Unexpected prices response");
  const out: Record<string, PriceUpdate> = {};
  for (const [id, p] of Object.entries(parsed.data.prices)) {
    const status = (KNOWN_STATUS as string[]).includes(p.status) ? (p.status as PriceStatus) : "no prices";
    const prices: FuelPrices = { e5: p.e5, e10: p.e10, diesel: p.diesel };
    out[id] = { status, prices };
  }
  return out;
}

export function parseDetailResponse(json: unknown): StationDetail {
  const err = errorResponseSchema.safeParse(json);
  if (err.success) throw new UpstreamError(err.data.message ?? "Tankerkönig error", 404);
  const parsed = detailResponseSchema.safeParse(json);
  if (!parsed.success) throw new UpstreamError("Unexpected detail response");
  const s = parsed.data.station;
  const openingTimes: OpeningTime[] = s.openingTimes.map((t) => ({ text: t.text, start: t.start, end: t.end }));
  return { id: s.id, openingTimes, overrides: s.overrides, wholeDay: s.wholeDay, isOpen: s.isOpen };
}

async function getJson(path: string, params: Record<string, string>, apiKey: string): Promise<unknown> {
  const url = new URL(`${API_BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", apiKey);
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json", "User-Agent": "Tankpreis-PWA/0.1" },
      cache: "no-store",
    });
  } catch {
    // Never include the URL: it contains the API key.
    throw new UpstreamError("Tankerkönig not reachable", 504);
  }
  if (!res.ok) throw new UpstreamError(`Tankerkönig HTTP ${res.status}`, res.status === 429 ? 429 : 502);
  return res.json();
}

export async function fetchList(
  lat: number,
  lng: number,
  radiusKm: number,
  apiKey: string,
): Promise<Station[]> {
  const json = await getJson(
    "list.php",
    { lat: String(lat), lng: String(lng), rad: String(radiusKm), sort: "dist", type: "all" },
    apiKey,
  );
  return parseListResponse(json);
}

/** Upstream accepts at most 10 IDs per call. */
export const PRICES_BATCH = 10;

export async function fetchPrices(ids: string[], apiKey: string): Promise<Record<string, PriceUpdate>> {
  if (ids.length === 0) return {};
  if (ids.length > PRICES_BATCH) throw new Error(`fetchPrices: max ${PRICES_BATCH} ids`);
  const json = await getJson("prices.php", { ids: ids.join(",") }, apiKey);
  return parsePricesResponse(json);
}

export async function fetchDetail(id: string, apiKey: string): Promise<StationDetail> {
  const json = await getJson("detail.php", { id }, apiKey);
  return parseDetailResponse(json);
}

/** Tankerkönig station IDs are UUIDs. */
export function isStationId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
