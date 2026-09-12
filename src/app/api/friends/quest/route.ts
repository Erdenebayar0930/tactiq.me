import { NextResponse } from "next/server";

import { badRequest, requireActiveUser, serverError } from "@/lib/api/auth";
import {
  currentQuest,
  QUEST_GOAL_XP,
  QUEST_REWARD_GEMS,
  startQuest,
} from "@/lib/api/friendQuest";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/friends/quest — энэ долоо хоногийн хосын даалгавар. */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json({
      quest: await currentQuest(result.caller.uid),
      goalXp: QUEST_GOAL_XP,
      rewardGems: QUEST_REWARD_GEMS,
    });
  } catch (error) {
    return serverError(error, "Даалгавар уншихад алдаа гарлаа");
  }
}

/** POST /api/friends/quest — найзтайгаа даалгавар эхлүүлнэ. */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const body = (await request.json().catch(() => ({}))) as { friendUid?: unknown };
    const friendUid = String(body.friendUid ?? "").trim();
    if (!friendUid) return badRequest("Найзаа сонгоно уу.");

    const outcome = await startQuest(result.caller.uid, friendUid);

    if (!outcome.ok) {
      if (outcome.reason === "not-friends") return badRequest("Эхлээд найз болох хэрэгтэй.");
      if (outcome.reason === "friend-busy") {
        return badRequest("Тэр найз энэ долоо хоногт өөр даалгавартай байна.");
      }
      return badRequest("Та энэ долоо хоногт аль хэдийн даалгавартай байна.");
    }

    return NextResponse.json({ quest: outcome.quest });
  } catch (error) {
    return serverError(error, "Даалгавар эхлүүлэхэд алдаа гарлаа");
  }
}
