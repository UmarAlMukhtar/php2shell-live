"use client";

import { useMemo, useState, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import type { HeapBlock, HeapBlockState } from "@/lib/sim/types";
import { HeapBlock3D } from "./HeapBlock3D";
import { PointerLink3D } from "./PointerLink3D";
import { HeapCameraController } from "./HeapCameraController";
import { HeapLegend3D } from "./HeapLegend3D";

const COLS = 8;
const GAP = 1.05;
const GLOBALS_POS: [number, number, number] = [-4.2, 2.6, -1.8];

export function blockPosition(id: number): [number, number, number] {
  const col = id % COLS;
  const row = Math.floor(id / COLS);
  return [col * GAP - ((COLS - 1) * GAP) / 2, 0.55, row * GAP - 0.55];
}

interface Props {
  heap: HeapBlock[];
  /** Block id the guided camera should emphasize (autoplay stages), or null. */
  focusId?: number | null;
  reducedMotion: boolean;
  /** Controlled selection (FORENSICS); omit for internal toggle behavior. */
  selectedId?: number | null;
  onSelect?: (id: number | null) => void;
}

/** Interactive 3D Zend-heap arena — centerpiece of the command deck. */
export function HeapScene3D({ heap, focusId = null, reducedMotion, selectedId: controlled, onSelect: onSelectProp }: Props) {
  const [internal, setInternal] = useState<number | null>(null);
  const [resetTick, setResetTick] = useState(0);

  const selectedId = onSelectProp ? (controlled ?? null) : internal;
  const onSelect = useCallback(
    (id: number) => {
      const next = id < 0 ? null : selectedId === id ? null : id;
      if (onSelectProp) onSelectProp(next);
      else setInternal(next);
    },
    [onSelectProp, selectedId],
  );

  const links = useMemo(
    () =>
      heap
        .filter((b) => b.state === "stale" || b.state === "corrupted")
        .map((b) => ({
          id: b.id,
          to: blockPosition(b.id),
          color: b.state === "corrupted" ? "#ee5f55" : "#e0793c",
        })),
    [heap],
  );

  const focus = focusId != null ? blockPosition(focusId) : null;
  const selected = selectedId != null ? heap.find((b) => b.id === selectedId) : null;

  return (
    <div className="relative h-full w-full min-h-[320px]" role="img"
      aria-label={`3D heap arena: ${heap.filter((b) => b.state !== "free").length} used of ${heap.length} slots`}>
      <Canvas
        camera={{ position: [4.5, 4.2, 7.5], fov: 42 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
        onPointerMissed={() => onSelect(-1)}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 9, 4]} intensity={1.1} color="#e6ebf2" />

        {/* arena floor grid */}
        <gridHelper args={[14, 20, "#26303e", "#1e2530"]} position={[0, 0, 0]} />
        <Line
          points={[[-5, 0.02, 2.2], [5, 0.02, 2.2]]}
          color="#36455a"
          lineWidth={1}
          transparent
          opacity={0.3}
        />

        {/* GLOBALS registry — the stale-pointer source */}
        <group position={GLOBALS_POS}>
          <mesh>
            <icosahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial
              color={links.length ? "#e0793c" : "#647183"}
              emissive={links.length ? "#e0793c" : "#647183"}
              emissiveIntensity={links.length ? 0.9 : 0.4}
              wireframe
            />
          </mesh>
          <Html center distanceFactor={9} className="pointer-events-none select-none">
            <div className="font-mono text-[11px] tracking-widest text-fg-faint whitespace-nowrap">
              $GLOBALS
            </div>
          </Html>
        </group>

        {links.map((l) => (
          <PointerLink3D
            key={l.id}
            from={GLOBALS_POS}
            to={[l.to[0], l.to[1] + 0.45, l.to[2]]}
            color={l.color}
            reducedMotion={reducedMotion}
          />
        ))}

        {heap.map((b) => (
          <HeapBlock3D
            key={b.id}
            id={b.id}
            state={b.state as HeapBlockState}
            position={blockPosition(b.id)}
            selected={selectedId === b.id}
            onSelect={onSelect}
            reducedMotion={reducedMotion}
          />
        ))}

        <HeapCameraController focus={focus} resetTick={resetTick} />
      </Canvas>

      {/* HTML overlays: legend, inspector, camera reset */}
      <HeapLegend3D />
      {selected && (
        <div className="absolute bottom-3 left-3 max-w-[220px] rounded-lg border border-border bg-surface-1 px-3 py-2 font-mono text-[11px] leading-4">
          <p className="text-accent">0x{(selected.id * 0x40).toString(16).padStart(4, "0")}</p>
          <p className="text-fg">state: {selected.state}</p>
          {selected.tag && <p className="text-fg-muted">tag: {selected.tag}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => setResetTick((t) => t + 1)}
        className="absolute top-3 right-3 rounded-md border border-border bg-surface-1 px-2.5 py-1.5 text-[11px] font-semibold tracking-widest text-fg-muted uppercase hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        aria-label="Reset camera"
      >
        ⟲ view
      </button>
    </div>
  );
}
