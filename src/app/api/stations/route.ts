import { NextResponse, type NextRequest } from "next/server";
import { TtlCache } from "@/lib/cache";
import { isInGermanyArea, isValidLatLng, snapToGrid } from "@/lib/geo";
import { backend, cacheHeaders, jsonError, noKeyError, parseNumber, sleep, sourceOf, upstreamError } from "@/lib/server";
import { fetchList } from "@/lib/tankerkoenig";
import type { StationsResponse } from "@/lib/types";

const TTL_SECONDS = 300;
const MAX_RADIUS = 25;
const cache = new TtlCache<StationsResponse>(TTL_SECONDS * 1000);

/**
 * GET /api/stations?lat=49.87&lng=8.65&rad=25
 * Coordinates are snapped to a ~1 km grid; the result is cached for 5 minutes per
 * grid cell + radius (Tankerkönig fair use). Distances are recomputed on the client.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const point = { lat: parseNumber(q.get("lat")), lng: parseNumber(q.get("lng")) };
  const rad = q.has("rad") ? parseNumber(q.get("rad")) : MAX_RADIUS;
  if (!isValidLatLng(point)) return jsonError("bad_request", "위치 값이 올바르지 않아요.", 400);
  if (!isInGermanyArea(point)) {
    return jsonError("bad_request", "Tankerkönig는 독일 안의 주유소만 제공해요.", 400);
  }
  if (!Number.isFinite(rad) || rad <= 0) return jsonError("bad_request", "반경 값이 올바르지 않아요.", 400);

  const b = backend(req);
  if (!b) return noKeyError();
  if (b.delayMs) await sleep(b.delayMs);

  const grid = snapToGrid(point);
  const radius = Math.min(MAX_RADIUS, Math.ceil(rad));
  const key = `${b.mode}:${b.variant}:${grid.lat.toFixed(2)},${grid.lng.toFixed(2)}:${radius}`;

  try {
    const data = await cache.getOrLoad(key, async () => ({
      stations: await fetchList(grid.lat, grid.lng, radius, b.transport),
      fetchedAt: new Date().toISOString(),
      source: sourceOf(b),
    }));
    return NextResponse.json(data, { headers: cacheHeaders(TTL_SECONDS, b) });
  } catch (e) {
    return upstreamError(e);
  }
}
