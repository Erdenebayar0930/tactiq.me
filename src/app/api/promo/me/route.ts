import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { getPromoStats } from "@/lib/api/promo";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Сурталчлагчийн өөрийн самбар — код, борлуулалт, олсон шимтгэл, үлдэгдэл.
 *
 * ⚠ ЗӨВХӨН ӨӨРИЙНХӨӨ мэдээллийг өгнө (`caller.uid`). Хэрэглэгчийн ID-г
 * параметрээр авбал хэн ч бусдын орлогыг харна.
 *
 * Кодгүй хэрэглэгчид ХООСОН жагсаалт буцаана — 404 БИШ: хуудас нь
 * "та хараахан сурталчлагч биш" гэсэн тайлбар харуулах ёстой.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const stats = await getPromoStats(result.caller.uid);
    return NextResponse.json(stats);
  } catch (error) {
    return serverError(error, "Мэдээлэл татахад алдаа гарлаа");
  }
}
