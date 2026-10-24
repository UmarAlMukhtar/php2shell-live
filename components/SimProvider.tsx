"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { initialState } from "@/lib/sim/engine";
import { reduce, type GameAction } from "@/lib/sim/reducer";
import { readSavedSim, writeSavedSim } from "@/lib/sim/persist";
import type { SimState } from "@/lib/sim/types";
const TICK_MS = 1100;

interface SimContextValue {
  state: SimState;
  /** False until sessionStorage hydration has run — blocks auto-play races. */
  hydrated: boolean;
  dispatch: React.Dispatch<GameAction>;
}

const SimContext = createContext<SimContextValue | null>(null);

/** Accessing the storage global itself can throw (blocked storage →
 *  SecurityError) — resolve it once inside a guard. */
function safeSessionStorage(): Storage | null {
  try {
    return sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Shared simulation store: one engine state drives Visualize, Defend and
 * Verify. Persisted to sessionStorage so a refresh recovers the incident.
 */
export function SimProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Refresh recovery — hydrate once on mount (client-only). Deferred so
  // the first render paints, and strictly before any save below.
  useEffect(() => {
    const t = setTimeout(() => {
      const saved = readSavedSim(safeSessionStorage());
      if (saved) dispatch({ type: "HYDRATE", state: saved });
      setHydrated(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Persist every state change — but only AFTER hydration ran, otherwise
  // the initial state would clobber the saved game on mount. A completed
  // report persists too, so refresh restores PATCHED/failed outcomes.
  useEffect(() => {
    if (!hydrated) return;
    writeSavedSim(safeSessionStorage(), state);
  }, [state, hydrated]);

  // Attacker ticks forward while defending.
  useEffect(() => {
    if (state.phase !== "defend") return;
    const id = setInterval(() => dispatch({ type: "TICK" }), TICK_MS);
    return () => clearInterval(id);
  }, [state.phase]);

  const value = useMemo(() => ({ state, hydrated, dispatch }), [state, hydrated]);
  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim(): SimContextValue {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used inside SimProvider");
  return ctx;
}
