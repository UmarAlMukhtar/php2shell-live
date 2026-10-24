# PHP2Shell: Live

Cybersecurity education through simulated incident-response gameplay.
Next.js 16 · TypeScript · Tailwind CSS 4 · Motion · xterm.js — Socket.IO
multiplayer planned.

> All gameplay is a client-side simulation against fictional targets.
> See `AGENTS.md` for the simulation boundaries and engineering conventions.

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
