"use client";

import { useMemo, useRef, useState } from "react";
import { useSim } from "@/components/SimProvider";
import { useForensics } from "./ForensicsProvider";
import { heapInvariants, refIsStale, staleReason } from "@/lib/sim/invariants";
import { fmtAddr } from "@/lib/sim/trace";
import { runDiff } from "@/lib/sim/replay";
import { HeapVisualizer } from "@/components/HeapVisualizer";
import type { HeapBlock, SimState, TraceEvent, TraceKind } from "@/lib/sim/types";

type Tab = "inspect" | "trace" | "diff" | "checks";

const KIND_COLOR: Record<TraceKind, string> = {
  request: "text-contained",
  alloc: "text-accent",
  ref_create: "text-fg-faint",
  cleanup: "text-fg-muted",
  free: "text-fg-muted",
  reuse: "text-vuln",
  stale_detected: "text-attack",
  unsafe_access: "text-breach",
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
      <p className="font-mono text-[11px] text-fg-muted">
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
          <h4 className="font-mono text-[11px] tracking-widest text-fg-faint uppercase">References in</h4>
          {inbound.length === 0 ? (
            <p className="font-mono text-[11px] text-fg-muted">none</p>
          ) : (
            inbound.map((r) => (
              <p key={r.id} className="font-mono text-[11px] leading-5">
                <span className="text-fg">{r.source} → blk#{r.targetId}</span>
                <span className={refIsStale(r, block) ? " text-breach" : " text-ok"}>
                  {" "}· {refIsStale(r, block) ? staleReason(r, block) : `valid (gen${r.generation})`}
                </span>
              </p>
            ))
          )}
        </div>
        <div>
          <h4 className="font-mono text-[11px] tracking-widest text-fg-faint uppercase">Lifetime</h4>
          {block.history.length === 0 ? (
            <p className="font-mono text-[11px] text-fg-muted">no transitions recorded</p>
          ) : (
            <p className="font-mono text-[11px] text-fg-muted">
              {block.history.map((h) => h.to).join(" → ")}
            </p>
          )}
        </div>
      </div>
      <div className="md:col-span-2">
        <h4 className="font-mono text-[11px] tracking-widest text-fg-faint uppercase">Related events</h4>
        <ul className="max-h-28 overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="font-mono text-[11px] leading-5">
              <span className="text-fg-faint">e{e.ts}</span>{" "}
              <span className={KIND_COLOR[e.kind]}>{e.kind}</span>{" "}
              <span className="text-fg-muted">{e.detail}</span>
            </li>
          ))}
          {events.length === 0 && (
            <li className="font-mono text-[11px] text-fg-muted">no events yet</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Row({ k, v, accent, warn }: { k: string; v: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-faint">{k}</dt>
      <dd className={warn ? "text-breach" : accent ? "text-accent" : "text-fg"}>{v}</dd>
    </div>
  );
}

function TraceList({ state }: { state: SimState }) {
  const fx = useForensics();
  return (
    <ul className="max-h-56 overflow-y-auto pr-1" aria-label="Execution trace">
      {state.trace.length === 0 && (
        <li className="font-mono text-[11px] text-fg-muted">
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
              className="block w-full rounded px-1 text-left font-mono text-[11px] leading-5 hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="text-fg-faint">e{e.ts}</span>{" "}
              <span className={KIND_COLOR[e.kind]}>{e.kind}</span>{" "}
              <span className="text-contained">{e.subject}</span>{" "}
              <span className="text-fg-muted">{e.detail}</span>
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
      <p className="text-[11px] leading-4 text-fg-muted">
        Model-level comparison — the same scripted event stream replayed through
        the engine under two runtime configs. Not an execution of real PHP
        binaries and not a claim of real-world exploitability.
      </p>
      <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Replay step">
        {diff.a.frames.map((f, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setFrame(i)}
            aria-current={i === frame ? "step" : undefined}
            className={`shrink-0 rounded-md border border-border bg-surface-2 px-2 py-1 font-mono text-[11px] tracking-wider uppercase ${
              i === frame ? "border-accent text-accent" : "text-fg-muted"
            } ${i === diff.divergence ? "outline outline-1 outline-vuln" : ""}`}
          >
            {i}
          </button>
        ))}
      </div>
      {diff.divergence >= 0 && (
        <p className="font-mono text-[11px] leading-4 text-vuln">
          first divergence @ step {diff.divergence} (“{diff.a.frames[diff.divergence]!.title}”): {diff.divergenceNote}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {[{ f: fa, run: diff.a }, { f: fb, run: diff.b }].map(({ f, run }) => (
          <div key={run.label} className="min-w-0 rounded-lg border border-border bg-surface-2 p-2">
            <p className="mb-1 font-mono text-[11px] tracking-wider">
              <span className={run.patched ? "text-ok" : "text-breach"}>{run.label}</span>
              <span className="text-fg-faint"> · {f.title} · {f.status}</span>
            </p>
            <HeapVisualizer heap={f.heap} />
            <ul className="mt-1 max-h-24 overflow-y-auto">
              {f.events.map((e) => (
                <li key={e.id} className="font-mono text-[11px] leading-4">
                  <span className={KIND_COLOR[e.kind]}>{e.kind}</span>{" "}
                  <span className="text-fg-muted">{e.detail}</span>
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
        <h4 className="mb-1 text-[11px] font-semibold tracking-widest text-accent uppercase">Live model invariants</h4>
        {checks.map((c) => (
          <p key={c.id} className="text-[11px] leading-4">
            <span className={c.ok ? "text-ok" : "text-breach"}>{c.ok ? "✓" : "✗"}</span>{" "}
            <span className="text-fg">{c.name}</span>
            <span className="text-fg-muted"> — {c.detail}</span>
          </p>
        ))}
      </div>
      <div>
        <h4 className="mb-1 text-[11px] font-semibold tracking-widest text-accent uppercase">Verified properties (Vitest)</h4>
        {STATIC.map((s) => (
          <p key={s.name} className="text-[11px] leading-4">
            <span className="text-ok">✓</span>{" "}
            <span className="text-fg">{s.name}</span>
            <span className="text-fg-muted"> — {s.detail}</span>
          </p>
        ))}
      </div>
      <div className="md:col-span-2">
        <h4 className="mb-1 text-[11px] font-semibold tracking-widest text-vuln uppercase">Assumptions & simplifications</h4>
        {ASSUMPTIONS.map((a) => (
          <p key={a} className="text-[11px] leading-4 text-fg-muted">△ {a}</p>
        ))}
      </div>
    </div>
  );
}

/** X-RAY drawer: inspector, execution trace, A/B replay, validation checks. */
export function ForensicsPanel() {
  const { state } = useSim();
  const fx = useForensics();
  const [tab, setTab] = useState<Tab>("inspect");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Roving tabindex + arrow-key navigation per the ARIA tabs pattern.
  const onTabKeyDown = (e: React.KeyboardEvent, i: number) => {
    const n = TABS.length;
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % n;
    else if (e.key === "ArrowLeft") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next >= 0) {
      e.preventDefault();
      setTab(TABS[next]!.id);
      tabRefs.current[next]?.focus();
    }
  };

  // Polite announcement of inspector selection + violations.
  const sel = fx?.selectedBlock ?? null;
  const selBlock = sel != null ? state.heap[sel] : undefined;
  const announcement = selBlock
    ? `blk#${selBlock.id} selected — ${selBlock.state}${
        state.refs.some((r) => r.targetId === selBlock.id && refIsStale(r, selBlock))
          ? ", violation: dangling reference"
          : ""
      }`
    : "";

  return (
    <section
      aria-label="Forensics console"
      id="forensics-panel"
      className="mt-4 rounded-[10px] border border-contained/40 bg-surface-1 p-3"
    >
      <p className="sr-only" aria-live="polite">{announcement}</p>
      <div
        className="sticky top-0 z-10 -mx-3 mb-3 flex flex-wrap items-center gap-2 border-b border-border bg-surface-1 px-3 py-1.5"
        role="tablist"
        aria-label="Forensics tools"
      >
        <span className="mr-2 text-[11px] font-bold tracking-[0.25em] text-contained uppercase">
          forensics
        </span>
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`fx-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`fx-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={`rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-widest uppercase transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              tab === t.id
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-border text-fg-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {TABS.map((t) =>
        tab === t.id ? (
          <div
            key={t.id}
            role="tabpanel"
            id={`fx-panel-${t.id}`}
            aria-labelledby={`fx-tab-${t.id}`}
          >
            {t.id === "inspect" ? <Inspector state={state} /> : null}
            {t.id === "trace" ? <TraceList state={state} /> : null}
            {t.id === "diff" ? <DiffReplay /> : null}
            {t.id === "checks" ? <Checks state={state} /> : null}
          </div>
        ) : null,
      )}
    </section>
  );
}
