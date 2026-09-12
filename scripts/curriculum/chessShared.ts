/**
 * Шатрын хөтөлбөрийн ХУВААЛЦАХ төрөл, туслах, ШАЛГАГЧ.
 *
 * ⚠ Агуулга нь ТҮВШНЭЭР нь тусдаа файлд (`chessLevels*.ts`), байрлал
 * үүсгэгчид нь `chessGenerators.ts`-д байрлана. Seeder
 * (`scripts/seed-chess-curriculum.ts`) тэднийг нийлүүлнэ — даамын
 * хөтөлбөртэй (`draughtsShared.ts`) ижил бүтэц.
 *
 * ⚠ ШАЛГАГЧ ЭНД БАЙГАА ШАЛТГААН: seeder нь санд бичихийн ӨМНӨ дасгал
 * бүрийг `validateTask`-аар шалгадаг. Үүсгэгч нь зөвхөн «тэнцэх магадлал
 * өндөр» нэр дэвшигч гаргана — эцсийн шийдвэр ЭНД.
 */
import { Chess } from "chess.js";

import { auditMateLine } from "../../src/lib/chess/mateSearch";
import { formatSolution, parsePuzzle } from "../../src/lib/chess/puzzle";

import type { Move, PieceSymbol, Square } from "chess.js";

/** [монгол, англи] — бичвэр бүр ХОЁР хэлтэй (`lib/i18n/content.ts`). */
export type Bi = [mn: string, en: string];

// --- Даалгаврын зорилго -------------------------------------------------

/**
 * "board-move" дасгалын ЗОРИЛГО — даалгаврын бичвэр юу хүсэж байгааг
 * машинд ойлгомжтой хэлбэрээр.
 *
 * ⚠ ЯАГААД ХЭРЭГТЭЙ ВЭ: тоглуулагч (`BoardMoveExercise.tsx`) сурагчийн
 * нүүдлийг ГАНЦ хадгалсан `correctFrom`→`correctTo`-той жишдэг. Хэрэв
 * «шат өг» гэсэн байрлалд ХОЁР өөр шат байвал сурагч зөв хийгээд «буруу»
 * гэж сонсоно. Тиймээс зорилго бүрд «энэ нөхцөлийг хангах нүүдэл ЯГ НЭГ
 * байх ёстой» гэж шалгана.
 */
export type BoardGoal =
  /** Тухайн төрлийн дүрсийг `to` нүд рүү нүүлгэх ганц нүүдэл. */
  | { kind: "reach"; piece: PieceSymbol }
  /** Шат өгөх ганц нүүдэл (мад биш). */
  | { kind: "check" }
  /** Шатнаас НОЁНЫ нүүдлээр гарах ганц зам. */
  | { kind: "kingEscape" }
  /** Шатыг дүрсээр ХААХ ганц нүүдэл (идэлтгүй, ноён биш). */
  | { kind: "block" }
  /** Шат өгч буй дүрсийг идэх ганц нүүдэл. */
  | { kind: "captureChecker" }
  /** Хариу идэгдэхгүй ганц идэлт (бусад идэлт нь хариу иддэг). */
  | { kind: "safeCapture" }
  /** Тухайн төрлийн хар дүрсийг идэх ганц нүүдэл. */
  | { kind: "captureType"; piece: PieceSymbol }
  /** Ганц боломжтой рокировка. */
  | { kind: "castle" }
  /** Ганц en passant идэлт. */
  | { kind: "enPassant" }
  /** Ганц хувиргалт (бэрс). */
  | { kind: "promote" }
  /** Ноёны ШУУД сөргөлдөөн (opposition) авах ганц нүүдэл. */
  | { kind: "opposition" };

/** "chess-puzzle" дасгалын зорилго. */
export type PuzzleGoal =
  /** N нүүдэлд мад — `auditMateLine`-аар (ганц шийдэл) шалгана. */
  | { kind: "mate" }
  /** 2 нүүдэлд материал хожих — `auditWinLine`-аар шалгана. */
  | { kind: "win"; min: number };

