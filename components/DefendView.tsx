"use client";

import { isPatchLive } from "@/lib/sim/engine";
import { useSim } from "./SimProvider";
import { ActionPanel } from "./ActionPanel";
import { EvidenceSection } from "./EvidenceSection";
import { HeapArena } from "./HeapArena";
import { LogStream } from "./LogStream";
import { Terminal } from "./Terminal";

export function DefendView() {
  const { state, dispatch } = useSim();
  const patchLive = isPatchLive(state);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border border-attack/50 bg-surface-1 px-4 py-2.5">
        <p className="text-xs font-semibold tracking-wide text-attack">
          INCIDENT RESPONSE — attacker is progressing in real time. Every action has a cost.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1.3fr_1fr]">
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-[10px] border border-border bg-surface-1 p-3">
            <h2 className="mb-2 text-xs font-semibold tracking-widest text-fg-muted uppercase">
              Response actions
            </h2>
            <ActionPanel
              state={state}
              onAction={(id) => dispatch({ type: "DEFEND", action: id })}
            />
          </section>
          <button
            type="button"
            onClick={() => dispatch({ type: "VERIFY" })}
            className={`rounded-lg border px-4 py-3 text-sm font-bold tracking-widest transition-colors focus-visible:outline-2 ${
              patchLive
                ? "border-accent bg-accent text-accent-fg hover:bg-accent/85 focus-visible:outline-accent"
                : "border-border bg-surface-2 text-fg-faint hover:border-fg-faint focus-visible:outline-fg"
            }`}
            data-testid="verify-btn"
          >
            VERIFY REMEDIATION →
          </button>
          <p className="text-[11px] leading-4 text-fg-faint">
            {patchLive
              ? "patched build is live — replay the attack to confirm."
              : "replays the modeled attack. Without a live patch it will succeed."}
          </p>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <HeapArena
            heap={state.heap}
            focusId={
              state.heap.find((b) => b.state === "stale" || b.state === "corrupted")
                ?.id ?? null
            }
          />
          <EvidenceSection title="Simulated terminal" className="min-h-[240px] flex-1">
            <Terminal lines={state.term} className="h-full min-h-[240px]" />
          </EvidenceSection>
        </div>

        <EvidenceSection title="Security logs">
          <div className="max-h-72 overflow-hidden">
            <LogStream logs={state.logs} />
          </div>
        </EvidenceSection>
      </div>
    </div>
  );
}
