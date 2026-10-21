"use client";
/**
 * Tiny i18n: flat dictionaries (ko = source, de/en drafts), `{name}` placeholders.
 * The language follows the device unless set in Settings. Numbers keep the German
 * pump format (1,739) in every language, as on the price signs.
 */
import { createContext, useContext, useEffect } from "react";
import { useHydrated } from "@/hooks/useClientState";
import { settingsStore, type LangPref } from "@/lib/store";
import { de } from "./de";
import { en } from "./en";
import { ko, type MessageKey, type Messages } from "./ko";
import { LANG_COOKIE, LANGS, pickLang, type Lang } from "./langs";

export { LANGS, type Lang };
export const LANG_NAMES: Record<Lang, string> = { ko: "한국어", de: "Deutsch", en: "English" };

const DICTS: Record<Lang, Messages> = { ko, de, en };

export type Vars = Record<string, string | number>;
export type T = (key: MessageKey, vars?: Vars) => string;

export function resolveLang(pref: LangPref, languages: readonly string[] = []): Lang {
  return pref !== "auto" ? pref : pickLang(languages);
}

/** Language the server rendered with (from proxy.ts), used until hydration finishes. */
export const SsrLangContext = createContext<Lang>("ko");

/** Remember an explicit choice for the server render; "auto" goes back to Accept-Language. */
export function persistLangCookie(pref: LangPref) {
  document.cookie =
    pref === "auto"
      ? `${LANG_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
      : `${LANG_COOKIE}=${pref}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const template = DICTS[lang][key] ?? ko[key];
  return vars ? template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`)) : template;
}

function deviceLanguages(): readonly string[] {
  return typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language];
}

/** Current language + translate function; keeps <html lang> in sync. */
export function useT(): { t: T; lang: Lang } {
  const { lang: pref } = settingsStore.use();
  const hydrated = useHydrated();
  const ssrLang = useContext(SsrLangContext);
  // Before hydration render exactly what the server rendered; after, follow the device/setting.
  const lang = hydrated ? resolveLang(pref, deviceLanguages()) : ssrLang;
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return { t: (key, vars) => translate(lang, key, vars), lang };
}

export type { MessageKey };
