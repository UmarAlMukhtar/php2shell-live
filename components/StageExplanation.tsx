"use client";

import { AnimatePresence, motion } from "motion/react";

interface Props {
  title: string;
  stage: number;
  explanation: string;
}

export function StageExplanation({ title, stage, explanation }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.aside
        key={title}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
        className="rounded-[10px] border border-border bg-surface-1 p-4"
        aria-live="polite"
      >
        <p className="mb-1 font-mono text-[11px] tracking-widest text-fg-faint uppercase">
          stage {stage + 1} / 5 — {title}
        </p>
        <p className="text-sm leading-relaxed text-fg">{explanation}</p>
      </motion.aside>
    </AnimatePresence>
  );
}
