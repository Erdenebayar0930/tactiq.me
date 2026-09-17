import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { pushTokens } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ТӨХӨӨРӨМЖИЙН PUSH ТОКЕН бүртгэх / устгах.
 *
 * ⚠ ТОКЕН нь НУУЦ БИШ, гэхдээ ХУВИЙН: түүгээр тухайн төхөөрөмж рүү
 * мэдэгдэл илгээж болно. Тиймээс зөвхөн НЭВТЭРСЭН хэрэглэгч өөрийнхөө
 * токеныг бүртгэнэ — эс тэгвэл хэн ч өөр хүний токеныг өөрийн нэр дээр
 * бүртгэж, түүний мэдэгдлийг хулгайлж чадна.
 *
 * ⚠ ТОКЕН ДАВХАРДВАЛ ЭЗЭМШИГЧ нь СОЛИГДОНО (`onConflictDoUpdate`):
 * нэг төхөөрөмж дээр хэрэглэгч гарч, өөр хүн нэвтрэхэд FCM нь ИЖИЛ
 * токеныг өгдөг. Хуучин эзэмшигч дээр үлдээвэл шинэ хэрэглэгчийн
 * мэдэгдэл хуучин хүнд очно.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const body = (await request.json().catch(() => ({}))) as {
    token?: unknown;
    label?: unknown;
  };

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 512) {
    return NextResponse.json({ error: "Токен буруу байна." }, { status: 400 });
  }

  const label =
    typeof body.label === "string" ? body.label.trim().slice(0, 64) : "";

  try {
    const now = new Date();
    await db
      .insert(pushTokens)
      .values({ uid: result.caller.uid, token, label, lastSeenAt: now })
      .onConflictDoUpdate({
        target: pushTokens.token,
        set: { uid: result.caller.uid, label, lastSeenAt: now },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Токен бүртгэхэд алдаа гарлаа");
  }
}

/** Мэдэгдэл унтраах — ЭНЭ төхөөрөмжийн токеныг устгана. */
export async function DELETE(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token шаардлагатай." }, { status: 400 });

  try {
    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.token, token), eq(pushTokens.uid, result.caller.uid)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Токен устгахад алдаа гарлаа");
  }
}
