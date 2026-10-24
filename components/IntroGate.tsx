"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { markIntroSeen, shouldShowIntro } from "@/lib/ui/introGate";
import { FirstVisitIntro } from "./FirstVisitIntro";

interface IntroGateValue {
  /** True while the intro (or its reveal) is up — consumers must hold
   *  autoplay so nothing advances unseen. */
  gateOpen: boolean;
}

const IntroGateContext = createContext<IntroGateValue>({ gateOpen: false });

export function useIntroGate(): IntroGateValue {
  return useContext(IntroGateContext);
}

const noopSub = () => () => {};

function readBypass(): boolean {
  // Even *accessing* the storage globals can throw (blocked storage →
  // SecurityError) — must not escape the snapshot or React unmounts.
  try {
    return !shouldShowIntro(localStorage, sessionStorage);
  } catch {
    return true;
  }
}

/** First-visit intro gate: mounts the dialog as a sibling of the page
 *  content so `inert`/`aria-hidden` never swallows the dialog itself. */
export function IntroGate({ children }: { children: ReactNode }) {
  // Server snapshot "true" (bypassed) — client re-reads post-hydration.
  const bypass = useSyncExternalStore(noopSub, readBypass, () => true);
  const [done, setDone] = useState(false);
  const gateOpen = !bypass && !done;
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    (el as HTMLElement & { inert: boolean }).inert = gateOpen;
    if (gateOpen) el.setAttribute("aria-hidden", "true");
    else el.removeAttribute("aria-hidden");
  }, [gateOpen]);

  const finish = useCallback(() => {
    try {
      markIntroSeen(localStorage);
    } catch {
      // non-fatal
    }
    setDone(true);
  }, []);

  // Focus returns to the dashboard heading only after the inert wrapper is
  // removed (post-commit) — focusing earlier silently no-ops.
  useEffect(() => {
    if (done) document.getElementById("dashboard-title")?.focus();
  }, [done]);

  return (
    <IntroGateContext.Provider value={{ gateOpen }}>
      <div ref={contentRef}>{children}</div>
      {gateOpen ? <FirstVisitIntro onDone={finish} /> : null}
    </IntroGateContext.Provider>
  );
}
