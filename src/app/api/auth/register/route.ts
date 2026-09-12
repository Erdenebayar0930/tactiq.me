import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCallerOrResponse, serverError, unauthorized } from "@/lib/api/auth";
import { toPublicUser } from "@/lib/api/publicUser";
import { syncUserClaims } from "@/lib/api/claims";
import { normalizeInviteCode } from "@/lib/api/inviteCode";
import { rateLimit } from "@/lib/api/rateLimit";
import { db } from "@/lib/db";
import { appConfig, referrals, users } from "@/lib/db/schema";
import { asRole, isStudentRole, type UserStatus } from "@/lib/permissions";
import { isCoachId } from "@/lib/tactiq/coaches";
import { today } from "@/lib/tactiq/day";
import { TRIAL_DAYS } from "@/lib/billing";
import { trialUntil } from "@/lib/api/premium";
import { currentReferralMonth } from "@/lib/tactiq/referrals";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Firebase Auth дээр бүртгэл үүссэний дараа Postgres дэх мөрийг үүсгэнэ.
 *
 * Системийн АНХНЫ хэрэглэгч → super (систем эзэнгүй үлдэхгүйн тулд).
 * Дараагийнх → бүртгэлийн формд сонгосон эрх (student | teacher | parent).
 *
 * ⚠ ББУЧ-аас ЯЛГААТАЙ нь: сурагч `pending` төлөвт ОРОХГҮЙ, шууд `active`
 * болно. Код сурах платформ дээр админы зөвшөөрөл хүлээх нь утгагүй — хүүхэд
 * бүртгүүлээд шууд эхний хичээлээ эхлэх ёстой. Хэрэв хожим сургуулийн
 * хаалттай хувилбар хэрэгтэй бол `app_config`-д тугалж, ЭНД шийднэ.
 *
 * "Анхны админ"-ыг зөвхөн нэг удаа олгохын тулд app_config мөрийг
 * мөр түгжээтэйгээр (FOR UPDATE) уншиж, нэг гүйлгээнд шийднэ.
 *
 * `referralCode` (заавал биш) — өөр сурагчийн хувийн урилгын кодтой (`/profile`
 * дээрх "Миний код") тохирвол `referredBy`-г тэмдэглэнэ. Буруу код нь
 * бүртгэлийг зогсоохгүй, зүгээр л үл тоомсорлогдоно.
 *
 * ⚠ ЭНД ЗӨВХӨН ҮНЭГҮЙ ТУРШИЛТ (`TRIAL_DAYS`) ОЛГОГДОНО.
 *
 * Найз урих урамшуулал (`REFERRAL_BONUS_DAYS`) ЭНД ОЛГОГДОХГҮЙ — энэ route
 * зөвхөн `referredBy` болон `referrals` мөрийг ТЭМДЭГЛЭНЭ. Хоног нь хожим,
 * имэйл баталгаажиж ЭХНИЙ ХИЧЭЭЛ дуусахад олгогдоно
 * (`lib/api/referralReward.ts`, `api/learn/lessons/[lessonId]/complete`).
 *
 * ЯАГААД: бүртгэл дээр шууд олговол хуурамч имэйлээр олон данс үүсгээд
 * хоног цуглуулах ("farming") боломж нээгддэг. Бүртгэл нь ҮНЭГҮЙ бөгөөд
 * хязгааргүй давтагдах үйлдэл, харин имэйл баталгаажуулах + хичээл дуусгах
 * нь тийм биш.
 *
 * ⚠ Туршилтын хоногийг харин ЭНД шууд олгоно: тэр нь ЗӨВХӨН тухайн шинэ
 * данс өөрөө хэрэглэдэг зүйл тул хуурамч данс үүсгэж "цуглуулах" утга
 * агуулахгүй — farming-ийн эрсдэлгүй.
 */
