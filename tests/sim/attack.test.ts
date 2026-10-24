import { describe, expect, it } from "vitest";
import { applyAttackerAction } from "@/lib/sim/attack";
import { applyDefenderAction } from "@/lib/sim/defense";
import { initialState } from "@/lib/sim/engine";
import type { SimState } from "@/lib/sim/types";

function live(): SimState {
  return { ...initialState(), phase: "defend" };
}

function chain(state: SimState, ids: Parameters<typeof applyAttackerAction>[1][]) {
  for (const id of ids) {
    const res = applyAttackerAction(state, id);
    expect(res.error).toBeNull();
    state = res.state;
  }
  return state;
}

describe("attacker actions", () => {
  it("walks the full stage chain to BREACH", () => {
    const s = chain(live(), ["recon", "probe", "trigger", "groom", "uaf", "seize"]);
    expect(s.attackerStage).toBe("BREACH");
    expect(s.status).toBe("BREACHED");
    expect(s.heap.find((b) => b.tag === "UAF")?.state).toBe("stale");
  });

  it("enforces ordering — cannot groom before trigger", () => {
    const s = chain(live(), ["recon", "probe"]);
    const res = applyAttackerAction(s, "uaf");
    expect(res.error).toBeTruthy();
    expect(res.state).toBe(s); // unchanged
  });

  it("recon is required and cannot repeat", () => {
    const s = live();
    expect(applyAttackerAction(s, "probe").error).toBeTruthy();
    const s2 = chain(s, ["recon"]);
    expect(applyAttackerAction(s2, "recon").error).toBeTruthy();
  });

  it("blocked source halts attacker until rotate_source", () => {
    let s = chain(live(), ["recon", "probe"]);
    s = applyDefenderAction({ ...s, logsInspected: true }, "block_source");
    expect(s.sourceBlocked).toBe(true);
    expect(applyAttackerAction(s, "trigger").error).toContain("rotate");
    const rotated = applyAttackerAction(s, "rotate_source");
    expect(rotated.error).toBeNull();
    expect(rotated.state.sourceBlocked).toBe(false);
    expect(applyAttackerAction(rotated.state, "trigger").error).toBeNull();
  });

  it("rotate_source is a no-op without a block", () => {
    const s = chain(live(), ["recon"]);
    expect(applyAttackerAction(s, "rotate_source").error).toBeTruthy();
  });

  it("patch live deflects aggressive moves", () => {
    let s = chain(live(), ["recon", "probe"]);
    // stage + restart the real patch
    s = { ...s, versionInvestigated: true };
    s = applyDefenderAction(s, "apply_patch");
    s = applyDefenderAction(s, "restart_services");
    const res = applyAttackerAction(s, "trigger");
    expect(res.error).toBeNull();
    expect(res.state.attackerStage).toBe("DEFLECTED");
    expect(res.state.status).toBe("CONTAINED");
  });

  it("isolated worker blocks exploit-stage moves", () => {
    let s = chain(live(), ["recon", "probe", "trigger", "groom"]);
    s = applyDefenderAction({ ...s, logsInspected: true }, "isolate_worker");
    // isolation regressed the attacker to PROBE
    expect(s.attackerStage).toBe("PROBE");
    const res = applyAttackerAction(s, "trigger");
    expect(res.error).toContain("rotation");
  });

  it("no actions outside the defend phase", () => {
    const s = { ...initialState(), phase: "visualize" as const };
    expect(applyAttackerAction(s, "recon").error).toBeTruthy();
  });
});
