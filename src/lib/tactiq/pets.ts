/**
 * ТЭЖЭЭВЭР АМЬТАН БА ЦЭЦЭГ — дэлгүүрээс авч, өдөр бүр асардаг.
 *
 * ЯАГААД: зоос нь хичээл дуусгаснаар олддог боловч зарцуулах зам нь цөөн
 * байв. Тэжээвэр нь ӨДӨР БҮР эргэж ирэх шалтгаан өгдөг — дараалал (streak)
 * шиг, гэхдээ хүүхдэд илүү ойлгомжтой хэлбэрээр: "миний туулай өлсөж
 * байна".
 *
 * ⚠ ХАРИУЦЛАГА ЗААХ ХЭРЭГСЭЛ, ШИЙТГЭЛ БИШ. Асаргаагүй тэжээвэр нь
 * ҮХЭХГҮЙ, устахгүй — зөвхөн "гунигтай" болж, асаргааны дараалал тэгээс
 * эхэлнэ. Хүүхдийн эзэмшиж байгаа зүйлийг устгах нь сургалтын аппад
 * хэтэрхий хатуу шийтгэл бөгөөд буцаах боломжгүй хохирол болно.
 *
 * ⚠ `server-only` БИШ: дэлгүүр, тэжээврийн хуудас ба серверийн шалгалт
 * бүгд импортолдог тул үнэ, дүрэм нэг эх сурвалжаас уншигдана.
 */

export type PetKind = "animal" | "plant";

export type PetSpecies = {
  id: string;
  kind: PetKind;
  label: string;
  /**
   * Дэлгэц дээрх ЗУРАГ (`public/images/pets/v2/<id>.webp`).
   *
   * ⚠ ХАВТАСНЫ ХУВИЛБАР (`v2`): service worker нь `/images/**`-ийг 30
   * хоног CacheFirst-ээр барьдаг (`next.config.ts`) тул зургийг СОЛИХОД
   * ижил нэрээр дарж бичих нь хэрэглэгчид хүрэхгүй.
   *
   * ⚠ ЭможиГ ОРЛОВ: эможи нь iOS, Android, Windows гурван өөр зурагтай
   * бөгөөд дэлгүүр нь «яг ИЙМ тэжээвэр авна» гэж амлаж байгаа тул
   * хэрэглэгч бүрд ижил харагдах ёстой.
   */
  image: string;
  /**
   * Эможи — ЗӨВХӨН нөөц: зураг ачаалагдтал, мөн `alt` текст. Худалдан
   * авалтын баяр (`PurchaseToast`) дээр ч хэрэглэгддэг.
   */
  emoji: string;
  /** Худалдан авах үнэ (зоос). */
  price: number;
  /** Асаргааны нэг удаагийн зардал — хоол / ус (зоос). */
  careCost: number;
  /** Товчны бичээс: "Хооллох" эсвэл "Услах". */
  careLabel: string;
  /** Асаргааны зүйл: "хоол" / "ус" — зааварт хэрэглэнэ. */
  careItem: string;
  description: string;
  /** Асаргааны заавар — худалдаж авмагц харагдана. */
  instructions: string[];
};

/**
 * ⚠ Үнэ нь ХИЧЭЭЛИЙН тоогоор бодогдсон: хичээл бүрд ~20 зоос олддог.
 * Хамгийн хямд тэжээвэр ≈ 8 хичээл — хүүхэд хэдхэн өдөрт хүрнэ. Асаргааны
 * зардал (5-10 зоос) нь өдөрт нэг хичээлийн багахан хэсэг тул тэжээвэр нь
 * зоосыг иддэг ачаа биш, өдөр бүрийн жижиг зан үйл болно.
 */
