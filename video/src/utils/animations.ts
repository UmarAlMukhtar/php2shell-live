import { Easing, interpolate, spring } from "remotion";

export const EXPO = Easing.bezier(0.16, 1, 0.3, 1);
export const GLIDE = Easing.bezier(0.25, 0.1, 0.25, 1);
export const DRIFT = Easing.bezier(0.4, 0, 0.6, 1);

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const fadeIn = (f: number, fps: number, d = 0, dur = 0.4) =>
  interpolate(f, [d * fps, (d + dur) * fps], [0, 1], { ...cl, easing: EXPO });

export const slideY = (f: number, fps: number, d = 0, from = 24, dur = 0.5) =>
  interpolate(f, [d * fps, (d + dur) * fps], [from, 0], { ...cl, easing: EXPO });

export const slideX = (f: number, fps: number, d = 0, from = 40, dur = 0.5) =>
  interpolate(f, [d * fps, (d + dur) * fps], [from, 0], { ...cl, easing: EXPO });

export const scaleIn = (f: number, fps: number, d = 0, from = 0.9, to = 1, dur = 0.5) =>
  interpolate(f, [d * fps, (d + dur) * fps], [from, to], { ...cl, easing: GLIDE });

export const blurIn = (f: number, fps: number, d = 0, dur = 0.5, from = 10) =>
  interpolate(f, [d * fps, (d + dur) * fps], [from, 0], { ...cl, easing: EXPO });

export const springPop = (f: number, fps: number, d = 0, cfg?: { damping?: number; stiffness?: number; mass?: number }) => {
  const df = Math.round(d * fps);
  if (f < df) return 0;
  return spring({ frame: f - df, fps, config: { damping: cfg?.damping ?? 15, stiffness: cfg?.stiffness ?? 240, mass: cfg?.mass ?? 0.8 } });
};

export const float = (f: number, fps: number, amp = 10, periodSec = 4, phase = 0) =>
  Math.sin(((f / fps) + phase) * ((2 * Math.PI) / periodSec)) * amp;

export const pulse = (f: number, fps: number, amp = 0.03, periodSec = 3) =>
  1 + Math.sin((f / fps) * ((2 * Math.PI) / periodSec)) * amp;

/** compound exit — returns style props for a root AbsoluteFill */
export const exitStyle = (f: number, fps: number, durSec: number, exitLen = 0.4) => {
  const s = (durSec - exitLen) * fps;
  return {
    opacity: interpolate(f, [s, durSec * fps], [1, 0], cl),
    transform: `scale(${interpolate(f, [s, durSec * fps], [1, 0.97], cl)})`,
    filter: `blur(${interpolate(f, [s, durSec * fps], [0, 5], cl)}px)`,
  };
};

/** characters-in staggered text */
export const charDelay = (i: number, base = 0.025) => i * base;
