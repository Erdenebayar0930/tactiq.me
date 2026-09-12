/**
 * "100 нүдэн шашки" (Олон улсын дам, International Draughts) — 10x10 хөлөг,
 * зөвхөн бараан 50 нүдийг ашигладаг. `chess.js`-тэй ижил төрлийн сан
 * (npm-д) байхгүй тул дүрмийг бүхэлд нь ЭНД шинээр бичсэн.
 *
 * Хэрэгжүүлсэн албан ёсны (FMJD) дүрэм:
 *   • Энгийн нүүдэл — бэр (man) ЗӨВХӨН урагшаа диагоналиар нэг нүд,
 *     хаан (king) хязгааргүй зайд диагоналиар (Chess bishop шиг "нисдэг").
 *   • Идэлт ЗААВАЛ — идэх боломжтой бол өөр нүүдэл хийж БОЛОХГҮЙ.
 *   • ХАМГИЙН ИХ идэлтийн дүрэм — олон сонголтоос хамгийн ОЛОН дүрс идэх
 *     хэлхээг л зөвшөөрнө (энгийн "аль нэг идэлт" биш).
 *   • Бэр ч ХОЙШОО идэж чадна (энгийн нүүдэл л урагшаа хязгаарлагдана).
 *   • Олон дараалсан идэлт (нэг нүүдэлд хэдэн ч дүрс) дэмжигдсэн.
 *   • Идсэн дүрс нүүдлийн ТӨГСГӨЛ хүртэл хөлөг дээр "саад" хэвээр үлдэнэ
 *     (дахин алгасаж болохгүй, дээгүүр нь буулгаж болохгүй).
 *   • Сүүлийн эгнээнд хүрвэл хаан болно — хэрэв энэ нь идэлтийн ХЭЛХЭЭНИЙ
 *     дундуур тохиолдвол, ҮЛДСЭН хэсгийг ХААНААР үргэлжлүүлнэ (albeit
 *     хааны "нисдэг" идэлтээр).
 *   • 25 бүтэн нүүдэл (= 50 хагас нүүдэл) идэлт/бэрийн нүүдэлгүй өнгөрвөл
 *     тэнцээ (хязгааргүй давталтаас сэргийлнэ).
 */

export type Color = "w" | "b";

export type Square = { row: number; col: number };

export type Piece = { color: Color; king: boolean };

export type Board = (Piece | null)[][];

export type DraughtsMove = {
  from: Square;
  to: Square;
  /** Энэ нүүдэлд идэгдсэн бүх нүд, дараалалтайгаар (хоосон = энгийн нүүдэл). */
  captures: Square[];
  /** Энэ нүүдлийн төгсгөлд дүрс хаан болсон эсэх. */
  promoted: boolean;
};

const SIZE = 10;
const DIRS: readonly [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
}

function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function squareKey(square: Square): string {
  return `${square.row},${square.col}`;
}

function sameSquare(a: Square, b: Square): boolean {
  return a.row === b.row && a.col === b.col;
}

/** Эхлэх байрлал — хар дээш (мөр 9 рүү), цагаан дээш (мөр 0 рүү) нүүдэг гэж тохирсон. */
function initialBoard(): Board {
  const board: Board = Array.from({ length: SIZE }, () => Array<Piece | null>(SIZE).fill(null));
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (!isDark(row, col)) continue;
      if (row <= 3) board[row][col] = { color: "b", king: false };
      else if (row >= 6) board[row][col] = { color: "w", king: false };
    }
  }
  return board;
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

