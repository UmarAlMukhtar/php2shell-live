import { NextRequest, NextResponse } from "next/server";
import { snapshot } from "@/lib/mp/rooms";
import { getRoomStore } from "@/lib/mp/store";

export const dynamic = "force-dynamic";

/** GET /api/room/[code]/state?seq=N — poll fallback when WS is unavailable. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const since = Number(req.nextUrl.searchParams.get("seq") ?? -1);
  const room = await getRoomStore().get(code.toUpperCase());
  if (!room) return NextResponse.json({ error: "room_not_found" }, { status: 404 });
  if (room.seq <= since) {
    return NextResponse.json({ seq: room.seq, unchanged: true });
  }
  return NextResponse.json({ seq: room.seq, room: snapshot(room) });
}
