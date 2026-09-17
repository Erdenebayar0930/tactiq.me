import { and, eq, sql } from "drizzle-orm";
import { parsePlayGame } from "@/lib/tactiq/playGame";
import { NextResponse } from "next/server";

import { badRequest, notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { getRoomForCaller } from "@/lib/api/chess";
import { applyHumanGame } from "@/lib/api/rating";
import { toPublicUser } from "@/lib/api/publicUser";
import { db } from "@/lib/db";
import { chessRooms, users } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const END_REASONS = new Set(["checkmate", "resignation", "draw", "disconnect"]);

/**
 * Тоглоомыг дуусгасныг тэмдэглэнэ — аль ч тал эхлээд илрүүлж болно
 * (мад/пат/тэнцээг локал `chess.js`-ээрээ, эсвэл "Бууж өгөх" товч,
 * эсвэл DataChannel тасарсныг).
 *
 * ⚠ `WHERE status = 'active'` УХАМСАРТАЙ нэмсэн — хоёр тал ОГТ ЗЭРЭГ энэ
 * route-ыг дуудвал (ялангуяа мад хийгдэхэд хоёулаа ЯГ НЭГ ЗЭРЭГ илрүүлдэг)
 * зөвхөн НЭГ нь бодитоор мөрийг "finished" рүү шилжүүлж, `.returning()`-оор
 * үр дүн авна — эс бөгөөс хоёулаа амжилттай update хийгээд ялалт/хожигдлын
 * тоо ХОЁР ДАХИН нэмэгдэх эрсдэлтэй байсан.
 *
 * ⚠ Тэр ЯГ ИЖИЛ хамгаалалт Elo-д ч чухал: үнэлгээ хоёр удаа тооцогдвол
 * ялагч давхар оноо авна. Тиймээс `applyHumanGame` нь мөрийг амжилттай
 * "finished" болгосон урсгал ДОТОР л дуудагдана.
 */
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

    if (found.room.status === "finished") {
      return NextResponse.json({
        ok: true,
        alreadyFinished: true,
        user: toPublicUser(caller.user!),
      });
    }

    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason ?? "");
    if (!END_REASONS.has(reason)) return badRequest("Танихгүй дуусах шалтгаан.");

    const winnerUid =
      typeof body.winnerUid === "string" &&
      (body.winnerUid === found.room.whiteUid || body.winnerUid === found.room.blackUid)
        ? body.winnerUid
        : null;

    const [updated] = await db
      .update(chessRooms)
      .set({ status: "finished", endReason: reason, winnerUid, updatedAt: new Date() })
      .where(and(eq(chessRooms.id, roomId), eq(chessRooms.status, "active")))
      .returning();

    // Өөр хүсэлт биднээс ӨМНӨ дуусгасан (ижил мад/тэнцээг хоёр тал зэрэг
    // илрүүлсэн) — тоглоомын үр дүн (статистикийн ХОЁУЛАНГ нь хамарсан
    // өмнөх бичилт дундаа) аль хэдийн бичигдсэн, дахин тоолохгүй.
    if (!updated) {
      const [row] = await db.select().from(users).where(eq(users.uid, caller.uid)).limit(1);
      return NextResponse.json({ ok: true, alreadyFinished: true, user: toPublicUser(row) });
    }

    /*
     * ⚠ СТАТИСТИК нь ТОГЛООМООР: өрөө нь шатрын ч, даамын ч байж болно
     * (`chess_rooms.game`). Урьд нь бүх өрөө `chessWins`-д тоологддог
     * байсан тул даамын онлайн тоглолт сурагчийн ШАТРЫН ялалт болж
     * бичигдэх байв — профайл дээрх тоо худал болно.
     */
    const isDraughts = parsePlayGame(updated.game) === "draughts";
    const winsCol = isDraughts ? users.draughtsWins : users.chessWins;
    const lossesCol = isDraughts ? users.draughtsLosses : users.chessLosses;
    const drawsCol = isDraughts ? users.draughtsDraws : users.chessDraws;

    if (winnerUid) {
      const loserUid = winnerUid === updated.whiteUid ? updated.blackUid : updated.whiteUid;
      await db
        .update(users)
        .set(isDraughts ? { draughtsWins: sql`${winsCol} + 1` } : { chessWins: sql`${winsCol} + 1` })
        .where(eq(users.uid, winnerUid));
      await db
        .update(users)
        .set(
          isDraughts
            ? { draughtsLosses: sql`${lossesCol} + 1` }
            : { chessLosses: sql`${lossesCol} + 1` }
        )
        .where(eq(users.uid, loserUid));
    } else {
      const draw = isDraughts
        ? { draughtsDraws: sql`${drawsCol} + 1` }
        : { chessDraws: sql`${drawsCol} + 1` };
      await db.update(users).set(draw).where(eq(users.uid, updated.whiteUid));
      await db.update(users).set(draw).where(eq(users.uid, updated.blackUid));
    }

    /*
     * ⚠ МЭДЭГДЭЖ БУЙ ХЯЗГААРЛАЛТ: Elo нь ХОЁР ТОГЛООМД НЭГ (`users.rating`).
     * Шатарт хүчтэй хүн даамд шинэхэн байж мэднэ — тэр үед үнэлгээ хоёр
     * тоглоомын алинд ч зөв биш болно. Тусад нь болгоход шинэ багана,
     * миграци, профайлын хоёр тоо шаардагдана; онлайн даам нь дөнгөж
     * нэмэгдсэн тул тоглолтын тоо хуримтлагдсаны дараа шийдэхээр
     * зориудаар хойшлуулав.
     *
     * Elo — ХОЁУЛАНГ нь НЭГ гүйлгээнд, ИЖИЛ "өмнөх" утгаар (`lib/api/rating.ts`).
     *
     * Тэнцээ үед "winner"/"loser" гэдэг нь зүгээр л дараалал: `draw: true`
     * үед функц хоёуланд нь 0.5 оноо өгнө. Цагаан талыг эхэнд тавьсан нь
     * дурын сонголт — тэнцээд тал нь ялгаагүй.
     */
    const ratings = await applyHumanGame(
      winnerUid ?? updated.whiteUid,
      winnerUid
        ? winnerUid === updated.whiteUid
          ? updated.blackUid
          : updated.whiteUid
        : updated.blackUid,
      !winnerUid
    );

    const [row] = await db.select().from(users).where(eq(users.uid, caller.uid)).limit(1);
    return NextResponse.json({
      ok: true,
      alreadyFinished: false,
      user: toPublicUser(row),
      /** Дуудагчийн ӨӨРИЙНХ нь үнэлгээний өөрчлөлт (+12 / −8). */
      rating: ratings[caller.uid] ?? null,
    });
  } catch (error) {
    return serverError(error, "Тоглоом дуусгахад алдаа гарлаа");
  }
}
