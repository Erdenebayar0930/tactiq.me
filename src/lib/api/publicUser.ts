import "server-only";

import { activeMembershipTier } from "@/lib/billing";
import { canWatchAdForHeart } from "@/lib/tactiq/ads";
import { displayStreak, isStreakProtectedByFreeze } from "@/lib/tactiq/day";
import { isPremiumUser, levelProgress, MAX_HEARTS, refillHearts } from "@/lib/tactiq/xp";

import type { UserRow } from "@/lib/db/schema";

/**
 * Хэрэглэгчийн мөрийг клиентэд ойлгомжтой хэлбэрт буулгана.
 *
 * ⚠ Route файлд байрлуулж БОЛОХГҮЙ: Next.js-ийн App Router нь `route.ts`-ээс
 * зөвхөн HTTP method болон тохиргооны export-ыг зөвшөөрдөг — өөр нэр
 * экспортловол build нь төрлийн алдаа өгнө. Тиймээс энд тусад нь.
 *
 * Хоёр зүйлийг ЭНД тооцно, санд хадгалахгүй:
 *   • түвшин — XP-ээс (`lib/tactiq/xp.ts`)
 *   • зүрх ба дараалал — хугацаа өнгөрснөөр өөрчлөгддөг
 *
 * Эс бөгөөс "сүүлд хадгалагдсан" утга харагдана: 5 хоног ирээгүй хүүхэд
 * 7 өдрийн дараалалтай, зүрх нь 0 хэвээр гэж ХУДАЛ харагдана.
 */
export function toPublicUser(row: UserRow, heartRefillMinutes = 30) {
  const premium = isPremiumUser(row.premiumUntil);

  return {
    uid: row.uid,
    email: row.email,
    displayName: row.displayName,
    firstName: row.firstName,
    lastName: row.lastName,
    photoUrl: row.photoUrl,
    birthYear: row.birthYear,

    xp: row.xp,
    gems: row.gems,
    /** Зүүсэн аватарын хүрээ (`lib/tactiq/shop.ts`) */
    avatarFrame: row.avatarFrame,
    ownedFrames: (row.ownedFrames ?? []) as string[],
    /** Зүүсэн банерийн загвар */
    bannerTheme: row.bannerTheme,
    ownedBanners: (row.ownedBanners ?? []) as string[],
    /** Зүүсэн дэвсгэр өнгө */
    bgTheme: row.bgTheme,
    ownedBackgrounds: (row.ownedBackgrounds ?? []) as string[],

    streakDays: displayStreak(row.lastActiveDay, row.streakDays, undefined, row.streakFreezes),
    longestStreak: row.longestStreak,
    lastActiveDay: row.lastActiveDay,
    dailyGoal: row.dailyGoal,
    streakFreezes: row.streakFreezes,
    /** Дараалал өнөөдөр/өчигдрөөс цааш алгассан ч мөсөөр хамгаалагдсан эсэх */
    streakFrozen: isStreakProtectedByFreeze(row.lastActiveDay, undefined, row.streakFreezes),

    language: row.language,
    soundEnabled: row.soundEnabled,
    notificationsEnabled: row.notificationsEnabled,
    theme: row.theme,
    activeCourseSlug: row.activeCourseSlug,

    chessWins: row.chessWins,
    chessLosses: row.chessLosses,
    chessDraws: row.chessDraws,
    draughtsWins: row.draughtsWins,
    draughtsLosses: row.draughtsLosses,
    draughtsDraws: row.draughtsDraws,
    chessExperience: row.chessExperience,
    coachId: row.coachId,

    /** Elo үнэлгээ ба тоглосон тоглолт (`lib/tactiq/rating.ts`). */
    rating: row.rating,
    ratingGames: row.ratingGames,
    /*
      * ⚠ `leagueTier` ЭНД БАЙХГҮЙ — лигийн шат нь долоо хоногийн залхуу
      * дүгнэлтээр өөрчлөгддөг тул `/api/league` (дүгнэлтийг гүйцэтгээд)
      * буцаана.
      */

    role: row.role,
    /** Нэмэлт эрх ("teacher" | "parent" | null) — `lib/permissions.ts`-ийн `hasRole` үзнэ үү. */
    secondaryRole: row.secondaryRole,
    status: row.status,
    createdAt: row.createdAt,
    /** Эцэг эх, багш ЭНЭ кодоор хэрэглэгчтэй холбогдоно. */
    studentInviteCode: row.studentInviteCode,
    /** Найзын урилгаар бүртгүүлсэн эсэх — `/profile`-ийн урилгын хэсэгт. */
    referredByFriend: !!row.referredBy,

    isPremium: premium,
    /** Туршилтын хугацаа ч ҮҮН ДЭЭР суудаг — `lib/db/schema.ts` үзнэ үү. */
    premiumUntil: row.premiumUntil,

    /** Тэмцээний гишүүнчлэл — хугацаа өнгөрсөн бол `null` (`lib/billing.ts`). */
    tournamentTier: activeMembershipTier(row.tournamentTier, row.tournamentTierUntil),
    tournamentTierUntil: row.tournamentTierUntil,

    ...levelProgress(row.xp),
  };
}

export type PublicUser = ReturnType<typeof toPublicUser>;
