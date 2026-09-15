import { tierInfo } from "./league";

/**
 * Амжилтын тэмдгүүд — Duolingo маягийн олон шаттай тэмдэг.
 *
 * Клиент, сервер хоёулаа импортолдог тул `server-only` ЗААВАЛ ороогүй.
 *
 * ⚠ ТӨЛӨВ ХАДГАЛАХГҮЙ. Тэмдэг бүр нь `metric >= threshold` гэсэн ГАНЦ
 * хэлбэртэй бөгөөд үзүүлэлтүүд нь аль хэдийн санд байдаг (XP, дараалал,
 * дуусгасан хичээл…). Тиймээс "нээгдсэн тэмдэг"-ийн тусдаа хүснэгт
 * ХЭРЭГГҮЙ: харах бүрд шинээр тооцогдоно.
 *
 * Энэ нь зөвхөн код багасгах биш, ЗӨВ БАЙДЛЫН шийдвэр — хадгалсан төлөв нь
 * үзүүлэлттэйгээ ЗӨРӨХ боломжтой (нэг газарт бичигдээд нөгөө нь мартагдвал
 * "нээгдсэн" тэмдэг хоосон явцтай харагдана). Тооцоолсон утга хэзээ ч зөрөхгүй.
 *
 * ⚠ ЗООС ОЛГОХГҮЙ. Шагнал нь тэмдэг өөрөө. Хэрэв хожим зоос олгох бол
 * төлөвийг ЗААВАЛ хадгалах болно (давхар олгохоос сэргийлэх) — тэр үед
 * дээрх шийдвэрийг эргэж хараарай.
 */

/** Тэмдэг ямар үзүүлэлт дээр суурилахыг заана (`lib/api/achievements.ts` тоолно). */
export type AchievementMetric =
  | "xp"
  | "longestStreak"
  | "lessonsCompleted"
  | "coursesStarted"
  | "learnMinutes"
  | "gamesWon"
  | "rating"
  | "leagueTier"
  | "friendsCount"
  | "referralsRewarded";

export type AchievementDef = {
  id: string;
  title: string;
  /** `{n}` нь тухайн шатны босгоор солигдоно (`format`-оор дамжсаны дараа). */
  description: string;
  /**
   * Босгыг ХҮНД ОЙЛГОМЖТОЙ бичих (заавал биш).
   *
   * ⚠ Зарим үзүүлэлтийн ТОО нь дангаараа утгагүй: лигийн шат `3` гэдэг нь
   * "Индранил" гэсэн үг бөгөөс "3-р лигт хүр" гэвэл хэн ч ойлгохгүй.
   * Анхдагчаар зөвхөн мянгатын таслал тавина.
   */
  format?: (threshold: number) => string;
  metric: AchievementMetric;
  /** `components/tactiq/Icon.tsx`-ийн БИШ, `lucide-react`-ийн нэр. */
  icon: string;
  /** Tailwind өнгөний нэр (`lib/tactiq/theme.ts`-ийн `colorStyles` БИШ, шууд hex). */
  color: string;
  /**
   * Шат бүрийн босго — ӨСӨХ дарааллаар.
   *
   * ⚠ Босгыг ХЭЗЭЭ Ч дунд нь оруулж болохгүй, зөвхөн ТӨГСГӨЛД нэмнэ:
   * хэрэглэгчийн "3-р шат" гэсэн ойлголт хоцрогдож, аль хэдийн авсан
   * тэмдэг нь буурч харагдана.
   */
  tiers: number[];
};

