import { NextRequest, NextResponse } from "next/server";
import { joinRoom, snapshot } from "@/lib/mp/rooms";
import { getRoomStore } from "@/lib/mp/store";
import type { Role } from "@/lib/mp/protocol";

export const dynamic = "force-dynamic";

/** POST /api/room/[code]/join — join (or rejoin with playerId+token). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    role?: Role;
    playerId?: string;
    token?: string;
  };
  const res = await joinRoom(
    getRoomStore(),
    code.toUpperCase(),
    body.name ?? "anon",
    body.role,
    body.playerId,
    body.token,
  );
  if ("error" in res) {
    return NextResponse.json(
      { error: res.error },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    {
      playerId: res.player.id,
      token: res.player.token,
      role: res.player.role,
      room: snapshot(res.room),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
