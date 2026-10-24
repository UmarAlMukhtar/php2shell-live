"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const noopSub = () => () => {};

interface ForensicsContextValue {
  /** FORENSICS mode on/off — hidden from first-time users by default. */
  enabled: boolean;
  toggle: () => void;
  /** Currently inspected heap block, or null. */
  selectedBlock: number | null;
  /** Guided-camera override — set when a trace event targets a block. */
  focusId: number | null;
  /** Inspect a block (or clear with null). Also aims the 3D camera. */
  select: (id: number | null) => void;
}

const Ctx = createContext<ForensicsContextValue | null>(null);

export function ForensicsProvider({ children }: { children: ReactNode }) {
  const [manual, setManual] = useState(false);
  // Deep link: /?forensics=1 opens the console directly.
  const deepLinked = useSyncExternalStore(
    noopSub,
    () => new URLSearchParams(window.location.search).has("forensics"),
    () => false,
  );
  const enabled = manual || deepLinked;
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);

  const toggle = useCallback(() => {
    setManual((e) => {
      if (e) {
        setSelectedBlock(null);
        setFocusId(null);
      }
      return !e;
    });
  }, []);

  const select = useCallback((id: number | null) => {
    setSelectedBlock(id);
    setFocusId(id);
  }, []);

  const value = useMemo(
    () => ({ enabled, toggle, selectedBlock, focusId, select }),
    [enabled, toggle, selectedBlock, focusId, select],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Null when used outside the provider (multiplayer, embeds). */
export function useForensics(): ForensicsContextValue | null {
  return useContext(Ctx);
}
