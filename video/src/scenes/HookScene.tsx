import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C, SCENE } from "../constants";
import { exitStyle, fadeIn, springPop } from "../utils/animations";
import { Backdrop } from "../components/Chrome";

const CELLS = 24;
const CORRUPT = [14, 15, 16, 17];

export const HookScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = SCENE.hook.duration;
  const zoom = interpolate(f, [0, d * fps], [1, 1.03], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const typed = Math.floor(f / fps * 60);
  const caption = "A stale pointer survives an aborted request.";

  return (
    <AbsoluteFill style={{ ...exitStyle(f, fps, d), transform: `scale(${zoom})` }}>
      <Backdrop glowX="30%" glowY="55%" />
      <div style={{ position: "absolute", top: 90, left: 110 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, letterSpacing: "0.2em", color: C.muted, opacity: fadeIn(f, fps, 0.1, 0.5) }}>
          INCIDENT FEED / CVE-2026-109619
        </div>
      </div>

      {/* stylized heap strip — labeled as illustrative */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 400, display: "flex", justifyContent: "center", gap: 10 }}>
        {Array.from({ length: CELLS }, (_, i) => {
          const pop = springPop(f, fps, 0.25 + i * 0.03, { damping: 18, stiffness: 260 });
          const corruptAt = CORRUPT.includes(i) ? fadeIn(f, fps, 0.9 + (i - 14) * 0.06, 0.2) : 0;
          const base = i < 9 ? "#3B82F6" : i < 14 ? C.vuln : "#2A3240";
          const color = corruptAt > 0 ? C.breach : base;
          const shake = corruptAt ? Math.sin(f * 0.8 + i) * 2 * corruptAt : 0;
          return (
            <div
              key={i}
              style={{
                width: 52,
                height: 64,
                borderRadius: 8,
                border: `1.5px solid ${color}`,
                background: `${color}${corruptAt ? "33" : "1a"}`,
                transform: `scale(${pop}) translateY(${shake}px)`,
                opacity: pop,
                boxShadow: corruptAt ? `0 0 ${24 * corruptAt}px ${C.breach}55` : "none",
              }}
            />
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 486, width: "100%", textAlign: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, letterSpacing: "0.22em", color: C.muted, border: `1px dashed ${C.border}`, borderRadius: 6, padding: "5px 12px", opacity: fadeIn(f, fps, 0.55, 0.4) }}>
          SIMULATED — ILLUSTRATIVE HEAP
        </span>
      </div>

      <div style={{ position: "absolute", top: 560, width: "100%", textAlign: "center" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, color: C.primary }}>
          {caption.slice(0, typed)}
          <span style={{ opacity: (f % 20) < 10 ? 1 : 0 }}>▌</span>
        </span>
      </div>

      {/* headline slam */}
      <div style={{ position: "absolute", top: 640, width: "100%", textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 92,
            letterSpacing: "0.01em",
            color: C.primary,
            opacity: fadeIn(f, fps, 1.45, 0.3),
            transform: `scale(${0.85 + springPop(f, fps, 1.45, { damping: 14, stiffness: 300 }) * 0.15})`,
            filter: `blur(${interpolate(f, [1.45 * fps, 1.8 * fps], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
          }}
        >
          MAKE THE INVISIBLE <span style={{ color: C.accent }}>VISIBLE</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};
