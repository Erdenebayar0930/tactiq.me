import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { COURSES_CATALOG_CACHE_KEY, cacheGetOrSet } from "@/lib/api/cache";
import { listCourseMetas } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Бүх курсын мета мэдээлэл (нэгж/хичээлгүй) — `/courses` сонголтын
 * дэлгэц, толгой хэсгийн курс-товч.
 *
 * Хэрэглэгч бүрд ИЖИЛ (хувийн бус) агуулга тул `cacheGetOrSet`-ээр 60
 * секундэд НЭГ л удаа Postgres-руу хандана — админ курс/хичээл засахад
 * шинэ утга 60 секундийн дотор автоматаар харагдана (тодорхой invalidation
 * зориудаар нэмээгүй, `lib/api/cache.ts`-ийн comment-ийг үзнэ үү).
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const courses = await cacheGetOrSet(COURSES_CATALOG_CACHE_KEY, 60_000, () =>
      listCourseMetas()
    );
    return NextResponse.json({ courses });
  } catch (error) {
    return serverError(error, "Курсын жагсаалт татахад алдаа гарлаа");
  }
}
