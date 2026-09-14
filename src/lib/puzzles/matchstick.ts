/**
 * ТАЯГНЫ ОНЬСОГО (matchstick puzzle) — «нэг таяг зөөж тэгшитгэлийг зөв болго».
 *
 * ⚠ `server-only` БИШ: клиент компонент (`MatchstickExercise`), серверийн
 * шалгалт (`api/courseAdmin.ts`), seed script гурвуулаа импортолдог.
 *
 * МОДЕЛЬ. Тэгшитгэл нь НҮДНҮҮДИЙН дараалал. Нүд бүр нь ТАЯГНЫ САНДАЛТАЙ
 * (slot) бөгөөд сандал бүр дүүрэн эсвэл хоосон байна. Таяг зөөх гэдэг нь
 * дүүрэн сандлаас хоосон сандал руу НЭГ таяг шилжүүлэх — таягны НИЙТ ТОО
 * хэзээ ч өөрчлөгдөхгүй.
 *
 * Хоёр төрлийн нүд:
 *
 *   • ТОО — долоон сегмент (a…g), долоон сандал. Калькулятор шиг:
 *
 *         aaa
 *        f   b
 *        f   b
 *         ggg
 *        e   c
 *        e   c
 *         ddd
 *
 *   • ТЭМДЭГ — ГУРВАН сандал: `t` (дээд хэвтээ), `m` (дунд хэвтээ),
 *     `v` (босоо).
 *
 *     ⚠ ЯАГААД ГУРВАН САНДАЛ: тэмдгүүдийг ИЖИЛ сандлын багцаар
 *     илэрхийлснээр классик нүүдлүүд ӨӨРӨӨ гарч ирнэ —
 *         «+» (m+v) → босоог авбал «−» (m)
 *         «−» (m)   → дээд нэмбэл «=» (t+m)
 *     Хэрэв тэмдэг бүрийг тусдаа дүрс болговол эдгээр нүүдэл кодод
 *     тусгайлан бичигдэх шаардлагатай болж, санамсаргүй мартагдана.
 */

/** Хадгалах хэлбэр: "matchstick:<нүд>|<нүд>|…" */
export const MATCHSTICK_RE = /^matchstick:(d[01]{7}|o[01]{3,5})(\|(d[01]{7}|o[01]{3,5}))*$/;

/**
 * ⚠ ХУУЧИН ХЭЛБЭРИЙН НИЙЦ. Анх тэмдэг нь ГУРВАН сандалтай байсан
 * (`o011`); «×» нэмэхэд хоёр хилбэр сандал нэмэгдэж ТАВ болсон.
 * Хуучин мөрүүдийг татгалзвал санд аль хэдийн хадгалагдсан дасгал бүр
 * «буруу тохируулагдсан» болж, сурагч хоосон карт харна. Тиймээс
 * богино маскийг тэгээр гүйцээж уншина — хуучин утгууд («=»=110,
 * «−»=010, «+»=011) шинэ таван сандалд ЯГ тэр хэвээр буудаг.
 */
function padOperatorMask(mask: string): string {
  return mask.padEnd(OPERATOR_SLOTS.length, "0");
}

/** Тооны сегментүүд — индекс нь a,b,c,d,e,f,g. */
export const DIGIT_SLOTS = ["a", "b", "c", "d", "e", "f", "g"] as const;

/**
 * Тэмдгийн сандлууд — дээд хэвтээ, дунд хэвтээ, босоо, хоёр ХИЛБЭР.
 *
 * ⚠ Хилбэрүүд нь ЗӨВХӨН «×»-д хэрэглэгдэнэ. Тэднийг нэмсэн шалтгаан:
 * зөвхөн «+ − =» гурвыг дэмжихэд бодлогууд хоорондоо АДИЛХАН АРГАТАЙ
 * болдог — үржих тэмдэг нь тэгшитгэлийн орон зайг олон дахин тэлж,
 * «2×4=8» мэтийн огт өөр төрлийн оньсого боломжтой болгоно.
 */
export const OPERATOR_SLOTS = ["t", "m", "v", "x1", "x2"] as const;

/** Тоо → сегментийн маск (a…g). Калькулятор дүрс. */
const DIGIT_MASKS: Record<number, string> = {
  0: "1111110",
  1: "0110000",
  2: "1101101",
  3: "1111001",
  4: "0110011",
  5: "1011011",
  6: "1011111",
  7: "1110000",
  8: "1111111",
  9: "1111011",
};

/** Тэмдэг → сандлын маск (t, m, v, x1, x2). */
const OPERATOR_MASKS: Record<string, string> = {
  "=": "11000",
  "-": "01000",
  "+": "01100",
  "*": "00011",
};

