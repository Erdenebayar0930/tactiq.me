/**
 * СУРАЛЦАХ ЗАМЫН бүтэц — хичээлүүд ба хооронд байрлах БЭЛГИЙН ХАЙРЦГУУД.
 *
 * ⚠ КЛИЕНТ, СЕРВЕР ХОЁУЛАА ЭНЭ ФАЙЛААС уншина (`server-only` БИШ). Зам нь
 * зөвхөн харагдац биш: хайрцаг онгойлгох нэхэмжлэлийг сервер тал
 * «өмнөх хичээлүүд дууссан эсэх»-ээр шалгадаг. Клиент «аль хичээлийн дараа
 * хайрцаг байна» гэдгийг өөрөөрөө тооцвол хоёр тал зөрж, сурагч харагдаж
 * байгаа хайрцгаа онгойлгож чадахгүй болно.
 */

/** Хэдэн хичээл дуусгахад нэг бэлгийн хайрцаг гарах вэ. */
export const CHEST_EVERY = 3;

/** Хайрцаг онгойлгоход олгох зоос (хичээл дуусгахад 50 олгодог — `complete/route.ts`). */
export const CHEST_GEMS = 150;

/**
 * Хайрцгийн ДУГААР → түүнийг онгойлгохын тулд дуусгасан байх ёстой
 * хичээлийн ТОО.
 *
 * 0-р хайрцаг = эхний 3 хичээлийн дараа, 1-р = 6 дахийн дараа гэх мэт.
 */
export const lessonsNeededForChest = (chestIndex: number) => (chestIndex + 1) * CHEST_EVERY;

/** Сэдэв дотор хэдэн хайрцаг байх вэ (дуусаагүй бүлэгт хайрцаг гарахгүй). */
export const chestCountForUnit = (lessonCount: number) =>
  Math.floor(lessonCount / CHEST_EVERY);

/** `path_chests`-ийн мөрийг клиент талд таних түлхүүр. */
export const chestKey = (unitId: string, chestIndex: number) => `${unitId}:${chestIndex}`;

export type PathItem =
  | { kind: "lesson"; lessonIndex: number }
  | { kind: "chest"; chestIndex: number };

/**
 * Сэдвийн хичээлүүдийг зам болгож дэлгэнэ: 3 хичээл, хайрцаг, 3 хичээл…
 *
 * ⚠ Хайрцаг нь сүүлийн хичээлийн ДАРАА гарахгүй бол (жишээ нь 4 хичээлтэй
 * сэдэв) зам нь хагас хайрцгаар төгсөхгүй — `chestCountForUnit` нь бүтэн
 * бүлэг л тоолдог.
 */
export function buildPath(lessonCount: number): PathItem[] {
  const items: PathItem[] = [];

  for (let index = 0; index < lessonCount; index += 1) {
    items.push({ kind: "lesson", lessonIndex: index });

    const finishedGroup = (index + 1) % CHEST_EVERY === 0;
    const chestIndex = (index + 1) / CHEST_EVERY - 1;
    if (finishedGroup && chestIndex < chestCountForUnit(lessonCount)) {
      items.push({ kind: "chest", chestIndex });
    }
  }

  return items;
}

/**
 * Замын зигзаг — зангилаа бүрийн хэвтээ хазайлт (pixel).
 *
 * Duolingo-гийн зам шиг долгион: 0 → баруун → хол баруун → баруун → 0 →
 * зүүн → хол зүүн → зүүн → 0 … Тогтмол массив нь санамсаргүй тооноос дээр:
 * хуудас дахин ачаалагдахад зам ИЖИЛ хэлбэртэй үлдэнэ (сурагч замаа
 * «танихаа» болихгүй).
 */
const OFFSETS = [0, 46, 70, 46, 0, -46, -70, -46];

export const pathOffset = (position: number) => OFFSETS[position % OFFSETS.length];
