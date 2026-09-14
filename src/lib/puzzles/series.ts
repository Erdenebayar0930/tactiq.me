/**
 * ЭГНЭЭНИЙ ТААВАР — эгнээ харуулж дутууг нь (эсвэл илүүцийг нь) олуулна.
 *
 * ⚠ `server-only` БИШ: клиент компонент, серверийн шалгалт, seed script
 * гурвуулаа импортолдог.
 *
 * ГУРВАН ГОРИМ, НЭГ ТӨРӨЛ:
 *
 *   • number — тоон эгнээний дутуу гишүүн («2 4 6 ? 10»). Хариу нь ТОО.
 *   • shape  — дүрсийн эгнээний дараагийнх («🔴🟦🔴🟦 ?»). Хариу нь ДҮРС.
 *   • odd    — эгнээнээс ИЛҮҮЦИЙГ нь ол. Хариу нь БАЙРЛАЛ.
 *
 * ⚠ Гурвуулаа ЯГ ИЖИЛ бүтэцтэй: гишүүдийн жагсаалт + нэг ИНДЕКС. Ялгаа
 * нь тэр индекс юуг заахад л байна (дутуу гишүүн эсвэл илүүц гишүүн).
 * Тусдаа гурван дасгалын төрөл болговол төрлийн жагсаалтыг ЗУРГААН
 * газарт гурван удаа нэмэх, гурван компонент, гурван шалгагч бичих
 * шаардлагатай болж, нэгд нь алдаа засахад бусдыг мартах эрсдэл үүснэ.
 */

export const SERIES_MODES = ["number", "shape", "odd"] as const;
export type SeriesMode = (typeof SERIES_MODES)[number];

/**
 * Дүрсийн тэмдэглэгээ — ХЭЛБЭР + ӨНГӨ, хоёр тэмдэгт.
 *
 * ⚠ Эможи хэрэглээгүй: төхөөрөмж бүр өөрөөр зурдаг тул «ижил эсэх» нь
 * нүдээр эргэлзээтэй болдог. Хэлбэр, өнгийг өөрсдөө зурвал хаана ч
 * ижил харагдана.
 */
export const SHAPES = ["c", "s", "t", "d", "p"] as const; // дугуй, дөрвөлжин, гурвалжин, ромб, од
export const COLORS = ["r", "b", "g", "y", "v"] as const;

export type ShapeToken = string;

export const SHAPE_HEX: Record<string, string> = {
  r: "#e11d48",
  b: "#2563eb",
  g: "#16a34a",
  y: "#eab308",
  v: "#7c3aed",
};

/**
 * Хадгалах хэлбэр:
 *   "series:number:2,4,6,8,10:3"     → «2 4 6 ? 10», хариу 8
 *   "series:shape:cr,sb,cr,sb,cr:4"  → сүүлийнх нь далд, хариу cr
 *   "series:odd:cr,cr,sb,cr,cr:2"    → 2-р байрлал нь илүүц
 */
export const SERIES_RE =
  /^series:(number):(-?\d+(?:,-?\d+)*):(\d+)$|^series:(shape|odd):([cstdp][rbgyv](?:,[cstdp][rbgyv])*):(\d+)$/;

export type Series = {
  mode: SeriesMode;
  /** БҮТЭН эгнээ — далдалсан гишүүн ч энд байна (хариуг эндээс уншина). */
  items: string[];
  /** `number`/`shape` — далд гишүүн; `odd` — илүүц гишүүн. */
  index: number;
};

export function encodeSeries(series: Series): string {
  return `series:${series.mode}:${series.items.join(",")}:${series.index}`;
}

/**
 * Задалж ШАЛГАНА.
 *
 * ⚠ Зөвхөн хэлбэрийг биш, УТГЫГ ч шалгана — индекс эгнээнээс гадуур,
 * эгнээ хэт богино, `odd` горимд илүүц гишүүн нь үнэндээ давтагдаж
 * байгаа зэрэг нь БОДОГДОХГҮЙ таавар үүсгэнэ.
 */
export function decodeSeries(raw: string | null | undefined): Series | null {
  if (typeof raw !== "string") return null;

  const text = raw.trim();
  if (!SERIES_RE.test(text)) return null;

  const parts = text.split(":");
  const mode = parts[1] as SeriesMode;
  const items = parts[2].split(",");
  const index = Number(parts[3]);

  // Гурваас цөөн гишүүнтэй эгнээнээс хууль олох боломжгүй.
  if (items.length < 3) return null;
  if (!Number.isInteger(index) || index < 0 || index >= items.length) return null;

  if (mode === "odd") {
    /*
     * ⚠ Илүүц гишүүн нь ҮНЭХЭЭР ганцаараа байх ёстой, бусад нь бүгд
     * ИЖИЛ. Эс бөгөөс «аль нь илүүц вэ» гэдэг нь хэд хэдэн зөв хариутай
     * болж, сурагч зөв бодсон ч буруу гэж хэлэгдэнэ.
     */
    const odd = items[index];
    const rest = items.filter((_, i) => i !== index);
    if (rest.some((item) => item === odd)) return null;
    if (new Set(rest).size !== 1) return null;
  }

  return { mode, items, index };
}

/** Сурагчид ХАРАГДАХ эгнээ — далд гишүүнийг `null` болгоно. */
export function visibleItems(series: Series): (string | null)[] {
  if (series.mode === "odd") return series.items;
  return series.items.map((item, i) => (i === series.index ? null : item));
}

/** Зөв хариу — `number`/`shape` бол гишүүн, `odd` бол индекс. */
export function answerOf(series: Series): string {
  return series.mode === "odd" ? String(series.index) : series.items[series.index];
}

export function isCorrect(series: Series, answer: string): boolean {
  return answer === answerOf(series);
}

/**
 * `shape` горимын СОНГОЛТУУД — эгнээнд тохиолдох БҮХ өөр дүрс.
 *
 * ⚠ Сонголтыг тусад нь хадгалахгүй: эгнээнээс гаргавал «сонголтод байхгүй
 * хариу» гэсэн боломжгүй төлөв үүсэхгүй.
 */
export function shapeOptions(series: Series): string[] {
  return [...new Set(series.items)].sort();
}

export function shapeOf(token: string): { shape: string; color: string } {
  return { shape: token[0], color: SHAPE_HEX[token[1]] ?? "#64748b" };
}
