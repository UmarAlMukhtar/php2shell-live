import { describe, expect, it } from "vitest";
import { initialState } from "@/lib/sim/engine";
import { reduce } from "@/lib/sim/reducer";
import { STAGE_TITLES, VISUAL_TIMELINE } from "@/lib/sim/scenario";

describe("visualize timeline", () => {
  it("covers all five stages and ends BREACHED", () => {
    const stages = new Set(VISUAL_TIMELINE.map((s) => s.stage));
    expect(stages.size).toBe(5);
    expect(STAGE_TITLES).toHaveLength(5);

    let s = initialState();
    for (let i = 0; i < VISUAL_TIMELINE.length; i++) {
      s = reduce(s, { type: "VISUAL_NEXT" });
    }
    expect(s.status).toBe("BREACHED");
    expect(s.visualStepIndex).toBe(VISUAL_TIMELINE.length - 1);
    expect(s.heap.some((b) => b.state === "corrupted")).toBe(true);
    expect(s.logs.length).toBeGreaterThan(2);
    expect(s.term.length).toBeGreaterThan(2);
  });

  it("VISUAL_GOTO replays deterministically to a given step", () => {
    const a = reduce(initialState(), { type: "VISUAL_GOTO", index: 2 });
    const b = reduce(initialState(), { type: "VISUAL_GOTO", index: 2 });
    expect(a).toEqual(b);
    expect(a.visualStepIndex).toBe(2);
    expect(a.status).toBe("UNDER_ATTACK");
    expect(a.attackerStage).toBe("TRIGGER");
  });

  it("VISUAL_NEXT at the end is a no-op", () => {
    const end = reduce(initialState(), {
      type: "VISUAL_GOTO",
      index: VISUAL_TIMELINE.length - 1,
    });
    expect(reduce(end, { type: "VISUAL_NEXT" })).toBe(end);
  });
});
