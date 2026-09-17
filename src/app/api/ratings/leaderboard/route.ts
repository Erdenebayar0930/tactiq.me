import { NextResponse } from "next/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { cacheGetOrSet } from "@/lib/api/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { PROVISIONAL_GAMES } from "@/lib/tactiq/rating";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ЧАНСААНЫ ЖАГСААЛТ (rating leaderboard).
 *
 * ⚠ PROVISIONAL тоглогч ЖАГСААЛТАД ОРОХГҮЙ (`ratingGames < 10`):
 * 2 тоглолттой хүн санамсаргүй 1900 болж тэргүүнд гарах нь бүх
 * жагсаалтын итгэлийг унагана (`docs/rating-system.md` §1, §8).
 *
 * ⚠ ОДООГООР ШАТАР, ДААМ ХАМТДАА: `users.rating` нь нэг багана бөгөөд
 * хоёр тоглоомын тоглолтын хольцоос бүрддэг. Тусгаарлалт нь
 * `player_ratings` хүснэгт шаардана (`docs/rating-system.md` §0.2,
 * §12). Тэр болтол UI нь «хамтдаа» гэдгийг ХЭЛЭХ ёстой — тусдаа гэж
 * харуулбал хэрэглэгч буруу дүгнэлт хийнэ.
 *
 * ⚠ ХУВААЛЦСАН КЭШ: жагсаалт нь бүх хэрэглэгчид ИЖИЛ (хувийн өгөгдөл
 * агуулаагүй) тул 60 секунд кэшлэнэ. Чансаа нь тэр хугацаанд
 * мэдэгдэхүйц хөдөлдөггүй, харин /tournament хуудас нээх бүрд 200
 * мөрийн эрэмбэлэлт хийх нь дэмий.
 */

/** Жагсаалтын урт — нэг дэлгэцэнд гүйлгээд хүрэх хэмжээ. */
const LIMIT = 50;

export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const top = await cacheGetOrSet("ratings:leaderboard", 60_000, async () =>
      db
        .select({
          uid: users.uid,
          displayName: users.displayName,
          photoUrl: users.photoUrl,
          rating: users.rating,
          ratingGames: users.ratingGames,
          chessWins: users.chessWins,
          chessLosses: users.chessLosses,
          chessDraws: users.chessDraws,
          draughtsWins: users.draughtsWins,
          draughtsLosses: users.draughtsLosses,
          draughtsDraws: users.draughtsDraws,
        })
        .from(users)
        .where(
          and(
            gte(users.ratingGames, PROVISIONAL_GAMES),
            // ⚠ Устгагдсан/хаагдсан хаяг жагсаалтад гарах ёсгүй.
            eq(users.status, "active")
          )
        )
        .orderBy(desc(users.rating), desc(users.ratingGames))
        .limit(LIMIT)
    );

    /*
     * ⚠ ӨӨРИЙН БАЙРЫГ ТУСДАА асуулгаар: хэрэглэгч 50-д багтахгүй байж
     * мэднэ. «Та 137-д» гэж харуулахгүй бол жагсаалт нь зөвхөн
     * тэргүүнийхэнд л утгатай болно.
     */
    const [me] = await db
      .select({ rating: users.rating, ratingGames: users.ratingGames })
      .from(users)
      .where(eq(users.uid, result.caller.uid))
      .limit(1);

    const provisional = (me?.ratingGames ?? 0) < PROVISIONAL_GAMES;

    const [rank] = provisional
      ? [{ n: null as number | null }]
      : await db
          .select({ n: sql<number>`count(*)::int + 1` })
          .from(users)
          .where(
            and(
              gte(users.ratingGames, PROVISIONAL_GAMES),
              eq(users.status, "active"),
              sql`${users.rating} > ${me?.rating ?? 0}`
            )
          );

    return NextResponse.json({
      top,
      me: {
        rating: me?.rating ?? null,
        games: me?.ratingGames ?? 0,
        provisional,
        rank: rank?.n ?? null,
      },
      /*
       * ⚠ Клиент талд «хамтдаа» гэдгийг хэлэх туг: хожим
       * `player_ratings` нэмэгдэхэд `false` болж, UI нь тайлбар мөрийг
       * автоматаар нуух болно.
       */
      combined: true,
    });
  } catch (error) {
    return serverError(error, "Чансааны жагсаалт татахад алдаа гарлаа");
  }
}