export type Task =
  | {
      type: "board-move";
      fen: string;
      from: string;
      to: string;
      goal: BoardGoal;
      prompt: Bi;
      explain: Bi;
    }
  | {
      type: "chess-puzzle";
      fen: string;
      solution: string;
      goal: PuzzleGoal;
      prompt: Bi;
      explain: Bi;
    };

/** Үүсгэгч: санамсаргүй тооноос НЭГ нэр дэвшигч (эсвэл `null`). */
export type Generator = (rng: Rng) => Task | null;

export type SeedExercise =
  | {
      kind: "choice";
      prompt: Bi;
      options: Bi[];
      /** 0-ээс индекс — "a"/"b"/"c"/"d" руу хөрвүүлнэ. */
      correct: number;
      explain: Bi;
    }
  | { kind: "gen"; count: number; generator: Generator }
  | { kind: "fixed"; task: Task };

export type SeedLesson = { title: Bi; xp: number; exercises: SeedExercise[] };
export type SeedUnit = {
  title: Bi;
  color: string;
  lessons: SeedLesson[];
  /**
   * Үүсгэгчийн үрийн ТОГТМОЛ түлхүүр — дэлгэцэд харагдахгүй.
   *
   * ⚠ Үр нь гарчгаас гардаг байсан тул сэдвийн нэрийг солиход («Шатар Level 6 —
   * Нэг нүүдэлд мад» → «Нэг нүүдэлд мад») үүсэх байрлалууд өөрчлөгдөж, зарим
   * хичээл дасгал дутуу гарсан. Энэ түлхүүр нэрээс үл хамааран агуулгыг ижил
   * байлгана — ӨӨРЧИЛЖ БОЛОХГҮЙ.
   */
  seedKey?: string;
};

// --- Бичихэд хэмнэлттэй туслахууд ---------------------------------------

export const q = (prompt: Bi, options: Bi[], correct: number, explain: Bi): SeedExercise => ({
  kind: "choice",
  prompt,
  options,
  correct,
  explain,
});

export const gen = (generator: Generator, count: number): SeedExercise => ({
  kind: "gen",
  count,
  generator,
});

export const fixedPuzzle = (
  fen: string,
  solution: string,
  goal: PuzzleGoal,
  prompt: Bi,
  explain: Bi
): SeedExercise => ({ kind: "fixed", task: { type: "chess-puzzle", fen, solution, goal, prompt, explain } });

// --- Тогтвортой санамсаргүй тоо ------------------------------------------

/**
 * ⚠ `Math.random` ХЭРЭГЛЭХГҮЙ: дахин ажиллуулахад ИЖИЛ дасгал гарах ёстой.
 */
export type Rng = () => number;

export function seedFromString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));
export const pick = <T>(rng: Rng, items: readonly T[]): T => items[Math.floor(rng() * items.length)];

// --- Хөлгийн туслахууд ---------------------------------------------------

export const FILES = "abcdefgh";
/** 0-ээс эхэлсэн багана, эгнээ → "e4". */
export const sq = (file: number, rank: number) => `${FILES[file]}${rank + 1}` as Square;
export const fileOf = (square: string) => square.charCodeAt(0) - 97;
export const rankOf = (square: string) => Number(square[1]) - 1;
export const onBoard = (file: number, rank: number) =>
  file >= 0 && file < 8 && rank >= 0 && rank < 8;

export const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** Нүд → FEN тэмдэгт ("K" цагаан ноён, "q" хар бэрс). */
export type Placement = Map<string, string>;

export function toFen(
  placement: Placement,
  options: { castling?: string; ep?: string; turn?: "w" | "b" } = {}
): string {
  const rows: string[] = [];
  for (let rank = 7; rank >= 0; rank--) {
    let row = "";
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = placement.get(sq(file, rank));
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) row += String(empty);
      empty = 0;
      row += piece;
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  return `${rows.join("/")} ${options.turn ?? "w"} ${options.castling || "-"} ${options.ep ?? "-"} 0 1`;
}

