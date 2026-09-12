import { NextResponse } from "next/server";

import { badRequest, notFound, requireAdmin, serverError } from "@/lib/api/auth";
import { cacheDelete, SCHOOLS_TEXT_CACHE_KEY } from "@/lib/api/cache";
import {
  cleanSchoolField,
  cleanTopicGroups,
  getSchoolTexts,
  isKnownSchool,
} from "@/lib/api/schools";
import { resetSchoolText, saveSchoolText } from "@/lib/db/schools";

import type { SchoolTextPatch } from "@/lib/db/schools";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Сургуулийн ТЕКСТИЙГ засна — нэр, тайлбар, сэдвүүд.
 *
 * ⚠ Сургуулийг НЭМЭХ, УСТГАХ, ДАРААЛЛЫГ өөрчлөх route ЗОРИУД байхгүй.
 * Жагсаалт нь `lib/tactiq/schools.ts`-д кодод — дүрс нь React компонент,
 * өнгө нь Tailwind-ийн сканнерддаг класс текст тул өгөгдлийн сангаас
 * уншиж болохгүй. Мөн ингэснээр админ санамсаргүй сургууль устгаад нүүр
 * хуудсыг цоорхойтой болгох боломжгүй.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const { slug } = await params;
  if (!isKnownSchool(slug)) return notFound("Тийм сургууль байхгүй.");

  try {
    const body = await request.json().catch(() => ({}));

    /*
     * ⚠ Зөвхөн ИРСЭН талбарыг бичнэ. `body`-д байхгүй талбарыг `null`
     * гэж бичвэл нэрийг засахад тайлбар нь анхдагч руугаа унах болно.
     */
    const patch: SchoolTextPatch = {};

    if (body.title !== undefined) patch.title = cleanSchoolField(body.title, "title");
    if (body.subtitle !== undefined) {
      patch.subtitle = cleanSchoolField(body.subtitle, "subtitle");
    }
    if (body.tagline !== undefined) patch.tagline = cleanSchoolField(body.tagline, "tagline");
    if (body.description !== undefined) {
      patch.description = cleanSchoolField(body.description, "description");
    }
    if (body.groups !== undefined) patch.groups = cleanTopicGroups(body.groups);

    if (Object.keys(patch).length === 0) {
      return badRequest("Засах талбар илгээгээгүй байна.");
    }

    await saveSchoolText(slug, patch);
    // Засвар нь нүүр хуудас, цэс, лигийн нэрэнд шууд гарах ёстой.
    await cacheDelete(SCHOOLS_TEXT_CACHE_KEY);

    const texts = await getSchoolTexts();
    return NextResponse.json({ text: texts.find((item) => item.slug === slug) ?? null });
  } catch (error) {
    return serverError(error, "Сургуулийн текст хадгалахад алдаа гарлаа");
  }
}

/** Засварыг бүрэн авч, сургуулийг кодын анхдагч текст руу буцаана. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const { slug } = await params;
  if (!isKnownSchool(slug)) return notFound("Тийм сургууль байхгүй.");

  try {
    await resetSchoolText(slug);
    await cacheDelete(SCHOOLS_TEXT_CACHE_KEY);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Анхдагч руу буцаахад алдаа гарлаа");
  }
}
