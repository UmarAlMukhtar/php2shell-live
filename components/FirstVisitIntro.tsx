"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CVE } from "@/lib/sim/cve";
import { markIntroSeen } from "@/lib/ui/introGate";

/** Fade-out + mount margin before the dashboard is interactive again. */
const REVEAL_MS = 600;

/** Verified incident facts only — nothing here claims more than the sim does. */
const LINES = [
  `Incident feed: ${CVE.id}.`,
  "A PHP worker's global-state pointer survives an aborted request and keeps aiming at freed heap.",
  "The next request re-issues that slot — the stale pointer now reads attacker-influenced memory.",
  "Watch the use-after-free form live on the heap arena.",
  "Then take a side: the attacker races to BREACH — the defender wins on PATCHED.",
  "Everything on this console is simulated: fictional hosts, fictional code.",
];

interface Props {
  /** Called once the reveal finishes — parent unmounts and ungates playback. */
  onDone: () => void;
}

/** First-visit story overlay — a real modal: background is inert+aria-hidden,
 *  focus starts on Skip, Esc/Skip dismiss, full text present for AT at mount. */
export function FirstVisitIntro({ onDone }: Props) {
  const reduced = useReducedMotion();
  const [closing, setClosing] = useState(false);
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    skipRef.current?.focus();
  }, []);

  const dismiss = useCallback(() => {
    if (closing) return;
    setClosing(true);
    markIntroSeen(typeof localStorage === "undefined" ? null : localStorage);
    window.setTimeout(onDone, reduced ? 0 : REVEAL_MS);
  }, [closing, onDone, reduced]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/90 px-4">
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: reduced ? 0 : 0.3 }}
        onKeyDown={(e) => {
          if (e.key === "Escape") dismiss();
        }}
        className="w-full max-w-lg rounded-[10px] border border-border bg-surface-1 p-6"
      >
        <p className="text-[11px] font-semibold tracking-[0.3em] text-fg-faint uppercase">
          first contact — read me
        </p>
        <h2 id="intro-title" className="mt-1 text-lg font-bold text-fg">
          The exploit you&rsquo;re about to watch
        </h2>
        <div className="mt-4 space-y-2">
          {LINES.map((l, i) => (
            <motion.p
              key={l}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.15 + i * 0.35 }}
              className="text-sm leading-6 text-fg-muted"
            >
              {l}
            </motion.p>
          ))}
        </div>
        <button
          ref={skipRef}
          type="button"
          onClick={dismiss}
          className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-accent-fg hover:bg-accent/85 focus-visible:outline-2 focus-visible:outline-accent"
        >
          Skip intro → enter console
        </button>
      </motion.div>
    </div>
  );
}
