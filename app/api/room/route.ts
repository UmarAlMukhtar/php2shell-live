import { NextRequest, NextResponse } from "next/server";
import { createRoom } from "@/lib/mp/rooms";
import { clientIp, rateLimit } from "@/lib/mp/ratelimit";
import { getRoomStore } from "@/lib/mp/store";

export const dynamic = "force-dynamic";

/** POST /api/room — create a new room, returns its shareable code. */
export async function POST(req: NextRequest) {
  // Room creation is the expensive write path — cap it per client IP.
  const allowed = await rateLimit(`create:${clientIp(req)}`, 20, 3600_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  }
  const room = await createRoom(getRoomStore());
  return NextResponse.json(
    { code: room.code, seq: room.seq },
    { headers: { "Cache-Control": "no-store" } },
  );
}
