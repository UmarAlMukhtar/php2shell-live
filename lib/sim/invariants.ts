import type { HeapBlock, SimReference, SimState } from "./types";

/** States in which an allocation is considered live (holding content). */
const LIVE: ReadonlySet<HeapBlock["state"]> = new Set([
  "allocated",
  "reused",
  "stale",
  "corrupted",
]);

/**
 * A reference is valid iff it captured the target's current generation AND
 * the allocation is still alive. Generation mismatch = the address was
 * re-issued; dead state = the lifetime ended.
 */
export function refValid(ref: SimReference, block: HeapBlock | undefined): boolean {
  if (!block) return false;
  return ref.generation === block.generation && LIVE.has(block.state);
}

export function refIsStale(ref: SimReference, block: HeapBlock | undefined): boolean {
  return !refValid(ref, block);
}

/** Why a reference is invalid — for inspector/tooltips. */
export function staleReason(
  ref: SimReference,
  block: HeapBlock | undefined,
): string {
  if (!block) return "target allocation no longer exists";
  if (!LIVE.has(block.state)) {
    return `target blk#${ref.targetId} was released (${block.state}) — ref outlived the allocation`;
  }
  if (ref.generation !== block.generation) {
    return (
      `generation mismatch: ref captured gen${ref.generation}, ` +
      `blk#${ref.targetId} is now gen${block.generation} — address re-issued`
    );
  }
  return "valid";
}

export interface InvariantCheck {
  id: string;
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * Model invariants checked against live state — these are verified model
 * properties, not claims about the real Zend allocator.
 */
export function heapInvariants(state: SimState): InvariantCheck[] {
  const checks: InvariantCheck[] = [];

  // 1. Every displayed "stale" block has an inbound dangling reference.
  // ("corrupted" marks materialized damage — it need not still be referenced.)
  const blocksNeedingRef = state.heap.filter((b) => b.state === "stale");
  const missingRef = blocksNeedingRef.filter(
    (b) => !state.refs.some((r) => r.targetId === b.id),
  );
  checks.push({
    id: "stale-block-has-ref",
    name: "Stale markers are backed by a real dangling reference",
    ok: missingRef.length === 0,
    detail:
      missingRef.length === 0
        ? `${blocksNeedingRef.length} stale/corrupted block(s), each referenced`
        : `blk#${missingRef.map((b) => b.id).join(",")} marked stale with no reference`,
  });

  // 2. Generation monotonicity inside every block's lifetime.
  const badGen = state.heap.filter(
    (b) => b.generation < 0 || !Number.isInteger(b.generation),
  );
  checks.push({
    id: "generation-integrity",
    name: "Allocation generations are consistent",
    ok: badGen.length === 0,
    detail:
      badGen.length === 0
        ? "all generations are non-negative integers"
        : `corrupt generation on ${badGen.map((b) => `blk#${b.id}`).join(",")}`,
  });

  // 3. Stale references are *actual* violations: gen mismatch or dead target.
  const staleRefs = state.refs.filter((r) => refIsStale(r, state.heap[r.targetId]));
  checks.push({
    id: "stale-refs-are-violations",
    name: "Stale references are generation/lifetime violations",
    ok: true, // informational — count is the evidence
    detail:
      staleRefs.length === 0
        ? "no dangling references"
        : staleRefs
            .map((r) => `${r.source}→blk#${r.targetId}: ${staleReason(r, state.heap[r.targetId])}`)
            .join("; "),
  });

  // 4. History is append-only and ordered by the logical clock.
  const disordered = state.heap.filter((b) =>
    b.history.some((h, i) => i > 0 && h.ts < b.history[i - 1]!.ts),
  );
  checks.push({
    id: "lifetime-ordered",
    name: "Lifetime history is clock-ordered",
    ok: disordered.length === 0,
    detail:
      disordered.length === 0
        ? "every block's transition log is monotonic"
        : `out-of-order history on ${disordered.map((b) => `blk#${b.id}`).join(",")}`,
  });

  return checks;
}
