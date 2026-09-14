/**
 * НОНОГРАМ (japanese crossword) — мөр, баганын тоонуудаар нүд будаж зураг гаргана.
 *
 * ⚠ `server-only` БИШ: клиент компонент, серверийн шалгалт, seed script
 * гурвуулаа импортолдог.
 *
 * ДҮРЭМ. Мөр бүрийн зүүн талд, багана бүрийн дээр ТООНУУД байна — тэдгээр
 * нь тухайн мөр/баганад дарааллан орших БУДСАН нүднүүдийн БҮЛГҮҮДИЙН урт.
 * Бүлэг хооронд дор хаяж нэг хоосон нүд байна.
 *
 *   2 1  →  ██·█··  эсвэл  ·██·█·  гэх мэт
 *
 * ⚠ ГАНЦ ШИЙДЭЛТЭЙ байх нь ЗААВАЛ: хоёр шийдэлтэй нонограм нь логикоор
 * биш ТААЖ бодох болж хувирдаг, бөгөөд сурагч зөв бодсон ч «буруу» гэж
 * хэлэгдэж мэднэ. Үүсгэгч бүх хувилбарыг тоолж шалгана.
 */

/** Хадгалах хэлбэр: "nonogram:<өргөн>x<өндөр>:<hex битмаск>" */
export const NONOGRAM_RE = /^nonogram:(\d{1,2})x(\d{1,2}):([0-9a-f]+)$/;

export const NONOGRAM_MIN = 4;
/**
 * Дээд тал нь 10×10.
 *
 * ⚠ Түүнээс том бол утасны дэлгэцэд нүд бүр 28px-ээс жижиг болж, хуруугаар
 * оноход хөрш нүд дарагдана — оньсого нь логикийн биш, нарийвчлалын
 * сорилт болно.
 */
export const NONOGRAM_MAX = 10;

export type Nonogram = {
  width: number;
  height: number;
  /** Будагдах ёстой нүднүүд — `r * width + c`. */
  filled: Set<number>;
};

/**
 * Нэг мөр/баганын ТООНУУД — будсан нүдний бүлгүүдийн урт.
 *
 * ⚠ Огт будагдаагүй мөрийг `[0]` гэж заана (хоосон массив биш): дэлгэцэнд
 * «энд юу ч байхгүй» гэдгийг ИЛ харуулах ёстой, эс бөгөөс сурагч тэр
 * мөрийг «бодоогүй» гэж эргэлзэнэ.
 */
export function runsOf(cells: boolean[]): number[] {
  const runs: number[] = [];
  let current = 0;

  for (const cell of cells) {
    if (cell) {
      current += 1;
    } else if (current > 0) {
      runs.push(current);
      current = 0;
    }
  }
  if (current > 0) runs.push(current);

  return runs.length > 0 ? runs : [0];
}

export function rowCells(puzzle: Nonogram, r: number): boolean[] {
  return Array.from({ length: puzzle.width }, (_, c) => puzzle.filled.has(r * puzzle.width + c));
}

export function columnCells(puzzle: Nonogram, c: number): boolean[] {
  return Array.from({ length: puzzle.height }, (_, r) => puzzle.filled.has(r * puzzle.width + c));
}

export function rowClues(puzzle: Nonogram): number[][] {
  return Array.from({ length: puzzle.height }, (_, r) => runsOf(rowCells(puzzle, r)));
}

export function columnClues(puzzle: Nonogram): number[][] {
  return Array.from({ length: puzzle.width }, (_, c) => runsOf(columnCells(puzzle, c)));
}

