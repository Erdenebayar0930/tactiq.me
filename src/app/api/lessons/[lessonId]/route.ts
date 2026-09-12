import { NextResponse } from "next/server";

import { notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { cacheGetOrSet } from "@/lib/api/cache";
import { getLessonWithExercises } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Нэг хичээл, дасгалын БҮРЭН агуулгатайгаар — хичээл тоглуулагч
 * (`/learn/[lessonId]`) энд дуудна.
 *
 * ⚠ Зөв хариултыг (`correctOptionId`) ил илгээх нь эрсдэл багатай (сурах
 * контент, нууц биш) — оноо/зүрх бүгд `/api/learn/lessons/[lessonId]/complete`
 * СЕРВЕР дээр л батлагдана, клиент энэ route-оос ирсэн юугаар ч хуурч чадахгүй.
 *
 * Хичээлийн агуулга ХЭРЭГЛЭГЧЭЭС ХАМААРАХГҮЙ тул 60 секундэд кэшлэнэ — нэг
 * хичээлийг олон сурагч зэрэг нээхэд Postgres-руу дахин дахин хандахгүй.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { lessonId } = await params;

  try {
    const lesson = await cacheGetOrSet(`lesson:${lessonId}`, 60_000, () =>
      getLessonWithExercises(lessonId)
    );
    if (!lesson) return notFound("Хичээл олдсонгүй.");
    return NextResponse.json({ lesson });
  } catch (error) {
    return serverError(error, "Хичээл татахад алдаа гарлаа");
  }
}
