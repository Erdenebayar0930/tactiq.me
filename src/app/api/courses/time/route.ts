import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { listCourseTime } from "@/lib/api/courseTime";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/courses/time — курс бүрд зарцуулсан хугацаа.
 *
 * ⚠ Хугацааг клиент хэмждэг тул ЗӨВХӨН СТАТИСТИК — оноо, эрх, шагнал
 * хэзээ ч үүнээс хамаарахгүй (`lib/api/courseTime.ts`).
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json({ courses: await listCourseTime(result.caller.uid) });
  } catch (error) {
    return serverError(error, "Хугацааны мэдээлэл уншихад алдаа гарлаа");
  }
}
