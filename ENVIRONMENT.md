# Development Environment — PHP2Shell: Live

## Toolchain

| Tool      | Version  | Notes                                   |
| --------- | -------- | --------------------------------------- |
| Node.js   | 24.x     | via nvm (`~/.nvm`), pinned in `.nvmrc`  |
| npm       | 12.x     | ships with Node 24                      |
| Next.js   | 16.x     | App Router + Turbopack                  |
| React     | 19.x     |                                         |
| TypeScript| ~5.9     | strict + `noUncheckedIndexedAccess`     |
| Tailwind  | 4.x      | `@tailwindcss/postcss`                  |
| Motion    | 14.x     | `motion/react`                          |
| xterm.js  | 6.x      | `@xterm/xterm`, client components only  |
| Vitest    | 4.x      | `tests/*.test.ts`                       |
| ESLint    | 9.x      | flat config, `eslint-config-next`       |

## Daily commands

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"   # Node on PATH
npm ci          # clean install (CI); npm install for day-to-day
npm run dev     # dev server on :3000
npm run lint    # ESLint
npm run typecheck
npm test        # Vitest
npm run build   # production build
```

## Devin environment persistence

The repo blueprint (managed in Devin's environment settings) installs Node 24
through the preinstalled nvm, puts it on `PATH` via `~/.bashrc`, and runs
`npm install` on each snapshot maintenance build — so `node`/`npm` and all
dependencies are ready at session start without manual steps.

## MCP integrations available to Devin sessions

- **context7** — library docs lookup (connected; currently quota-limited —
  add a free Context7 API key to lift the cap, see README of the report).
- **playwright** — browser automation in Docker. **It cannot reach
  `localhost`** — use the machine's network IP (shown as `Network:` by
  `next dev`, e.g. `http://172.16.255.2:3000`).
- **vercel** — full Vercel API for future deploys.
- **figma-remote**, **redis**, **shadcn-ui** — available if needed later.

## CI

`.github/workflows/ci.yml` runs lint → typecheck → test → build on pushes to
`main` and on every PR, on Node from `.nvmrc` with `npm ci`.

## Deploy readiness

`vercel.json` pins framework/build/install commands and baseline security
headers. No secrets or env vars are required yet. Deploy via the `vercel`
MCP server only when explicitly asked.
