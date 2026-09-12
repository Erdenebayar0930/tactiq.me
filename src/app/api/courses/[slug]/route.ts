import { NextResponse } from "next/server";

import { notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { cacheGetOrSet, coursePathCacheKey } from "@/lib/api/cache";
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
    /*
     * ⚠ Курсын БҮТЭЦ хэрэглэгчээс хамаарахгүй тул хуваалцсан кэшэд
     * (`lib/api/cache.ts`-ийн тайлбарыг үзнэ үү). Хэрэглэгчийн ЯВЦ нь
     * ТУСДАА route-оор ирдэг (`/api/learn/progress`) — тиймээс энд хувийн
     * өгөгдөл орж, нэг сурагчийн мэдээлэл нөгөөд алдагдах эрсдэл байхгүй.
     */
    const course = await cacheGetOrSet(coursePathCacheKey(slug), 60_000, () =>
      getCourseWithLessons(slug)
    );
    if (!course) return notFound("Курс олдсонгүй.");
    return NextResponse.json({ course });
  } catch (error) {
    return serverError(error, "Курс татахад алдаа гарлаа");
  }
}
