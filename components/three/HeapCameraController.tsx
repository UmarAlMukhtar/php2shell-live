"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface Props {
  /** World position the guided camera should look at, or null for free orbit. */
  focus: [number, number, number] | null;
  /** Increment to snap the camera back to its default view. */
  resetTick: number;
}

const HOME = new Vector3(4.5, 4.2, 7.5);

/** Orbit controls + gentle guided camera during autoplay stages. */
export function HeapCameraController({ focus, resetTick }: Props) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (focus) {
      c.target.lerp(new Vector3(...focus), 0.35);
      const dir = camera.position.clone().sub(c.target).normalize();
      camera.position.copy(c.target.clone().add(dir.multiplyScalar(6.2)));
    }
    c.update();
  }, [focus, camera]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    c.target.set(0, 0.6, 0);
    camera.position.copy(HOME);
    c.update();
  }, [resetTick, camera]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3.2}
      maxDistance={16}
      maxPolarAngle={Math.PI * 0.52}
      enablePan={false}
    />
  );
}
