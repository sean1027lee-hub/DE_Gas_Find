import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./cache";

describe("TtlCache", () => {
  it("expires entries", () => {
    const c = new TtlCache<number>(1000);
    c.set("a", 1, 0);
    expect(c.get("a", 999)).toBe(1);
    expect(c.get("a", 1000)).toBeUndefined();
  });

  it("evicts the oldest entry beyond capacity", () => {
    const c = new TtlCache<number>(1000, 2);
    c.set("a", 1, 0);
    c.set("b", 2, 0);
    c.set("c", 3, 0);
    expect(c.get("a", 0)).toBeUndefined();
    expect(c.get("c", 0)).toBe(3);
  });

  it("de-duplicates concurrent loads", async () => {
    const c = new TtlCache<number>(1000);
    const load = vi.fn(async () => 42);
    const [x, y] = await Promise.all([c.getOrLoad("k", load), c.getOrLoad("k", load)]);
    expect(x).toBe(42);
    expect(y).toBe(42);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures", async () => {
    const c = new TtlCache<number>(1000);
    await expect(c.getOrLoad("k", async () => Promise.reject(new Error("x")))).rejects.toThrow();
    expect(await c.getOrLoad("k", async () => 1)).toBe(1);
  });
});
