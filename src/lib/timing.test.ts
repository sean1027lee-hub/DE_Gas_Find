import { describe, expect, it } from "vitest";
import { addObservation, advise, forecast, learnCurve, phaseAt, typicalOffsetCt, type Observation } from "./timing";

describe("typical curve (12:00 rule)", () => {
  const at = (h: number) => typicalOffsetCt(h);

  it("peaks right after 12:00 and bottoms out just before", () => {
    expect(at(12)).toBeGreaterThan(at(13));
    expect(at(11.95)).toBeLessThan(at(6));
    for (let h = 0; h < 24; h += 0.25) expect(at(12)).toBeGreaterThanOrEqual(at(h));
  });

  it("never rises between 12:00 and 11:59 next day", () => {
    let prev = Infinity;
    for (let m = 0; m < 24 * 60 - 1; m += 5) {
      const v = at((12 + m / 60) % 24);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      prev = v;
    }
  });

  it("averages to zero over the day and diesel swings more", () => {
    let s = 0;
    for (let m = 0; m < 1440; m += 5) s += at(m / 60);
    expect(Math.abs(s / 288)).toBeLessThan(0.05);
    expect(Math.abs(typicalOffsetCt(12, "diesel"))).toBeGreaterThan(Math.abs(at(12)));
  });
});

describe("advice", () => {
  it("phases", () => {
    expect(phaseAt(9)).toBe("beforeNoon");
    expect(phaseAt(13)).toBe("afterRaise");
    expect(phaseAt(19)).toBe("evening");
    expect(phaseAt(23)).toBe("night");
    expect(phaseAt(3)).toBe("night");
  });

  it("before noon: buying now beats waiting, and warns about the raise", () => {
    const a = advise(1.799, 10.5, (h) => typicalOffsetCt(h));
    expect(a.phase).toBe("beforeNoon");
    expect(a.noonJumpCt).toBeGreaterThan(5);
    expect(a.waitSavingCt).toBeLessThan(1.5);
  });

  it("after the raise: waiting saves money", () => {
    const a = advise(1.899, 12.2, (h) => typicalOffsetCt(h));
    expect(a.waitSavingCt).toBeGreaterThan(8);
    expect(a.best.hour).toBeLessThan(12);
  });

  it("forecast starts at the current price", () => {
    const f = forecast(1.759, 15.25, (h) => typicalOffsetCt(h), 6);
    expect(f[0].price).toBe(1.759);
    expect(f.map((p) => p.hour)).toEqual([15, 16, 17, 18, 19, 20]);
    expect(f[5].price).toBeLessThan(f[0].price);
  });
});

describe("learning from observations", () => {
  const day = (d: number, h: number) => Date.UTC(2026, 9, d, h - 2, 10); // Berlin = UTC+2 in October
  const obs: Observation[] = [];
  for (const d of [10, 11, 12, 13])
    for (const h of [8, 11, 13, 16, 19, 22]) {
      // A local pattern: evening is the cheapest here.
      const price = 1.8 + (h === 19 ? -0.05 : h === 13 ? 0.04 : 0);
      obs.push({ t: day(d, h), fuel: "e10", price, cell: "49.87,8.65" });
    }

  it("needs at least three well-covered days", () => {
    expect(learnCurve(obs.slice(0, 12), "e10")).toBeNull();
    expect(learnCurve(obs, "diesel")).toBeNull();
  });

  it("learns the local shape", () => {
    const learned = learnCurve(obs, "e10")!;
    expect(learned.days).toBe(4);
    expect(learned.curve(19)).toBeLessThan(learned.curve(13));
    expect(learned.curve(19)).toBeLessThan(learned.curve(8));
  });

  it("deduplicates and expires observations", () => {
    const base: Observation = { t: 1_000_000_000_000, fuel: "e10", price: 1.8, cell: "a" };
    let list = addObservation([], base);
    list = addObservation(list, { ...base, t: base.t + 5 * 60_000 });
    expect(list).toHaveLength(1);
    list = addObservation(list, { ...base, t: base.t + 30 * 60_000 });
    expect(list).toHaveLength(2);
    list = addObservation(list, { ...base, t: base.t + 15 * 86_400_000 });
    expect(list).toHaveLength(1);
  });
});
