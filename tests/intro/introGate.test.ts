import { describe, expect, it } from "vitest";
import {
  INTRO_KEY,
  hasSavedSim,
  introSeen,
  markIntroSeen,
  shouldShowIntro,
} from "@/lib/ui/introGate";
import { STORAGE_KEY } from "@/lib/sim/persist";

function mapStorage(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}

const throwing = {
  getItem: (): string | null => {
    throw new Error("denied");
  },
  setItem: (): void => {
    throw new Error("denied");
  },
};

describe("intro gate", () => {
  it("shows on a first visit with no saved sim", () => {
    expect(shouldShowIntro(mapStorage(), mapStorage())).toBe(true);
  });

  it("skips after the intro was dismissed", () => {
    const ls = mapStorage();
    markIntroSeen(ls);
    expect(ls.getItem(INTRO_KEY)).toBe("1");
    expect(shouldShowIntro(ls, mapStorage())).toBe(false);
  });

  it("skips when a resumable simulation exists", () => {
    const ss = mapStorage({ [STORAGE_KEY]: JSON.stringify({ tick: 3 }) });
    expect(hasSavedSim(ss)).toBe(true);
    expect(shouldShowIntro(mapStorage(), ss)).toBe(false);
  });

  it("does not count a freshly-persisted initial state as resumable", () => {
    const ss = mapStorage({
      [STORAGE_KEY]: JSON.stringify({
        tick: 0,
        visualStepIndex: -1,
        phase: "visualize",
      }),
    });
    expect(hasSavedSim(ss)).toBe(false);
  });

  it("ignores a corrupt saved sim blob", () => {
    const ss = mapStorage({ [STORAGE_KEY]: "{not json" });
    expect(hasSavedSim(ss)).toBe(false);
  });

  it("fails open to the dashboard when storage throws", () => {
    expect(introSeen(throwing)).toBe(true);
    expect(shouldShowIntro(throwing, mapStorage())).toBe(false);
    expect(hasSavedSim(throwing)).toBe(false);
    expect(() => markIntroSeen(throwing)).not.toThrow();
  });
});
