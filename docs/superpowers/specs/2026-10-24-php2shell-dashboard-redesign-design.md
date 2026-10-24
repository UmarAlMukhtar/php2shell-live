# PHP2Shell: Live — Dashboard Visual Redesign (Design Spec)

Date: 2026-10-24
Status: Proposed (spec only — no implementation yet)
Branch: `devin/1792863416-redesign-design` (from `devin/1792862686-polish` @ `46223f0`)

## 1. Goal

Replace the current terminal-first, neon-glass visual identity across all
application surfaces with a cohesive **modern dark operations dashboard**
identity, while preserving simulation/gameplay behavior, information
architecture, and accessibility requirements.

The user explicitly chose to **change the visual identity**. This spec defines
a new identity; the existing `.glass` / `cyber-bg` / `scanlines` / `holo-title`
aesthetic is retired. Utility class names may remain in JSX only as
implementation hooks whose rendered styling is fully redefined — never as a
reason to keep the old look.

## 2. Scope

**In scope (visual only):**

- New design tokens (color, elevation, spacing, radius, type) in
  `app/globals.css` and Tailwind theme tokens used by components.
- Restyling of every application component under `components/`, including
  `components/three/` scene material/lighting tuning.
- Layout adjustments required to establish the new visual hierarchy
  (dominant heap canvas, phase/status header, collapsible terminal/logs).
- Forensics console presentation (sticky tab bar, inspector layout,
  A/B replay framing).

**Out of scope (unchanged):**

- Simulation engine, game rules, difficulty, trace/replay logic, invariants.
- Network protocol, WebSocket/REST payloads, room semantics, CAS logic.
- Persistence format (`sessionStorage`, saved sim shape, `normalizeSim`).
- Multiplayer behavior and `/play` API surface.
- Routes, test suite structure, dependencies (no new packages).
- Copy/text content except microcopy adjustments that support the new
  hierarchy (e.g., clearer control names). The "simulated / fictional"
  disclaimers and CVE framing are retained verbatim.

## 3. Current identity vs. new identity

| Aspect | Current (retired) | New identity |
| --- | --- | --- |
| Panels | Translucent neon "glass" with glow borders | Opaque graphite layered surfaces with subtle borders and elevation |
| Background | `cyber-bg` ambient glow + `scanlines` CRT overlay | Flat deep-graphite field; optional faint grid on the heap canvas only |
| Accent | Cyan/magenta holo-shimmer title, glowing edges | Single restrained accent (blue) for navigation, focus, and primary actions |
| Type | Monospace everywhere | Sans-serif for navigation/explanations; monospace reserved for terminal, logs, addresses, ids, code |
| Status color | Red/danger-heavy | Semantic set: vulnerable (amber), under attack (orange), breached (red), contained (blue), patched/ok (green), blocked/muted (slate) |
| Decorative FX | Pulse-glow, holo-title shimmer, scanlines | None that compete with evidence; animation limited to state transitions and the heap itself |

## 4. Design tokens

New tokens are defined in `app/globals.css` under `@theme` (Tailwind v4) and
applied by restyling existing utility hooks or replacing class lists. Names
are final unless contradicted below.

### 4.1 Color

- `--color-bg`: `#0B0E13` — application field.
- `--color-surface-1`: `#12161D` — primary panel.
- `--color-surface-2`: `#171C25` — nested/raised panel.
- `--color-surface-3`: `#1E2530` — inset wells (terminal, log stream).
- `--color-border`: `#26303E` — hairline borders.
- `--color-border-strong`: `#36455A` — emphasis borders.
- `--color-fg`: `#E6EBF2` — primary text.
- `--color-fg-muted`: `#9AA7B8` — secondary text.
- `--color-fg-faint`: `#647183` — captions/hints.
- `--color-accent`: `#5B8DEF` — navigation, focus, primary actions (blue).
- `--color-accent-fg`: `#0B0E13` — text on accent fills.
- Semantic (used for status chips, heap states, invariant checks):
  - `--color-vuln`: `#E2B73C` (amber)
  - `--color-attack`: `#E0793C` (orange)
  - `--color-breach`: `#E34B4B` (red)
  - `--color-contained`: `#5B8DEF` (blue)
  - `--color-ok`: `#4CB782` (green)
  - `--color-muted-state`: `#5B6676` (slate — free/blocked/neutral)
- Heap block states reuse the semantic set: `allocated=accent`,
  `freed=muted-state outline`, `reused=vuln`, `stale=attack`,
  `corrupted=breach`, `free=border/muted`.

### 4.2 Elevation & shape

- No glow shadows. Depth from layer ordering + 1px borders only.
- `--radius-panel`: `10px` outer panels; `--radius-inner`: `8px` nested;
  chips/pills `999px` for status indicators.
- Elevation: `surface-2` panels sit on `surface-1`, `surface-3` is inset
  (never raised above its parent).

### 4.3 Typography

