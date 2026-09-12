import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { exercises, lessons, units } from "@/lib/db/schema";
import { isAdminRole } from "@/lib/permissions";

import type { PublicUser } from "@/lib/api/publicUser";

/**
 * Хичээлийн агуулгыг ХЭН УДИРДАЖ болох вэ.
 *
 * ДҮРЭМ:
 *   • КУРС үүсгэх, устгах, засах — ЗӨВХӨН админ (`requireAdmin`). Курс бол
 *     каталогийн бүтэц: түүнийг устгах нь доторх бүх нэгж, хичээл, дасгал,
 *     тэдгээрт холбогдсон сурагчдын АХИЦЫГ хамт хаядаг (cascade).
 *   • НЭГЖ / ХИЧЭЭЛ / ДАСГАЛ — багш ч нэмж болно, гэхдээ ЗӨВХӨН ӨӨРИЙНХӨӨ
 *     оруулсныг засаж, устгана.
 *
 * ⚠ `createdBy = null` бол ЗӨВХӨН АДМИН. Хуучин мөрүүд (энэ багана
 * нэмэгдэхээс өмнөх бүх агуулга) эзэнгүй тул хэн ч засаж болдог байвал
 * анхны хөтөлбөрийг дурын багш өөрчлөх боломжтой болно.
 *
 * ⚠ Эрхийг ЗАМД БИШ, ЭНД шалгана. Есөн route файл тус тусдаа шалгалт
 * бичвэл нэг нь мартагдах нь цаг хугацааны асуудал — тэр нэг нь бүх
 * хамгаалалтыг утгагүй болгоно.
 */

/** Агуулгын мөрийг удирдах эрхтэй эсэх (цэвэр функц). */
export function canManage(
  user: Pick<PublicUser, "uid" | "role">,
  createdBy: string | null
): boolean {
  if (isAdminRole(user.role)) return true;

  // Эзэнгүй мөр = зөвхөн админ (дээрх тайлбар).
  return createdBy !== null && createdBy === user.uid;
}

export type ContentKind = "unit" | "lesson" | "exercise";

const TABLES = {
  unit: { table: units, id: units.id, createdBy: units.createdBy },
  lesson: { table: lessons, id: lessons.id, createdBy: lessons.createdBy },
  exercise: { table: exercises, id: exercises.id, createdBy: exercises.createdBy },
} as const;

/**
 * Мөрийн эзэмшлийг САНГААС уншиж шалгана.
 *
 * @returns `null` = мөр олдсонгүй, `true`/`false` = эрхтэй эсэх
 */
export async function canManageRow(
  user: Pick<PublicUser, "uid" | "role">,
  kind: ContentKind,
  id: string
): Promise<boolean | null> {
  const target = TABLES[kind];

  const [row] = await db
    .select({ createdBy: target.createdBy })
    .from(target.table)
    .where(eq(target.id, id))
    .limit(1);

  if (!row) return null;

  return canManage(user, row.createdBy);
}
