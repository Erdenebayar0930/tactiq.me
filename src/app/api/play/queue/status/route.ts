import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { chessRooms } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Хайж байна…" дэлгэц polling хийдэг route.
 *
 * Хэрэв өөр хэн нэгний `join` дуудлага намайг барьсан бол (`chessRooms`-д
 * `whiteUid = намайг` гэсэн шинэ мөр гарч ирнэ — намайг барьсан тал
 * ЯМАГТ "white" болно, харна уу `join/route.ts`), тэр өрөөг олж буцаана.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const [room] = await db
      .select({ id: chessRooms.id })
      .from(chessRooms)
      .where(and(eq(chessRooms.whiteUid, caller.uid), eq(chessRooms.status, "active")))
      .orderBy(desc(chessRooms.createdAt))
      .limit(1);

    if (!room) return NextResponse.json({ matched: false });

    return NextResponse.json({ matched: true, roomId: room.id, color: "white" });
  } catch (error) {
    return serverError(error, "Тоглогчийн явцыг шалгахад алдаа гарлаа");
  }
}
