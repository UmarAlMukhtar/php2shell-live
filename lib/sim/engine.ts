import { ATTACKER_IP, AMBIENT_LOGS, HOSTNAME, WORKER_ID, log } from "./logs";
import { SERVER_PHP_VERSION, isVulnerable } from "./cve";
import { refIsStale } from "./invariants";
import { blkLabel, emit, emitDrafts, fmtAddr, freshBlock, stamp } from "./trace";
import type {
  AttackerActionId,
  AttackerStage,
  DefenderActionId,
  HeapBlock,
  HeapOp,
  LogEntry,
  SimReference,
  SimState,
  TermLine,
  VisualStep,
} from "./types";

export const HEAP_SIZE = 24;
const TERM_LIMIT = 160;
const LOG_LIMIT = 80;

/** Ticks required to complete each attacking stage during Defend. */
const STAGE_DURATION: Record<AttackerStage, number> = {
  IDLE: 0,
  RECON: 3,
  PROBE: 4,
  TRIGGER: 4,
  GROOM: 5,
  UAF: 3,
  BREACH: 0,
  DEFLECTED: 0,
};

export const STAGE_ORDER: AttackerStage[] = [
  "RECON",
  "PROBE",
  "TRIGGER",
  "GROOM",
  "UAF",
  "BREACH",
];

export function initialHeap(): HeapBlock[] {
  return Array.from({ length: HEAP_SIZE }, (_, id) => freshBlock(id));
}

export function initialState(): SimState {
  return {
    phase: "visualize",
    tick: 0,
    status: "SAFE",
    phpVersion: SERVER_PHP_VERSION,
    patchApplied: false,
    restartedAfterPatch: false,
    workerIsolated: false,
    sourceBlocked: false,
    logsInspected: false,
    versionInvestigated: false,
    verified: false,
    capacity: 100,
    restarts: 0,
    attackerStage: "IDLE",
    attackerProgress: 0,
    heap: initialHeap(),
    refs: [],
    heapSeq: 0,
    trace: [],
    logs: [
      withSeq(0, log("info", "system", `SIMULATION BOOT — fictional host ${HOSTNAME}`)),
      withSeq(1, log("info", "php-fpm", `pool www: ${WORKER_ID} ready (PHP ${SERVER_PHP_VERSION})`)),
    ],
    term: [
      { kind: "sys", text: "php2shell.sim — training sandbox (no real systems)" },
      { kind: "sys", text: `fictional host ${HOSTNAME} · PHP ${SERVER_PHP_VERSION} · ${WORKER_ID}` },
    ],
    actionsTaken: [],
    outcome: null,
    report: null,
    visualStepIndex: -1,
  };
}

function withSeq(seq: number, entry: Omit<LogEntry, "seq">): LogEntry {
  return { ...entry, seq };
}

export function pushLogs(state: SimState, entries: Array<Omit<LogEntry, "seq">>): SimState {
  if (entries.length === 0) return state;
  const start = state.logs.length;
  const next = entries.map((e, i) => withSeq(start + i, e));
  return { ...state, logs: [...state.logs, ...next].slice(-LOG_LIMIT) };
}

export function pushTerm(state: SimState, lines: TermLine[]): SimState {
  if (lines.length === 0) return state;
  return { ...state, term: [...state.term, ...lines].slice(-TERM_LIMIT) };
}

const FREEISH: ReadonlySet<HeapBlock["state"]> = new Set(["free", "freed"]);
const LIVE: ReadonlySet<HeapBlock["state"]> = new Set([
  "allocated",
  "reused",
  "stale",
  "corrupted",
]);

/**
 * Apply heap mutations with full lifetime bookkeeping: every op advances
 * the logical clock, records a history transition, bumps the generation on
 * re-issue, maintains the $GLOBALS reference set, and emits trace events.
 */
