"use client";

import { isPatchLive } from "@/lib/sim/engine";
import { useSim } from "./SimProvider";
import { ActionPanel } from "./ActionPanel";
import { HeapVisualizer } from "./HeapVisualizer";
import { LogStream } from "./LogStream";
import { Terminal } from "./Terminal";

export function DefendView() {
  const { state, dispatch } = useSim();
  const patchLive = isPatchLive(state);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-warn/40 bg-warn/5 px-4 py-2.5">
        <p className="font-mono text-xs text-warn">
          INCIDENT RESPONSE — attacker is progressing in real time. Every action has a cost.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr_1fr]">
        <aside className="flex min-w-0 flex-col gap-4">
          <section className="rounded-lg border border-border bg-panel p-3">
            <h2 className="mb-2 font-mono text-xs tracking-widest text-muted uppercase">
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
            className={`rounded border px-4 py-3 font-mono text-sm font-bold tracking-widest transition-colors focus-visible:outline-2 ${
              patchLive
                ? "border-accent bg-accent/15 text-accent hover:bg-accent/25 focus-visible:outline-accent"
                : "border-border bg-panel-2 text-muted hover:border-foreground/40 focus-visible:outline-foreground"
            }`}
            data-testid="verify-btn"
          >
            VERIFY REMEDIATION →
          </button>
          <p className="font-mono text-[10px] leading-4 text-muted">
            {patchLive
              ? "patched build is live — replay the attack to confirm."
              : "replays the modeled attack. Without a live patch it will succeed."}
          </p>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <HeapVisualizer heap={state.heap} />
          <div className="min-h-[240px] flex-1 rounded-lg border border-border bg-panel">
            <Terminal lines={state.term} className="h-full" />
          </div>
        </div>

        <LogStream logs={state.logs} />
      </div>
    </div>
  );
}
