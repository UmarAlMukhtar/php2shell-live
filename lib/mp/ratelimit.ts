import { getRoomStore } from "./store";

/**
 * Small fixed-window rate limiter. Redis-backed in production (INCR + EX),
 * in-memory locally. Only gates the expensive write paths (room create);
 * per-player action floors live in rooms.ts.
 */

const buckets = new Map<string, { count: number; reset: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const redis =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  if (redis) {
    const { Redis } = await import("@upstash/redis");
    const r = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL!,
      token:
        process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN!,
    });
    const k = `p2s:rl:${key}`;
    const n = await r.incr(k);
    if (n === 1) await r.expire(k, Math.ceil(windowMs / 1000));
    return n <= limit;
  }
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? "anon").trim();
}

export { getRoomStore };
