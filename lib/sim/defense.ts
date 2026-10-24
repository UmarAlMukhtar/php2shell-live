import { CVE, SERVER_PHP_VERSION, TARGET_PATCH_VERSION } from "./cve";
import {
  applyHeapOps,
  pushLogs,
  pushTerm,
  STAGE_ORDER,
} from "./engine";
import { ATTACKER_IP, WORKER_ID, log } from "./logs";
import type { DefenderActionId, SimState } from "./types";

export interface DefenderActionDef {
  id: DefenderActionId;
  label: string;
  hint: string;
  /** Returns a blocking reason, or null when the action may run. */
  prereq(state: SimState): string | null;
  /** Skip reasons for repeating the action (button disabled state). */
  doneReason(state: SimState): string | null;
  apply(state: SimState): SimState;
}

export const DEFENDER_ACTIONS: readonly DefenderActionDef[] = [
  {
    id: "inspect_logs",
    label: "Inspect logs",
    hint: "Correlate web and PHP-FPM logs to identify the suspicious source.",
    prereq: () => null,
    doneReason: (s) => (s.logsInspected ? "Logs already triaged" : null),
    apply: (s) => {
      let next = { ...s, logsInspected: true };
      next = pushLogs(next, [
        log("info", "soc", `triage: correlating nginx + php-fpm error logs`),
        log("warn", "soc", `pattern found: oversized POSTs + worker crash from ${ATTACKER_IP}`),
      ]);
      next = pushTerm(next, [
        { kind: "in", text: "soc> logs --since 15m --source nginx,php-fpm" },
        { kind: "out", text: `  12 anomalies — oversized POST /upload.php from ${ATTACKER_IP}` },
        { kind: "out", text: `  ${WORKER_ID}: E_ERROR during request, partial state reset` },
        { kind: "sys", text: "  lead: single source IP, same-worker request reuse pattern" },
      ]);
      return recordAction(next, "inspect_logs");
    },
  },
  {
    id: "investigate_version",
    label: "Investigate PHP version",
    hint: "Check the runtime against the CVE-2026-109619 advisory.",
    prereq: () => null,
    doneReason: (s) => (s.versionInvestigated ? "Version already assessed" : null),
    apply: (s) => {
      let next = { ...s, versionInvestigated: true };
      next = pushLogs(next, [
        log("info", "soc", `runtime audit: PHP ${SERVER_PHP_VERSION} vs advisory ${CVE.ghsa}`),
        log("crit", "soc", `VULNERABLE: ${SERVER_PHP_VERSION} < ${TARGET_PATCH_VERSION} (${CVE.id})`),
      ]);
      next = pushTerm(next, [
        { kind: "in", text: "soc> php -v && advisory check CVE-2026-109619" },
        { kind: "out", text: `  PHP ${SERVER_PHP_VERSION} (cli) — AFFECTED` },
        { kind: "out", text: `  stale global state → UAF; fix: ${TARGET_PATCH_VERSION}` },
      ]);
      return recordAction(next, "investigate_version");
    },
  },
  {
    id: "block_source",
    label: "Block suspicious source",
    hint: "Rate-limit the attacking IP at the edge. Buys time — does NOT fix the runtime.",
    prereq: (s) =>
      s.logsInspected
        ? null
        : "Inspect logs first — you need the offending source.",
    doneReason: (s) => (s.sourceBlocked ? "Source already blocked" : null),
    apply: (s) => {
      let next = { ...s, sourceBlocked: true };
      next = pushLogs(next, [
        log("info", "edge", `firewall: deny ${ATTACKER_IP}/32 — request rate dropped`),
        log("warn", "soc", `note: runtime still vulnerable — attacker can re-source`),
      ]);
      next = pushTerm(next, [
        { kind: "in", text: `soc> firewall deny ${ATTACKER_IP}` },
        { kind: "out", text: "  rule installed — probing slows, bug unchanged" },
      ]);
      // Attacker must find a new source — regress and slow.
      if (STAGE_ORDER.indexOf(next.attackerStage) > STAGE_ORDER.indexOf("PROBE")) {
        next = { ...next, attackerStage: "PROBE", attackerProgress: 0 };
      }
      return recordAction(next, "block_source");
    },
  },
  {
    id: "isolate_worker",
    label: "Isolate the worker",
    hint: "Pull php-fpm-07 out of rotation. Cuts capacity ~40%; stops same-worker reuse.",
    prereq: (s) =>
      s.logsInspected
        ? null
        : "Inspect logs first — you need to know which worker is hit.",
    doneReason: (s) => (s.workerIsolated ? "Worker already isolated" : null),
    apply: (s) => {
      let next = {
        ...s,
        workerIsolated: true,
        capacity: Math.max(20, s.capacity - 40),
      };
      next = pushLogs(next, [
        log("warn", "php-fpm", `${WORKER_ID} isolated from pool — capacity ${next.capacity}%`),
      ]);
      next = pushTerm(next, [
        { kind: "in", text: `soc> fpm isolate ${WORKER_ID}` },
        { kind: "out", text: `  ${WORKER_ID} quarantined — heap grooming stalls` },
      ]);
      if (STAGE_ORDER.indexOf(next.attackerStage) >= STAGE_ORDER.indexOf("GROOM")) {
        next = { ...next, attackerStage: "PROBE", attackerProgress: 0 };
      }
      return recordAction(next, "isolate_worker");
    },
  },
  {
    id: "apply_patch",
    label: `Apply patch ${TARGET_PATCH_VERSION}`,
    hint: `Stage PHP ${TARGET_PATCH_VERSION} — the CVE-2026-109619 fix for the 8.3 line.`,
    prereq: (s) =>
      s.versionInvestigated
        ? null
        : "Investigate the PHP version first — pick the right patch.",
    doneReason: (s) =>
      s.patchApplied ? "Patch already staged" : null,
    apply: (s) => {
      let next = { ...s, patchApplied: true };
      next = pushLogs(next, [
        log("info", "pkg", `php ${TARGET_PATCH_VERSION} staged (fixes ${CVE.id})`),
        log("warn", "pkg", `running build still ${SERVER_PHP_VERSION} — restart required`),
      ]);
      next = pushTerm(next, [
        { kind: "in", text: `soc> pkg install php=${TARGET_PATCH_VERSION}` },
        { kind: "out", text: "  staged. Old workers still serve traffic until restart." },
      ]);
      return recordAction(next, "apply_patch");
    },
  },
  {
    id: "restart_services",
    label: "Restart services",
    hint: "Bounce php-fpm: clears stale global state, loads staged build. Brief downtime.",
    prereq: () => null,
    doneReason: () => null,
    apply: (s) => {
      let next = {
        ...s,
        restarts: s.restarts + 1,
        capacity: Math.max(20, s.capacity - 10),
        attackerProgress: 0,
      };
      // Fresh worker: heap fully reset.
      next = applyHeapOps(
        next,
        next.heap.map((b) => ({ id: b.id, state: "free" as const })),
      );
      const patched = next.patchApplied;
      if (patched) {
        next = {
          ...next,
          phpVersion: TARGET_PATCH_VERSION,
          restartedAfterPatch: true,
          status: "CONTAINED",
        };
      }
      // A restart wipes request arena → attacker loses the groomed heap.
      if (STAGE_ORDER.indexOf(next.attackerStage) > STAGE_ORDER.indexOf("PROBE")) {
        next = { ...next, attackerStage: "PROBE" };
      }
      next = pushLogs(next, [
        log("info", "php-fpm", `graceful restart — pool reloaded${patched ? ` on PHP ${TARGET_PATCH_VERSION}` : ""}`),
        ...(patched
          ? [log("info", "soc", "patch now live — stale-state reset fixed")]
          : [log("warn", "soc", `still running ${SERVER_PHP_VERSION} — vulnerability unchanged`)]),
      ]);
      next = pushTerm(next, [
        { kind: "in", text: "soc> systemctl reload php-fpm" },
        patched
          ? { kind: "ok", text: `  workers up on PHP ${TARGET_PATCH_VERSION} — patch LIVE` }
          : { kind: "out", text: `  workers up on PHP ${SERVER_PHP_VERSION} — still vulnerable` },
      ]);
      return recordAction(next, "restart_services");
    },
  },
] as const;

export function getAction(id: DefenderActionId): DefenderActionDef {
  const def = DEFENDER_ACTIONS.find((a) => a.id === id);
  if (!def) throw new Error(`unknown action ${id}`);
  return def;
}

function recordAction(state: SimState, id: DefenderActionId): SimState {
  return state.actionsTaken.includes(id)
    ? state
    : { ...state, actionsTaken: [...state.actionsTaken, id] };
}

export function applyDefenderAction(state: SimState, id: DefenderActionId): SimState {
  const def = getAction(id);
  if (def.prereq(state) !== null || def.doneReason(state) !== null) return state;
  return def.apply(state);
}
