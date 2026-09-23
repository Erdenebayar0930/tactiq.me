import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { playerRatings, ratingHistory } from "@/lib/db/schema";
import {
  START_RATING,
  UNRATED_GAP,
  computeRatingChange,
  rematchWeight,
} from "@/lib/tactiq/rating";

/**
 * ЧАНСААНЫ БИЧИЛТ — ЗӨВХӨН ЧАНСАА ТОГТООХ ТЭМЦЭЭНЭЭР.
 *
 * ⚠ Ердийн онлайн тоглолт, ботын тоглолт нь чансааг ХӨНДӨХГҮЙ. Хос нь
 * чөлөөтэй сонгогддог тоглолтод хоёр хүн тохиролцоод оноо шилжүүлэх
 * боломжтой; ботын хүч нь тогтмол тул түүнийг дахин дахин ялах нь
 * чансааг хөөрөгдөнө. Тэмцээнд хосыг СИСТЕМ сугалж, шүүлт байдаг —
 * чансаа тэндээс л гарна (`docs/rating-system.md` §3, §13).
 *
 * ⚠ ХОЖИГДОЛ нь ОНОО ХАСНА. Elo нь тэг нийлбэртэй: ялсан талын авсан
 * оноо нь хожигдсон талаас гардаг. Зөвхөн ялсан тал авдаг систем нь
 * чансааг «тоглосон тоо» болгож, ХҮЧИЙГ хэмжихээ болино. Тэмцээн,
 * ердийн тоглолтод ИЖИЛ дүрэм — тэмцээнийг хөнгөвчилвөл тэр нь чансаа
 * цуглуулах хямд зам болно (`docs/rating-system.md` §3).
 *
 * ⚠ ИДЕМПОТЕНТ: `(game_id, user_id)` дээр UNIQUE индекс бий. Тоглолт
 * хоёр удаа мэдэгдэж болно — хоёр тал зэрэг илгээх, сүлжээ тасарч дахин
 * оролдох. Шалгахгүй бол чансаа ХОЁР ДАХИН хөдөлнө.
 *
 * ⚠ ХОЁР МӨРИЙГ ИЖИЛ ДАРААЛЛААР түгжинэ (`uid`-аар эрэмбэлж): эс бөгөөс
 * хоёр тоглолт зэрэг дуусахад deadlock үүснэ.
 */

export type GameType = "chess" | "checkers";

export type RateSide = {
  uid: string;
  /** 1 = ялсан, 0.5 = тэнцсэн, 0 = хожигдсон */
  score: 0 | 0.5 | 1;
};

export type RateInput = {
  /** Өрөөний id, эсвэл тэмцээний тоглолтын id — ИДЕМПОТЕНТ түлхүүр. */
  gameId: string;
  gameType: GameType;
  white: RateSide;
  black: RateSide;
  tournamentId?: string | null;
  /** Тухайн тэмцээн дотор ижил хос хэд дэх удаа тоглож байна (0-ээс). */
  rematchIndex?: number;
};

export type RateOutcome =
  | { status: "rated"; changes: Record<string, { old: number; next: number; change: number }> }
  | { status: "already-rated" | "frozen" | "unrated-gap" };

/** Мөр байхгүй бол 1500-аар үүсгээд буцаана. */
async function ensureRow(uid: string, gameType: GameType) {
  await db
    .insert(playerRatings)
    .values({ userId: uid, gameType, ratingType: "all", rating: START_RATING })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(playerRatings)
    .where(
      and(
        eq(playerRatings.userId, uid),
        eq(playerRatings.gameType, gameType),
        eq(playerRatings.ratingType, "all")
      )
    )
    .limit(1);

  return row!;
}

