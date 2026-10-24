"use client";

import { motion } from "motion/react";
import type { IncidentStatus as Status } from "@/lib/sim/types";

const STYLE: Record<Status, { dot: string; text: string; label: string }> = {
  SAFE: { dot: "bg-accent", text: "text-accent", label: "SAFE" },
  UNDER_ATTACK: { dot: "bg-warn", text: "text-warn", label: "UNDER ATTACK" },
  BREACHED: { dot: "bg-danger", text: "text-danger", label: "BREACHED" },
  CONTAINED: { dot: "bg-info", text: "text-info", label: "CONTAINED" },
  PATCHED: { dot: "bg-accent", text: "text-accent", label: "PATCHED" },
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
      <div className="flex items-center gap-2" aria-live="polite">
        <motion.span
          className={`inline-block h-2.5 w-2.5 rounded-full ${s.dot}`}
          animate={status === "BREACHED" || status === "UNDER_ATTACK" ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
          transition={{ duration: 0.9, repeat: status === "BREACHED" || status === "UNDER_ATTACK" ? Infinity : 0 }}
        />
        <span className={`font-mono text-sm font-bold tracking-widest ${s.text}`}>{s.label}</span>
      </div>
      <span className="font-mono text-[10px] text-muted">
        attacker: <span className="text-foreground/80">{attackerStage}</span>
      </span>
      <span className="font-mono text-[10px] text-muted">
        capacity: <span className={capacity < 70 ? "text-warn" : "text-foreground/80"}>{capacity}%</span>
      </span>
    </div>
  );
}