/**
 * FEN-ийг ачаалж, БОДИТ байрлал эсэхийг шалгана.
 *
 * ⚠ chess.js нь хоёр ноён байгааг шалгадаг ч «нүүх ээлжгүй тал шатанд
 * байна» (хууль бус байрлал) эсвэл 1/8-р эгнээн дэх хүүг алгасдаг.
 * Хүүхдэд ийм байрлал үзүүлбэл «энэ яаж боломжтой юм бэ?» гэсэн буруу
 * ойлголт үлдээнэ.
 */
export function loadPosition(fen: string): Chess | null {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  const [boardPart, turn] = fen.split(" ");
  const ranks = boardPart.split("/");
  if (/p|P/.test(ranks[0]) || /p|P/.test(ranks[7])) return null;

  try {
    const flipped = new Chess(`${boardPart} ${turn === "w" ? "b" : "w"} - - 0 1`);
    if (flipped.inCheck()) return null;
  } catch {
    return null;
  }
  return chess;
}

/**
 * Хууль ёсны нүүдлүүд, НҮДНИЙ ХОСООР давхардалгүй.
 *
 * ⚠ Тоглуулагч хүүг ЯМАГТ бэрс болгодог (`resolveMove`) — сурагч
 * тэмээ/морь сонгох боломжгүй. Тиймээс хувиргалтын дөрвөн хувилбарыг
 * НЭГ нүүдэл (бэрс) гэж тоолно.
 */
export function distinctMoves(chess: Chess): Move[] {
  const byKey = new Map<string, Move>();
  for (const move of chess.moves({ verbose: true }) as Move[]) {
    if (move.promotion && move.promotion !== "q") continue;
    byKey.set(move.from + move.to, move);
  }
  return [...byKey.values()];
}

function kingSquare(chess: Chess, color: "w" | "b"): Square {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === "k" && cell.color === color) return cell.square;
    }
  }
  throw new Error("ноён алга");
}

// --- Хурдан хайлт (chess.js-ийн дотоод нүүдэл үүсгэгч) --------------------

/**
 * ⚠ ЯАГААД ДОТООД API ВЭ: chess.js-ийн `moves({ verbose: true })` нь нүүдэл
 * БҮРД SAN (дотроо мад шалгадаг) ба ХОЁР FEN мөр үүсгэдэг — хайлтад 100
 * дахин удаан. `_moves` / `_makeMove` / `_undoMove` нь ЯГ ТЭР хөдөлгүүрийн
 * хууль ёсны нүүдэл тул үр дүн нь ижил. Хувилбар өөрчлөгдвөл энд л эвдэрнэ
 * (chess.js "^1.4.0") — тэгвэл `assertInternals` шууд алдаа шиднэ.
 *
 * Мадын бодлогыг эцэст нь ЗААВАЛ нийтийн API дээрх `auditMateLine`-аар
 * шалгана — дотоод хайлт нь зөвхөн нэр дэвшигч олоход.
 */
type Internal = {
  color: "w" | "b";
  from: number;
  to: number;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  flags: number;
};

type Engine = {
  _moves(options: { legal: boolean }): Internal[];
  _makeMove(move: Internal): void;
  _undoMove(): unknown;
  _isKingAttacked(color: "w" | "b"): boolean;
};

const engine = (chess: Chess) => chess as unknown as Engine;

function assertInternals() {
  const probe = engine(new Chess()) as Partial<Engine>;
  for (const name of ["_moves", "_makeMove", "_undoMove", "_isKingAttacked"] as const) {
    if (typeof probe[name] !== "function") {
      throw new Error(`chess.js дотоод API "${name}" алга — chessShared.ts-ийн хурдан хайлтыг шинэчил`);
    }
  }
}
assertInternals();

/** 0x88 нүд → "e4". */
const algebraic = (square: number) => `${FILES[square & 15]}${8 - (square >> 4)}`;
const uciOf = (move: Internal) => `${algebraic(move.from)}${algebraic(move.to)}${move.promotion ?? ""}`;

const legal = (chess: Chess) => engine(chess)._moves({ legal: true });

/** Одоо нүүх ээлжтэй тал мадлагдсан уу. */
function sideToMoveMated(chess: Chess): boolean {
  return engine(chess)._isKingAttacked(chess.turn()) && legal(chess).length === 0;
}

