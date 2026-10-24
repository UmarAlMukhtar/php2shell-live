import { readSavedSim } from "@/lib/sim/persist";

/** Dedicated namespaced key — never touches sim/mp persistence. */
export const INTRO_KEY = "p2s.introV2";

type Reader = Pick<Storage, "getItem"> | null;
type Writer = Pick<Storage, "setItem"> | null;

/** True when the intro was already dismissed — or storage can't be read
 *  (private mode etc.), which fails open to the dashboard. */
export function introSeen(storage: Reader): boolean {
  try {
    return storage?.getItem(INTRO_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntroSeen(storage: Writer): void {
  try {
    storage?.setItem(INTRO_KEY, "1");
  } catch {
    // Non-fatal — worst case the intro shows once more next visit.
  }
}

/** True when a *meaningfully progressed* simulation exists — the intro must
 *  not gate a restore. A fresh visit's own initial state (`tick:0`,
 *  `visualStepIndex:-1`, phase "visualize") is persisted by SimProvider right
 *  after hydration, so a bare existence check would race against it. */
export function hasSavedSim(storage: Reader): boolean {
  try {
    const s = readSavedSim(storage);
    if (!s) return false;
    return s.tick > 0 || s.visualStepIndex >= 0 || s.phase !== "visualize";
  } catch {
    return false;
  }
}

export function shouldShowIntro(local: Reader, session: Reader): boolean {
  return !introSeen(local) && !hasSavedSim(session);
}

/* --- auto-completion timing --- */

/** Fade duration for the dismiss reveal (spec: <= 600 ms). */
export const INTRO_REVEAL_MS = 600;
const FIRST_LINE_MS = 150;
const LINE_STAGGER_MS = 350;
const MIN_DWELL_MS = 1500;
const AUTO_MS = 6000;
const AUTO_MS_REDUCED = 3500;

/** When the wall auto-completes: never before the last line has animated in
 *  plus a dwell — Skip/Escape are shortcuts, the timer is the contract. */
export function introAutoMs(reduced: boolean, lineCount: number): number {
  const wall = FIRST_LINE_MS + Math.max(0, lineCount - 1) * LINE_STAGGER_MS;
  return Math.max(reduced ? AUTO_MS_REDUCED : AUTO_MS, wall + MIN_DWELL_MS);
}
