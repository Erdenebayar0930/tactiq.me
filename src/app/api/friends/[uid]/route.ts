import { NextResponse } from "next/server";

import { notFound, requireActiveUser, serverError } from "@/lib/api/auth";
import { acceptFriendRequest, removeFriend } from "@/lib/api/friends";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/friends/[uid] — ирсэн хүсэлтийг ЗӨВШӨӨРНӨ.
 *
 * ⚠ Зөвхөн НӨГӨӨ талын илгээсэн хүсэлт зөвшөөрөгдөнө (`lib/api/friends.ts`
 * дотор `requestedBy <> uid` нөхцөлөөр) — эс бөгөөс хэрэглэгч өөрийн
 * илгээсэн хүсэлтээ зөвшөөрч, хүссэн хүнээ найз болгож чадна.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { uid } = await context.params;

  try {
    const accepted = await acceptFriendRequest(result.caller.uid, uid);
    if (!accepted) return notFound("Хүлээгдэж буй хүсэлт олдсонгүй.");

    return NextResponse.json({ status: "accepted" });
  } catch (error) {
    return serverError(error, "Хүсэлт зөвшөөрөхөд алдаа гарлаа");
  }
}

/**
 * DELETE /api/friends/[uid] — найзаас хасах, эсвэл хүсэлтээс татгалзах /
 * өөрийн илгээсэн хүсэлтээ цуцлах.
 *
 * Гурвуулаа НЭГ үйлдэл: мөрийг устгана. Татгалзсаныг "declined" гэж
 * хадгалбал тэр хүн дахин хүсэлт илгээж чадахгүй болно.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { uid } = await context.params;

  try {
    const removed = await removeFriend(result.caller.uid, uid);
    if (!removed) return notFound("Ийм холбоос олдсонгүй.");

    return NextResponse.json({ removed: true });
  } catch (error) {
    return serverError(error, "Найзаас хасахад алдаа гарлаа");
  }
}