function withMove<T>(chess: Chess, move: Internal, body: () => T): T {
  engine(chess)._makeMove(move);
  try {
    return body();
  } finally {
    engine(chess)._undoMove();
  }
}

function mateInOneKeys(chess: Chess, limit = Infinity): Internal[] {
  const keys: Internal[] = [];
  for (const move of legal(chess)) {
    if (withMove(chess, move, () => sideToMoveMated(chess))) {
      keys.push(move);
      if (keys.length >= limit) break;
    }
  }
  return keys;
}

/** 2 нүүдэлд албадмал мадын эхний нүүдлүүд (`limit` хүрмэгц зогсоно). */
function mateInTwoKeys(chess: Chess, limit = Infinity): Internal[] {
  const keys: Internal[] = [];
  for (const move of legal(chess)) {
    const forced = withMove(chess, move, () => {
      const replies = legal(chess);
      if (replies.length === 0) return false; // мад (1 нүүдэлд) эсвэл пат
      // Ноёны нүүдлийг эхэлж шалгана — ихэвчлэн тэд л мултардаг.
      replies.sort((a, b) => Number(b.piece === "k") - Number(a.piece === "k"));
      return replies.every((reply) =>
        withMove(chess, reply, () => mateInOneKeys(chess, 1).length > 0)
      );
    });
    if (forced) {
      keys.push(move);
      if (keys.length >= limit) break;
    }
  }
  return keys;
}

// --- "board-move" шалгагч -------------------------------------------------

/** `square`-т хар тал ХУУЛЬ ЁСООР идэж чадах уу (хар нүүх ээлжтэй үед). */
function opponentCanTake(chess: Chess, square: string): boolean {
  return legal(chess).some((move) => algebraic(move.to) === square);
}

function goalHolds(chess: Chess, move: Move, goal: BoardGoal, target: string): boolean {
  switch (goal.kind) {
    case "reach":
      return move.piece === goal.piece && move.to === target;
    case "kingEscape":
      return move.piece === "k";
    case "block":
      return move.piece !== "k" && !move.captured;
    case "captureChecker":
      return chess.attackers(kingSquare(chess, "w"), "b").includes(move.to as Square);
    case "captureType":
      return move.captured === goal.piece;
    case "castle":
      return move.flags.includes("k") || move.flags.includes("q");
    case "enPassant":
      return move.flags.includes("e");
    case "promote":
      return Boolean(move.promotion);
    default:
      break;
  }

  chess.move(move);
  try {
    switch (goal.kind) {
      case "check":
        return chess.inCheck() && !chess.isCheckmate();
      case "safeCapture":
        return Boolean(move.captured) && !opponentCanTake(chess, move.to);
      case "opposition": {
        if (move.piece !== "k") return false;
        const white = kingSquare(chess, "w");
        const black = kingSquare(chess, "b");
        const df = Math.abs(fileOf(white) - fileOf(black));
        const dr = Math.abs(rankOf(white) - rankOf(black));
        return (df === 0 && dr === 2) || (dr === 0 && df === 2);
      }
    }
  } finally {
    chess.undo();
  }
  return false;
}

/**
 * "board-move" даалгаврыг шалгана. `null` = зөв, эс бөгөөс шалтгаан.
 *
 *   1. байрлал бодит (`loadPosition`), ЦАГААН нүүх ээлжтэй — тоглуулагч
 *      хөлгийг ЯМАГТ цагаан талаас харуулдаг
 *   2. `lib/api/courseAdmin.ts`-ийн `validateBoardMove`-той ИЖИЛ: нүүдэл
 *      тухайн нүднээс ХУУЛЬ ЁСНЫ (нийтийн chess.js API)
 *   3. нүүдэл пат хийхгүй (даалгавар «тоглолтыг тэнцээ болго» биш)
 *   4. зорилгыг хангах нүүдэл ЯГ НЭГ бөгөөд тэр нь хадгалсан нүүдэл
 */
