"use client";

import { TARGET_PATCH_VERSION, CVE } from "@/lib/sim/cve";
import { useReducer, useSyncExternalStore } from "react";
import { useSim } from "./SimProvider";
import Link from "next/link";
import { BreachEffect } from "./BreachEffect";
import { DefendView } from "./DefendView";
import { IncidentStatus } from "./IncidentStatus";
import { ReportView } from "./ReportView";
import { VersionBadge } from "./VersionBadge";
import { VisualizeView } from "./VisualizeView";
import { ForensicsPanel } from "./forensics/ForensicsPanel";
import { ForensicsProvider, useForensics } from "./forensics/ForensicsProvider";

const noopSub = () => () => {};

const PHASES = ["visualize", "defend", "verify"] as const;
const PHASE_LABELS: Record<(typeof PHASES)[number], string> = {
  visualize: "① VISUALIZE",
  defend: "② DEFEND",
  verify: "③ VERIFY",
};

function phaseIndex(phase: string): number {
  if (phase === "report") return 2;
  return Math.max(0, PHASES.indexOf(phase as (typeof PHASES)[number]));
}

export function Game() {
  return (
    <ForensicsProvider>
      <GameInner />
    </ForensicsProvider>
  );
}

function ForensicsToggle() {
  const fx = useForensics();
  const [, force] = useReducer((x: number) => x + 1, 0);
  const hintSeen = useSyncExternalStore(
    noopSub,
    () => localStorage.getItem("p2s.fxHint") === "1",
    () => true,
  );
  if (!fx) return null;
  const showHint = !hintSeen && !fx.enabled;
  const dismiss = () => {
    localStorage.setItem("p2s.fxHint", "1");
    force();
  };
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => {
          dismiss();
          fx.toggle();
        }}
        aria-pressed={fx.enabled}
        aria-expanded={fx.enabled}
        aria-controls="forensics-panel"
        className={`rounded border px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest uppercase transition-colors ${
          fx.enabled
            ? "border-cyan/60 bg-cyan/15 text-cyan"
            : "border-cyan/30 bg-cyan/5 text-cyan/70 hover:bg-cyan/10"
        }`}
      >
        ◎ forensics
      </button>
      {showHint ? (
        <span
          role="status"
          className="glass absolute top-full right-0 z-20 mt-2 flex w-56 items-start gap-2 p-2 font-mono text-[10px] leading-4 normal-case tracking-normal text-cyan"
        >
          <span className="flex-1">
            New: <strong>FORENSICS</strong> — inspect every allocation, replay the
            exploit vs the patched runtime, and check model invariants.
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss forensics hint"
            className="text-muted hover:text-foreground"
          >
            ✕
          </button>
        </span>
      ) : null}
    </span>
  );
}

/** One-time primer: what the visitor is about to watch. */
function IntroCard() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const seen = useSyncExternalStore(
    noopSub,
    () => localStorage.getItem("p2s.intro") === "1",
    () => true,
  );
  if (seen) return null;
  return (
    <aside
      aria-label="What you are about to see"
      className="glass border-cyan/30 p-3 font-mono text-[11px] leading-5 text-foreground/80"
    >
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("p2s.intro", "1");
          force();
        }}
        aria-label="Dismiss introduction"
        className="float-right text-muted hover:text-foreground"
      >
        ✕
      </button>
      <span className="text-cyan">CVE-2026-109619 in one line:</span> a PHP
      worker&rsquo;s global-state pointer survives an aborted request and keeps
      aiming at freed heap — the next request re-issues that slot, and the
      stale pointer now reads attacker-influenced memory. Watch it happen
      below, then stop it.
    </aside>
  );
}

function ForensicsDrawer() {
  const fx = useForensics();
  if (!fx?.enabled) return null;
  return <ForensicsPanel />;
}

function GameInner() {
  const { state } = useSim();
  const current = phaseIndex(state.phase);
  const breaching = state.status === "BREACHED" && state.phase !== "report";

  return (
    <div className="cyber-bg scanlines mx-auto flex min-h-screen max-w-[1400px] flex-col gap-4 p-4 font-mono md:p-6">
      <BreachEffect active={breaching} />

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan/20 pb-3">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-muted uppercase">
            simulated training environment — fictional targets only
          </p>
          <h1 className="text-xl font-bold tracking-wider text-foreground">
            <span className="holo-title">PHP2Shell</span>
            <span className="text-danger">:</span> Live
            <span className="ml-3 align-middle font-mono text-[10px] font-normal text-muted">
              {CVE.id}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ForensicsToggle />
          <Link
            href="/play"
            className="rounded border border-danger/40 bg-danger/10 px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-danger uppercase hover:bg-danger/20"
          >
            multiplayer →
          </Link>
          <VersionBadge
            version={state.phpVersion}
            patchStaged={state.patchApplied && !state.restartedAfterPatch}
            targetVersion={TARGET_PATCH_VERSION}
          />
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4" aria-label="Journey phases">
          {PHASES.map((p, i) => (
            <span
              key={p}
              className={`font-mono text-xs tracking-widest ${
                i === current
                  ? "font-bold text-accent"
                  : i < current
                    ? "text-foreground/60"
                    : "text-muted/60"
              }`}
              aria-current={i === current ? "step" : undefined}
            >
              {PHASE_LABELS[p]}
            </span>
          ))}
        </div>
        <IncidentStatus
          status={state.status}
          attackerStage={state.attackerStage}
          capacity={state.capacity}
        />
      </div>

      <main className="min-h-0 flex-1">
        {state.phase === "visualize" ? <IntroCard /> : null}
        {state.phase === "visualize" ? <VisualizeView /> : null}
        {state.phase === "defend" ? <DefendView /> : null}
        {state.phase === "report" || state.phase === "verify" ? <ReportView /> : null}
        <ForensicsDrawer />
      </main>

      <footer className="border-t border-border pt-3 text-center font-mono text-[10px] text-muted">
        Educational simulation of {CVE.id} (stale global state → use-after-free).
        All systems, hosts, IPs and commands are fictional. No real code is executed.
      </footer>
    </div>
  );
}
