import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { achievementsView } from "@/lib/api/achievements";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/me/achievements — амжилтын тэмдгүүд ба явц.
 *
 * ⚠ ЭНЭ ROUTE ЮУ Ч БИЧИХГҮЙ. Тэмдгүүд нь санд хадгалагддаггүй, харах бүрд
 * үзүүлэлтээс шинээр тооцогдоно (`lib/tactiq/achievements.ts` дээрх
 * шалтгааныг үзнэ үү).
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json(await achievementsView(result.caller.uid));
  } catch (error) {
    return serverError(error, "Амжилтын мэдээлэл уншихад алдаа гарлаа");
  }
}
