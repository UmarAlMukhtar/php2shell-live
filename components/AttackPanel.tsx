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
              className={`w-full rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                disabled
                  ? "cursor-not-allowed border-border/50 bg-surface-1 text-fg-faint"
                  : "border-attack/40 bg-attack/5 text-fg hover:border-attack/70 hover:bg-attack/10"
              }`}
              aria-describedby={`atk-hint-${def.id}`}
            >
              <span className="mr-2 text-attack">▸</span>
              {def.label}
              {done ? <span className="ml-2 text-[9px] text-attack/70">✓</span> : null}
            </button>
            <p
              id={`atk-hint-${def.id}`}
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
