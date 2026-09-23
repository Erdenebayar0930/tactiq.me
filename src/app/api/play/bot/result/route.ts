import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { badRequest, forbidden, requireActiveUser, serverError } from "@/lib/api/auth";
import { canPracticeWithBot } from "@/lib/tactiq/botAccess";
import { isPremiumUser } from "@/lib/tactiq/xp";
import { toPublicUser } from "@/lib/api/publicUser";
import { applyBotGame } from "@/lib/api/rating";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { BOT_RATINGS } from "@/lib/tactiq/rating";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ботын эсрэг тоглолтын үр дүнг тэмдэглэнэ.
 *
 * ⚠ P2P өрөөнөөс (`/api/play/rooms/[roomId]/end`) ЯЛГААТАЙ нь энд
 * "давхардал" шалгах логик ХЭРЭГГҮЙ — ботын тоглолт бүрд серверийн мөр
 * (`chessRooms`) огт байхгүй тул хоёр тал зэрэг дуудах эрсдэл угаасаа
 * үгүй, зөвхөн НЭГ (хүн) тоглогч байдаг.
 *
 * ⚠ Elo ҮНЭЛГЭЭ мөн энд шинэчлэгдэнэ (`lib/api/rating.ts`). Ботын хүчийг
 * `difficulty`-ээс уншина — клиент дамжуулаагүй бол `intermediate` гэж
 * үзнэ. Клиент худал өндөр түвшин илгээж чадах ч энэ нь түүнд АШИГГҮЙ:
 * хүчтэй ботоос ХОЖИГДОХОД илүү их оноо алдана. Ашиг олох цорын ганц зам
 * нь ХОЖИХ тул буруу мэдээлэл өөрийг нь шийтгэнэ — хатуу баталгаа
 * шаардахгүйн шалтгаан нь энэ.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  /*
   * ⚠ БОТЫН ДАДЛАГА — PREMIUM (`lib/tactiq/botAccess.ts`). UI түгжээтэй ч
   * энэ route-ыг шууд дуудаж чансаа, XP авахаас сэргийлнэ.
   */
  if (
    !canPracticeWithBot({
      isPremium: isPremiumUser(caller.user?.premiumUntil),
      role: caller.user?.role,
    })
  ) {
    return forbidden("Ботоор дадлагажих нь Premium эрхтэй хэрэглэгчид нээлттэй.", "premium-required");
  }

  try {
    const body = await request.json().catch(() => ({}));
    const outcome = String(body.result ?? "");
    if (outcome !== "win" && outcome !== "loss" && outcome !== "draw") {
      return badRequest("Танихгүй тоглолтын үр дүн.");
    }

    const difficulty = String(body.difficulty ?? "");
    const botRating =
      difficulty in BOT_RATINGS
        ? BOT_RATINGS[difficulty as keyof typeof BOT_RATINGS]
        : BOT_RATINGS.intermediate;

    if (outcome === "win") {
      await db
        .update(users)
        .set({ chessWins: sql`${users.chessWins} + 1` })
        .where(eq(users.uid, caller.uid));
    } else if (outcome === "loss") {
      await db
        .update(users)
        .set({ chessLosses: sql`${users.chessLosses} + 1` })
        .where(eq(users.uid, caller.uid));
    } else {
      await db
        .update(users)
        .set({ chessDraws: sql`${users.chessDraws} + 1` })
        .where(eq(users.uid, caller.uid));
    }

    const rating = await applyBotGame(caller.uid, botRating, outcome);

    const [row] = await db.select().from(users).where(eq(users.uid, caller.uid)).limit(1);
    return NextResponse.json({ user: toPublicUser(row), rating });
  } catch (error) {
    return serverError(error, "Тоглолтын үр дүнг хадгалахад алдаа гарлаа");
  }
}
