"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { HeapBlockState } from "@/lib/sim/types";

export const STATE_COLOR: Record<HeapBlockState, string> = {
  free: "#26303e",
  allocated: "#5b8def",
  freed: "#5b6676",
  reused: "#e2b73c",
  stale: "#e0793c",
  corrupted: "#ee5f55",
};

const STATE_EMISSIVE: Record<HeapBlockState, number> = {
  free: 0.05,
  allocated: 0.4,
  freed: 0.08,
  reused: 0.45,
  stale: 0.6,
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
      m.position.y = Math.sin(clock.elapsedTime * 3 + id) * 0.06;
    }
  });

  return (
    <group position={position}>
      {selected ? (
        <mesh scale={1.18}>
          <boxGeometry args={[0.82, 0.82, 0.82]} />
          <meshBasicMaterial color="#5b8def" wireframe transparent opacity={0.9} />
        </mesh>
      ) : null}
    <mesh
      ref={mesh}
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
        emissiveIntensity={selected ? STATE_EMISSIVE[state] + 0.25 : STATE_EMISSIVE[state]}
        transparent
        opacity={state === "free" ? 0.5 : state === "freed" ? 0.55 : 0.95}
        roughness={0.6}
        metalness={0.2}
      />
    </mesh>
    </group>
  );
}