export function validateBoardTask(task: Extract<Task, { type: "board-move" }>): string | null {
  const chess = loadPosition(task.fen);
  if (!chess) return "FEN хүчингүй эсвэл бодит бус байрлал";
  if (chess.turn() !== "w") return "цагаан нүүх ээлжтэй байх ёстой";

  const legalMove = (chess.moves({ square: task.from as Square, verbose: true }) as Move[]).find(
    (move) => move.to === task.to && (!move.promotion || move.promotion === "q")
  );
  if (!legalMove) return `хууль бус нүүдэл ${task.from}${task.to}`;

  chess.move(legalMove);
  const stalemate = chess.isStalemate();
  chess.undo();
  if (stalemate) return "нүүдэл пат хийж байна";

  const preconditionCheck = ["kingEscape", "block", "captureChecker"].includes(task.goal.kind);
  if (preconditionCheck && !chess.inCheck()) return "шатанд байх ёстой";

  const satisfying = distinctMoves(chess).filter((move) => goalHolds(chess, move, task.goal, task.to));
  if (satisfying.length !== 1) {
    return `зорилго "${task.goal.kind}"-г хангах ${satisfying.length} нүүдэл бий (${satisfying
      .map((m) => m.san)
      .join(", ")})`;
  }
  if (satisfying[0].from !== task.from || satisfying[0].to !== task.to) {
    return `зорилгыг ${satisfying[0].san} хангана, хадгалсан ${task.from}${task.to} биш`;
  }
  return null;
}

/** Хадгалах `correctPromotion` — хувиргалт бол "q". */
export function promotionOf(fen: string, from: string, to: string): string | null {
  const chess = new Chess(fen);
  const move = (chess.moves({ square: from as Square, verbose: true }) as Move[]).find(
    (m) => m.to === to
  );
  return move?.promotion ? "q" : null;
}

// --- "chess-puzzle" материал хожих шалгагч ------------------------------

const MATE_SCORE = 1000;

/**
 * Хувиргалтын хувилбаруудыг хасна (тоглуулагч ямагт бэрс болгодог тул
 * сурагчийн хувьд нэг нүүдэл).
 */
const playerMoves = (chess: Chess) =>
  legal(chess).filter((move) => !move.promotion || move.promotion === "q");

/** Цагаан нүүх ээлжтэй: нүүдэл бүрийн шууд хожилт (мад = 1000). */
function immediateGains(chess: Chess): { move: Internal; gain: number }[] {
  return playerMoves(chess).map((move) => ({
    move,
    gain: withMove(chess, move, () => {
      if (sideToMoveMated(chess)) return MATE_SCORE;
      if (!move.captured) return 0;
      return VALUE[move.captured] - (opponentCanTake(chess, algebraic(move.to)) ? VALUE[move.piece] : 0);
    }),
  }));
}

function bestGain(chess: Chess): number {
  let best = 0;
  for (const { gain } of immediateGains(chess)) {
    if (gain > best) best = gain;
    if (best >= MATE_SCORE) break;
  }
  return best;
}

/** Хар хариу `reply`-ийн дараах цагааны цэвэр хожилт. */
function replyValue(chess: Chess, reply: Internal): number {
  return withMove(chess, reply, () => bestGain(chess) - (reply.captured ? VALUE[reply.captured] : 0));
}

/**
 * Цагаан `first` нүүдлийн дараа хар талын ХАМГИЙН САЙН хамгаалалтын эсрэг
 * цагаан хэдий хэмжээний материал ЦЭВЭР хожих вэ.
 *
 * `cutoff`: утга түүнээс доош унамагц зогсоно (зөвхөн «хүрэх үү» гэдгийг
 * мэдэхэд хангалттай — хайлтыг олон дахин хурдасгана).
 */
function lineValue(chess: Chess, first: Internal, cutoff = -Infinity): number {
  return withMove(chess, first, () => {
    const replies = legal(chess);
    if (replies.length === 0) return engine(chess)._isKingAttacked("b") ? MATE_SCORE : -MATE_SCORE;
    const won = first.captured ? VALUE[first.captured] : 0;
    let worst = Infinity;
    for (const reply of replies) {
      worst = Math.min(worst, won + replyValue(chess, reply));
      if (worst < cutoff) break;
    }
    return worst;
  });
}

const sameMove = (a: Internal, from: string, to: string) =>
  algebraic(a.from) === from && algebraic(a.to) === to;

