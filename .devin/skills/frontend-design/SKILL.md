---
name: frontend-design
description: Design conventions for PHP2Shell: Live UI — Tailwind v4 tokens, Motion animation, xterm.js terminal surfaces, and React component patterns. Use when building or styling pages/components.
---

# Frontend Design

## Aesthetic direction

- Dark, terminal-native interface: near-black background, phosphor-green
  accents (emerald family), monospace type for terminal/console surfaces.
- Theme tokens are defined once in `app/globals.css` via `@theme inline` —
  reference the tokens (`--color-background`, `--color-foreground`, and any
  added accents) instead of raw hex values in components.
- Security-tooling mood, but clearly a *training* product: label simulated
  surfaces so users never mistake them for a real shell.

## Layout and components

- App Router: Server Components by default; `"use client"` only where hooks,
  xterm.js, or Motion require it.
- One component per file, PascalCase, named exports, in `components/`.
- Tailwind utility classes only; no inline styles, no per-component CSS
  files. Extract repeated class strings into small components, not helper
  string constants.
- Prefer shadcn/ui patterns for generic controls (the `shadcn-ui` MCP server
  is available for reference/component code) — theme them to the terminal
  palette rather than default gray.

## xterm.js

- Wrap `@xterm/xterm` in a client component; initialize the `Terminal` in
  `useEffect`, dispose it on cleanup, and gate rendering behind mount so SSR
  never touches the DOM-only API.
- Fit/addon setup lives inside the terminal wrapper, not spread across
  pages.
- Feed the terminal only scripted simulation output — never real command
  results (see the security-simulation skill).

## Motion

- Import from `motion/react`. Prefer `motion.div` + variants; reserve
  `AnimatePresence` for genuine enter/exit cases.
- Keep animations short (<300 ms) and purposeful: scanlines, alerts, score
  reveals. Respect `prefers-reduced-motion`.

## Accessibility

- Semantic elements and labels on every control; the terminal UI must be
  keyboard-operable and announce simulation output accessibly (aria-live).

## Before finishing

- `npm run lint && npm run typecheck` clean, and verify the page in a real
  browser (see the browser-qa skill).
