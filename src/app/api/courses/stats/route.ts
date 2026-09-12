import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { listCourseStats } from "@/lib/api/courseStats";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/courses/stats — курс бүрийн хичээл/дасгал/XP/зоос ба ЭНЭ хэрэглэгчийн явц.
 *
 * ⚠ `/api/courses`-аас ТУСДАА: тэр нь хувийн бус тул кэшлэгддэг, харин энэ
 * нь хэрэглэгч бүрд өөр (`/api/courses/time`-тай ижил шалтгаан).
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json({ courses: await listCourseStats(result.caller.uid) });
  } catch (error) {
    return serverError(error, "Курсын үзүүлэлт уншихад алдаа гарлаа");
  }
}