/**
 * Тэмдгүүд.
 *
 * ⚠ Босгыг сонгохдоо ЭХНИЙ шатыг ЗОРИУДААР бага тавьсан (жишээ нь 3 өдрийн
 * дараалал, 100 XP): эхлэгч хүүхэд эхний өдрөө ядаж НЭГ тэмдэг авах ёстой,
 * эс бөгөөс бүх тэмдэг 0% харагдаж урам хугална.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "wildfire",
    title: "Гал",
    description: "{n} өдөр дараалан суралц",
    metric: "longestStreak",
    icon: "Flame",
    color: "#f97316",
    tiers: [3, 7, 14, 30, 50, 100, 200, 365, 500],
  },
  {
    id: "sage",
    title: "Гарамгай",
    description: "Нийт {n} оноо цуглуул",
    metric: "xp",
    icon: "Zap",
    color: "#8b5cf6",
    tiers: [100, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000],
  },
  {
    id: "scholar",
    title: "Хичээнгүй",
    description: "{n} хичээл дуусга",
    metric: "lessonsCompleted",
    icon: "BookOpen",
    color: "#0ea5e9",
    /*
     * ⚠ СҮҮЛИЙН ШАТ (1000) нь ОДООГИЙН нийт хичээлээс (760) ИХ. Курсын
     * тоо өсөхөд хүрэх боломжтой болно — `explorer`-ээс ялгаатай нь энэ
     * нь агуулга нэмэгдэхэд өөрөө засагддаг. Гэхдээ удаан хугацаанд
     * агуулга нэмэгдэхгүй бол энэ шатыг хасахыг бодоорой: хүрэх
     * боломжгүй шат нь хэрэглэгчийг дэмий зүтгүүлнэ.
     */
    tiers: [1, 5, 25, 50, 100, 250, 500, 1_000],
  },
  {
    id: "explorer",
    title: "Судлаач",
    description: "{n} өөр курс эхлүүл",
    metric: "coursesStarted",
    icon: "Compass",
    color: "#14b8a6",
    /*
     * ⚠ СҮҮЛИЙН ШАТ нь НИЙТЛЭГДСЭН КУРСЫН ТООноос ХЭТРЭХГҮЙ. Одоо
     * Mind сургуулийн зургаан курс байна (Шатар, Даам, Судоку, Тангрaм,
     * Санах ой, Таавар).
     *
     * ⚠ Урьд нь [1, 2, 3, 5, 8, 12] байсан — 8, 12 нь курсын тоо
     * буурсны дараа ХЭН Ч ХЭЗЭЭ Ч хүрэх боломжгүй болсон. Хэрэглэгч
     * дуусашгүй тэмдгийг хараад дэмий зүтгэнэ (`inviter`-ийн доорх
     * тайлбартай яг ижил учир шалтгаан).
     *
     * ⚠ Шинэ курс нэмэх бүрд ЭНД шат нэмж болно — гэхдээ зөвхөн
     * ТӨГСГӨЛД (дунд нь оруулбал авсан тэмдэг буурч харагдана).
     */
    tiers: [1, 2, 3, 4, 5, 6],
  },
  {
    id: "devoted",
    title: "Тэвчээртэй",
    description: "Сурахад {n} минут зарцуул",
    metric: "learnMinutes",
    icon: "Clock",
    color: "#64748b",
    tiers: [30, 120, 300, 600, 1_200, 3_000, 6_000],
  },
  {
    id: "duelist",
    title: "Тулаанч",
    description: "{n} тоглолт хож",
    metric: "gamesWon",
    icon: "Swords",
    color: "#ef4444",
    tiers: [1, 5, 25, 50, 100, 250, 500],
  },
  {
    id: "strategist",
    title: "Стратегич",
    description: "Үнэлгээгээ {n} хүргэ",
    metric: "rating",
    icon: "Target",
    color: "#6366f1",
    tiers: [1_000, 1_200, 1_400, 1_600, 1_800, 2_000, 2_200],
  },
  {
    id: "regal",
    title: "Аварга",
    description: "{n} лигт хүр",
    metric: "leagueTier",
    icon: "Trophy",
    color: "#eab308",
    // Босго нь `LEAGUE_TIERS`-ийн ИНДЕКС тул хүнд харуулахдаа НЭР болгоно.
    format: (threshold) => tierInfo(threshold).label,
    // 1-ээс эхэлнэ: "Хүрэлд байх" нь амжилт биш, бүгд тэндээс эхэлдэг.
    /*
     * ⚠ Сүүлийн босго нь `TOP_TIER`-ТЭЙ ТЭНЦҮҮ байх ёстой. Лигт шинэ шат
     * нэмэх бүрд ЭНД мөн нэмэх шаардлагатай — эс бөгөөс хамгийн дээд лигт
     * хүрсэн хүн энэ тэмдгээ аль хэдийн дүүргэсэн байх ба шинэ лиг нь
     * шагналгүй үлдэнэ. (`LEAGUE_TIERS`, `lib/tactiq/league.ts`)
     */
    tiers: [1, 2, 3, 4, 5, 6, 7, 8],
  },
  {
    id: "friendly",
    title: "Найрсаг",
    description: "{n} найзтай бол",
    metric: "friendsCount",
    icon: "Handshake",
    color: "#ec4899",
    tiers: [1, 3, 5, 10, 15, 25],
  },
  {
    id: "inviter",
    title: "Уриалагч",
    description: "{n} найзыг урьж оруул",
    metric: "referralsRewarded",
    icon: "Gift",
    color: "#22c55e",
    /*
     * ⚠ 15-аас ДЭЭШ шат НЭМЖ БОЛОХГҮЙ. Энэ үзүүлэлт нь урамшуулал
     * ОЛГОГДСОН урилгыг тоолдог бөгөөд тэр нь `REFERRAL_REWARD_MAX_FRIENDS = 15`
     * (`lib/billing.ts`) дээр НАСАН ТУРШИД тагласан. Дээш нэмсэн шат нь
     * хэн ч ХЭЗЭЭ Ч хүрэх боломжгүй байх ба хэрэглэгч түүнийг хараад
     * дэмий зүтгэнэ.
     *
     * Шат нэмэх шаардлагатай бол ЭХЛЭЭД `REFERRAL_REWARD_MAX_FRIENDS`-ыг өсгө.
     */
    tiers: [1, 3, 5, 10, 15],
  },
];

