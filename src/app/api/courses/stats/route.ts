import { NextResponse } from "next/server";

import { getCallerOrResponse, serverError } from "@/lib/api/auth";
import { listCourseStats } from "@/lib/api/courseStats";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/courses/stats — курс бүрийн хичээл/дасгал/XP/зоос ба ЭНЭ хэрэглэгчийн явц.
 *
 * ⚠ `/api/courses`-аас ТУСДАА: тэр нь хувийн бус тул кэшлэгддэг, харин энэ
 * нь хэрэглэгч бүрд өөр (`/api/courses/time`-тай ижил шалтгаан).
 *
 * ⚠ НЭВТРЭЛТ ШААРДАХГҮЙ: зочин (эсвэл идэвхгүй бүртгэл) агуулгын тоогоо
 * харна, явц нь 0. Курс бүрт хэдэн дасгал, зоос байгааг бүртгүүлэхээс
 * ӨМНӨ харах нь сонголт хийхэд хэрэгтэй.
 */
export async function GET(request: NextRequest) {
  const result = await getCallerOrResponse(request);
  if ("error" in result) return result.error;

  const user = result.caller?.user;
  const uid = user?.status === "active" ? result.caller!.uid : null;

  try {
    return NextResponse.json({ courses: await listCourseStats(uid) });
  } catch (error) {
    return serverError(error, "Курсын үзүүлэлт уншихад алдаа гарлаа");
  }
}
