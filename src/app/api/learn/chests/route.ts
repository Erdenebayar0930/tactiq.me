import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { badRequest, notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { toPublicUser } from "@/lib/api/publicUser";
import { db } from "@/lib/db";
import { lessonProgress, lessons, pathChests, users } from "@/lib/db/schema";
import { CHEST_GEMS, chestCountForUnit, lessonsNeededForChest } from "@/lib/tactiq/path";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Postgres-ийн unique_violation — `path_chests_uid_unit_index_uq`-ийн зөрчил. */
function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if ((current as { code?: string }).code === "23505") return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}

/**
 * БЭЛГИЙН ХАЙРЦГИЙГ ОНГОЙЛГОХ.
 *
 * ⚠ НӨХЦӨЛИЙГ СЕРВЕР ШАЛГАНА: клиент зөвхөн «аль хайрцаг» гэж хэлнэ,
 * «онгойлгох эрхтэй» гэдгийг ХЭЗЭЭ Ч шийдэхгүй. Шалгалт нь тухайн сэдвийн
 * хичээлүүдийг дарааллаараа уншиж, хайрцгийн өмнөх БҮГДИЙГ дуусгасан
 * эсэхийг тоолно (`lib/tactiq/path.ts`-ийн `lessonsNeededForChest`).
 *
 * ⚠ Давхардлыг UNIQUE ХЯЗГААРЛАЛТААР шийднэ — хоёр товшилт ЗЭРЭГ ирвэл
 * (давхар дарах, сүлжээ дахин илгээх) зөвхөн нэг нь insert хийж чадна.
 * Урьдчилсан `SELECT` нь уралдаанд өртдөг тул зоос хоёр дахин
 * олгогдох эрсдэлтэй.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const body = await request.json().catch(() => ({}));
    const unitId = typeof body.unitId === "string" ? body.unitId.trim() : "";
    const chestIndex = Number(body.chestIndex);

    if (!unitId || !Number.isInteger(chestIndex) || chestIndex < 0) {
      return badRequest("Хайрцгийн мэдээлэл буруу байна.");
    }

    const unitLessons = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.unitId, unitId))
      .orderBy(asc(lessons.sortOrder));

    if (unitLessons.length === 0) return notFound("Сэдэв олдсонгүй.");
    if (chestIndex >= chestCountForUnit(unitLessons.length)) {
      return badRequest("Энэ сэдэвт тийм хайрцаг байхгүй.");
    }

    const required = unitLessons.slice(0, lessonsNeededForChest(chestIndex)).map((row) => row.id);
    const done = await db
      .select({ lessonId: lessonProgress.lessonId })
      .from(lessonProgress)
      .where(
        and(eq(lessonProgress.uid, caller.uid), inArray(lessonProgress.lessonId, required))
      );

    if (done.length < required.length) {
      return badRequest("Өмнөх хичээлүүдээ дуусгасны дараа хайрцаг онгойно.");
    }

    try {
      await db
        .insert(pathChests)
        .values({ uid: caller.uid, unitId, chestIndex, gems: CHEST_GEMS });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return badRequest("Энэ хайрцгийг аль хэдийн онгойлгосон байна.");
      }
      throw error;
    }

    const [updated] = await db
      .update(users)
      .set({ gems: sql`${users.gems} + ${CHEST_GEMS}`, updatedAt: new Date() })
      .where(eq(users.uid, caller.uid))
      .returning();

    return NextResponse.json({ gems: CHEST_GEMS, user: toPublicUser(updated) });
  } catch (error) {
    return serverError(error, "Хайрцаг онгойлгоход алдаа гарлаа");
  }
}
