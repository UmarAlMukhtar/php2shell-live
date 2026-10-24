"use client";

import { motion } from "motion/react";
import type { IncidentStatus as Status } from "@/lib/sim/types";

const STYLE: Record<Status, { dot: string; text: string; bg: string; label: string }> = {
  SAFE: { dot: "bg-ok", text: "text-ok", bg: "bg-ok/10", label: "SAFE" },
  UNDER_ATTACK: { dot: "bg-attack", text: "text-attack", bg: "bg-attack/10", label: "UNDER ATTACK" },
  BREACHED: { dot: "bg-breach", text: "text-breach", bg: "bg-breach/10", label: "BREACHED" },
  CONTAINED: { dot: "bg-contained", text: "text-contained", bg: "bg-contained/10", label: "CONTAINED" },
  PATCHED: { dot: "bg-ok", text: "text-ok", bg: "bg-ok/10", label: "PATCHED" },
};

interface Props {
  status: Status;
  attackerStage: string;
  capacity: number;
}

export function IncidentStatus({ status, attackerStage, capacity }: Props) {
  const s = STYLE[status];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1" data-testid="incident-status">
      <div
        className={`flex items-center gap-2 rounded-full px-3 py-1 ${s.bg}`}
        aria-live="polite"
      >
        <motion.span
          className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`}
          animate={status === "BREACHED" || status === "UNDER_ATTACK" ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
          transition={{ duration: 0.9, repeat: status === "BREACHED" || status === "UNDER_ATTACK" ? Infinity : 0 }}
        />
        <span className={`text-xs font-bold tracking-widest ${s.text}`}>{s.label}</span>
      </div>
      <span className="text-[11px] text-fg-muted">
        attacker: <span className="text-fg">{attackerStage}</span>
      </span>
      <span className="text-[11px] text-fg-muted">
        capacity: <span className={capacity < 70 ? "text-vuln" : "text-fg"}>{capacity}%</span>
      </span>
    </div>
  );
}
