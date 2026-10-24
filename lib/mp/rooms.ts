import { applyAttackerAction } from "@/lib/sim/attack";
import { getAction } from "@/lib/sim/defense";
import { enterStageInternal, initialState, pushLogs } from "@/lib/sim/engine";
import { log } from "@/lib/sim/logs";
import { runVerification } from "@/lib/sim/verify";
import type { SimState } from "@/lib/sim/types";
import type {
  ActionResult,
  Player,
  Role,
  Room,
  RoomAction,
  RoomSnapshot,
} from "./protocol";
import type { RoomStore } from "./store";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 4;
const MAX_PLAYERS = 8;

function makeCode(len = CODE_LEN): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function makeToken(): string {
  return crypto.randomUUID();
}

/** Fresh room: skips Visualize — the incident starts live in Defend. */
export function newRoom(code: string): Room {
  let sim: SimState = initialState();
  sim = { ...sim, phase: "defend", status: "UNDER_ATTACK" };
  sim = enterStageInternal(sim, "RECON");
  sim = pushLogs(sim, [
    log("info", "soc", `room ${code} armed — attacker vs defender, live`),
  ]);
  const now = Date.now();
  return { code, seq: 1, createdAt: now, updatedAt: now, players: [], sim };
}

export async function createRoom(store: RoomStore): Promise<Room> {
  for (let i = 0; i < 10; i++) {
    const room = newRoom(makeCode());
    if (await store.create(room)) return room;
  }
  throw new Error("could not allocate a room code");
}

const PRESENCE_MS = 9000;

function pickRole(room: Room, requested?: Role): Role {
  // Only live players hold a role — a dropped attacker's seat frees up.
  const now = Date.now();
  const taken = new Set(
    room.players
      .filter((p: Player) => p.connected && now - p.lastSeen < PRESENCE_MS)
      .map((p: Player) => p.role),
  );
  if (requested && requested !== "spectator" && !taken.has(requested)) return requested;
  for (const role of ["defender", "attacker"] as const) {
    if (!taken.has(role)) return role;
  }
  return "spectator";
}

/** Join (or re-join with an existing token) and return the player record. */
export async function joinRoom(
  store: RoomStore,
  code: string,
  name: string,
  role: Role | undefined,
  playerId?: string,
  token?: string,
): Promise<{ room: Room; player: Player } | { error: string }> {
  const room = await store.get(code);
  if (!room) return { error: "room_not_found" };

  // Reconnect: existing player with valid token.
  if (playerId && token) {
    const existing = room.players.find(
      (p: Player) => p.id === playerId && p.token === token,
    );
    if (existing) {
      existing.connected = true;
      existing.lastSeen = Date.now();
      if (name) existing.name = name;
      await store.cas(code, room.seq, room);
      return { room, player: existing };
    }
    return { error: "invalid_session" };
  }

  if (room.players.length >= MAX_PLAYERS) return { error: "room_full" };

  const player: Player = {
    id: makeToken(),
    token: makeToken(),
    role: pickRole(room, role),
    name: name?.slice(0, 24) || "anon",
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    connected: true,
  };
  const next = { ...room, players: [...room.players, player], seq: room.seq + 1, updatedAt: Date.now() };
  if (!(await store.cas(code, room.seq, next))) {
    return { error: "conflict" }; // caller retries
  }
  return { room: next, player };
}

export async function markConnected(
  store: RoomStore,
  code: string,
  playerId: string,
  connected: boolean,
): Promise<void> {
  const room = await store.get(code);
  if (!room) return;
  const p = room.players.find((pl: Player) => pl.id === playerId);
  if (!p) return;
  p.connected = connected;
  // Instant "left" marker on explicit disconnect; liveness otherwise derives
  // from heartbeat freshness (works for WS and polling clients alike).
  p.lastSeen = connected ? Date.now() : 0;
  await store.cas(code, room.seq, { ...room, seq: room.seq + 1, updatedAt: Date.now() });
}

/** Strip secrets for client consumption. */
export function snapshot(room: Room): RoomSnapshot {
  const now = Date.now();
  return {
    code: room.code,
    seq: room.seq,
    players: room.players.map(({ id, role, name, connected, lastSeen }) => ({
      id,
      role,
      name,
      connected: connected && now - lastSeen < PRESENCE_MS,
    })),
    sim: room.sim,
  };
}

function roleGate(action: RoomAction, role: Role): string | null {
  switch (action.kind) {
    case "attack":
      return role === "attacker" ? null : "Only the attacker can run attack moves.";
    case "defend":
      return role === "defender" ? null : "Only the defender can run response actions.";
    case "verify":
      return role === "defender" ? null : "Only the defender verifies remediation.";
    case "reset":
      return role === "defender" ? null : "Only the defender can restart the incident.";
  }
}

/**
 * Validate + apply a player action with CAS retry so concurrent actions can
 * never clobber each other. Returns the new seq on success.
 */
export async function applyRoomAction(
  store: RoomStore,
  code: string,
  playerId: string,
  token: string,
  action: RoomAction,
): Promise<ActionResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const room = await store.get(code);
    if (!room) return { ok: false, seq: 0, error: "room_not_found" };
    const player = room.players.find((p: Player) => p.id === playerId);
    if (!player || player.token !== token) {
      return { ok: false, seq: room.seq, error: "unauthorized" };
    }
    const gate = roleGate(action, player.role);
    if (gate) return { ok: false, seq: room.seq, error: gate };

    let sim = room.sim;
    let error: string | undefined;
    switch (action.kind) {
      case "defend": {
        const def = getAction(action.id);
        const reason = def.prereq(sim) ?? def.doneReason(sim);
        if (reason !== null) error = reason;
        else sim = def.apply(sim);
        break;
      }
      case "attack": {
        const res = applyAttackerAction(sim, action.id);
        if (res.error) error = res.error;
        else sim = res.state;
        break;
      }
      case "verify": {
        if (sim.phase !== "defend") error = "Verification only runs during the incident.";
        else sim = runVerification(sim).state;
        break;
      }
      case "reset": {
        sim = newRoom(code).sim;
        break;
      }
    }
    if (error) return { ok: false, seq: room.seq, error };

    const next: Room = { ...room, sim, seq: room.seq + 1, updatedAt: Date.now() };
    if (await store.cas(code, room.seq, next)) {
      return { ok: true, seq: next.seq };
    }
    // Conflict — another action landed first; reload and retry.
  }
  return { ok: false, seq: 0, error: "conflict" };
}
