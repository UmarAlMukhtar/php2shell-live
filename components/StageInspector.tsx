"use client";

import { STAGE_TITLES, VISUAL_TIMELINE } from "@/lib/sim/scenario";

interface Props {
  currentIndex: number;
  onJump: (index: number) => void;
}

/** Stage rail for step inspection during Visualize. */
export function StageInspector({ currentIndex, onJump }: Props) {
  const firstIndexOfStage = (stage: number) =>
    VISUAL_TIMELINE.findIndex((s) => s.stage === stage);

  const currentStage = currentIndex < 0 ? -1 : VISUAL_TIMELINE[currentIndex]?.stage ?? -1;

  return (
    <nav aria-label="Incident stages" className="flex flex-col gap-1">
      {STAGE_TITLES.map((title, stage) => {
        const idx = firstIndexOfStage(stage);
        const done = currentStage > stage;
        const active = currentStage === stage;
        return (
          <button
            key={title}
            type="button"
            onClick={() => idx >= 0 && onJump(idx)}
            disabled={idx < 0}
            className={`flex items-center gap-2 rounded border px-2.5 py-2 text-left font-mono text-[11px] transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
              active
                ? "border-accent/70 bg-accent/10 text-accent"
                : done
                  ? "border-border bg-panel-2 text-foreground/70 hover:border-accent/40"
                  : "border-border/60 bg-transparent text-muted hover:border-border"
            }`}
            aria-current={active ? "step" : undefined}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                active ? "border-accent text-accent" : done ? "border-accent/50 text-accent/70" : "border-muted/50"
              }`}
            >
              {done ? "✓" : stage + 1}
            </span>
            {title}
          </button>
        );
      })}
    </nav>
  );
}
