import type { SimState } from "./types";

export const STORAGE_KEY = "php2shell.sim.v1";

/** Read a hydrated SimState, or null when absent/corrupt. */
export function readSavedSim(
  storage: Pick<Storage, "getItem"> | null,
): SimState | null {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SimState;
    return saved && typeof saved.tick === "number" ? saved : null;
  } catch {
    return null;
  }
}

export function writeSavedSim(
  storage: Pick<Storage, "setItem"> | null,
  state: SimState,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode) — non-fatal.
  }
}
