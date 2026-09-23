import { and, eq, sql } from "drizzle-orm";
import { parsePlayGame } from "@/lib/tactiq/playGame";
import { NextResponse } from "next/server";

import { badRequest, notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { getRoomForCaller } from "@/lib/api/chess";
import { toPublicUser } from "@/lib/api/publicUser";
import { db } from "@/lib/db";
import { chessRooms, users } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * ⚠ "timeout" нэмэгдсэн: цаг нь одоо БОДИТООР ажилладаг
 * (`lib/tactiq/gameClock.ts`) тул цагаар дуусах нь хүчинтэй үр дүн.
 * Энд байхгүй бол route нь «танихгүй шалтгаан» гэж 400 буцааж, цаг
 * дууссан тоглолт САНД дуусахгүй үлдэнэ.
 */
const END_REASONS = new Set(["checkmate", "resignation", "draw", "disconnect", "timeout"]);

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
 * ⚠ ЧАНСАА ЭНД ХӨДӨЛӨХГҮЙ: ердийн тоглолт нь чансаагүй. Чансаа ЗӨВХӨН
 * «чансаа тогтоох» тэмцээнээр өрнөнө (`api/tournament/game`) — хос нь
 * чөлөөтэй сонгогддог тоглолт чансааг дурын тоо болгох цоорхой тул.
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
     * ⚠ ЧАНСАА ЭНД ХӨДӨЛӨХГҮЙ. Ердийн онлайн тоглолт (найзаа урих,
     * тоглогч хайх) нь ЧАНСААГҮЙ: чансаа ЗӨВХӨН «чансаа тогтоох»
     * тэмцээнээр өрнөнө (`api/tournament/game`).
     *
     * ЯАГААД: хос нь ЧӨЛӨӨТЭЙ сонгогддог тул хоёр хүн тохиролцоод
     * дахин дахин тоглох нь чансааг дурын тоо болгоно (нэг нь зориуд
     * бууж өгөх). Тэмцээнд хосыг СИСТЕМ сугалдаг, шүүлт байдаг тул тэр
     * цоорхой хаалттай (`docs/rating-system.md` §3, §13).
     *
     * ⚠ СТАТИСТИК нь дээр аль хэдийн бичигдсэн (ялалт/хожигдол) —
     * тоглолтын түүх нь чансаанаас ТУСДАА. Хүүхэд найзтайгаа тоглосон
     * тоглолт профайл дээр харагдах ёстой, гэхдээ чансааг хөндөхгүй.
     */
    const [row] = await db.select().from(users).where(eq(users.uid, caller.uid)).limit(1);
    return NextResponse.json({
      ok: true,
      alreadyFinished: false,
      user: toPublicUser(row),
      /** ⚠ Ердийн тоглолт ЧАНСААГҮЙ — клиент «чансаа» гэж харуулахгүй. */
      rating: null,
      rated: false,
    });
  } catch (error) {
    return serverError(error, "Тоглоом дуусгахад алдаа гарлаа");
  }
}
