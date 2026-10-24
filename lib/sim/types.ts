export type Phase = "visualize" | "defend" | "verify" | "report";

export type IncidentStatus =
  | "SAFE"
  | "UNDER_ATTACK"
  | "BREACHED"
  | "CONTAINED"
  | "PATCHED";

export type HeapBlockState =
  | "free"
  | "allocated"
  | "freed"
  | "reused"
  | "stale"
  | "corrupted";

export interface HeapBlock {
  id: number;
  state: HeapBlockState;
  tag: string | null;
  /** Stable simulated address for this slot (educational, not byte-accurate). */
  addr: number;
  /** Bumped every time the slot is re-issued after a free — catches stale refs. */
  generation: number;
  /** Owning request label (e.g. "req#118") while live; null when free. */
  owner: string | null;
  /** Compact state-transition history, in logical-clock order. */
  history: Array<{ ts: number; to: HeapBlockState }>;
}

/** An explicit pointer into the heap, e.g. the $GLOBALS entry left dangling. */
export interface SimReference {
  id: string;
  /** Owning scope label, e.g. "$GLOBALS". */
  source: string;
  /** Heap slot it points at. */
  targetId: number;
  /** Generation the target had when the reference captured it. */
  generation: number;
}

export type AttackerStage =
  | "IDLE"
  | "RECON"
  | "PROBE"
  | "TRIGGER"
  | "GROOM"
  | "UAF"
  | "BREACH"
  | "DEFLECTED";

export type DefenderActionId =
  | "inspect_logs"
  | "investigate_version"
  | "block_source"
  | "isolate_worker"
  | "apply_patch"
  | "restart_services";

/** Human-driven attacker moves in multiplayer (mirrors attacker stages). */
export type AttackerActionId =
  | "recon"
  | "probe"
  | "trigger"
  | "groom"
  | "uaf"
  | "seize"
  | "rotate_source";

export type LogLevel = "info" | "warn" | "error" | "crit";

export interface LogEntry {
  seq: number;
  level: LogLevel;
  source: string;
  text: string;
}

export type TermLineKind = "in" | "out" | "err" | "sys" | "ok";

export interface TermLine {
  kind: TermLineKind;
  text: string;
}

export interface HeapOp {
  id: number;
  state: HeapBlockState;
  tag?: string | null;
}

/** Deterministic event-sourced execution trace entries. */
export type TraceKind =
  | "request"
  | "alloc"
  | "ref_create"
  | "cleanup"
  | "free"
  | "reuse"
  | "stale_detected"
  | "unsafe_access"
  | "remediate"
  | "verify";

export interface TraceEvent {
  /** Stable id — "e<ts>" where ts is a monotonically increasing logical clock. */
  id: string;
  ts: number;
  kind: TraceKind;
  /** Affected object label, e.g. "blk#9" or "$GLOBALS". */
  subject: string;
  /** Concise explanation for humans. */
  detail: string;
  /** Optional before/after summaries for inspectors. */
  before?: string;
  after?: string;
}

/** One scripted step of the five-stage Visualize timeline. */
export interface VisualStep {
  stage: number;
  title: string;
  explanation: string;
  status?: IncidentStatus;
  attackerStage?: AttackerStage;
  heapOps?: HeapOp[];
  /** Authored trace events (request init, cleanup, remediation…). */
  trace?: Array<{
    kind: TraceKind;
    subject: string;
    detail: string;
    before?: string;
    after?: string;
  }>;
  term?: TermLine[];
  logs?: Array<Omit<LogEntry, "seq">>;
}

export type Outcome = "success" | "failed";

export interface VerifyReport {
  outcome: Outcome;
  summary: string;
  missingControls: string[];
  actionsTaken: DefenderActionId[];
  restarts: number;
  capacity: number;
  transcript: TermLine[];
  lessons: string[];
}

export interface SimState {
  phase: Phase;
  tick: number;
  status: IncidentStatus;
  phpVersion: string;
  /** Patch package staged onto the host. */
  patchApplied: boolean;
  /** Services restarted after the patch was staged — patch is live. */
  restartedAfterPatch: boolean;
  workerIsolated: boolean;
  sourceBlocked: boolean;
  logsInspected: boolean;
  versionInvestigated: boolean;
  verified: boolean;
  /** Relative request capacity, 0-100. Isolation and restarts reduce it. */
  capacity: number;
  restarts: number;
  attackerStage: AttackerStage;
  /** Ticks of progress inside the current attacker stage. */
  attackerProgress: number;
  heap: HeapBlock[];
  /** Explicit references into the heap (the modeled $GLOBALS pointer lives here). */
  refs: SimReference[];
  /** Logical clock for heap mutations + trace ordering. */
  heapSeq: number;
  /** Event-sourced execution trace — authoritative, deterministic. */
  trace: TraceEvent[];
  logs: LogEntry[];
  term: TermLine[];
  actionsTaken: DefenderActionId[];
  outcome: Outcome | null;
  report: VerifyReport | null;
  /** Index into VISUAL_TIMELINE during the visualize phase. */
  visualStepIndex: number;
}
