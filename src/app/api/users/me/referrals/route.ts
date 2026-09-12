import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { REFERRAL_BONUS_DAYS, TRIAL_DAYS } from "@/lib/billing";
import { referralStats } from "@/lib/tactiq/referrals";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Найзаа урьсны урамшууллын тайлан — `/profile`-ийн "Найзаа урих" хэсэгт.
 *
 * ⚠ Тоонууд нь ЗӨВХӨН ХАРАГДАЦ. Бодит эрх нь бүртгэлийн мөчид олгогдож
 * `users.premiumUntil` дээр суусан байдаг (`api/auth/register`) — энэ route
 * түүнийг ХЭЗЭЭ Ч өөрчлөхгүй.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const stats = await referralStats(caller.uid);

    return NextResponse.json({
      ...stats,
      perFriendDays: REFERRAL_BONUS_DAYS,
      trialDays: TRIAL_DAYS,
      /** Хэрэглэгч өөрөө имэйлээ баталгаажуулсан эсэх — нөхцөлөө харуулахад. */
      emailVerified: caller.emailVerified,
    });
  } catch (error) {
    return serverError(error, "Урилгын мэдээлэл татахад алдаа гарлаа");
  }
}
