import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { chessQueue } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Тоглогч хайхаа больж, дараалалаас гарна ("Цуцлах" товч). */
export async function DELETE(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    await db.delete(chessQueue).where(eq(chessQueue.uid, result.caller.uid));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Дараалалаас гарахад алдаа гарлаа");
  }
}
