"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { STAGE_TITLES, VISUAL_TIMELINE } from "@/lib/sim/scenario";
import { useSim } from "./SimProvider";
import { HeapArena } from "./HeapArena";
import { LogStream } from "./LogStream";
import { Terminal } from "./Terminal";
import { StageInspector } from "./StageInspector";
import { StageExplanation } from "./StageExplanation";
import { PlaybackControls } from "./PlaybackControls";
import { EvidenceSection } from "./EvidenceSection";
import { HeapAllocStrip } from "./HeapAllocStrip";
import { useIntroGate } from "./IntroGate";

const STEP_MS = 3400;

export function VisualizeView() {
  const { state, hydrated, dispatch } = useSim();
  const { gateOpen } = useIntroGate();
  const [playing, setPlaying] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idx = state.visualStepIndex;
  const atEnd = idx >= VISUAL_TIMELINE.length - 1;
  const current = idx >= 0 ? VISUAL_TIMELINE[idx] : undefined;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Auto-play driver — functional VISUAL_NEXT so a re-hydrated state can
  // never be overwritten by a stale step index.
  useEffect(() => {
    if (!hydrated || !playing || atEnd || gateOpen) return;
    timerRef.current = setTimeout(() => dispatch({ type: "VISUAL_NEXT" }), STEP_MS);
    return clearTimer;
  }, [hydrated, playing, atEnd, gateOpen, idx, clearTimer, dispatch]);

  const jumpTo = useCallback(
    (index: number) => {
      clearTimer();
      dispatch({ type: "VISUAL_GOTO", index });
      setPlaying(false);
    },
    [clearTimer, dispatch],
  );

  const restart = useCallback(() => {
    clearTimer();
    dispatch({ type: "VISUAL_RESTART" });
    setPlaying(true);
  }, [clearTimer, dispatch]);

  const skip = useCallback(() => {
    jumpTo(VISUAL_TIMELINE.length - 1);
  }, [jumpTo]);

  const enterDefend = useCallback(() => {
    dispatch({ type: "SET_PHASE", phase: "defend" });
  }, [dispatch]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="order-2 min-w-0 lg:order-1 lg:col-span-3">
          <div className="rounded-[10px] border border-border bg-surface-1 p-3">
            <StageInspector currentIndex={idx} onJump={jumpTo} />
          </div>
          <div className="mt-3 rounded-[10px] border border-border bg-surface-1 p-3">
            <PlaybackControls
              playing={playing}
              atEnd={atEnd}
              onPause={() => {
                clearTimer();
                setPlaying(false);
              }}
              onResume={() => setPlaying(true)}
              onRestart={restart}
              onSkip={skip}
            />
          </div>
        </aside>

        <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-2 lg:col-span-6">
          <div className="rounded-[10px] border border-border bg-surface-1 px-3 py-2">
            <HeapAllocStrip heap={state.heap} />
          </div>
          <HeapArena
            heap={state.heap}
            focusId={
              state.heap.find((b) => b.state === "stale" || b.state === "corrupted")
                ?.id ?? null
            }
          />
          {current ? (
            <StageExplanation
              title={STAGE_TITLES[current.stage] ?? current.title}
              stage={current.stage}
              explanation={current.explanation}
            />
          ) : (
            <StageExplanation
              title={STAGE_TITLES[0]!}
              stage={0}
              explanation="Incident playback begins automatically — watch the request arena."
            />
          )}
        </div>

        <div className="order-3 flex min-w-0 flex-col gap-4 lg:order-3 lg:col-span-3">
          <EvidenceSection title="Simulated terminal" className="min-h-[220px]">
            <Terminal lines={state.term} className="h-full min-h-[220px]" />
          </EvidenceSection>
          <EvidenceSection title="Security logs">
            <div className="max-h-64 overflow-hidden">
              <LogStream logs={state.logs} />
            </div>
          </EvidenceSection>
        </div>
      </div>

      {atEnd ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[10px] border border-b-2 border-border border-b-breach bg-surface-1 p-5 text-center"
        >
          <p className="text-lg font-bold tracking-wide text-breach">
            You watched it happen. Now stop it.
          </p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-fg-muted">
            Take over the incident: identify the vulnerability, contain the attacker,
            patch the runtime correctly, then verify the fix by replaying the attack.
          </p>
          <button
            type="button"
            onClick={enterDefend}
            className="mt-4 rounded-lg bg-accent px-6 py-2.5 text-sm font-bold tracking-widest text-accent-fg transition-colors hover:bg-accent/85 focus-visible:outline-2 focus-visible:outline-accent"
            data-testid="enter-defend"
          >
            ENTER INCIDENT RESPONSE →
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
