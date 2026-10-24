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
              className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                disabled
                  ? "cursor-not-allowed border-border/50 bg-surface-1 text-fg-faint"
                  : "border-border bg-surface-2 text-fg hover:border-accent/60 hover:bg-accent/5"
              }`}
              aria-describedby={`hint-${def.id}`}
            >
              <span className="mr-2 text-accent">▸</span>
              {def.label}
              {done ? <span className="ml-2 text-[9px] text-accent/70">✓</span> : null}
            </button>
            <p
              id={`hint-${def.id}`}
              className={`px-3 pt-1 text-[11px] leading-4 text-fg-muted transition-opacity ${
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