function simpleMovesFrom(board: Board, from: Square, piece: Piece): DraughtsMove[] {
  const moves: DraughtsMove[] = [];

  if (piece.king) {
    for (const [dr, dc] of DIRS) {
      let row = from.row + dr;
      let col = from.col + dc;
      while (inBounds(row, col) && !board[row][col]) {
        moves.push({ from, to: { row, col }, captures: [], promoted: false });
        row += dr;
        col += dc;
      }
    }
    return moves;
  }

  const dr = piece.color === "w" ? -1 : 1;
  for (const dc of [-1, 1]) {
    const row = from.row + dr;
    const col = from.col + dc;
    if (!inBounds(row, col) || board[row][col]) continue;
    const promoted = (piece.color === "w" && row === 0) || (piece.color === "b" && row === SIZE - 1);
    moves.push({ from, to: { row, col }, captures: [], promoted });
  }
  return moves;
}

/**
 * `vacated`-аас бусад бүх дүрстэй нүдийг "эзэлсэн" гэж үзнэ — `vacated` нь
 * нүүдэл эхэлсэн анхны нүд, идэлтийн хэлхээний дундуур виртуалиар хоосорсон
 * гэж тооцогдоно (хөлөгт бодитоор ХАРВАЛ ХЭДИЙ БОЛТОЛГҮЙ, зөвхөн эрэлд).
 */
function isPassable(board: Board, square: Square, vacated: Square): boolean {
  if (sameSquare(square, vacated)) return true;
  return !board[square.row][square.col];
}

/**
 * Тухайн дүрснээс эхэлсэн БОЛОМЖИТ БҮХ идэлтийн хэлхээг (зөвхөн МАКСИМАЛЬ
 * — цааш үргэлжлэх боломжгүй болтол) рекурсоор олно.
 */
function captureSequencesFrom(
  board: Board,
  origin: Square,
  current: Square,
  piece: Piece,
  captured: Set<string>,
  path: Square[]
): DraughtsMove[] {
  const extensions: DraughtsMove[] = [];

  for (const [dr, dc] of DIRS) {
    if (piece.king) {
      // Хаан: хоосон нүдээр "нисээд", яг НЭГ дайсны дүрстэй тулгарна.
      let row = current.row + dr;
      let col = current.col + dc;
      while (inBounds(row, col) && isPassable(board, { row, col }, origin) && !captured.has(squareKey({ row, col }))) {
        row += dr;
        col += dc;
      }
      if (!inBounds(row, col)) continue;

      const enemySquare = { row, col };
      const enemy = board[row][col];
      const alreadyCaptured = captured.has(squareKey(enemySquare));
      if (!enemy || enemy.color === piece.color || alreadyCaptured) continue;

      // Дайсны цаана хоосон нүд бүрд буух боломжтой — тус бүрээс хэлхээг үргэлжлүүлнэ.
      let landRow = row + dr;
      let landCol = col + dc;
      while (
        inBounds(landRow, landCol) &&
        isPassable(board, { row: landRow, col: landCol }, origin) &&
        !captured.has(squareKey({ row: landRow, col: landCol }))
      ) {
        const landing = { row: landRow, col: landCol };
        const nextCaptured = new Set(captured);
        nextCaptured.add(squareKey(enemySquare));
        const nextPath = [...path, enemySquare];
        const deeper = captureSequencesFrom(board, origin, landing, piece, nextCaptured, nextPath);
        if (deeper.length > 0) extensions.push(...deeper);
        else extensions.push({ from: origin, to: landing, captures: nextPath, promoted: false });
        landRow += dr;
        landCol += dc;
      }
    } else {
      // Бэр: яг зэргэлдээ нүдэн дэх дайсныг НЭГ алхмаар алгасна (АЛЬ Ч чиглэлээр).
      const midRow = current.row + dr;
      const midCol = current.col + dc;
      const landRow = current.row + 2 * dr;
      const landCol = current.col + 2 * dc;
      if (!inBounds(landRow, landCol)) continue;

      const midSquare = { row: midRow, col: midCol };
      const enemy = board[midRow]?.[midCol];
      if (!enemy || enemy.color === piece.color || captured.has(squareKey(midSquare))) continue;

      const landing = { row: landRow, col: landCol };
      if (!isPassable(board, landing, origin) || captured.has(squareKey(landing))) continue;

      const nextCaptured = new Set(captured);
      nextCaptured.add(squareKey(midSquare));
      const nextPath = [...path, midSquare];

      // Хааны эгнээнд хүрвэл ЭНД ХААН болоод, ҮЛДСЭН хэлхээг хааны дүрмээр үргэлжлүүлнэ.
      const reachesKingRow =
        (piece.color === "w" && landRow === 0) || (piece.color === "b" && landRow === SIZE - 1);
      const effectivePiece = reachesKingRow ? { ...piece, king: true } : piece;

      const deeper = captureSequencesFrom(board, origin, landing, effectivePiece, nextCaptured, nextPath);
      if (deeper.length > 0) extensions.push(...deeper);
      else extensions.push({ from: origin, to: landing, captures: nextPath, promoted: reachesKingRow });
    }
  }

  return extensions;
}

