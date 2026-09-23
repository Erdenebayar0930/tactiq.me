import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { cacheGetOrSet } from "@/lib/api/cache";
import { db } from "@/lib/db";
import { playerRatings, users } from "@/lib/db/schema";
import { PROVISIONAL_GAMES } from "@/lib/tactiq/rating";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ЧАНСААНЫ ЖАГСААЛТ (rating leaderboard).
 *
 * ⚠ ШАТАР, ДААМ ТУСДАА: `player_ratings` хүснэгт нь тоглоом тус бүрт
 * НЭГ МӨР хадгална. Хоёуланг нэг тоонд нийлүүлэх нь хоёр өөр эрдмийг
 * хольж, аль нь ч зөв биш дүр зураг гаргана (`docs/rating-system.md`
 * §0.2). Тиймээс жагсаалт нь `?game=` параметртэй.
 *
 * ⚠ PROVISIONAL тоглогч ЖАГСААЛТАД ОРОХГҮЙ (10 тоглолтоос доош):
 * 2 тоглолттой хүн санамсаргүй 1900 болж тэргүүнд гарах нь бүх
 * жагсаалтын итгэлийг унагана (§1, §8).
 *
 * ⚠ ХУВААЛЦСАН КЭШ: жагсаалт нь бүх хэрэглэгчид ИЖИЛ (хувийн өгөгдөл
 * агуулаагүй) тул 60 секунд кэшлэнэ. Өөрийн мөрийг кэшлэхгүй.
 */

/** Жагсаалтын урт — нэг дэлгэцэнд гүйлгээд хүрэх хэмжээ. */
const LIMIT = 50;

const GAMES = ["chess", "checkers"] as const;
type Game = (typeof GAMES)[number];

const parseGame = (value: string | null): Game =>
  GAMES.includes(value as Game) ? (value as Game) : "chess";

export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const game = parseGame(request.nextUrl.searchParams.get("game"));

  try {
    const top = await cacheGetOrSet(`ratings:leaderboard:${game}`, 60_000, async () =>
      db
        .select({
          uid: playerRatings.userId,
          displayName: users.displayName,
          photoUrl: users.photoUrl,
          rating: playerRatings.rating,
          games: playerRatings.gamesPlayed,
          wins: playerRatings.wins,
          draws: playerRatings.draws,
          losses: playerRatings.losses,
        })
        .from(playerRatings)
        /*
         * ⚠ INNER JOIN нь эзэнгүй мөрийг өөрөө хаяна: хэрэглэгч
         * устгагдсан ч чансааны мөр үлдэж болно (түүх нь тэмцээний
         * үр дүнгийн хэсэг).
         */
        .innerJoin(users, eq(users.uid, playerRatings.userId))
        .where(
          and(
            eq(playerRatings.gameType, game),
            eq(playerRatings.ratingType, "all"),
            gte(playerRatings.gamesPlayed, PROVISIONAL_GAMES),
            // ⚠ Устгагдсан/хаагдсан хаяг жагсаалтад гарах ёсгүй.
            eq(users.status, "active")
          )
        )
        .orderBy(desc(playerRatings.rating), desc(playerRatings.gamesPlayed))
        .limit(LIMIT)
    );

    const [me] = await db
      .select({
        rating: playerRatings.rating,
        games: playerRatings.gamesPlayed,
        peak: playerRatings.peakRating,
        wins: playerRatings.wins,
        draws: playerRatings.draws,
        losses: playerRatings.losses,
      })
      .from(playerRatings)
      .where(
        and(
          eq(playerRatings.userId, result.caller.uid),
          eq(playerRatings.gameType, game),
          eq(playerRatings.ratingType, "all")
        )
      )
      .limit(1);

    const provisional = (me?.games ?? 0) < PROVISIONAL_GAMES;

    /*
     * ⚠ ӨӨРИЙН БАЙРЫГ ТУСДАА асуулгаар: хэрэглэгч 50-д багтахгүй байж
     * мэднэ. «Та 137-д» гэж харуулахгүй бол жагсаалт нь зөвхөн
     * тэргүүнийхэнд л утгатай болно.
     */
    const [rank] = provisional
      ? [{ n: null as number | null }]
      : await db
          .select({ n: sql<number>`count(*)::int + 1` })
          .from(playerRatings)
          .innerJoin(users, eq(users.uid, playerRatings.userId))
          .where(
            and(
              eq(playerRatings.gameType, game),
              eq(playerRatings.ratingType, "all"),
              gte(playerRatings.gamesPlayed, PROVISIONAL_GAMES),
              eq(users.status, "active"),
              sql`${playerRatings.rating} > ${me?.rating ?? 0}`
            )
          );

    return NextResponse.json({
      game,
      top,
      me: {
        rating: me?.rating ?? null,
        games: me?.games ?? 0,
        peak: me?.peak ?? null,
        wins: me?.wins ?? 0,
        draws: me?.draws ?? 0,
        losses: me?.losses ?? 0,
        provisional,
        rank: rank?.n ?? null,
      },
    });
  } catch (error) {
    return serverError(error, "Чансааны жагсаалт татахад алдаа гарлаа");
  }
}
