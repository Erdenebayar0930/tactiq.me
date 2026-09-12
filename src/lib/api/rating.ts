import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DEFAULT_RATING, MIN_RATING, kFactor, expectedScore } from "@/lib/tactiq/rating";

import type { GameOutcome } from "@/lib/tactiq/rating";

/**
 * Elo үнэлгээг сангийн мөрөнд бичих сервер тал.
 *
 * ⚠ ТООЦООГ SQL ДОТОР хийнэ, JS талд уншаад-бодоод-бичихгүй. Шалтгаан нь
 * P2P тоглолт: хоёр тоглогчийн мөр НЭГ гүйлгээнд шинэчлэгдэх ёстой бөгөөд
 * "уншаад-бодоод-бичих" хэлбэр нь хоёр тоглолт зэрэг дуусахад (нэг хүн
 * олон өрөөнд) нэг үр дүнг чимээгүй алдана.
 *
 * ⚠ K коэффициент ба хүлээгдэж буй оноог JS талд БОДНО (цэвэр функцууд,
 * `lib/tactiq/rating.ts`) — тэдгээр нь тухайн МӨЧИД уншсан үнэлгээнээс
 * хамаарах ба тэр уншилт нь ижил гүйлгээнд түгжигдсэн байна.
 */

const SCORE: Record<GameOutcome, number> = { win: 1, loss: 0, draw: 0.5 };

/** Эсрэг үр дүн — нэг тоглолтын нөгөө тал. */
export function flipOutcome(outcome: GameOutcome): GameOutcome {
  if (outcome === "win") return "loss";
  if (outcome === "loss") return "win";
  return "draw";
}

export type RatingChange = {
  before: number;
  after: number;
  delta: number;
};

/**
 * НЭГ тоглогчийн үнэлгээг өрсөлдөгчийн ТОГТМОЛ үнэлгээний эсрэг шинэчилнэ
 * (ботын тоглолт).
 *
 * Мөрийг `FOR UPDATE`-ээр түгжинэ: нэг хэрэглэгч хоёр табд зэрэг тоглоод
 * хоёр үр дүн ЯГ ЗЭРЭГ ирвэл хоёулаа ижил хуучин үнэлгээг уншиж, нэг нь
 * алдагдана.
 */
export async function applyBotGame(
  uid: string,
  botRating: number,
  outcome: GameOutcome
): Promise<RatingChange> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ rating: users.rating, games: users.ratingGames })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1)
      .for("update");

    const before = row?.rating ?? DEFAULT_RATING;
    const games = row?.games ?? 0;

    const k = kFactor(games, before);
    const after = Math.max(
      MIN_RATING,
      Math.round(before + k * (SCORE[outcome] - expectedScore(before, botRating)))
    );

    await tx
      .update(users)
      .set({
        rating: after,
        ratingGames: sql`${users.ratingGames} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid));

    return { before, after, delta: after - before };
  });
}

/**
 * ХОЁР тоглогчийн үнэлгээг НЭГ гүйлгээнд шинэчилнэ (хүн-хүний тоглолт).
 *
 * ⚠ ХОЁУЛАНГ НЬ ИЖИЛ "ӨМНӨХ" УТГААР бодно. Эхлээд нэгийг нь бичээд дараа
 * нь нөгөөг нь шинэ утгаар бодвол Elo-гийн тэг нийлбэрийн шинж эвдэрч,
 * системд оноо чимээгүй үүсэх/алга болно.
 *
 * ⚠ Мөрүүдийг ЦАГААН ТОЛГОЙН ДАРААЛЛААР түгжинэ. Хоёр хүн бие бие рүүгээ
 * зэрэг тоглоод хоёр өөр гүйлгээ эсрэг дарааллаар түгжвэл deadlock үүснэ.
 */
export async function applyHumanGame(
  winnerUid: string,
  loserUid: string,
  draw: boolean
): Promise<{ [uid: string]: RatingChange }> {
  return db.transaction(async (tx) => {
    const ordered = [winnerUid, loserUid].sort();

    const rows = await tx
      .select({ uid: users.uid, rating: users.rating, games: users.ratingGames })
      .from(users)
      .where(sql`${users.uid} IN (${ordered[0]}, ${ordered[1]})`)
      .orderBy(users.uid)
      .for("update");

    const byUid = new Map(rows.map((row) => [row.uid, row]));

    const winner = byUid.get(winnerUid);
    const loser = byUid.get(loserUid);
    if (!winner || !loser) return {};

    const compute = (
      me: { rating: number; games: number },
      opponentRating: number,
      outcome: GameOutcome
    ): RatingChange => {
      const k = kFactor(me.games, me.rating);
      const after = Math.max(
        MIN_RATING,
        Math.round(me.rating + k * (SCORE[outcome] - expectedScore(me.rating, opponentRating)))
      );
      return { before: me.rating, after, delta: after - me.rating };
    };

    const outcome: GameOutcome = draw ? "draw" : "win";
    const winnerChange = compute(winner, loser.rating, outcome);
    const loserChange = compute(loser, winner.rating, flipOutcome(outcome));

    for (const [uid, change] of [
      [winnerUid, winnerChange],
      [loserUid, loserChange],
    ] as const) {
      await tx
        .update(users)
        .set({
          rating: change.after,
          ratingGames: sql`${users.ratingGames} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, uid));
    }

    return { [winnerUid]: winnerChange, [loserUid]: loserChange };
  });
}
