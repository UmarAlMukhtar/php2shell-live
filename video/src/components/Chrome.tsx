import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img, staticFile } from "remotion";
import { C } from "../constants";
import { float, pulse } from "../utils/animations";

/** Layered graphite background: base + structural grid + drifting glow orbs. */
export const Backdrop: React.FC<{ glow?: string; glowX?: string; glowY?: string }> = ({ glow = C.accent, glowX = "20%", glowY = "70%" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drift = pulse(f, fps, 0.05, 5);
  const dx = float(f, fps, 30, 7, 0);
  const dy = float(f, fps, 20, 9, 40);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* structural grid */}
      <AbsoluteFill
        style={{
          opacity: 0.04,
          backgroundImage:
            "linear-gradient(#8B99AC 1px, transparent 1px), linear-gradient(90deg, #8B99AC 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* glow orb */}
      <div
        style={{
          position: "absolute",
          left: glowX,
          top: glowY,
          width: 720,
          height: 720,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glow}22 0%, transparent 65%)`,
          transform: `translate(${dx}px, ${dy}px) scale(${drift})`,
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Hairline-bordered card hosting a real screenshot, with edge light + shadow. */
export const ShotCard: React.FC<{
  src: string;
  w: number | string;
  crop?: { x: number; y: number; w: number; h: number };
  imgAspect?: number; // source width/height — required when crop is used
  style?: React.CSSProperties;
}> = ({ src, w, crop, imgAspect = 1.6, style }) => (
  <div
    style={{
      width: w,
      borderRadius: 18,
      overflow: "hidden",
      border: `1px solid ${C.border}`,
      boxShadow: `0 40px 120px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(34,211,238,0.07), 0 -1px 0 0 rgba(34,211,238,0.25) inset`,
      background: C.surface,
      ...style,
    }}
  >
    {crop ? (
      <div
        style={{
          width: "100%",
          // container aspect = crop region's aspect in source pixels
          aspectRatio: `${(crop.w * imgAspect) / crop.h}`,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            position: "absolute",
            left: `${(-crop.x / crop.w) * 100}%`,
            top: `${(-crop.y / crop.h) * 100}%`,
            width: `${(100 / crop.w) * 100}%`,
          }}
        />
      </div>
    ) : (
      <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
    )}
  </div>
);

/** Small mono chip used for labels/badges. */
export const Chip: React.FC<{ children: React.ReactNode; color?: string; outline?: boolean }> = ({ children, color = C.accent, outline }) => (
  <span
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 18,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
      border: `1px solid ${outline ? color : C.border}`,
      background: outline ? `${color}14` : C.surface,
      borderRadius: 8,
      padding: "6px 12px",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

/** Ambient particle field — a few slow-rising motes. */
export const Particles: React.FC<{ count?: number }> = ({ count = 14 }) => {
  const f = useCurrentFrame();
  const { fps, height, width } = useVideoConfig();
  const dots = Array.from({ length: count }, (_, i) => {
    const px = ((i * 137.5) % 100) / 100;
    const speed = 18 + (i % 5) * 7;
    const y = height - ((f / fps) * speed + i * 130) % (height + 80);
    const x = px * width + float(f, fps, 12, 6, i * 70);
    const o = 0.12 + (i % 3) * 0.08;
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: i % 4 === 0 ? 3 : 2,
          height: i % 4 === 0 ? 3 : 2,
          borderRadius: 2,
          background: C.accent,
          opacity: o,
        }}
      />
    );
  });
  return <AbsoluteFill>{dots}</AbsoluteFill>;
};
