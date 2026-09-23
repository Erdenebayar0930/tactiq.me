/**
 * ЗООСНЫ ДЭЛГҮҮР — юуг, хэдэн зоосоор авах вэ.
 *
 * ⚠ ЗАРЧИМ: зоосоор авах бүх зүйл нь ГОО ЗҮЙН эсвэл ТУСЛАХ шинжтэй байх
 * ёстой — суралцах ЯВЦАД давуу эрх өгөхгүй. Зоос нь хичээл дуусгаснаар
 * олдог тул давуу эрх зардаг бол хамгийн их цаг зарцуулж чадсан хүүхэд
 * илүү хурдан урагшлах ба энэ нь тэгш бус байдлыг өсгөнө.
 *
 * ⚠ `server-only` БИШ: дэлгүүрийн хуудас ба серверийн шалгалт хоёулаа
 * импортолдог тул үнэ нэг эх сурвалжаас уншигдана.
 */

export type FrameId = string;

export type ShopFrame = {
  id: FrameId;
  label: string;
  gems: number;
  /**
   * Аватарын гадна хүрээний Tailwind класс.
   *
   * ⚠ Класс нь БҮТНЭЭР бичигдэнэ, угсарч БОЛОХГҮЙ (`lib/tactiq/theme.ts`-ийн
   * тайлбарыг үзнэ үү): Tailwind эх кодыг текстээр сканнердах тул
   * `` `ring-${color}-400` `` гэсэн класс CSS-д огт үүсэхгүй.
   */
  ring: string;
  /** Дэлгүүрийн картад харагдах жижиг тайлбар. */
  hint: string;
};

/**
 * Хүрээнүүд — хямдаас үнэтэй рүү.
 *
 * ⚠ Үнэ нь ХИЧЭЭЛИЙН тоогоор бодогдсон: хичээл бүрд ~20 зоос олддог тул
 * 200 зоос ≈ 10 хичээл. Хамгийн үнэтэй нь ≈ 50 хичээл — тэр нь хэдэн долоо
 * хоногийн зорилго болохоор урт, гэхдээ хүрэшгүй биш.
 */
export const SHOP_FRAMES: ShopFrame[] = [
  {
    id: "sky",
    label: "Тэнгэр",
    gems: 400,
    ring: "ring-sky-400",
    hint: "Цэнхэр хүрээ",
  },
  {
    id: "emerald",
    label: "Ногоон",
    gems: 600,
    ring: "ring-emerald-400",
    hint: "Ногоон хүрээ",
  },
  {
    id: "flame",
    label: "Дөл",
    gems: 1000,
    ring: "ring-flame-500",
    hint: "Улаан-улбар дөлний хүрээ",
  },
  {
    id: "violet",
    label: "Ягаан",
    gems: 1400,
    ring: "ring-violet-400",
    hint: "Ягаан хүрээ",
  },
  {
    id: "gold",
    label: "Алт",
    gems: 2000,
    ring: "ring-gold-400",
    hint: "Хамгийн ховор — алтан хүрээ",
  },
];

export function findFrame(id: string): ShopFrame | null {
  return SHOP_FRAMES.find((frame) => frame.id === id) ?? null;
}

/**
 * Зүүсэн хүрээний Tailwind класс — аватар зурдаг бүх газарт.
 *
 * Хүрээгүй (эсвэл танихгүй id) үед ХООСОН мөр буцаана: аватар нь өөрийн
 * ердийн харагдацаараа үлдэнэ.
 */
export function frameRing(id: string | null | undefined): string {
  const frame = id ? findFrame(id) : null;
  return frame ? `ring-4 ${frame.ring}` : "";
}

/* -------------------------------------------------------------------------
 * Банерийн загвар
 * ---------------------------------------------------------------------- */

export type ShopBanner = {
  id: string;
  label: string;
  gems: number;
  /**
   * Банерийн налуу дэвсгэрийн БҮТЭН Tailwind класс.
   *
   * ⚠ Угсарч БОЛОХГҮЙ (`from-${color}`) — Tailwind эх кодыг текстээр
   * сканнердах тул тийм класс CSS-д огт үүсэхгүй, банер нь тунгалаг болно.
   */
  gradient: string;
  hint: string;
};

/**
 * Профайлын банерийн загварууд.
 *
 * ⚠ Анхдагч (үнэгүй) хувилбар нь `""` — жагсаалтад ОРООГҮЙ: түүнийг
 * "худалдаж авах" гэж харуулбал хэрэглэгч аль хэдийн байгаа зүйлдээ зоос
 * төлөх мэт ойлгогдоно. `bannerGradient("")` нь ердийн брэндийн налууг
 * буцаана.
 */
