/**
 * Курс / амжилтын өнгөний түлхүүрийг Tailwind классын БҮТЭН мөр рүү буулгана.
 *
 * ⚠ ЯАГААД ХҮСНЭГТ ВЭ: Tailwind нь эх кодыг ТЕКСТЭЭР сканнердаж класс
 * үүсгэдэг. `` `bg-${color}-500` `` гэж угсарсан класс эх кодод бүтнээр
 * харагдахгүй тул CSS-д ОГТ үүсэхгүй — өнгө нь чимээгүйхэн алга болно.
 * Тиймээс боломжит хослол бүрийг ил бичнэ. Өгөгдлийн сан зөвхөн ТҮЛХҮҮР
 * (`violet`) хадгална, класс энд амьдарна.
 */

export type ColorKey =
  | "violet"
  | "emerald"
  | "amber"
  | "sky"
  | "rose"
  | "indigo"
  | "teal"
  | "orange";

export const COLOR_KEYS: ColorKey[] = [
  "violet",
  "emerald",
  "amber",
  "sky",
  "rose",
  "indigo",
  "teal",
  "orange",
];

export type ColorStyles = {
  /** Дүрсний дэвсгэр — дүүрэн, тод (карт дээрх дөрвөлжин) */
  iconBg: string;
  /** Зөөлөн дэвсгэр — тэмдэг, тайлбар мөрөнд */
  softBg: string;
  /** Зөөлөн дэвсгэр дээрх бичвэр */
  softText: string;
  /** Явцын мөрний дүүргэлт */
  bar: string;
  /** Хүрээ — сонгогдсон төлөвт */
  ring: string;
};

const STYLES: Record<ColorKey, ColorStyles> = {
  violet: {
    iconBg: "bg-violet-500",
    softBg: "bg-violet-50 dark:bg-violet-500/15",
    softText: "text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
    ring: "ring-violet-500/40",
  },
  emerald: {
    iconBg: "bg-emerald-500",
    softBg: "bg-emerald-50 dark:bg-emerald-500/15",
    softText: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
    ring: "ring-emerald-500/40",
  },
  amber: {
    iconBg: "bg-amber-500",
    softBg: "bg-amber-50 dark:bg-amber-500/15",
    softText: "text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
    ring: "ring-amber-500/40",
  },
  sky: {
    iconBg: "bg-sky-500",
    softBg: "bg-sky-50 dark:bg-sky-500/15",
    softText: "text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
    ring: "ring-sky-500/40",
  },
  rose: {
    iconBg: "bg-rose-500",
    softBg: "bg-rose-50 dark:bg-rose-500/15",
    softText: "text-rose-700 dark:text-rose-300",
    bar: "bg-rose-500",
    ring: "ring-rose-500/40",
  },
  indigo: {
    iconBg: "bg-indigo-500",
    softBg: "bg-indigo-50 dark:bg-indigo-500/15",
    softText: "text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500",
    ring: "ring-indigo-500/40",
  },
  teal: {
    iconBg: "bg-teal-500",
    softBg: "bg-teal-50 dark:bg-teal-500/15",
    softText: "text-teal-700 dark:text-teal-300",
    bar: "bg-teal-500",
    ring: "ring-teal-500/40",
  },
  orange: {
    iconBg: "bg-orange-500",
    softBg: "bg-orange-50 dark:bg-orange-500/15",
    softText: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
    ring: "ring-orange-500/40",
  },
};

/** Танихгүй түлхүүр ирвэл брэндийн өнгө рүү унана — өнгөгүй карт гарахгүй. */
export function colorStyles(key: string | null | undefined): ColorStyles {
  return STYLES[(key ?? "") as ColorKey] ?? STYLES.violet;
}

export const COLOR_LABELS: Record<ColorKey, string> = {
  violet: "Ягаан",
  emerald: "Ногоон",
  amber: "Шар",
  sky: "Цэнхэр",
  rose: "Улаан",
  indigo: "Хөх",
  teal: "Номин",
  orange: "Улбар шар",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Анхан шат",
  intermediate: "Дунд шат",
  advanced: "Ахисан шат",
};

