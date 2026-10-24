"use client";

import { useMemo, useState } from "react";
import { useSim } from "@/components/SimProvider";
import { useForensics } from "./ForensicsProvider";
import { heapInvariants, refIsStale, staleReason } from "@/lib/sim/invariants";
import { fmtAddr } from "@/lib/sim/trace";
import { runDiff } from "@/lib/sim/replay";
import { HeapVisualizer } from "@/components/HeapVisualizer";
import type { HeapBlock, SimState, TraceEvent, TraceKind } from "@/lib/sim/types";

type Tab = "inspect" | "trace" | "diff" | "checks";

const KIND_COLOR: Record<TraceKind, string> = {
  request: "text-info",
  alloc: "text-cyan",
  ref_create: "text-warn",
  cleanup: "text-warn",
  free: "text-muted",
  reuse: "text-warn",
  stale_detected: "text-danger",
  unsafe_access: "text-danger",
  remediate: "text-ok",
  verify: "text-ok",
};

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "inspect", label: "Inspector" },
  { id: "trace", label: "Trace" },
  { id: "diff", label: "A/B replay" },
  { id: "checks", label: "Checks" },
];

function blockFromSubject(state: SimState, subject: string): number | null {
  const m = /^blk#(\d+)$/.exec(subject);
  return m ? Number(m[1]) : null;
}

function eventsForBlock(state: SimState, id: number): TraceEvent[] {
  return state.trace.filter(
    (e) =>
      e.subject === `blk#${id}` ||
      state.refs.some((r) => r.targetId === id && r.source === e.subject),
  );
}

