---
name: deployment-check
description: Pre-deploy and deploy procedures for PHP2Shell: Live on Vercel — readiness gates, the vercel MCP server, env vars, and rollback basics. Use before deploying or when preparing deploy config.
---

# Deployment Check

Deploy target: **Vercel** (framework `nextjs`, config in `vercel.json`).
The `vercel` MCP server is connected to this session for project/deployment
operations.

## Readiness gates — all must pass before any deploy

```bash
npm ci && npm run lint && npm run typecheck && npm test && npm run build
```

- CI green on the target commit (`.github/workflows/ci.yml`).
- No unresolved browser-qa failures on the flow being shipped.
- `vercel.json` reviewed when touching headers or build settings.

## Environment variables

- None are required for the scaffold. When real env vars appear, set them in
  the Vercel project (via the vercel MCP tools or dashboard), never in the
  repo. Local development uses `.env.local` (already gitignored).
- Simulation content must not depend on secrets — if a change needs a new
  env var, confirm it isn't a credential being smuggled into a client bundle
  (`NEXT_PUBLIC_*` vars are public by definition).

## Deploying

- Deploy only when the user explicitly asks. Prefer preview deployments for
  iteration; production only on request.
- Use the vercel MCP server tools to link the project, trigger deployments,
  and read status/logs. Do not invent tokens or assume integrations beyond
  what the connected server exposes.
- After a deploy, verify the URL responds and the app shell renders (see the
  browser-qa skill).

## Rollback

- If a deploy regresses, redeploy the previous known-good deployment through
  the vercel MCP tools or dashboard rather than pushing a hasty fix.