export const SHOP_BANNERS: ShopBanner[] = [
  {
    id: "sunset",
    label: "Нар жаргах",
    gems: 800,
    gradient: "bg-gradient-to-br from-orange-500 via-rose-500 to-violet-600",
    hint: "Улбар шар — ягаан",
  },
  {
    id: "ocean",
    label: "Далай",
    gems: 800,
    gradient: "bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-600",
    hint: "Цэнхэр — ногоовтор",
  },
  {
    id: "forest",
    label: "Ой",
    gems: 1200,
    gradient: "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700",
    hint: "Ногоон ой",
  },
  {
    id: "night",
    label: "Шөнийн тэнгэр",
    gems: 1600,
    gradient: "bg-gradient-to-br from-slate-800 via-indigo-900 to-violet-900",
    hint: "Хар хөх — оддын шөнө",
  },
  {
    id: "aurora",
    label: "Туйлын гэрэл",
    gems: 2400,
    gradient: "bg-gradient-to-br from-fuchsia-600 via-violet-600 to-emerald-500",
    hint: "Хамгийн ховор загвар",
  },
];

export function findBanner(id: string): ShopBanner | null {
  return SHOP_BANNERS.find((banner) => banner.id === id) ?? null;
}

/** Банерийн дэвсгэр — авахгүй бол брэндийн ердийн налуу. */
export function bannerGradient(id: string | null | undefined): string {
  const banner = id ? findBanner(id) : null;
  return banner
    ? banner.gradient
    : "bg-gradient-to-br from-brand-600 via-brand-500 to-xp-500";
}

/* -------------------------------------------------------------------------
 * Дэвсгэр өнгө
 * ---------------------------------------------------------------------- */

export type ShopBackground = {
  id: string;
  label: string;
  gems: number;
  /**
   * Аппын ДЭВСГЭРИЙН БҮТЭН Tailwind класс (гэрэл + харанхуй хоёулаа).
   *
   * ⚠ Угсарч БОЛОХГҮЙ — Tailwind эх кодыг текстээр сканнердана.
   *
   * ⚠ ЗӨӨЛӨН өнгө л сонгосон: дэвсгэр нь бүх бичвэрийн ард байдаг тул тод
   * өнгө нь уншигдацыг (contrast) сүйтгэж, хичээлийн текст харагдахгүй
   * болно. Тиймээс 50/950 сүүдрүүд — өнгө нь мэдрэгдэх ч бичвэр хэвээр
   * тод үлдэнэ.
   */
  className: string;
  hint: string;
};

/**
 * Дэвсгэрийн өнгөнүүд.
 *
 * ⚠ Анхдагч (үнэгүй) нь жагсаалтад ОРООГҮЙ — `backgroundClass("")` нь
 * аппын ердийн дэвсгэрийг буцаана.
 */
export const SHOP_BACKGROUNDS: ShopBackground[] = [
  {
    id: "mint",
    label: "Цэнгэг ногоон",
    gems: 500,
    className: "bg-emerald-50 dark:bg-emerald-950",
    hint: "Зөөлөн ногоон",
  },
  {
    id: "sky",
    label: "Тэнгэрийн цэнхэр",
    gems: 500,
    className: "bg-sky-50 dark:bg-sky-950",
    hint: "Зөөлөн цэнхэр",
  },
  {
    id: "peach",
    label: "Тоорын өнгө",
    gems: 700,
    className: "bg-orange-50 dark:bg-orange-950",
    hint: "Дулаан улбар шар",
  },
  {
    id: "lavender",
    label: "Ягаан манан",
    gems: 1000,
    className: "bg-violet-50 dark:bg-violet-950",
    hint: "Зөөлөн ягаан",
  },
  {
    id: "rose",
    label: "Сарнай",
    gems: 1400,
    className: "bg-rose-50 dark:bg-rose-950",
    hint: "Хамгийн дулаан өнгө",
  },
];

export function findBackground(id: string): ShopBackground | null {
  return SHOP_BACKGROUNDS.find((background) => background.id === id) ?? null;
}

/** Дэвсгэрийн класс — авахгүй бол аппын ердийн дэвсгэр. */
export function backgroundClass(id: string | null | undefined): string {
  const background = id ? findBackground(id) : null;
  return background ? background.className : "bg-gray-50 dark:bg-gray-950";
}
