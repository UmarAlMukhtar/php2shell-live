"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  clearIdentity,
  joinRoomRest,
  loadIdentity,
  MpClient,
  saveIdentity,
  type ConnState,
  type MpIdentity,
} from "@/lib/mp/client";
import { isRoomCode, type Role, type RoomSnapshot } from "@/lib/mp/protocol";
import { MpView } from "./MpView";

type Phase = "lobby" | "room";

export function Multiplayer() {
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [name, setName] = useState("");
  const [code, setCode] = useState((params.get("code") ?? "").toUpperCase());
  const [role, setRole] = useState<Role>("defender");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [myRole, setMyRole] = useState<Role>("defender");
  const [conn, setConn] = useState<ConnState>("connecting");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const clientRef = useRef<MpClient | null>(null);

  const attach = useCallback((id: MpIdentity, knownRole?: Role) => {
    clientRef.current?.destroy();
    setErr(null);
    const client = new MpClient(id, {
      onState: setRoom,
      onConn: setConn,
      onWelcome: (r) => setMyRole(r),
      onError: (m) => {
        setErr(m);
        // Fatal join errors (dead room / invalid session) → back to lobby.
        if (m === "Room closed." || m === "invalid_session") {
          clearIdentity();
          setRoom(null);
          setPhase("lobby");
          history.replaceState(null, "", "/play");
        }
      },
    });
    clientRef.current = client;
    if (knownRole) setMyRole(knownRole);
    saveIdentity(id);
    setPhase("room");
  }, []);

  // Refresh recovery: restore a stored session for the room in the URL (or the
  // most recent room) automatically.
  useEffect(() => {
    const stored = loadIdentity();
    const urlCode = (params.get("code") ?? "").toUpperCase();
    if (stored && (!urlCode || urlCode === stored.code)) {
      const t = setTimeout(() => attach(stored), 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/room", { method: "POST" });
      const data = (await res.json()) as { code?: string };
      if (!res.ok || !data.code) throw new Error("create failed");
      const joined = await joinRoomRest(data.code, name || "defender", role);
      if (!joined.ok) throw new Error(joined.error);
      attach(joined.identity, joined.role);
      history.replaceState(null, "", `/play?code=${data.code}`);
    } catch {
      setErr("Could not create a room. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setErr("Enter a room code.");
      return;
    }
    // Reject malformed codes before any request — avoids the HTML-error
    // parse path entirely.
    if (!isRoomCode(trimmed)) {
      setErr("Invalid code — rooms are 4 letters/digits, e.g. K7MN.");
      return;
    }
    setBusy(true);
    setErr(null);
    const stored = loadIdentity();
    const joined = await joinRoomRest(
      trimmed,
      name || "anon",
      role,
      stored?.code === trimmed ? stored : undefined,
    );
    setBusy(false);
    if (!joined.ok) {
      setErr(
        joined.error === "room_not_found"
          ? "No room with that code."
          : joined.error === "room_full"
            ? "That room is full."
            : joined.error === "invalid_code"
              ? "Invalid code — rooms are 4 letters/digits, e.g. K7MN."
              : joined.error,
      );
      return;
    }
    attach(joined.identity, joined.role);
    history.replaceState(null, "", `/play?code=${joined.identity.code}`);
  };

  const leave = () => {
    clientRef.current?.destroy();
    clientRef.current = null;
    clearIdentity();
    setRoom(null);
    setPhase("lobby");
    history.replaceState(null, "", "/play");
  };

  // QR for the share URL.
  const roomCode = room?.code;
  useEffect(() => {
    if (phase !== "room" || !roomCode) return;
    const url = `${location.origin}/play?code=${roomCode}`;
    QRCode.toDataURL(url, { margin: 1, width: 160 }).then(setQrUrl).catch(() => {});
  }, [phase, roomCode]);

  if (phase === "room" && room) {
    return (
      <MpView
        room={room}
        role={myRole}
        conn={conn}
        qrUrl={qrUrl}
        onAct={(a) => clientRef.current?.act(a)}
        onLeave={leave}
        error={err}
        onDismissError={() => setErr(null)}
      />
    );
  }

  if (phase === "room") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-fg-muted">Joining room…</p>
        {err ? (
          <>
            <p className="text-xs text-breach" role="alert">{err}</p>
            <button
              type="button"
              onClick={leave}
              className="rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-fg hover:border-accent/60"
            >
              Back to lobby
            </button>
          </>
        ) : null}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-xs text-fg-muted hover:text-fg">
          ← php2shell: live
        </Link>
        <p className="text-[11px] font-semibold tracking-widest text-fg-faint uppercase">
          multiplayer — attacker vs defender
        </p>
      </header>

      <section className="rounded-[10px] border border-border bg-surface-1 p-6">
        <h1 className="text-lg font-bold text-fg">
          Incident room
        </h1>
        <p className="mt-1 text-xs leading-5 text-fg-muted">
          One player drives the exploit. The other runs incident response — same
          simulation, live. Share the room code or QR.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <p className="rounded-lg border border-attack/40 bg-attack/5 px-3 py-2 text-[11px] leading-4 text-fg">
            <span className="font-bold text-attack">ATTACKER</span> — run the
            exploit chain: recon → probe → fatal error → heap groom → UAF →
            seize the worker. BREACH wins.
          </p>
          <p className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-[11px] leading-4 text-fg">
            <span className="font-bold text-accent">DEFENDER</span> — inspect,
            block or slow the attack, apply the right patch, restart, verify.
            PATCHED wins.
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold tracking-widest text-fg-faint uppercase">
              Call sign
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="blue-01"
              maxLength={24}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-fg placeholder:text-fg-faint/60 focus:border-accent focus:outline-none"
            />
          </label>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[11px] font-semibold tracking-widest text-fg-faint uppercase">
              Preferred role
            </legend>
            <div className="flex gap-2" role="radiogroup" aria-label="Role">
              {(["defender", "attacker"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    role === r
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-surface-2 text-fg-muted hover:text-fg"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        {err ? (
          <p className="mt-3 text-xs text-breach" role="alert">
            {err}
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-12">
          <div className="rounded-lg border border-border bg-surface-2 p-4 sm:col-span-5">
            <h2 className="text-xs font-bold tracking-widest text-fg uppercase">
              Host a match
            </h2>
            <p className="mt-1 mb-3 text-[11px] text-fg-muted">
              Creates a fresh room; share the code.
            </p>
            <button
              type="button"
              onClick={create}
              disabled={busy}
              data-testid="mp-create"
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-xs font-bold tracking-widest text-accent-fg uppercase hover:bg-accent/85 disabled:opacity-50"
            >
              Create room
            </button>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 p-4 sm:col-span-7">
            <h2 className="text-xs font-bold tracking-widest text-fg uppercase">
              Join a match
            </h2>
            <p className="mt-1 mb-3 text-[11px] text-fg-muted">
              Enter the 4-letter code or open a shared link.
            </p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CODE"
                maxLength={4}
                aria-label="Room code"
                className="w-24 rounded-lg border border-border bg-surface-1 px-3 py-2.5 text-center font-mono text-sm tracking-[0.3em] text-fg uppercase placeholder:text-fg-faint/60 focus:border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={join}
                disabled={busy}
                data-testid="mp-join"
                className="flex-1 rounded-lg border border-border bg-surface-1 px-4 py-2.5 text-xs font-bold tracking-widest text-fg uppercase hover:border-accent/60 disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
