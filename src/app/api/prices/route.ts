import { NextResponse, type NextRequest } from "next/server";
import { TtlCache } from "@/lib/cache";
import { backend, cacheHeaders, jsonError, noKeyError, sleep, sourceOf, upstreamError } from "@/lib/server";
import { fetchPrices, isStationId, PRICES_BATCH } from "@/lib/tankerkoenig";
import type { PricesResponse, PriceUpdate } from "@/lib/types";

const TTL_SECONDS = 300;
const MAX_IDS = 50;
const cache = new TtlCache<{ prices: Record<string, PriceUpdate>; fetchedAt: string }>(TTL_SECONDS * 1000);

/** GET /api/prices?ids=uuid,uuid,… — batches of 10 upstream, each cached for 5 minutes. */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("ids") ?? "";
  const ids = [...new Set(raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean))].sort();
  if (ids.length === 0 || ids.length > MAX_IDS || !ids.every(isStationId)) {
    return jsonError("bad_request", "주유소 ID가 올바르지 않아요.", 400);
  }

  const b = backend(req);
  if (!b) return noKeyError();
  if (b.delayMs) await sleep(b.delayMs);

  try {
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += PRICES_BATCH) batches.push(ids.slice(i, i + PRICES_BATCH));
    const results = await Promise.all(
      batches.map((batch) =>
        cache.getOrLoad(`${b.mode}:${b.variant}:${batch.join(",")}`, async () => ({
          prices: await fetchPrices(batch, b.transport),
          fetchedAt: new Date().toISOString(),
        })),
      ),
    );
    const body: PricesResponse = {
      prices: Object.assign({}, ...results.map((r) => r.prices)),
      // Report the oldest batch so the UI never overstates freshness.
      fetchedAt: results.map((r) => r.fetchedAt).sort()[0],
      source: sourceOf(b),
    };
    return NextResponse.json(body, { headers: cacheHeaders(TTL_SECONDS, b) });
  } catch (e) {
    return upstreamError(e);
  }
}
