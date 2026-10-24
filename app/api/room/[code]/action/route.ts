import { NextRequest, NextResponse } from "next/server";
import { applyRoomAction, snapshot } from "@/lib/mp/rooms";
import { getRoomStore } from "@/lib/mp/store";
import type { RoomAction } from "@/lib/mp/protocol";

export const dynamic = "force-dynamic";

/** POST /api/room/[code]/action — REST fallback for the WS action path. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    playerId?: string;
    token?: string;
    action?: RoomAction;
  };
  if (!body.playerId || !body.token || !body.action) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const store = getRoomStore();
  const res = await applyRoomAction(
    store,
    code.toUpperCase(),
    body.playerId,
    body.token,
    body.action,
  );
  if (!res.ok) {
    return NextResponse.json({ seq: res.seq, error: res.error }, { status: 400 });
  }
  const room = await store.get(code.toUpperCase());
  return NextResponse.json({ seq: res.seq, room: room ? snapshot(room) : null });
}