export function applyHeapOps(state: SimState, ops: HeapOp[]): SimState {
  if (!ops || ops.length === 0) return state;
  const heap = state.heap.map((b) => ({ ...b, history: [...b.history] }));
  const refs = state.refs.map((r) => ({ ...r }));
  let seq = state.heapSeq;
  const events = [] as ReturnType<typeof stamp>[];
  const push = (e: Omit<Parameters<typeof stamp>[1], "id" | "ts">) =>
    events.push(stamp(seq++, e));

  for (const op of ops) {
    const block = heap[op.id];
    if (!block || block.state === op.state && op.tag === undefined) continue;
    const prev = block.state;
    const wasStaleRefs = refs
      .filter((r) => r.targetId === op.id)
      .map((r) => ({ ...r, stale: refIsStale(r, block) }));

    // Re-issue bumps the generation — this is what a stale reference misses.
    // 'stale' counts as re-issued too: the dangling ref still captured the
    // old generation while the slot moved on to a new owner.
    const reissued =
      (op.state === "allocated" || op.state === "reused") &&
      (FREEISH.has(prev) || prev === "stale");
    if (reissued) {
      block.generation += 1;
    }
    block.state = op.state;
    if (op.tag !== undefined) block.tag = op.tag;
    if (op.state === "free") block.tag = null;
    block.owner = LIVE.has(op.state)
      ? (op.tag !== undefined ? op.tag : block.owner)
      : null;
    const histTs = seq;
    block.history.push({ ts: histTs, to: op.state });

    const addr = fmtAddr(block.addr);
    const owner = block.owner ?? "arena";

    if (reissued) {
      push({
        kind: prev === "free" && block.generation === 1 ? "alloc" : "reuse",
        subject: blkLabel(op.id),
        detail:
          prev === "free" && block.generation === 1
            ? `${blkLabel(op.id)} @${addr} allocated (gen${block.generation}) by ${owner}`
            : `${blkLabel(op.id)} @${addr} re-issued as gen${block.generation} to ${owner}`,
        before: prev,
        after: op.state,
      });
    } else if (op.state === "freed" || op.state === "free") {
      push({
        kind: "free",
        subject: blkLabel(op.id),
        detail: `${blkLabel(op.id)} @${addr} (gen${block.generation}) returned to the pool`,
        before: prev,
        after: op.state,
      });
      if (op.state === "free") {
        // Full reset (restart) — the referencing scope is wiped too.
        for (let i = refs.length - 1; i >= 0; i--) {
          if (refs[i]!.targetId === op.id) refs.splice(i, 1);
        }
      }
    } else if (op.state === "stale") {
      // Abnormal cleanup left $GLOBALS pointing at this allocation.
      const ref: SimReference = {
        id: `globals->${op.id}`,
        source: "$GLOBALS",
        targetId: op.id,
        generation: block.generation,
      };
      const existing = refs.findIndex((r) => r.id === ref.id);
      if (existing >= 0) refs[existing] = ref;
      else refs.push(ref);
      push({
        kind: "ref_create",
        subject: "$GLOBALS",
        detail: `$GLOBALS captured ${blkLabel(op.id)} @${addr} (gen${block.generation}) — abnormal cleanup left it dangling`,
        before: prev,
        after: op.state,
      });
    } else if (op.state === "corrupted") {
      push({
        kind: "unsafe_access",
        subject: blkLabel(op.id),
        detail: `write/read through an invalid reference corrupted ${blkLabel(op.id)} @${addr} — modeled UAF`,
        before: prev,
        after: op.state,
      });
    } else {
      push({
        kind: "reuse",
        subject: blkLabel(op.id),
        detail: `${blkLabel(op.id)} @${addr}: ${prev} → ${op.state} (gen${block.generation}, ${owner})`,
        before: prev,
        after: op.state,
      });
    }

    // Any transition that invalidates a previously-valid ref is a violation.
    for (const w of wasStaleRefs) {
      const now = refs.find((r) => r.id === w.id);
      if (!w.stale && now && refIsStale(now, block)) {
        push({
          kind: "stale_detected",
          subject: now.source,
          detail: `${now.source}→${blkLabel(op.id)} now INVALID — captured gen${now.generation}, block is gen${block.generation}`,
        });
      }
    }
  }

  return emit({ ...state, heap, refs }, events);
}

/** True once the patched build is actually running (staged AND restarted). */
export function isPatchLive(state: SimState): boolean {
  return state.patchApplied && state.restartedAfterPatch && !isVulnerable(state.phpVersion);
}

export function patchStagedButNotLive(state: SimState): boolean {
  return state.patchApplied && !state.restartedAfterPatch;
}

/** Apply one scripted step of the Visualize timeline. */
export function applyVisualStep(state: SimState, index: number, step: VisualStep): SimState {
  let next = { ...state, visualStepIndex: index };
  if (step.status) next = { ...next, status: step.status };
  if (step.attackerStage) next = { ...next, attackerStage: step.attackerStage };
  if (step.heapOps) next = applyHeapOps(next, step.heapOps);
  if (step.trace) {
    next = emitDrafts(next, step.trace);
  }
  if (step.term) next = pushTerm(next, step.term);
  if (step.logs) next = pushLogs(next, step.logs);
  return next;
}

