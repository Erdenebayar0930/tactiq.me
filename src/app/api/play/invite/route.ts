import { eq, lt, or } from "drizzle-orm";
import { parsePlayGame } from "@/lib/tactiq/playGame";
import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { chessInvites } from "@/lib/db/schema";
import { INVITE_TTL_MS, newInviteCode } from "@/lib/chess/invite";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Найзыг урих холбоос үүсгэх.
 *
 * ⚠ Урьсан тал ЯМАГТ цагаан: `/api/play/queue/join`-той ижил дүрэм тул
 * `/api/play/queue/status` polling, `webrtc.ts`-ийн "цагаан нь offerer"
 * гэсэн таамаглал хоёулаа өөрчлөлтгүй ажиллана.
 *
 * ⚠ `game` нь холбоосонд ШИНГЭНЭ, хүлээж авах үед асуухгүй: найз нь
 * «шатар уу, даам уу» гэж сонгох шаардлагагүй — урьсан хүн юу тоглохоо
 * аль хэдийн шийдсэн.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;
  const body = (await request.json().catch(() => ({}))) as { game?: unknown };
  const game = parsePlayGame(body.game);

  try {
    // Хугацаа дууссан мөрүүд, мөн миний ӨМНӨХ хүлээгдэж буй урилга —
    // нэг хүнд нэг л амьд холбоос байлгана, эс бөгөөс хуучин холбоосоор
    // ирсэн найз "хүлээж байна" гэсэн хэн ч харахгүй өрөө үүсгэнэ.
    await db
      .delete(chessInvites)
      .where(or(lt(chessInvites.expiresAt, new Date()), eq(chessInvites.hostUid, caller.uid)));

    const code = newInviteCode();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await db.insert(chessInvites).values({ code, hostUid: caller.uid, expiresAt, game });

    return NextResponse.json({ code, expiresAt: expiresAt.toISOString(), game });
  } catch (error) {
    return serverError(error, "Урилга үүсгэхэд алдаа гарлаа");
  }
}
