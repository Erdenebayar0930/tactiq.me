import "server-only";

import { and, count, eq, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  courseLeagues,
  courseTime,
  friendships,
  lessonProgress,
  referrals,
  users,
} from "@/lib/db/schema";
import {
  ACHIEVEMENTS,
  progressFor,
  type AchievementMetric,
  type AchievementProgress,
} from "@/lib/tactiq/achievements";
import { tierInfo } from "@/lib/tactiq/league";

/**
 * Амжилтын тэмдгүүдийг ТООЦНО (хадгалахгүй).
 *
 * ⚠ Тэмдгийн төлөв санд БАЙХГҮЙ — `lib/tactiq/achievements.ts` дээрх
 * шалтгааныг үзнэ үү. Энд зөвхөн ҮЗҮҮЛЭЛТҮҮДИЙГ цуглуулж, цэвэр функцэд
 * дамжуулна.
 *
 * ⚠ Үзүүлэлт бүрийг ТУСДАА асуулгаар авдаг нь санамсаргүй: тэдгээр нь
 * өөр өөр хүснэгтээс, өөр өөр бүлэглэлтээр гардаг. Нэг том JOIN болгох нь
 * мөр үржүүлж (fan-out) тоолол ХУДЛАА болгоно — жишээ нь 3 найзтай хүний
 * дуусгасан хичээл 3 дахин тоологдоно.
 */

export type MetricValues = Record<AchievementMetric, number>;

async function collectMetrics(uid: string): Promise<MetricValues> {
  const [user] = await db
    .select({
      xp: users.xp,
      longestStreak: users.longestStreak,
      rating: users.rating,
      chessWins: users.chessWins,
      draughtsWins: users.draughtsWins,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  const [lessons] = await db
    .select({
      completed: count(),
      // `countDistinct` нь Drizzle-ийн хувилбар хооронд өөр тул шууд SQL.
      courses: sql<number>`count(distinct ${lessonProgress.courseSlug})`,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.uid, uid));

  const [time] = await db
    .select({ seconds: sql<number>`coalesce(sum(${courseTime.seconds}), 0)` })
    .from(courseTime)
    .where(eq(courseTime.uid, uid));

  /*
   * Лигийн шат — БҮХ КУРСЫН ДЭЭД нь.
   *
   * ⚠ Лиг курс тус бүрд тусдаа болсон тул "миний лиг" гэсэн ганц тоо
   * байхгүй. Тэмдэгт хамгийн ӨНДӨР хүрсэн шатыг авна: амжилт нь "хүрч
   * байсан уу" гэдгийг тэмдэглэдэг бөгөөд шинэ курс эхлэхэд тэр нь
   * буурах ёсгүй (шинэ курс үргэлж Төмрөөс эхэлдэг).
   *
   * Мөргүй = хэзээ ч өрсөлдөөгүй → 0 (Төмөр).
   */
  const [league] = await db
    .select({ best: sql<number>`coalesce(max(${courseLeagues.tier}), 0)` })
    .from(courseLeagues)
    .where(eq(courseLeagues.uid, uid));

  const [friends] = await db
    .select({ value: count() })
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.userAUid, uid), eq(friendships.userBUid, uid))
      )
    );

  // ЗӨВХӨН урамшуулал ОЛГОГДСОН урилгууд — бүртгүүлээд хичээлээ эхлээгүй
  // найз нь "урьсан" гэж тоологдох ёсгүй (`lib/api/referralReward.ts`).
  const [invited] = await db
    .select({ value: count() })
    .from(referrals)
    .where(and(eq(referrals.referrerUid, uid), isNotNull(referrals.rewardedAt)));

  return {
    xp: user?.xp ?? 0,
    longestStreak: user?.longestStreak ?? 0,
    lessonsCompleted: Number(lessons?.completed ?? 0),
    coursesStarted: Number(lessons?.courses ?? 0),
    // Минут руу ДООШ бүхэлчилнэ: 59 секундыг "1 минут" гэж дугуйлбал
    // хэрэглэгч хийгээгүй зүйлдээ тэмдэг авна.
    learnMinutes: Math.floor(Number(time?.seconds ?? 0) / 60),
    gamesWon: (user?.chessWins ?? 0) + (user?.draughtsWins ?? 0),
    rating: user?.rating ?? 0,
    leagueTier: Number(league?.best ?? 0),
    friendsCount: Number(friends?.value ?? 0),
    referralsRewarded: Number(invited?.value ?? 0),
  };
}

/**
 * "Дээд амжилт" — тэмдгийн шатлалаас ГАДУУР, дан ганц дээд утга.
 *
 * ⚠ ОГНОО БАЙХГҮЙ, зориуд. Duolingo эдгээрийн хажууд "хэзээ тавьсан"
 * огноог бичдэг ч бид рекорд ТАВИГДСАН мөчийг хадгалдаггүй — зөвхөн
 * одоогийн дээд утгыг (`users.longest_streak`, `max(course_leagues.tier)`).
 * Огноо харуулах цорын ганц зам нь түүнийг ТААМАГЛАХ (жишээ нь мөрийн
 * `updated_at`) бөгөөд тэр нь ХУДАЛ огноо хэвлэнэ.
 */
export type AchievementRecord = {
  key: string;
  label: string;
  /** Харуулах утга — тоо эсвэл нэр ("Мөнгө"). */
  value: string;
  icon: string;
  color: string;
};

export type AchievementsView = {
  records: AchievementRecord[];
  achievements: AchievementProgress[];
  /** Нээгдсэн тэмдгийн тоо (шат ≥ 1) — профайлын товч мөрөнд. */
  unlocked: number;
  total: number;
};

/**
 * Бүх тэмдгийн явц.
 *
 * Эрэмбэ: ЭХЛЭЭД нээгдсэн, дотор нь шат өндөртэй нь. Дараа нь аваагүй
 * боловч ойрхон байгаа нь. Ингэснээр хэрэглэгч "юуг аль хэдийн авсан" ба
 * "юу нь ойрхон байна" хоёрыг НЭГ харцаар харна.
 */
export async function achievementsView(uid: string): Promise<AchievementsView> {
  const metrics = await collectMetrics(uid);

  const achievements = ACHIEVEMENTS.map((def) =>
    progressFor(def, metrics[def.metric])
  ).sort((x, y) => y.tier - x.tier || y.percent - x.percent);

  const best = tierInfo(metrics.leagueTier);

  const records: AchievementRecord[] = [
    {
      key: "league",
      label: "Хамгийн өндөр лиг",
      value: best.label,
      icon: "Trophy",
      color: best.color,
    },
    {
      key: "streak",
      label: "Хамгийн урт дараалал",
      value: `${metrics.longestStreak.toLocaleString("mn-MN")} өдөр`,
      icon: "Flame",
      color: "#f97316",
    },
    {
      key: "rating",
      label: "Үнэлгээ",
      value: metrics.rating.toLocaleString("mn-MN"),
      icon: "Target",
      color: "#6366f1",
    },
    {
      key: "xp",
      label: "Нийт оноо",
      value: metrics.xp.toLocaleString("mn-MN"),
      icon: "Zap",
      color: "#8b5cf6",
    },
  ];

  return {
    records,
    achievements,
    unlocked: achievements.filter((item) => item.tier > 0).length,
    total: achievements.length,
  };
}
