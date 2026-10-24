import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { C, SCENE } from "../constants";
import { blurIn, exitStyle, fadeIn, scaleIn, slideX, slideY, springPop } from "../utils/animations";
import { Backdrop, ShotCard } from "../components/Chrome";

const cl = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Kicker: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: 72, left: 110, opacity: fadeIn(f, fps, delay, 0.4), transform: `translateX(${slideX(f, fps, delay, -20, 0.4)}px)` }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 19, letterSpacing: "0.22em", color: C.accent }}>
        {text}
      </span>
    </div>
  );
};

const Callout: React.FC<{ i: number; title: string; sub: string; y: number }> = ({ i, title, sub, y }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = 0.6 + i * 0.16;
  return (
    <div style={{ position: "absolute", right: 110, top: y, width: 380, opacity: fadeIn(f, fps, d, 0.4), transform: `translateY(${slideY(f, fps, d, 26, 0.4)}px)`, filter: `blur(${blurIn(f, fps, d, 0.4, 6)}px)` }}>
      <div style={{ borderLeft: `2px solid ${C.accent}`, paddingLeft: 18 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 27, color: C.primary }}>{title}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>{sub}</div>
      </div>
    </div>
  );
};

export const VisualizeScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = SCENE.visualize.duration;
  const pan = interpolate(f, [0, d * fps], [0, -3.5], cl);
  return (
    <AbsoluteFill style={exitStyle(f, fps, d)}>
      <Backdrop glow={C.breach} glowX="15%" glowY="60%" />
      <Kicker text="01 / VISUALIZE" />
      <div style={{ position: "absolute", left: 60, top: 150, opacity: fadeIn(f, fps, 0.1, 0.6), transform: `translateX(${slideX(f, fps, 0.1, 60, 0.6) + pan * 4}px)`, filter: `blur(${blurIn(f, fps, 0.1, 0.6, 10)}px)` }}>
        <ShotCard src="crops/visualize-incident.png" w={1180} />
      </div>
      <Callout i={0} y={190} title="Five-stage incident" sub="suspicious input → fatal error → heap churn → UAF → compromise" />
      <Callout i={1} y={380} title="Live heap arena" sub="allocation states rendered in semantic color — stale refs exposed" />
      <Callout i={2} y={570} title="Status telemetry" sub="SAFE → BREACHED, attacker stage, capacity" />
      <div style={{ position: "absolute", bottom: 70, left: 110, opacity: fadeIn(f, fps, 1.6, 0.5) }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 21, color: C.primary }}>
          You watch the corruption <span style={{ color: C.breach }}>form</span> — not read about it.
        </span>
      </div>
    </AbsoluteFill>
  );
};

const TABS = ["INSPECTOR", "TRACE", "A/B REPLAY", "CHECKS"];

