"use client";

import { isRoomCode } from "@/lib/mp/protocol";
import type {
  Role,
  RoomAction,
  RoomSnapshot,
  ServerMsg,
} from "@/lib/mp/protocol";

/**
 * Multiplayer client session: prefers the native WebSocket route, falls back
 * to polling `/api/room/[code]/state` when WS can't connect, and persists the
 * player identity in sessionStorage for refresh/reconnect recovery.
 */

export interface MpIdentity {
  code: string;
  playerId: string;
  token: string;
  name: string;
}

export type ConnState = "connecting" | "live" | "polling" | "offline";

type Handlers = {
  onState: (room: RoomSnapshot) => void;
  onConn: (c: ConnState) => void;
  onWelcome: (role: Role) => void;
  onError: (message: string) => void;
};

const ID_KEY = "p2s:mp";
const POLL_MS = 750;
const WS_TIMEOUT_MS = 4000;

export function saveIdentity(id: MpIdentity) {
  try {
    sessionStorage.setItem(ID_KEY, JSON.stringify(id));
  } catch {}
}

export function loadIdentity(): MpIdentity | null {
  try {
    const raw = sessionStorage.getItem(ID_KEY);
    return raw ? (JSON.parse(raw) as MpIdentity) : null;
  } catch {
    return null;
  }
}

export function clearIdentity() {
  try {
    sessionStorage.removeItem(ID_KEY);
  } catch {}
}

export class MpClient {
  private ws: WebSocket | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private hbTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private conn: ConnState = "connecting";
  private lastRoom: RoomSnapshot | null = null;
  private lastTouchAt = 0;
  seq = -1;

  constructor(
    private id: MpIdentity,
    private h: Handlers,
  ) {
    this.connect();
  }

  get identity() {
    return this.id;
  }

  private setConn(c: ConnState) {
    if (this.conn === c) return;
    this.conn = c;
    this.h.onConn(c);
  }

  private wsUrl(): string {
    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${location.host}/api/room/${this.id.code}/ws`;
  }

  private connect() {
    if (this.closed) return;
    this.setConn("connecting");
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.wsUrl());
    } catch {
      this.startPolling();
      return;
    }
    this.ws = ws;

    const timeout = setTimeout(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        ws.close();
        this.startPolling();
      }
    }, WS_TIMEOUT_MS);

    ws.onopen = () => {
      clearTimeout(timeout);
      this.sayHello();
      this.setConn("live");
      // Heartbeat keeps presence fresh while the socket is open.
      this.hbTimer = setInterval(() => this.wsSend({ type: "ping" }), 4000);
    };
    ws.onmessage = (ev) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(String(ev.data)) as ServerMsg;
      } catch {
        return;
      }
      this.handle(msg);
    };
    ws.onclose = () => {
      clearTimeout(timeout);
      if (this.hbTimer) {
        clearInterval(this.hbTimer);
        this.hbTimer = null;
      }
      if (this.closed) return;
      // Reconnect after a beat; if WS never comes back, polling takes over.
      this.startPolling();
      setTimeout(() => {
        if (!this.closed && this.conn !== "live") this.connect();
      }, 3000);
    };
    ws.onerror = () => {};
  }

  private sayHello() {
    this.wsSend({
      type: "hello",
      room: this.id.code,
      playerId: this.id.playerId,
      token: this.id.token,
      name: this.id.name,
    });
  }

  private wsSend(msg: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handle(msg: ServerMsg) {
    switch (msg.type) {
      case "welcome":
        this.id.token = msg.token;
        this.id.playerId = msg.playerId;
        saveIdentity(this.id);
        this.h.onWelcome(msg.role);
        this.push(msg.room);
        break;
      case "state":
        this.push(msg.room);
        break;
      case "action_error":
        this.h.onError(msg.message);
        break;
      case "error":
        this.h.onError(msg.message);
        break;
    }
  }

  private push(room: RoomSnapshot) {
    this.seq = room.seq;
    this.lastRoom = room;
    this.h.onState(room);
  }

  private startPolling() {
    if (this.closed || this.pollTimer) return;
    this.setConn("polling");
    const tick = async () => {
      if (this.closed) return;
      try {
        // Presence heartbeat rides along, but only every ~5s — each touch
        // is a store write, so piggyback on the poll sparingly.
        const touch = Date.now() - this.lastTouchAt > 5000;
        if (touch) this.lastTouchAt = Date.now();
        const res = await fetch(
          `/api/room/${this.id.code}/state?seq=${this.seq}` +
            (touch ? `&pid=${this.id.playerId}` : ""),
        );
        if (res.ok) {
          const data = (await res.json()) as {
            room?: RoomSnapshot;
            players?: RoomSnapshot["players"];
          };
          if (data.room) this.push(data.room);
          else if (data.players && this.lastRoom) {
            this.push({ ...this.lastRoom, players: data.players });
          }
        } else if (res.status === 404) {
          this.h.onError("Room closed.");
          this.destroy();
          return;
        }
        this.setConn(this.conn === "connecting" ? "polling" : this.conn);
      } catch {
        this.setConn("offline");
      }
      this.pollTimer = setTimeout(tick, POLL_MS);
    };
    void tick();
  }

  async act(action: RoomAction): Promise<string | null> {
    if (this.conn === "live") {
      this.wsSend({ type: "action", action });
      return null; // errors arrive as action_error frames
    }
    try {
      const res = await fetch(`/api/room/${this.id.code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: this.id.playerId,
          token: this.id.token,
          action,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        room?: RoomSnapshot;
      };
      if (!res.ok) return data.error ?? "action rejected";
      if (data.room) this.push(data.room);
      return null;
    } catch {
      return "Network error — action not sent.";
    }
  }

  destroy() {
    this.closed = true;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.hbTimer) clearInterval(this.hbTimer);
    this.ws?.close();
  }
}

/** REST join — used by the lobby before constructing the client. */
export async function joinRoomRest(
  code: string,
  name: string,
  role: Role,
  identity?: { playerId: string; token: string },
): Promise<
  | { ok: true; identity: MpIdentity; role: Role }
  | { ok: false; error: string }
> {
  if (!isRoomCode(code.toUpperCase())) return { ok: false, error: "invalid_code" };
  let res: Response;
  try {
    res = await fetch(`/api/room/${code.toUpperCase()}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        role,
        playerId: identity?.playerId,
        token: identity?.token,
      }),
    });
  } catch {
    return { ok: false, error: "Network error — could not reach the room." };
  }
  let data: { error?: string; playerId?: string; token?: string; role?: Role };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    // Non-JSON error page (proxy/html 404, etc.) — never an unhandled throw.
    return { ok: false, error: res.ok ? "join failed" : "room_not_found" };
  }
  if (!res.ok) return { ok: false, error: data.error ?? "join failed" };
  return {
    ok: true,
    identity: {
      code: code.toUpperCase(),
      playerId: data.playerId!,
      token: data.token!,
      name,
    },
    role: data.role as Role,
  };
}
