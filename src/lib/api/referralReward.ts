import "server-only";

import { and, count, eq, isNotNull, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { referrals, users } from "@/lib/db/schema";
import { extendPremium } from "@/lib/api/premium";
import { REFERRAL_BONUS_DAYS, REFERRAL_REWARD_MAX_FRIENDS } from "@/lib/billing";

import type { UserRow } from "@/lib/db/schema";

/**
 * Найз урих урамшууллыг ОЛГОХ цорын ганц газар.
 *
 * ⚠ ЯАГААД БҮРТГЭЛИЙН МӨЧИД БИШ ВЭ: бүртгэл дээр шууд олговол хуурамч
 * имэйлээр олон данс үүсгээд хоног цуглуулах ("farming") боломж нээгддэг.
 * Тиймээс хоёр нөхцөл ХАМТДАА биелэхийг шаардана — имэйл баталгаажсан БА
 * эхний хичээл жинхэнээсээ дуусгасан. Хоёулаа биелэхэд л хоёр тал хоногоо
 * авна.
 *
 * ⚠ ЭНЭ ФУНКЦ ХИЧЭЭЛ ДУУСГАХ БҮРД ДУУДАГДАНА, зөвхөн эхнийх дээр биш.
 * Санаатай: имэйлээ ДАРАА нь баталгаажуулсан хүн эхний хичээл дээр нөхцөл
 * хангаагүй байсан ч дараагийн хичээл дээр урамшуулалдаа хүрнэ. Эс бөгөөс
 * "яг эхний хичээл дээр аль аль нь таарсан" хүмүүс л авах болно.
 *
 * ⚠ ИДЕМПОТЕНТ. `users.referralRewardedAt`-ыг НӨХЦӨЛТЭЙ UPDATE-ээр
 * (`IS NULL`) нэхэмжилдэг тул хэдэн ч удаа дуудсан хоног НЭГ Л УДАА
 * нэмэгдэнэ — хоёр хичээл зэрэг дуусгах уралдаанд ч.
 */

export type ReferralRewardResult = {
  /** Урьгдсан тал (энэ хэрэглэгч) авсан хоног. 0 = олгогдоогүй. */
  days: number;
  /** Урьсан талд ч хоног нэмэгдсэн эсэх (лимит дүүрсэн бол `false`). */
  referrerRewarded: boolean;
};

const NOTHING: ReferralRewardResult = { days: 0, referrerRewarded: false };

/**
 * Нөхцөл хангасан бол урамшууллыг олгоно.
 *
 * `user` нь дуудагчийн АЛЬ ХЭДИЙН уншсан мөр (`caller.user`) — `referredBy`
 * ба `referralRewardedAt` хоёрыг эндээс шалгаснаар хичээл дуусгах хүсэлт
 * БҮРД нэмэлт SELECT ба гүйлгээ нээхээс сэргийлнэ. Хэрэглэгчдийн дийлэнх нь
 * урилгагүй, эсвэл урамшуулалаа аль хэдийн авсан байдаг тул энэ нь ердийн
 * зам дээрх бүх зардлыг арилгана.
 *
 * ⚠ `referredBy` нь бүртгэлийн дараа ХЭЗЭЭ Ч өөрчлөгддөггүй тул хуучирсан
 * мөрөөс уншсан ч зөв. `referralRewardedAt` нь өөрчлөгдөж болох ч энд
 * зөвхөн ХУРДАН гарах шалгуур болж байгаа — жинхэнэ баталгаа нь доорх
 * нөхцөлт (`IS NULL`) UPDATE.
 *
 * Ямар ч тохиолдолд ШИДЭХГҮЙ — дуудагч нь хичээл дуусгах урсгал бөгөөд
 * урамшууллын алдаанаас болж хэрэглэгчийн оноо/дараалал алдагдах ёсгүй.
 */
export async function grantReferralReward(
  user: Pick<UserRow, "uid" | "referredBy" | "referralRewardedAt">,
  emailVerified: boolean
): Promise<ReferralRewardResult> {
  // Баталгаажаагүй бол ЧИМЭЭГҮЙ өнгөрнө — дараагийн хичээл дээр дахин
  // оролдоно (дээрх тайлбар).
  if (!emailVerified) return NOTHING;

  // Урилгагүй бүртгүүлсэн, эсвэл аль хэдийн авсан.
  const { uid, referredBy } = user;
  if (!referredBy || user.referralRewardedAt) return NOTHING;

  return db.transaction(async (tx) => {
    const now = new Date();

    /*
     * Урьсан талын мөрийг ТҮГЖИНЭ.
     *
     * Лимитийн тоолол нь "уншаад-шийдээд-бичих" хэлбэртэй тул нэг хүний хоёр
     * найз ЯГ ЗЭРЭГ хичээлээ дуусгавал хоёулаа 14-ийг хараад хоёулаа
     * олгочихно — лимит 16 болно. Түгжээ нь ижил урьсан хүнтэй холбоотой
     * гүйлгээнүүдийг дараалуулна.
     *
     * Дараалал (эхлээд урьсан тал, дараа нь урьгдсан тал) нь БҮХ дуудлагад
     * ижил — deadlock-ийн мөчлөг үүсэхгүй. Урилгын граф нь цаг хугацаагаар
     * DAG (сүүлд бүртгүүлсэн хүн өмнөх хүнийг урьж чадахгүй) тул давхар
     * гинжин түгжээ ч гогцоо үүсгэхгүй.
     */
    await tx
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.uid, referredBy))
      .for("update");

    // Урьгдсан талын бонусыг НЭГ УДАА нэхэмжилнэ. `rowCount === 0` бол өөр
    // хүсэлт түрүүлсэн гэсэн үг — чимээгүй буцна.
    const claimed = await tx
      .update(users)
      .set({ referralRewardedAt: now, updatedAt: now })
      .where(and(eq(users.uid, uid), isNull(users.referralRewardedAt)))
      .returning({ uid: users.uid });

    if (claimed.length === 0) return NOTHING;

    await extendPremium(tx, uid, REFERRAL_BONUS_DAYS, now);

    // Урьсан талын лимит — ЗӨВХӨН олгогдсон (`rewardedAt` тавигдсан)
    // урилгуудыг тоолно.
    const [rewarded] = await tx
      .select({ value: count() })
      .from(referrals)
      .where(and(eq(referrals.referrerUid, referredBy), isNotNull(referrals.rewardedAt)));

    if ((rewarded?.value ?? 0) >= REFERRAL_REWARD_MAX_FRIENDS) {
      // Лимит дүүрсэн: урьгдсан тал хоногоо авсан, урьсан талд нэмэгдэхгүй.
      return { days: REFERRAL_BONUS_DAYS, referrerRewarded: false };
    }

    /*
     * Урилгын мөрийг тэмдэглэнэ. Хоногийг ЗӨВХӨН мөр ҮНЭХЭЭР тэмдэглэгдсэн
     * үед олгоно: мөр олдоогүй бол (өгөгдлийн зөрчил) урьсан талд хоног
     * нэмэх нь лимитийн тооллын ГАДНА үлдэх бөгөөд тэр нь дараа нь хэзээ ч
     * баригдахгүй чимээгүй алдаа болно.
     */
    const marked = await tx
      .update(referrals)
      .set({ rewardedAt: now })
      .where(and(eq(referrals.refereeUid, uid), isNull(referrals.rewardedAt)))
      .returning({ id: referrals.id });

    if (marked.length === 0) return { days: REFERRAL_BONUS_DAYS, referrerRewarded: false };

    await extendPremium(tx, referredBy, REFERRAL_BONUS_DAYS, now);

    return { days: REFERRAL_BONUS_DAYS, referrerRewarded: true };
  });
}
