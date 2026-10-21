/** Shared by server (layout, proxy) and client; no React here. */
export type Lang = "ko" | "de" | "en";
export const LANGS: Lang[] = ["ko", "de", "en"];
export const FALLBACK_LANG: Lang = "en";
/** Cookie set when the user picks a language in Settings, so the server renders it. */
export const LANG_COOKIE = "tp-lang";

/** First supported language in an Accept-Language header or navigator.languages list. */
export function pickLang(candidates: readonly string[]): Lang {
  for (const c of candidates) {
    const base = c.trim().toLowerCase().split(/[-_;]/)[0] as Lang;
    if (LANGS.includes(base)) return base;
  }
  return FALLBACK_LANG;
}

export function parseAcceptLanguage(header: string | null): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag, q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((x) => x.tag && x.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((x) => x.tag);
}
