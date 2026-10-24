"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { HeapBlockState } from "@/lib/sim/types";

export const STATE_COLOR: Record<HeapBlockState, string> = {
  free: "#22334a",
  allocated: "#38bdf8",
  freed: "#475569",
  reused: "#fbbf24",
  stale: "#fb923c",
  corrupted: "#f472b6",
};

const STATE_EMISSIVE: Record<HeapBlockState, number> = {
  free: 0.02,
  allocated: 0.35,
  freed: 0.05,
  reused: 0.4,
  stale: 0.55,
  corrupted: 0.9,
};

interface Props {
  id: number;
  state: HeapBlockState;
  position: [number, number, number];
  selected: boolean;
  onSelect: (id: number) => void;
  reducedMotion: boolean;
}

/** One heap slot as a glowing cuboid in the request arena. */
export function HeapBlock3D({ id, state, position, selected, onSelect, reducedMotion }: Props) {
  const mesh = useRef<Mesh>(null);
  const color = STATE_COLOR[state];
  const hot = state === "stale" || state === "corrupted";

  useFrame(({ clock }) => {
    const m = mesh.current;
    if (!m) return;
    const target = selected ? 1.35 : hot ? 1.12 : 1;
    m.scale.setScalar(m.scale.x + (target - m.scale.x) * 0.15);
    if (!reducedMotion && hot) {
      m.position.y = position[1] + Math.sin(clock.elapsedTime * 3 + id) * 0.06;
    }
  });

  return (
    <mesh
      ref={mesh}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <boxGeometry args={[0.82, 0.82, 0.82]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={STATE_EMISSIVE[state]}
        transparent
        opacity={state === "free" ? 0.5 : state === "freed" ? 0.55 : 0.95}
        roughness={0.35}
        metalness={0.55}
      />
    </mesh>
  );
}
