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
  "rounded border border-border bg-panel-2 px-3 py-1.5 font-mono text-xs text-foreground/90 transition-colors hover:border-accent/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40 disabled:hover:border-border disabled:hover:text-foreground/90";

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
