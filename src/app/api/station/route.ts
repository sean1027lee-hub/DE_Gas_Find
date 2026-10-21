import { NextResponse, type NextRequest } from "next/server";
import { TtlCache } from "@/lib/cache";
import { mockDetail } from "@/lib/mock";
import { backend, cacheHeaders, jsonError, noKeyError, upstreamError } from "@/lib/server";
import { fetchDetail, isStationId } from "@/lib/tankerkoenig";
import type { StationDetail } from "@/lib/types";

// Opening hours rarely change; prices come from the list/prices endpoints.
const TTL_SECONDS = 3600;
const cache = new TtlCache<StationDetail>(TTL_SECONDS * 1000);

/** GET /api/station?id=uuid — opening hours. */
export async function GET(req: NextRequest) {
  const id = (req.nextUrl.searchParams.get("id") ?? "").trim().toLowerCase();
  if (!isStationId(id)) return jsonError("bad_request", "주유소 ID가 올바르지 않아요.", 400);

  const b = backend();
  if (b.source === "none") return noKeyError();

  try {
    const detail = await cache.getOrLoad(`${b.source}:${id}`, async () =>
      b.source === "live" ? fetchDetail(id, b.apiKey) : mockDetail(id),
    );
    return NextResponse.json(detail, { headers: cacheHeaders(TTL_SECONDS) });
  } catch (e) {
    return upstreamError(e);
  }
}
