import { asc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { chessQueue, chessRooms } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Тоглогч хайх — санамсаргүй хос (чадвараар БИШ, зөвхөн хамгийн эрт
 * хүлээснээр). Нэг transaction дотор шийднэ: аль хэдийн хүлээж буй хэн нэгэн
 * байвал шууд хос үүсгэнэ; үгүй бол дараалалд ордог.
 *
 * ⚠ `FOR UPDATE SKIP LOCKED` ЧУХАЛ: хоёр хэрэглэгч ЗЭРЭГ дарвал хоёулаа
 * ГУРАВ ДАХЬ хэн нэгнийг барихыг оролдож болно — SKIP LOCKED нь аль хэдийн
 * нөгөө хүсэлтээр түгжигдсэн мөрийг алгасаж, хоёр дахин ижил хүнийг барихаас
 * (өөрөөр хэлбэл нэг тоглогч ХОЁР өрөөнд зэрэг орохоос) сэргийлнэ.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const outcome = await db.transaction(async (tx) => {
      const [waiting] = await tx
        .select()
        .from(chessQueue)
        .where(ne(chessQueue.uid, caller.uid))
        .orderBy(asc(chessQueue.joinedAt))
        .limit(1)
        .for("update", { skipLocked: true });

      // Намайг өмнө нь хүлээж байсан мөр байвал (жишээ нь өөр таб дээрээс
      // давхар дарсан) цэвэрлэнэ — доорх хоёр замын аль алинд хэрэгтэй.
      await tx.delete(chessQueue).where(eq(chessQueue.uid, caller.uid));

      if (!waiting) {
        await tx.insert(chessQueue).values({ uid: caller.uid });
        return { matched: false as const };
      }

      await tx.delete(chessQueue).where(eq(chessQueue.uid, waiting.uid));

      const [room] = await tx
        .insert(chessRooms)
        .values({ whiteUid: waiting.uid, blackUid: caller.uid })
        .returning({ id: chessRooms.id });

      return { matched: true as const, roomId: room.id };
    });

    if (!outcome.matched) {
      return NextResponse.json({ matched: false });
    }

    return NextResponse.json({
      matched: true,
      roomId: outcome.roomId,
      color: "black",
    });
  } catch (error) {
    return serverError(error, "Тоглогч хайхад алдаа гарлаа");
  }
}
