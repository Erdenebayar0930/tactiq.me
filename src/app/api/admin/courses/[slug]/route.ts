import { NextResponse } from "next/server";

import { badRequest, notFound, requireAdmin, requireContentEditor, serverError } from "@/lib/api/auth";
import { cleanSchools, cleanText, cleanTitle, isValidStatus } from "@/lib/api/courseAdmin";
import { deleteCourse, getAdminCourse, updateCourse } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Нэг курс, БҮХ давхаргаараа (нэгж→хичээл→дасгал) — `/admin/courses/[slug]` засварлах дэлгэц. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  /*
   * ⚠ УНШИХ нь багшид ч нээлттэй (`requireContentEditor`) — тэд нэгж,
   * хичээл нэмэхийн тулд курсээ харах ёстой. Харин ҮҮСГЭХ, ЗАСАХ,
   * УСТГАХ нь доор `requireAdmin` хэвээр.
   */
  const result = await requireContentEditor(request);
  if ("error" in result) return result.error;

  const { slug } = await params;

  try {
    const course = await getAdminCourse(slug);
    if (!course) return notFound("Курс олдсонгүй.");
    return NextResponse.json({ course });
  } catch (error) {
    return serverError(error, "Курс татахад алдаа гарлаа");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const { slug } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const patch: Partial<{
      title: string;
      titleEn: string;
      description: string;
      descriptionEn: string;
      icon: string;
      color: string;
      status: string;
      sortOrder: number;
      school: string;
      schools: string[];
    }> = {};

    if (body.title !== undefined) {
      const title = cleanTitle(body.title, 120);
      if (!title) return badRequest("Гарчиг хоосон байж болохгүй.");
      patch.title = title;
    }
    // Англи гарчиг — ЗААВАЛ БИШ. Хоосон бол англи горимд монгол нь
    // харагдана (`lib/i18n/content.ts`).
    if (body.titleEn !== undefined) patch.titleEn = cleanTitle(body.titleEn, 120);
    if (body.description !== undefined) patch.description = cleanText(body.description, 500);
    if (body.descriptionEn !== undefined) {
      patch.descriptionEn = cleanText(body.descriptionEn, 500);
    }
    if (body.icon !== undefined) patch.icon = cleanText(body.icon, 32) || "book";
    if (body.color !== undefined) patch.color = cleanText(body.color, 16) || "violet";
    if (body.status !== undefined) {
      if (!isValidStatus(body.status)) return badRequest("Танихгүй төлөв.");
      patch.status = body.status;
    }
    /*
     * Сургуулиуд — `schools` (олон) эсвэл хуучин `school` (ганц).
     *
     * ⚠ Хоёр баганыг ҮРГЭЛЖ хамт бичнэ: `school` нь `schools[0]` байх ёстой
     * (гэрчилгээ, ур чадвар үүнийг уншдаг) — тусад нь бичвэл хоёр зөрнө.
     */
    if (body.schools !== undefined || body.school !== undefined) {
      const schools = cleanSchools(body.schools ?? body.school);
      patch.schools = schools;
      patch.school = schools[0] ?? "";
    }
    if (body.sortOrder !== undefined) {
      const order = Number(body.sortOrder);
      if (Number.isFinite(order)) patch.sortOrder = order;
    }

    await updateCourse(slug, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Курс хадгалахад алдаа гарлаа");
  }
}

/** Курс + доторх бүх нэгж/хичээл/дасгал (DB cascade-аар). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const { slug } = await params;

  try {
    await deleteCourse(slug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Курс устгахад алдаа гарлаа");
  }
}
