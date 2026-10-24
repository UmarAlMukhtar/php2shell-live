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
        className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-wide uppercase transition-colors ${
          fx.enabled
            ? "border-accent/60 bg-accent/15 text-accent"
            : "border-border bg-surface-2 text-fg-muted hover:text-fg"
        }`}
      >
        ◎ forensics
      </button>
      {showHint ? (
        <span
          role="status"
          className="absolute top-full right-0 z-20 mt-2 flex w-56 items-start gap-2 rounded-lg border border-border bg-surface-2 p-2 text-[11px] leading-4 normal-case tracking-normal text-fg"
        >
          <span className="flex-1">
            New: <strong>FORENSICS</strong> — inspect every allocation, replay the
            exploit vs the patched runtime, and check model invariants.
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss forensics hint"
            className="text-fg-faint hover:text-fg"
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
      className="rounded-lg border border-border bg-surface-2 p-3 text-[13px] leading-5 text-fg-muted"
    >
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("p2s.intro", "1");
          force();
        }}
        aria-label="Dismiss introduction"
        className="float-right text-fg-faint hover:text-fg"
      >
        ✕
      </button>
      <span className="text-accent">CVE-2026-109619 in one line:</span> a PHP
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
    <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col gap-4 p-4 md:p-6">
      <BreachEffect active={breaching} />

      <header className="-mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-1 px-4 py-3 md:-mx-6 md:px-6">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-fg-faint uppercase">
            simulated training environment — fictional targets only
          </p>
          <h1 className="text-xl font-semibold tracking-wide text-fg">
            PHP2Shell<span className="text-accent">:</span> Live
            <span className="ml-3 align-middle font-mono text-[11px] font-normal text-fg-faint">
              {CVE.id}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <ForensicsToggle />
          <Link
            href="/play"
            className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-fg-muted uppercase hover:border-accent/50 hover:text-accent"
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
              className={`text-xs font-semibold tracking-widest ${
                i === current
                  ? "text-accent"
                  : i < current
                    ? "text-fg-muted"
                    : "text-fg-faint"
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

      <footer className="border-t border-border pt-3 text-center text-[11px] text-fg-faint">
        Educational simulation of {CVE.id} (stale global state → use-after-free).
        All systems, hosts, IPs and commands are fictional. No real code is executed.
      </footer>
    </div>
  );
}
