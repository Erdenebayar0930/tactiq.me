import { levelProgress } from "@/lib/tactiq/xp";

import type { PublicUser } from "@/lib/api/publicUser";

/**
 * ЗОЧНЫ ХИЙСВЭР ПРОФАЙЛ — нэвтрээгүй хүнд аппыг ХАРУУЛАХ зорилготой.
 *
 * ⚠ Энэ бол ЗӨВХӨН ХАРАГДАЦ. Сервер тал руу энэ объектоос юу ч илгээгдэхгүй,
 * `uid` нь санд БАЙХГҮЙ. Оноо, зоос, дараалал бүгд тэг — зочин юу ч
 * хуримтлуулахгүй бөгөөд бүртгүүлэх шалтгаан нь яг тэр.
 *
 * ⚠ Талбарыг НЭГ Ч ОРХИХГҮЙ бөглөнө: дутуу талбар нь `undefined` болж,
 * түүнийг `map`/`toLocaleString` хийдэг дэлгэц дээр цагаан дэлгэц үүснэ.
 * `PublicUser` дээр шинэ талбар нэмэгдвэл TypeScript энд алдаа өгч
 * сануулна — тиймээс `as PublicUser` хэлбэрээр ДАРААГҮЙ.
 */
export const GUEST_USER: PublicUser = {
  uid: "guest",
  email: "",
  displayName: "Зочин",
  firstName: "",
  lastName: "",
  photoUrl: "",
  birthYear: 0,

  xp: 0,
  gems: 0,
  avatarFrame: "",
  ownedFrames: [],
  bannerTheme: "",
  ownedBanners: [],
  bgTheme: "",
  ownedBackgrounds: [],

  streakDays: 0,
  longestStreak: 0,
  lastActiveDay: "",
  dailyGoal: 20,
  streakFreezes: 0,
  streakFrozen: false,

  language: "mn",
  soundEnabled: true,
  notificationsEnabled: false,
  theme: "system",
  activeCourseSlug: null,

  chessWins: 0,
  chessLosses: 0,
  chessDraws: 0,
  draughtsWins: 0,
  draughtsLosses: 0,
  draughtsDraws: 0,
  coachId: "",

  rating: 0,
  ratingGames: 0,

  role: "student",
  secondaryRole: null,
  status: "active",
  createdAt: new Date(0),
  studentInviteCode: "",
  referredByFriend: false,

  isPremium: false,
  premiumUntil: null,

  tournamentTier: null,
  tournamentTierUntil: null,

  ...levelProgress(0),
};
