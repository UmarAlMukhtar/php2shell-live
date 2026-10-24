---
name: security-simulation
description: Boundaries and patterns for PHP2Shell: Live's simulated incident-response gameplay. Use when writing scenarios, terminal output, command handling, or anything security-themed.
---

# Security Simulation

This app **teaches** cybersecurity through scripted simulations. Everything
that looks like hacking is fiction. Follow these boundaries exactly.

## Hard boundaries

1. **Nothing executes.** No user input is ever run, eval'd, sent to a shell,
   or shipped to a backend for execution. The "terminal" renders pre-authored
   or locally generated text.
2. **No real targets.** Hosts, IPs, domains, and files in scenarios are
   fictional (use reserved ranges like `192.0.2.x`, `*.example`, invented
   company names).
3. **No transferable payloads.** Never emit working exploit code, real CVE
   exploit chains, weaponizable obfuscation, credential theft, or persistence
   techniques. Commands such as `php2shell` are game verbs that trigger
   scripted responses — they are not runnable attacks.
4. **Fictional vulns.** Vulnerability descriptions are educational composites
   (e.g. "unsanitized include parameter") rather than step-by-step real-world
   exploitation guides.
5. **Defensive framing.** Scenario goals reward detection, containment, and
   correct response — not destructive actions. Copy always labels the
   environment as simulated.

## Implementation patterns

- Put scenario data and the command-matching engine in `lib/` as pure
  functions: `(scenario, input) -> output lines + state delta`. Pure =
  unit-testable.
- Reject or safe-handle unknown input inside the simulation; never fall
  through to anything executable.
- Scenario content lives as data (typed objects/JSON), not scattered through
  JSX.
- Rate-limit-free fiction: simulated output may mimic real shell text but
  must stay within the fictional scenario corpus.

## What to check before finishing

- Grep your change for anything that could execute input (`eval`, `Function`,
  `child_process`, dynamic `import` of user strings) — none may exist.
- Unit tests in `tests/` cover the scenario branches you touched.
