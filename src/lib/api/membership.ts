import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import type { MembershipTierId } from "@/lib/billing";

/**
 * Тэмцээний гишүүнчлэл СУНГАХ цорын ганц газар.
 *
 * `lib/api/premium.ts`-тэй ижил загвар: `db` БОЛОН гүйлгээний `tx` хоёуланг
 * хүлээж авна.
 */
type Executor = Pick<typeof db, "update">;

/**
 * Гишүүнчлэлийг `days` хоногоор олгоно/сунгана.
 *
 *   • ИЖИЛ түвшин  → үлдсэн хоног дээр НЭМЭГДЭНЭ (шатахгүй)
 *   • ӨӨР түвшин   → одооноос эхэлнэ (ахиулахад доод түвшний үлдсэн хоног шатна —
 *                    UI үүнийг худалдан авахаас ӨМНӨ анхааруулна)
 *
 * Доод түвшин рүү шилжихийг `api/membership/checkout` урьдчилан хаадаг.
 *
 * ⚠ Тооцоо SQL дотор: webhook + poll зэрэг ирэхэд JS талд уншаад-бичвэл
 * нэг сунгалт алга болно (`extendPremium`-ийн тайлбарыг үзнэ үү). UPDATE-ийн
 * SET илэрхийлэл бүр ХУУЧИН мөрийг уншдаг тул `CASE` нь өмнөх түвшинтэй
 * харьцуулна.
 */
export async function extendMembership(
  executor: Executor,
  uid: string,
  tierId: MembershipTierId,
  days: number,
  now = new Date()
): Promise<void> {
  const safeDays = Math.max(0, Math.floor(days));
  const interval = sql.raw(`INTERVAL '${safeDays} days'`);

  await executor
    .update(users)
    .set({
      tournamentTierUntil: sql`(CASE WHEN ${users.tournamentTier} = ${tierId}
        THEN GREATEST(COALESCE(${users.tournamentTierUntil}, ${now}), ${now})
        ELSE ${now} END) + ${interval}`,
      tournamentTier: tierId,
      updatedAt: now,
    })
    .where(eq(users.uid, uid));
}
