import { NextResponse } from "next/server";

import { badRequest, forbidden, notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { isLinkRelation, unlinkStudent } from "@/lib/api/studentLinks";
import { hasRole, isAdminRole } from "@/lib/permissions";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/students/[uid]?relation=parent|teacher — холбоосыг салгана.
 *
 * ⚠ Сурагчийн БҮРТГЭЛИЙГ УСТГАХГҮЙ, зөвхөн холбоосыг л таслана.
 *
 * `relation` заавал: эцэг эх бөгөөд багш хүн нэг сурагчтай хоёр холбоостой
 * байж болох тул алийг нь салгахыг ил заана.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;
  const { uid } = await context.params;

  const relation = request.nextUrl.searchParams.get("relation");
  if (!isLinkRelation(relation)) return badRequest("Танихгүй үүрэг.");

  if (!hasRole(caller.user!, relation) && !isAdminRole(caller.user!.role)) {
    return forbidden("Энэ холбоосыг салгах эрх танд байхгүй.");
  }

  try {
    // Устгал нь `adultUid`-ээр хязгаарлагдсан тул өөр хүний холбоосыг
    // салгах боломжгүй — олдсонгүй бол зүгээр л 404.
    const removed = await unlinkStudent(caller.uid, uid, relation);
    if (!removed) return notFound("Ийм холбоос олдсонгүй.");

    return NextResponse.json({ removed: true });
  } catch (error) {
    return serverError(error, "Холбоос салгахад алдаа гарлаа");
  }
}
