import { describe, expect, it } from "vitest";
import { applyDefenderAction } from "@/lib/sim/defense";
import { initialState } from "@/lib/sim/engine";
import { reduce } from "@/lib/sim/reducer";
import { runVerification } from "@/lib/sim/verify";
import type { DefenderActionId, SimState } from "@/lib/sim/types";

function defended(ids: DefenderActionId[]): SimState {
  let s: SimState = { ...initialState(), phase: "defend" };
  for (const id of ids) s = applyDefenderAction(s, id);
  return s;
}

describe("verification replay", () => {
  it("PATCHED when patch is applied and services restarted", () => {
    const s = defended(["inspect_logs", "investigate_version", "apply_patch", "restart_services"]);
    const { state, report } = runVerification(s);
    expect(report.outcome).toBe("success");
    expect(state.status).toBe("PATCHED");
    expect(state.phase).toBe("report");
  });

  it("fails when patch is staged but never restarted", () => {
    const s = defended(["inspect_logs", "investigate_version", "apply_patch"]);
    const { report } = runVerification(s);
    expect(report.outcome).toBe("failed");
    expect(report.missingControls).toContain("restart_missing");
  });

  it("fails when only the source IP is blocked", () => {
    const s = defended(["inspect_logs", "block_source"]);
    const { report } = runVerification(s);
    expect(report.outcome).toBe("failed");
    expect(report.missingControls).toContain("perimeter_only");
  });

  it("fails when restarted without a patch", () => {
    const s = defended(["restart_services"]);
    const { report } = runVerification(s);
    expect(report.outcome).toBe("failed");
    expect(report.missingControls).toContain("runtime_not_patched");
  });

  it("fails with no remediation at all", () => {
    const { report } = runVerification(defended([]));
    expect(report.outcome).toBe("failed");
    expect(report.missingControls).toContain("no_remediation");
  });
});

describe("reducer plumbing", () => {
  it("reset returns a fresh visualize state", () => {
    const s = defended(["inspect_logs", "block_source", "restart_services"]);
    const fresh = reduce(s, { type: "RESET" });
    expect(fresh.phase).toBe("visualize");
    expect(fresh.actionsTaken).toHaveLength(0);
    expect(fresh.status).toBe("SAFE");
  });

  it("hydrate restores a serialized state (refresh recovery)", () => {
    const s = defended(["inspect_logs", "investigate_version", "apply_patch"]);
    const revived = reduce(initialState(), {
      type: "HYDRATE",
      state: JSON.parse(JSON.stringify(s)) as SimState,
    });
    expect(revived.patchApplied).toBe(true);
    expect(revived.versionInvestigated).toBe(true);
    expect(revived.actionsTaken).toEqual(["inspect_logs", "investigate_version", "apply_patch"]);
  });
});
