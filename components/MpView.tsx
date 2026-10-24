"use client";

import { isPatchLive } from "@/lib/sim/engine";
import { TARGET_PATCH_VERSION } from "@/lib/sim/cve";
import type { Role, RoomAction, RoomSnapshot } from "@/lib/mp/protocol";
import type { ConnState } from "@/lib/mp/client";
import { ActionPanel } from "./ActionPanel";
import { AttackPanel } from "./AttackPanel";
import { BreachEffect } from "./BreachEffect";
import { HeapArena } from "./HeapArena";
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

      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-border bg-surface-1 px-3 py-2">
        <span className="text-[11px] font-semibold tracking-widest text-fg-faint uppercase">
          room
        </span>
        <span
          className="rounded-md border border-accent/50 bg-accent/10 px-2 py-0.5 font-mono text-sm font-bold tracking-[0.3em] text-accent"
          data-testid="mp-room-code"
        >
          {room.code}
        </span>
        {qrUrl ? (
          <details className="group">
            <summary className="cursor-pointer list-none text-[11px] text-fg-faint hover:text-fg">
              qr
            </summary>
            {/* eslint-disable-next-line @next/next/no-img-element -- QR is a local data URL */}
            <img
              src={qrUrl}
              alt={`QR code linking to room ${room.code}`}
              className="absolute z-20 mt-2 rounded-lg border border-border bg-surface-1 p-2"
              width={160}
              height={160}
            />
          </details>
        ) : null}
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(`${location.origin}/play?code=${room.code}`)}
          className="text-[11px] text-fg-faint hover:text-fg"
        >
          copy link
        </button>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-fg-muted" data-testid="mp-conn">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              conn === "live" ? "bg-accent" : conn === "polling" ? "bg-vuln" : "bg-breach"
            }`}
          />
          {CONN_LABEL[conn]}
        </span>
        <span className="font-mono text-[11px] text-fg-muted" data-testid="mp-players">
          {room.players.map((p) => `${p.name}·${p.role.slice(0, 3)}${p.connected ? "" : "✕"}`).join("  ")}
        </span>
        <span className="ml-auto flex items-center gap-3">
          <span
            className={`text-[11px] font-semibold tracking-widest uppercase ${
              role === "attacker" ? "text-attack" : role === "defender" ? "text-accent" : "text-contained"
            }`}
          >
            you: {role}
          </span>
          <button
            type="button"
            onClick={onLeave}
            className="text-[11px] text-fg-faint hover:text-fg"
          >
            leave
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
          className="flex items-center justify-between rounded-[10px] border border-breach/50 bg-breach/10 px-3 py-2"
          role="alert"
        >
          <p className="text-xs text-breach">{error}</p>
          <button
            type="button"
            onClick={onDismissError}
            className="text-[11px] text-fg-faint hover:text-fg"
          >
            dismiss
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
        <div className="grid gap-4 lg:grid-cols-12">
          <aside className="flex min-w-0 flex-col gap-4 lg:col-span-3">
            <section
              className={`rounded-[10px] border bg-surface-1 p-3 ${
                role === "attacker"
                  ? "border-attack/50"
                  : role === "spectator"
                    ? "border-contained/40"
                    : "border-border"
              }`}
            >
              <h2 className="mb-2 text-xs font-semibold tracking-widest text-fg-muted uppercase">
                {role === "attacker"
                  ? "Attack moves"
                  : role === "defender"
                    ? "Response actions"
                    : "Spectating"}
              </h2>
              {role === "attacker" ? (
                <AttackPanel
                  state={state}
                  onAction={(id) => void onAct({ kind: "attack", id })}
                />
              ) : role === "defender" ? (
                <ActionPanel
                  state={state}
                  onAction={(id) => void onAct({ kind: "defend", id })}
                />
              ) : (
                <p className="px-1 py-2 text-xs leading-5 text-fg-muted">
                  Both seats are taken — watching live. If a player drops, rejoin
                  to take the seat.
                </p>
              )}
            </section>
            {role === "defender" ? (
              <>
                <button
                  type="button"
                  onClick={() => void onAct({ kind: "reset" })}
                  className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-[11px] font-semibold tracking-widest text-fg-muted uppercase hover:border-fg-faint/40 hover:text-fg"
                  data-testid="mp-reset"
                >
                  ⟲ reset incident
                </button>
                <button
                  type="button"
                  onClick={() => void onAct({ kind: "verify" })}
                  className={`rounded-lg border px-4 py-3 text-sm font-bold tracking-widest transition-colors focus-visible:outline-2 ${
                    patchLive
                      ? "border-accent bg-accent text-accent-fg hover:bg-accent/85 focus-visible:outline-accent"
                      : "border-border bg-surface-2 text-fg-faint hover:border-fg-faint focus-visible:outline-fg"
                  }`}
                  data-testid="mp-verify"
                >
                  VERIFY REMEDIATION →
                </button>
                <p className="text-[11px] leading-4 text-fg-faint">
                  {patchLive
                    ? "patched build is live — replay the attack to confirm."
                    : "replays the modeled attack. Without a live patch it will succeed."}
                </p>
              </>
            ) : (
              <p className="text-[11px] leading-4 text-fg-faint">
                Goal: reach BREACH before they patch. Blocked? Rotate source.
                Patch live? You&rsquo;re deflected — the defender wins on verify.
              </p>
            )}
            <VersionBadge
              version={state.phpVersion}
              patchStaged={state.patchApplied}
              targetVersion={TARGET_PATCH_VERSION}
            />
          </aside>

          <div className="flex min-w-0 flex-col gap-4 lg:col-span-6">
            <HeapArena
              heap={state.heap}
              focusId={
                state.heap.find((b) => b.state === "stale" || b.state === "corrupted")
                  ?.id ?? null
              }
            />
            <div className="min-h-[240px] flex-1 overflow-hidden rounded-[10px] border border-border bg-surface-3">
              <Terminal lines={state.term} className="h-full" />
            </div>
          </div>

          <div className="rounded-[10px] border border-border bg-surface-3 lg:col-span-3">
            <LogStream logs={state.logs} />
          </div>
        </div>
      )}
    </main>
  );
}
