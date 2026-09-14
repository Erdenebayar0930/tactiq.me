/**
 * САНАЖ СЭРГЭЭХ дасгалууд — «богино үзүүлээд нуух → сурагч сэргээх».
 *
 * ⚠ `server-only` БИШ: клиент компонент, серверийн шалгалт, seed script
 * гурвуулаа импортолдог.
 *
 * ЯАГААД НЭГ ТӨРӨЛ, ГУРВАН ГОРИМ ВЭ.
 *
 * «Sequence Memory», «Pattern Memory», «Visual Memory», «Number Memory»
 * дөрвүүлээ ЯГ ИЖИЛ бүтэцтэй: тодорхой зүйлийг хэсэг зуур үзүүлж, нууж,
 * сурагчаар сэргээлгэнэ. Ялгаа нь зөвхөн ЮУГ үзүүлэх, ЯМАР дарааллаар
 * шалгах вэ гэдэгт. Тусдаа дөрвөн дасгалын төрөл болговол:
 *
 *   • дасгалын төрлийн жагсаалтыг ЗУРГААН газарт дөрвөн удаа нэмэх,
 *   • дөрвөн компонент, дөрвөн шалгагч, дөрвөн үүсгэгч бичих,
 *   • нэгд нь алдаа засахад бусдыг нь мартах
 *
 * эрсдэл үүснэ. Тиймээс нэг төрөл, дотроо ГОРИМТОЙ.
 */

export const RECALL_MODES = ["sequence", "pattern", "digits"] as const;
export type RecallMode = (typeof RECALL_MODES)[number];

/**
 * Хадгалах хэлбэр:
 *   "recall:sequence:<талбарын хэмжээ>:<нүднүүд>"  → "recall:sequence:3:4,0,8,2"
 *   "recall:pattern:<талбарын хэмжээ>:<нүднүүд>"   → "recall:pattern:4:1,6,9,14"
 *   "recall:digits:<цифрүүд>"                      → "recall:digits:58293"
 */
export const RECALL_RE = /^recall:(sequence|pattern):([3-6]):((?:\d+,)*\d+)$|^recall:digits:(\d{3,12})$/;

export type Recall =
  | {
      mode: "sequence" | "pattern";
      /** Талбар нь size × size нүдтэй. */
      size: number;
      /**
       * Сэргээх нүднүүд.
       *
       * ⚠ `sequence` горимд ДАРААЛАЛ чухал; `pattern` горимд БИШ.
       * `isCorrect` энэ ялгааг л барина.
       */
      cells: number[];
    }
  | { mode: "digits"; digits: string };

/** Хэдэн секунд үзүүлэх вэ — сэргээх зүйлийн хэмжээнээс. */
export function showMs(recall: Recall): number {
  /*
   * ⚠ ТОГТМОЛ хугацаа болохгүй: 3 нүдэнд 5 секунд нь уйтгартай урт,
   * 8 нүдэнд хэт богино. Зүйл тутамд ~600ms өгөөд доод, дээд хязгаарт
   * барина — хүүхэд нүдээ гүйлгэж амжих ёстой.
   */
  const count = recall.mode === "digits" ? recall.digits.length : recall.cells.length;
  return Math.min(6000, Math.max(1600, count * 600));
}

export function encodeRecall(recall: Recall): string {
  if (recall.mode === "digits") return `recall:digits:${recall.digits}`;
  return `recall:${recall.mode}:${recall.size}:${recall.cells.join(",")}`;
}

/**
 * Задалж ШАЛГАНА.
 *
 * ⚠ Зөвхөн хэлбэрийг биш, УТГЫГ ч шалгана: талбараас гадуур нүд,
 * давхардсан нүд, хоосон жагсаалт бүгд ШИЙДЭГДЭХГҮЙ дасгал үүсгэнэ —
 * сурагч хэчнээн зөв дарсан ч дуусахгүй.
 */
export function decodeRecall(raw: string | null | undefined): Recall | null {
  if (typeof raw !== "string") return null;

  const text = raw.trim();
  if (!RECALL_RE.test(text)) return null;

  if (text.startsWith("recall:digits:")) {
    const digits = text.slice("recall:digits:".length);
    return digits.length >= 3 && digits.length <= 12 ? { mode: "digits", digits } : null;
  }

  const [, mode, rawSize, rawCells] = text.split(":");
  const size = Number(rawSize);
  const cells = rawCells.split(",").map(Number);

  if (cells.length === 0) return null;
  if (cells.some((index) => !Number.isInteger(index) || index < 0 || index >= size * size)) {
    return null;
  }
  // ⚠ Давхардсан нүд: `pattern` горимд утгагүй, `sequence`-д «хоёр удаа
  // дарах уу?» гэсэн тодорхойгүй байдал үүсгэнэ.
  if (new Set(cells).size !== cells.length) return null;
  // Бүх нүд асвал сэргээх зүйл үлдэхгүй.
  if (cells.length >= size * size) return null;

  return { mode: mode as "sequence" | "pattern", size, cells };
}

/**
 * Сурагчийн хариу зөв эсэх.
 *
 * ⚠ `sequence` — ДАРААЛАЛ чухал. `pattern` — зөвхөн ОЛОНЛОГ (хүүхэд аль
 * булангаас нь эхлэх нь хамаагүй). `digits` — тэмдэгт мөр яг таарна.
 */
export function isCorrect(recall: Recall, answer: number[] | string): boolean {
  if (recall.mode === "digits") {
    return typeof answer === "string" && answer === recall.digits;
  }
  if (!Array.isArray(answer)) return false;
  if (answer.length !== recall.cells.length) return false;

  if (recall.mode === "sequence") {
    return answer.every((value, index) => value === recall.cells[index]);
  }

  const expected = new Set(recall.cells);
  return new Set(answer).size === answer.length && answer.every((value) => expected.has(value));
}

/**
 * Хэсэгчилсэн хариу ЗӨВ ЗАМД явж байгаа эсэх — буруу дарсан даруйд
 * хэлэхэд хэрэглэнэ.
 *
 * ⚠ Дууссаных нь дараа л «буруу» гэж хэлбэл хүүхэд аль даралт нь буруу
 * байсныг мэдэхгүй, зүгээр л бүгдийг дахин цээжлэнэ.
 */
export function isPrefixValid(recall: Recall, answer: number[]): boolean {
  if (recall.mode === "digits") return true;
  if (answer.length > recall.cells.length) return false;

  if (recall.mode === "sequence") {
    return answer.every((value, index) => value === recall.cells[index]);
  }

  const expected = new Set(recall.cells);
  return new Set(answer).size === answer.length && answer.every((value) => expected.has(value));
}

// ---------------------------------------------------------------------------
// Үүсгэгч
// ---------------------------------------------------------------------------

/** Давтагдахгүй санамсаргүй нүднүүд. */
export function makeCells(size: number, count: number, rng: () => number): number[] {
  const pool = Array.from({ length: size * size }, (_, index) => index);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length - 1));
}

export function makeDigits(length: number, rng: () => number): string {
  /*
   * ⚠ Эхний цифр 0 байж БОЛОХГҮЙ: хүүхэд «0»-ийг тоонд тооцох эсэхээ
   * эргэлзэж, санахаас илүү тайлбар таах болно.
   */
  let out = String(1 + Math.floor(rng() * 9));
  for (let i = 1; i < length; i += 1) out += String(Math.floor(rng() * 10));
  return out;
}
