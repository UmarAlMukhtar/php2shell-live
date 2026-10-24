import type { Room } from "./protocol";

export const ROOM_TTL_MS = 60 * 60 * 1000;

/**
 * Room persistence. Two backends:
 * - MemoryRoomStore: single-process (dev, local `next start`, tests).
 * - RedisRoomStore: Upstash REST — cross-instance on Vercel. Chosen when
 *   UPSTASH_REDIS_REST_URL/TOKEN are present.
 */
export interface RoomStore {
  get(code: string): Promise<Room | null>;
  /** Insert a fresh room; false when the code already exists. */
  create(room: Room): Promise<boolean>;
  /** Compare-and-set on room.seq; false when the stored seq moved on. */
  cas(code: string, expectedSeq: number, room: Room): Promise<boolean>;
  touch(code: string, playerId: string): Promise<void>;
}

class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, Room>();

  private prune() {
    const cutoff = Date.now() - ROOM_TTL_MS;
    for (const [code, room] of this.rooms) {
      if (room.updatedAt < cutoff) this.rooms.delete(code);
    }
  }

  async get(code: string): Promise<Room | null> {
    this.prune();
    const room = this.rooms.get(code);
    return room ? structuredClone(room) : null;
  }

  async create(room: Room): Promise<boolean> {
    this.prune();
    if (this.rooms.has(room.code)) return false;
    this.rooms.set(room.code, structuredClone(room));
    return true;
  }

  async cas(code: string, expectedSeq: number, room: Room): Promise<boolean> {
    this.prune();
    const current = this.rooms.get(code);
    if (!current || current.seq !== expectedSeq) return false;
    this.rooms.set(code, structuredClone(room));
    return true;
  }

  async touch(code: string, playerId: string): Promise<void> {
    const room = this.rooms.get(code);
    if (!room) return;
    const p = room.players.find((pl) => pl.id === playerId);
    if (p) p.lastSeen = Date.now();
  }
}

/** Upstash REST store — CAS via Lua so concurrent actions can't clobber. */
class RedisRoomStore implements RoomStore {
  private key(code: string) {
    return `p2s:room:${code}`;
  }

  private async client() {
    const { Redis } = await import("@upstash/redis");
    return new Redis({ url: redisUrl(), token: redisToken() });
  }

  async get(code: string): Promise<Room | null> {
    const redis = await this.client();
    return (await redis.get<Room>(this.key(code))) ?? null;
  }

  async create(room: Room): Promise<boolean> {
    const redis = await this.client();
    const ok = await redis.set(this.key(room.code), room, {
      nx: true,
      ex: Math.floor(ROOM_TTL_MS / 1000),
    });
    return ok === "OK";
  }

  async cas(code: string, expectedSeq: number, room: Room): Promise<boolean> {
    const redis = await this.client();
    // Lua: verify stored seq matches, then replace + refresh TTL atomically.
    const script = `
      local cur = redis.call('GET', KEYS[1])
      if not cur then return 0 end
      local doc = cjson.decode(cur)
      if doc.seq ~= tonumber(ARGV[1]) then return 0 end
      redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
      return 1
    `;
    const res = (await redis.eval(
      script,
      [this.key(code)],
      [String(expectedSeq), JSON.stringify(room), String(Math.floor(ROOM_TTL_MS / 1000))],
    )) as number;
    return res === 1;
  }

  async touch(code: string, playerId: string): Promise<void> {
    const room = await this.get(code);
    if (!room) return;
    const p = room.players.find((pl) => pl.id === playerId);
    if (!p) return;
    p.lastSeen = Date.now();
    await this.cas(code, room.seq, room);
  }
}

/** Vercel's Upstash integration injects KV_REST_API_*; native vars also work. */
function redisUrl() {
  return process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
}

function redisToken() {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? ""
  );
}

let store: RoomStore | null = null;

export function getRoomStore(): RoomStore {
  if (!store) {
    store = redisUrl() && redisToken() ? new RedisRoomStore() : new MemoryRoomStore();
  }
  return store;
}

/** Test hook — swap the backing store. */
export function setRoomStore(next: RoomStore | null) {
  store = next;
}
