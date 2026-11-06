import { describe, expect, it } from "vitest";
import { parsePlanJson, PlanError } from "./openaiPlan";

const phase = (n: number) => ({ title: `P${n}`, steps: Array.from({ length: 9 }, (_, i) => ({ title: `s${i}`, minutes: 20 })) });

describe("parsePlanJson", () => {
  it("keeps exactly 4 phases and caps steps at 7", () => {
    const r = parsePlanJson(JSON.stringify({ phases: [phase(1), phase(2), phase(3), phase(4), phase(5)] }));
    expect(r.phases).toHaveLength(4);
    expect(r.phases[0]!.tasks).toHaveLength(7);
  });
  it("forces the first step to at most 5 minutes", () => {
    const r = parsePlanJson(JSON.stringify({ phases: [phase(1), phase(2), phase(3), phase(4)] }));
    expect(r.phases[0]!.tasks[0]!.minutes).toBe(5);
  });
  it("rejects invalid JSON", () => {
    expect(() => parsePlanJson("hej")).toThrow(PlanError);
  });
});