export type AchievementProgress = {
  id: string;
  title: string;
  /** Одоогийн шат (0 = хараахан аваагүй). */
  tier: number;
  /** Нийт шатны тоо. */
  maxTier: number;
  /** Одоогийн үзүүлэлтийн утга. */
  value: number;
  /** Дараагийн шатны босго. Бүх шатыг дуусгасан бол `null`. */
  nextThreshold: number | null;
  /** Дараагийн шат хүртэлх явц (0-100). Дууссан бол 100. */
  percent: number;
  /** Одоогийн шатны тайлбар (аваагүй бол ДАРААГИЙН шатных). */
  description: string;
  /**
   * "12 / 25" маягийн явцын шошго — БЭЛЭН болгож өгнө.
   *
   * ⚠ Клиент талд `value`/`nextThreshold`-ыг ШУУД хэвлэж БОЛОХГҮЙ: лигийн
   * тэмдэгт тэдгээр нь индекс тул "0 / 1" гэж утгагүй харагдана. Энд
   * `format` дамжсан тул "Хүрэл / Мөнгө" болно.
   */
  progressLabel: string;
  /**
   * Тэмдгийн ДЭЭР товгойлгож бичих утга.
   *
   * Аваагүй бол ДАРААГИЙН босго ("юу хийвэл авах вэ"), авсан бол хүрсэн
   * босго ("юу хийсэн бэ") — `description`-д ордог ЯГ ТЭР тоо.
   *
   * ⚠ Тоо БИШ, МӨР: лигийн тэмдэгт `format` дамжсаны дараа "Мөнгө" гэсэн
   * үг болно. Клиент талд `toLocaleString` дахин хийж БОЛОХГҮЙ.
   */
  badgeLabel: string;
  icon: string;
  color: string;
};

/** Тухайн үзүүлэлтийн утгаас тэмдгийн явцыг гаргана. */
export function progressFor(
  def: AchievementDef,
  value: number
): AchievementProgress {
  // Босго нь өсөх дараалалтай тул "хэдийг давсан" нь шууд шат болно.
  const tier = def.tiers.filter((threshold) => value >= threshold).length;
  const done = tier >= def.tiers.length;

  const nextThreshold = done ? null : def.tiers[tier];

  /*
   * Явцыг ӨМНӨХ шатнаас нь эхлүүлж хэмжинэ, тэгээс биш.
   *
   * Жишээ нь 30 → 50 өдрийн шатанд 31 өдөртэй хүн "62%" (31/50) БИШ, "5%"
   * (1/20) байх ёстой — эс бөгөөс шинэ шат эхлэх бүрд зураас бараг дүүрэн
   * харагдаж, ахиц мэдрэгдэхгүй.
   */
  const floor = tier === 0 ? 0 : def.tiers[tier - 1];
  const percent = done
    ? 100
    : Math.max(
        0,
        Math.min(100, Math.round(((value - floor) / (nextThreshold! - floor)) * 100))
      );

  // Аваагүй бол ДАРААГИЙН зорилтыг харуулна ("юу хийвэл авах вэ"), авсан бол
  // хүрсэн босгоо ("юу хийсэн бэ").
  const shown = done ? def.tiers[def.tiers.length - 1] : nextThreshold!;

  const label = (n: number) => (def.format ? def.format(n) : n.toLocaleString("mn-MN"));
  const shownLabel = label(shown);

  return {
    id: def.id,
    title: def.title,
    tier,
    maxTier: def.tiers.length,
    value,
    nextThreshold,
    percent,
    description: def.description.replace("{n}", shownLabel),
    progressLabel: done ? "Дууссан" : `${label(value)} / ${label(nextThreshold!)}`,
    badgeLabel: shownLabel,
    icon: def.icon,
    color: def.color,
  };
}
