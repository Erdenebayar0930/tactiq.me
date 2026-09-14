/**
 * БАГА НАСНЫ ДАСГАЛУУД (4-7 нас) — «хараад дар».
 *
 * ⚠ `server-only` БИШ: клиент компонент, серверийн шалгалт, seed script
 * гурвуулаа импортолдог.
 *
 * ⚠ УНШИХ ШААРДЛАГАГҮЙ. Энэ насны хүүхэд бичиг уншиж чаддаггүй тул
 * даалгаврыг бүхэлд нь ЗУРГААР ойлгуулна: дасгалын бичвэр нь зөвхөн
 * эцэг эх, багшид зориулсан. Тиймээс бүх горим нь «дүрс хараад зөвийг нь
 * дар» гэсэн НЭГ л үйлдэлтэй.
 *
 * ДӨРВӨН ГОРИМ:
 *   • count — дүрсүүдийг тоолж ТООГ нь дар
 *   • size  — хамгийн ТОМЫГ нь дар
 *   • same  — дээд талын дүрстэй ИЖИЛ нэгийг дар
 *   • order — тоонуудыг ӨСӨХ дарааллаар дар
 *
 * ⚠ Дөрвүүлээ ижил бүтэцтэй (дүрсүүд + зөв хариу) тул нэг төрөл, дотроо
 * горимтой — `series`, `recall`-ийн адил шалтгаан.
 */

export const KIDS_MODES = ["count", "size", "same", "order"] as const;
export type KidsMode = (typeof KIDS_MODES)[number];

/** Дүрсийн тэмдэглэгээ — хэлбэр + өнгө (`lib/puzzles/series.ts`-тэй ижил). */
const SHAPE_RE = "[cstdp][rbgyv]";

/**
 * Хадгалах хэлбэр:
 *   "kids:count:cr,cr,cr"           → гурван дүрс, хариу 3
 *   "kids:size:cr1,cr3,cr2:1"       → хэмжээ 1-3, хамгийн том нь 1-р байрлал
 *   "kids:same:cr:sb,cr,tg:1"       → зорилт `cr`, хариу 1-р байрлал
 *   "kids:order:3,1,2"              → өсөхөөр дарах (1,2,3)
 */
export const KIDS_RE = new RegExp(
  `^kids:count:(?:${SHAPE_RE},){0,9}${SHAPE_RE}$` +
    `|^kids:size:(?:${SHAPE_RE}[123],){1,4}${SHAPE_RE}[123]$` +
    `|^kids:same:${SHAPE_RE}:(?:${SHAPE_RE},){1,4}${SHAPE_RE}$` +
    `|^kids:order:(?:\\d{1,2},){1,5}\\d{1,2}$`
);

export type Kids =
  | { mode: "count"; shapes: string[] }
  /** `sizes[i]` нь 1..3 — дэлгэцэнд харьцангуй хэмжээ. */
  | { mode: "size"; shapes: string[]; sizes: number[] }
  | { mode: "same"; target: string; options: string[] }
  | { mode: "order"; numbers: number[] };

export function encodeKids(kids: Kids): string {
  switch (kids.mode) {
    case "count":
      return `kids:count:${kids.shapes.join(",")}`;
    case "size":
      return `kids:size:${kids.shapes.map((shape, i) => `${shape}${kids.sizes[i]}`).join(",")}`;
    case "same":
      return `kids:same:${kids.target}:${kids.options.join(",")}`;
    case "order":
      return `kids:order:${kids.numbers.join(",")}`;
  }
}

/**
 * Задалж ШАЛГАНА.
 *
 * ⚠ Зөвхөн хэлбэрийг биш, УТГЫГ ч: хариу нь ГАНЦ байх ёстой. Хоёр дүрс
 * ижил хэмжээтэй бол «хамгийн том» нь хоёр хариутай болж, хүүхэд зөв
 * дарсан ч буруу гэж хэлэгдэнэ.
 */
export function decodeKids(raw: string | null | undefined): Kids | null {
  if (typeof raw !== "string") return null;

  const text = raw.trim();
  if (!KIDS_RE.test(text)) return null;

  const parts = text.split(":");
  const mode = parts[1] as KidsMode;

  if (mode === "count") {
    const shapes = parts[2].split(",");
    // Тав хүртэл тоолно — түүнээс олон бол энэ насанд хэт их.
    return shapes.length >= 1 && shapes.length <= 5 ? { mode, shapes } : null;
  }

  if (mode === "size") {
    const tokens = parts[2].split(",");
    const shapes = tokens.map((token) => token.slice(0, 2));
    const sizes = tokens.map((token) => Number(token[2]));

    // ⚠ Хамгийн том нь ГАНЦ байх ёстой.
    const biggest = Math.max(...sizes);
    if (sizes.filter((size) => size === biggest).length !== 1) return null;

    return { mode, shapes, sizes };
  }

  if (mode === "same") {
    const target = parts[2];
    const options = parts[3].split(",");

    // ⚠ Зорилттой ижил нь ГАНЦ байх ёстой.
    if (options.filter((option) => option === target).length !== 1) return null;

    return { mode, target, options };
  }

  const numbers = parts[2].split(",").map(Number);
  // Давхардсан тоо бол «өсөх дараалал» нь хоёрдмол болно.
  if (new Set(numbers).size !== numbers.length) return null;
  // Аль хэдийн эрэмбэлэгдсэн бол дасгал биш.
  if (numbers.every((value, i) => i === 0 || numbers[i - 1] <= value)) return null;

  return { mode: "order", numbers };
}

/** `count`/`size`/`same` — зөв БАЙРЛАЛ (эсвэл тоо). */
export function answerOf(kids: Kids): string {
  switch (kids.mode) {
    case "count":
      return String(kids.shapes.length);
    case "size":
      return String(kids.sizes.indexOf(Math.max(...kids.sizes)));
    case "same":
      return String(kids.options.indexOf(kids.target));
    case "order":
      return [...kids.numbers].sort((a, b) => a - b).join(",");
  }
}

export function isCorrect(kids: Kids, answer: string): boolean {
  return answer === answerOf(kids);
}

/**
 * `order` горимын ХЭСЭГЧИЛСЭН шалгалт — буруу дарсан даруйд хэлэхэд.
 *
 * ⚠ Бүгдийг дарсны дараа л «буруу» гэвэл хүүхэд аль нь буруу байсныг
 * мэдэхгүй, зүгээр л дахин таамаглана.
 */
export function isOrderPrefixValid(kids: Kids, picked: number[]): boolean {
  if (kids.mode !== "order") return true;
  const sorted = [...kids.numbers].sort((a, b) => a - b);
  return picked.every((value, index) => value === sorted[index]);
}
