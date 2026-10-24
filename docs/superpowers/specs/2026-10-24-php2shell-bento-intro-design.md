# Design spec — first-visit intro + SOC Bento dashboard

- Status: approved-for-planning candidate (user-selected direction: "first visit + SOC Bento")
- Date: 2026-10-24
- Scope: design spec only — no implementation, no plan, no code changes yet.
- Supersedes nothing; builds on `docs/superpowers/specs/2026-10-24-php2shell-dashboard-redesign-design.md` (approved).

## Goal

Give first-time visitors a short, factual story of the incident before they
see the console, and retune the approved dashboard's *visual composition* to a
SOC-style Bento grid of incident evidence panels — while keeping the approved
accessible graphite palette, all simulation/multiplayer behavior, and every
existing state contract.

Reference/starting point: 21st.dev `Web3Bento` (id 40327 by romanvasnev —
dark surface, lime accent, compact Bento cards, live gauges/charts/activity
stream, props-driven, zero deps per catalog metadata; registry URL
`https://21st.dev/r/romanvasnev/web3-bento`, user-supplied). It is the
*intended presentational starting point* — see Part 1 for the adoption gate.
Its lime accent and crypto/financial content are not carried over.

## Global constraints (unchanged — carried from approved spec)

- Simulation engine, room protocol, persistence semantics, and multiplayer
  behavior are out of scope.
- No new dependencies by default; the single exception is Web3Bento and
  only if the source-review gate in Part 1 passes — otherwise the house
  `BentoGrid` fallback adds nothing.
- Approved palette only: `--surface-1..3`, `--border`, `--fg/-muted/-faint`,
  `--accent` (blue), `--vuln`/`--attack`/`--breach`/`--contained`/`--ok`,
  `--muted-state` (borders/fills only). Status colors keep their current
  semantics exactly.
- All ARIA contracts, data-testids, deep links, and storage keys remain
  valid.

## Part 1 — SOC Bento composition (visual retune of the entry views)

**Source strategy.** The user explicitly supplied
`npx shadcn@latest add "https://21st.dev/r/romanvasnev/web3-bento"` —
Web3Bento is the intended starting point for the Bento composition,
**gated on review**: before any adoption, retrieve the source (via the
registry MCP/URL; do not blind-install) and review it for (a) its declared
dependencies — metadata claims zero; (b) props-driven data flow we can feed
SOC data into; (c) compatibility with Tailwind v4 + `motion` + React 19 and
the approved tokens. If source is locked/unavailable or the review finds
it incompatible, fall back to the smallest house-built equivalent: a
`BentoGrid` wrapper component (12-col grid + card slots) composed of the
existing panels — no external code. Either way the install/fetch happens
in the implementation stage, not now.

**Data mapping** — Web3Bento's crypto panels map 1:1 to SOC equivalents,
same components, same live data:

- **Status strip** (was "net worth + PnL"): `IncidentStatus` pill +
  `VersionBadge` + capacity, pinned as the first card row.
- **Heap canvas** (was "portfolio chart"): the existing `HeapArena` stays the
  dominant center card — unchanged internals.
- **Gauge card** (was "gas gauge"): attacker stage + capacity, derived from
  existing `IncidentStatus` data — no new data source.
- **Allocation strip** (was "allocation bar"): compact heap-state counts
  (allocated/freed/reused/stale/corrupted) computed from `state.heap` —
  display-only, reads existing state.
- **Activity stream** (was "block stream"): the existing `LogStream` inside
  its `EvidenceSection`.
- **Evidence wells** (was "activity panels"): `EvidenceSection` (terminal +
  logs) as collapsible Bento cells.

Layout becomes a dense card grid (`grid-cols-12`-style spans) instead of the
current rail/canvas/column thirds. On `/`, the stage rail compresses into a
compact stepper card; on `/play`, lobby cards arrange as Bento tiles.
Spacing rhythm stays on the existing `gap-4`/`rounded-[10px]`/`border` system.
All financial/crypto copy, charts and values are replaced — nothing of the
reference's domain data survives.

Explicitly NOT changed: color tokens, type roles, heap renderer selection,
`EvidenceSection` lazy-mount behavior, xterm wiring.

## Part 2 — First-visit intro (entry presentation)

A short text-wall overlay shown on first visit to `/` only, narrating
**verified incident facts only** — sourced verbatim from `lib/sim/cve.ts`
(`CVE.id`, the stale-global-state → UAF chain, PATCHED-wins/BREACH-loses
victory conditions) and the existing `IntroCard` copy. Nothing else is
claimed.

Behavior contract:

