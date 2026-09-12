import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { listSkills } from "@/lib/api/skills";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/me/skills — ЭХЭЛСЭН курс тус бүрийн эзэмшилт.
 *
 * ⚠ Хараахан юу ч эхлээгүй хэрэглэгчид ХООСОН массив буцна (алдаа БИШ) —
 * клиент тэр үед "эхлээгүй байна" гэсэн урамшуулах мессеж харуулна.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json({ skills: await listSkills(result.caller.uid) });
  } catch (error) {
    return serverError(error, "Ур чадварын мэдээлэл уншихад алдаа гарлаа");
  }
}
