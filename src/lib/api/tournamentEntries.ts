import "server-only";

import { and, count, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { tournamentEntries, users } from "@/lib/db/schema";
import { pushRegistration } from "@/lib/api/tournamentServer";
import { activeMembershipTier, freeEntriesPerMonth } from "@/lib/billing";
import { toDay } from "@/lib/tactiq/day";

import type { TournamentEntryRow } from "@/lib/db/schema";

/** Апп-ын бүсийн `YYYY-MM` — сарын квот энэ түлхүүрээр тоологдоно. */
export const monthKey = (now = new Date()) => toDay(now).slice(0, 7);

/** Энэ сард гишүүнчлэлийн ҮНЭГҮЙ эрхээр хэдэн тэмцээнд бүртгүүлсэн бэ. */
export async function freeEntriesUsed(uid: string, key = monthKey()): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(tournamentEntries)
    .where(
      and(
        eq(tournamentEntries.uid, uid),
        eq(tournamentEntries.monthKey, key),
        eq(tournamentEntries.source, "free")
      )
    );
  return row?.n ?? 0;
}

export async function listEntries(
  uid: string,
  tournamentIds: string[]
): Promise<TournamentEntryRow[]> {
  if (tournamentIds.length === 0) return [];
  return db
    .select()
    .from(tournamentEntries)
    .where(
      and(eq(tournamentEntries.uid, uid), inArray(tournamentEntries.tournamentId, tournamentIds))
    );
}

export async function findEntry(
  uid: string,
  tournamentId: string
): Promise<TournamentEntryRow | null> {
  const [row] = await db
    .select()
    .from(tournamentEntries)
    .where(and(eq(tournamentEntries.uid, uid), eq(tournamentEntries.tournamentId, tournamentId)))
    .limit(1);
  return row ?? null;
}

/**
 * Төлбөргүй бүртгэл — тэмцээн өөрөө үнэгүй (`open`), эсвэл сарын квот үлдсэн.
 *
 * ⚠ Хэрэглэгчийн мөрийг `FOR UPDATE`-ээр түгжинэ. Түгжээгүй бол хоёр
 * өөр тэмцээнд ЗЭРЭГ дарахад хоёулаа «1 үлдсэн» гэж уншаад квотоос хэтэрнэ.
 *
 * `needs-payment` бол ЮУ Ч бичихгүй — дуудагч нэхэмжлэл үүсгэнэ.
 */
export async function claimFreeEntry(
  uid: string,
  tournamentId: string,
  openTournament: boolean
): Promise<{ result: "registered" | "already" | "needs-payment"; entryId?: string }> {
  const now = new Date();
  const key = monthKey(now);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({ tier: users.tournamentTier, until: users.tournamentTierUntil })
      .from(users)
      .where(eq(users.uid, uid))
      .for("update");

    const [existing] = await tx
      .select({ id: tournamentEntries.id })
      .from(tournamentEntries)
      .where(and(eq(tournamentEntries.uid, uid), eq(tournamentEntries.tournamentId, tournamentId)))
      .limit(1);
    if (existing) return { result: "already" as const, entryId: existing.id };

    let source: "open" | "free" = "open";

    if (!openTournament) {
      const quota = freeEntriesPerMonth(activeMembershipTier(user?.tier, user?.until, now));

      if (quota !== null) {
        const [used] = await tx
          .select({ n: count() })
          .from(tournamentEntries)
          .where(
            and(
              eq(tournamentEntries.uid, uid),
              eq(tournamentEntries.monthKey, key),
              eq(tournamentEntries.source, "free")
            )
          );
        if ((used?.n ?? 0) >= quota) return { result: "needs-payment" as const };
      }

      source = "free";
    }

    const [inserted] = await tx
      .insert(tournamentEntries)
      .values({ uid, tournamentId, source, monthKey: key, createdAt: now })
      .onConflictDoNothing()
      .returning({ id: tournamentEntries.id });

    return inserted
      ? { result: "registered" as const, entryId: inserted.id }
      : { result: "already" as const };
  });
}

/**
 * Оролцох төлбөр ТӨЛӨГДСӨНИЙ дараа бүртгэл үүсгэнэ (`markPaid`-аас).
 *
 * ⚠ ИДЕМПОТЕНТ (`onConflictDoNothing`): хүн нэг тэмцээнд давхар нэхэмжлэл
 * төлсөн ч бүртгэл нэг л үлдэнэ. Давхар төлбөр нь `payments`-д баримт болж
 * үлдэх тул буцаалтыг гараар шийднэ.
 */
export async function recordPaidEntry(
  uid: string,
  tournamentId: string,
  paymentId: string,
  now = new Date()
): Promise<string | null> {
  const [inserted] = await db
    .insert(tournamentEntries)
    .values({ uid, tournamentId, source: "paid", monthKey: monthKey(now), paymentId, createdAt: now })
    .onConflictDoNothing()
    .returning({ id: tournamentEntries.id });

  if (inserted) return inserted.id;

  const existing = await findEntry(uid, tournamentId);
  return existing?.id ?? null;
}

/**
 * Бүртгэлийг тэмцээний сервер рүү илгээнэ.
 *
 * ⚠ ХЭЗЭЭ Ч АЛДАА ШИДЭХГҮЙ. Төлбөр орсон, бүртгэл манайд үүссэн — тэмцээний
 * сервер түр унасан нь хэрэглэгчийн төлбөрийг «амжилтгүй» болгох ёсгүй.
 * `syncedAt` нь `null` хэвээр үлдэж, дараагийн жагсаалт ачаалалтад дахин
 * оролдоно.
 */
export async function syncEntry(entryId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({
        id: tournamentEntries.id,
        uid: tournamentEntries.uid,
        tournamentId: tournamentEntries.tournamentId,
        source: tournamentEntries.source,
        syncedAt: tournamentEntries.syncedAt,
        displayName: users.displayName,
      })
      .from(tournamentEntries)
      .innerJoin(users, eq(users.uid, tournamentEntries.uid))
      .where(eq(tournamentEntries.id, entryId))
      .limit(1);

    if (!row) return false;
    if (row.syncedAt) return true;

    await pushRegistration({
      tournamentId: row.tournamentId,
      uid: row.uid,
      displayName: row.displayName ?? "",
      source: row.source,
    });

    await db
      .update(tournamentEntries)
      .set({ syncedAt: new Date() })
      .where(eq(tournamentEntries.id, entryId));

    return true;
  } catch (cause) {
    console.error("[tournament] бүртгэлийг тэмцээний сервер рүү илгээж чадсангүй", cause);
    return false;
  }
}