/** Тухайн нүүдлийн (25 x 2 хагас) идэлт/бэрийн шилжилтгүй өнгөрсөн тоог хязгаарлана — тэнцээний баталгаа. */
const NO_PROGRESS_DRAW_LIMIT = 50;

export class Draughts {
  private grid: Board;
  private side: Color;
  private noProgressCount: number;
  private history: {
    move: DraughtsMove;
    capturedPieces: { square: Square; piece: Piece }[];
    wasKing: boolean;
    prevNoProgressCount: number;
  }[] = [];

  /**
   * `setup` өгвөл ТУХАЙН байрлалаас, эс бөгөөс ердийн эхлэх байрлалаас
   * эхэлнэ — `admin/courses`-ийн "дам дээр нүүдэл" дасгал засварлагч болон
   * тэдгээр дасгалыг тоглуулагч (`lib/draughts/notation.ts`-ийн
   * `deserializePosition`) хоёулаа хэрэглэнэ.
   */
  constructor(setup?: { board: Board; turn: Color }) {
    this.grid = setup ? cloneBoard(setup.board) : initialBoard();
    this.side = setup?.turn ?? "w";
    this.noProgressCount = 0;
  }

  /** Одоогийн нүүх тал. */
  turn(): Color {
    return this.side;
  }

  /** Хөлгийн хуулбар — дуудагч талд шууд харуулахад зориулав, өөрчлөхөд аюулгүй. */
  board(): Board {
    return cloneBoard(this.grid);
  }

