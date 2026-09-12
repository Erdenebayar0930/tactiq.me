import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { lessonProgress, pathChests } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Нэвтэрсэн хэрэглэгчийн дуусгасан хичээлүүд + онгойлгосон бэлгийн
 * хайрцгууд — замын түгжээ, хайрцгийн төлөвийг тооцоход.
 *
 * ⚠ Хайрцгийг ТУСДАА route-аар БИШ, ХАМТ буцаана: зам нь хоёуланг нэг
 * зэрэг зурдаг тул хоёр хүсэлт болговол дэлгэц хоёр удаа анивчина
 * (хичээлүүд гараад дараа нь хайрцгууд «нээгдэж» тодорно).
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const rows = await db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(eq(lessonProgress.uid, result.caller.uid));

    const chests = await db
      .select({ unitId: pathChests.unitId, chestIndex: pathChests.chestIndex })
      .from(pathChests)
      .where(eq(pathChests.uid, result.caller.uid));

    return NextResponse.json({
      completedLessonIds: rows.map((row) => row.lessonId),
      claimedChests: chests.map((row) => `${row.unitId}:${row.chestIndex}`),
    });
  } catch (error) {
    return serverError(error, "Явц уншихад алдаа гарлаа");
  }
}
