import { applyVisualStep, initialState } from "./engine";
import { emitDrafts } from "./trace";
import { heapInvariants, refIsStale } from "./invariants";
import { CVE, SERVER_PHP_VERSION, TARGET_PATCH_VERSION } from "./cve";
import { VISUAL_TIMELINE } from "./scenario";
import type {
  HeapOp,
  SimState,
  TraceEvent,
  VisualStep,
} from "./types";

export interface ReplayFrame {
  step: number;
  title: string;
  heap: SimState["heap"];
  refs: SimState["refs"];
  status: SimState["status"];
  /** Trace events emitted by this step. */
  events: TraceEvent[];
}

export interface ReplayRun {
  label: string;
  version: string;
  patched: boolean;
  frames: ReplayFrame[];
  final: SimState;
}

export interface ReplayDiff {
  a: ReplayRun;
  b: ReplayRun;
  /** First frame index where the two heaps/status diverge; -1 = identical. */
  divergence: number;
  divergenceNote: string;
}

/**
 * One scripted step executed under a runtime configuration. On the patched
 * build the abnormal cleanup is complete: 'stale'/'corrupted' transitions
 * cannot take hold — the allocation is simply released, so the read that
 * would have been a UAF reads ordinary live data instead. Whether the
 * incident escalates is decided by the invariants, not by coloring.
 */
function applyStepFor(
  state: SimState,
  index: number,
  step: VisualStep,
  patched: boolean,
): SimState {
  if (!patched) return applyVisualStep(state, index, step);

  const ops: HeapOp[] | undefined = step.heapOps?.map((op) => {
    if (op.state === "stale") return { ...op, state: "freed" as const };
    if (op.state === "corrupted") return { ...op, state: "reused" as const };
    return op;
  });

  let next = applyVisualStep(
    state,
    index,
    ops === step.heapOps ? step : { ...step, heapOps: ops },
  );

  // Escalation only stands when a genuine invariant violation exists.
  if (step.status === "BREACHED") {
    const violations = next.refs.filter((r) =>
      refIsStale(r, next.heap[r.targetId]),
    );
    if (violations.length === 0) {
      next = { ...next, status: "CONTAINED", attackerStage: "DEFLECTED" };
      next = emitDrafts(next, [
        {
          kind: "verify",
          subject: "runtime",
          detail:
            "no invalid references after cleanup — compromise path absent; incident contained",
        },
      ]);
    }
  }
  return next;
}

/** Execute the timeline once under the given runtime model. */
export function runTimeline(patched: boolean): ReplayRun {
  let state = initialState();
  if (patched) {
    state = {
      ...state,
      phpVersion: TARGET_PATCH_VERSION,
      patchApplied: true,
      restartedAfterPatch: true,
    };
  }
  const frames: ReplayFrame[] = [];
  VISUAL_TIMELINE.forEach((step, index) => {
    const before = state.trace.length;
    state = applyStepFor(state, index, step, patched);
    frames.push({
      step: index,
      title: step.title,
      heap: state.heap.map((b) => ({ ...b })),
      refs: state.refs.map((r) => ({ ...r })),
      status: state.status,
      events: state.trace.slice(before),
    });
  });
  return {
    label: patched ? `PHP ${TARGET_PATCH_VERSION} (patched)` : `PHP ${SERVER_PHP_VERSION} (vulnerable)`,
    version: patched ? TARGET_PATCH_VERSION : SERVER_PHP_VERSION,
    patched,
    frames,
    final: state,
  };
}

const heapKey = (s: SimState["heap"]) =>
  s.map((b) => `${b.id}:${b.state}:${b.generation}`).join("|");

/** Run both models and locate the first meaningful divergence. */
export function runDiff(): ReplayDiff {
  const a = runTimeline(false);
  const b = runTimeline(true);

  let divergence = -1;
  for (let i = 0; i < a.frames.length && i < b.frames.length; i++) {
    const fa = a.frames[i]!;
    const fb = b.frames[i]!;
    if (heapKey(fa.heap) !== heapKey(fb.heap) || fa.status !== fb.status) {
      divergence = i;
      break;
    }
  }

  let divergenceNote = "runs are identical — no divergence found";
  if (divergence >= 0) {
    const fa = a.frames[divergence]!;
    const fb = b.frames[divergence]!;
    const diff = fa.heap
      .map((blk, i) => ({ blk, other: fb.heap[i]! }))
      .filter(({ blk, other }) => blk.state !== other.state);
    if (diff.length > 0) {
      divergenceNote = diff
        .map(
          ({ blk, other }) =>
            `blk#${blk.id}: ${SERVER_PHP_VERSION} → ${blk.state} vs ${TARGET_PATCH_VERSION} → ${other.state}`,
        )
        .join("; ");
    } else {
      divergenceNote = `status diverged: ${fa.status} vs ${fb.status}`;
    }
  }

  return { a, b, divergence, divergenceNote };
}

/** Compact per-check summary for the validation panel. */
export function diffSummary(diff: ReplayDiff) {
  const breachA = diff.a.final.status === "BREACHED";
  const breachB = diff.b.final.status === "BREACHED";
  return {
    outcome: `${diff.a.label} ends ${diff.a.final.status}; ${diff.b.label} ends ${diff.b.final.status}`,
    breachDelta: breachA !== breachB,
    invariantsA: heapInvariants(diff.a.final).every((c) => c.ok),
    invariantsB: heapInvariants(diff.b.final).every((c) => c.ok),
    cve: CVE.id,
  };
}
