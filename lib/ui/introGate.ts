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
