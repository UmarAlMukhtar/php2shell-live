"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { CatmullRomCurve3, Vector3 } from "three";
import type { Line2 } from "three-stdlib";

interface Props {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
  reducedMotion: boolean;
}

/** A glowing arc — a stale pointer reaching from GLOBALS to a heap slot. */
export function PointerLink3D({ from, to, color, reducedMotion }: Props) {
  const line = useRef<Line2>(null);
  const points = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const mid = a.clone().lerp(b, 0.5).add(new Vector3(0, 0.9, 0));
    return new CatmullRomCurve3([a, mid, b]).getPoints(32);
  }, [from, to]);

  useFrame(({ clock }) => {
    const l = line.current;
    if (!l || reducedMotion) return;
    const mat = l.material as { opacity?: number };
    mat.opacity = 0.55 + Math.sin(clock.elapsedTime * 4) * 0.3;
  });

  return (
    <group>
      <Line ref={line} points={points} color={color} lineWidth={2} transparent opacity={0.75} />
      <mesh position={to}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.9} />
      </mesh>
      <mesh position={from}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}
