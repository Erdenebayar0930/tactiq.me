import { NextResponse } from "next/server";

import { serverError } from "@/lib/api/auth";
import { cacheGetOrSet } from "@/lib/api/cache";
import { getCourseWithLessons, listCourseMetas } from "@/lib/db/courses";
import { TRIAL_COURSE_SLUG, TRIAL_LESSON_COUNT } from "@/lib/tactiq/trial";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ЗОЧНЫ ЗАМ — нэвтрээгүй хүнд харуулах курс.
 *
 * ⚠ НЭВТРЭЛТГҮЙ route. Тиймээс агуулгыг нь ХЯЗГААРЛАНА: зөвхөн НЭГ курсын
 * ЭХНИЙ бүлгийн эхний `TRIAL_LESSON_COUNT` хичээл. Бүтэн курсыг өгвөл
 * төлбөртэй агуулга нийтийн болно.
 *
 * ⚠ Явцын мэдээлэл ОГТ БАЙХГҮЙ: зочинд хэрэглэгч гэж байхгүй тул
 * `/api/learn/progress` руу хандах хэрэггүй бөгөөд хандаж ч болохгүй.
 */
export async function GET() {
  try {
    const course = await cacheGetOrSet("trial:course", 60_000, async () => {
      const preferred = await getCourseWithLessons(TRIAL_COURSE_SLUG);
      if (preferred && preferred.units.length > 0) return preferred;

      /*
       * ⚠ Санал болгосон курс байхгүй (админ устгасан, slug сольсон) бол
       * зочны дэлгэцийг ХООСОН орхихгүй — эхний идэвхтэй курсыг авна.
       */
      const all = await listCourseMetas();
      const fallback = all.find((row) => row.status === "active");
      return fallback ? await getCourseWithLessons(fallback.slug) : null;
    });

    if (!course || course.units.length === 0) {
      return NextResponse.json({ error: "Туршилтын курс алга." }, { status: 404 });
    }

    /*
     * ⚠ БҮТЭН БҮТЭЦ буцаана, зөвхөн нээлттэй хичээлүүдийг БИШ.
     *
     * Зочин курс дотор юу байгааг ХАРАХ ёстой — түгжээтэй хичээлүүд нь
     * бүртгүүлэх шалтгаан нь өөрөө. Тайрч хаявал «гурван хичээлтэй жижиг
     * курс» мэт харагдана.
     *
     * ⚠ Гэхдээ энэ нь зөвхөн ГАРЧИГ, ТОО. Дасгалын АГУУЛГА нь
     * `/api/trial/lessons/[id]`-аар л гардаг бөгөөд тэр нь `trialLessonIds`
     * дотор байхгүй бүхнийг татгалздаг.
     */
    const trialLessonIds = course.units[0].lessons
      .slice(0, TRIAL_LESSON_COUNT)
      .map((lesson) => lesson.id);

    return NextResponse.json({ course, trialLessonIds });
  } catch (error) {
    return serverError(error, "Туршилтын курс татахад алдаа гарлаа");
  }
}