export const PET_SPECIES: PetSpecies[] = [
  {
    id: "rabbit",
    kind: "animal",
    label: "Туулай",
    image: "/images/pets/v2/rabbit.webp",
    emoji: "🐰",
    price: 150,
    careCost: 10,
    careLabel: "Хооллох",
    careItem: "лууван",
    description: "Идэвхтэй, найрсаг. Өдөрт нэг удаа лууван иднэ.",
    instructions: [
      "Өдөрт НЭГ удаа лууван (10 зоос) өгнө.",
      "24 цагаас илүү хооллоогүй бол өлсөж эхэлнэ.",
      "48 цаг өнгөрвөл асаргааны дараалал тэгээс эхэлнэ.",
    ],
  },
  {
    id: "cat",
    kind: "animal",
    label: "Муур",
    image: "/images/pets/v2/cat.webp",
    emoji: "🐱",
    price: 250,
    careCost: 10,
    careLabel: "Хооллох",
    careItem: "загас",
    description: "Тайван, бие даасан. Өдөрт нэг удаа загас иднэ.",
    instructions: [
      "Өдөрт НЭГ удаа загас (10 зоос) өгнө.",
      "24 цагаас илүү хооллоогүй бол өлсөж эхэлнэ.",
      "48 цаг өнгөрвөл асаргааны дараалал тэгээс эхэлнэ.",
    ],
  },
  {
    id: "dog",
    kind: "animal",
    label: "Нохой",
    image: "/images/pets/v2/dog.webp",
    emoji: "🐶",
    price: 400,
    careCost: 15,
    careLabel: "Хооллох",
    careItem: "яс",
    description: "Үнэнч, эрч хүчтэй. Илүү их хоол иднэ.",
    instructions: [
      "Өдөрт НЭГ удаа хоол (15 зоос) өгнө.",
      "24 цагаас илүү хооллоогүй бол өлсөж эхэлнэ.",
      "48 цаг өнгөрвөл асаргааны дараалал тэгээс эхэлнэ.",
    ],
  },
  {
    id: "cactus",
    kind: "plant",
    label: "Ортоз",
    image: "/images/pets/v2/cactus.webp",
    emoji: "🌵",
    price: 100,
    careCost: 5,
    careLabel: "Услах",
    careItem: "ус",
    description: "Хамгийн тэвчээртэй ургамал. Бага ус хэрэгтэй.",
    instructions: [
      "Өдөрт НЭГ удаа услана (5 зоос).",
      "24 цагаас илүү усласангүй бол хатаж эхэлнэ.",
      "48 цаг өнгөрвөл асаргааны дараалал тэгээс эхэлнэ.",
    ],
  },
  {
    id: "flower",
    kind: "plant",
    label: "Цэцэг",
    image: "/images/pets/v2/flower.webp",
    emoji: "🌸",
    price: 200,
    careCost: 8,
    careLabel: "Услах",
    careItem: "ус",
    description: "Сайхан цэцэглэдэг ч өдөр бүр ус хэрэгтэй.",
    instructions: [
      "Өдөрт НЭГ удаа услана (8 зоос).",
      "24 цагаас илүү усласангүй бол гандаж эхэлнэ.",
      "48 цаг өнгөрвөл асаргааны дараалал тэгээс эхэлнэ.",
    ],
  },
  {
    id: "tree",
    kind: "plant",
    label: "Мод",
    image: "/images/pets/v2/tree.webp",
    emoji: "🌳",
    price: 500,
    careCost: 10,
    careLabel: "Услах",
    careItem: "ус",
    description: "Хамгийн үнэтэй, хамгийн сүрлэг ургамал.",
    instructions: [
      "Өдөрт НЭГ удаа услана (10 зоос).",
      "24 цагаас илүү усласангүй бол навч нь унаж эхэлнэ.",
      "48 цаг өнгөрвөл асаргааны дараалал тэгээс эхэлнэ.",
    ],
  },
];

export function findSpecies(id: string): PetSpecies | null {
  return PET_SPECIES.find((species) => species.id === id) ?? null;
}

/* -------------------------------------------------------------------------
 * Төлөв
 * ---------------------------------------------------------------------- */

const HOUR_MS = 3_600_000;

/** Асаргааны давтамж — өдөрт нэг удаа. */
export const CARE_INTERVAL_HOURS = 24;
/**
 * Хэдэн цаг асаргаагүй бол ДАРААЛАЛ тасрах вэ.
 *
 * ⚠ 24 БИШ, 48: 24 цаг болмогц тасалбал хүүхэд өчигдөр 20:00-д, өнөөдөр
 * 20:30-д асарсан ч дараалал нь тасарна. Хоёр өдрийн зөрүү нь "нэг өдөр
 * алгассан" гэдгийг л барина.
 */
export const CARE_BREAK_HOURS = 48;

export type PetMood = "happy" | "hungry" | "sad";

export type PetState = {
  mood: PetMood;
  /** Дахин асрах хүртэл үлдсэн миллисекунд (0 = яг одоо асарч болно). */
  msToNextCare: number;
  /** Асаргааны дараалал ТАСАРСАН эсэх (уншилтын үед тооцоолно). */
  streakBroken: boolean;
};

/**
 * Тэжээврийн одоогийн төлөвийг ЦАГААС тооцно.
 *
 * ⚠ Санд "mood" ХАДГАЛДАГГҮЙ — зөвхөн `lastCareAt`. Ингэснээр cron/фонын
 * ажил огт шаардлагагүй бөгөөд хэрэглэгч апп нээгээгүй байхад ч төлөв нь
 * зөв "хуучирна" (`lib/tactiq/xp.ts`-ийн зүрхний refill-тэй ижил зарчим).
 */
export function petState(lastCareAt: Date | null, now: Date = new Date()): PetState {
  if (!lastCareAt) {
    // Дөнгөж авсан — шууд асрах боломжтой.
    return { mood: "hungry", msToNextCare: 0, streakBroken: false };
  }

  const elapsed = Math.max(0, now.getTime() - lastCareAt.getTime());
  const hours = elapsed / HOUR_MS;

  const mood: PetMood =
    hours < CARE_INTERVAL_HOURS ? "happy" : hours < CARE_BREAK_HOURS ? "hungry" : "sad";

  return {
    mood,
    msToNextCare: Math.max(0, CARE_INTERVAL_HOURS * HOUR_MS - elapsed),
    streakBroken: hours >= CARE_BREAK_HOURS,
  };
}

/** Асрах боломжтой эсэх — өдөрт нэг удаа. */
export function canCare(lastCareAt: Date | null, now: Date = new Date()): boolean {
  return petState(lastCareAt, now).msToNextCare === 0;
}

/** Нэг хэрэглэгчийн эзэмших тэжээврийн ДЭЭД тоо. */
export const MAX_PETS = 6;
