import { NextResponse } from "next/server";

import { badRequest, forbidden, notFound, requireContentEditor, serverError } from "@/lib/api/auth";
import { canManageRow } from "@/lib/api/contentAccess";
import { cleanText, validateExerciseFields } from "@/lib/api/courseAdmin";
import {
  deleteExercise,
  getCourseSlugForExercise,
  updateExercise,
} from "@/lib/db/courses";
import { allowedExerciseTypes } from "@/lib/tactiq/courseNav";

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
  const allowed = await canManageRow(result.caller.user!, "exercise", id);
  if (allowed === null) return notFound("Дасгал олдсонгүй.");
  if (!allowed) return forbidden("Зөвхөн өөрийн оруулсан дасгал засах боломжтой.");

  try {
    const body = await request.json().catch(() => ({}));
    const patch: Partial<{
      prompt: string;
      promptEn: string;
      type:
        | "choice"
        | "board-move"
        | "draughts-move"
        | "draughts-puzzle"
        | "chess-puzzle"
        | "net-puzzle"
        | "slide-puzzle"
        | "sudoku"
        | "code-maze"
        | "go-move"
        | "memory-game"
        | "piano-play"
        | "rhythm-tap";
      options: { id: string; label: string }[] | null;
      optionsEn: { id: string; label: string }[] | null;
      correctOptionId: string | null;
      fen: string | null;
      correctFrom: string | null;
      correctTo: string | null;
      correctPromotion: string | null;
      grid: string | null;
      solution: string | null;
      melody: string | null;
      tempoBpm: number | null;
      meter: string | null;
      explanation: string;
      explanationEn: string;
      sortOrder: number;
    }> = {};

    if (body.prompt !== undefined) {
      const prompt = cleanText(body.prompt, 500);
      if (!prompt) return badRequest("Асуулт хоосон байж болохгүй.");
      patch.prompt = prompt;
    }

    // Төрөл эсвэл түүний талбарууд аль нэг нь ирвэл БҮГДИЙГ (тухайн
    // төрлийн) ХАМТ дахин шалгаж бичнэ — хагас шинэчлэлт (жишээ нь зөвхөн
    // `fen` шинэчлээд `correctFrom` хуучин хэвээр) зөрчилтэй мөр үлдээхээс
    // сэргийлнэ.
    if (
      body.type !== undefined ||
      body.options !== undefined ||
      body.correctOptionId !== undefined ||
      body.fen !== undefined ||
      body.correctFrom !== undefined ||
      body.correctTo !== undefined ||
      body.correctPromotion !== undefined ||
      body.melody !== undefined ||
      body.tempoBpm !== undefined ||
      body.meter !== undefined ||
      body.solution !== undefined ||
      body.grid !== undefined
    ) {
      const fields = validateExerciseFields(body);
      if (!fields) {
        return badRequest(
          "Дасгалын мэдээлэл дутуу эсвэл буруу байна (сонголтууд/зөв хариулт, FEN/нүүдэл, бодлогын шийдэл, эсвэл ая)."
        );
      }
      // Үүсгэх route-ийн адил шалгалт — засварлаж байгаад төрлийг курстэй
      // үл нийцэх утга руу солихоос сэргийлнэ.
      const courseSlug = await getCourseSlugForExercise(id);
      const allowed = allowedExerciseTypes(courseSlug);
      if (!allowed.includes(fields.type)) {
        return badRequest(
          `Энэ курст "${fields.type}" төрлийн дасгал тохирохгүй. Зөвшөөрөгдөх: ${allowed.join(", ")}.`
        );
      }

      Object.assign(patch, fields);
    }

    if (body.explanation !== undefined) patch.explanation = cleanText(body.explanation, 500);
    // Англи хувилбарууд — хоосон мөр нь «орчуулга алга» гэсэн хүчинтэй утга
    // тул `undefined`-тай хутгахгүйгээр тусад нь шалгана.
    if (body.promptEn !== undefined) patch.promptEn = cleanText(body.promptEn, 500);
    if (body.explanationEn !== undefined) {
      patch.explanationEn = cleanText(body.explanationEn, 500);
    }
    if (body.sortOrder !== undefined) {
      const order = Number(body.sortOrder);
      if (Number.isFinite(order)) patch.sortOrder = order;
    }

    await updateExercise(id, patch);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Дасгал хадгалахад алдаа гарлаа");
  }
}

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
  const allowed = await canManageRow(result.caller.user!, "exercise", id);
  if (allowed === null) return notFound("Дасгал олдсонгүй.");
  if (!allowed) return forbidden("Зөвхөн өөрийн оруулсан дасгал засах боломжтой.");

  try {
    await deleteExercise(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Дасгал устгахад алдаа гарлаа");
  }
}
