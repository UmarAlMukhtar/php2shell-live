import {
  applyHeapOps,
  enterStageInternal,
  isPatchLive,
  pushLogs,
  pushTerm,
  STAGE_ORDER,
} from "./engine";
import { ATTACKER_IP, WORKER_ID, log } from "./logs";
import type { AttackerActionId, AttackerStage, SimState } from "./types";

/** Second fictional source used after the defender blocks the first one. */
const ROTATED_IP = "203.0.113.66"; // RFC 5737 TEST-NET-3

export interface AttackerActionDef {
  id: AttackerActionId;
  label: string;
  hint: string;
  /** Returns a blocking reason, or null when the action may run. */
  prereq(state: SimState): string | null;
  /** Skip reasons for repeating the action (button disabled state). */
  doneReason(state: SimState): string | null;
  apply(state: SimState): SimState;
}

function blockedByEdge(s: SimState): string | null {
  return s.sourceBlocked ? "Source is firewalled — rotate to a new source." : null;
}

function workerGone(s: SimState): string | null {
  return s.workerIsolated ? "Target worker is out of rotation." : null;
}

function at(s: SimState, stage: AttackerStage): boolean {
  return STAGE_ORDER.indexOf(s.attackerStage) === STAGE_ORDER.indexOf(stage);
}

function before(s: SimState, stage: AttackerStage): boolean {
  return STAGE_ORDER.indexOf(s.attackerStage) < STAGE_ORDER.indexOf(stage);
}

/** Patch live ⇒ aggressive stages deflect instead of progressing. */
function aggressive(s: SimState, stage: AttackerStage): SimState {
  if (isPatchLive(s)) return enterStageInternal(s, "DEFLECTED");
  return enterStageInternal(s, stage);
}

export const ATTACKER_ACTIONS: readonly AttackerActionDef[] = [
  {
    id: "recon",
    label: "Recon the target",
    hint: "Fingerprint the php-fpm pool and worker reuse behavior.",
    prereq: (s) => (s.phase !== "defend" ? "Incident not live yet." : null),
    doneReason: (s) => (s.attackerStage !== "IDLE" ? "Recon already done" : null),
    apply: (s) => {
      let next = enterStageInternal(s, "RECON");
      next = pushLogs(next, [log("warn", "ids", `port scan pattern from ${ATTACKER_IP}`)]);
      next = pushTerm(next, [
        { kind: "in", text: "php2shell> recon --target app-01 --cve CVE-2026-109619" },
        { kind: "out", text: `php-fpm pool mapped — ${WORKER_ID} shares request arena` },
      ]);
      return next;
    },
  },
  {
    id: "probe",
    label: "Probe worker reuse",
    hint: "Oversized POSTs to confirm same-worker request reuse.",
    prereq: blockedByEdge,
    doneReason: (s) =>
      at(s, "RECON")
        ? null
        : before(s, "RECON")
          ? "Recon first — then probe."
          : "Already past probing.",
    apply: (s) => enterStageInternal(s, "PROBE"),
  },
  {
    id: "trigger",
    label: "Trigger the fatal error",
    hint: "Force memory_limit exhaustion mid-request — partial global-state reset.",
    prereq: (s) => blockedByEdge(s) ?? workerGone(s),
    doneReason: (s) =>
      at(s, "PROBE")
        ? null
        : before(s, "PROBE")
          ? "Probe must complete first."
          : "Fatal already triggered.",
    apply: (s) => aggressive(s, "TRIGGER"),
  },
  {
    id: "groom",
    label: "Groom the heap",
    hint: "Burst of requests to re-occupy the freed request arena.",
    prereq: (s) => blockedByEdge(s) ?? workerGone(s),
    doneReason: (s) =>
      at(s, "TRIGGER")
        ? null
        : before(s, "TRIGGER")
          ? "Trigger the fatal error first."
          : "Heap already groomed.",
    apply: (s) => {
      let next = aggressive(s, "GROOM");
      if (next.attackerStage !== "GROOM") return next;
      next = applyHeapOps(next, [
        { id: 7, state: "reused", tag: "req#120" },
        { id: 8, state: "reused", tag: "req#120" },
        { id: 9, state: "reused", tag: "req#121" },
        { id: 10, state: "reused", tag: "req#121" },
      ]);
      return next;
    },
  },
  {
    id: "uaf",
    label: "Dereference stale pointer",
    hint: "Read through the dangling global-state pointer — the UAF.",
    prereq: (s) => blockedByEdge(s) ?? workerGone(s),
    doneReason: (s) =>
      at(s, "GROOM")
        ? null
        : before(s, "GROOM")
          ? "Groom the heap first."
          : "UAF already landed.",
    apply: (s) => {
      let next = aggressive(s, "UAF");
      if (next.attackerStage !== "UAF") return next;
      next = applyHeapOps(next, [
        { id: 6, state: "stale", tag: "UAF" },
        { id: 7, state: "corrupted", tag: "ctrl" },
      ]);
      return next;
    },
  },
  {
    id: "seize",
    label: "Seize the worker",
    hint: "Steer attacker-influenced state — the modeled compromise.",
    prereq: (s) => blockedByEdge(s) ?? workerGone(s),
    doneReason: (s) =>
      at(s, "UAF")
        ? null
        : before(s, "UAF")
          ? "Reach the UAF first."
          : "End state reached.",
    apply: (s) => aggressive(s, "BREACH"),
  },
  {
    id: "rotate_source",
    label: "Rotate attack source",
    hint: "Come back from a new address after the defender blocks you.",
    prereq: (s) =>
      s.sourceBlocked ? null : "No block in place — no need to rotate.",
    doneReason: () => null,
    apply: (s) => {
      let next = { ...s, sourceBlocked: false };
      next = pushLogs(next, [
        log("warn", "nginx", `new probing source ${ROTATED_IP} — previous IP still blocked`),
      ]);
      next = pushTerm(next, [
        { kind: "in", text: `php2shell> source --rotate → ${ROTATED_IP}` },
        { kind: "out", text: `egress switched — resumes as ${ROTATED_IP}` },
      ]);
      return next;
    },
  },
] as const;

export function getAttackAction(id: AttackerActionId): AttackerActionDef {
  const def = ATTACKER_ACTIONS.find((a) => a.id === id);
  if (!def) throw new Error(`unknown attacker action ${id}`);
  return def;
}

/** Gate + apply; returns the next state plus an error when the move is illegal. */
export function applyAttackerAction(
  state: SimState,
  id: AttackerActionId,
): { state: SimState; error: string | null } {
  const def = getAttackAction(id);
  const reason = def.prereq(state) ?? def.doneReason(state);
  if (reason !== null) return { state, error: reason };
  return { state: def.apply(state), error: null };
}
