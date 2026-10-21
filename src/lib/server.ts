import "server-only";
import { NextResponse } from "next/server";
import { UpstreamError } from "./tankerkoenig";
import type { ApiError, DataSource } from "./types";

export type Backend = { source: "mock" } | { source: "live"; apiKey: string } | { source: "none" };

/** Mock data only when explicitly requested; never silently. */
export function backend(): Backend {
  if (process.env.TANKERKOENIG_MOCK === "1") return { source: "mock" };
  const apiKey = process.env.TANKERKOENIG_API_KEY?.trim();
  return apiKey ? { source: "live", apiKey } : { source: "none" };
}

export function sourceOf(b: Backend): DataSource {
  return b.source === "mock" ? "mock" : "live";
}

export function jsonError(code: ApiError["code"], error: string, status: number) {
  return NextResponse.json<ApiError>({ error, code }, { status, headers: { "Cache-Control": "no-store" } });
}

export function noKeyError() {
  return jsonError("no_key", "서버에 Tankerkönig API 키가 설정되지 않았어요.", 503);
}

export function upstreamError(e: unknown) {
  if (e instanceof UpstreamError) {
    if (e.status === 429) return jsonError("rate_limited", "요청이 많아 잠시 후 다시 시도해 주세요.", 429);
    if (e.status === 404) return jsonError("not_found", "주유소 정보를 찾을 수 없어요.", 404);
  }
  console.error("[tankerkoenig]", e instanceof Error ? e.message : e);
  return jsonError("upstream", "가격 서버에 연결하지 못했어요.", 502);
}

/** CDN cache: fresh for `maxAge` seconds, then serve stale while revalidating. */
export function cacheHeaders(maxAge: number) {
  return { "Cache-Control": `public, max-age=0, s-maxage=${maxAge}, stale-while-revalidate=${maxAge}` };
}

export function parseNumber(value: string | null): number {
  return value === null || value.trim() === "" ? Number.NaN : Number(value);
}
