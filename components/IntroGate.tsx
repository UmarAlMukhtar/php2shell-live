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
import { shouldShowIntro } from "@/lib/ui/introGate";
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
  return !shouldShowIntro(
    typeof localStorage === "undefined" ? null : localStorage,
    typeof sessionStorage === "undefined" ? null : sessionStorage,
  );
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
    setDone(true);
    document.getElementById("dashboard-title")?.focus();
  }, []);

  return (
    <IntroGateContext.Provider value={{ gateOpen }}>
      <div ref={contentRef}>{children}</div>
      {gateOpen ? <FirstVisitIntro onDone={finish} /> : null}
    </IntroGateContext.Provider>
  );
}
