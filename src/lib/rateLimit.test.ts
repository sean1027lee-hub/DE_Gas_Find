import { describe, expect, it } from "vitest";
import { clientIp, RateLimiter } from "./rateLimit";

describe("RateLimiter", () => {
  it("allows up to the limit per window, then blocks", () => {
    const rl = new RateLimiter(3, 60_000);
    expect([1, 2, 3, 4].map(() => rl.hit("a", 0))).toEqual([true, true, true, false]);
    expect(rl.hit("b", 0)).toBe(true);
  });

  it("resets after the window", () => {
    const rl = new RateLimiter(1, 60_000);
    expect(rl.hit("a", 0)).toBe(true);
    expect(rl.hit("a", 59_999)).toBe(false);
    expect(rl.hit("a", 60_000)).toBe(true);
  });

  it("keeps memory bounded", () => {
    const rl = new RateLimiter(1, 60_000, 10);
    for (let i = 0; i < 100; i++) expect(rl.hit(`k${i}`, 0)).toBe(true);
  });
});

describe("clientIp", () => {
  it("uses the first forwarded address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
