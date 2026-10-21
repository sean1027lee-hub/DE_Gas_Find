import { describe, expect, it } from "vitest";
import { normalizeBrandKey, resolveBrand } from "./brands";

describe("resolveBrand", () => {
  it.each([
    ["TotalEnergies", "TotalEnergies"],
    ["TOTAL", "TotalEnergies"],
    ["Total", "TotalEnergies"],
    ["Total Energies", "TotalEnergies"],
    ["Circle K", "Circle K"],
    ["CIRCLE K", "Circle K"],
    ["CircleK", "Circle K"],
    ["ARAL", "Aral"],
    ["Aral", "Aral"],
    ["AVIA", "AVIA"],
    ["Avia Xpress", "AVIA"],
    ["ENI", "Eni"],
    ["Agip", "Eni"],
    ["Westfalen", "Westfalen"],
    ["Shell", "Shell"],
    ["ESSO", "Esso"],
    ["JET", "JET"],
  ] as const)("%s → %s", (raw, label) => {
    expect(resolveBrand(raw)).toEqual({ label });
  });

  it("keeps unknown brands as-is without a group", () => {
    expect(resolveBrand("  Freie Tankstelle Müller ")).toEqual({ label: "Freie Tankstelle Müller" });
  });

  it("falls back to the station name only when the brand is empty", () => {
    expect(resolveBrand("", "TotalEnergies Darmstadt")).toEqual({ label: "TotalEnergies" });
    expect(resolveBrand(null, "ARAL Tankstelle")).toEqual({ label: "Aral" });
    expect(resolveBrand("Shell", "Aral alt")).toEqual({ label: "Shell" });
  });

  it("does not match brand names inside words", () => {
    expect(resolveBrand("", "Tankstelle Aralstraße").label).toBe("");
    expect(resolveBrand("Totalmarkt").label).toBe("Totalmarkt");
    expect(resolveBrand("Aviator").label).toBe("Aviator");
  });
});

describe("normalizeBrandKey", () => {
  it("lowercases and strips punctuation and accents", () => {
    expect(normalizeBrandKey("  Éni-Agip! ")).toBe("eni agip");
    expect(normalizeBrandKey(undefined)).toBe("");
  });
});
