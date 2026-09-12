import { NextResponse } from "next/server";

import { forbidden, requireActiveUser, serverError } from "@/lib/api/auth";
import { isLinkedStudent } from "@/lib/api/studentLinks";
import { listSkills } from "@/lib/api/skills";
import { isAdminRole } from "@/lib/permissions";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/students/[uid]/courses — сурагчийн КУРС ТУС БҮРИЙН явц.
 *
 * ⚠ ХОЛБООСЫГ ЗААВАЛ ШАЛГАНА. Энэ route нь сурагчийн `uid`-ыг ШУУД авдаг
 * тул `listLinkedStudents`-ийн "үргэлж `adultUid`-ээр шүүнэ" гэсэн
 * хамгаалалт энд ажиллахгүй — шалгалтгүй бол хэн ч дурын uid таамаглаад
 * хүүхдийн явцыг харна.
 *
 * ⚠ Хариу нь `listSkills`-ийнхтэй ЯГ ИЖИЛ бүтэцтэй (курс, дуусгасан
 * хичээл, XP, зарцуулсан цаг) — сурагч өөрөө профайл дээрээ хардаг ЯГ
 * ТЭР мэдээлэл. Эцэг эхэд НЭМЭЛТ юу ч өгөхгүй.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;
  const { uid } = await context.params;

  try {
    /*
     * Админ нь хяналтын зорилгоор нэвтэрч чадна (`/admin`-тай ижил дүрэм),
     * бусад бүх хүн ЗӨВХӨН холбогдсон хүүхдээ.
     */
    const allowed =
      isAdminRole(caller.user!.role) || (await isLinkedStudent(caller.uid, uid));

    if (!allowed) return forbidden("Энэ сурагчийн мэдээллийг харах эрх танд байхгүй.");

    return NextResponse.json({ courses: await listSkills(uid) });
  } catch (error) {
    return serverError(error, "Сурагчийн курсын мэдээлэл уншихад алдаа гарлаа");
  }
}
