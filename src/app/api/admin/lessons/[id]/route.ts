import { NextResponse } from "next/server";

import { badRequest, forbidden, notFound, requireContentEditor, serverError } from "@/lib/api/auth";
import { canManageRow } from "@/lib/api/contentAccess";
import { cleanTitle } from "@/lib/api/courseAdmin";
import { deleteLesson, updateLesson } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireContentEditor(request);
  if ("error" in result) return result.error;

  const { id } = await params;

  /*
   * ⚠ ЭЗЭМШЛИЙН ШАЛГАЛТ. `requireContentEditor` нь зөвхөн "агуулга нэмэх
   * эрхтэй юу" гэдгийг хэлнэ; ЭНЭ МӨРИЙГ хөндөж болох эсэхийг тусад нь
   * шалгах ЁСТОЙ — багш зөвхөн өөрийн оруулсныг л засаж, устгана
   * (`lib/api/contentAccess.ts`).
   *
   * ⚠ Олдоогүй ба эрхгүй хоёрыг ЯЛГАНА: агуулга нь нийтэд харагддаг тул
   * "байхгүй" гэж далдлах шаардлагагүй бөгөөд багшид "яагаад засаж
   * чадахгүй байна" гэдгийг ойлгуулах хэрэгтэй.
   */
  const allowed = await canManageRow(result.caller.user!, "lesson", id);
  if (allowed === null) return notFound("Хичээл олдсонгүй.");
  if (!allowed) return forbidden("Зөвхөн өөрийн оруулсан хичээл засах боломжтой.");

  try {
    const body = await request.json().catch(() => ({}));
    const patch: Partial<{
      title: string;
      titleEn: string;
      xpReward: number;
      sortOrder: number;
    }> = {};

    if (body.title !== undefined) {
      const title = cleanTitle(body.title, 160);
      if (!title) return badRequest("Гарчиг хоосон байж болохгүй.");
      patch.title = title;
    }
    // Англи гарчиг — ЗААВАЛ БИШ. Хоосон бол англи горимд монгол нь
    // харагдана (`lib/i18n/content.ts`).
    if (body.titleEn !== undefined) patch.titleEn = cleanTitle(body.titleEn, 160);
    if (body.xpReward !== undefined) {
      const xp = Number(body.xpReward);
      if (Number.isFinite(xp)) patch.xpReward = Math.max(0, xp);
    }
    if (body.sortOrder !== undefined) {
      const order = Number(body.sortOrder);
      if (Number.isFinite(order)) patch.sortOrder = order;
    }

    await updateLesson(id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Хичээл хадгалахад алдаа гарлаа");
  }
}

/**
 * Хичээл + доторх бүх дасгал (DB cascade-аар).
 *
 * ⚠ Хэрэглэгчдийн `lessonProgress` мөрүүд ХЭВЭЭР ҮЛДЭНЭ (энэ хичээлтэй
 * гадаад түлхүүргүй, зориудаар — `lib/db/schema.ts`-ийн `lessonProgress`
 * комментыг үзнэ үү) — устгасан ч хэрэглэгчийн авсан оноо, түүх алдагдахгүй.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireContentEditor(request);
  if ("error" in result) return result.error;

  const { id } = await params;

  /*
   * ⚠ ЭЗЭМШЛИЙН ШАЛГАЛТ. `requireContentEditor` нь зөвхөн "агуулга нэмэх
   * эрхтэй юу" гэдгийг хэлнэ; ЭНЭ МӨРИЙГ хөндөж болох эсэхийг тусад нь
   * шалгах ЁСТОЙ — багш зөвхөн өөрийн оруулсныг л засаж, устгана
   * (`lib/api/contentAccess.ts`).
   *
   * ⚠ Олдоогүй ба эрхгүй хоёрыг ЯЛГАНА: агуулга нь нийтэд харагддаг тул
   * "байхгүй" гэж далдлах шаардлагагүй бөгөөд багшид "яагаад засаж
   * чадахгүй байна" гэдгийг ойлгуулах хэрэгтэй.
   */
  const allowed = await canManageRow(result.caller.user!, "lesson", id);
  if (allowed === null) return notFound("Хичээл олдсонгүй.");
  if (!allowed) return forbidden("Зөвхөн өөрийн оруулсан хичээл засах боломжтой.");

  try {
    await deleteLesson(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Хичээл устгахад алдаа гарлаа");
  }
}
