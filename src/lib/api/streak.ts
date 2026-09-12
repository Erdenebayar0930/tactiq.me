import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { lessonProgress, users } from "@/lib/db/schema";
import { addDays, toDay, today } from "@/lib/tactiq/day";
import {
  MAX_STREAK_FREEZE_PURCHASES,
  MAX_STREAK_FREEZES,
  STREAK_FREEZE_COST_GEMS,
} from "@/lib/streakFreeze";

/**
 * Дарааллын хуанли ба мөс худалдан авалт.
 *
 * ⚠ "Идэвхтэй өдөр"-ийн тусдаа хүснэгт БАЙХГҮЙ, зориуд. Идэвх гэдэг нь
 * "тэр өдөр хичээл дуусгасан" гэсэн үг бөгөөд тэр баримт `lesson_progress`-д
 * аль хэдийн байдаг. Тусад нь хуулбарлавал хоёр эх сурвалж зөрөх боломжтой
 * болно — хуанли нь дараалалтайгаа таарахгүй байх нь хамгийн эвгүй эвдрэл.
 */

/** Хуанлид харуулах өдрийн тоо (өнөөдрөөр төгсөнө). */
export const CALENDAR_DAYS = 35;

export type StreakCalendar = {
  /** Идэвхтэй байсан өдрүүд `YYYY-MM-DD` (эрэмбэлэгдээгүй). */
  activeDays: string[];
  /** Хуанлийн эхний өдөр — клиент нүднүүдийг эндээс эхлүүлж зурна. */
  from: string;
  to: string;
  streakDays: number;
  longestStreak: number;
  freezes: number;
  maxFreezes: number;
  /** Дахин хэдэн удаа зоосоор мөс авч болох (насан туршийн үлдэгдэл). */
  purchasesLeft: number;
  costGems: number;
  gems: number;
};

export async function streakCalendar(uid: string): Promise<StreakCalendar> {
  const to = today();
  const from = addDays(to, -(CALENDAR_DAYS - 1));

  const [user] = await db
    .select({
      gems: users.gems,
      streakDays: users.streakDays,
      longestStreak: users.longestStreak,
      streakFreezes: users.streakFreezes,
      purchased: users.streakFreezesPurchased,
      lastActiveDay: users.lastActiveDay,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  /*
   * ⚠ Өдрөөр SQL дотор бүлэглэхгүй, ТЭМДЭГЛЭЛИЙГ татаад `toDay()`-гээр
   * хөрвүүлнэ. `completed_at` нь бүсгүй `timestamp` тул Postgres дотор
   * өдөр болгон хувиргахад серверийн бүс хэрэглэгдэх ба тэр нь аппын
   * `APP_TIMEZONE`-оос ЗӨРӨХ боломжтой — хуанли нэг өдөр гулсана.
   * `toDay()` нь бүх апп даяар ижил дүрмээр ажилладаг цорын ганц хөрвүүлэлт.
   *
   * Хэмжээ нь асуудалгүй: 35 хоногийн хичээлийн тэмдэглэл.
   */
  const rows = await db
    .select({ completedAt: lessonProgress.completedAt })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.uid, uid),
        // Хоёр өдрийн нөөц — бүсийн зөрүүгээр ирмэгийн өдөр унахаас сэргийлнэ.
        gte(lessonProgress.completedAt, new Date(`${addDays(from, -2)}T00:00:00Z`))
      )
    );

  const activeDays = [...new Set(rows.map((row) => toDay(row.completedAt)))].filter(
    (day) => day >= from && day <= to
  );

  return {
    activeDays,
    from,
    to,
    streakDays: user?.streakDays ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    freezes: user?.streakFreezes ?? 0,
    maxFreezes: MAX_STREAK_FREEZES,
    purchasesLeft: Math.max(0, MAX_STREAK_FREEZE_PURCHASES - (user?.purchased ?? 0)),
    costGems: STREAK_FREEZE_COST_GEMS,
    gems: user?.gems ?? 0,
  };
}

export type BuyFreezeOutcome =
  | { ok: true; gems: number; freezes: number }
  | { ok: false; reason: "no-gems" | "full" | "limit" };

/**
 * Зоосоор нэг мөс худалдаж авна.
 *
 * ⚠ БҮХ ШАЛГАЛТ НЭГ UPDATE-ийн `WHERE`-д. JS талд уншаад-шалгаад-бичвэл
 * хоёр зэрэг ирсэн хүсэлт хоёулаа ижил үлдэгдлийг хараад хоёулаа амжилттай
 * болж, хэрэглэгч нэг үнээр хоёр мөс авна. Нөхцөлт UPDATE нь атомик —
 * хоёр дахь нь `rowCount = 0` буцаана.
 *
 * Амжилтгүй болсон ШАЛТГААНЫГ дараа нь тусад нь уншиж тодруулна: `WHERE`
 * бүтэлгүйтвэл яагаад гэдгийг мэдэх боломжгүй, харин хэрэглэгчид "болсонгүй"
 * гэж хэлэх нь юу засахаа мэдэгдэхгүй.
 */
export async function buyStreakFreeze(uid: string): Promise<BuyFreezeOutcome> {
  const updated = await db
    .update(users)
    .set({
      gems: sql`${users.gems} - ${STREAK_FREEZE_COST_GEMS}`,
      streakFreezes: sql`${users.streakFreezes} + 1`,
      streakFreezesPurchased: sql`${users.streakFreezesPurchased} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(users.uid, uid),
        gte(users.gems, STREAK_FREEZE_COST_GEMS),
        sql`${users.streakFreezes} < ${MAX_STREAK_FREEZES}`,
        sql`${users.streakFreezesPurchased} < ${MAX_STREAK_FREEZE_PURCHASES}`
      )
    )
    .returning({ gems: users.gems, freezes: users.streakFreezes });

  if (updated.length > 0) {
    return { ok: true, gems: updated[0].gems, freezes: updated[0].freezes };
  }

  const [row] = await db
    .select({
      gems: users.gems,
      freezes: users.streakFreezes,
      purchased: users.streakFreezesPurchased,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  if (!row) return { ok: false, reason: "limit" };
  if (row.purchased >= MAX_STREAK_FREEZE_PURCHASES) return { ok: false, reason: "limit" };
  if (row.freezes >= MAX_STREAK_FREEZES) return { ok: false, reason: "full" };
  return { ok: false, reason: "no-gems" };
}
