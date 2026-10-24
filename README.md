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
