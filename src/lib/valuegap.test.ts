import { describe, it, expect } from "vitest";
import { generateRoadmap, nextStreak, todaysChoices } from "./valuegap";

const base = { goal: "x", state: 0, bandwidth: 0, pitfall: 1, timeline: 1 };

describe("valuegap", () => {
  it("roadmap has 4–5 phases with 3–4 tasks", () => {
    const r = generateRoadmap(base);
    expect(r.length).toBeGreaterThanOrEqual(4);
    expect(r.length).toBeLessThanOrEqual(5);
    r.forEach((p) => expect(p.tasks.length).toBeGreaterThanOrEqual(3));
  });
  it("'för stort i huvudet' makes phase 1 tiny", () => {
    const r = generateRoadmap({ ...base, pitfall: 0 });
    r[0]!.tasks.forEach((t) => expect(t.minutes).toBe(10));
  });
  it("offers exactly two choices", () => {
    expect(todaysChoices(generateRoadmap(base), 0)).toHaveLength(2);
  });
  it("streak continues on consecutive days and resets after a gap", () => {
    expect(nextStreak(3, "2026-10-10", "2026-10-11")).toBe(4);
    expect(nextStreak(3, "2026-10-08", "2026-10-11")).toBe(1);
    expect(nextStreak(3, "2026-10-11", "2026-10-11")).toBe(3);
  });
});
