import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { leagueOptions, leagueView } from "@/lib/api/league";
import { COHORT_SIZE, DEMOTE_COUNT, PROMOTE_COUNT } from "@/lib/tactiq/league";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/league?league=<school> — тухайн СУРГУУЛИЙН (Mind, Codely …) лигийн
 * энэ долоо хоногийн жагсаалт.
 *
 * ⚠ ЭНЭ ROUTE НЬ БИЧДЭГ (GET хэдий ч): өмнөх долоо хоногуудыг дүгнэж, урт
 * завсарлагааны шат бууралтыг хэрэглэнэ (`leagueView`). Cron байхгүй тул
 * "хэрэглэгч эргэж ирлээ" гэдэг дохиог ашиглах ёстой.
 *
 * ⚠ Харин ТЭМЦЭЭНД ОРУУЛАХГҮЙ. Бүлэгт нэгдэх нь ЗӨВХӨН хичээл эхлэхэд
 * болно (`lib/api/league.ts`) — жагсаалт хараад л нэгддэг байсан бол
 * "хичээл эхлүүлээгүй долоо хоногт өнжинө" гэсэн дүрэм биелэхгүй: тэр
 * хүн 0 XP-тэй дүгнэгдэж, өнжихийн оронд доош БУУНА.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const options = await leagueOptions(result.caller.uid);

    /*
     * Лигийг хүсэлтээс авна; байхгүй бол жагсаалтын эхний нь (шат хамгийн
     * өндөртэй). Хүссэн лиг жагсаалтад БАЙХГҮЙ бол алдаа шидэхгүй,
     * анхдагч руугаа буцна — хуучин холбоос алдааны дэлгэц харуулах шалтгаан биш.
     */
    const requested = request.nextUrl.searchParams.get("league");
    const known = new Set(options.map((option) => option.key));
    const leagueKey = (requested && known.has(requested) && requested) || options[0]?.key || "";

    // `leagueOptions` үргэлж дор хаяж нэг лиг буцаадаг тул энд бараг хүрэхгүй.
    if (!leagueKey) {
      return NextResponse.json({
        leagues: [],
        leagueKey: "",
        tier: 0,
        weekKey: "",
        size: 0,
        standings: [],
        lastOutcome: null,
        joined: false,
        cohortSize: COHORT_SIZE,
        promoteCount: PROMOTE_COUNT,
        demoteCount: DEMOTE_COUNT,
      });
    }

    const view = await leagueView(result.caller.uid, leagueKey);

    return NextResponse.json({
      ...view,
      leagues: options,
      cohortSize: COHORT_SIZE,
      promoteCount: PROMOTE_COUNT,
      demoteCount: DEMOTE_COUNT,
    });
  } catch (error) {
    return serverError(error, "Лигийн жагсаалт уншихад алдаа гарлаа");
  }
}
