"use client";

interface Props {
  playing: boolean;
  atEnd: boolean;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onSkip: () => void;
  onStep?: (index: number) => void;
}

const BTN =
  "rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-fg transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 disabled:hover:border-border disabled:hover:text-fg";

export function PlaybackControls({ playing, atEnd, onPause, onResume, onRestart, onSkip }: Props) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Playback controls">
      {playing ? (
        <button type="button" className={BTN} onClick={onPause}>
          ❚❚ pause
        </button>
      ) : (
        <button type="button" className={BTN} onClick={onResume} disabled={atEnd}>
          ▶ continue
        </button>
      )}
      <button type="button" className={BTN} onClick={onRestart}>
        ↺ restart
      </button>
      <button type="button" className={BTN} onClick={onSkip} disabled={atEnd}>
        ⇥ skip to incident
      </button>
    </div>
  );
}
