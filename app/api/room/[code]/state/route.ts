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
  const pid = req.nextUrl.searchParams.get("pid");
  const store = getRoomStore();
  if (pid) void store.touch(code.toUpperCase(), pid).catch(() => {});
  const room = await store.get(code.toUpperCase());
  const NO_STORE = { "Cache-Control": "no-store" };
  if (!room) {
    return NextResponse.json(
      { error: "room_not_found" },
      { status: 404, headers: NO_STORE },
    );
  }
  if (room.seq <= since) {
    // Still surface presence changes (heartbeat-derived) between seq bumps.
    return NextResponse.json(
      { seq: room.seq, unchanged: true, players: snapshot(room).players },
      { headers: NO_STORE },
    );
  }
  return NextResponse.json(
    { seq: room.seq, room: snapshot(room) },
    { headers: NO_STORE },
  );
}
