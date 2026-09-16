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
  /** Дэлгэц дээрх дүрс — эможи (зурагны файл татахгүй, PWA-гийн жин нэмэгдэхгүй). */
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
    emoji: "🌳",
    price: 500,
    careCost: 10,
    careLabel: "Услах",
    careItem: "ус",
    description: "Хамгийн үнэтэй ч хамгийн том шагналтай.",
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

/* -------------------------------------------------------------------------
 * Шагнал
 * ---------------------------------------------------------------------- */

/**
 * АСАРГААНЫ ДАРААЛЛЫН шагналууд.
 *
 * ⚠ Шагнал нь зарцуулсан зоосноос ИХ байх ёстой — эс бөгөөс тэжээвэр нь
 * цэвэр алдагдал болж, хүүхэд хоёр дахь удаагаа авахгүй. 7 хоног × 10 зоос
 * = 70 зарцуулаад 150 авна: асаргаа нь БАГА зэрэг ашигтай.
 */
export const CARE_MILESTONES: { days: number; gems: number; label: string }[] = [
  { days: 3, gems: 500, label: "3 хоног" },
  { days: 7, gems: 1500, label: "1 долоо хоног" },
  { days: 14, gems: 3500, label: "2 долоо хоног" },
  { days: 30, gems: 8000, label: "1 сар" },
];

/** Тухайн дараалалд ХҮРСЭН боловч хараахан аваагүй шагналууд. */
export function claimableMilestones(
  careStreak: number,
  claimed: number[]
): typeof CARE_MILESTONES {
  return CARE_MILESTONES.filter(
    (milestone) => careStreak >= milestone.days && !claimed.includes(milestone.days)
  );
}

/** Дараагийн зорилт — хүүхдэд "хэдэн хоног үлдсэн" гэдгийг харуулахад. */
export function nextMilestone(careStreak: number): { days: number; gems: number } | null {
  return CARE_MILESTONES.find((milestone) => milestone.days > careStreak) ?? null;
}

/** Нэг хэрэглэгчийн эзэмших тэжээврийн ДЭЭД тоо. */
export const MAX_PETS = 6;
