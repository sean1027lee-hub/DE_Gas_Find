/**
 * UI state previews via the page URL, e.g. /?scenario=offline or /?at=11:50.
 * Server-side scenarios (empty, error, loading, night, at) only take effect in
 * mock mode; the client-side ones (denied, offline) only change what this
 * browser simulates. Without the parameter nothing changes.
 */
export type Scenario = "loading" | "empty" | "error" | "night" | "denied" | "offline";

const ALL: Scenario[] = ["loading", "empty", "error", "night", "denied", "offline"];

let cached: { scenario: Scenario | null; at: string | null } | null = null;

function read() {
  if (cached) return cached;
  if (typeof window === "undefined") return { scenario: null, at: null };
  const q = new URLSearchParams(window.location.search);
  const s = q.get("scenario") as Scenario | null;
  const at = q.get("at");
  cached = { scenario: s && ALL.includes(s) ? s : null, at: at && /^\d{1,2}:\d{2}$/.test(at) ? at : null };
  return cached;
}

export function scenario(): Scenario | null {
  return read().scenario;
}

/** Query suffix forwarded to our API routes ("" when no preview is active). */
export function apiQuery(): string {
  const { scenario: s, at } = read();
  const p = new URLSearchParams();
  if (s && s !== "denied" && s !== "offline") p.set("scenario", s);
  if (at) p.set("at", at);
  const str = p.toString();
  return str ? `&${str}` : "";
}

/** Previews that must not show data cached from an earlier visit. */
export function ignoresCache(): boolean {
  const s = scenario();
  return s === "loading" || s === "empty" || s === "error";
}

/** Clock override for previews: ?at=HH:MM, or 23:30 for ?scenario=night. */
export function scenarioClock(): string | null {
  const { scenario: s, at } = read();
  return s === "night" ? "23:30" : at;
}
