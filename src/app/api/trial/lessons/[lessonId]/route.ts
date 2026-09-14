import { NextResponse } from "next/server";

import { serverError } from "@/lib/api/auth";
import { cacheGetOrSet } from "@/lib/api/cache";
import { getCourseWithLessons, getLessonWithExercises, listCourseMetas } from "@/lib/db/courses";
import { TRIAL_COURSE_SLUG, TRIAL_LESSON_COUNT } from "@/lib/tactiq/trial";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Туршилтад НЭЭЛТТЭЙ хичээлийн ID-ууд. */
async function trialLessonIds(): Promise<Set<string>> {
  return cacheGetOrSet("trial:lesson-ids", 60_000, async () => {
    let course = await getCourseWithLessons(TRIAL_COURSE_SLUG);

    if (!course || course.units.length === 0) {
      const all = await listCourseMetas();
      const fallback = all.find((row) => row.status === "active");
      course = fallback ? await getCourseWithLessons(fallback.slug) : null;
    }

    const lessons = course?.units[0]?.lessons.slice(0, TRIAL_LESSON_COUNT) ?? [];
    return new Set(lessons.map((lesson) => lesson.id));
  });
}

/**
 * Зочны хичээлийн агуулга.
 *
 * ⚠ ЖАГСААЛТААР ШАЛГАНА, тоогоор биш. Клиент талын түгжээ нь зөвхөн
 * харагдац — хэн ч дурын хичээлийн ID-г энэ хаяг руу бичиж үзнэ. Эхний
 * гурван хичээлд БАГТААГҮЙ бол 404 буцаана, эс бөгөөс нэвтрэлтгүй хүн
 * бүх курсын агуулгыг татаж авах боломжтой болно.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;

  try {
    const allowed = await trialLessonIds();
    if (!allowed.has(lessonId)) {
      return NextResponse.json(
        { error: "Энэ хичээл зочинд нээлттэй биш.", code: "not-found" },
        { status: 404 }
      );
    }

    const lesson = await cacheGetOrSet(`lesson:${lessonId}`, 60_000, () =>
      getLessonWithExercises(lessonId)
    );
    if (!lesson) {
      return NextResponse.json({ error: "Хичээл олдсонгүй.", code: "not-found" }, { status: 404 });
    }

    return NextResponse.json({ lesson });
  } catch (error) {
    return serverError(error, "Хичээл татахад алдаа гарлаа");
  }
}
