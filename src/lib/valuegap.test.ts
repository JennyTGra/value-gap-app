import { describe, it, expect } from "vitest";
import { generatePlan, todaysChoices, shouldTriggerPanic, closeDays, parkTask, finishTask, addReflection, emptyData } from "./valuegap";

describe("valuegap", () => {
  it("parking keeps a step unfinished with its return note", () => {
    const parked = parkTask({ id: "step", title: "Rubrik", minutes: 5 }, "  Fortsätt vid stycke två  ");
    expect(parked.started).toBe(true);
    expect(parked.done).toBe(false);
    expect(parked.resumeNote).toBe("Fortsätt vid stycke två");
    expect(finishTask(parked, "2026-10-27")).toMatchObject({ done: true, started: false, resumeNote: "" });
  });
  it("reflection belongs to the completed ambition even with identical titles", () => {
    const first = { ...generatePlan("Samma titel", 0, 1, false), id: "first" };
    const second = { ...generatePlan("Samma titel", 0, 1, false), id: "second" };
    const data = { ...emptyData, projects: [first, second], activeId: "second" };
    const updated = addReflection(data, "first", "  En lärdom  ", "2026-10-27");
    expect(updated.scratchpadBank[0]).toMatchObject({ ambitionId: "first", text: "En lärdom", date: "2026-10-27" });
    expect(addReflection(data, "first", "   ", "2026-10-27").scratchpadBank).toHaveLength(0);
  });
  it("plan has exactly 4 phases with 2–3 steps plus a first micro-step", () => {
    const p = generatePlan("Skriva en bok", 0, 1, false);
    expect(p.phases).toHaveLength(4);
    p.phases.slice(1).forEach((ph) => expect(ph.tasks.length).toBeGreaterThanOrEqual(2));
    p.phases.slice(1).forEach((ph) => expect(ph.tasks.length).toBeLessThanOrEqual(3));
    expect(p.phases[0]!.tasks[0]!.title).toBe("Öppna utkastet och skriv en enda rå rubrik");
  });
  it("morning offers max 2 micro-steps", () => {
    expect(todaysChoices(generatePlan("x", 0, 1, false), "2026-10-14")).toHaveLength(2);
  });
  it("Panikspärren triggers at 2 active projects, not at 1 small one", () => {
    const small = generatePlan("a", 0, 0, false);
    small.phases[0]!.tasks.forEach((t, i) => (t.done = i > 0)); // 1 open step
    expect(shouldTriggerPanic([small])).toBe(false);
    expect(shouldTriggerPanic([small, generatePlan("b", 0, 0, false)])).toBe(true);
  });
  it("Panikspärren triggers when backlog exceeds 4 open steps", () => {
    expect(shouldTriggerPanic([generatePlan("a", 0, 1, false)])).toBe(false); // 4 open
    const p = generatePlan("a", 0, 1, false);
    p.phases[0]!.tasks.push({ id: "z", title: "extra", minutes: 5 });
    expect(shouldTriggerPanic([p])).toBe(true);
  });
  it("missed days are logged neutrally as OTHER_PRIORITIES", () => {
    const log = closeDays([{ date: "2026-10-11", status: "COMPLETED" }], "2026-10-11", "2026-10-14");
    expect(log.filter((e) => e.status === "OTHER_PRIORITIES").map((e) => e.date)).toEqual(["2026-10-12", "2026-10-13"]);
  });
});
