import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { courses, users } from "@/lib/db/schema";
import { courseSchools } from "@/lib/db/courses";
import { activeMembershipTier } from "@/lib/billing";

import type { TournamentAccess } from "@/lib/tactiq/tournament";

/**
 * ТЭМЦЭЭНД ОРОЛЦОХ ЭРХИЙГ ШАЛГАХ.
 *
 * ⚠ СЕРВЕР ТАЛД, дүрсний тайлбар БИШ. Клиент тал шошго харуулдаг
 * (`Гишүүнд үнэгүй`, `Mind · чансаа`) ч тэр нь зөвхөн ХАРАГДАЦ —
 * бүртгэлийн хүсэлт нь `/api/tournament/register` дээр ЭНД шалгагдана.
 * Үгүй бол хэн ч дурын `tournamentId` илгээж, хаалттай тэмцээнд орно.
 *
 * ⚠ Mind ХӨТӨЛБӨР гэдэг нь юу вэ: сурагчийн СОНГОСОН КУРС нь Mind
 * сургуульд хамаарах эсэх. Хэрэглэгч дээр «хөтөлбөр» гэсэн багана
 * БАЙХГҮЙ — сургууль нь курсын шинж (`courses.school`). Курсээ солих нь
 * өөрөө хөтөлбөр солих гэсэн үг тул энэ нь зөв тодорхойлолт; чансаа
 * тогтоох тэмцээн нь ХӨТӨЛБӨРИЙН дотоод зэрэглэл учраас гадны хүн орвол
 * зэрэглэл утгаа алдана.
 */

const MIND_SCHOOL = "mind";

export type AccessCheck =
  | { allowed: true; free: boolean }
  | { allowed: false; reason: string };

export async function checkTournamentAccess(
  uid: string,
  access: TournamentAccess
): Promise<AccessCheck> {
  if (access === "open") return { allowed: true, free: false };

  const [user] = await db
    .select({
      tier: users.tournamentTier,
      until: users.tournamentTierUntil,
      activeCourseSlug: users.activeCourseSlug,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  if (!user) return { allowed: false, reason: "Хэрэглэгч олдсонгүй." };

  if (access === "members") {
    const tier = activeMembershipTier(user.tier, user.until);
    if (!tier) {
      return {
        allowed: false,
        reason: "Энэ тэмцээн зөвхөн гишүүдэд. Гишүүн болоод үнэгүй оролцоорой.",
      };
    }
    /*
     * ⚠ `free: true` — САРЫН КВОТ ЗАРЦУУЛАХГҮЙ. Гишүүнд зориулсан
     * тэмцээнд үнэгүй байх нь гишүүнчлэлийн ҮНЭ ЦЭНЭ өөрөө; квотаас
     * хасвал «гишүүн боллоо, гэхдээ гишүүний тэмцээн миний квотыг
     * идлээ» гэсэн хачирхалтай зан болно.
     */
    return { allowed: true, free: true };
  }

  // access === "mind"
  if (!user.activeCourseSlug) {
    return {
      allowed: false,
      reason: "Энэ нь Mind хөтөлбөрийн тэмцээн. Эхлээд Mind сургуулийн курс сонгоно уу.",
    };
  }

  const [course] = await db
    .select({ school: courses.school, schools: courses.schools })
    .from(courses)
    .where(eq(courses.slug, user.activeCourseSlug))
    .limit(1);

  if (!course || !courseSchools(course).includes(MIND_SCHOOL)) {
    return {
      allowed: false,
      reason: "Энэ нь Mind хөтөлбөрийн тэмцээн. Mind сургуулийн курс сонгосон байх шаардлагатай.",
    };
  }

  /*
   * ⚠ Mind тэмцээн нь ТӨЛБӨРТЭЙ байж болно (`entryFeeMnt`): чансаа
   * тогтоох тэмцээний шагналын сан төлбөрөөс бүрдэж мэднэ. Тиймээс
   * `free: false` — эрх нь нээгдэв гэдэг нь үнэгүй гэсэн үг биш.
   */
  return { allowed: true, free: false };
}