/**
 * «2 нүүдэлд материал хож» бодлогын ШУГАМЫГ шалгана.
 *
 * ⚠ ЯАГААД `auditMateLine` ХАНГАЛТГҮЙ ВЭ: сэрээ, хүлээс, рентген зэрэг
 * тактик мадаар төгсдөггүй. Гэхдээ ИЖИЛ зарчим хэрэгтэй: сурагчийн нүүдэл
 * бүр ЦОРЫН ГАНЦ байх ёстой. Энд материалын энгийн тооцоо (хүү 1, морь /
 * тэмээ 3, тэрэг 5, бэрс 9) ба «идсэн дүрсээ хариу идүүлэх үү» гэдгийг
 * хар талын БҮХ хариуны эсрэг шалгана. Цөөн дүрстэй байрлалд энэ нь
 * бүрэн хайлт тул найдвартай.
 *
 *   1. 1 нүүдэлд мад байхгүй (эс бөгөөс сурагч мад хийгээд «буруу» сонсоно)
 *   2. эхний нүүдэл нь `min`-ээс доошгүй хожих ЦОРЫН ГАНЦ нүүдэл
 *   3. хадгалсан хар хариу нь хамгийн сайн хамгаалалтын нэг
 *   4. хоёр дахь нүүдэл нь ЦОРЫН ГАНЦ хамгийн их хожилттой нүүдэл
 */
export function auditWinLine(fen: string, solution: string, min: number): string | null {
  const parsed = parsePuzzle(fen, solution);
  if (!parsed) return "шийдэл хууль бус эсвэл хэлбэр буруу";
  if (parsed.moves.length !== 3) return "3 хагас нүүдэл байх ёстой";

  const chess = loadPosition(parsed.fen);
  if (!chess || chess.turn() !== "w") return "байрлал бодит бус эсвэл цагаан нүүх ээлжгүй";
  if (mateInOneKeys(chess, 1).length > 0) return "1 нүүдэлд мад байна — бодлого өөр шийдэлтэй";

  const winning = playerMoves(chess).filter((move) => lineValue(chess, move, min) >= min);
  if (winning.length !== 1) return `${min}+ хожих ${winning.length} эхний нүүдэл бий`;

  const [key, reply, finish] = parsed.moves;
  if (!sameMove(winning[0], key.from, key.to)) return `шийдэл ${uciOf(winning[0])}, хадгалсан ${key.san} биш`;

  engine(chess)._makeMove(winning[0]);
  const replies = legal(chess);
  const values = replies.map((candidate) => replyValue(chess, candidate));
  const worst = Math.min(...values);
  const storedIndex = replies.findIndex((m) => sameMove(m, reply.from, reply.to));
  if (storedIndex < 0 || values[storedIndex] !== worst) return "хадгалсан хар хариу хамгийн сайн хамгаалалт биш";

  engine(chess)._makeMove(replies[storedIndex]);
  const gains = immediateGains(chess);
  const top = Math.max(...gains.map((g) => g.gain));
  const best = gains.filter((g) => g.gain === top);
  if (best.length !== 1) return `2-р нүүдэлд ${best.length} ижил сайн хувилбар бий`;
  if (!sameMove(best[0].move, finish.from, finish.to)) return `2-р нүүдэл ${uciOf(best[0].move)} байх ёстой`;
  return null;
}

/**
 * Хар тал хамгийн сайн хамгаалалт хийсэн «2 нүүдэлд хож» шугам бүтээнэ.
 * Олдохгүй бол `null`. (Эцсийн шалгалтыг seeder `validateTask`-аар хийнэ.)
 */
