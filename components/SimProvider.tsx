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
import type { SimState } from "@/lib/sim/types";

const STORAGE_KEY = "php2shell.sim.v1";
const TICK_MS = 1100;

interface SimContextValue {
  state: SimState;
  /** False until sessionStorage hydration has run — blocks auto-play races. */
  hydrated: boolean;
  dispatch: React.Dispatch<GameAction>;
}

const SimContext = createContext<SimContextValue | null>(null);

/**
 * Shared simulation store: one engine state drives Visualize, Defend and
 * Verify. Persisted to sessionStorage so a refresh recovers the incident.
 */
export function SimProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  const [hydrated, setHydrated] = useState(false);

  // Refresh recovery — hydrate once on mount (client-only).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as SimState;
        if (saved && typeof saved.tick === "number") {
          dispatch({ type: "HYDRATE", state: saved });
        }
      }
    } catch {
      // Corrupt/absent storage → fresh state, which is fine.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage may be unavailable (private mode) — non-fatal.
    }
  }, [state]);

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
