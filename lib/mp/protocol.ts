import type {
  AttackerActionId,
  DefenderActionId,
  SimState,
} from "@/lib/sim/types";

export type Role = "defender" | "attacker" | "spectator";

/** Valid room-code shape — same alphabet/length the server generates. */
export function isRoomCode(code: string): boolean {
  return /^[A-Z2-9]{4}$/.test(code);
}

export interface Player {
  id: string;
  /** Secret used to authenticate actions and reconnects. Never leaves the server. */
  token: string;
  role: Role;
  name: string;
  joinedAt: number;
  lastSeen: number;
  /** Server-side action floor — throttles scripted floods. */
  lastActionAt: number;
  connected: boolean;
}

export interface Room {
  code: string;
  /** Monotonic version — bumped on every mutation; basis for CAS + sync. */
  seq: number;
  createdAt: number;
  updatedAt: number;
  players: Player[];
  sim: SimState;
}

/** Player shape safe to send to clients (no tokens, no internals). */
export interface PublicPlayer {
  id: string;
  role: Role;
  name: string;
  connected: boolean;
}

export interface RoomSnapshot {
  code: string;
  seq: number;
  players: PublicPlayer[];
  sim: SimState;
}

/** Actions a client can request — validated + role-gated server-side. */
export type RoomAction =
  | { kind: "defend"; id: DefenderActionId }
  | { kind: "attack"; id: AttackerActionId }
  | { kind: "verify" }
  | { kind: "reset" };

export type ClientMsg =
  | {
      type: "hello";
      room: string;
      /** Present on reconnect; absent for a fresh join. */
      token?: string;
      playerId?: string;
      name?: string;
      role?: Role;
    }
  | { type: "action"; action: RoomAction }
  | { type: "ping" };

export type ServerMsg =
  | { type: "welcome"; playerId: string; token: string; role: Role; room: RoomSnapshot }
  | { type: "state"; room: RoomSnapshot }
  | { type: "action_error"; message: string }
  | { type: "error"; code: string; message: string }
  | { type: "pong" };

/** Result of applying a player action — error when rejected. */
export interface ActionResult {
  ok: boolean;
  seq: number;
  error?: string;
}
