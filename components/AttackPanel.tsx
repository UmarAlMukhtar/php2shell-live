"use client";

import { useState } from "react";
import { ATTACKER_ACTIONS } from "@/lib/sim/attack";
import type { SimState } from "@/lib/sim/types";

interface Props {
  state: SimState;
  onAction: (id: (typeof ATTACKER_ACTIONS)[number]["id"]) => void;
}

/** Attacker-side action list — same interaction contract as ActionPanel. */
export function AttackPanel({ state, onAction }: Props) {
  const [openHint, setOpenHint] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Attacker actions">
      {ATTACKER_ACTIONS.map((def) => {
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
              className={`w-full rounded border px-3 py-2.5 text-left font-mono text-xs transition-colors focus-visible:outline-2 focus-visible:outline-danger ${
                disabled
                  ? "cursor-not-allowed border-border/60 bg-panel text-muted/60"
                  : "border-danger/40 bg-danger/5 text-foreground hover:border-danger/70 hover:bg-danger/10"
              }`}
              aria-describedby={`atk-hint-${def.id}`}
            >
              <span className="mr-2 text-danger">▸</span>
              {def.label}
              {done ? <span className="ml-2 text-[9px] text-danger/70">✓</span> : null}
            </button>
            <p
              id={`atk-hint-${def.id}`}
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
