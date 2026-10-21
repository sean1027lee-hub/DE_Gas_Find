import { NextResponse, type NextRequest } from "next/server";
import { TtlCache } from "@/lib/cache";
import { isInGermanyArea, isValidLatLng, snapToGrid } from "@/lib/geo";
import { mockSearch, reverseLabel, searchPlaces } from "@/lib/geocode";
import { cacheHeaders, jsonError, mode, parseNumber } from "@/lib/server";
import type { GeocodeResult } from "@/lib/types";

const DAY = 24 * 3600;
const searchCache = new TtlCache<GeocodeResult[]>(DAY * 1000);
const reverseCache = new TtlCache<string | null>(DAY * 1000, 2000);

/**
 * GET /api/geocode?q=64283        → { results: GeocodeResult[] }
 * GET /api/geocode?lat=…&lng=…    → { label: string | null }
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const mock = mode() === "mock";

  if (q.has("q")) {
    const query = (q.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 100);
    if (query.length < 2) return jsonError("bad_request", "검색어를 2글자 이상 입력해 주세요.", 400);
    try {
      const results = mock
        ? mockSearch(query)
        : await searchCache.getOrLoad(query.toLowerCase(), () => searchPlaces(query));
      return NextResponse.json({ results }, { headers: cacheHeaders(DAY) });
    } catch (e) {
      console.error("[geocode]", e instanceof Error ? e.message : e);
      return jsonError("upstream", "위치 검색 서버에 연결하지 못했어요.", 502);
    }
  }

  const point = { lat: parseNumber(q.get("lat")), lng: parseNumber(q.get("lng")) };
  if (!isValidLatLng(point) || !isInGermanyArea(point)) {
    return jsonError("bad_request", "위치 값이 올바르지 않아요.", 400);
  }
  const grid = snapToGrid(point);
  try {
    const label = mock
      ? "Darmstadt"
      : await reverseCache.getOrLoad(`${grid.lat},${grid.lng}`, () => reverseLabel(grid.lat, grid.lng));
    return NextResponse.json({ label }, { headers: cacheHeaders(DAY) });
  } catch {
    return NextResponse.json({ label: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
