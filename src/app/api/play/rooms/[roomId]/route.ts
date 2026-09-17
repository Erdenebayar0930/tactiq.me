import { NextResponse } from "next/server";
import { parsePlayGame } from "@/lib/tactiq/playGame";

import { notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { getOpponentInfo, getRoomForCaller } from "@/lib/api/chess";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Тоглоомын өрөөний мэдээлэл — миний өнгө, өрсөлдөгч, төлөв. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { roomId } = await params;

  try {
    const found = await getRoomForCaller(roomId, result.caller.uid);
    if (!found) return notFound("Өрөө олдсонгүй.");

    const opponentUid = found.color === "white" ? found.room.blackUid : found.room.whiteUid;
    const opponent = await getOpponentInfo(opponentUid);

    return NextResponse.json({
      roomId: found.room.id,
      game: parsePlayGame(found.room.game),
      color: found.color,
      status: found.room.status,
      winnerUid: found.room.winnerUid,
      endReason: found.room.endReason,
      opponent,
    });
  } catch (error) {
    return serverError(error, "Өрөөг уншихад алдаа гарлаа");
  }
}
