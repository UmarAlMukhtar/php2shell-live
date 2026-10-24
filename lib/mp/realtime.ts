import { getRoomStore } from "./store";
import {
  applyRoomAction,
  joinRoom,
  snapshot,
} from "./rooms";
import type { ClientMsg, RoomAction, RoomSnapshot, ServerMsg } from "./protocol";

/**
 * Instance-local socket registry. Every function instance keeps its own set of
 * sockets per room, plus a light store-watcher that pushes fresh snapshots when
 * the room's seq changes — this is what syncs players landed on different
 * instances (MemoryStore in dev, Redis in production).
 */

type Socket = {
  send(data: string): void;
};

const rooms = new Map<
  string,
  {
    sockets: Map<string, Set<Socket>>; // playerId -> sockets
    seq: number;
    timer: ReturnType<typeof setInterval> | null;
  }
>();

const POLL_MS = 500;

function getRoom(code: string) {
  let entry = rooms.get(code);
  if (!entry) {
    entry = { sockets: new Map(), seq: -1, timer: null };
    rooms.set(code, entry);
  }
  return entry;
}

function send(ws: Socket, msg: ServerMsg) {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // socket already gone
  }
}

function broadcast(code: string, room: RoomSnapshot) {
  const entry = rooms.get(code);
  if (!entry) return;
  const msg = JSON.stringify({ type: "state", room } satisfies ServerMsg);
  for (const set of entry.sockets.values()) {
    for (const ws of set) {
      try {
        ws.send(msg);
      } catch {
        // ignore
      }
    }
  }
}

async function pushLatest(code: string) {
  const store = getRoomStore();
  const room = await store.get(code);
  if (!room) return;
  const entry = rooms.get(code);
  if (!entry) return;
  if (room.seq !== entry.seq) {
    entry.seq = room.seq;
    broadcast(code, snapshot(room));
  }
}

function ensureWatcher(code: string) {
  const entry = getRoom(code);
  if (entry.timer) return;
  entry.timer = setInterval(() => {
    const e = rooms.get(code);
    if (!e || e.sockets.size === 0) {
      if (e?.timer) clearInterval(e.timer);
      if (e) e.timer = null;
      return;
    }
    void pushLatest(code).catch(() => {});
  }, POLL_MS);
  // Keep serverless instance unblocked.
  if (typeof entry.timer === "object" && "unref" in entry.timer) entry.timer.unref();
}

export function attachSocket(code: string, playerId: string, ws: Socket) {
  const entry = getRoom(code);
  let set = entry.sockets.get(playerId);
  if (!set) {
    set = new Set();
    entry.sockets.set(playerId, set);
  }
  set.add(ws);
  ensureWatcher(code);
}

export function detachSocket(code: string, playerId: string, ws: Socket) {
  const entry = rooms.get(code);
  if (!entry) return;
  const set = entry.sockets.get(playerId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) entry.sockets.delete(playerId);
}

export async function broadcastNow(code: string) {
  await pushLatest(code);
}

/** Handle one decoded client message for an established socket. */
export async function handleClientMsg(
  code: string,
  ws: Socket,
  raw: unknown,
  ctx: { playerId?: string },
): Promise<void> {
  const store = getRoomStore();
  const msg = raw as ClientMsg;

  if (msg?.type === "ping") {
    send(ws, { type: "pong" });
    return;
  }

  if (msg?.type === "hello") {
    const res = await joinRoom(
      store,
      code,
      msg.name ?? "anon",
      msg.role,
      msg.playerId,
      msg.token,
    );
    if ("error" in res) {
      send(ws, { type: "error", code: res.error, message: res.error });
      return;
    }
    ctx.playerId = res.player.id;
    attachSocket(code, res.player.id, ws);
    send(ws, {
      type: "welcome",
      playerId: res.player.id,
      token: res.player.token,
      role: res.player.role,
      room: snapshot(res.room),
    });
    broadcastNow(code).catch(() => {});
    return;
  }

  if (msg?.type === "action") {
    if (!ctx.playerId) {
      send(ws, { type: "error", code: "not_joined", message: "Say hello first." });
      return;
    }
    const room = await store.get(code);
    const player = room?.players.find((p) => p.id === ctx.playerId);
    if (!room || !player) {
      send(ws, { type: "error", code: "room_not_found", message: "Room closed." });
      return;
    }
    const res = await applyRoomAction(store, code, player.id, player.token, msg.action as RoomAction);
    if (!res.ok) {
      send(ws, { type: "action_error", message: res.error ?? "action rejected" });
      return;
    }
    broadcastNow(code).catch(() => {});
  }
}
