import { describe, expect, it } from "vitest";
import { applyHeapOps, applyVisualStep, initialState } from "@/lib/sim/engine";
import { heapInvariants, refIsStale, refValid, staleReason } from "@/lib/sim/invariants";
import { normalizeSim } from "@/lib/sim/trace";
import { runDiff, runTimeline } from "@/lib/sim/replay";
import { VISUAL_TIMELINE } from "@/lib/sim/scenario";
import type { SimState } from "@/lib/sim/types";

function playTimeline(s0?: SimState): SimState {
  let s = s0 ?? initialState();
  VISUAL_TIMELINE.forEach((step, i) => {
    s = applyVisualStep(s, i, step);
  });
  return s;
}

describe("allocation lifetimes", () => {
  it("tracks address, owner, generation and history across a lifecycle", () => {
    let s = initialState();
    s = applyHeapOps(s, [{ id: 3, state: "allocated", tag: "req#1" }]);
    const b1 = s.heap[3]!;
    expect(b1.generation).toBe(1);
    expect(b1.owner).toBe("req#1");
    expect(b1.addr).toBeGreaterThan(0);
    s = applyHeapOps(s, [{ id: 3, state: "freed" }]);
    s = applyHeapOps(s, [{ id: 3, state: "reused", tag: "req#2" }]);
    const b2 = s.heap[3]!;
    expect(b2.generation).toBe(2); // re-issue bumps generation
    expect(b2.owner).toBe("req#2");
    expect(b2.history.map((h) => h.to)).toEqual(["allocated", "freed", "reused"]);
    // history is clock-ordered
    expect(b2.history[1]!.ts).toBeGreaterThan(b2.history[0]!.ts);
  });

  it("restart frees allocations and wipes referencing scopes", () => {
    let s = playTimeline();
    expect(s.refs.length).toBeGreaterThan(0);
    s = applyHeapOps(s, s.heap.map((b) => ({ id: b.id, state: "free" as const })));
    expect(s.refs).toHaveLength(0);
    expect(s.heap.every((b) => b.state === "free" && b.owner === null)).toBe(true);
  });
});

describe("reference validity", () => {
  it("a stale reference is a generation/lifetime violation, not just a color", () => {
    const s = playTimeline();
    const ref = s.refs.find((r) => r.source === "$GLOBALS")!;
    const blk = s.heap[ref.targetId]!;
    expect(refIsStale(ref, blk)).toBe(true);
    expect(ref.generation).toBeLessThan(blk.generation);
    expect(staleReason(ref, blk)).toContain("generation mismatch");
  });

  it("fresh references to live blocks are valid", () => {
    let s = initialState();
    s = applyHeapOps(s, [
      { id: 5, state: "allocated", tag: "req#1" },
      { id: 5, state: "stale", tag: "req#1" },
    ]);
    const ref = s.refs.find((r) => r.targetId === 5)!;
    expect(refValid(ref, s.heap[5])).toBe(true); // same generation, still live
  });
});

describe("event-sourced trace", () => {
  it("timeline produces the documented event kinds in order", () => {
    const s = playTimeline();
    const kinds = s.trace.map((e) => e.kind);
    expect(kinds).toContain("request");
    expect(kinds).toContain("alloc");
    expect(kinds).toContain("cleanup");
    expect(kinds).toContain("free");
    expect(kinds).toContain("reuse");
    expect(kinds).toContain("ref_create");
    expect(kinds).toContain("stale_detected");
    expect(kinds).toContain("unsafe_access");
    // stale detection precedes the unsafe access
    expect(kinds.indexOf("stale_detected")).toBeLessThan(
      kinds.indexOf("unsafe_access"),
    );
    // stable ids + ordered ts
    expect(s.trace.every((e, i) => e.id === `e${e.ts}` && (i === 0 || e.ts > s.trace[i - 1]!.ts))).toBe(true);
  });

  it("replay is deterministic — identical runs produce identical traces", () => {
    const a = playTimeline();
    const b = playTimeline();
    expect(a.trace).toEqual(b.trace);
    expect(a.heap).toEqual(b.heap);
    expect(a.refs).toEqual(b.refs);
  });

  it("trace and heap stay consistent — corrupt blocks have invalid refs", () => {
    const s = playTimeline();
    for (const b of s.heap.filter((x) => x.state === "corrupted")) {
      const inbound = s.refs.filter((r) => r.targetId === b.id);
      if (b.id === 9) {
        expect(inbound.length).toBeGreaterThan(0);
        expect(inbound.every((r) => refIsStale(r, b))).toBe(true);
      }
    }
  });
});

describe("invariants", () => {
  it("clean heap passes all checks; breached heap flags the violation", () => {
    expect(heapInvariants(initialState()).every((c) => c.ok)).toBe(true);
    const s = playTimeline();
    const checks = heapInvariants(s);
    expect(checks.every((c) => c.ok)).toBe(true); // model stays self-consistent
    const stale = checks.find((c) => c.id === "stale-refs-are-violations")!;
    expect(stale.detail).toContain("$GLOBALS");
  });
});

describe("differential replay", () => {
  it("vulnerable run reaches BREACHED; patched run does not corrupt memory", () => {
    const diff = runDiff();
    expect(diff.divergence).toBeGreaterThan(0);
    expect(diff.a.final.status).toBe("BREACHED");
    expect(diff.b.final.status).not.toBe("BREACHED");
    // patched heap never corrupts
    expect(diff.b.final.heap.some((b) => b.state === "corrupted")).toBe(false);
    expect(diff.b.final.heap.some((b) => b.state === "stale")).toBe(false);
    // vulnerable heap does
    expect(diff.a.final.heap.some((b) => b.state === "corrupted")).toBe(true);
  });

  it("first divergence is at the abnormal-cleanup step (blk#9 freed vs stale)", () => {
    const diff = runDiff();
    // Steps 0,1 = baseline+suspicious (identical allocs); step 2 = fatal-error cleanup.
    expect(diff.divergence).toBe(2);
    const blkA = diff.a.frames[2]!.heap[9]!;
    const blkB = diff.b.frames[2]!.heap[9]!;
    expect(blkA.state).toBe("stale");
    expect(blkB.state).toBe("freed");
    expect(diff.divergenceNote).toContain("blk#9");
  });

  it("both runs consume identical inputs through the same engine", () => {
    const vuln = runTimeline(false);
    const patched = runTimeline(true);
    expect(vuln.frames.length).toBe(patched.frames.length);
    expect(vuln.frames.length).toBe(VISUAL_TIMELINE.length);
  });
});

describe("serialization / migration", () => {
  it("normalizeSim fills forensics fields on a pre-upgrade save", () => {
    const s = playTimeline();
    const legacy = {
      ...s,
      refs: undefined,
      heapSeq: undefined,
      trace: undefined,
      heap: s.heap.map((b) => ({ id: b.id, state: b.state, tag: b.tag })),
    } as unknown as SimState;
    const n = normalizeSim(legacy);
    expect(n.trace).toEqual([]);
    expect(n.heapSeq).toBe(0);
    expect(n.heap.every((b) => b.addr > 0 && Array.isArray(b.history))).toBe(true);
    // stale/corrupted blocks get reconstructed refs
    expect(n.refs.length).toBeGreaterThan(0);
  });
});
