import { upgradeWebSocket } from "@vercel/functions";
import {
  detachSocket,
  handleClientMsg,
} from "@/lib/mp/realtime";
import { getRoomStore } from "@/lib/mp/store";
import { markConnected } from "@/lib/mp/rooms";
import type { ClientMsg } from "@/lib/mp/protocol";

export const dynamic = "force-dynamic";

/** GET /api/room/[code]/ws — native WebSocket upgrade (Vercel Functions). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const roomCode = code.toUpperCase();
  const store = getRoomStore();
  if (!(await store.get(roomCode))) {
    return new Response(JSON.stringify({ error: "room_not_found" }), {
      status: 404,
    });
  }

  return upgradeWebSocket((ws) => {
    const ctx: { playerId?: string } = {};
    ws.addEventListener("message", (event: MessageEvent) => {
      let raw: ClientMsg;
      try {
        raw = JSON.parse(String(event.data)) as ClientMsg;
      } catch {
        ws.send(JSON.stringify({ type: "error", code: "bad_json", message: "invalid frame" }));
        return;
      }
      handleClientMsg(roomCode, ws, raw, ctx).catch(() => {});
    });
    ws.addEventListener("close", () => {
      if (ctx.playerId) {
        detachSocket(roomCode, ctx.playerId, ws);
        markConnected(store, roomCode, ctx.playerId, false).catch(() => {});
      }
    });
  });
}