const DIGIT_BY_MASK = new Map<string, number>(
  Object.entries(DIGIT_MASKS).map(([digit, mask]) => [mask, Number(digit)])
);

const OPERATOR_BY_MASK = new Map<string, string>(
  Object.entries(OPERATOR_MASKS).map(([op, mask]) => [mask, op])
);

export type Cell =
  | { kind: "digit"; mask: string }
  | { kind: "operator"; mask: string };

export type Matchstick = { cells: Cell[] };

/** Нүдний сандлын тоо. */
export function slotCount(cell: Cell): number {
  return cell.kind === "digit" ? 7 : 5;
}

/** Нүд ойлгомжтой дүрс болж уншигдаж байна уу. */
export function glyphOf(cell: Cell): string | null {
  if (cell.kind === "digit") {
    const digit = DIGIT_BY_MASK.get(cell.mask);
    return digit === undefined ? null : String(digit);
  }
  return OPERATOR_BY_MASK.get(cell.mask) ?? null;
}

/** Бүх нүд уншигдахуйц эсэх — уншигдахгүй бол «шийдэгдээгүй». */
export function isReadable(puzzle: Matchstick): boolean {
  return puzzle.cells.every((cell) => glyphOf(cell) !== null);
}

/** Уншигдах хэлбэр — «6+4=4». Уншигдахгүй бол `null`. */
export function toText(puzzle: Matchstick): string | null {
  const parts = puzzle.cells.map(glyphOf);
  return parts.some((part) => part === null) ? null : parts.join("");
}

export function encodeMatchstick(puzzle: Matchstick): string {
  const body = puzzle.cells
    .map((cell) => (cell.kind === "digit" ? `d${cell.mask}` : `o${cell.mask}`))
    .join("|");
  return `matchstick:${body}`;
}

/**
 * Хадгалсан мөрийг задалж ШАЛГАНА.
 *
 * ⚠ Зөвхөн хэлбэрийг биш, оньсого нь БУРУУ тэгшитгэл эсэхийг ч шалгана:
 * аль хэдийн зөв тэгшитгэл бол сурагч юу ч зөөхгүйгээр «шийдсэн» болно,
 * эсрэгээр нь уншигдахгүй дүрс байвал юу хийхийг ойлгохгүй.
 */
export function decodeMatchstick(raw: string | null | undefined): Matchstick | null {
  if (typeof raw !== "string") return null;

  const text = raw.trim();
  if (!MATCHSTICK_RE.test(text)) return null;

  const cells: Cell[] = text
    .slice("matchstick:".length)
    .split("|")
    .map((chunk) =>
      chunk[0] === "d"
        ? ({ kind: "digit", mask: chunk.slice(1) } as Cell)
        : ({ kind: "operator", mask: padOperatorMask(chunk.slice(1)) } as Cell)
    );

  const puzzle: Matchstick = { cells };

  if (!isReadable(puzzle)) return null;
  // Оньсого нь БУРУУ байх ёстой — зөв бол шийдэх юм үлдэхгүй.
  if (evaluate(puzzle) === true) return null;
  // Нэг ч шийдэлгүй оньсого нь сурагчийг мөнхөд гацуулна.
  if (countSolutions(puzzle, 1) === 0) return null;

  return puzzle;
}

/**
 * Тэгшитгэлийг тооцно.
 *
 * `true`/`false` — уншигдсан ба тооцогдсон. `null` — дүрс уншигдахгүй,
 * эсвэл тэгшитгэлийн хэлбэр буруу (жишээ нь «=» тэмдэг байхгүй).
 */
export function evaluate(puzzle: Matchstick): boolean | null {
  const text = toText(puzzle);
  if (text === null) return null;

  const sides = text.split("=");
  if (sides.length !== 2) return null;

  const left = evalSide(sides[0]);
  const right = evalSide(sides[1]);
  if (left === null || right === null) return null;

  return left === right;
}

/**
 * Нэг талыг тооцно — зөвхөн `+`, `−`, зүүнээс баруун.
 *
 * ⚠ ТЭРГҮҮН ТЭГ зөвшөөрөхгүй («05+3=8»): тэр нь математикийн хувьд зөв ч
 * оньсогын хувьд шударга биш — сурагч «тоо тэгээр эхэлж болдог юм уу?»
 * гэдгийг таах шаардлагатай болно.
 */
