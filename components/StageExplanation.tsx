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
        className="rounded-lg border border-border bg-panel p-4"
        aria-live="polite"
      >
        <p className="mb-1 font-mono text-[10px] tracking-widest text-muted uppercase">
          stage {stage + 1} / 5 — {title}
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">{explanation}</p>
      </motion.aside>
    </AnimatePresence>
  );
}