function Inspector({ state }: { state: SimState }) {
  const fx = useForensics();
  const sel = fx?.selectedBlock ?? null;
  const block: HeapBlock | undefined = sel != null ? state.heap[sel] : undefined;

  if (!block) {
    return (
      <p className="font-mono text-[11px] text-muted">
        Click a heap block in the arena (or an event below) to inspect its
        allocation record — address, generation, owner, lifetime, references.
      </p>
    );
  }

  const inbound = state.refs.filter((r) => r.targetId === block.id);
  const events = eventsForBlock(state, block.id);
  const stale = inbound.some((r) => refIsStale(r, block));

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <dl className="space-y-1 font-mono text-[11px] leading-5">
        <Row k="address" v={fmtAddr(block.addr)} accent />
        <Row k="alloc id" v={`blk#${block.id} · gen${block.generation}`} />
        <Row k="owner" v={block.owner ?? "—"} />
        <Row k="state" v={block.state} accent={block.state === "stale" || block.state === "corrupted"} warn />
        <Row k="tag" v={block.tag ?? "—"} />
        <Row
          k="invariant"
          v={stale ? "VIOLATION — dangling reference" : "ok"}
          warn={stale}
        />
      </dl>
      <div className="space-y-2">
        <div>
          <h4 className="font-mono text-[10px] tracking-widest text-muted uppercase">References in</h4>
          {inbound.length === 0 ? (
            <p className="font-mono text-[11px] text-muted">none</p>
          ) : (
            inbound.map((r) => (
              <p key={r.id} className="font-mono text-[11px] leading-5">
                <span className="text-foreground/90">{r.source} → blk#{r.targetId}</span>
                <span className={refIsStale(r, block) ? " text-danger" : " text-ok"}>
                  {" "}· {refIsStale(r, block) ? staleReason(r, block) : `valid (gen${r.generation})`}
                </span>
              </p>
            ))
          )}
        </div>
        <div>
          <h4 className="font-mono text-[10px] tracking-widest text-muted uppercase">Lifetime</h4>
          {block.history.length === 0 ? (
            <p className="font-mono text-[11px] text-muted">no transitions recorded</p>
          ) : (
            <p className="font-mono text-[11px] text-foreground/80">
              {block.history.map((h) => h.to).join(" → ")}
            </p>
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        <h4 className="font-mono text-[10px] tracking-widest text-muted uppercase">Related events</h4>
        <ul className="max-h-28 overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="font-mono text-[10px] leading-4">
              <span className="text-muted">e{e.ts}</span>{" "}
              <span className={KIND_COLOR[e.kind]}>{e.kind}</span>{" "}
              <span className="text-foreground/80">{e.detail}</span>
            </li>
          ))}
          {events.length === 0 && (
            <li className="font-mono text-[10px] text-muted">no events yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Row({ k, v, accent, warn }: { k: string; v: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className={warn ? "text-danger" : accent ? "text-cyan" : "text-foreground/90"}>{v}</dd>
    </div>
  );
}

function TraceList({ state }: { state: SimState }) {
  const fx = useForensics();
  return (
    <ul className="max-h-56 overflow-y-auto pr-1" aria-label="Execution trace">
      {state.trace.length === 0 && (
        <li className="font-mono text-[11px] text-muted">
          No events yet — play the visualize timeline (or defend) to populate the trace.
        </li>
      )}
      {state.trace.map((e) => {
        const target = blockFromSubject(state, e.subject) ??
          state.refs.find((r) => r.source === e.subject)?.targetId ?? null;
        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => fx?.select(target)}
              className="block w-full text-left font-mono text-[10px] leading-5 hover:bg-cyan/5 focus-visible:outline-1 focus-visible:outline-cyan"
            >
              <span className="text-muted">e{e.ts}</span>{" "}
              <span className={KIND_COLOR[e.kind]}>{e.kind}</span>{" "}
              <span className="text-info/80">{e.subject}</span>{" "}
              <span className="text-foreground/80">{e.detail}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function DiffReplay() {
  const diff = useMemo(() => runDiff(), []);
  const [frame, setFrame] = useState<number>(diff.divergence >= 0 ? diff.divergence : 0);
  const fa = diff.a.frames[frame]!;
  const fb = diff.b.frames[frame]!;

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] leading-4 text-muted">
        Model-level comparison — the same scripted event stream replayed through
        the engine under two runtime configs. Not an execution of real PHP
        binaries and not a claim of real-world exploitability.
      </p>
      <div className="flex items-center gap-2 overflow-x-auto" role="tablist" aria-label="Replay step">
        {diff.a.frames.map((f, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setFrame(i)}
            className={`glass shrink-0 px-2 py-1 font-mono text-[9px] tracking-wider uppercase ${
              i === frame ? "border-cyan text-cyan" : "text-muted"
            } ${i === diff.divergence ? "outline outline-1 outline-warn" : ""}`}
          >
            {i}
          </button>
        ))}
      </div>
      {diff.divergence >= 0 && (
        <p className="font-mono text-[10px] leading-4 text-warn">
          first divergence @ step {diff.divergence} (“{diff.a.frames[diff.divergence]!.title}”): {diff.divergenceNote}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {[{ f: fa, run: diff.a }, { f: fb, run: diff.b }].map(({ f, run }) => (
          <div key={run.label} className="glass min-w-0 p-2">
            <p className="mb-1 font-mono text-[10px] tracking-wider">
              <span className={run.patched ? "text-ok" : "text-danger"}>{run.label}</span>
              <span className="text-muted"> · {f.title} · {f.status}</span>
            </p>
            <HeapVisualizer heap={f.heap} />
            <ul className="mt-1 max-h-24 overflow-y-auto">
              {f.events.map((e) => (
                <li key={e.id} className="font-mono text-[9px] leading-4">
                  <span className={KIND_COLOR[e.kind]}>{e.kind}</span>{" "}
                  <span className="text-foreground/70">{e.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Checks({ state }: { state: SimState }) {
  const checks = useMemo(() => heapInvariants(state), [state]);
  const STATIC: Array<{ name: string; detail: string }> = [
    { name: "Deterministic replay", detail: "same inputs → identical trace (test: replay is deterministic)" },
    { name: "Patch-version handling", detail: "verify passes only when patch staged AND restarted (test: verify suite)" },
    { name: "Multiplayer consistency", detail: "single authoritative SimState; CAS on seq (test: rooms suite)" },
    { name: "Serialization", detail: "sessionStorage round-trip + migration normalizeSim (test: persist suite)" },
  ];
  const ASSUMPTIONS = [
    "Address space is a fixed 24-slot arena — educational, not the Zend allocator",
    "Generations model slot re-issue, not allocator internals",
    "Attack feasibility (grooming windows) is scripted, not measured",
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <h4 className="mb-1 font-mono text-[10px] tracking-widest text-cyan uppercase">Live model invariants</h4>
        {checks.map((c) => (
          <p key={c.id} className="font-mono text-[10px] leading-4">
            <span className={c.ok ? "text-ok" : "text-danger"}>{c.ok ? "✓" : "✗"}</span>{" "}
            <span className="text-foreground/90">{c.name}</span>
            <span className="text-muted"> — {c.detail}</span>
          </p>
        ))}
      </div>
      <div>
        <h4 className="mb-1 font-mono text-[10px] tracking-widest text-cyan uppercase">Verified properties (Vitest)</h4>
        {STATIC.map((s) => (
          <p key={s.name} className="font-mono text-[10px] leading-4">
            <span className="text-ok">✓</span>{" "}
            <span className="text-foreground/90">{s.name}</span>
            <span className="text-muted"> — {s.detail}</span>
          </p>
        ))}
      </div>
      <div className="md:col-span-2">
        <h4 className="mb-1 font-mono text-[10px] tracking-widest text-warn uppercase">Assumptions & simplifications</h4>
        {ASSUMPTIONS.map((a) => (
          <p key={a} className="font-mono text-[10px] leading-4 text-muted">△ {a}</p>
        ))}
      </div>
    </div>
  );
}

/** X-RAY drawer: inspector, execution trace, A/B replay, validation checks. */
export function ForensicsPanel() {
  const { state } = useSim();
  const [tab, setTab] = useState<Tab>("inspect");

  return (
    <section aria-label="Forensics console" className="glass mt-4 p-3">
      <div className="mb-3 flex flex-wrap items-center gap-2" role="tablist" aria-label="Forensics tools">
        <span className="holo-title mr-2 font-mono text-[11px] tracking-[0.25em] uppercase">forensics</span>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase rounded-sm border transition-colors ${
              tab === t.id
                ? "border-cyan/60 bg-cyan/10 text-cyan"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "inspect" ? <Inspector state={state} /> : null}
      {tab === "trace" ? <TraceList state={state} /> : null}
      {tab === "diff" ? <DiffReplay /> : null}
      {tab === "checks" ? <Checks state={state} /> : null}
    </section>
  );
}
