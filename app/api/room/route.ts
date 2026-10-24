import { NextResponse } from "next/server";
import { createRoom } from "@/lib/mp/rooms";
import { getRoomStore } from "@/lib/mp/store";

export const dynamic = "force-dynamic";

/** POST /api/room — create a new room, returns its shareable code. */
export async function POST() {
  const room = await createRoom(getRoomStore());
  return NextResponse.json({ code: room.code, seq: room.seq });
}
