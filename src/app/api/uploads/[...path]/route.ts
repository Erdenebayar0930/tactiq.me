import { readUpload } from "@/lib/api/uploads";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/uploads/<хавтас>/<файл> — байршуулсан зургийг өгнө.
 *
 * ⚠ НЭВТРЭЛТ ШААРДАХГҮЙ: профайл зураг, лого нь тэргүүлэгчид, багшийн
 * жагсаалт зэрэг нийтийн дэлгэцэнд гардаг. Файлын нэр санамсаргүй тул
 * таах боломжгүй.
 *
 * ⚠ `immutable`: файл бүр шинэ нэртэй хадгалагддаг, хэзээ ч дарж
 * бичигдэхгүй тул хөтөч жилээр кэшилнэ.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const found = await readUpload(path);
  if (!found) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(found.data), {
    headers: {
      "Content-Type": found.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      // Төрлийг таамаглахгүй — зураг биш гэж хөтөч дахин тайлбарлахаас сэргийлнэ.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