/** Хичээлийн заавал биш насны ангилал — "Аль ч биш" гэсэн сонголт `null`-аар илэрхийлэгдэнэ */
export const AGE_CATEGORIES = ["6-8", "9-11", "12-14", "15-17", "18+"] as const;

export type AgeCategory = (typeof AGE_CATEGORIES)[number];

export const AGE_CATEGORY_LABELS: Record<AgeCategory, string> = {
  "6-8": "6–8 нас",
  "9-11": "9–11 нас",
  "12-14": "12–14 нас",
  "15-17": "15–17 нас",
  "18+": "18+ нас",
};

/**
 * Hex өнгийг гэрэлтүүлэх / бараантуулах (`delta` нь суваг тус бүрд).
 *
 * ⚠ Градиентын хоёр дахь өнгийг ГАРААР бичихгүйн тулд. Тэмдэг, лигийн шат
 * бүрт хоёр өнгө тодорхойлбол жагсаалтууд хоёр дахин урт болж, шинэ зүйл
 * нэмэх бүрд өнгө сонгох ажил давхарлана.
 *
 * ⚠ Tailwind класс БИШ, ХЭВ (inline style) буцаана: өнгө нь ажиллах үед
 * өгөгдлөөс ирдэг тул класс болгох боломжгүй (файлын толгойн тайлбар).
 */
export function shade(hex: string, delta: number): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;

  /*
   * ⚠ ЗААВАЛ hex буцаана, `rgb(...)` БИШ. Энэ функцийн үр дүн нь дахин
   * өөрийнх нь (эсвэл `readableBg`-ийн) ОРЦ болдог — `rgb(...)` буцаавал
   * тэр дуудалт задлан шинжилж чадахгүй, өнгийг ХЭВЭЭР нь буцааж, давталт
   * чимээгүйхэн зогсоно. (Энэ алдаа нэг удаа гарсан: `readableBg` нэг л
   * алхам хийгээд гацаж, тодрол хангагдаагүй хэвээр үлдсэн.)
   */
  const channels = [0, 2, 4].map((offset) => {
    const parsed = Number.parseInt(value.slice(offset, offset + 2), 16);
    const shifted = Math.max(0, Math.min(255, parsed + delta));
    return shifted.toString(16).padStart(2, "0");
  });

  return `#${channels.join("")}`;
}

/** Hex-ийн харьцангуй гэрэлтэлт (WCAG). */
function luminance(hex: string): number {
  const value = hex.replace("#", "");
  if (value.length !== 6) return 1;

  const linear = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(value.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Цагаантай харьцуулсан тодролын харьцаа. */
function contrastWithWhite(hex: string): number {
  return 1.05 / (luminance(hex) + 0.05);
}

/**
 * Дэвсгэрийг ЦАГААН бичвэр уншигдахуйц болтол бараантуулна.
 *
 * ⚠ ЯАГААД дүрсийг бараан болгодоггүй вэ: тэмдэг, лигийн медаль нь
 * тоглоомлог, баяр хөөртэй байх ёстой бөгөөд бараан дүрс нь тэр төрхийг
 * шууд алдагдуулдаг (өнгөт медаль дээрх хар дүрс нь "идэвхгүй" мэт
 * харагдана). Оронд нь ӨНГИЙГ өөрчилнө — өнгөний өнгөлөг чанар (hue)
 * хэвээр үлдэж, зөвхөн гэрэлтэлт нь буурна.
 *
 * Алт (`#eab308`) дээрх цагаан нь 1.92:1 — наранд бараг үл ялгагдана.
 * Энэ функц түүнийг гүн шар болгож 4.5:1 болгоно, шар хэвээр.
 *
 * `minRatio` анхдагчаар 4.5 (WCAG AA, энгийн бичвэр). Зөвхөн дүрсэнд
 * 3 хангалттай ч тоо, үсэг ижил гадаргуу дээр суудаг тул нэг хэмжүүр.
 */
export function readableBg(hex: string, minRatio = 4.5): string {
  let current = hex;

  // 20 алхам × -8 = хамгийн цайвар өнгийг ч хангалттай бараан болгоно.
  for (let step = 0; step < 20; step += 1) {
    if (contrastWithWhite(current) >= minRatio) return current;
    current = shade(current, -8);
  }

  return current;
}
