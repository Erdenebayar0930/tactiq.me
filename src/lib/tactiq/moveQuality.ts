/**
 * НҮҮДЛИЙН ЧАНАРЫН ШАТЛАЛ — шатар, даам ХОЁУЛАНД нийтлэг.
 *
 * ⚠ Chess.com-ийн "Game Review"-той САНАА нь ижил (нүүдэл бүрийг хамгийн
 * сайн боломжтой харьцуулж ангилах), гэвч арга зүй, босго, текст БҮГД
 * ӨӨРСДИЙН. Тэдний нарийн алгоритм (win% муруй дээр суурилсан) нийтэд ил
 * бус тул хуулбарлаагүй — энд пешкийн (даамд дүрсний) нэгжээр хэмжсэн
 * АЛДАГДАЛ дээр суурилсан энгийн, ил тод томьёо ашиглав.
 *
 * ЯАГААД НЭГ ФАЙЛД ВЭ: шатар, даамын шинжилгээ нь өөр хөдөлгүүр дээр
 * ажилладаг ч ХАРАГДАХ ТАЛ нь яг ижил байх ёстой — нэг ижил нэр, өнгө,
 * тэмдэг. Тусад нь бичвэл нэг тоглоом дээр "Гайхалтай", нөгөө дээр
 * "Онц" гэж нэрлэгдэх нь цаг хугацааны асуудал.
 */

export type MoveQuality =
  /** Материал золиослосон АТЛАА хамгийн сайн нүүдэл — ховор, гайхалтай */
  | "brilliant"
  /** Цорын ганц зөв нүүдэл — бусад нь мэдэгдэхүйц дор */
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type QualityMeta = {
  label: string;
  /** Шатрын тэмдэглэгээний уламжлалт тэмдэг ("!!", "?!" …). Байхгүй бол "". */
  symbol: string;
  /** Тэмдгийн (badge) бүтэн Tailwind класс — өнгө угсрахгүй, ил бичсэн */
  badge: string;
  dot: string;
  /** Алдаа мөн үү — жагсаалтад зөвхөн эдгээрийг онцолж харуулна */
  isError: boolean;
};

/**
 * Хамгийн сайнаас хамгийн муу руу. Тоолуур, жагсаалтын эрэмбэ эндээс.
 */
export const QUALITY_ORDER: MoveQuality[] = [
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "blunder",
];

export const QUALITY_META: Record<MoveQuality, QualityMeta> = {
  brilliant: {
    label: "Гайхалтай",
    symbol: "!!",
    badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
    dot: "bg-cyan-500",
    isError: false,
  },
  great: {
    label: "Онцгой",
    symbol: "!",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    dot: "bg-blue-500",
    isError: false,
  },
  best: {
    label: "Шилдэг",
    symbol: "",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    dot: "bg-emerald-500",
    isError: false,
  },
  excellent: {
    label: "Онц",
    symbol: "",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
    dot: "bg-teal-500",
    isError: false,
  },
  good: {
    label: "Сайн",
    symbol: "",
    badge: "bg-lime-50 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
    dot: "bg-lime-500",
    isError: false,
  },
  inaccuracy: {
    label: "Оновчгүй",
    symbol: "?!",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    dot: "bg-amber-500",
    isError: true,
  },
  mistake: {
    label: "Алдаа",
    symbol: "?",
    badge: "bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
    dot: "bg-orange-500",
    isError: true,
  },
  blunder: {
    label: "Том алдаа",
    symbol: "??",
    badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    dot: "bg-rose-500",
    isError: true,
  },
};

/**
 * АЛДАГДЛЫН босго (пешк / дүрсний нэгжээр).
 *
 * `brilliant`, `great` энд БАЙХГҮЙ: тэдгээрийг алдагдлаар тодорхойлох
 * боломжгүй — хоёулаа "хамгийн сайн нүүдэл" (алдагдал ≈ 0) боловч НЭМЭЛТ
 * нөхцөл шаарддаг (золиос, эсвэл цорын ганц зам). Тэр шалгалтууд тоглоом
 * тус бүрийн `analysis.ts`-д, хөдөлгүүрийн мэдээлэлтэйгээ хамт байна.
 */
const LOSS_THRESHOLDS: { max: number; quality: MoveQuality }[] = [
  { max: 0.05, quality: "best" },
  { max: 0.2, quality: "excellent" },
  { max: 0.5, quality: "good" },
  { max: 1.0, quality: "inaccuracy" },
  { max: 2.0, quality: "mistake" },
  { max: Infinity, quality: "blunder" },
];

/** Алдагдал → үндсэн ангилал (золиос/цорын ганц нүүдлийн өргөлтгүй). */
export function qualityFromLoss(loss: number): MoveQuality {
  return LOSS_THRESHOLDS.find((entry) => loss <= entry.max)!.quality;
}

/** "Хамгийн сайн" гэж тооцох алдагдлын дээд хязгаар — brilliant/great-д шаардлагатай. */
export const BEST_EPSILON = 0.05;

/**
 * Нэг нүүдэл дээр хийсэн `loss` алдагдлыг [0,100] оноо болгоно.
 *
 * ~2.9 нэгжийн алдагдал (морь/буудал алдах) 0 оноо болно. Шугаман томьёо нь
 * бодит win% муруйнаас бүдүүлэг боловч ИЛ ТОД — хэрэглэгч "яагаад 78% вэ"
 * гэж асуувал хариулж болно.
 */
export function accuracyFromLosses(losses: number[]): number {
  if (losses.length === 0) return 100;
  const sum = losses.reduce((total, loss) => total + Math.max(0, 100 - loss * 35), 0);
  return Math.round(sum / losses.length);
}

/** Тоглоомоос үл хамаарах нэг нүүдлийн дүгнэлт — UI ЗӨВХӨН үүнийг мэднэ. */
export type ReviewedMove = {
  ply: number;
  moveNumber: number;
  /** Хүн уншихуйц тэмдэглэгээ — шатарт SAN ("Nf3"), даамд "32-28" */
  notation: string;
  /** Алдагдсан оноо (0 = хамгийн сайн нүүдэл олсон) */
  loss: number;
  quality: MoveQuality;
  /** Хайлтын олсон илүү сайн нүүдэл — тоглосонтой ижил бол `null` */
  bestNotation: string | null;
};

export type GameReview = {
  moves: ReviewedMove[];
  /** 0-100, ойролцоо нарийвчлал — chess.com-ийн албан ёсны Accuracy БИШ. */
  accuracy: number;
  counts: Record<MoveQuality, number>;
};

/** Бүх ангиллыг 0-оор эхлүүлсэн тоолуур — тоолох давталтын өмнө. */
export function emptyCounts(): Record<MoveQuality, number> {
  return {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };
}

/** `ReviewedMove` жагсаалтаас бүрэн тайлан угсарна — хоёр тоглоом хамт хэрэглэнэ. */
export function buildReview(moves: ReviewedMove[]): GameReview {
  const counts = emptyCounts();
  for (const move of moves) counts[move.quality]++;

  return {
    moves,
    accuracy: accuracyFromLosses(moves.map((move) => move.loss)),
    counts,
  };
}
