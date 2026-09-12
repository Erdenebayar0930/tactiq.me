import { NextResponse } from "next/server";

import { notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { getCourseWithLessons } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Нэг курс, нэгж/хичээлийн бүтэцтэйгээр (дасгалын агуулга ороогүй) — `/learn` замын дэлгэцэд. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { slug } = await params;

  try {
    const course = await getCourseWithLessons(slug);
    if (!course) return notFound("Курс олдсонгүй.");
    return NextResponse.json({ course });
  } catch (error) {
    return serverError(error, "Курс татахад алдаа гарлаа");
  }
}
