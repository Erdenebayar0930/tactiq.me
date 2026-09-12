/**
 * Реклам — гурван тусдаа зорилготой:
 *   1. "Реклам үзээд зүрх нэмэх" — `hearts`-тай холбоотой урамшуулалт реклам
 *      (`/api/learn/hearts/watch-ad`).
 *   2. Байнгын харагдах заруулах реклам (`AdSlot` компонент): `/learn`
 *      хуудсан дээр, мөн `AppShell`-д өргөн (xl+) дэлгэц дээр хажуугийн
 *      багана (`sidebar`), нарийн дэлгэц дээр хөндлөн банер (`banner`)
 *      байдлаар.
 *   3. Тоглоом дууссаны дараах видео реклам (interstitial) — `GameOverAd`
 *      компонент, `/play/bot`, `/play/draughts`, `/play/[roomId]` хуудсан
 *      дээр.
 *
 * ⚠ БОДИТ дэлгэцийн реклам сүлжээ (Google AdSense) ХАРААХАН ХОЛБОГДООГҮЙ.
 * `NEXT_PUBLIC_ADSENSE_CLIENT_ID`-г `.env.local`-д тохируулмагц `AdSlot`
 * (`components/tactiq/AdSlot.tsx`) placeholder-ийн оронд бодит зар зурна —
 * өөр кодын өөрчлөлт шаардлагагүй. Хүртэл зөвхөн ХАРАГДАЦЫН зай эзэлдэг
 * placeholder харагдана.
 *
 * ⚠ Видео рекламд (`GameOverAd`) ЭНГИЙН AdSense хангалтгүй — жинхэнэ
 * "дараалсан видео зар" (interstitial/rewarded video) гаргахын тулд Google
 * Ad Manager (GPT, `googletag`) эсвэл AdMob-ийн rewarded ad шаардлагатай.
 * Тиймээс `GameOverAd` одоохондоо `WatchAdForHeart`-тай адил зөвхөн
 * ХАРАГДАЦЫН тоолуур placeholder — жинхэнэ сүлжээ холбогдмогц тухайн
 * сүлжээний "зар үзэж дуусав" callback дээр л `onDone()`-г дуудна.
 */

/** Реклам үзсэний дараа шинэ реклам үзэж болох хүртэлх хамгийн бага хугацаа. */
export const AD_HEART_COOLDOWN_MINUTES = 20;

/** Нэг реклам үзэхэд олгох зүрхний тоо. */
export const AD_HEART_REWARD = 1;

export function getAdSenseClientId(): string | undefined {
  return process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || undefined;
}

/**
 * Байршил тус бүрийн AdSense зар нэгжийн ("ad unit") Slot ID.
 *
 * `AdSlot`-ийг хаана дуудсанаас үл хамааран нэг л Slot ID ашиглаж болно,
 * гэхдээ Google нь байршил бүрт тусдаа зар нэгж үүсгэхийг зөвлөдөг —
 * ингэснээр гүйцэтгэлийг (CTR, орлого) байршлаар нь тусад нь хэмжиж болно.
 */
export function getAdSenseSlotId(placement: "sidebar" | "banner"): string | undefined {
  if (placement === "sidebar") return process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || undefined;
  return process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER || undefined;
}

/**
 * Одоо реклам үзээд зүрх авч болох эсэхийг тооцно.
 *
 * @param lastAdHeartAt хамгийн сүүлд реклам үзэж зүрх авсан мөч (эсвэл огт аваагүй бол `null`)
 */
export function canWatchAdForHeart(
  lastAdHeartAt: Date | string | null,
  now: Date = new Date()
): { allowed: boolean; msToNext: number } {
  if (!lastAdHeartAt) return { allowed: true, msToNext: 0 };

  const last = lastAdHeartAt instanceof Date ? lastAdHeartAt : new Date(lastAdHeartAt);
  const elapsedMs = now.getTime() - last.getTime();
  const cooldownMs = AD_HEART_COOLDOWN_MINUTES * 60_000;

  if (elapsedMs >= cooldownMs) return { allowed: true, msToNext: 0 };
  return { allowed: false, msToNext: cooldownMs - elapsedMs };
}
