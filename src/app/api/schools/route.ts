import { NextResponse } from "next/server";

import { getSchoolTexts } from "@/lib/api/schools";

export const runtime = "nodejs";

/**
 * Сургуулийн текстийн засвар — НИЙТЭД нээлттэй.
 *
 * ⚠ Зөвхөн ТЕКСТ буцаана, бүрэн сургуулийг БИШ: дүрс нь React компонент
 * тул JSON-оор дамжуулах боломжгүй. Клиент өөрөө кодын `SCHOOLS`-тай
 * `mergeSchoolTexts`-ээр нийлүүлнэ (`context/SchoolsContext.tsx`).
 *
 * Хэрэглэгчээс хамаарах өгөгдөл огт агуулаагүй тул нэвтрэлт шаардахгүй —
 * эдгээр нь нүүр хуудсанд аль хэдийн нийтэд харагддаг текстүүд.
 */
export async function GET() {
  const texts = await getSchoolTexts();

  return NextResponse.json(
    { texts },
    {
      // Сангийн давхаргад аль хэдийн 5 минутын кэш байна; CDN/браузерт бас
      // зөвшөөрснөөр цэс зурах хүсэлт бүр сервер хүртэл ирэхгүй.
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    }
  );
}
