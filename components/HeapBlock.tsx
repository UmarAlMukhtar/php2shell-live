"use client";

import { motion } from "motion/react";
import type { HeapBlockState } from "@/lib/sim/types";

const STATE_STYLE: Record<HeapBlockState, string> = {
  free: "border-border bg-surface-2 text-fg-faint",
  allocated: "border-accent/60 bg-accent/10 text-accent",
  freed: "border-fg-faint/40 bg-transparent text-fg-muted",
  reused: "border-vuln/70 bg-vuln/10 text-vuln",
  stale: "border-attack/70 bg-attack/10 text-attack",
  corrupted: "border-breach bg-breach/25 text-breach",
};

interface Props {
  id: number;
  state: HeapBlockState;
  tag: string | null;
  showTag: boolean;
  selected?: boolean;
  onSelect?: (id: number | null) => void;
}

export function HeapBlock({ id, state, tag, showTag, selected = false, onSelect }: Props) {
  const inner = (
    <>
      <span className="opacity-70">0x{(id * 0x40).toString(16).padStart(4, "0")}</span>
      {showTag && tag ? <span className="truncate px-0.5 font-bold">{tag}</span> : null}
    </>
  );
  const cls = `flex h-12 w-full flex-col items-center justify-center rounded border font-mono text-[10px] leading-tight ${STATE_STYLE[state]} ${selected ? "ring-2 ring-accent" : ""}`;

  const motionProps = {
    layout: true as const,
    initial: false as const,
    animate: {
      scale: state === "corrupted" || state === "stale" ? [1, 1.06, 1] : 1,
      opacity: state === "free" ? 0.45 : 1,
    },
    transition: { duration: 0.5 },
    className: cls,
    "aria-label": `heap block ${id}: ${state}${tag ? ` ${tag}` : ""}`,
    "aria-pressed": onSelect ? selected : undefined,
  };

  if (onSelect) {
    return (
      <motion.button type="button" onClick={() => onSelect(selected ? null : id)} {...motionProps}>
        {inner}
      </motion.button>
    );
  }
  return <motion.div {...motionProps}>{inner}</motion.div>;
}
