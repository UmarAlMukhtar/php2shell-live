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

/** One scripted step of the five-stage Visualize timeline. */
export interface VisualStep {
  stage: number;
  title: string;
  explanation: string;
  status?: IncidentStatus;
  attackerStage?: AttackerStage;
  heapOps?: HeapOp[];
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
  logs: LogEntry[];
  term: TermLine[];
  actionsTaken: DefenderActionId[];
  outcome: Outcome | null;
  report: VerifyReport | null;
  /** Index into VISUAL_TIMELINE during the visualize phase. */
  visualStepIndex: number;
}
