import { and, asc, eq, gt, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { badRequest, notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { getRoomForCaller } from "@/lib/api/chess";
import { db } from "@/lib/db";
import { chessSignals } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SIGNAL_TYPES = new Set(["offer", "answer", "ice"]);

/**
 * WebRTC холболт байгуулах үеийн SDP/ICE мессежийг polling хийнэ.
 *
 * `after` (сүүлд харсан мөрийн uuid) дамжуулбал зөвхөн ТҮҮНЭЭС хойшхи, НӨГӨӨ
 * талаас ирсэн мессежийг буцаана. `DataChannel` нээгдмэгц клиент polling-оо
 * зогсооно (`lib/chess/webrtc.ts`).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { roomId } = await params;
  const { caller } = result;

  try {
    const found = await getRoomForCaller(roomId, caller.uid);
    if (!found) return notFound("Өрөө олдсонгүй.");

    const after = new URL(request.url).searchParams.get("after");

    const rows = await db
      .select()
      .from(chessSignals)
      .where(
        after
          ? and(
              eq(chessSignals.roomId, roomId),
              ne(chessSignals.fromUid, caller.uid),
              gt(chessSignals.createdAt, new Date(after))
            )
          : and(eq(chessSignals.roomId, roomId), ne(chessSignals.fromUid, caller.uid))
      )
      .orderBy(asc(chessSignals.createdAt));

    return NextResponse.json({
      signals: rows.map((row) => ({
        id: row.id,
        type: row.type,
        payload: row.payload,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return serverError(error, "Мессеж уншихад алдаа гарлаа");
  }
}

/** Холболт байгуулах SDP/ICE мессеж илгээнэ. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { roomId } = await params;
  const { caller } = result;

  try {
    const found = await getRoomForCaller(roomId, caller.uid);
    if (!found) return notFound("Өрөө олдсонгүй.");

    const body = await request.json().catch(() => ({}));
    const type = String(body.type ?? "");
    if (!SIGNAL_TYPES.has(type)) return badRequest("Танихгүй мессежийн төрөл.");

    const payload = typeof body.payload === "string" ? body.payload : JSON.stringify(body.payload);
    if (!payload) return badRequest("Мессежийн агуулга дутуу байна.");

    await db.insert(chessSignals).values({ roomId, fromUid: caller.uid, type, payload });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Мессеж илгээхэд алдаа гарлаа");
  }
}
