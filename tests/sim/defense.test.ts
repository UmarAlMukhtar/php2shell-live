import { describe, expect, it } from "vitest";
import { applyDefenderAction } from "@/lib/sim/defense";
import { initialState, tick } from "@/lib/sim/engine";
import type { SimState } from "@/lib/sim/types";

function defendState(): SimState {
  return { ...initialState(), phase: "defend" };
}

function act(s: SimState, id: Parameters<typeof applyDefenderAction>[1]): SimState {
  return applyDefenderAction(s, id);
}

describe("defender action prerequisites", () => {
  it("blocks 'block_source' before logs are inspected", () => {
    const s = defendState();
    const after = act(s, "block_source");
    expect(after.sourceBlocked).toBe(false);
    expect(after.actionsTaken).not.toContain("block_source");
  });

  it("blocks 'apply_patch' before the version is investigated", () => {
    const s = defendState();
    const after = act(s, "apply_patch");
    expect(after.patchApplied).toBe(false);
  });

  it("allows the correct sequence: logs → version → patch", () => {
    let s = defendState();
    s = act(s, "inspect_logs");
    s = act(s, "investigate_version");
    s = act(s, "apply_patch");
    expect(s.logsInspected).toBe(true);
    expect(s.versionInvestigated).toBe(true);
    expect(s.patchApplied).toBe(true);
    // Staging alone does not make the patch live.
    expect(s.restartedAfterPatch).toBe(false);
    expect(s.status).not.toBe("PATCHED");
  });
});

describe("defender action consequences", () => {
  it("isolating the worker cuts capacity", () => {
    let s = act(defendState(), "inspect_logs");
    s = act(s, "isolate_worker");
    expect(s.workerIsolated).toBe(true);
    expect(s.capacity).toBeLessThan(70);
  });

  it("restart after patch makes it live; restart alone does not patch", () => {
    let s = defendState();
    s = act(s, "restart_services");
    expect(s.patchApplied).toBe(false);
    expect(s.restartedAfterPatch).toBe(false);

    let s2 = act(act(act(defendState(), "inspect_logs"), "investigate_version"), "apply_patch");
    s2 = act(s2, "restart_services");
    expect(s2.restartedAfterPatch).toBe(true);
    expect(s2.phpVersion).toBe("8.3.36");
    expect(s2.status).toBe("CONTAINED");
  });

  it("repeating an action is a no-op", () => {
    let s = act(defendState(), "inspect_logs");
    const once = s.logs.length;
    s = act(s, "inspect_logs");
    expect(s.logs.length).toBe(once);
  });
});

describe("attacker progression", () => {
  it("advances through stages on ticks", () => {
    let s = defendState();
    for (let i = 0; i < 25; i++) s = tick(s);
    expect(["BREACH"]).toContain(s.attackerStage);
    expect(s.status).toBe("BREACHED");
  });

  it("deflects the attack when the patch is live", () => {
    let s = act(act(act(defendState(), "inspect_logs"), "investigate_version"), "apply_patch");
    s = act(s, "restart_services");
    for (let i = 0; i < 12; i++) s = tick(s);
    expect(s.attackerStage).toBe("DEFLECTED");
    expect(s.status).toBe("CONTAINED");
  });

  it("a live patch during recon/probe deflects early", () => {
    let s = act(act(act(defendState(), "inspect_logs"), "investigate_version"), "apply_patch");
    s = act(s, "restart_services");
    for (let i = 0; i < 6; i++) s = tick(s);
    expect(s.attackerStage).toBe("DEFLECTED");
  });
});
