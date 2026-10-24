import type {
  HeapBlock,
  SimState,
  TraceEvent,
  TraceKind,
} from "./types";

export const TRACE_LIMIT = 240;

/** Simulated address for a heap slot — educational, not byte-accurate. */
export const blockAddr = (id: number): number => 0x7f000000 + id * 0x40;

export const fmtAddr = (a: number): string =>
  `0x${a.toString(16).padStart(10, "0")}`;

export const blkLabel = (id: number): string => `blk#${id}`;

export interface DraftEvent {
  kind: TraceKind;
  subject: string;
  detail: string;
  before?: string;
  after?: string;
}

/** Stamp a draft with the current logical clock value. */
export function stamp(seq: number, e: DraftEvent): TraceEvent {
  return { ...e, ts: seq, id: `e${seq}` };
}

/** Append already-stamped events and advance the clock past the last one. */
export function emit(state: SimState, events: TraceEvent[]): SimState {
  if (events.length === 0) return state;
  const last = events[events.length - 1]!.ts;
  return {
    ...state,
    heapSeq: last + 1,
    trace: [...state.trace, ...events].slice(-TRACE_LIMIT),
  };
}

/** Append drafts, stamping them from the state's clock. */
export function emitDrafts(state: SimState, drafts: DraftEvent[]): SimState {
  if (drafts.length === 0) return state;
  const stamped = drafts.map((d, i) => stamp(state.heapSeq + i, d));
  return emit(state, stamped);
}

/** Default heap block fields for a fresh slot (and old save migration). */
export function freshBlock(id: number): HeapBlock {
  return {
    id,
    state: "free",
    tag: null,
    addr: blockAddr(id),
    generation: 0,
    owner: null,
    history: [],
  };
}

/**
 * Fill missing forensics fields on a deserialized state (old saves, Redis
 * snapshots written by an earlier build). Never throws.
 */
export function normalizeSim(s: SimState): SimState {
  const heap = (s.heap ?? []).map((b) => ({
    ...b,
    history: b.history ?? [],
    addr: b.addr ?? blockAddr(b.id),
    generation: b.generation ?? 0,
    owner: b.owner ?? b.tag ?? null,
  }));
  const staleIds = new Set(
    heap.filter((b) => b.state === "stale" || b.state === "corrupted").map((b) => b.id),
  );
  return {
    ...s,
    heap,
    refs:
      s.refs ??
      [...staleIds].map((id) => ({
        id: `globals->${id}`,
        source: "$GLOBALS",
        targetId: id,
        generation: heap[id]?.generation ?? 0,
      })),
    heapSeq: s.heapSeq ?? 0,
    trace: s.trace ?? [],
  };
}
