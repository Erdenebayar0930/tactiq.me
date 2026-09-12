import { NextResponse } from "next/server";

import { badRequest, requireAdmin, serverError } from "@/lib/api/auth";
import { reorderCourses } from "@/lib/db/courses";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Курсуудын дарааллыг хадгална — `{ slugs: ["chess", "checkers", …] }`.
 *
 * ⚠ БҮТЭН жагсаалтыг хүлээж авна, ганц курсын шинэ байрлалыг БИШ:
 * сервер тал ирсэн дарааллаар нь 0,1,2… гэж дахин дугаарлана
 * (`reorderCourses`). Ингэснээр дараалал нь ЯМАГТ клиент дээр харагдаж
 * байгаатай яг таарна — «нэг курс дээшлүүлэх» гэсэн хэсэгчилсэн
 * командууд нь давхардсан `sortOrder`-той хуучин мөрүүд дээр
 * урьдчилан таашгүй үр дүн өгдөг.
 *
 * ⚠ Зөвхөн АДМИН: багш нэгж, хичээлээ л удирдана, курсын дарааллыг биш.
 */
export async function POST(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const body = await request.json().catch(() => ({}));
    const slugs = Array.isArray(body.slugs) ? body.slugs : null;

    if (!slugs || slugs.length === 0 || !slugs.every((slug: unknown) => typeof slug === "string")) {
      return badRequest("Курсын жагсаалт буруу байна.");
    }
    if (new Set(slugs).size !== slugs.length) {
      return badRequest("Жагсаалтад давхардсан курс байна.");
    }

    await reorderCourses(slugs as string[]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Дарааллыг хадгалахад алдаа гарлаа");
  }
}
