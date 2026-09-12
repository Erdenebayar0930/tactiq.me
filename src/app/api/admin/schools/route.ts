import { NextResponse } from "next/server";

import { requireAdmin, serverError } from "@/lib/api/auth";
import { getSchoolTexts } from "@/lib/api/schools";
import { SCHOOLS } from "@/lib/tactiq/schools";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Админы засварлах дэлгэцэд хэрэгтэй БҮХ мэдээлэл.
 *
 * Анхдагч (кодын) утгыг ч хамт буцаана — админ талбарыг хоослоход юу
 * харагдахыг дэлгэц дээр шууд харуулах, мөн «анхдагч руу буцаах» товчийг
 * ойлгомжтой болгох зорилготой.
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const texts = await getSchoolTexts();
    const bySlug = new Map(texts.map((text) => [text.slug, text]));

    const schools = SCHOOLS.map((school) => ({
      slug: school.slug,
      defaults: {
        title: school.title,
        subtitle: school.subtitle,
        tagline: school.tagline,
        description: school.description,
        groups: school.groups,
      },
      override: bySlug.get(school.slug) ?? null,
    }));

    return NextResponse.json({ schools });
  } catch (error) {
    return serverError(error, "Сургуулийн текст татахад алдаа гарлаа");
  }
}
