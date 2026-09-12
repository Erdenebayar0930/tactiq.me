/**
 * САНАХ ОЙН ТОГЛООМ (memory / хосыг ол) — хөзрүүдийг эргүүлж ижил хосыг олно.
 *
 * ⚠ `server-only` БИШ: клиент компонент ба серверийн шалгалт хоёулаа
 * импортолдог.
 */

/**
 * Хадгалах хэлбэр: "memory:<хосын тоо>:<зүйлс>"
 *
 *   "memory:6:🍎|🐰|⭐|🎵|🚗|🌳"
 *
 * Зүйлсийг `|` тэмдгээр тусгаарлана — эможи нь таслал, зай агуулж
 * болохгүй ч богино ҮГ (жишээ нь "До", "Ре") бас зөвшөөрөгддөг тул илүү
 * ховор тохиолдох тусгаарлагч хэрэгтэй.
 */
export const MEMORY_RE = /^memory:(\d+):(.+)$/;

export const MEMORY_MIN_PAIRS = 3;
/**
 * Дээд тал нь 10 хос = 20 хөзөр.
 *
 * ⚠ Түүнээс олон бол утасны дэлгэцэд хөзөр бүр 60px-ээс жижиг болж,
 * зурагнаас нь юу байгааг ялгах боломжгүй болно — тоглоом нь санах ойн
 * биш, харааны сорилт болж хувирна.
 */
export const MEMORY_MAX_PAIRS = 10;

/** Нэг зүйлийн дээд урт — эможи эсвэл 1-3 үсгийн товч бичээс. */
export const MEMORY_ITEM_MAX = 8;

export type MemoryDeck = {
  pairs: number;
  /** Хос бүрийн агуулга (эможи эсвэл богино текст). */
  items: string[];
};

export function encodeMemory(deck: MemoryDeck): string {
  return `memory:${deck.pairs}:${deck.items.join("|")}`;
}

/**
 * Хадгалсан мөрийг задалж ШАЛГАНА.
 *
 * ⚠ ЗҮЙЛС ДАВТАГДАХ ЁСГҮЙ. Хоёр ижил зүйл байвал дөрвөн хөзөр адилхан
 * харагдах ба сурагч "зөв" хосыг нээсэн ч тоглоом хүлээж авахгүй, эсвэл
 * санамсаргүй хос үүсэх тул тоглоомын дүрэм өөрөө эвдэрнэ.
 */
export function decodeMemory(raw: string | null | undefined): MemoryDeck | null {
  if (typeof raw !== "string") return null;

  const match = MEMORY_RE.exec(raw.trim());
  if (!match) return null;

  const pairs = Number(match[1]);
  const items = match[2].split("|").map((item) => item.trim()).filter(Boolean);

  if (pairs < MEMORY_MIN_PAIRS || pairs > MEMORY_MAX_PAIRS) return null;
  if (items.length !== pairs) return null;
  if (items.some((item) => [...item].length > MEMORY_ITEM_MAX)) return null;

  // Давхардал — дээрх тайлбарыг үзнэ үү.
  if (new Set(items).size !== items.length) return null;

  return { pairs, items };
}

export type MemoryCard = {
  /** Хөзрийн байрлалын дугаар (холигдсоны дараах). */
  id: number;
  /** Аль хосынх вэ — ижил `pairId` хоёр хөзөр тохирно. */
  pairId: number;
  value: string;
};

/**
 * Тавцанг ХОЛИНО — хос бүрээс хоёр хөзөр.
 *
 * ⚠ Холилтыг ҮРЛЭСЭН санамсаргүй тоогоор (`rng`) хийнэ: хуудсыг сэргээхэд
 * ижил байрлал гарна. Эс бөгөөс сурагч хөзрөө цээжлээд байтал шинэчлэлт
 * бүрд бүх зүйл дахин холигдож, санах ойн дасгал утгагүй болно.
 */
export function dealMemory(deck: MemoryDeck, rng: () => number): MemoryCard[] {
  const cards: MemoryCard[] = [];

  deck.items.forEach((value, pairId) => {
    cards.push({ id: 0, pairId, value });
    cards.push({ id: 0, pairId, value });
  });

  // Fisher-Yates
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }

  return cards.map((card, index) => ({ ...card, id: index }));
}

/**
 * Хөзрийг хэдэн баганаар байрлуулах вэ.
 *
 * ⚠ Дөрвөөс илүү багана ХИЙХГҮЙ (утасны дэлгэц). 20 хөзөр нь 4×5 болж
 * босоо байдлаар уншигдана — 5×4 бол хөзөр бүр нарийсаж, зураг нь жижгэрнэ.
 */
export function memoryColumns(cardCount: number): number {
  if (cardCount <= 6) return 3;
  return 4;
}

/** Эможи багцууд — админд сонгоход бэлэн. */
export const MEMORY_PRESETS: { label: string; items: string[] }[] = [
  {
    label: "Амьтад",
    items: ["🐰", "🐱", "🐶", "🦊", "🐻", "🐼", "🦁", "🐸", "🐵", "🐨"],
  },
  {
    label: "Жимс",
    items: ["🍎", "🍌", "🍇", "🍓", "🍉", "🍊", "🍑", "🥝", "🍍", "🥥"],
  },
  {
    label: "Тээвэр",
    items: ["🚗", "🚌", "🚂", "✈️", "🚀", "🚲", "🛵", "🚁", "⛵", "🚜"],
  },
  {
    label: "Байгаль",
    items: ["🌳", "🌸", "⭐", "🌙", "☀️", "❄️", "🔥", "🌈", "⛰️", "🌊"],
  },
  {
    label: "Хөгжим",
    items: ["🎵", "🎸", "🥁", "🎹", "🎺", "🎻", "🎤", "🪕", "🎷", "📯"],
  },
];
