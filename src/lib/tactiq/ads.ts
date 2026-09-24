/**
 * Реклам — хоёр тусдаа зорилготой:
 *   1. "Реклам үзээд зүрх нэмэх" — `hearts`-тай холбоотой урамшуулалт реклам
 *      (`/api/learn/hearts/watch-ad`).
 *   2. Байнгын харагдах заруулах реклам (`AdSlot` компонент): `/learn`
 *      хуудсан дээр, мөн `AppShell`-д өргөн (xl+) дэлгэц дээр хажуугийн
 *      багана (`sidebar`), нарийн дэлгэц дээр хөндлөн банер (`banner`)
 *      байдлаар.
 *
 * ⚠ Тоглоом дууссаны дараах видео реклам (`GameOverAd`, 5 секундийн
 * тоолуур) ХАССАН: дүнгээ хүлээлгэх нь тоглогчийг залхааж байв, бодит
 * зар ч холбогдоогүй placeholder байсан. Дүн ШУУД гарна.
 *
 * ⚠ БОДИТ дэлгэцийн реклам сүлжээ (Google AdSense) ХАРААХАН ХОЛБОГДООГҮЙ.
 * `NEXT_PUBLIC_ADSENSE_CLIENT_ID`-г `.env.local`-д тохируулмагц `AdSlot`
 * (`components/tactiq/AdSlot.tsx`) placeholder-ийн оронд бодит зар зурна —
 * өөр кодын өөрчлөлт шаардлагагүй. Хүртэл зөвхөн ХАРАГДАЦЫН зай эзэлдэг
 * placeholder харагдана.
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
export function getAdSenseSlotId(
  placement: "sidebar" | "banner" | "tournament"
): string | undefined {
  if (placement === "sidebar") return process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || undefined;
  /*
   * ⚠ ТЭМЦЭЭНИЙ («ивээн тэтгэгчид») зар нь ТУСДАА id-тай: AdSense-ийн
   * статистик байршлаар салдаг тул банертай нэг id хэрэглэвэл аль
   * байршил ажиллаж байгааг хэзээ ч мэдэхгүй.
   *
   * ⚠ Тохируулаагүй бол банерын id руу БУЦНА, `undefined` БИШ: шинэ
   * байршил нэмэх бүрд AdSense дээр нэгж үүсгэх хүртэл зар огт
   * гарахгүй байх нь дэмий хоосон зай.
   */
  if (placement === "tournament") {
    return (
      process.env.NEXT_PUBLIC_ADSENSE_SLOT_TOURNAMENT ||
      process.env.NEXT_PUBLIC_ADSENSE_SLOT_BANNER ||
      undefined
    );
  }
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
