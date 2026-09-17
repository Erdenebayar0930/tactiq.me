import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { freeEntriesUsed, listEntries, syncEntry } from "@/lib/api/tournamentEntries";
import { listUpcomingTournaments } from "@/lib/api/tournamentServer";
import { activeMembershipTier, freeEntriesPerMonth } from "@/lib/billing";
import { tournamentEnabled } from "@/lib/tactiq/tournament";
import { toDay, today } from "@/lib/tactiq/day";

import type { NextRequest } from "next/server";
import type { RemoteTournament } from "@/lib/api/tournamentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Тоглох цэсний «Тэмцээн» хэсэг — удахгүй болох тэмцээнүүд + миний бүртгэл
 * + гишүүнчлэлийн сарын квот.
 *
 * ⚠ Тэмцээний сервер унасан ч 200 буцаана (`available: false`): Тоглох
 * хуудас эвдрэхгүй, зөвхөн тэмцээний хэсэг «түр холбогдохгүй» гэж харуулна.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const tier = activeMembershipTier(
      caller.user?.tournamentTier,
      caller.user?.tournamentTierUntil
    );
    const membership = {
      tier,
      until: tier ? (caller.user?.tournamentTierUntil ?? null) : null,
      freeEntriesPerMonth: freeEntriesPerMonth(tier),
      freeEntriesUsed: await freeEntriesUsed(caller.uid),
    };

    if (!tournamentEnabled()) {
      return NextResponse.json({ enabled: false, available: false, tournaments: [], membership });
    }

    let remote: RemoteTournament[];
    try {
      remote = await listUpcomingTournaments();
    } catch (cause) {
      console.error("[tournament] жагсаалт татаж чадсангүй", cause);
      return NextResponse.json({ enabled: true, available: false, tournaments: [], membership });
    }

    const entries = await listEntries(
      caller.uid,
      remote.map((tournament) => tournament.id)
    );

    // Тэмцээний сервер рүү хүрээгүй үлдсэн бүртгэлийг дахин илгээнэ (ховор).
    await Promise.all(entries.filter((entry) => !entry.syncedAt).map((entry) => syncEntry(entry.id)));

    const mine = new Set(entries.map((entry) => entry.tournamentId));

    /*
     * ХАРАГДАХ ДҮРЭМ — ТӨРЛӨӨС ХАМААРНА.
     *
     *   ДАВТАМЖТАЙ (сериас автоматаар үүссэн) — ЗӨВХӨН ТУХАЙН ӨДРИЙНХ.
     *     Сери нь 14 хоногийг урьдчилж үүсгэдэг (`materialiseSeries`)
     *     тул бүгдийг харуулбал жагсаалт ижил нэртэй 14 мөрөөр дүүрч,
     *     ЗОРИЛТОТ тэмцээн тэдний дунд живнэ. Мөн «өдөр бүр 20:00-д
     *     байдаг» тэмцээнийг 14 удаа харуулах нь ямар ч мэдээлэл
     *     нэмэхгүй.
     *
     *   ЗОРИЛТОТ (гараар оруулсан тов) — УРЬДЧИЛАН БҮГД. Тэр нь ховор,
     *     тусгай үйл явдал бөгөөд сурагч цагаа төлөвлөх, бэлдэх
     *     шаардлагатай.
     *
     * ⚠ «Өнөөдөр» нь АППЫН БҮСЭЭР (`lib/tactiq/day.ts`), серверийн UTC-
     * ээр БИШ: Улаанбаатарын 00:30-д болох тэмцээн UTC-ээр өмнөх өдөр
     * тул UTC-ээр шүүвэл сурагч түүнийг ХЭЗЭЭ Ч харахгүй.
     *
     * ⚠ ЯВАГДАЖ БАЙГАА тэмцээнийг ҮРГЭЛЖ харуулна: 23:30-д эхэлсэн
     * тэмцээн 00:10-д «өчигдрийнх» болох ч сурагч тэр мөчид бүртгэлээ
     * шалгах, орох шаардлагатай.
     */
    const now = Date.now();
    const currentDay = today();

    const visible = remote.filter((tournament) => {
      if (!tournament.recurring) return true;

      const startsAt = new Date(tournament.startsAt);
      if (toDay(startsAt) === currentDay) return true;

      const endsAt = startsAt.getTime() + tournament.durationMin * 60_000;
      return startsAt.getTime() <= now && now < endsAt;
    });

    const visibleIds = new Set(visible.map((tournament) => tournament.id));

    return NextResponse.json({
      enabled: true,
      available: true,
      membership,
      /*
       * ХУАНЛИД ЗОРИУЛСАН БҮТЭН ЖАГСААЛТ (14 хоног).
       *
       * ⚠ `tournaments`-аас ТУСДАА: тэр нь «ОДОО бүртгүүлж болох»
       * тэмцээнүүд, энэ нь «ямар өдөр юу байна» гэсэн ТӨЛӨВЛӨГӨӨ.
       * Хоёрыг нэг массив болговол хуанли нь бүтэн сар харуулах ч
       * жагсаалт нь ижил нэртэй 14 мөрөөр дүүрнэ.
       *
       * ⚠ Зөвхөн ХАРАГДАЦЫН талбарууд: бүртгэлийн төлөв
       * (`isRegistered`), төлбөрийн логик энд хэрэггүй — хуанли нь
       * «тэмцээн БАЙНА» гэдгийг л хэлнэ.
       */
      upcoming: remote.map((tournament) => ({
        id: tournament.id,
        name: tournament.name,
        game: tournament.game,
        format: tournament.format,
        access: tournament.access,
        startsAt: tournament.startsAt,
        durationMin: tournament.durationMin,
        timeControl: tournament.timeControl,
        recurring: tournament.recurring,
        /*
         * ⚠ «ОДОО бүртгүүлж болох эсэх» — хуанли товчоо шийднэ.
         * Давтамжтай тэмцээн зөвхөн тухайн өдрөө нээгддэг
         * (`/api/tournament/register` нь ч ижил дүрмээр шалгана).
         */
        open: visibleIds.has(tournament.id),
      })),
      tournaments: visible.map((tournament) => ({
        ...tournament,
        isRegistered: mine.has(tournament.id),
      })),
    });
  } catch (error) {
    return serverError(error, "Тэмцээний жагсаалт ачаалахад алдаа гарлаа.");
  }
}
