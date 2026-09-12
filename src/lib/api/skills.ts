import "server-only";

import { count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { courses, courseTime, lessonProgress, lessons, units } from "@/lib/db/schema";

/**
 * "Ур чадвар" — сурагчийн ЭХЭЛСЭН курс тус бүрийн эзэмшилт.
 *
 * ⚠ ЗӨВХӨН ЭХЭЛСЭН курсууд. Санд 39 курс байгаагийн 36 нь "тун удахгүй",
 * хичээлгүй — бүгдийг жагсаавал 0%-тай мөр олноор гарч, хэсэг бүхэлдээ
 * эвдэрсэн мэт харагдана. "Эхэлсэн" гэдэг нь: НЭГ хичээл дуусгасан ЭСВЭЛ
 * тухайн курст хугацаа зарцуулсан (эхэлчихээд дуусгаагүй ч гэсэн ахиц).
 */

export type Skill = {
  courseSlug: string;
  title: string;
  icon: string;
  color: string;
  school: string;
  /** Дуусгасан хичээлийн тоо. */
  completed: number;
  /** Курсын НИЙТ хичээлийн тоо. `0` бол агуулга хараахан нэмэгдээгүй. */
  total: number;
  /** Эзэмшилт (0-100). `total = 0` үед 0 — тэглэж хуваахаас сэргийлнэ. */
  percent: number;
  xp: number;
  seconds: number;
};

export async function listSkills(uid: string): Promise<Skill[]> {
  /*
   * Курс бүрийн НИЙТ хичээлийн тоо.
   *
   * `lessons` нь `units`-ээр дамжин курстэй холбогддог (шууд `courseSlug`
   * талбаргүй) тул JOIN зайлшгүй.
   */
  const totals = await db
    .select({ courseSlug: units.courseSlug, total: count() })
    .from(lessons)
    .innerJoin(units, eq(units.id, lessons.unitId))
    .groupBy(units.courseSlug);

  const totalBySlug = new Map(totals.map((row) => [row.courseSlug, Number(row.total)]));

  // Дуусгасан хичээл ба цуглуулсан оноо — курсээр бүлэглэв.
  const progress = await db
    .select({
      courseSlug: lessonProgress.courseSlug,
      completed: count(),
      xp: sql<number>`coalesce(sum(${lessonProgress.xpEarned}), 0)`,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.uid, uid))
    .groupBy(lessonProgress.courseSlug);

  const spent = await db
    .select({ courseSlug: courseTime.courseSlug, seconds: courseTime.seconds })
    .from(courseTime)
    .where(eq(courseTime.uid, uid));

  /*
   * ХОЁР эх сурвалжийн НЭГДЭЛ. Зөвхөн `lesson_progress`-ээр явбал "эхэлсэн
   * ч нэг ч хичээл дуусгаагүй" курс алга болно — тэр нь яг ойрхон байгаа,
   * түлхэц хэрэгтэй курс.
   */
  const startedSlugs = new Set<string>([
    ...progress.map((row) => row.courseSlug),
    ...spent.filter((row) => row.seconds > 0).map((row) => row.courseSlug),
  ]);

  if (startedSlugs.size === 0) return [];

  const meta = await db
    .select({
      slug: courses.slug,
      title: courses.title,
      icon: courses.icon,
      color: courses.color,
      school: courses.school,
    })
    .from(courses);

  const metaBySlug = new Map(meta.map((row) => [row.slug, row]));
  const progressBySlug = new Map(progress.map((row) => [row.courseSlug, row]));
  const secondsBySlug = new Map(spent.map((row) => [row.courseSlug, row.seconds]));

  const skills: Skill[] = [];

  for (const slug of startedSlugs) {
    // Курс устгагдсан ч ахиц үлдсэн байж болно — тэр мөрийг алгасна
    // (нэргүй хоосон карт харуулахаас дээр).
    const info = metaBySlug.get(slug);
    if (!info) continue;

    const completed = Number(progressBySlug.get(slug)?.completed ?? 0);
    const total = totalBySlug.get(slug) ?? 0;

    skills.push({
      courseSlug: slug,
      title: info.title,
      icon: info.icon,
      color: info.color,
      school: info.school,
      completed,
      total,
      percent: total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0,
      xp: Number(progressBySlug.get(slug)?.xp ?? 0),
      seconds: secondsBySlug.get(slug) ?? 0,
    });
  }

  // Эзэмшилт өндөртэй нь эхэнд, тэнцвэл оноо ихтэй нь.
  return skills.sort((x, y) => y.percent - x.percent || y.xp - x.xp);
}
