import { CVE, TARGET_PATCH_VERSION, isVulnerable } from "./cve";
import { isPatchLive, patchStagedButNotLive, pushLogs, pushTerm } from "./engine";
import { WORKER_ID, log } from "./logs";
import type { SimState, TermLine, VerifyReport } from "./types";

/**
 * Replay the modeled attack against the defended host. Deterministic: the
 * outcome depends only on which controls are live.
 */
export function runVerification(state: SimState): { state: SimState; report: VerifyReport } {
  const transcript: TermLine[] = [
    { kind: "sys", text: "── VERIFY: replaying modeled attack against defended host ──" },
    { kind: "in", text: "verify> replay CVE-2026-109619 scenario" },
    { kind: "out", text: `  target runtime: PHP ${state.phpVersion}` },
  ];

  const missing: string[] = [];
  let outcome: "success" | "failed";

  if (isPatchLive(state)) {
    outcome = "success";
    transcript.push(
      { kind: "out", text: "  probe → trigger attempt: global state reset correctly" },
      { kind: "ok", text: "  no stale pointer survives request shutdown — UAF impossible" },
      { kind: "ok", text: `  ${WORKER_ID} survives replay. STATUS: PATCHED` },
    );
  } else {
    outcome = "failed";
    if (patchStagedButNotLive(state)) {
      missing.push("restart_missing");
      transcript.push(
        { kind: "out", text: `  patch ${TARGET_PATCH_VERSION} staged but NOT running` },
        { kind: "err", text: `  workers still execute PHP ${state.phpVersion} — stale state reproduced` },
        { kind: "err", text: "  replay result: UAF path reachable. STATUS: STILL VULNERABLE" },
      );
    } else if (state.restarts > 0) {
      missing.push("runtime_not_patched");
      transcript.push(
        { kind: "out", text: "  restart cleared stale state — temporarily" },
        { kind: "err", text: `  PHP ${state.phpVersion} re-introduces the bug under load` },
        { kind: "err", text: "  replay result: UAF path reachable. STATUS: STILL VULNERABLE" },
      );
    } else if (state.sourceBlocked) {
      missing.push("perimeter_only");
      transcript.push(
        { kind: "out", text: "  blocked IP bypassed via alternate source (simulated)" },
        { kind: "err", text: "  memory bug unchanged — replay reaches UAF" },
        { kind: "err", text: "  replay result: UAF path reachable. STATUS: STILL VULNERABLE" },
      );
    } else {
      missing.push("no_remediation");
      transcript.push(
        { kind: "err", text: "  no remediation in place — replay reaches UAF unchanged" },
        { kind: "err", text: "  replay result: UAF path reachable. STATUS: STILL VULNERABLE" },
      );
    }
  }

  const lessons = buildLessons(state, outcome);
  const report: VerifyReport = {
    outcome,
    summary:
      outcome === "success"
        ? `${CVE.id} remediated — PHP ${TARGET_PATCH_VERSION} live, replay deflected.`
        : `Replay succeeded — the runtime is still vulnerable to ${CVE.id}.`,
    missingControls: missing,
    actionsTaken: state.actionsTaken,
    restarts: state.restarts,
    capacity: state.capacity,
    transcript,
    lessons,
  };

  let next: SimState = {
    ...state,
    phase: "report",
    verified: true,
    outcome,
    report,
    status: outcome === "success" ? "PATCHED" : "BREACHED",
    attackerStage: outcome === "success" ? "DEFLECTED" : "BREACH",
  };
  next = pushTerm(next, transcript);
  next = pushLogs(next, [
    log(outcome === "success" ? "info" : "crit", "verify",
      outcome === "success"
        ? `replay deflected — ${CVE.id} remediated on PHP ${TARGET_PATCH_VERSION}`
        : `replay succeeded — host still vulnerable to ${CVE.id}`),
  ]);
  return { state: next, report };
}

function buildLessons(state: SimState, outcome: "success" | "failed"): string[] {
  const lessons: string[] = [];
  if (outcome === "success") {
    lessons.push(
      `${CVE.id} (${CVE.cvss.split(" ")[0]} ${CVE.cvss.split(" ")[1]}) is a stale-global-state UAF: only a patched runtime removes the bug.`,
      "Blocking the source IP and isolating the worker bought time but could not remediate — defense-in-depth, not a fix.",
      "A patch only counts once services restart onto the new build; verification replay confirmed it.",
    );
    if (state.restarts > 1) {
      lessons.push("Each restart costs capacity and uptime — patch first, then restart once.");
    }
  } else {
    if (state.patchApplied && !state.restartedAfterPatch) {
      lessons.push("Staged ≠ patched: the old build kept serving until restart.");
    }
    if (!state.patchApplied) {
      lessons.push(`Only PHP ${TARGET_PATCH_VERSION}+ closes the stale-state reset bug for this release line.`);
    }
    if (state.sourceBlocked && !state.patchApplied) {
      lessons.push("Perimeter blocking slows an attacker; it never changes the vulnerable code.");
    }
    if (state.restarts > 0 && !state.patchApplied) {
      lessons.push("Restarting resets memory state but the vulnerable binary returns the same bug.");
    }
    lessons.push("Return to Defend, apply the correct patch, restart once, verify again.");
  }
  return lessons;
}