export async function POST(request: NextRequest) {
  // Энэ бол бүртгэлгүй хүн хүрч чадах ЦОРЫН ГАНЦ бичих route. Firebase дээр
  // дурын хэрэглэгч данс үүсгэж чадвал энд `users` хүснэгтийг дүүргэх
  // боломжтой болно — жагсаалт хогоор дүүрэхээс сэргийлнэ.
  const limited = await rateLimit(request, {
    name: "register",
    limit: 5,
    windowMs: 300_000,
  });
  if (limited) return limited;

  // Сан унасныг "нэвтрээгүй" гэж андуурч болохгүй — 503 буцаана
  const result = await getCallerOrResponse(request);
  if ("error" in result) return result.error;

  const { caller } = result;
  if (!caller) return unauthorized();

  // Аль хэдийн бүртгэлтэй бол давхардуулахгүй
  if (caller.user) {
    return NextResponse.json({ user: toPublicUser(caller.user), created: false });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const displayName = String(body.displayName ?? "").trim().slice(0, 120);
    const firstName = String(body.firstName ?? "").trim().slice(0, 120);
    const lastName = String(body.lastName ?? "").trim().slice(0, 120);
    const email = (caller.email || String(body.email ?? "")).trim().toLowerCase();

    // Бүртгүүлэгч зөвхөн ЭНЭ гурваас сонгоно — admin/super-ыг өөрөө сонгож
    // авах боломжгүй, тэдгээрийг зөвхөн серверийн доорх "анхны хэрэглэгч"
    // дүрэм эсвэл админ панелаас гараар л олгоно.
    const requestedRole = ["teacher", "parent"].includes(body.role)
      ? (body.role as "teacher" | "parent")
      : "student";

    /**
     * Нэмэлт эрх — ЗӨВХӨН "teacher" | "parent" хосын НӨГӨӨ тал, БА зөвхөн
     * үндсэн эрх нь тэр хосын нэг гишүүн үед хүчинтэй (жишээ нь student
     * бүртгүүлээд secondaryRole="teacher" гэж дамжуулж чадахгүй).
     */
    const requestedSecondaryRole =
      (body.secondaryRole === "teacher" || body.secondaryRole === "parent") &&
      body.secondaryRole !== requestedRole &&
      (requestedRole === "teacher" || requestedRole === "parent")
        ? (body.secondaryRole as "teacher" | "parent")
        : null;

    const referralCode = normalizeInviteCode(body.referralCode);

    // Заавал биш (Google-ээр нэвтрэх хуучин мөр шинэ талбаргүй ирж болно) —
    // танихгүй/дутуу утга бол баганын өөрийн DEFAULT-руу унана.
    const coachId = isCoachId(body.coachId) ? body.coachId : undefined;

    // Гүйлгээний БҮХ бичилт ИЖИЛ мөчийг лавлана.
    const now = new Date();

    const created = await db.transaction(async (tx) => {
      // Тохиргооны мөр байхгүй бол үүсгэнэ, байгаа бол алдаагүй алгасна.
      await tx
        .insert(appConfig)
        .values({ id: "app", hasAdmin: false })
        .onConflictDoNothing();

      const [config] = await tx
        .select()
        .from(appConfig)
        .where(eq(appConfig.id, "app"))
        .for("update");

      const isFirstAdmin = !config?.hasAdmin;

      // Найзын код (заавал биш) — зөвхөн СУРАГЧИЙН кодтой тохирвол хүчинтэй.
      // Буруу/хоосон код бол чимээгүй үл тоомсорлоно, бүртгэлийг зогсоохгүй.
      let referrer: typeof users.$inferSelect | undefined;
      if (referralCode) {
        const [row] = await tx
          .select()
          .from(users)
          .where(eq(users.studentInviteCode, referralCode))
          .limit(1);
        if (row && isStudentRole(row.role)) referrer = row;
      }

      const [user] = await tx
        .insert(users)
        .values({
          uid: caller.uid,
          email,
          // Нэр өгөөгүй бол имэйлийн эхний хэсгийг ашиглана — толгой хэсэгт
          // хоосон нэр харагдвал апп эвдэрсэн мэт сэтгэгдэл төрүүлнэ.
          displayName: displayName || email.split("@")[0] || "Сурагч",
          firstName,
          lastName,
          role: isFirstAdmin ? "super" : requestedRole,
          // Анхны хэрэглэгч (super) нэмэлт эрхгүй — доорх хос зөвхөн
          // teacher/parent бүртгэлд хамаарна.
          secondaryRole: isFirstAdmin ? null : requestedSecondaryRole,
          status: "active",
          dailyGoal: config?.defaultDailyGoal ?? 3,
          // Бүртгүүлсэн өдрөөс дараалал эхэлнэ — эхний хичээлээ дуусгамагц
          // "1 өдөр" харагдана.
          lastActiveDay: "",
          streakDays: 0,
          ...(coachId ? { coachId } : {}),
          // Үнэгүй туршилт. Мөр ХАРААХАН байхгүй тул `extendPremium` БИШ,
          // шууд утга оноож болно.
          premiumUntil: trialUntil(TRIAL_DAYS, now),
          // Урилгыг зөвхөн ТЭМДЭГЛЭНЭ — `referralRewardedAt` нь `null`
          // хэвээр үлдэж, урамшууллыг хожим нэхэмжлэх эрхийг нээж өгнө.
          ...(referrer ? { referredBy: referrer.uid } : {}),
        })
        .returning();

      // Урилга БҮРИЙГ тэмдэглэнэ: `users.referredBy` нь урьгдсан талаас л
      // харагддаг тул "би хэдэн найз урьсан бэ" гэдгийг эндээс тоолно
      // (`referralStats`, `lib/tactiq/referrals.ts`).
      if (referrer && user) {
        // `rewardedAt` нь ЗОРИУДААР хоосон — урамшуулал хараахан олгогдоогүй.
        await tx.insert(referrals).values({
          referrerUid: referrer.uid,
          refereeUid: user.uid,
          referredMonth: currentReferralMonth(),
        });
      }

      if (isFirstAdmin) {
        await tx
          .update(appConfig)
          .set({ hasAdmin: true })
          .where(eq(appConfig.id, "app"));
      }

      return { user, isFirstAdmin };
    });

    // Анхны супер админ ЯГ ЭНД үүсдэг — Storage-ийн дүрэм түүнийг тэр дороо
    // танихын тулд claim-ийг бүртгэлтэй хамт бичнэ.
    if (created.user) {
      await syncUserClaims(created.user.uid, {
        role: asRole(created.user.role),
        status: (created.user.status ?? "active") as UserStatus,
      });
    }

    return NextResponse.json({
      user: created.user ? toPublicUser(created.user) : null,
      isFirstAdmin: created.isFirstAdmin,
      created: true,
      today: today(),
    });
  } catch (error) {
    return serverError(error, "Бүртгэл үүсгэхэд алдаа гарлаа");
  }
}

/** Системд админ бүртгэгдсэн эсэх — бүртгэлийн формд харуулахад. */
export async function GET() {
  try {
    const [config] = await db
      .select({ hasAdmin: appConfig.hasAdmin })
      .from(appConfig)
      .where(eq(appConfig.id, "app"))
      .limit(1);

    return NextResponse.json({ hasAdmin: config?.hasAdmin ?? false });
  } catch (error) {
    return serverError(error, "Тохиргоог уншихад алдаа гарлаа");
  }
}
