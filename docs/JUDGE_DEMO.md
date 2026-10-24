# PHP2Shell: Live — Judge Demo (90 seconds)

Track: **MAKE THE INVISIBLE VISIBLE**
URL: https://php2shell-live.vercel.app · multiplayer: `/play`

## Talking points (with timings)

- **0–10 s — Hook.** "Memory-corruption bugs are invisible until they're
  catastrophic. PHP2Shell: Live makes one visible — a real PHP CVE,
  animated as it unfolds, then playable."
- **10–30 s — Visualize.** Open `/`. The five-stage simulation plays
  itself: suspicious input → fatal error + abnormal cleanup → heap churn
  you can *see* → stale pointer reuse (use-after-free) → BREACHED. Point
  at the heap blocks being freed and reallocated. (Skip/step controls are
  there if asked.)
- **30–50 s — Defend.** "You watched it happen. Now stop it." Show the
  action panel: inspect logs, investigate the version, block the source —
  *then note the trick*: blocking the IP doesn't fix the runtime, and the
  patch only counts after a restart. Apply patch → restart → verify →
  PATCHED + incident report.
- **50–75 s — Multiplayer.** Open `/play`, create a room, flash the QR
  code — a second browser/phone joins as attacker. Attacker clicks
  recon → probe → trigger; defender watches the same heap move in real
  time and blocks. Attacker rotates source and keeps pushing; defender
  patches, restarts, verifies — attack is deflected live on both screens.
- **75–90 s — Close.** "Same deterministic engine on every screen,
  server-validated, role-gated, CAS-consistent, refresh-safe, WebSocket
  with polling fallback — and it's all simulation: no real exploit, ever.
  The invisible made visible."

## Deterministic reset (run it again, identically)

- **Single player:** reload `/` — the simulation is deterministic; the
  restart control replays it identically.
- **Multiplayer:** defender clicks **↺ reset incident** (pre-report) or
  **↺ run the incident again** (on the report) — the room returns to a
  fresh UNDER_ATTACK state for the next round. New spectators can also
  scan the same QR.

## Backup path if live demo fails

Everything degrades gracefully: WS unavailable → polling; a tab refresh →
session resumes; a dropped player → seat frees. Worst case, single-player
`/` carries the full story alone.

---

# Submission text (MAKE THE INVISIBLE VISIBLE)

**PHP2Shell: Live** is an educational incident-response simulator that
turns an invisible memory-corruption vulnerability into something you can
watch, fight, and fix — solo or head-to-head.

It models **CVE-2026-109619**, a use-after-free in PHP's shared-worker
request lifecycle, faithfully: abnormal request cleanup leaves a stale
global-state reference that a subsequent request on the same worker can
resurrect — but only with heap grooming, so the simulation shows *why*
it's high-effort instead of pretending it's a magic RCE.

- **Visualize** — a five-stage, self-playing animation with a live heap
  view, xterm.js terminal, and realistic-but-simulated logs.
- **Defend** — real-time incident response with honest trade-offs:
  perimeter blocks buy time, only patch + restart remediates.
- **Verify** — deterministic replay; differentiated failure transcripts
  teach *which* defense was missing.
- **Multiplayer** — attacker vs defender in one room: share a code or QR,
  fight over the same authoritative state, WebSocket-synced with a
  polling fallback, token-authorized and CAS-consistent, hardened with
  rate limits, payload validation, and presence-based recovery.

Built with Next.js, TypeScript, Tailwind, Motion, and xterm.js on Vercel
Functions + Upstash Redis. Educational simulation only — no real exploit
environment.
