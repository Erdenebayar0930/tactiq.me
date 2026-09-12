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
  /** Дуусаагүй хичээлтэй ЭХНИЙ бүлгийн дугаар (1-ээс). Бүгд дууссан бол сүүлийнх. */
  currentLevel: number;
  /** Нэг хичээлд дунджаар хэдэн дасгал. */
  exercisesPerLesson: number;
};

export async function listCourseStats(uid: string): Promise<CourseStat[]> {
  const rows = await db
    .select({
      courseSlug: units.courseSlug,
      unitId: units.id,
      unitOrder: units.sortOrder,
      lessonId: lessons.id,
      xp: lessons.xpReward,
      exerciseCount: sql<number>`count(${exercises.id})::int`,
    })
    .from(units)
    .innerJoin(lessons, eq(lessons.unitId, units.id))
    .leftJoin(exercises, eq(exercises.lessonId, lessons.id))
    .groupBy(units.courseSlug, units.id, units.sortOrder, lessons.id, lessons.xpReward);

  const progressRows = await db
    .select({ lessonId: lessonProgress.lessonId, xp: lessonProgress.xpEarned })
    .from(lessonProgress)
    .where(eq(lessonProgress.uid, uid));
  const earnedByLesson = new Map(progressRows.map((row) => [row.lessonId, row.xp]));

  type Acc = {
    stat: CourseStat;
    /** unitId → { order, lessons, done } — одоогийн түвшинг олоход */
    units: Map<string, { order: number; lessons: number; done: number }>;
  };
  const byCourse = new Map<string, Acc>();

  for (const row of rows) {
    let acc = byCourse.get(row.courseSlug);
    if (!acc) {
      acc = {
        stat: {
          courseSlug: row.courseSlug,
          lessons: 0,
          exercises: 0,
          totalXp: 0,
          completedLessons: 0,
          earnedXp: 0,
          earnedCoins: 0,
          totalCoins: 0,
          progress: 0,
          currentLevel: 1,
          exercisesPerLesson: 0,
        },
        units: new Map(),
      };
      byCourse.set(row.courseSlug, acc);
    }

    const done = earnedByLesson.has(row.lessonId);
    acc.stat.lessons += 1;
    acc.stat.exercises += Number(row.exerciseCount);
    acc.stat.totalXp += row.xp;
    if (done) {
      acc.stat.completedLessons += 1;
      acc.stat.earnedXp += earnedByLesson.get(row.lessonId) ?? 0;
    }

    const unit = acc.units.get(row.unitId) ?? { order: row.unitOrder, lessons: 0, done: 0 };
    unit.lessons += 1;
    if (done) unit.done += 1;
    acc.units.set(row.unitId, unit);
  }

  return [...byCourse.values()].map(({ stat, units: unitMap }) => {
    const ordered = [...unitMap.values()].sort((a, b) => a.order - b.order);
    const firstOpen = ordered.findIndex((unit) => unit.done < unit.lessons);

    return {
      ...stat,
      earnedCoins: stat.completedLessons * LESSON_GEM_REWARD,
      totalCoins: stat.lessons * LESSON_GEM_REWARD,
      progress: stat.lessons === 0 ? 0 : Math.round((stat.completedLessons / stat.lessons) * 100),
      currentLevel: firstOpen === -1 ? Math.max(1, ordered.length) : firstOpen + 1,
      exercisesPerLesson: stat.lessons === 0 ? 0 : stat.exercises / stat.lessons,
    };
  });
}
