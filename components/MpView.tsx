"use client";

import { isPatchLive } from "@/lib/sim/engine";
import { TARGET_PATCH_VERSION } from "@/lib/sim/cve";
import type { Role, RoomAction, RoomSnapshot } from "@/lib/mp/protocol";
import type { ConnState } from "@/lib/mp/client";
import { ActionPanel } from "./ActionPanel";
import { AttackPanel } from "./AttackPanel";
import { BreachEffect } from "./BreachEffect";
import { HeapVisualizer } from "./HeapVisualizer";
import { IncidentStatus } from "./IncidentStatus";
import { LogStream } from "./LogStream";
import { ReportCard } from "./ReportCard";
import { Terminal } from "./Terminal";
import { VersionBadge } from "./VersionBadge";

interface Props {
  room: RoomSnapshot;
  role: Role;
  conn: ConnState;
  qrUrl: string | null;
  onAct: (a: RoomAction) => Promise<string | null> | void;
  onLeave: () => void;
  error: string | null;
  onDismissError: () => void;
}

const CONN_LABEL: Record<ConnState, string> = {
  connecting: "connecting…",
  live: "live",
  polling: "polling",
  offline: "offline",
};

export function MpView({
  room,
  role,
  conn,
  qrUrl,
  onAct,
  onLeave,
  error,
  onDismissError,
}: Props) {
  const state = room.sim;
  const patchLive = isPatchLive(state);
  const report = state.report;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col gap-4 px-4 py-6">
      <BreachEffect active={state.status === "BREACHED"} />

      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
          room
        </span>
        <span
          className="rounded border border-accent/50 bg-accent/10 px-2 py-0.5 font-mono text-sm font-bold tracking-[0.3em] text-accent"
          data-testid="mp-room-code"
        >
          {room.code}
        </span>
        {qrUrl ? (
          <details className="group">
            <summary className="cursor-pointer list-none font-mono text-[10px] text-muted hover:text-foreground">
              [qr]
            </summary>
            {/* eslint-disable-next-line @next/next/no-img-element -- QR is a local data URL */}
            <img
              src={qrUrl}
              alt={`QR code linking to room ${room.code}`}
              className="absolute z-20 mt-2 rounded border border-border bg-panel p-2"
              width={160}
              height={160}
            />
          </details>
        ) : null}
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(`${location.origin}/play?code=${room.code}`)}
          className="font-mono text-[10px] text-muted hover:text-foreground"
        >
          [copy link]
        </button>
        <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted" data-testid="mp-conn">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              conn === "live" ? "bg-accent" : conn === "polling" ? "bg-warn" : "bg-danger"
            }`}
          />
          {CONN_LABEL[conn]}
        </span>
        <span className="font-mono text-[10px] text-muted" data-testid="mp-players">
          {room.players.map((p) => `${p.name}·${p.role.slice(0, 3)}${p.connected ? "" : "✕"}`).join("  ")}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <span className="font-mono text-[10px] tracking-widest uppercase text-danger">
            you: {role}
          </span>
          <button
            type="button"
            onClick={onLeave}
            className="font-mono text-[10px] text-muted hover:text-foreground"
          >
            [leave]
          </button>
        </span>
      </header>

      <IncidentStatus
        status={state.status}
        attackerStage={state.attackerStage}
        capacity={state.capacity}
      />

      {error ? (
        <div
          className="flex items-center justify-between rounded border border-danger/50 bg-danger/10 px-3 py-2"
          role="alert"
        >
          <p className="font-mono text-xs text-danger">{error}</p>
          <button
            type="button"
            onClick={onDismissError}
            className="font-mono text-[10px] text-muted hover:text-foreground"
          >
            [dismiss]
          </button>
        </div>
      ) : null}

      {report ? (
        <ReportCard
          report={report}
          onRestart={() => void onAct({ kind: "reset" })}
          onBackToDefend={() => void onAct({ kind: "reset" })}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr_1fr]">
          <aside className="flex min-w-0 flex-col gap-4">
            <section className="rounded-lg border border-border bg-panel p-3">
              <h2 className="mb-2 font-mono text-xs tracking-widest text-muted uppercase">
                {role === "attacker" ? "Attack moves" : "Response actions"}
              </h2>
              {role === "attacker" ? (
                <AttackPanel
                  state={state}
                  onAction={(id) => void onAct({ kind: "attack", id })}
                />
              ) : (
                <ActionPanel
                  state={state}
                  onAction={(id) => void onAct({ kind: "defend", id })}
                />
              )}
            </section>
            {role === "defender" ? (
              <>
                <button
                  type="button"
                  onClick={() => void onAct({ kind: "verify" })}
                  className={`rounded border px-4 py-3 font-mono text-sm font-bold tracking-widest transition-colors focus-visible:outline-2 ${
                    patchLive
                      ? "border-accent bg-accent/15 text-accent hover:bg-accent/25 focus-visible:outline-accent"
                      : "border-border bg-panel-2 text-muted hover:border-foreground/40 focus-visible:outline-foreground"
                  }`}
                  data-testid="mp-verify"
                >
                  VERIFY REMEDIATION →
                </button>
                <p className="font-mono text-[10px] leading-4 text-muted">
                  {patchLive
                    ? "patched build is live — replay the attack to confirm."
                    : "replays the modeled attack. Without a live patch it will succeed."}
                </p>
              </>
            ) : (
              <p className="font-mono text-[10px] leading-4 text-muted">
                The defender sees your moves land in real time — same simulation,
                other side. Blocked? Rotate source. Worker pulled? Wait it out.
              </p>
            )}
            <VersionBadge
              version={state.phpVersion}
              patchStaged={state.patchApplied}
              targetVersion={TARGET_PATCH_VERSION}
            />
          </aside>

          <div className="flex min-w-0 flex-col gap-4">
            <HeapVisualizer heap={state.heap} />
            <div className="min-h-[240px] flex-1 rounded-lg border border-border bg-panel">
              <Terminal lines={state.term} className="h-full" />
            </div>
          </div>

          <LogStream logs={state.logs} />
        </div>
      )}
    </main>
  );
}
