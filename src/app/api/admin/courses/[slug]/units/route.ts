import { NextResponse } from "next/server";

import { badRequest, notFound, requireContentEditor, serverError } from "@/lib/api/auth";
import { cleanText, cleanTitle } from "@/lib/api/courseAdmin";
import { courseExists, createUnit } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Курст шинэ нэгж нэмнэ. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Багш ч агуулга НЭМЖ болно; засах/устгах нь эзэмшлээр
  // шалгагдана (`lib/api/contentAccess.ts`).
  const result = await requireContentEditor(request);
  if ("error" in result) return result.error;

  const { slug } = await params;

  try {
    if (!(await courseExists(slug))) return notFound("Курс олдсонгүй.");

    const body = await request.json().catch(() => ({}));
    const title = cleanTitle(body.title, 120);
    if (!title) return badRequest("Гарчиг заавал бөглөнө үү.");

    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    const id = await createUnit({
      courseSlug: slug,
      title,
      titleEn: cleanTitle(body.titleEn, 120),
      color: cleanText(body.color, 16) || "violet",
      sortOrder,
      createdBy: result.caller.uid,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return serverError(error, "Нэгж үүсгэхэд алдаа гарлаа");
  }
}
