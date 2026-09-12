/**
 * Оноо (XP) → түвшин.
 *
 * Түвшинг өгөгдлийн санд ХАДГАЛАХГҮЙ, XP-ээс тооцно. Шалтгаан: түвшний
 * шатлалыг тохируулах бүрд (тэнцвэржүүлэх нь хэвийн зүйл) бүх хэрэглэгчийн
 * мөрийг дахин бичих шаардлагагүй байх ёстой. XP бол цорын ганц үнэн.
 */

/**
 * Түвшин бүрийн шаардах НИЙТ оноо.
 *
 * Өсөлт нь эхэндээ зөөлөн (шинэ сурагч хурдан 2-3 түвшинд хүрч урам авна),
 * дараа нь тэгш хэмтэй тэлнэ. Хатуу томьёоны оронд хүснэгт барьсан нь
 * зориуд: багш нар эхний түвшнүүдийг гараар тохируулж чаддаг байх хэрэгтэй.
 */
const LEVEL_THRESHOLDS = [
  0, // 1-р түвшин
  50, // 2
  120, // 3
  220, // 4
  360, // 5
  550, // 6
  800, // 7
  1120, // 8
  1520, // 9
  2010, // 10
  2600, // 11
  3300, // 12
  4120, // 13
  5070, // 14
  6160, // 15
];

/**
 * Хүснэгтээс давсан түвшнүүдийн алхам. Сүүлийн хоёр босгоны зөрүүг
 * үргэлжлүүлэхийн оронд тогтмол алхам барих нь дээд түвшний сурагчдад
 * урьдчилан таамаглахуйц байдаг.
 */
const STEP_ABOVE_TABLE = 1200;

/** Тухайн түвшинд хүрэхэд шаардах нийт оноо. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  const index = level - 1;
  if (index < LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[index];

  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return last + (index - LEVEL_THRESHOLDS.length + 1) * STEP_ABOVE_TABLE;
}

/** Нийт оноогоор түвшинг тооцно (хамгийн бага нь 1). */
export function levelFromXp(xp: number): number {
  const safe = Math.max(0, Math.floor(xp || 0));

  let level = 1;
  // Хүснэгт богино тул шугаман давталт хангалттай — хоёртын хайлт нэмэх нь
  // уншихад хэцүү болгохоос өөр ашиггүй.
  while (safe >= xpForLevel(level + 1)) level += 1;

  return level;
}

export type LevelProgress = {
  level: number;
  /** Энэ түвшний эхлэх оноо */
  levelStartXp: number;
  /** Дараагийн түвшинд шаардах оноо */
  nextLevelXp: number;
  /** Энэ түвшинд цуглуулсан оноо */
  xpIntoLevel: number;
  /** Дараагийн түвшинд хүрэхэд үлдсэн оноо */
  xpToNext: number;
  /** 0..100 — явцын мөрөнд */
  percent: number;
};

/** Түвшний явцыг бүрэн задалж өгнө — профайл, толгой хэсэгт хэрэглэнэ. */
export function levelProgress(xp: number): LevelProgress {
  const safe = Math.max(0, Math.floor(xp || 0));
  const level = levelFromXp(safe);
  const levelStartXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const span = nextLevelXp - levelStartXp;
  const xpIntoLevel = safe - levelStartXp;

  return {
    level,
    levelStartXp,
    nextLevelXp,
    xpIntoLevel,
    xpToNext: Math.max(0, nextLevelXp - safe),
    // `span` нь хэзээ ч 0 болохгүй (босгууд чанд өсдөг) ч хуваахын өмнө
    // хамгаалалт тавих нь хожим хүснэгт засахад алдаанаас сэргийлнэ.
    percent: span > 0 ? Math.min(100, Math.round((xpIntoLevel / span) * 100)) : 0,
  };
}

// ---------------------------------------------------------------------------
// Зүрх (hearts)
// ---------------------------------------------------------------------------

export const MAX_HEARTS = 5;

/**
 * Хугацаа өнгөрснөөр сэргэсэн зүрхийг тооцно.
 *
 * Санд таймер хадгалдаггүй — зөвхөн `hearts` ба `heartsUpdatedAt`. Уншилтын
 * үед тэр хоёроос одоогийн утгыг гаргана. Ингэснээр cron / фонын ажил
 * шаардагдахгүй бөгөөд хэрэглэгч апп нээгээгүй байхад ч зүрх нь "сэргэсээр"
 * байна.
 *
 * @returns одоогийн зүрхний тоо ба дараагийн зүрх сэргэх хүртэлх миллисекунд
 */
export function refillHearts(
  hearts: number,
  updatedAt: Date | null,
  refillMinutes = 30,
  now: Date = new Date()
): { hearts: number; msToNext: number } {
  const current = Math.max(0, Math.min(MAX_HEARTS, hearts ?? MAX_HEARTS));

  if (current >= MAX_HEARTS || !updatedAt) {
    return { hearts: MAX_HEARTS > current ? current : MAX_HEARTS, msToNext: 0 };
  }

  const periodMs = Math.max(1, refillMinutes) * 60_000;
  const elapsed = now.getTime() - updatedAt.getTime();

  // Цаг хойш явсан (сервер тохируулга, DST) тохиолдолд сөрөг гарч болзошгүй —
  // тэглэж барина, эс бөгөөс зүрх хасагдана.
  const recovered = Math.max(0, Math.floor(elapsed / periodMs));
  const next = Math.min(MAX_HEARTS, current + recovered);

  if (next >= MAX_HEARTS) return { hearts: MAX_HEARTS, msToNext: 0 };

  return { hearts: next, msToNext: periodMs - (Math.max(0, elapsed) % periodMs) };
}

// ---------------------------------------------------------------------------
// Premium
// ---------------------------------------------------------------------------

/**
 * `users.premiumUntil`-аас "ОДОО premium эсэх"-ийг тооцно. Тусад нь
 * boolean хадгалдаггүй тул энэ функц л цорын ганц үнэн эх сурвалж —
 * дуусах хугацаа өнгөрсөн ч мөрийг цуцлах cron шаардлагагүй.
 */
export function isPremiumUser(
  premiumUntil: Date | null | undefined,
  now: Date = new Date()
): boolean {
  return !!premiumUntil && premiumUntil.getTime() > now.getTime();
}
