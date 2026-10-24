# PHP2Shell: Live

Cybersecurity education through simulated incident-response gameplay.
Next.js 16 · TypeScript · Tailwind CSS 4 · Motion · xterm.js — Socket.IO
multiplayer planned.

> All gameplay is a client-side simulation against fictional targets.
> See `AGENTS.md` for the simulation boundaries and engineering conventions.

## Live demo

https://php2shell-live.vercel.app — first deployment (production domain of
the hobby project; the repo is git-connected so pushes auto-deploy and PRs
get preview deployments).

## The game

One continuous journey: **Visualize → Defend → Verify**.

- **Visualize** — auto-played five-stage simulation of CVE-2026-109619
  (stale global state → use-after-free on a shared php-fpm worker) with a
  visible heap, xterm.js terminal, security logs, and playback controls.
- **Defend** — real-time incident response. Actions have prerequisites and
  costs; only a patched + restarted runtime remediates.
- **Verify** — replays the modeled attack and reports PATCHED or explains
  which defense was insufficient.

## Multiplayer (`/play`)

Real-time attacker-vs-defender rooms on top of the same simulation engine:

- Create a room → share the 4-letter code, link, or QR code.
- One player attacks (recon → probe → trigger → groom → UAF → breach), one
  defends; spectators watch when both seats are taken.
- The server validates every action, gates it by role, and serializes state
  with compare-and-set so concurrent moves can't clobber each other.
- Transport: native WebSocket on Vercel Functions (`upgradeWebSocket`) with
  an automatic REST polling fallback; heartbeats drive presence.
- Refresh recovery via sessionStorage identity; a dropped player's seat
  frees up after the presence window.
- Room state lives in an in-memory store locally and Upstash Redis on
  Vercel (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`), so players
  on different function instances stay in sync.

## Getting started

```bash
nvm use          # Node 24 (see .nvmrc)
npm ci
npm run dev      # http://localhost:3000
```

## Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

CI (`.github/workflows/ci.yml`) runs the same gates on every push and PR.

## Docs

- `AGENTS.md` — architecture, TypeScript standards, component and testing
  conventions, security-simulation boundaries.
- `ENVIRONMENT.md` — toolchain, Devin environment persistence, MCP
  integrations, deploy readiness.
- `.devin/skills/` — project skills for Devin sessions (frontend-design,
  security-simulation, browser-qa, deployment-check).