- `--font-sans`: system UI stack — navigation, explanations, cards, buttons.
- `--font-mono`: existing monospace stack — terminal, logs, hex addresses,
  `blk#`, `e<N>` event ids, code, room codes, version badges.
- Body/explanatory text ≥ 13px; captions ≥ 11px; the prior 9–10px microtext
  in forensics lists is raised to ≥ 11px.

### 4.4 Spacing & layout

- Section spacing: `gap-4`/`gap-6` (16/24px); panel padding `16–20px`.
- Max app width stays ~1400px; content column order follows task order.

## 5. Page-level designs

### 5.1 Shared shell (`components/Game.tsx`, `app/layout.tsx`, `app/globals.css`)

- Remove `scanlines` overlay and `cyber-bg` glow from the app root.
- Header becomes a slim dashboard bar: product name (sans, semibold),
  phase stepper, status chip, runtime/version badge, `forensics` and
  `multiplayer` actions. Sticky on scroll is optional; not required.
- Status chip: pill with semantic color + short label
  (e.g., `UNDER ATTACK` orange, `BREACHED` red, `PATCHED` green).
- Decorative effects allowed: none beyond the heap's own animation.

### 5.2 Single-player (`VisualizeView`, `DefendView`, `ReportView`)

- **Phase/status header**: ① VISUALIZE → ② DEFEND → ③ VERIFY stepper in
  sans; active step accent, completed muted, upcoming faint; keyboard and
  screen-reader semantics unchanged (`aria-current="step"`).
- **Dominant heap canvas**: the `HeapArena` (3D or flat) is the visual
  anchor — larger share of the first viewport, framed as a `surface-1`
  panel. 3D scene materials are re-tuned to graphite/flat lighting (dim
  ambient, semantic emissive colors only; no neon point-light wash).
- **Stage/playback navigation**: stage list becomes a left rail (desktop)
  or horizontal stepper (mobile); each stage shows number, name, and
  status icon in sans.
- **Terminal & logs**: collapsed-by-default "evidence" sections with
  clearly named expanders (`Simulated terminal`, `Security logs`) —
  expandable, not removed. Terminal keeps monospace on `surface-3`.
- **Defend/attack panels**: action lists become cards with name, one-line
  effect, cost/prereq text in muted sans; disabled reasons remain inline.
- **Report**: result-first layout — prominent `PATCHED`/`BREACHED` banner
  (semantic color), then action timeline (ordered list of defender
  actions), replay result summary, then the forensics entry point added in
  the polish pass.

### 5.3 Forensics console (`components/forensics/*`)

- Presented as a workspace section titled `FORENSICS` (sans label +
  one-line description), not a novelty drawer.
- Sticky tab bar (already implemented) restyled to `surface-1` with
  hairline bottom border; active tab = accent underline, not neon border.
- Inspector: definition list on `surface-2`; violation text in breach red;
  references/lifetime/related events grouped in labeled sub-sections.
- Trace: kind badges colored by semantic map (alloc=accent, free=muted,
  reuse=vuln, ref_create=stale/warn, stale_detected=attack,
  unsafe_access=breach, remediate/verify=ok); text ≥ 11px.
- A/B replay: two equal `surface-2` panels, run labels `vulnerable` /
  `patched` with semantic chips; divergence callout in vuln amber.
- Checks: verified = ok checkmark, violations = breach ✗, assumptions =
  muted △; heading "Model invariants" retained.

### 5.4 Multiplayer (`components/Multiplayer.tsx` lobby, `components/MpView.tsx`)

- **Lobby**: `surface-1` card, sans heading, attacker/defender **role
  cards** (existing copy kept, restyled as `surface-2` cards with semantic
  accent borders: attacker=attack, defender=accent).
- **Room view**: role/state clarity — header shows room code (mono),
  connection state chip (live=ok, offline=muted), your role chip; action
  panel for your role, shared evidence (heap/logs) framed identically to
  single-player.
- Forensics is **not** added to multiplayer (explicitly out of scope).

### 5.5 Three.js scene (`components/three/*`)

- Flat, dim lighting: low ambient + one neutral key light; emissive only
  from block states (semantic colors).
- Arena floor grid in `border` color at low opacity; `$GLOBALS` marker
  keeps its wireframe but in `faint`/`attack` colors.
- Selected block: accent outline ring; guided-camera focus unchanged.

## 6. Component mapping

