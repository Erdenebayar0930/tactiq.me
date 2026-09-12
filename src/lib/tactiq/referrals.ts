import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { referrals } from "@/lib/db/schema";
import { REFERRAL_BONUS_DAYS, REFERRAL_REWARD_MAX_FRIENDS } from "@/lib/billing";

import { today } from "./day";

/**
 * Найзаа урих урамшуулал.
 *
 * Дүрэм: найзын урилгын холбоосоор бүртгүүлсэн хүн имэйлээ баталгаажуулж,
 * эхний хичээлээ дуусгамагц ХОЁУЛАА `REFERRAL_BONUS_DAYS` хоногийн үнэгүй
 * Premium авна. Урьсан тал НАСАН ТУРШИД дээд тал нь `REFERRAL_REWARD_MAX_FRIENDS`
 * найзаас урамшуулал авна (`lib/billing.ts`).
 *
 * ⚠ ОЛГОЛТ ЭНД ХИЙГДЭХГҮЙ — `lib/api/referralReward.ts` дээр. Энд зөвхөн
 * ТООЛНО. Тиймээс доорх тоо нь "хэдэн хоног АВСАН" гэдгийг харуулах ТАЙЛАН
 * болохоос, эрх шалгах эх сурвалж БИШ — бодит эрх нь `users.premiumUntil`
 * дээр л байна.
 *
 * ⚠ ХУУЧИН ЗАГВАР (хувийн хямдрал: найз бүрд 20%, сард дээд 60%, сар бүр
 * тэглэгддэг) БҮРМӨСӨН ХАСАГДСАН — урамшуулал одоо зөвхөн ХОНОГ. Тиймээс
 * тоолол нь сараар БИШ, НИЙТ дүнгээр явна.
 */

/** Одоогийн сар `YYYY-MM` хэлбэрээр (`referrals.referredMonth`-д бичихэд). */
export function currentReferralMonth(): string {
  return today().slice(0, 7);
}

/**
 * Тухайн хэрэглэгчийн урилгын тайлан.
 *
 * `referredCount` (бүртгүүлсэн) ба `rewardedCount` (хоног олгогдсон) ХОЁР
 * ӨӨР тоо — найз бүртгүүлээд хичээлээ хараахан эхлээгүй байж болно. Хоёуланг
 * нь харуулснаар хэрэглэгч "яагаад хоног нэмэгдээгүй юм бэ" гэдгээ өөрөө
 * ойлгоно.
 */
export async function referralStats(uid: string): Promise<{
  referredCount: number;
  rewardedCount: number;
  earnedDays: number;
  maxFriends: number;
}> {
  const rows = await db
    .select({ rewardedAt: referrals.rewardedAt })
    .from(referrals)
    .where(eq(referrals.referrerUid, uid));

  const rewardedCount = rows.filter((row) => row.rewardedAt !== null).length;

  return {
    referredCount: rows.length,
    rewardedCount,
    earnedDays: rewardedCount * REFERRAL_BONUS_DAYS,
    maxFriends: REFERRAL_REWARD_MAX_FRIENDS,
  };
}
