import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C, SCENE } from "../constants";
import { blurIn, exitStyle, fadeIn, scaleIn, slideY, springPop } from "../utils/animations";
import { Backdrop, Chip, Particles, ShotCard } from "../components/Chrome";

export const RevealScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = SCENE.reveal.duration;
  const cam = interpolate(f, [0, d * fps], [1, 1.03], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const kb = interpolate(f, [0.4 * fps, d * fps], [1.06, 1.1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={exitStyle(f, fps, d)}>
      <Backdrop glowX="65%" glowY="45%" />
      <Particles count={10} />
      <AbsoluteFill style={{ transform: `scale(${cam})`, alignItems: "center", flexDirection: "row" }}>
        <div style={{ position: "absolute", left: 120, top: 300, width: 640 }}>
          <div style={{ marginBottom: 26 }}>
            {["PHP2Shell:", "Live"].map((w, i) => (
              <div key={w} style={{ overflow: "hidden" }}>
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontWeight: 700,
                    fontSize: 96,
                    lineHeight: 1.02,
                    color: i === 1 ? C.accent : C.primary,
                    transform: `translateY(${slideY(f, fps, 0.35 + i * 0.12, 90, 0.6)}px)`,
                    opacity: fadeIn(f, fps, 0.35 + i * 0.12, 0.5),
                    filter: `blur(${blurIn(f, fps, 0.35 + i * 0.12, 0.5, 8)}px)`,
                  }}
                >
                  {w}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, lineHeight: 1.6, color: C.muted, opacity: fadeIn(f, fps, 0.9, 0.5), transform: `translateY(${slideY(f, fps, 0.9, 18, 0.5)}px)` }}>
            A deterministic incident-response
            <br />
            simulator for the heap you
            <br />
            can&apos;t see.
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 34, opacity: springPop(f, fps, 1.15) }}>
            <Chip color={C.vuln} outline>CVE-2026-109619</Chip>
            <Chip>educational simulation</Chip>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 70,
            top: 130,
            opacity: fadeIn(f, fps, 0, 0.45),
            transform: `scale(${scaleIn(f, fps, 0, 1.08, 1, 0.45)}) perspective(1400px) rotateY(-6deg)`,
            filter: `blur(${blurIn(f, fps, 0.15, 0.7, 12)}px)`,
          }}
        >
          <div style={{ transform: `scale(${kb})`, transformOrigin: "30% 40%" }}>
            <ShotCard src="visualize-incident.png" w={880} />
          </div>
        </div>

        {/* light sweep across the card */}
        <div
          style={{
            position: "absolute",
            right: 70,
            top: 130,
            width: 880,
            height: 560,
            overflow: "hidden",
            borderRadius: 18,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 160,
              background: "linear-gradient(105deg, transparent, rgba(34,211,238,0.16), transparent)",
              transform: `translateX(${interpolate(f, [2.8 * fps, 3.5 * fps], [-200, 980], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}px)`,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