| Component(s) | Change |
| --- | --- |
| `app/globals.css` | New tokens; `.glass` → opaque `surface-1/2` (or class removed where simpler); delete `scanlines`, `holo-title`, `pulse-glow`, `cyber-bg` or repoint to new tokens |
| `Game.tsx` | Header → dashboard bar; keep IntroCard/ForensicsToggle/hint (restyled); IntroCard copy unchanged |
| `IncidentStatus.tsx`, `VersionBadge.tsx` | Semantic status chips/badges |
| `VisualizeView.tsx` | Stage rail + dominant heap; playback controls restyled |
| `DefendView.tsx`, `ActionPanel.tsx`, `AttackPanel.tsx` | Action cards, prereq text, capacity meter |
| `ReportView.tsx`, `ReportCard.tsx` | Result banner + action timeline + replay summary + forensics entry |
| `Terminal.tsx`, `LogStream.tsx` | Inset `surface-3` wells, expandable; content unchanged |
| `HeapArena.tsx`, `HeapVisualizer.tsx`, `HeapBlock.tsx` | Flat/3D heap surfaces, semantic state colors, selection ring |
| `three/HeapScene3D.tsx`, `HeapBlock3D.tsx`, `PointerLink3D.tsx`, `HeapCameraController.tsx`, `HeapLegend3D.tsx` | Lighting/material retune, legend restyle |
| `forensics/ForensicsPanel.tsx`, `ForensicsProvider.tsx` | Workspace frame, sticky tabs restyle, type sizes; ARIA/keyboard behavior unchanged |
| `Multiplayer.tsx`, `MpView.tsx` | Lobby card + role cards + room header chips |
| `BreachEffect.tsx` | Retain the breach moment but simplify to a restrained full-viewport breach wash (no neon strobe) honoring reduced-motion |
| `IntroCard` (in `Game.tsx`), `ForensicsToggle` hint | Restyle to `surface-2` tooltip card |

## 7. Responsive design

- **≥1024px (lg)**: two/three-column layouts — stage rail + heap + evidence;
  defend = actions rail + heap + terminal/logs column.
- **768–1023px**: single column in task order — status/phase header →
  heap canvas → stage/playback controls → actions → collapsible
  terminal/logs → forensics.
- **390–767px**: same order, tighter spacing; the existing renderer
  selection is unchanged — `<420px` (or no WebGL / reduced motion) gets
  the flat heap map, otherwise 3D; forensics sticky tabs remain
  reachable; all controls are buttons (no hover-only).
- No horizontal overflow at any breakpoint; canvas keeps its own
  internal scroll where needed.

## 8. Accessibility acceptance criteria

- Contrast: all text ≥ WCAG AA 4.5:1 on its surface (semantic chips use
  text on dark, not colored fills with colored text).
- Keyboard: every control focusable with a visible accent focus ring
  (`outline: 2px solid accent`); tab lists keep roving tabindex + arrows.
- Screen readers: role=img labels on canvas remain; `aria-live` polite
  announcements (selection, status changes) preserved; expanders use
  `aria-expanded`.
- Motion: `prefers-reduced-motion` disables heap pulse/bob, camera
  guidance, breach wash, and all decorative animation; functional state
  changes remain instant-visible.
- No hover-only information anywhere (tooltips duplicate to focus/tap).
- Touch targets ≥ 40×40px on mobile.

## 9. Verification plan

- `npm run lint`, `npm run typecheck`, `npx vitest run` (66 existing
  tests must pass unchanged), `npm run build`.
- Browser checks (Playwright + desktop Chrome) of `/` and `/play` at
  390px, 768px, 1440px: full single-player journey, forensics console
  (all four tabs), lobby + room view, report view.
- Keyboard-only pass: phase controls, forensics tabs, actions, join/leave.
- `prefers-reduced-motion` emulation: animations suppressed.
- Automated contrast spot-check of token pairs; zero elements past the
  viewport edge at 390px (the existing overflow assertion).

## 10. Assumptions

- Tailwind v4 `@theme` tokens in `globals.css` are the single source of
  truth; components consume semantic utilities only.
- The flat `HeapVisualizer` remains the accessibility/mobile fallback —
  the redesign does not change that logic, only its styling.
- `stale` maps to the `attack` orange, not `vuln` amber: stale is an
  active violation, not a passive state (documented to avoid ambiguity).
- Session-localStorage flags (`p2s.intro`, `p2s.fxHint`) persist across
  the redesign; keys unchanged.

## 11. Risks

- **Regressing a11y wins** from the polish pass (ARIA tabs, live regions,
  aria-expanded) — mitigated by the acceptance criteria and a focused
  DOM assertion pass.
- **Visual sameness** — a flat graphite palette risks losing the app's
  identity; mitigated by the heap remaining the visual anchor and
  semantic color carrying meaning.
- **3D scene washout** — flat lighting could flatten depth cues; mitigated
  by retaining emissive state colors and the floor grid.
- **Scope creep** — any component that "needs" a behavior change to look
  right is escalated rather than silently changed.
- Old class names (`glass` etc.) left in JSX with new styling is
  acceptable but must not leak the old aesthetic; a final grep pass
  removes dead token classes (`scanlines`, `holo-title`, `pulse-glow`).

## 12. Out of scope (explicit non-goals)

- FORENSICS inside multiplayer, new features, new pages, new deps,
  shadcn component adoption (21st.dev used for pattern research only —
  `get_inspiration`/`search` results informed card/tabs/status patterns;
  no component code copied).
- Engine/trace/replay/room logic; persistence; CI workflow.
