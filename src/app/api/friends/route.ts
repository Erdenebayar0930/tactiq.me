import { NextResponse } from "next/server";

import { badRequest, requireActiveUser, serverError } from "@/lib/api/auth";
import { normalizeInviteCode } from "@/lib/api/inviteCode";
import { rateLimit } from "@/lib/api/rateLimit";
import { friendsView, sendFriendRequest } from "@/lib/api/friends";
import { levelFromXp } from "@/lib/tactiq/xp";

import type { NextRequest } from "next/server";
import type { FriendSummary } from "@/lib/api/friends";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Түвшинг ЭНД тооцно — `friends.ts` нь XP-ийн хүснэгтийг мэдэх шаардлагагүй. */
const withLevel = (list: FriendSummary[]) =>
  list.map((friend) => ({ ...friend, level: levelFromXp(friend.xp) }));

/** GET /api/friends — найзууд ба хүлээгдэж буй хүсэлтүүд. */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const view = await friendsView(result.caller.uid);

    return NextResponse.json({
      friends: withLevel(view.friends),
      incoming: withLevel(view.incoming),
      outgoing: withLevel(view.outgoing),
    });
  } catch (error) {
    return serverError(error, "Найзуудын жагсаалт уншихад алдаа гарлаа");
  }
}

/** POST /api/friends — сурагчийн хувийн кодоор найзын хүсэлт илгээнэ. */
export async function POST(request: NextRequest) {
  /*
   * ⚠ Кодыг таамаглахаас сэргийлнэ (`api/students/route.ts`-тай ижил
   * шалтгаан). Найзын хүсэлт нь өгөгдөл шууд нээдэггүй ч спам илгээх,
   * бодит кодуудыг тандах хэрэгсэл болох боломжтой.
   */
  const limited = await rateLimit(request, {
    name: "friend-request",
    limit: 20,
    windowMs: 600_000,
  });
  if (limited) return limited;

  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const body = (await request.json().catch(() => ({}))) as { code?: unknown };
    const code = normalizeInviteCode(body.code);
    if (!code) return badRequest("Кодоо оруулна уу.");

    const outcome = await sendFriendRequest(result.caller.uid, code);

    if (!outcome.ok) {
      if (outcome.reason === "self") return badRequest("Өөрийн кодоо оруулж болохгүй.");
      if (outcome.reason === "already") return badRequest("Та аль хэдийн найзууд байна.");
      return badRequest("Ийм кодтой хэрэглэгч олдсонгүй.");
    }

    return NextResponse.json({ friend: outcome.friend, status: outcome.status });
  } catch (error) {
    return serverError(error, "Найзын хүсэлт илгээхэд алдаа гарлаа");
  }
}
