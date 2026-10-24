"use client";

import { TARGET_PATCH_VERSION, CVE } from "@/lib/sim/cve";
import { useSim } from "./SimProvider";
import Link from "next/link";
import { BreachEffect } from "./BreachEffect";
import { DefendView } from "./DefendView";
import { IncidentStatus } from "./IncidentStatus";
import { ReportView } from "./ReportView";
import { VersionBadge } from "./VersionBadge";
import { VisualizeView } from "./VisualizeView";

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
        {state.phase === "visualize" ? <VisualizeView /> : null}
        {state.phase === "defend" ? <DefendView /> : null}
        {state.phase === "report" || state.phase === "verify" ? <ReportView /> : null}
      </main>

      <footer className="border-t border-border pt-3 text-center font-mono text-[10px] text-muted">
        Educational simulation of {CVE.id} (stale global state → use-after-free).
        All systems, hosts, IPs and commands are fictional. No real code is executed.
      </footer>
    </div>
  );
}
