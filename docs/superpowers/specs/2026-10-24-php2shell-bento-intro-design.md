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

Reference: 21st.dev `Web3Bento` (id 40327, metadata only — dark surface, lime
accent, compact Bento cards, live gauges/charts/activity stream, props-driven,
zero deps). We take the *composition grammar* (dense evidence cards, live
gauges, activity stream) and not the lime accent or any crypto/financial
content. No component code is retrieved or copied.

## Global constraints (unchanged — carried from approved spec)

- Simulation engine, room protocol, persistence semantics, and multiplayer
  behavior are out of scope.
- No new dependencies.
- Approved palette only: `--surface-1..3`, `--border`, `--fg/-muted/-faint`,
  `--accent` (blue), `--vuln`/`--attack`/`--breach`/`--contained`/`--ok`,
  `--muted-state` (borders/fills only). Status colors keep their current
  semantics exactly.
- All ARIA contracts, data-testids, deep links, and storage keys remain
  valid.

## Part 1 — SOC Bento composition (visual retune of the entry views)

Adapt the Bento grammar to SOC incident data on `/` (Visualize view) and the
`/play` lobby — rearranged cards, same components:

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
- **Reveal**: the overlay fades into the dashboard (CSS/motion opacity
  transition, ~600 ms). Under `prefers-reduced-motion` (and when JS reports
  reduced motion via the existing matchMedia subscription pattern) the
  dashboard reveals **immediately** with no fade.
- **Fail-open**: if storage read/write throws (private mode, blocked
  storage), the intro is skipped — never blocks the dashboard.
- **Focus**: while open, the overlay is `role="dialog"` `aria-modal="true"`,
  labelled, and the Skip button is focusable; focus returns to the dashboard
  on close. The dashboard behind it stays inert to pointer input; the overlay is a
  fixed-position layer, so no scroll-lock is needed.
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
  multiplayer behavior.
- New dependencies, shadcn installs, or 21st.dev component code.
- Forensics internals, report content, API routes, tests' behavioral logic.

## Assumptions

- The Web3Bento *reference* informs composition only; its lime accent is
  deliberately not adopted (the approved blue accent is the accessible
  choice already measured).
- `p2s.introV2` is a fresh namespaced key; `p2s.intro` remains for the
  in-dashboard primer card.
- Intro is client-only (`"use client"`), no route/middleware changes.
- Bento spans use existing Tailwind v4 utilities; no custom grid plugins.

## Acceptance criteria

- First visit at `/`: overlay shows facts, Skip visible + focusable, Esc
  works, dashboard behind is dimmed/inert; dismissing fades (or snaps under
  reduced-motion) to the dashboard; `p2s.introV2` set.
- Repeat visit / saved `php2shell.sim.v1` / `/play?code=X`: no intro.
- `localStorage.setItem` throwing → dashboard renders immediately.
- No horizontal overflow at 390/768/1440 on `/` and `/play`.
- Status colors keep approved semantics; contrast unchanged (tokens
  untouched).
- Focus trap not required beyond Skip (single action); focus returns to
  page on dismiss.
- Existing 66 Vitest tests still pass; lint/typecheck/build clean.
