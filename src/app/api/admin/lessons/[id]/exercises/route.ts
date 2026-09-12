import { NextResponse } from "next/server";

import { badRequest, requireContentEditor, serverError } from "@/lib/api/auth";
import { cleanText, validateExerciseFields } from "@/lib/api/courseAdmin";
import { createExercise, getCourseSlugForLesson } from "@/lib/db/courses";
import { allowedExerciseTypes } from "@/lib/tactiq/courseNav";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Хичээлд шинэ дасгал нэмнэ — "choice" (сонголттой) эсвэл "board-move" (хөлөг дээр нүүдэл). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Багш ч агуулга НЭМЖ болно; засах/устгах нь эзэмшлээр
  // шалгагдана (`lib/api/contentAccess.ts`).
  const result = await requireContentEditor(request);
  if ("error" in result) return result.error;

  const { id: lessonId } = await params;

  try {
    const body = await request.json().catch(() => ({}));

    const prompt = cleanText(body.prompt, 500);
    if (!prompt) return badRequest("Асуулт заавал бөглөнө үү.");

    const fields = validateExerciseFields(body);
    if (!fields) {
      return badRequest(
        "Дасгалын мэдээлэл дутуу эсвэл буруу байна (сонголтууд/зөв хариулт, эсвэл FEN/нүүдэл)."
      );
    }

    /*
     * ⚠ Дасгалын төрөл КУРСТЭЙГЭЭ тохирох ёстой.
     *
     * Хичээлийн тоглуулагч хөлгийг ЗӨВХӨН дасгалын төрлөөр сонгодог тул
     * даамын курсэд `board-move` дасгал орвол хүүхэд даамын хичээл дунд
     * ШАТРЫН хөлөг харна — энэ эвдрэл бодитоор санд илэрсэн. Мөн Python,
     * English зэрэг хөлөггүй курсэд хөлөг дээрх дасгал утгагүй.
     */
    const courseSlug = await getCourseSlugForLesson(lessonId);
    const allowed = allowedExerciseTypes(courseSlug);
    if (!allowed.includes(fields.type)) {
      return badRequest(
        `Энэ курст "${fields.type}" төрлийн дасгал тохирохгүй. Зөвшөөрөгдөх: ${allowed.join(", ")}.`
      );
    }

    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    const id = await createExercise({
      lessonId,
      prompt,
      // Англи хувилбар нь ЗААВАЛ БИШ: багш монголоор бичиж хичээлээ
      // нийтлээд, орчуулгыг хожим нэмж болно (`lib/i18n/content.ts`).
      promptEn: cleanText(body.promptEn, 500),
      ...fields,
      explanation: cleanText(body.explanation, 500),
      explanationEn: cleanText(body.explanationEn, 500),
      sortOrder,
      createdBy: result.caller.uid,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "Дасгал үүсгэхэд алдаа гарлаа");
  }
}