export function enterStageInternal(state: SimState, stage: AttackerStage): SimState {
  let next = { ...state, attackerStage: stage, attackerProgress: 0 };
  const lines: TermLine[] = [];
  const entries: Array<Omit<LogEntry, "seq">> = [];

  switch (stage) {
    case "PROBE":
      entries.push(
        log("warn", "nginx", `POST /upload.php 413 oversized body from ${ATTACKER_IP}`),
        log("warn", WORKER_ID, `request #117 fatals: memory_limit exceeded mid-init`),
      );
      lines.push(
        { kind: "in", text: "php2shell> probe --target app-01 --cve CVE-2026-109619" },
        { kind: "out", text: "fingerprinting worker reuse on php-fpm pool…" },
      );
      break;
    case "TRIGGER":
      entries.push(
        log("error", WORKER_ID, `E_ERROR during request #118 — partial global-state reset`),
      );
      lines.push({ kind: "err", text: "[sim] fatal error leaves global state pointing at freed request arena" });
      break;
    case "GROOM":
      entries.push(
        log("warn", "nginx", `burst of 6 POSTs /upload.php from ${ATTACKER_IP} (heap grooming)`),
      );
      lines.push({ kind: "out", text: "[sim] grooming heap: re-occupying the freed arena…" });
      break;
    case "UAF":
      entries.push(
        log("crit", WORKER_ID, `request #119 reads stale global pointer → heap-use-after-free`),
      );
      lines.push({ kind: "err", text: "[sim] USE-AFTER-FREE: stale global state dereferenced on reused block" });
      break;
    case "BREACH":
      next = { ...next, status: "BREACHED" };
      entries.push(
        log("crit", "kernel", `${WORKER_ID} crashed — attacker-controlled state observed (simulated)`),
      );
      lines.push(
        { kind: "err", text: "[sim] worker crash — modeled compromise path reached" },
        { kind: "sys", text: "INCIDENT STATUS: BREACHED" },
      );
      break;
    case "DEFLECTED":
      next = { ...next, status: "CONTAINED" };
      entries.push(
        log("info", WORKER_ID, `patched build reset global state correctly — attack deflected`),
      );
      lines.push({ kind: "ok", text: "[sim] patched runtime: trigger no longer leaves stale state — deflected" });
      break;
    default:
      break;
  }
  next = pushTerm(next, lines);
  next = pushLogs(next, entries);
  return next;
}

/** Advance the simulated attacker by one tick (Defend phase). */
export function tick(state: SimState): SimState {
  if (state.phase !== "defend") return { ...state, tick: state.tick + 1 };
  let next = { ...state, tick: state.tick + 1 };

  if (state.attackerStage === "IDLE") {
    next = enterStageInternal(next, "RECON");
    next = pushLogs(next, [
      log("warn", "ids", `port scan pattern from ${ATTACKER_IP}`),
    ]);
    return next;
  }

  const stage = next.attackerStage;
  if (
    stage === "BREACH" ||
    stage === "DEFLECTED" ||
    stage === "IDLE"
  ) {
    // Ambient noise only.
    if (next.tick % 4 === 0) {
      next = pushLogs(next, [AMBIENT_LOGS[next.tick % AMBIENT_LOGS.length]!]);
    }
    return next;
  }

  // Patch live ⇒ the next aggressive step fails outright.
  if (isPatchLive(next) && (stage === "RECON" || stage === "PROBE" || stage === "TRIGGER")) {
    next = enterStageInternal(next, "DEFLECTED");
    return next;
  }

  // Rate modifiers — defense slows but does not remediate.
  const idx = STAGE_ORDER.indexOf(stage);
  const duration = STAGE_DURATION[stage];
  let rate = 1;
  if (next.sourceBlocked) rate *= 0.5;
  if (next.workerIsolated && idx >= STAGE_ORDER.indexOf("GROOM")) rate *= 0.4;
  next = { ...next, attackerProgress: next.attackerProgress + rate };

  if (next.tick % 4 === 0) {
    next = pushLogs(next, [AMBIENT_LOGS[next.tick % AMBIENT_LOGS.length]!]);
  }

  if (next.attackerProgress >= duration) {
    const following = STAGE_ORDER[idx + 1];
    if (following) {
      if (following === "BREACH" && isPatchLive(next)) {
        next = enterStageInternal(next, "DEFLECTED");
      } else if (following === "TRIGGER" && isPatchLive(next)) {
        next = enterStageInternal(next, "DEFLECTED");
      } else {
        next = enterStageInternal(next, following);
      }
    }
  }
  return next;
}

export interface ActionGate {
  allowed: boolean;
  reason: string | null;
}

export type SimAction =
  | { type: "TICK" }
  | { type: "VISUAL_STEP"; index: number; step: VisualStep }
  | { type: "VISUAL_NEXT" }
  | { type: "VISUAL_GOTO"; index: number }
  | { type: "VISUAL_RESTART" }
  | { type: "DEFEND"; action: DefenderActionId }
  | { type: "ATTACK"; action: AttackerActionId }
  | { type: "SET_PHASE"; phase: SimState["phase"] }
  | { type: "RESET" }
  | { type: "HYDRATE"; state: SimState };
