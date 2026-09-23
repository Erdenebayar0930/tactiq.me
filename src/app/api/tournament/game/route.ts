import { createHash, timingSafeEqual } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { badRequest, serverError } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rateLimit";
import { rateGame } from "@/lib/api/ratings";
import { tournamentSecretConfigured } from "@/lib/api/tournamentTicket";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import type { GameType } from "@/lib/api/ratings";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ТЭМЦЭЭНИЙ ТОГЛОЛТЫН ҮР ДҮН → ЧАНСАА (server-to-server).
 *
 * Тэмцээний сервер (`chess.daamal.org`) тоглолт дуусахад өөрийн нууц
 * түлхүүрээ `x-tournament-secret` толгойд хийж дуудна.
 *
 * ⚠ ЧАНСАА ЗӨВХӨН ЭНД ӨРНӨНӨ: ердийн онлайн тоглолт ба ботын тоглолт
 * чансааг хөндөхгүй. Мөн тэмцээн нь «чансаа тогтоох» (`rated`) байх
 * ёстой — хөгжөөнт тэмцээн чансаагүй.
 *
 * ⚠ ХОЖИГДОЛ ОНОО ХАСНА. Elo нь тэг нийлбэртэй: ялагчийн авсан оноо нь
 * хожигдогчоос гарна. «Зөвхөн нэмдэг» систем нь чансааг тоглосон тоо
 * болгож, ХҮЧИЙГ хэмжихээ болино (`docs/rating-system.md` §3).
 *
 * ⚠ ИДЕМПОТЕНТ: `gameId` нь түлхүүр. Тэмцээний сервер сүлжээ тасрахад
 * дахин илгээх нь ХЭВИЙН — `rating_history (game_id, user_id)` UNIQUE
 * индекс ба `rateGame`-ийн гүйлгээн дотуур шалгалт нь чансааг хоёр дахин
 * хөдөлгөхгүй. Дахин илгээсэн хүсэлт нь АЛДАА БИШ, `already-rated` гэсэн
 * хариу авна — эс бөгөөс тэмцээний сервер дахин дахин оролдоно.
 *
 * ⚠ ТОГЛОГЧИЙН uid нь Firebase uid: тэмцээний сервер `/exchange`-ээр
 * ИЖИЛ uid дээр нэвтэрдэг тул хөрвүүлэлт шаардлагагүй.
 */
function secretMatches(given: string | null): boolean {
  const expected = process.env.TOURNAMENT_SHARED_SECRET?.trim() || "";
  if (!expected || !given) return false;

  /*
   * ⚠ Hash-лаад `timingSafeEqual`: түүхий `===` нь эхний зөрөх тэмдэгт
   * дээр зогсдог тул хугацааны хэмжилтээр түлхүүрийг таах цонх үлдээнэ.
   */
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(given).digest();
  return timingSafeEqual(a, b);
}

const ID_RE = /^[A-Za-z0-9_:.-]{1,64}$/;
const GAMES = new Set<GameType>(["chess", "checkers"]);

