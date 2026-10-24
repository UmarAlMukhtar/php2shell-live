import { describe, expect, it } from "vitest";
import { initialState } from "@/lib/sim/engine";
import { readSavedSim, writeSavedSim, STORAGE_KEY } from "@/lib/sim/persist";
import type { SimState } from "@/lib/sim/types";

/** Minimal sessionStorage stand-in. */
function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    _map: m,
  };
}

function patchedState(): SimState {
  const s = initialState();
  return {
    ...s,
    phase: "report",
    status: "PATCHED",
    outcome: "success",
    phpVersion: "8.3.36",
    capacity: 90,
    patchApplied: true,
    restartedAfterPatch: true,
    logsInspected: true,
    versionInvestigated: true,
    actionsTaken: ["inspect_logs", "apply_patch", "restart_services"] as SimState["actionsTaken"],
  };
}

describe("persist", () => {
  it("round-trips the complete sim state incl. a PATCHED report", () => {
    const st = memStorage();
    const done = patchedState();
    writeSavedSim(st, done);
    const back = readSavedSim(st);
    expect(back).not.toBeNull();
    expect(back!.phase).toBe("report");
    expect(back!.status).toBe("PATCHED");
    expect(back!.outcome).toBe("success");
    expect(back!.phpVersion).toBe("8.3.36");
    expect(back!.capacity).toBe(90);
    expect(back!.actionsTaken).toEqual([
      "inspect_logs",
      "apply_patch",
      "restart_services",
    ]);
  });

  it("hydrates an in-progress incident mid-defend", () => {
    const st = memStorage();
    const mid = { ...initialState(), phase: "defend" as const, status: "UNDER_ATTACK" as const, capacity: 70 };
    writeSavedSim(st, mid);
    const back = readSavedSim(st);
    expect(back!.phase).toBe("defend");
    expect(back!.capacity).toBe(70);
  });

  it("returns null for absent and corrupt storage", () => {
    const st = memStorage();
    expect(readSavedSim(st)).toBeNull();
    st._map.set(STORAGE_KEY, "{not json");
    expect(readSavedSim(st)).toBeNull();
    st._map.set(STORAGE_KEY, JSON.stringify({ hello: "world" }));
    expect(readSavedSim(st)).toBeNull();
    expect(readSavedSim(null)).toBeNull();
  });

  it("a fresh (reset) state overwrites the save — intentional clear", () => {
    const st = memStorage();
    writeSavedSim(st, patchedState());
    // RESET writes a brand-new initial state — the next hydrate finds it.
    writeSavedSim(st, initialState());
    const back = readSavedSim(st);
    expect(back!.phase).toBe("visualize");
    expect(back!.status).toBe("SAFE");
  });
});
