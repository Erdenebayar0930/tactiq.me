import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { devices } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Төхөөрөмжийг устгана — зөвхөн ӨӨРИЙНХӨӨ. Слот суллах шаардлагатай үед
 * (жишээ нь 4 дэх төхөөрөмжөөс нэвтрэхийг оролдох) энэ route-оор хуучин
 * төхөөрөмжөө хасаад дараагийн оролдлого амжилттай болно.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const [device] = await db
      .select({ id: devices.id })
      .from(devices)
      .where(and(eq(devices.id, id), eq(devices.uid, result.caller.uid)))
      .limit(1);

    if (!device) return notFound("Ийм төхөөрөмж олдсонгүй.");

    await db.delete(devices).where(eq(devices.id, id));

    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Төхөөрөмж устгахад алдаа гарлаа");
  }
}