/** "white" | "black" | "draw" → хоёр талын оноо. */
const SCORES: Record<string, [0 | 0.5 | 1, 0 | 0.5 | 1]> = {
  white: [1, 0],
  black: [0, 1],
  draw: [0.5, 0.5],
};

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, {
    name: "tournament-game",
    limit: 300,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!tournamentSecretConfigured()) {
    return NextResponse.json(
      { error: "Тэмцээний холболт тохируулагдаагүй байна.", code: "tournament-unconfigured" },
      { status: 503 }
    );
  }

  if (!secretMatches(request.headers.get("x-tournament-secret"))) {
    return NextResponse.json({ error: "Эрх хүрэлцэхгүй.", code: "forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    const gameId = typeof body.gameId === "string" ? body.gameId.trim() : "";
    if (!ID_RE.test(gameId)) return badRequest("Тоглолтын дугаар буруу.");

    const gameType = body.game === "checkers" || body.game === "draughts" ? "checkers" : "chess";
    if (!GAMES.has(gameType)) return badRequest("Тоглоом танихгүй.");

    const whiteUid = typeof body.whiteUid === "string" ? body.whiteUid.trim() : "";
    const blackUid = typeof body.blackUid === "string" ? body.blackUid.trim() : "";
    if (!whiteUid || !blackUid) return badRequest("Тоглогчийн дугаар алга.");
    /*
     * ⚠ Өөрийнхөө эсрэг тоглолт БИЧИГДЭХГҮЙ: ижил хүний хоёр мөрийг нэг
     * гүйлгээнд түгжих нь мухардал үүсгэх ба чансаа зохиомлоор өсөх
     * цоорхой болно.
     */
    if (whiteUid === blackUid) return badRequest("Тоглогч өөртэйгөө тоглож болохгүй.");

    const scores = SCORES[String(body.result ?? "")];
    if (!scores) return badRequest("Үр дүн буруу (white | black | draw).");

    /*
     * ⚠ ТЭМЦЭЭНГҮЙ ТОГЛОЛТ ЧАНСААГ ХӨНДӨХГҮЙ: `tournamentId` нь
     * ЗААВАЛ. Ердийн тоглолт, дадлага, бот — бүгд чансаагүй.
     */
    const tournamentId =
      typeof body.tournamentId === "string" && ID_RE.test(body.tournamentId.trim())
        ? body.tournamentId.trim()
        : null;

    if (!tournamentId) return badRequest("Тэмцээний дугаар алга — чансаа зөвхөн тэмцээнээр.");

    /*
     * ⚠ ЗӨВХӨН «ЧАНСАА ТОГТООХ» ТЭМЦЭЭН: зохион байгуулагч тэмцээн
     * үүсгэхдээ `rated` тугийг ДАРЖ л чансаа өрнөнө
     * (`tournament_series.rated`). Хөгжөөнт, шинэхэн хүүхдийн, баярын
     * тэмцээн нь чансаагүй байх ЁСТОЙ — эс бөгөөс шинэ сурагч
     * хөгжөөнт тэмцээнд оролцоод чансаагаа унагаж, дахин оролцохоос
     * эмээнэ.
     *
     * ⚠ Тугийг ТЭМЦЭЭНИЙ СЕРВЕР илгээнэ (нууц түлхүүрээр батлагдсан
     * дуудагч). `rated` байхгүй бол ЧАНСААГҮЙ гэж үзнэ — анхдагч нь
     * ямагт хамгийн хөнөөлгүй тал байх ёстой.
     */
    if (body.rated !== true) {
      return NextResponse.json(
        { ok: true, status: "unrated", reason: "not-a-rating-tournament" },
        { status: 200 }
      );
    }

    /*
     * ⚠ ДАХИН ТОГЛОЛТЫН ИНДЕКС: арена хэлбэрт ижил хос нэг тэмцээнд
     * олон удаа таарч болно. Индекс өсөхөд жин буурна — эс бөгөөс хоёр
     * хүн бие бие рүүгээ дахин дахин тоглож чансааг хөөрөгдөнө (§5).
     */
    const rematchIndex = Number.isInteger(body.rematchIndex)
      ? Math.max(0, Math.min(50, body.rematchIndex as number))
      : 0;

    /*
     * ⚠ ХЭРЭГЛЭГЧ БАЙГААГ ШАЛГАНА: `player_ratings.user_id` дээр
     * гадаад түлхүүр БАЙХГҮЙ (тоглолтын түүх нь хаяг устсаны дараа ч
     * үлдэх ёстой). Тиймээс шалгахгүй бол бичсэн uid-ын алдаа нь
     * эзэнгүй чансааны мөр болж жагсаалтад чимээгүй хуримтлагдана.
     */
    const known = await db
      .select({ uid: users.uid })
      .from(users)
      .where(and(inArray(users.uid, [whiteUid, blackUid]), eq(users.status, "active")));

    if (known.length < 2) return badRequest("Тоглогч олдсонгүй.");

    const rated = await rateGame({
      gameId,
      gameType,
      white: { uid: whiteUid, score: scores[0] },
      black: { uid: blackUid, score: scores[1] },
      tournamentId,
      rematchIndex,
    });

    return NextResponse.json({ ok: true, ...rated });
  } catch (error) {
    return serverError(error, "Тоглолтын үр дүн бичихэд алдаа гарлаа");
  }
}
