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

/** True when a resumable simulation exists (visitor is mid-incident or
 *  has a completed report) — the intro must not gate a restore. */
export function hasSavedSim(storage: Reader): boolean {
  try {
    return readSavedSim(storage) !== null;
  } catch {
    return false;
  }
}

export function shouldShowIntro(local: Reader, session: Reader): boolean {
  return !introSeen(local) && !hasSavedSim(session);
}
