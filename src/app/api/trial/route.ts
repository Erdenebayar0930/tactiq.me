import { NextResponse } from "next/server";

import { serverError } from "@/lib/api/auth";
import { cacheGetOrSet } from "@/lib/api/cache";
import { getCourseWithLessons, listCourseMetas } from "@/lib/db/courses";
import { TRIAL_COURSE_SLUG, TRIAL_LESSON_COUNT } from "@/lib/tactiq/trial";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ЗОЧНЫ ЗАМ — нэвтрээгүй хүнд харуулах курс.
 *
 * `?course=<slug>` — зочны сонгосон курс. Байхгүй/танигдахгүй бол
 * анхдагч туршилтын курс.
 *
 * ⚠ НЭВТРЭЛТГҮЙ route. Тиймээс АГУУЛГЫГ нь хязгаарлана: энэ хаяг нь
 * курсын БҮТЦИЙГ (бүлэг, хичээлийн нэр, тоо) л өгнө. Дасгалын агуулга нь
 * `/api/trial/lessons/[id]`-аар гардаг бөгөөд тэр нь курс бүрийн ЭХНИЙ
 * `TRIAL_LESSON_COUNT` хичээлээс өөрийг татгалзана.
 *
 * ⚠ Явцын мэдээлэл ОГТ БАЙХГҮЙ: зочинд хэрэглэгч гэж байхгүй тул
 * `/api/learn/progress` руу хандах хэрэггүй бөгөөд хандаж ч болохгүй.
 */
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("course")?.trim() ?? "";

  try {
    /*
     * ⚠ ЗӨВХӨН ИДЭВХТЭЙ курс. Админы ноорхой (`draft`) курсыг slug таамаглаж
     * нээх боломжтой байвал бэлдэж байгаа агуулга цаг нь болохоос өмнө
     * нийтийн болно.
     */
    const active = await cacheGetOrSet("trial:active-slugs", 60_000, async () =>
      (await listCourseMetas()).filter((row) => row.status === "active").map((row) => row.slug)
    );

    const slug = active.includes(requested)
      ? requested
      : active.includes(TRIAL_COURSE_SLUG)
        ? TRIAL_COURSE_SLUG
        : (active[0] ?? "");

    const course = slug
      ? await cacheGetOrSet(`trial:course:${slug}`, 60_000, () => getCourseWithLessons(slug))
      : null;

    if (!course || course.units.length === 0) {
      return NextResponse.json({ error: "Туршилтын курс алга." }, { status: 404 });
    }

    /*
     * ⚠ БҮТЭН БҮТЭЦ буцаана, зөвхөн нээлттэй хичээлүүдийг БИШ.
     *
     * Зочин курс дотор юу байгааг ХАРАХ ёстой — түгжээтэй хичээлүүд нь
     * бүртгүүлэх шалтгаан нь өөрөө. Тайрч хаявал «гурван хичээлтэй жижиг
     * курс» мэт харагдана.
     */
    const trialLessonIds = course.units[0].lessons
      .slice(0, TRIAL_LESSON_COUNT)
      .map((lesson) => lesson.id);

    return NextResponse.json({ course, trialLessonIds });
  } catch (error) {
    return serverError(error, "Туршилтын курс татахад алдаа гарлаа");
  }
}
