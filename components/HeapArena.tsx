"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { HeapBlock } from "@/lib/sim/types";
import { HeapVisualizer } from "./HeapVisualizer";

const HeapScene3D = dynamic(
  () => import("./three/HeapScene3D").then((m) => m.HeapScene3D),
  { ssr: false },
);

interface Props {
  heap: HeapBlock[];
  /** Guided-camera focus during autoplay; ignored by the flat fallback. */
  focusId?: number | null;
}

function supports3D(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Heap arena with graceful degradation:
 * WebGL + no reduced-motion → interactive 3D scene; otherwise the flat map.
 */
export function HeapArena({ heap, focusId = null }: Props) {
  const [use3d, setUse3d] = useState(false);
  // prefers-reduced-motion is a live external store — subscribe properly.
  const reduced = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    // Mount-gated capability check — can't run during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUse3d(supports3D() && window.innerWidth >= 420);
  }, []);

  if (use3d) {
    return (
      <section
        aria-label="Heap memory arena"
        className="glass relative min-w-0 overflow-hidden p-0"
        style={{ minHeight: 340 }}
      >
        <HeapScene3D heap={heap} focusId={focusId} reducedMotion={reduced} />
      </section>
    );
  }
  return (
    <div className="glass p-2">
      <HeapVisualizer heap={heap} />
    </div>
  );
}
