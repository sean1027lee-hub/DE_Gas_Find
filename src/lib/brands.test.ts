import { describe, expect, it } from "vitest";
import { normalizeBrandKey, resolveBrand } from "./brands";

describe("resolveBrand", () => {
  it.each([
    ["TotalEnergies", "TotalEnergies", "total"],
    ["TOTAL", "TotalEnergies", "total"],
    ["Total", "TotalEnergies", "total"],
    ["Total Energies", "TotalEnergies", "total"],
    ["Circle K", "Circle K", "total"],
    ["CIRCLE K", "Circle K", "total"],
    ["CircleK", "Circle K", "total"],
    ["ARAL", "Aral", "partner"],
    ["Aral", "Aral", "partner"],
    ["AVIA", "AVIA", "partner"],
    ["Avia Xpress", "AVIA", "partner"],
    ["ENI", "Eni", "partner"],
    ["Agip", "Eni", "partner"],
    ["Westfalen", "Westfalen", "partner"],
    ["Shell", "Shell", null],
    ["ESSO", "Esso", null],
    ["JET", "JET", null],
  ] as const)("%s → %s (%s)", (raw, label, group) => {
    expect(resolveBrand(raw)).toEqual({ label, group });
  });

  it("keeps unknown brands as-is without a group", () => {
    expect(resolveBrand("  Freie Tankstelle Müller ")).toEqual({ label: "Freie Tankstelle Müller", group: null });
  });

  it("falls back to the station name only when the brand is empty", () => {
    expect(resolveBrand("", "TotalEnergies Darmstadt")).toEqual({ label: "TotalEnergies", group: "total" });
    expect(resolveBrand(null, "ARAL Tankstelle")).toEqual({ label: "Aral", group: "partner" });
    expect(resolveBrand("Shell", "Aral alt")).toEqual({ label: "Shell", group: null });
  });

  it("does not match brand names inside words", () => {
    expect(resolveBrand("", "Tankstelle Aralstraße").group).toBeNull();
    expect(resolveBrand("Totalmarkt").group).toBeNull();
    expect(resolveBrand("Aviator").group).toBeNull();
  });
});

describe("normalizeBrandKey", () => {
  it("lowercases and strips punctuation and accents", () => {
    expect(normalizeBrandKey("  Éni-Agip! ")).toBe("eni agip");
    expect(normalizeBrandKey(undefined)).toBe("");
  });
});
