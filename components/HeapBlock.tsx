"use client";

import { motion } from "motion/react";
import type { HeapBlockState } from "@/lib/sim/types";

const STATE_STYLE: Record<HeapBlockState, string> = {
  free: "border-border bg-panel-2 text-muted",
  allocated: "border-info/60 bg-info/10 text-info",
  freed: "border-muted/40 bg-transparent text-muted/60",
  reused: "border-warn/70 bg-warn/10 text-warn",
  stale: "border-danger/70 bg-danger/10 text-danger",
  corrupted: "border-danger bg-danger/25 text-danger",
};

interface Props {
  id: number;
  state: HeapBlockState;
  tag: string | null;
  showTag: boolean;
}

export function HeapBlock({ id, state, tag, showTag }: Props) {
  return (
    <motion.div
      layout
      initial={false}
      animate={{
        scale: state === "corrupted" || state === "stale" ? [1, 1.06, 1] : 1,
        opacity: state === "free" ? 0.45 : 1,
      }}
      transition={{ duration: 0.5 }}
      className={`flex h-12 flex-col items-center justify-center rounded border font-mono text-[10px] leading-tight ${STATE_STYLE[state]}`}
      aria-label={`heap block ${id}: ${state}${tag ? ` ${tag}` : ""}`}
    >
      <span className="opacity-70">0x{(id * 0x40).toString(16).padStart(4, "0")}</span>
      {showTag && tag ? <span className="truncate px-0.5 font-bold">{tag}</span> : null}
    </motion.div>
  );
}
