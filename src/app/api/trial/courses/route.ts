import { NextResponse } from "next/server";

import { serverError } from "@/lib/api/auth";
import { cacheGetOrSet } from "@/lib/api/cache";
import { listCourseMetas } from "@/lib/db/courses";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ЗОЧНЫ КУРСЫН ЖАГСААЛТ — нэвтрэлтгүй.
 *
 * ⚠ Зөвхөн ТАНИЛЦУУЛГА: нэр, тайлбар, дүрс, хичээлийн тоо. Энэ мэдээлэл
 * маркетингийн нүүр хуудсанд аль хэдийн нийтийн байдаг тул нуух утгагүй —
 * харин хичээлийн АГУУЛГА нь `/api/trial/lessons/[id]`-аар л гарах бөгөөд
 * тэр нь туршилтын хичээлүүдээс өөрийг татгалздаг.
 *
 * ⚠ Идэвхгүй курс ГАРАХГҮЙ: админ ноорхойг нь `draft` төлөвт үлдээдэг.
 */
export async function GET() {
  try {
    const courses = await cacheGetOrSet("trial:courses", 60_000, async () => {
      const all = await listCourseMetas();
      return all.filter((course) => course.status === "active");
    });

    return NextResponse.json({ courses });
  } catch (error) {
    return serverError(error, "Курсын жагсаалт татахад алдаа гарлаа");
  }
}
