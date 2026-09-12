import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { exercises, lessonProgress, lessons, units } from "@/lib/db/schema";
import { LESSON_GEM_REWARD } from "@/lib/tactiq/rewards";

/**
 * `/courses` картын үзүүлэлтүүд — курс бүрийн агуулга + ЭНЭ хэрэглэгчийн явц.
 *
 * ⚠ БҮГД САНГААС ТООЦОГДОНО, хадгалагдсан тоо байхгүй: админ хичээл нэмэхэд
 * эсвэл сурагч хичээл дуусгахад карт автоматаар шинэчлэгдэнэ.
 *
 * ⚠ Устгагдсан хичээлийн `lesson_progress` мөр (хуучин id) ТООЛОГДОХГҮЙ —
 * зөвхөн одоо байгаа хичээлтэй таарсан явц орно. Эс бөгөөс явц 100%-аас
 * хэтэрч болно.
 */

export type CourseStat = {
  courseSlug: string;
  lessons: number;
  exercises: number;
  /** Курсын бүх хичээлийн XP-ийн нийлбэр. */
  totalXp: number;
  completedLessons: number;
  earnedXp: number;
  /** Хичээл дуусгах бүрт `LESSON_GEM_REWARD` зоос. */
  earnedCoins: number;
  totalCoins: number;
  /** 0–100 */
  progress: number;
  /** Нэг хичээлд дунджаар хэдэн дасгал. */
  exercisesPerLesson: number;
};

export async function listCourseStats(uid: string): Promise<CourseStat[]> {
  const rows = await db
    .select({
      courseSlug: units.courseSlug,
      lessonId: lessons.id,
      xp: lessons.xpReward,
      exerciseCount: sql<number>`count(${exercises.id})::int`,
    })
    .from(units)
    .innerJoin(lessons, eq(lessons.unitId, units.id))
    .leftJoin(exercises, eq(exercises.lessonId, lessons.id))
    /*
     * ⚠ `units.id`/`units.sortOrder` хасагдсан: тэднийг ЗӨВХӨН «Түвшин N»
     * тэмдэг (`currentLevel`) хэрэглэдэг байсан. `lessons.id` нь нэгжийг
     * дүйцүүлж тодорхойлдог тул бүлэглэлтийн мөрүүд ЯГ ИЖИЛ хэвээр.
     */
    .groupBy(units.courseSlug, lessons.id, lessons.xpReward);

  const progressRows = await db
    .select({ lessonId: lessonProgress.lessonId, xp: lessonProgress.xpEarned })
    .from(lessonProgress)
    .where(eq(lessonProgress.uid, uid));
  const earnedByLesson = new Map(progressRows.map((row) => [row.lessonId, row.xp]));

  const byCourse = new Map<string, CourseStat>();

  for (const row of rows) {
    let stat = byCourse.get(row.courseSlug);
    if (!stat) {
      stat = {
        courseSlug: row.courseSlug,
        lessons: 0,
        exercises: 0,
        totalXp: 0,
        completedLessons: 0,
        earnedXp: 0,
        earnedCoins: 0,
        totalCoins: 0,
        progress: 0,
        exercisesPerLesson: 0,
      };
      byCourse.set(row.courseSlug, stat);
    }

    const done = earnedByLesson.has(row.lessonId);
    stat.lessons += 1;
    stat.exercises += Number(row.exerciseCount);
    stat.totalXp += row.xp;
    if (done) {
      stat.completedLessons += 1;
      stat.earnedXp += earnedByLesson.get(row.lessonId) ?? 0;
    }
  }

  return [...byCourse.values()].map((stat) => ({
    ...stat,
    earnedCoins: stat.completedLessons * LESSON_GEM_REWARD,
    totalCoins: stat.lessons * LESSON_GEM_REWARD,
    progress: stat.lessons === 0 ? 0 : Math.round((stat.completedLessons / stat.lessons) * 100),
    exercisesPerLesson: stat.lessons === 0 ? 0 : stat.exercises / stat.lessons,
  }));
}