export async function rateGame(input: RateInput): Promise<RateOutcome> {
  await ensureRow(input.white.uid, input.gameType);
  await ensureRow(input.black.uid, input.gameType);

  return db.transaction(async (tx) => {
    // ⚠ ИДЕМПОТЕНТ шалгалт — гүйлгээний ДОТОР, бичихээс ӨМНӨ.
    const [seen] = await tx
      .select({ id: ratingHistory.id })
      .from(ratingHistory)
      .where(eq(ratingHistory.gameId, input.gameId))
      .limit(1);

    if (seen) return { status: "already-rated" } as const;

    /*
     * ⚠ ТҮГЖЭЭ — `uid`-аар ЭРЭМБЭЛЖ: хоёр тоглолт зэрэг дуусахад
     * (A vs B ба B vs A) ижил дараалалгүй бол deadlock үүснэ.
     */
    const order = [input.white, input.black].sort((a, b) => a.uid.localeCompare(b.uid));

    const rows = [];
    for (const side of order) {
      const [row] = await tx
        .select()
        .from(playerRatings)
        .where(
          and(
            eq(playerRatings.userId, side.uid),
            eq(playerRatings.gameType, input.gameType),
            eq(playerRatings.ratingType, "all")
          )
        )
        .for("update");
      rows.push({ side, row: row! });
    }

    if (rows.some((entry) => entry.row.frozen)) return { status: "frozen" } as const;

    const [a, b] = rows;
    if (Math.abs(a.row.rating - b.row.rating) > UNRATED_GAP) {
      return { status: "unrated-gap" } as const;
    }

    const weight = rematchWeight(input.rematchIndex ?? 0);
    const changes: Record<string, { old: number; next: number; change: number }> = {};

    for (const [self, opponent] of [
      [a, b],
      [b, a],
    ]) {
      const delta = computeRatingChange(
        { rating: self.row.rating, gamesPlayed: self.row.gamesPlayed },
        { rating: opponent.row.rating, gamesPlayed: opponent.row.gamesPlayed },
        self.side.score,
        weight
      );

      await tx
        .update(playerRatings)
        .set({
          rating: delta.next,
          peakRating: Math.max(self.row.peakRating, delta.next),
          gamesPlayed: self.row.gamesPlayed + 1,
          wins: self.row.wins + (self.side.score === 1 ? 1 : 0),
          draws: self.row.draws + (self.side.score === 0.5 ? 1 : 0),
          losses: self.row.losses + (self.side.score === 0 ? 1 : 0),
          lastGameAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(playerRatings.id, self.row.id));

      await tx.insert(ratingHistory).values({
        userId: self.side.uid,
        gameType: input.gameType,
        ratingType: "all",
        gameId: input.gameId,
        tournamentId: input.tournamentId ?? null,
        opponentUid: opponent.side.uid,
        opponentRating: opponent.row.rating,
        result: String(self.side.score),
        expectedScore: delta.expected.toFixed(5),
        kFactor: Math.round(delta.k),
        weight: weight.toFixed(2),
        oldRating: self.row.rating,
        ratingChange: delta.change,
        newRating: delta.next,
        reason: input.tournamentId ? "tournament" : "game",
      });

      /*
       * ⚠ `users.rating` -д ХҮРЭХГҮЙ. Тэр багана нь ӨӨР зүйл: ботын
       * эсрэг дадлагын «үнэлгээ» (профайл, найзын жагсаалт дээр
       * «үнэлгээ» гэж бичигдэнэ). ЧАНСАА нь зөвхөн чансаа тогтоох
       * тэмцээнээр өрнөдөг тул хоёрыг нэг тоо болговол «ботыг 20 удаа
       * ялаад чансаа өссөн» гэсэн худал үүснэ.
       */
      changes[self.side.uid] = {
        old: self.row.rating,
        next: delta.next,
        change: delta.change,
      };
    }

    return { status: "rated", changes } as const;
  });
}

/** Тоглогчийн бүх чансаа — профайл, `/api/players/:uid/rating`. */
export async function listRatings(uid: string) {
  return db.select().from(playerRatings).where(eq(playerRatings.userId, uid));
}