/** Сурагчийн будсан нүднүүд шийдэлтэй ЯГ тэнцэх эсэх. */
export function isSolved(puzzle: Nonogram, filled: Set<number>): boolean {
  if (filled.size !== puzzle.filled.size) return false;
  for (const index of filled) if (!puzzle.filled.has(index)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Кодчлол
// ---------------------------------------------------------------------------

export function encodeNonogram(puzzle: Nonogram): string {
  const bits = puzzle.width * puzzle.height;
  const bytes = new Uint8Array(Math.ceil(bits / 8));

  for (const index of puzzle.filled) bytes[index >> 3] |= 1 << (index & 7);

  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `nonogram:${puzzle.width}x${puzzle.height}:${hex}`;
}

/**
 * Задалж ШАЛГАНА.
 *
 * ⚠ Зөвхөн хэлбэрийг биш, оньсого ГАНЦ шийдэлтэй эсэхийг ч шалгана.
 * Олон шийдэлтэй бол сурагч логикоор гаргах боломжгүй болно.
 */
export function decodeNonogram(raw: string | null | undefined): Nonogram | null {
  if (typeof raw !== "string") return null;

  const match = NONOGRAM_RE.exec(raw.trim());
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (width < NONOGRAM_MIN || width > NONOGRAM_MAX) return null;
  if (height < NONOGRAM_MIN || height > NONOGRAM_MAX) return null;

  const bytes = match[3].match(/../g) ?? [];
  const filled = new Set<number>();

  for (let index = 0; index < width * height; index += 1) {
    const byte = parseInt(bytes[index >> 3] ?? "0", 16);
    if (byte & (1 << (index & 7))) filled.add(index);
  }

  // Бүхэлдээ хоосон, эсвэл бүхэлдээ дүүрэн бол бодох зүйл үлдэхгүй.
  if (filled.size === 0 || filled.size === width * height) return null;

  const puzzle: Nonogram = { width, height, filled };
  return countSolutions(puzzle, 2) === 1 ? puzzle : null;
}

// ---------------------------------------------------------------------------
// Шийдэгч
// ---------------------------------------------------------------------------

/**
 * Өгөгдсөн тоонуудад тохирох БҮХ мөрийн хувилбар.
 *
 * ⚠ Энэ нь шийдэгчийн цөм: мөр бүрийн боломжуудыг урьдчилан гаргаад
 * дараа нь мөр мөрөөр нь угсарна. 10 өргөнтэй мөрийн хувилбарын тоо
 * хамгийн ихдээ хэдэн зуу тул бүрэн тоочих нь хямд.
 */
export function lineOptions(width: number, runs: number[]): boolean[][] {
  const groups = runs.filter((run) => run > 0);
  if (groups.length === 0) return [Array.from({ length: width }, () => false)];

  const out: boolean[][] = [];

  const place = (index: number, start: number, acc: boolean[]) => {
    if (index === groups.length) {
      out.push([...acc, ...Array.from({ length: width - acc.length }, () => false)]);
      return;
    }

    const remaining = groups.slice(index).reduce((sum, run) => sum + run, 0);
    const gaps = groups.length - index - 1;
    const latest = width - remaining - gaps;

    for (let at = start; at <= latest; at += 1) {
      const next = [...acc];
      while (next.length < at) next.push(false);
      for (let i = 0; i < groups[index]; i += 1) next.push(true);
      // Бүлэг хооронд ЗААВАЛ нэг хоосон.
      if (index < groups.length - 1) next.push(false);
      place(index + 1, next.length, next);
    }
  };

  place(0, 0, []);
  return out;
}

/**
 * Тоонуудаас шийдлийн тоог олно (`limit` хүртэл).
 *
 * Мөр мөрөөр нь угсарч, мөр нэмэх бүрд БАГАНУУД хараахан зөрчөөгүй эсэхийг
 * шалгана — бүрэн угсарч дуустал хүлээвэл хайлт олон дахин удаашрана.
 */
export function countSolutions(puzzle: Nonogram, limit = 2): number {
  const { width, height } = puzzle;
  const rows = rowClues(puzzle);
  const columns = columnClues(puzzle);
  const optionsPerRow = rows.map((runs) => lineOptions(width, runs));

  let found = 0;
  const grid: boolean[][] = [];

  /** Хэсэгчилсэн торны багана тоонуудтай зөрчилдөөгүй эсэх. */
  const columnsFeasible = (filledRows: number): boolean => {
    for (let c = 0; c < width; c += 1) {
      const prefix = grid.map((row) => row[c]);
      const runs = runsOf(prefix).filter((run) => run > 0);
      const target = columns[c].filter((run) => run > 0);

      if (filledRows === height) {
        if (runs.length !== target.length) return false;
        if (runs.some((run, index) => run !== target[index])) return false;
        continue;
      }

      // Сүүлийн бүлэг үргэлжилж болох тул түүнийг «дутуу» гэж зөвшөөрнө.
      const openTail = prefix[prefix.length - 1] === true;
      const closed = openTail ? runs.slice(0, -1) : runs;

      if (closed.length > target.length) return false;
      if (closed.some((run, index) => run !== target[index])) return false;
      if (openTail) {
        const last = runs[runs.length - 1];
        if (closed.length >= target.length) return false;
        if (last > target[closed.length]) return false;
      }
    }
    return true;
  };

  const walk = (r: number): void => {
    if (found >= limit) return;

    if (r === height) {
      if (columnsFeasible(height)) found += 1;
      return;
    }

    for (const option of optionsPerRow[r]) {
      grid.push(option);
      if (columnsFeasible(r + 1)) walk(r + 1);
      grid.pop();
      if (found >= limit) return;
    }
  };

  walk(0);
  return found;
}
