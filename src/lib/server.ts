import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { mockDetailResponse, mockListResponse, mockPricesResponse, type MockScenario } from "./mock/api";
import { clientIp, RateLimiter } from "./rateLimit";
import { liveTransport, UpstreamError, type Transport } from "./tankerkoenig";
import type { ApiError, DataSource } from "./types";

/**
 * Data source, switched with one variable:
 *   TANKERKOENIG_MODE=mock   sample stations with simulated prices
 *   TANKERKOENIG_MODE=live   real API (needs TANKERKOENIG_API_KEY)
 * Unset: live when a key exists; in development without a key, mock.
 * The legacy TANKERKOENIG_MOCK=1 still means mock.
 */
export type Mode = "mock" | "live" | "none";

export function mode(): Mode {
  const raw = process.env.TANKERKOENIG_MODE?.trim().toLowerCase();
  const hasKey = !!process.env.TANKERKOENIG_API_KEY?.trim();
  if (raw === "mock" || process.env.TANKERKOENIG_MOCK === "1") return "mock";
  if (raw === "live") return hasKey ? "live" : "none";
  if (hasKey) return "live";
  return process.env.NODE_ENV === "development" ? "mock" : "none";
}

const SCENARIOS: MockScenario[] = ["empty", "error", "loading", "night"];

export interface Backend {
  mode: Exclude<Mode, "none">;
  transport: Transport;
  /** Extra cache-key part (mock: scenario/time overrides). */
  variant: string;
  /** Delay before answering (mock "loading" scenario). */
  delayMs: number;
}

/**
 * Builds the transport for a request. In mock mode `?scenario=` and `?at=HH:MM`
 * (Berlin time, today) are honoured for previewing UI states; live mode ignores them.
 */
export function backend(req: NextRequest): Backend | null {
  const m = mode();
  if (m === "none") return null;
  if (m === "live") {
    return { mode: "live", transport: budgeted(liveTransport(process.env.TANKERKOENIG_API_KEY!.trim())), variant: "", delayMs: 0 };
  }
  const q = req.nextUrl.searchParams;
  const scenarioParam = q.get("scenario") as MockScenario | null;
  const scenario = scenarioParam && SCENARIOS.includes(scenarioParam) ? scenarioParam : null;
  const at = scenario === "night" ? "23:30" : q.get("at");
  const now = at && /^\d{1,2}:\d{2}$/.test(at) ? atBerlinTime(at) : new Date();
  const opts = { now, scenario };
  const transport: Transport = async (path, params) => {
    if (path === "list.php") {
      return mockListResponse({ lat: Number(params.lat), lng: Number(params.lng) }, Number(params.rad), opts);
    }
    if (path === "prices.php") return mockPricesResponse(params.ids.split(","), opts);
    return mockDetailResponse(params.id, opts);
  };
  return {
    mode: "mock",
    transport,
    // Simulated prices change every few minutes; time-bucket the cache like live data.
    variant: `${scenario ?? ""}|${at ?? ""}`,
    delayMs: scenario === "loading" ? 3000 : 0,
  };
}

/**
 * Abuse guards for the public API routes (live data only; mock previews are free).
 * Per IP: 60 requests a minute — a normal session needs a handful. Per instance:
 * 120 upstream Tankerkönig calls a minute, so uncached requests cannot burn the key.
 */
const perIp = new RateLimiter(60, 60_000);
const upstream = new RateLimiter(120, 60_000);

export function rateLimited(req: NextRequest): NextResponse | null {
  if (mode() === "mock") return null;
  return perIp.hit(clientIp(req.headers)) ? null : tooManyRequests();
}

function budgeted(transport: Transport): Transport {
  return (path, params) => {
    if (!upstream.hit("all")) return Promise.reject(new UpstreamError("Upstream budget exceeded", 429));
    return transport(path, params);
  };
}

function tooManyRequests() {
  const res = jsonError("rate_limited", "요청이 많아 잠시 후 다시 시도해 주세요.", 429);
  res.headers.set("Retry-After", "60");
  return res;
}

/** Today at HH:MM in Berlin, as a Date. */
function atBerlinTime(hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const berlin = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const offset = now.getTime() - berlin.getTime();
  berlin.setHours(h, m, 0, 0);
  return new Date(berlin.getTime() + offset);
}

export function sourceOf(b: Backend): DataSource {
  return b.mode;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function jsonError(code: ApiError["code"], error: string, status: number) {
  return NextResponse.json<ApiError>({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export function noKeyError() {
  return jsonError(
    "no_key",
    "서버에 Tankerkönig API 키가 설정되지 않았어요. 키를 받기 전이라면 TANKERKOENIG_MODE=mock으로 샘플 데이터를 볼 수 있어요.",
    503,
  );
}

export function upstreamError(e: unknown) {
  if (e instanceof UpstreamError) {
    if (e.status === 429) return tooManyRequests();
    if (e.status === 404) return jsonError("not_found", "주유소 정보를 찾을 수 없어요.", 404);
  }
  console.error("[tankerkoenig]", e instanceof Error ? e.message : e);
  return jsonError("upstream", "가격 서버에 연결하지 못했어요.", 502);
}

/** CDN cache: fresh for `maxAge` seconds, then serve stale while revalidating. Mock previews are never cached. */
export function cacheHeaders(maxAge: number, b?: Backend) {
  if (b?.variant && b.variant !== "|") return { "Cache-Control": "no-store" };
  return { "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}` };
}

export function parseNumber(value: string | null): number {
  return value === null || value.trim() === "" ? Number.NaN : Number(value);
}
