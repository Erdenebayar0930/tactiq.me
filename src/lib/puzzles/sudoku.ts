/**
 * СУДОКУ — мөр, багана, хайрцаг бүрд тоо ДАВТАГДАХГҮЙ.
 *
 * Гурван хэмжээг дэмжинэ: 4×4 (2×2 хайрцаг), 6×6 (2×3), 9×9 (3×3).
 * Жижиг хэмжээ нь эхлэн суралцагчид ЗААВАЛ хэрэгтэй: 9×9 нь 8 настай
 * хүүхдэд хэт том бөгөөд эхний л дасгал дээр урам хугална.
 *
 * ⚠ `server-only` БИШ: клиент компонент ба серверийн шалгалт хоёулаа
 * импортолдог.
 */

/** Хадгалах хэлбэр: "sudoku:<хэмжээ>:<нүднүүд>" — хоосон нүд нь "." */
export const SUDOKU_RE = /^sudoku:(4|6|9):([1-9.]+)$/;

export type SudokuSize = 4 | 6 | 9;

export type Sudoku = {
  size: SudokuSize;
  /** Эхэнд өгөгдсөн нүднүүд (0 = хоосон). Сурагч ЭДГЭЭРИЙГ засаж чадахгүй. */
  givens: number[];
};

/**
 * Хайрцгийн хэмжээ — өндөр × өргөн.
 *
 * ⚠ 6×6-д хайрцаг нь ДӨРВӨЛЖИН БИШ (2 мөр × 3 багана). Үүнийг `Math.sqrt`-ээр
 * тооцох гэвэл 6-гийн язгуур бүхэл биш тул шалгалт бүхэлдээ буруу болно.
 */
export function boxDims(size: SudokuSize): { boxRows: number; boxCols: number } {
  if (size === 4) return { boxRows: 2, boxCols: 2 };
  if (size === 6) return { boxRows: 2, boxCols: 3 };
  return { boxRows: 3, boxCols: 3 };
}

export function encodeSudoku(sudoku: Sudoku): string {
  const cells = sudoku.givens.map((value) => (value === 0 ? "." : String(value))).join("");
  return `sudoku:${sudoku.size}:${cells}`;
}

/**
 * Хадгалсан мөрийг задалж ШАЛГАНА.
 *
 * ⚠ Зөвхөн хэлбэрийг биш, ШИЙДЭГДЭХ эсэхийг шалгана: өгөгдсөн тоонууд нь
 * дүрэм зөрчөөгүй, БӨГӨӨД яг НЭГ шийдэлтэй байх ёстой. Олон шийдэлтэй
 * судоку нь «таах» тоглоом болж хувирдаг (логикоор гаргах боломжгүй), тэр
 * нь энэ хичээлийн бүх зорилгыг үгүй хийнэ.
 */
export function decodeSudoku(raw: string | null | undefined): Sudoku | null {
  if (typeof raw !== "string") return null;

  const match = SUDOKU_RE.exec(raw.trim());
  if (!match) return null;

  const size = Number(match[1]) as SudokuSize;
  const body = match[2];
  if (body.length !== size * size) return null;

  const givens = [...body].map((char) => (char === "." ? 0 : Number(char)));
  if (givens.some((value) => value > size)) return null;

  const sudoku: Sudoku = { size, givens };

  // Өгөгдсөн тоонууд өөрсдөө зөрчилгүй эсэх.
  for (let index = 0; index < givens.length; index += 1) {
    const value = givens[index];
    if (value === 0) continue;
    const probe = [...givens];
    probe[index] = 0;
    if (!isPlacementValid({ size, cells: probe }, index, value)) return null;
  }

  return countSolutions(sudoku, 2) === 1 ? sudoku : null;
}

type Board = { size: SudokuSize; cells: number[] };

/**
 * `value` утгыг `index` нүдэнд тавихад мөр, багана, хайрцгийн дүрэм
 * зөрчигдөх эсэх.
 */
export function isPlacementValid(board: Board, index: number, value: number): boolean {
  if (value === 0) return true;

  const { size, cells } = board;
  const row = Math.floor(index / size);
  const col = index % size;

  for (let i = 0; i < size; i += 1) {
    if (i !== col && cells[row * size + i] === value) return false;
    if (i !== row && cells[i * size + col] === value) return false;
  }

  const { boxRows, boxCols } = boxDims(size);
  const startRow = Math.floor(row / boxRows) * boxRows;
  const startCol = Math.floor(col / boxCols) * boxCols;

  for (let r = startRow; r < startRow + boxRows; r += 1) {
    for (let c = startCol; c < startCol + boxCols; c += 1) {
      const other = r * size + c;
      if (other !== index && cells[other] === value) return false;
    }
  }

  return true;
}