export const ForensicsScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = SCENE.forensics.duration;
  const n = TABS.length;
  const activeIdx = Math.min(n - 1, Math.floor(((f / fps - 1.2) / 0.55)));
  return (
    <AbsoluteFill style={exitStyle(f, fps, d)}>
      <Backdrop glowX="50%" glowY="30%" />
      <Kicker text="02 / FORENSICS" />
      <div style={{ position: "absolute", top: 150, width: "100%", display: "flex", justifyContent: "center", gap: 18 }}>
        {TABS.map((t, i) => {
          const c = Math.abs(i - (n - 1) / 2);
          const pop = springPop(f, fps, 0.25 + c * 0.09);
          const active = i === activeIdx;
          return (
            <div key={t} style={{ opacity: pop, transform: `scale(${0.8 + pop * 0.2})`, textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 21, letterSpacing: "0.12em", padding: "10px 22px", color: active ? C.accent : C.muted, transition: "none" }}>{t}</div>
              <div style={{ height: 2, background: C.accent, transform: `scaleX(${active ? fadeIn(f, fps, 1.2 + i * 0.55, 0.2) : 0})`, transformOrigin: "left" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 250, display: "flex", justifyContent: "center", opacity: fadeIn(f, fps, 0.5, 0.6), transform: `translateY(${slideY(f, fps, 0.5, 34, 0.6)}px)`, filter: `blur(${blurIn(f, fps, 0.5, 0.6, 8)}px)` }}>
        <div style={{ transform: `translateY(${interpolate(f, [0.5 * fps, d * fps], [0, -4], cl)}%)` }}>
          <ShotCard src="crops/forensics-console.png" w={1500} />
        </div>
      </div>
      <div style={{ position: "absolute", bottom: 64, width: "100%", textAlign: "center", opacity: fadeIn(f, fps, 1.8, 0.5) }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 21, color: C.primary }}>
          Inspect every allocation. Replay exploit <span style={{ color: C.breach }}>vs</span> patched runtime.
        </span>
      </div>
    </AbsoluteFill>
  );
};

const ACTIONS = ["inspect logs", "investigate php version", "block suspicious source", "isolate the worker", "apply patch 8.3.36", "restart services", "verify remediation"];

export const DefendScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = SCENE.defend.duration;
  const cool = interpolate(f, [0.5 * fps, 4.8 * fps], [0, 1], cl);
  return (
    <AbsoluteFill style={exitStyle(f, fps, d)}>
      <Backdrop glow={cool < 0.6 ? C.vuln : C.accent} glowX="70%" glowY="60%" />
      <Kicker text="03 / DEFEND" />
      <div style={{ position: "absolute", left: 110, top: 170, width: 520 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 17, color: C.muted, letterSpacing: "0.18em", marginBottom: 22, opacity: fadeIn(f, fps, 0.3, 0.4) }}>
          RESPONSE PROTOCOL — 7 STEPS
        </div>
        {ACTIONS.map((a, i) => {
          const show = fadeIn(f, fps, 0.45 + i * 0.12, 0.35);
          const checked = fadeIn(f, fps, 1.5 + i * 0.42, 0.25);
          return (
            <div key={a} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 15, opacity: show, transform: `translateX(${slideX(f, fps, 0.45 + i * 0.12, -30, 0.35)}px)` }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${checked ? C.ok : C.border}`, color: C.ok, fontFamily: "'JetBrains Mono', monospace", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", background: checked ? `${C.ok}1f` : "transparent" }}>
                {checked ? "✓" : ""}
              </span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 23, color: checked ? C.primary : C.muted, letterSpacing: "0.04em" }}>{a}</span>
            </div>
          );
        })}
        <div style={{ marginTop: 26, opacity: fadeIn(f, fps, 3.4, 0.5) }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: C.vuln }}>
            prerequisites enforced — only the right patch remediates
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", right: 70, top: 160, opacity: fadeIn(f, fps, 0.2, 0.6), transform: `translateY(${slideY(f, fps, 0.2, 60, 0.6)}px) scale(${scaleIn(f, fps, 0.2, 0.96, 1, 0.6)})`, filter: `blur(${blurIn(f, fps, 0.2, 0.6, 8)}px)` }}>
        <ShotCard src="crops/defend-actions.png" w={1120} />
      </div>
    </AbsoluteFill>
  );
};

export const MultiplayerScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = SCENE.multiplayer.duration;
  const meet = springPop(f, fps, 1.2, { damping: 13, stiffness: 200 });
  const la = slideX(f, fps, 0.2, -46, 0.6) * (1 - meet * 0.15);
  const lb = slideX(f, fps, 0.2, 46, 0.6) * (1 - meet * 0.15);
  return (
    <AbsoluteFill style={exitStyle(f, fps, d)}>
      <Backdrop glowX="50%" glowY="45%" />
      <Kicker text="04 / MULTIPLAYER" />
      {/* split glow */}
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "50%", background: `linear-gradient(90deg, ${C.breach}0d, transparent)` }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: `linear-gradient(270deg, ${C.accent}0d, transparent)` }} />
      <div style={{ position: "absolute", top: 190, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 40 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 84, color: C.breach, transform: `translateX(${la}vw * -0.01)`, opacity: fadeIn(f, fps, 0.15, 0.5), filter: `blur(${blurIn(f, fps, 0.15, 0.5, 8)}px)` }}>ATTACKER</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 34, color: C.muted, transform: `scale(${0.6 + meet * 0.4})`, opacity: meet }}>VS</span>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 84, color: C.accent, transform: `translateX(${lb}vw * 0.01)`, opacity: fadeIn(f, fps, 0.15, 0.5), filter: `blur(${blurIn(f, fps, 0.15, 0.5, 8)}px)` }}>DEFENDER</span>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, display: "flex", justifyContent: "center", opacity: fadeIn(f, fps, 0.6, 0.6), transform: `scale(${scaleIn(f, fps, 0.6, 0.94, 1, 0.6)})`, filter: `blur(${blurIn(f, fps, 0.6, 0.6, 8)}px)` }}>
        <ShotCard src="crops/multiplayer-lobby.png" w={1300} />
      </div>
      <div style={{ position: "absolute", right: 120, bottom: 90, transform: `scale(${springPop(f, fps, 2)})`, opacity: fadeIn(f, fps, 2, 0.4) }}>
        <ShotCard src="mobile-390.png" w={190} />
      </div>
      <div style={{ position: "absolute", bottom: 92, left: 120, opacity: fadeIn(f, fps, 1.8, 0.5) }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 21, color: C.primary }}>
          same simulation, live — <span style={{ color: C.accent }}>host, join, or spectate</span>
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const ClimaxScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = SCENE.climax.duration;
  const slam = springPop(f, fps, 0.5, { damping: 12, stiffness: 260, mass: 1 });
  const ring = interpolate(f, [0.55 * fps, 1.3 * fps], [0, 1], cl);
  const push = interpolate(f, [0, d * fps], [1, 1.05], cl);
  return (
    <AbsoluteFill style={exitStyle(f, fps, d)}>
      <Backdrop glow={C.ok} glowX="50%" glowY="55%" />
      <AbsoluteFill style={{ transform: `scale(${push})`, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", top: 120, left: 110, zIndex: 5 }}>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 190,
              color: C.ok,
              letterSpacing: "0.02em",
              opacity: fadeIn(f, fps, 0.5, 0.3),
              transform: `scale(${1.4 - slam * 0.4})`,
              filter: `blur(${interpolate(f, [0.5 * fps, 0.9 * fps], [14, 0], cl)}px)`,
              WebkitTextStroke: `1px ${C.ok}`,
              textShadow: `0 0 60px ${C.ok}44`,
            }}
          >
            PATCHED
          </span>
        </div>
        {/* shockwave ring */}
        <div style={{ position: "absolute", left: 300, top: 200, width: 400, height: 400, borderRadius: "50%", border: `3px solid ${C.ok}`, opacity: (1 - ring) * 0.6, transform: `scale(${0.2 + ring * 4.5})`, pointerEvents: "none" }} />
        <div style={{ marginTop: 180, opacity: fadeIn(f, fps, 0.35, 0.7), transform: `scale(${scaleIn(f, fps, 0.35, 0.88, 1, 0.7)})`, filter: `blur(${blurIn(f, fps, 0.35, 0.7, 10)}px)` }}>
          <ShotCard src="crops/verify-report.png" w={1060} />
        </div>
        <div style={{ position: "absolute", bottom: 120, display: "flex", gap: 12 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${C.ok}`, background: `${C.ok}1a`, color: C.ok, fontFamily: "'JetBrains Mono', monospace", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${springPop(f, fps, 1.6 + n * 0.08)})` }}>
              {n}
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", bottom: 70, opacity: fadeIn(f, fps, 2.2, 0.5) }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 21, color: C.muted }}>replay the attack — prove the fix</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const CloseScene: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const url = "php2shell-live.vercel.app";
  return (
    <AbsoluteFill>
      <Backdrop glowX="50%" glowY="40%" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 110, color: C.primary }}>
            {"PHP2Shell: Live".split("").map((ch, i) => (
              <span key={i} style={{ display: "inline-block", opacity: fadeIn(f, fps, 0.2 + i * 0.025, 0.3), transform: `translateY(${slideY(f, fps, 0.2 + i * 0.025, 26, 0.35)}px)`, filter: `blur(${blurIn(f, fps, 0.2 + i * 0.025, 0.3, 6)}px)` }}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </div>
          <div style={{ height: 3, width: 420, margin: "14px auto 0", background: `linear-gradient(90deg, transparent, ${C.accent}, transparent)`, transform: `scaleX(${fadeIn(f, fps, 0.7, 0.5)})` }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 27, color: C.muted, marginTop: 34, opacity: fadeIn(f, fps, 1, 0.5), transform: `translateY(${slideY(f, fps, 1, 16, 0.5)}px)` }}>
            Watch a use-after-free form on a live heap —
            <br />
            then stop it.
          </div>
          <div style={{ marginTop: 52, display: "inline-block", opacity: springPop(f, fps, 1.6), transform: `scale(${springPop(f, fps, 1.6)})` }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, letterSpacing: "0.06em", color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 12, padding: "16px 42px", boxShadow: `0 0 ${18 + Math.sin(f * 0.12) * 8}px ${C.accent}33`, background: `${C.accent}0f` }}>
              {url}
            </div>
          </div>
          <div style={{ marginTop: 44, fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: C.muted, opacity: fadeIn(f, fps, 2.4, 0.6), letterSpacing: "0.14em" }}>
            EDUCATIONAL SIMULATION — FICTIONAL TARGETS ONLY
            <br />
            <span style={{ fontSize: 14 }}>single-player · attacker-vs-defender multiplayer · memory forensics</span>
          </div>
        </div>
      </AbsoluteFill>
      {/* gentle particles */}
      <AbsoluteFill>
        {Array.from({ length: 12 }, (_, i) => {
          const x = (i * 173) % 1920;
          const y = 1080 - ((f * 14 + i * 150) % 1200);
          return <div key={i} style={{ position: "absolute", left: x, top: y, width: 2, height: 2, borderRadius: 2, background: C.accent, opacity: 0.16 }} />;
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
