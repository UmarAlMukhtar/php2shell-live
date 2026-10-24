"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { STAGE_TITLES, VISUAL_TIMELINE } from "@/lib/sim/scenario";
import { useSim } from "./SimProvider";
import { HeapVisualizer } from "./HeapVisualizer";
import { LogStream } from "./LogStream";
import { Terminal } from "./Terminal";
import { StageInspector } from "./StageInspector";
import { StageExplanation } from "./StageExplanation";
import { PlaybackControls } from "./PlaybackControls";

const STEP_MS = 3400;

export function VisualizeView() {
  const { state, dispatch } = useSim();
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

  const advance = useCallback(() => {
    dispatch({
      type: "VISUAL_STEP",
      index: idx + 1,
      step: VISUAL_TIMELINE[idx + 1]!,
    });
  }, [dispatch, idx]);

  // Auto-play driver.
  useEffect(() => {
    if (!playing || atEnd) return;
    timerRef.current = setTimeout(advance, STEP_MS);
    return clearTimer;
  }, [playing, atEnd, advance, clearTimer]);

  const jumpTo = useCallback(
    (index: number) => {
      clearTimer();
      // Rebuild state by replaying steps 0..index from scratch.
      dispatch({ type: "RESET" });
      // RESET is async through the reducer; apply steps on next paint.
      requestAnimationFrame(() => {
        for (let i = 0; i <= index; i++) {
          dispatch({ type: "VISUAL_STEP", index: i, step: VISUAL_TIMELINE[i]! });
        }
      });
      setPlaying(false);
    },
    [clearTimer, dispatch],
  );

  const restart = useCallback(() => {
    clearTimer();
    dispatch({ type: "RESET" });
    requestAnimationFrame(() => {
      dispatch({ type: "VISUAL_STEP", index: 0, step: VISUAL_TIMELINE[0]! });
    });
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
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_1fr]">
        <aside className="order-2 lg:order-1">
          <StageInspector currentIndex={idx} onJump={jumpTo} />
          <div className="mt-3">
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

        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <HeapVisualizer heap={state.heap} />
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

        <div className="order-3 flex min-h-[280px] flex-col gap-4 lg:order-3">
          <div className="min-h-[220px] flex-1 rounded-lg border border-border bg-panel">
            <Terminal lines={state.term} className="h-full" />
          </div>
          <LogStream logs={state.logs} />
        </div>
      </div>

      {atEnd ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-danger/60 bg-danger/10 p-5 text-center"
        >
          <p className="font-mono text-lg font-bold tracking-wider text-danger">
            You watched it happen. Now stop it.
          </p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-foreground/80">
            Take over the incident: identify the vulnerability, contain the attacker,
            patch the runtime correctly, then verify the fix by replaying the attack.
          </p>
          <button
            type="button"
            onClick={enterDefend}
            className="mt-4 rounded border border-danger bg-danger/15 px-6 py-2.5 font-mono text-sm font-bold tracking-widest text-danger transition-colors hover:bg-danger/25 focus-visible:outline-2 focus-visible:outline-danger"
            data-testid="enter-defend"
          >
            ENTER INCIDENT RESPONSE →
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
