import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { freeEntriesUsed, listEntries, syncEntry } from "@/lib/api/tournamentEntries";
import { listUpcomingTournaments } from "@/lib/api/tournamentServer";
import { activeMembershipTier, freeEntriesPerMonth } from "@/lib/billing";
import { tournamentEnabled } from "@/lib/tactiq/tournament";

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

    return NextResponse.json({
      enabled: true,
      available: true,
      membership,
      tournaments: remote.map((tournament) => ({
        ...tournament,
        isRegistered: mine.has(tournament.id),
      })),
    });
  } catch (error) {
    return serverError(error, "Тэмцээний жагсаалт ачаалахад алдаа гарлаа.");
  }
}