/** Сурагчийн бөглөсөн хүснэгт БҮРЭН бөгөөд ЗӨВ эсэх — ялалтын нөхцөл. */
export function isSudokuComplete(size: SudokuSize, cells: number[]): boolean {
  if (cells.some((value) => value === 0)) return false;

  return cells.every((value, index) => isPlacementValid({ size, cells }, index, value));
}

/**
 * Шийдлийн тоог тоолно (`limit`-д хүрмэгц зогсоно).
 *
 * `limit = 2` нь «ганц шийдэлтэй юу» гэдгийг хамгийн хямдаар хэлнэ —
 * хоёр дахийг олмогц хайлт зогсоно.
 */
export function countSolutions(sudoku: Sudoku, limit = 2): number {
  const { size } = sudoku;
  const cells = [...sudoku.givens];
  let found = 0;

  const solve = (): void => {
    if (found >= limit) return;

    // Хамгийн ЦӨӨН боломжтой нүдийг эхэлж бөглөнө — энгийн дарааллаар
    // явахаас олон дахин хурдан (хайлтын мод эрт тасарна).
    let best = -1;
    let bestOptions: number[] = [];

    for (let index = 0; index < cells.length; index += 1) {
      if (cells[index] !== 0) continue;

      const options: number[] = [];
      for (let value = 1; value <= size; value += 1) {
        if (isPlacementValid({ size, cells }, index, value)) options.push(value);
      }

      if (options.length === 0) return; // мухардал
      if (best === -1 || options.length < bestOptions.length) {
        best = index;
        bestOptions = options;
        if (options.length === 1) break;
      }
    }

    if (best === -1) {
      found += 1; // хоосон нүд алга — бүрэн шийдэл
      return;
    }

    for (const value of bestOptions) {
      cells[best] = value;
      solve();
      cells[best] = 0;
      if (found >= limit) return;
    }
  };

  solve();
  return found;
}

/* -------------------------------------------------------------------------
 * Үүсгэх
 * ---------------------------------------------------------------------- */

/** Массивыг үрлэсэн санамсаргүй тоогоор холино (Fisher-Yates). */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Бүрэн дүүрэн, зөв судоку үүсгэнэ (санамсаргүй эрэмбээр backtracking). */
function fillBoard(size: SudokuSize, rng: () => number): number[] {
  const cells = new Array<number>(size * size).fill(0);

  const fill = (index: number): boolean => {
    if (index >= cells.length) return true;

    for (const value of shuffle(
      Array.from({ length: size }, (_, i) => i + 1),
      rng
    )) {
      if (!isPlacementValid({ size, cells }, index, value)) continue;
      cells[index] = value;
      if (fill(index + 1)) return true;
      cells[index] = 0;
    }

    return false;
  };

  fill(0);
  return cells;
}

/**
 * Судоку үүсгэнэ — бүрэн хүснэгтээс нүдийг НЭГ НЭГЭЭР хасна.
 *
 * Хасалт бүрийн дараа «ганц шийдэлтэй хэвээр юу» гэдгийг шалгана; алдвал
 * тэр нүдийг буцааж тавина. Ингэснээр үр дүн нь ЯМАГТ ганц шийдэлтэй —
 * өөрөөр хэлбэл логикоор бодох боломжтой.
 *
 * @param keep Хэдэн нүд ҮЛДЭЭХ вэ (хүндрэл). Бага нь илүү хүнд.
 */
export function generateSudoku(size: SudokuSize, keep: number, rng: () => number): Sudoku {
  const full = fillBoard(size, rng);
  const cells = [...full];

  const order = shuffle(
    Array.from({ length: cells.length }, (_, index) => index),
    rng
  );

  let remaining = cells.length;

  for (const index of order) {
    if (remaining <= keep) break;

    const backup = cells[index];
    cells[index] = 0;

    if (countSolutions({ size, givens: cells }, 2) !== 1) {
      cells[index] = backup; // ганц шийдэл алдагдана — буцаана
      continue;
    }

    remaining -= 1;
  }

  return { size, givens: cells };
}

/** Хүндрэлийн зэрэг → үлдээх нүдний тоо. */
export function keepForDifficulty(size: SudokuSize, level: "easy" | "medium" | "hard"): number {
  const total = size * size;
  const ratio = level === "easy" ? 0.55 : level === "medium" ? 0.45 : 0.35;
  return Math.max(size + 1, Math.round(total * ratio));
}