function evalSide(side: string): number | null {
  if (side.length === 0) return null;

  const numbers: number[] = [];
  const ops: string[] = [];
  let current = "";

  /** «0» өөрөө хүчинтэй, «05» биш. */
  const pushNumber = () => {
    if (current.length === 0) return false;
    if (current.length > 1 && current[0] === "0") return false;
    numbers.push(Number(current));
    current = "";
    return true;
  };

  for (const char of side) {
    if (char >= "0" && char <= "9") {
      current += char;
      continue;
    }
    if (char !== "+" && char !== "-" && char !== "*") return null;
    // Тэмдэг тооны ДАРАА л байна («+3» гэх мэт тэргүүн тэмдэг зөвшөөрөхгүй).
    if (!pushNumber()) return null;
    ops.push(char);
  }

  if (!pushNumber()) return null;

  /*
   * ⚠ ҮРЖИХ нь ЭХЭЛЖ бодогдоно. Зүүнээс баруун дараалан бодвол «2+3×4»
   * нь 20 болж, сурагчийн сургууль дээр сурсан дүрэмтэй зөрнө — тэр үед
   * оньсого нь математик биш, манай кодын дүрмийг таах болно.
   */
  const collapsed: number[] = [numbers[0]];
  const addSub: string[] = [];

  for (let i = 0; i < ops.length; i += 1) {
    if (ops[i] === "*") {
      collapsed[collapsed.length - 1] *= numbers[i + 1];
    } else {
      addSub.push(ops[i]);
      collapsed.push(numbers[i + 1]);
    }
  }

  let total = collapsed[0];
  for (let i = 0; i < addSub.length; i += 1) {
    total = addSub[i] === "+" ? total + collapsed[i + 1] : total - collapsed[i + 1];
  }
  return total;
}

export type Slot = { cell: number; slot: number };

/** Бүх сандал — дүүрэн эсвэл хоосон. */
export function slots(puzzle: Matchstick): { filled: Slot[]; empty: Slot[] } {
  const filled: Slot[] = [];
  const empty: Slot[] = [];

  puzzle.cells.forEach((cell, cellIndex) => {
    for (let slot = 0; slot < slotCount(cell); slot += 1) {
      (cell.mask[slot] === "1" ? filled : empty).push({ cell: cellIndex, slot });
    }
  });

  return { filled, empty };
}

function withSlot(cell: Cell, slot: number, value: "0" | "1"): Cell {
  const mask = cell.mask.slice(0, slot) + value + cell.mask.slice(slot + 1);
  return { kind: cell.kind, mask } as Cell;
}

/** Нэг таягийг `from`-оос `to` руу зөөнө. Боломжгүй бол `null`. */
export function applyMove(puzzle: Matchstick, from: Slot, to: Slot): Matchstick | null {
  if (from.cell === to.cell && from.slot === to.slot) return null;

  const cells = [...puzzle.cells];
  if (cells[from.cell].mask[from.slot] !== "1") return null;
  if (cells[to.cell].mask[to.slot] !== "0") return null;

  cells[from.cell] = withSlot(cells[from.cell], from.slot, "0");
  cells[to.cell] = withSlot(cells[to.cell], to.slot, "1");

  return { cells };
}

/**
 * НЭГ таяг зөөж зөв болгох нүүдлийн тоо.
 *
 * ⚠ Ижил ҮР ДҮНГ хоёр удаа тоолохгүй: нүүдэл өөр ч гарах ТЕКСТ ижил
 * байж болно (жишээ нь «8»-ын хоёр өөр сегментийг авахад хоёулаа «0»
 * болох). Сурагчийн хувьд тэр нь НЭГ шийдэл тул текстээр давхардлыг
 * хална — эс бөгөөс «ганц шийдэлтэй» шалгуур хуурамчаар унана.
 */
export function countSolutions(puzzle: Matchstick, limit = Number.MAX_SAFE_INTEGER): number {
  const { filled, empty } = slots(puzzle);
  const seen = new Set<string>();

  for (const from of filled) {
    for (const to of empty) {
      const next = applyMove(puzzle, from, to);
      if (!next) continue;
      if (evaluate(next) !== true) continue;

      const text = toText(next);
      if (text === null || seen.has(text)) continue;
      seen.add(text);
      if (seen.size >= limit) return seen.size;
    }
  }

  return seen.size;
}

// ---------------------------------------------------------------------------
// ЗУРГИЙН ГЕОМЕТР
// ---------------------------------------------------------------------------

/**
 * Таяг бүрийн байрлал.
 *
 * ⚠ ЭНЭ НЬ UI-Д БИШ, САНД байна: зурагчаас (`MatchstickExercise`) гадна
 * шалгах/гаргах скриптүүд ч ижил байрлалыг хэрэглэх ёстой. Хоёр газар
 * тусад нь бичвэл нэгийг зассан үед нөгөө нь чимээгүй зөрж, дүрс нь
 * буруу харагдана.
 */
