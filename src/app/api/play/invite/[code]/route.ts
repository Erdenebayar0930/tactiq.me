import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { badRequest, notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { getOpponentInfo } from "@/lib/api/chess";
import { db } from "@/lib/db";
import { chessInvites, chessRooms } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const normalize = (code: string) => code.trim().toUpperCase();

/**
 * Урилгын төлөв.
 *
 * ХОЁР дуудагчид үйлчилнэ: урьсан тал үүнийг polling хийж найзаа ирэхийг
 * хүлээнэ, урисан хүн нь мөн адил "хэн урьсан бэ"-г үзэж байж зөвшөөрнө.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { code } = await params;

  try {
    const [invite] = await db
      .select()
      .from(chessInvites)
      .where(eq(chessInvites.code, normalize(code)))
      .limit(1);

    if (!invite) return notFound("Урилга олдсонгүй эсвэл хугацаа нь дууссан байна.");
    if (invite.expiresAt.getTime() < Date.now()) {
      return notFound("Урилгын хугацаа дууссан байна.");
    }

    const host = await getOpponentInfo(invite.hostUid);

    return NextResponse.json({
      code: invite.code,
      host,
      isHost: invite.hostUid === result.caller.uid,
      roomId: invite.roomId,
      // Гурав дахь хүн (аль хэдийн дүүрсэн урилгын холбоос дамжсан)
      // тоглолтод орох боломжгүйг клиент тал ойлгомжтой хэлнэ.
      accepted: invite.roomId !== null,
    });
  } catch (error) {
    return serverError(error, "Урилгыг уншихад алдаа гарлаа");
  }
}

/**
 * Урилгыг ХҮЛЭЭН АВАХ — өрөө үүсгэнэ (урьсан тал цагаан, ирсэн тал хар).
 *
 * ⚠ `roomId IS NULL` нөхцөлийг UPDATE-ийн WHERE дотор шалгана: хоёр хүн ЯГ
 * НЭГ ЗЭРЭГ нэг холбоос дээр дарвал зөвхөн НЭГ нь мөрийг эзэмшинэ, нөгөөд нь
 * "аль хэдийн эхэлсэн" гэсэн ойлгомжтой хариу очно. Урьдчилж `select`
 * хийгээд шалгавал хоёулаа өнгөрч, ХОЁР өрөө үүснэ.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;
  const { code } = await params;

  try {
    const outcome = await db.transaction(async (tx) => {
      const [invite] = await tx
        .select()
        .from(chessInvites)
        .where(eq(chessInvites.code, normalize(code)))
        .limit(1)
        .for("update");

      if (!invite) return { error: "notFound" as const };
      if (invite.expiresAt.getTime() < Date.now()) return { error: "expired" as const };
      if (invite.hostUid === caller.uid) return { error: "self" as const };
      if (invite.roomId) return { error: "taken" as const };

      const [room] = await tx
        .insert(chessRooms)
        .values({ whiteUid: invite.hostUid, blackUid: caller.uid })
        .returning({ id: chessRooms.id });

      await tx
        .update(chessInvites)
        .set({ roomId: room.id, guestUid: caller.uid })
        .where(eq(chessInvites.code, invite.code));

      return { roomId: room.id };
    });

    if ("error" in outcome) {
      if (outcome.error === "self") {
        return badRequest("Өөрийнхөө урилгыг хүлээж авах боломжгүй — холбоосоо найздаа илгээнэ үү.");
      }
      if (outcome.error === "taken") {
        return badRequest("Энэ урилгаар аль хэдийн өөр хүн тоглолт эхлүүлсэн байна.");
      }
      return notFound(
        outcome.error === "expired"
          ? "Урилгын хугацаа дууссан байна."
          : "Урилга олдсонгүй."
      );
    }

    return NextResponse.json({ roomId: outcome.roomId, color: "black" });
  } catch (error) {
    return serverError(error, "Урилгыг хүлээж авахад алдаа гарлаа");
  }
}

/** Урьсан тал холбоосоо цуцлах — ЗӨВХӨН эзэн нь (`hostUid`) устгаж чадна. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { code } = await params;

  try {
    await db
      .delete(chessInvites)
      .where(
        and(eq(chessInvites.code, normalize(code)), eq(chessInvites.hostUid, result.caller.uid))
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return serverError(error, "Урилгыг цуцлахад алдаа гарлаа");
  }
}