- **When shown**: only on `/`, only when localStorage key `p2s.introV2`
  is absent AND no saved simulation exists
  (`php2shell.sim.v1` sessionStorage absent/invalid → nothing in progress to
  restore). Existing saved sessions and repeat visits bypass the intro.
- **Dismissal**: a visible, keyboard-focusable "Skip intro →" button is
  always present (top-right, `focus-visible` styled); `Esc` also dismisses.
  Dismissal or completion writes `p2s.introV2 = "1"` — a dedicated
  namespaced key that never touches `php2shell.sim.v1`, `p2s.intro`,
  `p2s.fxHint`, or `mp.identity`.
- **Modality (complete)**: while the intro is active it is
  `role="dialog"` `aria-modal="true"` `aria-labelledby`, and the whole
  dashboard behind it is `inert` + `aria-hidden="true"` — not just
  pointer-inert. Initial focus lands on the Skip button; the only
  interactive content is inside the dialog, so focus cannot escape (Tab
  cycles within the dialog's controls). On dismiss, focus moves to the
  dashboard `<h1>` (given `tabIndex={-1}`), not to a random control.
- **Playback gate**: the Visualize timeline currently auto-starts — under
  the intro it must not advance unseen. While the intro is shown, the sim
  mounts but autoplay is held (no ticks advance) until the user
  dismisses/completes the intro **and** the reveal transition finishes;
  only then does playback begin. Saved-state visitors never see the intro
  and resume normally.
- **Reveal**: on dismiss, the overlay fades out into the dashboard over
  **≤ 600 ms**; total intro-close-to-interactive-dashboard ≤ **1 s**
  (fade + mount margin). Under `prefers-reduced-motion` (existing
  matchMedia subscription pattern) there is no fade — the dashboard is
  revealed immediately.
- **Text animation vs AT**: story lines may stagger visually (opacity
  only), but every line is present in the DOM from mount — assistive tech
  reads the full narrative immediately; no content is gated on animation.
- **Fail-open**: if storage read/write throws (private mode, blocked
  storage), the intro is skipped — never blocks the dashboard.
- **No gating elsewhere**: `/play` (lobby, `?code=` deep links, refresh
  reconnect) never shows or waits on the intro.
- **Sibling hint**: the existing `p2s.intro` primer card stays and still
  renders in the dashboard on first visit — it is visible *behind* the
  overlay and remains after dismissal as the in-dashboard reminder; the
  overlay does not duplicate its prose.

Copy draft (≤ ~8 short lines, all verifiable against the sim): CVE id,
"watch the UAF form live", attacker vs defender roles, PATCHED/BREACH win
conditions, "everything below is simulated".

## Out of scope

- Simulation engine, game rules, network protocol, persistence semantics,
  multiplayer behavior. (The playback-start *timing* above is a
  presentation-layer gate, not a rules change.)
- Running installs now — source retrieval/review of Web3Bento happens in
  the implementation stage; if adopted it may pull the shadcn registry
  deps it declares, reviewed first. Any new dependency must be justified
  by that review, else the house `BentoGrid` fallback is used.
- Forensics internals, report content, API routes, tests' behavioral logic.

## Assumptions

- Web3Bento's lime accent and crypto content are deliberately not
  adopted (the approved blue accent is the accessible choice already
  measured); only its Bento composition grammar/data-flow is reused, and
  only after the source review gate passes.
- `p2s.introV2` is a fresh namespaced key; `p2s.intro` remains for the
  in-dashboard primer card.
- Intro is client-only (`"use client"`), no route/middleware changes.
- Bento spans use existing Tailwind v4 utilities; no custom grid plugins.

## Acceptance criteria

- First visit at `/`: overlay shows facts, Skip visible + focused, Esc
  works, dashboard behind is `inert`/`aria-hidden`; dismissing fades (or
  snaps under reduced-motion) to the dashboard; `p2s.introV2` set.
- Repeat visit / saved `php2shell.sim.v1` / `/play?code=X`: no intro.
- `localStorage.setItem` throwing → dashboard renders immediately.
- No horizontal overflow at 390/768/1440 on `/` and `/play`.
- Status colors keep approved semantics; contrast unchanged (tokens
  untouched).
- While open: dashboard `inert`/`aria-hidden`, initial focus on Skip,
  focus cannot leave the dialog; after dismiss focus lands on the
  dashboard `<h1>`.
- No sim ticks elapse while the intro is up; playback starts only after
  dismiss + reveal (≤ 1 s); reduced-motion shows the dashboard
  immediately.
- Existing 66 Vitest tests still pass; lint/typecheck/build clean.