export function buildWinLine(fen: string, min: number): string | null {
  const chess = loadPosition(fen);
  if (!chess || chess.turn() !== "w") return null;
  if (mateInOneKeys(chess, 1).length > 0) return null;

  let key: Internal | null = null;
  for (const move of playerMoves(chess)) {
    if (lineValue(chess, move, min) < min) continue;
    if (key) return null; // хоёр дахь шийдэл — олон шийдэлтэй
    key = move;
  }
  if (!key) return null;
  engine(chess)._makeMove(key);

  let chosen: Internal | null = null;
  let worst = Infinity;
  for (const reply of legal(chess)) {
    const value = replyValue(chess, reply);
    if (value < worst) {
      worst = value;
      chosen = reply;
    }
  }
  if (!chosen) return null;
  engine(chess)._makeMove(chosen);

  const gains = immediateGains(chess);
  const top = Math.max(...gains.map((g) => g.gain));
  const best = gains.filter((g) => g.gain === top);
  if (best.length !== 1) return null;

  return [key, chosen, best[0].move].map(uciOf).join(" ");
}

/**
 * N (1 эсвэл 2) нүүдэлд мадын шугам бүтээнэ: ганц түлхүүр, (2 бол) хар
 * талын хариу, ганц мад. Олон шийдэлтэй бол `null`.
 *
 * ⚠ Хувиргалттай шугамыг алгасна — `validateMateSolution`-ийн тайлбарыг үз.
 */
export function buildMateLine(fen: string, depth: 1 | 2): string | null {
  const chess = loadPosition(fen);
  if (!chess || chess.turn() !== "w") return null;

  const quick = mateInOneKeys(chess, 2);
  if (depth === 1) {
    if (quick.length !== 1 || quick[0].promotion) return null;
    return uciOf(quick[0]);
  }

  if (quick.length > 0) return null;
  const keys = mateInTwoKeys(chess, 2);
  if (keys.length !== 1 || keys[0].promotion) return null;

  engine(chess)._makeMove(keys[0]);
  // Хар талын хариунаас дараагийн мад нь ГАНЦ байх хувилбарыг сонгоно.
  // Ноёны нүүдлийг илүүд үзнэ — «хар тал утгагүй дүрс өглөө» мэт харагдахгүй.
  const replies = legal(chess).sort((a, b) => Number(b.piece === "k") - Number(a.piece === "k"));
  for (const reply of replies) {
    if (reply.promotion) continue;
    const finish = withMove(chess, reply, () => mateInOneKeys(chess, 2));
    if (finish.length !== 1 || finish[0].promotion) continue;
    return [keys[0], reply, finish[0]].map(uciOf).join(" ");
  }
  return null;
}

/** Мадын бодлогыг `seed-chess-puzzles.ts`-тэй ИЖИЛ шалгуураар шалгана. */
export function validateMateSolution(fen: string, solution: string): string | null {
  const parsed = parsePuzzle(fen, solution);
  if (!parsed) return "шийдэл хууль бус эсвэл хэлбэр буруу";
  if (!parsed.endsInMate) return "мадаар төгсөхгүй";
  // ⚠ `auditMateLine` нь нүүдлийг хувиргалтгүйгээр (`{from, to}`) тоглодог
  // тул хувиргалттай шугам дээр chess.js шиднэ. Тэр файлыг энд засахгүй —
  // харин ийм бодлогыг ОГТ оруулахгүй: шалгагдаагүй бодлого санд орохоос
  // цөөн бодлого нь дээр.
  if (parsed.moves.some((move) => move.promotion)) return "хувиргалттай мадын шугам дэмжигдэхгүй";
  return auditMateLine(parsed.fen, parsed.moves);
}

/**
 * Дурын даалгаврыг шалгана — seeder ЭНИЙГ дуудна.
 * @returns алдааны тайлбар, эсвэл зөв бол `null`
 */
export function validateTask(task: Task): string | null {
  if (task.type === "board-move") return validateBoardTask(task);

  const parsed = parsePuzzle(task.fen, task.solution);
  if (!parsed) return "шийдэл хууль бус эсвэл хэлбэр буруу";
  if (!loadPosition(parsed.fen)) return "бодит бус байрлал";
  if (formatSolution(parsed.moves) !== task.solution.trim()) return "шийдэл хэвшсэн хэлбэрт биш";
  if (new Chess(parsed.fen).turn() !== "w") return "цагаан нүүх ээлжтэй байх ёстой";

  if (task.goal.kind === "mate") return validateMateSolution(parsed.fen, task.solution);
  return auditWinLine(parsed.fen, task.solution, task.goal.min);
}
