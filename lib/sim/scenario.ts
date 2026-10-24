import { CVE, SERVER_PHP_VERSION } from "./cve";
import { ATTACKER_IP, WORKER_ID, log } from "./logs";
import type { VisualStep } from "./types";

export const STAGE_TITLES = [
  "Suspicious input arrives",
  "Fatal error, abnormal cleanup",
  "Heap churn made visible",
  "Stale reference → use-after-free",
  "Potential compromise",
] as const;

/**
 * The five-stage Visualize timeline. All output is scripted fiction —
 * no request executes anything. Each step mutates the shared SimState so
 * visual and gameplay modes read the same model.
 */
export const VISUAL_TIMELINE: VisualStep[] = [
  // ── Stage 0: vulnerable runtime receives suspicious input ─────────────
  {
    stage: 0,
    title: "Baseline traffic",
    explanation:
      `Fictional host app-01 runs PHP ${SERVER_PHP_VERSION} on php-fpm. Each request ` +
      `borrows a chunk of the worker's request arena — normally reset cleanly at ` +
      `request end. PHP ${SERVER_PHP_VERSION} is affected by ${CVE.id}.`,
    heapOps: Array.from({ length: 6 }, (_, i) => ({
      id: i,
      state: "allocated" as const,
      tag: "zend_mm",
    })),
    trace: [
      { kind: "request", subject: "req#115", detail: "request #115 initialized — arena chunks borrowed" },
    ],
    term: [
      { kind: "sys", text: `monitoring ${WORKER_ID} · PHP ${SERVER_PHP_VERSION} · request arena visible` },
      { kind: "out", text: "GET / 200 · GET /healthz 200 · traffic nominal" },
    ],
    logs: [
      log("info", "nginx", `GET / 200 from 203.0.113.8`),
      log("info", WORKER_ID, `request #115 finished in 38ms`),
    ],
  },
  {
    stage: 0,
    title: "Suspicious input arrives",
    explanation:
      `A probe from ${ATTACKER_IP} sends malformed, oversized POST bodies. The ` +
      `request is not "an exploit payload" — it is engineered to push the worker ` +
      `into a fatal error at a precise point in request init.`,
    status: "UNDER_ATTACK",
    attackerStage: "PROBE",
    heapOps: [6, 7, 8, 9].map((id) => ({ id, state: "allocated" as const, tag: "req#116" })),
    trace: [
      { kind: "request", subject: "req#116", detail: `req#116 initialized — oversized POST from ${ATTACKER_IP}` },
    ],
    term: [
      { kind: "in", text: `ingress ← POST /upload.php  body=2.4MB  src=${ATTACKER_IP}` },
      { kind: "err", text: `[sim] 413-leaning request pattern — repeated 3×` },
    ],
    logs: [
      log("warn", "nginx", `POST /upload.php oversized body from ${ATTACKER_IP}`),
      log("warn", WORKER_ID, `request #116 memory_limit pressure`),
    ],
  },
  // ── Stage 1: simulated failure and abnormal cleanup ───────────────────
  {
    stage: 1,
    title: "Fatal error mid-request",
    explanation:
      `The request hits memory_limit during init and dies with E_ERROR — on a ` +
      `shared mod_php/FPM worker this is a normal-ish event. The abnormal part ` +
      `comes next: cleanup does not fully reset global state.`,
    attackerStage: "TRIGGER",
    heapOps: [
      { id: 6, state: "freed", tag: "req#116" },
      { id: 7, state: "freed", tag: "req#116" },
      { id: 8, state: "freed", tag: "req#116" },
      { id: 9, state: "stale", tag: "req#116" },
    ],
    trace: [
      { kind: "cleanup", subject: "req#116", detail: "abnormal cleanup — request arena released, global-state reset incomplete" },
    ],
    term: [
      { kind: "err", text: `PHP Fatal error: Allowed memory size exhausted` },
      { kind: "out", text: `[sim] request arena for #116 returned to allocator` },
      { kind: "err", text: `[sim] global-state pointer left referencing freed block` },
    ],
    logs: [
      log("error", WORKER_ID, `E_ERROR: memory_limit exceeded — request aborted`),
      log("error", WORKER_ID, `partial global-state reset during shutdown`),
    ],
  },
  // ── Stage 2: heap allocations and deallocations become visible ────────
  {
    stage: 2,
    title: "Heap churn",
    explanation:
      `Watch the allocator. Freed blocks go back to the pool; new requests reuse ` +
      `them. Normally harmless — unless something still points at a freed block.`,
    attackerStage: "GROOM",
    heapOps: [
      { id: 10, state: "allocated", tag: "req#117" },
      { id: 11, state: "allocated", tag: "req#117" },
      { id: 6, state: "reused", tag: "req#118" },
      { id: 7, state: "reused", tag: "req#118" },
      { id: 12, state: "allocated", tag: "req#118" },
    ],
    term: [
      { kind: "out", text: `[sim] allocator: 4 blocks freed → 3 re-issued to req#118` },
      { kind: "in", text: `ingress ← POST /upload.php  src=${ATTACKER_IP} (grooming burst)` },
    ],
    logs: [
      log("info", WORKER_ID, `request #117 200 OK`),
      log("warn", "nginx", `burst of POSTs from ${ATTACKER_IP} (heap grooming pattern)`),
    ],
  },
  // ── Stage 3: stale reference creates a modeled UAF ────────────────────
  {
    stage: 3,
    title: "Use-after-free",
    explanation:
      `The stale global-state pointer still addresses block 9 — now re-issued ` +
      `to a new request. The worker reads attacker-influenced bytes as trusted ` +
      `internal state: ${CVE.id}'s core bug (CWE-416).`,
    heapOps: [
      { id: 9, state: "reused", tag: "req#118" },
      { id: 9, state: "corrupted", tag: "UAF" },
    ],
    term: [
      { kind: "err", text: `[sim] READ on stale global pointer → heap-use-after-free` },
      { kind: "err", text: `[sim] attacker-influenced data now steers worker state` },
    ],
    logs: [
      log("crit", WORKER_ID, `SIGSEGV-adjacent fault — UAF confirmed (simulated)`),
    ],
  },
  // ── Stage 4: potential compromise → BREACHED ──────────────────────────
  {
    stage: 4,
    title: "Potential compromise",
    explanation:
      `Under CVE-2026-109619 a use-after-free like this was shown to enable RCE ` +
      `on mod_php with default settings — but it is high-complexity (AC:H): it ` +
      `needs request ordering on a shared worker and heap grooming. Here we ` +
      `model the worst case: the worker is considered compromised.`,
    status: "BREACHED",
    attackerStage: "BREACH",
    heapOps: [
      { id: 9, state: "corrupted", tag: "UAF" },
      { id: 8, state: "corrupted", tag: "ctrl" },
      { id: 13, state: "corrupted", tag: "ctrl" },
    ],
    term: [
      { kind: "err", text: `[sim] ${WORKER_ID} integrity lost — modeled compromise` },
      { kind: "sys", text: "════════════════ INCIDENT: BREACHED ════════════════" },
    ],
    logs: [
      log("crit", "kernel", `${WORKER_ID} crashed — attacker-controlled state (simulated)`),
      log("crit", "soc", `INCIDENT DECLARED — ${CVE.id} exploitation path`),
    ],
  },
];
