import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { toPublicUser } from "@/lib/api/publicUser";
import { grantReferralReward } from "@/lib/api/referralReward";
import { addCourseSeconds, sanitizeSeconds } from "@/lib/api/courseTime";
import { addQuestXp } from "@/lib/api/friendQuest";
import { addWeeklyXp, settlePastWeeks } from "@/lib/api/league";
import { db } from "@/lib/db";
import { getLessonForCompletion } from "@/lib/db/courses";
import { lessonProgress, users } from "@/lib/db/schema";
import { today, nextStreak } from "@/lib/tactiq/day";
/** Хичээл дуусгахад олгох зоос — `/courses` картын «зоос» ч эндээс тооцогддог. */
import { LESSON_GEM_REWARD } from "@/lib/tactiq/rewards";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Postgres-ийн unique_violation SQLSTATE — `lesson_progress_uid_lesson_uq`-ийн зөрчил. */
function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if ((current as { code?: string }).code === "23505") return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}

/**
 * Хичээл дуусгав. Оноо/эрдэнэ/дараалал ЭНД л шинэчлэгдэнэ — клиентийн
 * дамжуулсан оноог ХЭЗЭЭ Ч итгэхгүй, `getLessonForCompletion()`-ээс серверийн
 * жинхэнэ утгыг уншина.
 *
 * ⚠ Давхардлыг `lesson_progress_uid_lesson_uq`-ийн UNIQUE ХЯЗГААРЛАЛТААР
 * шийднэ (сонголт биш, өмнөх SELECT-ээр шалгах нь хоёр хүсэлт ЗЭРЭГ ирэхэд
 * уралдаанд өртдөг) — insert зөрчигдвөл "аль хэдийн дуусгасан" гэж ойлгоно.
 *
 * ⚠ ЭНЭ ROUTE НЬ ХИЧЭЭЛИЙН "ТӨВ ЗАНГИЛАА": хичээл дуусгах нь бараг бүх
 * дэд системийн ЦОРЫН ГАНЦ дохио тул тэдгээр бүгд эндээс тэжээгддэг —
 * долоо хоногийн лиг (`addWeeklyXp`), хосын даалгавар (`addQuestXp`),
 * курст зарцуулсан цаг (`addCourseSeconds`), найзын урамшуулал
 * (`grantReferralReward`). Шинэ дэд систем нэмэхэд ЭНД залгана.
 *
 * ⚠ Эдгээр БҮГД оноо бичигдсэний ДАРАА, тус бүрдээ try/catch-тайгаар
 * дуудагдана: аль нэг нь унасан ч хүүхдийн оноо, дараалал алдагдах ёсгүй.
 *
 * ⚠ НАЙЗ УРИХ УРАМШУУЛАЛ ЯГ ЭНД НЭХЭМЖЛЭГДЭНЭ (`grantReferralReward`) —
 * "жинхэнэ хичээл дуусгасан" гэдэг нь тэр урамшууллын хоёр нөхцөлийн нэг
 * тул мэдэх цорын ганц газар нь энэ. Дуудлага нь ХИЧЭЭЛ БҮРД явна, зөвхөн
 * эхнийх дээр биш: имэйлээ хожим баталгаажуулсан хүн ч урамшуулалдаа
 * хүрэх ёстой (`lib/api/referralReward.ts`).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { lessonId } = await params;
  const found = await getLessonForCompletion(lessonId);
  if (!found) return notFound("Хичээл олдсонгүй.");

  const { caller } = result;
  const user = caller.user!;

  // Клиентийн хэмжсэн хугацаа — ИТГЭЛТЭЙ БИШ тул серверт хязгаарлагдана
  // (`lib/api/courseTime.ts`). Оноонд ХЭЗЭЭ Ч нөлөөлөхгүй, зөвхөн статистик.
  const body = (await request.json().catch(() => ({}))) as { seconds?: unknown };
  const seconds = sanitizeSeconds(body.seconds);

  try {
    await db.insert(lessonProgress).values({
      uid: caller.uid,
      courseSlug: found.courseSlug,
      lessonId,
      xpEarned: found.xpReward,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      /*
       * ДАВТАН үзсэн — оноо олгохгүй ч ЦАГ нь бодит. Тиймээс хугацааг ЭНД
       * ч бүртгэнэ: "курст хэдэн цаг зарцуулав" гэдэг нь давталтыг
       * оруулахгүй бол утгагүй тоо болно.
       */
      await addCourseSeconds(caller.uid, found.courseSlug, seconds).catch((cause) => {
        console.error("Курсын хугацаа бичихэд алдаа гарлаа:", cause);
      });

      const [row] = await db.select().from(users).where(eq(users.uid, caller.uid)).limit(1);
      return NextResponse.json({
        user: toPublicUser(row),
        xpEarned: 0,
        alreadyCompleted: true,
        referralBonusDays: 0,
        questCompleted: false,
      });
    }
    return serverError(error, "Хичээл дуусгахад алдаа гарлаа");
  }

  try {
    const day = today();
    const streakResult = nextStreak(
      user.lastActiveDay,
      user.streakDays,
      day,
      user.streakFreezes
    );

    await db
      .update(users)
      .set({
        xp: user.xp + found.xpReward,
        gems: user.gems + LESSON_GEM_REWARD,
        streakDays: streakResult.streak,
        longestStreak: Math.max(user.longestStreak, streakResult.streak),
        streakFreezes: Math.max(0, user.streakFreezes - streakResult.freezesUsed),
        lastActiveDay: day,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, caller.uid));

    /*
     * Урамшуулал ОНОО БИЧИГДСЭНИЙ ДАРАА нэхэмжлэгдэнэ.
     *
     * Дараалал санаатай: урамшуулал нь "нэмэлт", харин оноо/дараалал нь
     * хичээлийн ҮНДСЭН үр дүн. Урамшууллын гүйлгээ ямар нэг шалтгаанаар
     * унасан ч хүүхдийн оноо аль хэдийн хадгалагдсан байх ёстой.
     */
    let referralBonusDays = 0;
    try {
      const reward = await grantReferralReward(user, caller.emailVerified);
      referralBonusDays = reward.days;
    } catch (error) {
      // Урамшуулал олгогдоогүй нь хичээл дуусгахыг УНАГААХ шалтгаан биш —
      // дараагийн хичээл дээр дахин оролдоно.
      console.error("Найзын урамшуулал олгоход алдаа гарлаа:", error);
    }

    /*
     * Долоо хоногийн лиг. Дүгнэлт нь нэгдэлтийн ӨМНӨ явах ЁСТОЙ — эс бөгөөс
     * хуучин шатаар нь бүлэгт оруулж, дараа нь дүгнэлт шатыг өөрчилснөөр
     * хэрэглэгч буруу шатны бүлэгт үлдэнэ (`lib/api/league.ts`).
     */
    try {
      await settlePastWeeks(caller.uid);
      // Курсийн XP тэр курсийн СУРГУУЛИЙН лигт орно (`lib/api/league.ts`).
      // Хичээл ЭХЛҮҮЛСЭН нь тэмцээнд оруулах ЦОРЫН ГАНЦ дохио.
      await addWeeklyXp(caller.uid, found.courseSlug, found.xpReward);
    } catch (error) {
      console.error("Лигийн оноо бичихэд алдаа гарлаа:", error);
    }

    let questCompleted = false;
    try {
      questCompleted = await addQuestXp(caller.uid, found.xpReward);
    } catch (error) {
      console.error("Хосын даалгаварт оноо нэмэхэд алдаа гарлаа:", error);
    }

    try {
      await addCourseSeconds(caller.uid, found.courseSlug, seconds);
    } catch (error) {
      console.error("Курсын хугацаа бичихэд алдаа гарлаа:", error);
    }

    const [row] = await db.select().from(users).where(eq(users.uid, caller.uid)).limit(1);

    return NextResponse.json({
      user: toPublicUser(row),
      xpEarned: found.xpReward,
      alreadyCompleted: false,
      /** 0-ээс их бол клиент "найзын урамшуулал идэвхжлээ" гэж баярлуулна. */
      referralBonusDays,
      /** ЭНЭ хичээлээр хосын даалгавар дуусав уу — дүнгийн дэлгэцэнд. */
      questCompleted,
    });
  } catch (error) {
    return serverError(error, "Хичээл дуусгахад алдаа гарлаа");
  }
}
