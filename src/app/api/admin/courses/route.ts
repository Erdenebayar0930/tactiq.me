import { NextResponse } from "next/server";

import { badRequest, requireAdmin, requireContentEditor, serverError } from "@/lib/api/auth";
import { cleanText, cleanSchools, cleanTitle, isValidSlug, isValidStatus } from "@/lib/api/courseAdmin";
import { courseExists, createCourse, listAdminCourses } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Бүх курс (идэвхтэй + тун удахгүй аль аль) — `/admin/courses` жагсаалт. */
export async function GET(request: NextRequest) {
  /*
   * ⚠ УНШИХ нь багшид ч нээлттэй (`requireContentEditor`) — тэд нэгж,
   * хичээл нэмэхийн тулд курсээ харах ёстой. Харин ҮҮСГЭХ, ЗАСАХ,
   * УСТГАХ нь доор `requireAdmin` хэвээр.
   */
  const result = await requireContentEditor(request);
  if ("error" in result) return result.error;

  try {
    const courses = await listAdminCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    return serverError(error, "Курсын жагсаалт татахад алдаа гарлаа");
  }
}

/** Шинэ курс үүсгэнэ — `slug` цагаан толгойн жижиг үсэг/тоо/зураас, өвөрмөц байх ёстой. */
export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const body = await request.json().catch(() => ({}));

    const slug = String(body.slug ?? "").trim().toLowerCase();
    if (!isValidSlug(slug)) {
      return badRequest("Slug зөвхөн жижиг үсэг, тоо, зураас агуулж, 1-32 тэмдэгт байх ёстой.");
    }
    if (await courseExists(slug)) {
      return badRequest("Энэ slug-тай курс аль хэдийн байна.");
    }

    const title = cleanTitle(body.title, 120);
    if (!title) return badRequest("Гарчиг заавал бөглөнө үү.");

    const status = isValidStatus(body.status) ? body.status : "coming-soon";
    // Олон сургууль — хуучин клиентийн ганц `school`-ыг ч хүлээн авна.
    const schools = cleanSchools(body.schools ?? body.school);

    await createCourse({
      slug,
      title,
      // Англи хувилбарууд — ЗААВАЛ БИШ (`lib/i18n/content.ts`).
      titleEn: cleanTitle(body.titleEn, 120),
      description: cleanText(body.description, 500),
      descriptionEn: cleanText(body.descriptionEn, 500),
      icon: cleanText(body.icon, 32) || "book",
      color: cleanText(body.color, 16) || "violet",
      status,
      // Үндсэн сургууль = эхнийх (`courses.school`-ийн тайлбар).
      school: schools[0] ?? "",
      schools,
    });

    return NextResponse.json({ slug }, { status: 201 });
  } catch (error) {
    return serverError(error, "Курс үүсгэхэд алдаа гарлаа");
  }
}
