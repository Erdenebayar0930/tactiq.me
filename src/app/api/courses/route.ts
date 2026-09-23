import { NextResponse } from "next/server";

import { serverError } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rateLimit";
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
 *
 * ⚠ НЭВТРЭЛТ ШААРДАХГҮЙ. Курсын жагсаалт нь ЗАРЛАЛ: «энэ сайт дээр юу
 * сурч болох вэ». Түүнийг нэвтрэлтийн цаана хийвэл нэвтрээгүй хүн
 * «Нэвтэрсэн байх шаардлагатай» гэсэн хоосон хайрцаг хараад буцна —
 * яг тэр эвдрэл /courses дээр байсан.
 *
 * ⚠ ХУВИЙН ӨГӨГДӨЛ ОГТ АГУУЛААГҮЙ: курсын мета (нэр, дүрс, төлөв) л
 * буцна. Сурагчийн ахиц, зарцуулсан цаг нь ТУСДАА хаягаар
 * (`/api/courses/stats`, `/api/courses/time`) ирэх ба тэднийг клиент
 * зочны үед ОГТ дуудахгүй (`(app)/courses/page.tsx`).
 *
 * ⚠ ХУРДНЫ ХЯЗГААР нэмэв: нээлттэй хаяг тул кэш хоосорсон мөчид
 * (60 секунд тутам) олон зэрэг хүсэлт Postgres руу хүрч болно.
 */
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, {
    name: "courses-catalog",
    limit: 120,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const courses = await cacheGetOrSet(COURSES_CATALOG_CACHE_KEY, 60_000, () =>
      listCourseMetas()
    );
    return NextResponse.json({ courses });
  } catch (error) {
    return serverError(error, "Курсын жагсаалт татахад алдаа гарлаа");
  }
}