  private piecesOf(color: Color): Square[] {
    const squares: Square[] = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const cell = this.grid[row][col];
        if (cell && cell.color === color) squares.push({ row, col });
      }
    }
    return squares;
  }

  /**
   * Одоогийн нүүх талын хууль ёсны БҮХ нүүдэл — идэлт заавал, максималь
   * идэлтийн дүрэм аль хэдийн ЭНД шүүгдсэн байна (дуудагч тал дахин
   * шалгах шаардлагагүй).
   */
  legalMoves(): DraughtsMove[] {
    const captures: DraughtsMove[] = [];
    for (const square of this.piecesOf(this.side)) {
      const piece = this.grid[square.row][square.col]!;
      captures.push(...captureSequencesFrom(this.grid, square, square, piece, new Set(), []));
    }

    if (captures.length > 0) {
      const maxLen = Math.max(...captures.map((m) => m.captures.length));
      return captures.filter((m) => m.captures.length === maxLen);
    }

    const simples: DraughtsMove[] = [];
    for (const square of this.piecesOf(this.side)) {
      const piece = this.grid[square.row][square.col]!;
      simples.push(...simpleMovesFrom(this.grid, square, piece));
    }
    return simples;
  }

  /** Тухайн нүднээс эхэлсэн хууль ёсны нүүдлүүд — UI-д тодотголд ашиглана. */
  movesFrom(square: Square): DraughtsMove[] {
    return this.legalMoves().filter((m) => sameSquare(m.from, square));
  }

  /** `legalMoves()`-ийн аль нэгэнтэй яг таарсан бол ХЭРЭГЖҮҮЛНЭ, эс бөгөөс `null`. */
  move(from: Square, to: Square): DraughtsMove | null {
    const match = this.legalMoves().find(
      (m) => sameSquare(m.from, from) && sameSquare(m.to, to)
    );
    if (!match) return null;
    this.applyMove(match);
    return match;
  }

  /** Хайлтад (bot) ашиглах хурдан хувилбар — `move`-ийн ялгаа: аль хэдийн баталгаажсан `DraughtsMove`-ыг шууд хэрэгжүүлнэ. */
  applyMove(m: DraughtsMove): void {
    const piece = this.grid[m.from.row][m.from.col];
    if (!piece) throw new Error("Хөдөлгөх дүрс олдсонгүй.");

    const capturedPieces = m.captures.map((square) => {
      const captured = this.grid[square.row][square.col];
      if (!captured) throw new Error("Идэгдэх дүрс олдсонгүй.");
      return { square, piece: captured };
    });

    this.history.push({
      move: m,
      capturedPieces,
      wasKing: piece.king,
      prevNoProgressCount: this.noProgressCount,
    });

    this.grid[m.from.row][m.from.col] = null;
    for (const square of m.captures) this.grid[square.row][square.col] = null;
    this.grid[m.to.row][m.to.col] = { color: piece.color, king: piece.king || m.promoted };

    this.noProgressCount =
      m.captures.length > 0 || m.promoted || !piece.king ? 0 : this.noProgressCount + 1;

    this.side = this.side === "w" ? "b" : "w";
  }

  /**
   * Тоглогдсон нүүдлүүд, дарааллаараа — тоглоомын дараах шинжилгээнд
   * (`lib/draughts/analysis.ts`) ЭХНЭЭС нь дахин тоглуулахад хэрэгтэй.
   *
   * ⚠ Дотоод `history` нь `undo`-д зориулсан НЭМЭЛТ мэдээлэлтэй (идэгдсэн
   * дүрс, хаан байсан эсэх) — түүнийг бүтнээр нь гаргавал дуудагч тал
   * буцаах логикоос хамааралтай болно. Тиймээс зөвхөн нүүдлүүдийг хуулж
   * өгнө: шинжилгээ шинэ `Draughts`-аар дахин тоглуулах тул үлдсэн нь
   * хэрэггүй.
   */
  moveHistory(): DraughtsMove[] {
    return this.history.map((entry) => entry.move);
  }

  /** Хайлтад (bot) ашиглах — сүүлийн `applyMove`/`move`-ыг буцаана. */
  undo(): void {
    const entry = this.history.pop();
    if (!entry) return;

    const { move: m, capturedPieces, wasKing, prevNoProgressCount } = entry;
    const piece = this.grid[m.to.row][m.to.col];
    if (!piece) throw new Error("Буцаах дүрс олдсонгүй.");

    this.grid[m.to.row][m.to.col] = null;
    this.grid[m.from.row][m.from.col] = { color: piece.color, king: wasKing };
    for (const { square, piece: captured } of capturedPieces) {
      this.grid[square.row][square.col] = captured;
    }

    this.noProgressCount = prevNoProgressCount;
    this.side = this.side === "w" ? "b" : "w";
  }

  /** Одоогийн нүүх тал ХУУЛЬ ЁСНЫ нүүдэлгүй (ялагдсан), эсвэл тэнцээний хязгаарт хүрсэн эсэх. */
  isGameOver(): boolean {
    return this.noProgressCount >= NO_PROGRESS_DRAW_LIMIT || this.legalMoves().length === 0;
  }

  /** Ялагч — зөвхөн `isGameOver()` `true` үед утга учиртай. `null` = тэнцээ. */
  winner(): Color | null {
    if (this.noProgressCount >= NO_PROGRESS_DRAW_LIMIT) return null;
    if (this.legalMoves().length === 0) return this.side === "w" ? "b" : "w";
    return null;
  }

  isDraw(): boolean {
    return this.isGameOver() && this.winner() === null;
  }
}
