import { NextResponse } from "next/server";

import { badRequest, requireContentEditor, serverError } from "@/lib/api/auth";
import { cleanTitle } from "@/lib/api/courseAdmin";
import { createLesson } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Нэгжид шинэ хичээл нэмнэ (дасгалгүйгээр эхэлнэ — дараа нь тусад нь нэмнэ). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Багш ч агуулга НЭМЖ болно; засах/устгах нь эзэмшлээр
  // шалгагдана (`lib/api/contentAccess.ts`).
  const result = await requireContentEditor(request);
  if ("error" in result) return result.error;

  const { id: unitId } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const title = cleanTitle(body.title, 160);
    if (!title) return badRequest("Гарчиг заавал бөглөнө үү.");

    const xpReward = Number.isFinite(Number(body.xpReward)) ? Math.max(0, Number(body.xpReward)) : 100;
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    const lessonId = await createLesson({
      unitId,
      title,
      titleEn: cleanTitle(body.titleEn, 160),
      xpReward,
      sortOrder,
      createdBy: result.caller.uid,
    });
    return NextResponse.json({ id: lessonId }, { status: 201 });
  } catch (error) {
    return serverError(error, "Хичээл үүсгэхэд алдаа гарлаа");
  }
}
