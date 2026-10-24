"use client";

import { useState } from "react";
import { DEFENDER_ACTIONS } from "@/lib/sim/defense";
import type { SimState } from "@/lib/sim/types";

interface Props {
  state: SimState;
  onAction: (id: (typeof DEFENDER_ACTIONS)[number]["id"]) => void;
}

export function ActionPanel({ state, onAction }: Props) {
  const [openHint, setOpenHint] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Defender actions">
      {DEFENDER_ACTIONS.map((def) => {
        const blocked = def.prereq(state);
        const done = def.doneReason(state);
        const disabled = blocked !== null || done !== null;
        return (
          <div key={def.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAction(def.id)}
              onMouseEnter={() => setOpenHint(def.id)}
              onMouseLeave={() => setOpenHint(null)}
              onFocus={() => setOpenHint(def.id)}
              onBlur={() => setOpenHint(null)}
              className={`w-full rounded border px-3 py-2.5 text-left font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                disabled
                  ? "cursor-not-allowed border-border/60 bg-panel text-muted/60"
                  : "border-border bg-panel-2 text-foreground hover:border-accent/60 hover:bg-accent/5"
              }`}
              aria-describedby={`hint-${def.id}`}
            >
              <span className="mr-2 text-accent">▸</span>
              {def.label}
              {done ? <span className="ml-2 text-[9px] text-accent/70">✓</span> : null}
            </button>
            <p
              id={`hint-${def.id}`}
              className={`px-3 pt-1 font-mono text-[10px] leading-4 text-muted transition-opacity ${
                openHint === def.id || blocked ? "opacity-100" : "opacity-60"
              }`}
            >
              {blocked ?? done ?? def.hint}
            </p>
          </div>
        );
      })}
    </div>
  );
}
