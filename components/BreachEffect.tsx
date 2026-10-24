"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

interface Props {
  active: boolean;
}

/** Dramatic full-screen breach flash — honors prefers-reduced-motion. */
export function BreachEffect({ active }: Props) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key="breach"
          className="pointer-events-none fixed inset-0 z-40 border-2 border-breach/70 bg-breach/10"
          initial={{ opacity: 0 }}
          animate={
            reduced
              ? { opacity: 0.5 }
              : { opacity: [0, 0.6, 0.3, 0.5, 0.35] }
          }
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.2 : 1.6 }}
          aria-hidden
        />
      ) : null}
    </AnimatePresence>
  );
}