export const DIGIT_W = 44;
export const OP_W = 34;
export const CELL_H = 86;
export const STICK = 8;
export const CELL_GAP = 10;

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Төвөө тойрсон эргэлт (градус) — «×»-ийн хилбэр таягуудад. */
  rotate?: number;
};

/** Тооны сегмент бүрийн байрлал — индекс нь a,b,c,d,e,f,g. */
function digitRects(): Rect[] {
  const inset = STICK / 2 + 1;
  const mid = (CELL_H - STICK) / 2;
  const armH = mid - inset;

  return [
    { x: inset, y: 0, w: DIGIT_W - inset * 2, h: STICK }, // a — дээд хэвтээ
    { x: DIGIT_W - STICK, y: inset, w: STICK, h: armH }, // b — дээд баруун
    { x: DIGIT_W - STICK, y: mid + STICK, w: STICK, h: armH }, // c — доод баруун
    { x: inset, y: CELL_H - STICK, w: DIGIT_W - inset * 2, h: STICK }, // d — доод хэвтээ
    { x: 0, y: mid + STICK, w: STICK, h: armH }, // e — доод зүүн
    { x: 0, y: inset, w: STICK, h: armH }, // f — дээд зүүн
    { x: inset, y: mid, w: DIGIT_W - inset * 2, h: STICK }, // g — дунд хэвтээ
  ];
}

/**
 * Тэмдгийн сандлын байрлал — t (дээд хэвтээ), m (дунд хэвтээ), v (босоо).
 *
 * ⚠ `m` нь тэгшитгэлийн ДУНД өндөрт: «−» ганцаараа байхад тэр өндөрт
 * харагдах ёстой. «=» нь `t`+`m` тул `t` нь `m`-ээс ДЭЭР байрлана.
 */
function operatorRects(): Rect[] {
  /*
   * ⚠ Хоёр зураасын ХООРОНДЫН зай нь «=»-ийг уншихад шийдвэрлэх: хэт
   * ойр байвал «÷» эсвэл зузаан зураас шиг харагдана. 20 нь таягны
   * зузаанаас (8) хоёр дахин илүү цоорхой үлдээнэ.
   */
  const m = (CELL_H - STICK) / 2 + 6;
  const t = m - 20;

  /*
   * «×»-ийн хоёр хилбэр нь босоо таягтай ИЖИЛ урттай, ±45° эргүүлсэн —
   * эс бөгөөс «×» нь «+»-ээс жижиг, өөр жинтэй харагдана.
   */
  const cross = STICK + 28;
  const cx = (OP_W - STICK) / 2;
  const cy = m - 14;

  return [
    { x: 0, y: t, w: OP_W, h: STICK }, // t
    { x: 0, y: m, w: OP_W, h: STICK }, // m
    { x: cx, y: cy, w: STICK, h: cross }, // v
    { x: cx, y: cy, w: STICK, h: cross, rotate: 45 }, // x1
    { x: cx, y: cy, w: STICK, h: cross, rotate: -45 }, // x2
  ];
}

/** Нүдний таягны байрлалууд — маскийн индекстэй ЯГ тохирно. */
export function slotRects(cell: Cell): Rect[] {
  return cell.kind === "digit" ? digitRects() : operatorRects();
}

export function cellWidth(cell: Cell): number {
  return cell.kind === "digit" ? DIGIT_W : OP_W;
}

/** Нүд тус бүрийн зүүн талын нийлбэр зай, мөн зургийн бүтэн өргөн. */
export function layout(puzzle: Matchstick): { offsets: number[]; width: number } {
  const offsets: number[] = [];
  let width = 0;

  puzzle.cells.forEach((cell, index) => {
    offsets[index] = width;
    width += cellWidth(cell) + (index < puzzle.cells.length - 1 ? CELL_GAP : 0);
  });

  return { offsets, width };
}

/** Текстээс оньсого угсрана — «6+4=4» гэх мэт. Танихгүй тэмдэгт бол `null`. */
export function fromText(text: string): Matchstick | null {
  const cells: Cell[] = [];

  for (const char of text) {
    if (char >= "0" && char <= "9") {
      cells.push({ kind: "digit", mask: DIGIT_MASKS[Number(char)] });
      continue;
    }
    const mask = OPERATOR_MASKS[char];
    if (!mask) return null;
    cells.push({ kind: "operator", mask });
  }

  return cells.length > 0 ? { cells } : null;
}
