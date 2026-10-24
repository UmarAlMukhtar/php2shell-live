# AGENTS.md — PHP2Shell: Live

Guidance for AI agents and contributors working in this repository.

## What this project is

A **cybersecurity education** application: simulated incident-response gameplay
in the browser. All "attacks", "shells", and "compromised systems" are
**simulations against fictional targets only**. Future multiplayer uses
Socket.IO. The audience is learners; content must stay safe, clearly
fictional, and educational.

## Stack

- Next.js (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v4 (via `@tailwindcss/postcss`, theme tokens in `app/globals.css`)
- Motion (`motion` package) for animation
- xterm.js (`@xterm/xterm`) for the simulated terminal
- Vitest for unit tests; Playwright MCP for browser-driven QA
- Deploy target: Vercel

## Architecture guidelines

- `app/` — App Router routes, layouts, and pages only. Server Components by
  default; add `"use client"` only where interactivity (xterm, motion, state)
  requires it.
- `components/` — reusable presentational components (create the directory
  when the first component lands).
- `lib/` — pure, framework-agnostic logic: simulation engine, scenario
  definitions, scoring. No React imports here so logic stays unit-testable.
- `tests/` — Vitest specs mirroring the `lib/` structure.
- Terminal simulation runs entirely client-side; never send simulated
  commands to a real backend for execution.
- Path alias `@/*` maps to the repo root — prefer it over deep relative
  imports.

## TypeScript quality standards

- `strict: true` and `noUncheckedIndexedAccess: true` are enforced — handle
  `undefined` from indexed access deliberately.
- No `any`; use `unknown` plus narrowing when input is untyped.
- Explicit return types on exported functions.
- Types for scenario/session state live in `lib/` next to the logic they
  describe.
- `npm run typecheck` must stay green.

## Component conventions

- One component per file, named exports, PascalCase filenames.
- Keep components presentational; push game/simulation state into `lib/`
  hooks or stores.
- Tailwind utility classes only — no inline `style` objects or separate CSS
  files except `globals.css` theme tokens.
- Terminal styling lives in theme tokens, not hard-coded hex sprinkled
  through components.
- Animate with `motion` (`motion/react`), not hand-rolled timers.
- Accessible: semantic elements, labels on interactive controls, keyboard
  operability (the terminal UI included).

## Testing expectations

- Every `lib/` module ships with a colocated `tests/*.test.ts` spec.
- Tests cover simulation rules and scoring, not implementation details.
- `npm test` (Vitest) must stay green; CI runs lint + typecheck + test +
  build on every push and PR.
- Browser-level verification uses the browser-qa skill (Playwright MCP)
  before PRs that change visible behavior.

## Security-simulation boundaries

Hard rules — violating them is a bug regardless of intent:

1. **Simulated only.** The app never executes real commands, never connects
   to real targets, never generates working exploit code. All scenarios use
   fictional hosts, fictional vulnerabilities, and scripted outcomes.
2. **No real payloads.** Do not add functional shellcode, real CVE exploit
   chains, credential-theft patterns, or instructions that transfer to real
   systems. Commands like `php2shell` are game verbs, not runnable attacks.
3. **Client-side fiction.** Simulation output is pre-authored or generated
   locally — never fetched from or executed on a server.
4. **No secrets.** No credentials, tokens, or `.env` values in the repo.
5. **Education framing.** UI copy labels the environment as a simulation;
   scenario content teaches defensive/recognition skills.

## Commands

```bash
npm run dev        # dev server
npm run lint       # ESLint (flat config, next/core-web-vitals + typescript)
npm run typecheck  # tsc --noEmit
npm test           # Vitest
npm run build      # production build
```

Node 24 (see `.nvmrc`). Install with `npm ci`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
