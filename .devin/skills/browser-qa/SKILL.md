---
name: browser-qa
description: How to verify PHP2Shell: Live in a real browser — dev server, Playwright MCP driving Chrome, and what to check in the terminal UI. Use after UI changes before opening/updating a PR.
---

# Browser QA

## Environment

- The `playwright` MCP server is connected to this session — use it to drive
  the browser instead of hand-rolled scripts. The machine also has Chrome at
  `google-chrome` for direct GUI inspection via the computer tool.
- Start the app with `npm run dev` (foreground shell, default port 3000).

## Workflow

1. `npm run dev` — wait for the ready line; note the port.
2. Drive the UI with the playwright MCP tools (navigate, click, type, snapshot
   /screenshot). Prefer snapshots over screenshots for asserting text; use
   screenshots for layout/terminal rendering.
3. Check the browser console for errors — a clean console is part of "done".
4. For visual changes, capture a screenshot and attach it to the PR body.

## What to verify

- **Terminal surfaces**: xterm.js canvas actually rendered (not blank),
  prompt focusable, output text legible on the dark theme.
- **Simulation flow**: scripted command → expected response lines; unknown
  input handled in-fiction.
- **Motion**: animations play and finish; no jank; reduced-motion honored.
- **Responsive**: layout holds at mobile widths (the game must degrade
  gracefully on phones).
- **No hydration errors** in the console — xterm components must not SSR
  DOM-only APIs.

## Definition of done

All checks green in CI plus a recorded or screenshot-verified browser pass
on the changed flow before the PR is considered ready.
