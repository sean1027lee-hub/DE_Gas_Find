import { describe, expect, it } from "vitest";
import { de } from "./de";
import { en } from "./en";
import { ko } from "./ko";
import { parseAcceptLanguage, pickLang } from "./langs";

describe("language selection", () => {
  it("parses Accept-Language by quality", () => {
    expect(parseAcceptLanguage("de-DE,de;q=0.9,en;q=0.8")).toEqual(["de-DE", "de", "en"]);
    expect(parseAcceptLanguage("en;q=0.5, ko-KR")).toEqual(["ko-KR", "en"]);
    expect(parseAcceptLanguage(null)).toEqual([]);
  });

  it("picks the first supported language, English otherwise", () => {
    expect(pickLang(["ko-KR"])).toBe("ko");
    expect(pickLang(["fr-FR", "de-AT"])).toBe("de");
    expect(pickLang(["fr-FR"])).toBe("en");
    expect(pickLang([])).toBe("en");
  });
});

describe("dictionaries", () => {
  const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");

  it("use the same placeholders in every language", () => {
    for (const key of Object.keys(ko) as (keyof typeof ko)[]) {
      expect(placeholders(de[key]), `de ${key}`).toBe(placeholders(ko[key]));
      expect(placeholders(en[key]), `en ${key}`).toBe(placeholders(ko[key]));
    }
  });

  it("have no empty strings", () => {
    for (const dict of [ko, de, en]) for (const v of Object.values(dict)) expect(v.trim()).not.toBe("");
  });
});
