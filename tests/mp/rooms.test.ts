import { beforeEach, describe, expect, it } from "vitest";
import {
  applyRoomAction,
  createRoom,
  isValidRoomAction,
  joinRoom,
  snapshot,
} from "@/lib/mp/rooms";
import { getRoomStore, setRoomStore, type RoomStore } from "@/lib/mp/store";
import type { Room } from "@/lib/mp/protocol";

class MemStore implements RoomStore {
  rooms = new Map<string, Room>();
  async get(code: string) {
    const r = this.rooms.get(code);
    return r ? structuredClone(r) : null;
  }
  async create(room: Room) {
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, structuredClone(room));
    return true;
  }
  async cas(code: string, seq: number, room: Room) {
    const cur = this.rooms.get(code);
    if (!cur || cur.seq !== seq) return false;
    this.rooms.set(code, structuredClone(room));
    return true;
  }
  async touch() {}
}

let store: MemStore;

beforeEach(() => {
  store = new MemStore();
  setRoomStore(store);
});

async function joinTwo(code: string) {
  const d = await joinRoom(store, code, "def", "defender");
  const a = await joinRoom(store, code, "atk", "attacker");
  if ("error" in d || "error" in a) throw new Error("join failed");
  return { def: d.player, atk: a.player };
}

describe("rooms", () => {
  it("creates rooms with unique 4-char codes, live in defend phase", async () => {
    const r1 = await createRoom(store);
    const r2 = await createRoom(store);
    expect(r1.code).toMatch(/^[A-Z2-9]{4}$/);
    expect(r2.code).not.toBe(r1.code);
    expect(r1.sim.phase).toBe("defend");
    expect(r1.sim.status).toBe("UNDER_ATTACK");
    expect(r1.sim.attackerStage).toBe("RECON");
    // room isolation: r2 is an independent fresh sim
    expect(r2.sim.attackerStage).toBe("RECON");
    expect(r2.sim.actionsTaken).toEqual([]);
  });

  it("assigns requested roles, falls back for duplicates and extras", async () => {
    const room = await createRoom(store);
    const { def, atk } = await joinTwo(room.code);
    expect(def.role).toBe("defender");
    expect(atk.role).toBe("attacker");
    const third = await joinRoom(store, room.code, "s1", "defender");
    expect("error" in third ? null : third.player.role).toBe("spectator");
  });

  it("reconnects an existing player with the right token", async () => {
    const room = await createRoom(store);
    const { def } = await joinTwo(room.code);
    const re = await joinRoom(store, room.code, "def", undefined, def.id, def.token);
    expect("error" in re).toBe(false);
    if (!("error" in re)) expect(re.player.id).toBe(def.id);
    const bad = await joinRoom(store, room.code, "x", undefined, def.id, "wrong");
    expect("error" in bad && bad.error).toBe("invalid_session");
  });

  it("enforces role permissions on actions", async () => {
    const room = await createRoom(store);
    const { def, atk } = await joinTwo(room.code);
    // attacker cannot run defender actions
    const bad = await applyRoomAction(store, room.code, atk.id, atk.token, {
      kind: "defend",
      id: "inspect_logs",
    });
    expect(bad.ok).toBe(false);
    // defender cannot attack
    const bad2 = await applyRoomAction(store, room.code, def.id, def.token, {
      kind: "attack",
      id: "probe",
    });
    expect(bad2.ok).toBe(false);
    // wrong token rejected
    const bad3 = await applyRoomAction(store, room.code, def.id, "nope", {
      kind: "defend",
      id: "inspect_logs",
    });
    expect(bad3.error).toBe("unauthorized");
  });

  it("applies gated actions and bumps seq", async () => {
    const room = await createRoom(store);
    const { def, atk } = await joinTwo(room.code);
    const p = await applyRoomAction(store, room.code, atk.id, atk.token, {
      kind: "attack",
      id: "probe",
    });
    expect(p.ok).toBe(true);
    const i = await applyRoomAction(store, room.code, def.id, def.token, {
      kind: "defend",
      id: "inspect_logs",
    });
    expect(i.ok).toBe(true);
    const after = await store.get(room.code);
    expect(after?.sim.attackerStage).toBe("PROBE");
    expect(after?.sim.logsInspected).toBe(true);
    // out-of-order attack rejected without state change
    const bad = await applyRoomAction(store, room.code, atk.id, atk.token, {
      kind: "attack",
      id: "seize",
    });
    expect(bad.ok).toBe(false);
  });

  it("full match: attacker breaches → verify reports failure", async () => {
    const room = await createRoom(store);
    const { def, atk } = await joinTwo(room.code);
    for (const id of ["probe", "trigger", "groom", "uaf", "seize"] as const) {
      const r = await applyRoomAction(store, room.code, atk.id, atk.token, {
        kind: "attack",
        id,
      });
      expect(r.ok).toBe(true);
    }
    const v = await applyRoomAction(store, room.code, def.id, def.token, {
      kind: "verify",
    });
    expect(v.ok).toBe(true);
    const after = await store.get(room.code);
    expect(after?.sim.outcome).toBe("failed");
    expect(after?.sim.status).toBe("BREACHED");
  });

  it("winning match: patch + restart + verify → PATCHED", async () => {
    const room = await createRoom(store);
    const { def, atk } = await joinTwo(room.code);
    await applyRoomAction(store, room.code, atk.id, atk.token, { kind: "attack", id: "probe" });
    for (const id of ["inspect_logs", "investigate_version", "apply_patch", "restart_services"] as const) {
      const r = await applyRoomAction(store, room.code, def.id, def.token, {
        kind: "defend",
        id,
      });
      expect(r.ok).toBe(true);
    }
    // attacker aggression now deflects
    const t = await applyRoomAction(store, room.code, atk.id, atk.token, {
      kind: "attack",
      id: "trigger",
    });
    expect(t.ok).toBe(true);
    const v = await applyRoomAction(store, room.code, def.id, def.token, { kind: "verify" });
    expect(v.ok).toBe(true);
    const after = await store.get(room.code);
    expect(after?.sim.outcome).toBe("success");
    expect(after?.sim.status).toBe("PATCHED");
  });

  it("snapshot strips tokens", async () => {
    const room = await createRoom(store);
    await joinTwo(room.code);
    const snap = snapshot((await store.get(room.code))!);
    expect(snap.players.length).toBe(2);
    expect(JSON.stringify(snap)).not.toContain("token");
    expect(snap.sim.phase).toBe("defend");
  });

  it("conflict-safe: CAS fails when seq moved", async () => {
    const room = await createRoom(store);
    const stale = await store.get(room.code);
    const fresh = await store.get(room.code);
    expect(await store.cas(room.code, room.seq, { ...fresh!, seq: 2 })).toBe(true);
    expect(await store.cas(room.code, room.seq, { ...stale!, seq: 2 })).toBe(false);
  });

  it("store singleton picks MemoryStore without redis env", () => {
    setRoomStore(null);
    delete process.env.UPSTASH_REDIS_REST_URL;
    expect(getRoomStore().constructor.name).toBe("MemoryRoomStore");
  });

  it("rejects malformed action payloads without touching state", async () => {
    const room = await createRoom(store);
    const { def } = await joinTwo(room.code);
    for (const bad of [
      { kind: "defend", id: "nope" },
      { kind: "attack", id: "rm -rf /" },
      { kind: "hack" },
      { kind: "defend" },
      "string",
      null,
    ] as unknown[]) {
      expect(isValidRoomAction(bad)).toBe(false);
      const r = await applyRoomAction(store, room.code, def.id, def.token, bad as never);
      expect(r.ok).toBe(false);
      expect(r.error).toBe("unknown_action");
    }
    expect(isValidRoomAction({ kind: "defend", id: "inspect_logs" })).toBe(true);
    expect(isValidRoomAction({ kind: "verify" })).toBe(true);
  });

  it("throttles action floods per player", async () => {
    const room = await createRoom(store);
    const { def } = await joinTwo(room.code);
    const r1 = await applyRoomAction(store, room.code, def.id, def.token, {
      kind: "defend",
      id: "inspect_logs",
    });
    expect(r1.ok).toBe(true);
    // Immediate second action hits the floor even though it's a different action.
    const r2 = await applyRoomAction(store, room.code, def.id, def.token, {
      kind: "defend",
      id: "investigate_version",
    });
    expect(r2.ok).toBe(false);
    expect(r2.error).toBe("too_fast");
  });

  it("prunes ghost players so a room can't wedge full", async () => {
    const room = await createRoom(store);
    // Fill the room with 8 joins.
    for (let i = 0; i < 8; i++) {
      const j = await joinRoom(store, room.code, `p${i}`, "spectator");
      expect("error" in j).toBe(false);
    }
    const full = await joinRoom(store, room.code, "late", "spectator");
    expect("error" in full && full.error).toBe("room_full");
    // Age every player past the stale window.
    const stored = await store.get(room.code);
    for (const p of stored!.players) p.lastSeen = Date.now() - 130_000;
    await store.cas(room.code, stored!.seq, stored!);
    const again = await joinRoom(store, room.code, "late", "spectator");
    expect("error" in again).toBe(false);
  });

  it("sanitizes control characters from call signs", async () => {
    const room = await createRoom(store);
    const j = await joinRoom(store, room.code, "a\u0000b\nlong-call-sign-xxxxxxxx", "spectator");
    if ("error" in j) throw new Error("join failed");
    expect(j.player.name).toBe("ablong-call-sign-xxxxx");
  });
});
