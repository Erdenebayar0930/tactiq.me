import { Draughts } from "./engine";
import { serializePosition, squareFromNumber, squareNumber } from "./notation";

import type { Board, DraughtsMove, Piece } from "./engine";

/**
 * ДАСГАЛЫН БАЙРЛАЛ ҮҮСГЭГЧ — санамсаргүй байрлал гаргаж, хөдөлгүүрээр
 * ШАЛГАЖ, зөвхөн даалгаврын болзол хангасныг буцаана.
 *
 * ЯАГААД ГАРААР БИЧИХГҮЙ ВЭ: сургалтын хөтөлбөрт зуу гаруй тактикийн
 * дасгал хэрэгтэй. Гараар өрсөн байрлал бүрийг хүн шалгах ёстой бөгөөд
 * нэг л алдаа (хууль бус «зөв хариулт») сурагчийг гацаанд оруулна.
 * Үүсгэгч нь `Draughts`-ийн ӨӨРИЙНХ нь дүрмээр шалгадаг тул санд орсон
 * бүхэн тоглогдоно.
 *
 * ⚠ ШИЙДЭЛ НЬ ЦОРЫН ГАНЦ байх шаардлага БҮХ шүүлтүүрт хүчинтэй: даамын
 * «идэлт заавал, хамгийн урт цуваа» дүрмийн ачаар хууль ёсны нүүдэл нэг
 * л байвал зөв хариулт эргэлзээгүй болно. Хоёр өөр зөв нүүдэлтэй байрлал
 * сурагчийг «зөв тоглоод буруу» гэсэн хариу авахад хүргэнэ.
 */

const SIZE = 10;

export type Rng = () => number;

/** Давтагдах санамсаргүй тоо — `lib/net/puzzle.ts`-ийн `makeRng`-тай ижил алгоритм. */
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

/** Мөрийг тогтвортой үр болгоно — хичээлийн нэрээр ижил дасгал гаргахад. */
export function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const emptyBoard = (): Board =>
  Array.from({ length: SIZE }, () => Array<Piece | null>(SIZE).fill(null));

/**
 * Санамсаргүй байрлал.
 *
 * ⚠ Цагаан хүү 0-р мөрөнд, хар хүү 9-р мөрөнд ТАВИГДАХГҮЙ: тэнд хүрсэн хүү
 * бодит тоглолтод аль хэдийн даам болсон байх ёстой тул тийм байрлал
 * «боломжгүй» харагдана.
 */
export function randomBoard(
  rng: Rng,
  options: { whites: number; blacks: number; whiteKings?: number; blackKings?: number }
): Board | null {
  const board = emptyBoard();
  const used = new Set<number>();

  const place = (color: "w" | "b", count: number, king: boolean): boolean => {
    for (let placed = 0; placed < count; placed += 1) {
      let attempts = 0;
      for (;;) {
        if (attempts++ > 300) return false;
        const n = 1 + Math.floor(rng() * 50);
        if (used.has(n)) continue;

        const { row, col } = squareFromNumber(n);
        if (!king && color === "w" && row === 0) continue;
        if (!king && color === "b" && row === SIZE - 1) continue;

        used.add(n);
        board[row][col] = { color, king };
        break;
      }
    }
    return true;
  };

  return place("w", options.whites, false) &&
    place("b", options.blacks, false) &&
    place("w", options.whiteKings ?? 0, true) &&
    place("b", options.blackKings ?? 0, true)
    ? board
    : null;
}

const pieceCount = (board: Board, color: "w" | "b") =>
  board.flat().filter((cell) => cell?.color === color).length;

export const moveToken = (move: DraughtsMove) =>
  `${squareNumber(move.from.row, move.from.col)}-${squareNumber(move.to.row, move.to.col)}`;

/** НЭГ нүүдлийн даалгавар — `draughts-move` дасгалын өгөгдөл. */
export type MoveTask = {
  fen: string;
  from: string;
  to: string;
  captures: number;
  promoted: boolean;
};

/** ОЛОН нүүдлийн даалгавар — `draughts-puzzle` дасгалын өгөгдөл. */
export type ComboTask = {
  fen: string;
  /** "32-28 19-30 25-34" */
  solution: string;
  gained: number;
  given: number;
};

export type MoveFilter = {
  /** Зөв нүүдэл хэдэн дүрс идэх ёстой вэ (доод хязгаар). */
  minCaptures?: number;
  /** Хэдэн дүрс идэхээс их БАЙХГҮЙ (цуваа хэт урт байрлал эхлэгчид хүнд). */
  maxCaptures?: number;
  /** Зөв нүүдэл даам болгох ёстой эсэх. */
  mustPromote?: boolean;
  /** Идэлтгүй (тайван) нүүдэл шаардах — «зөв байрлуулах», «хөдөлгөөний эрх» хичээлд. */
  quietOnly?: boolean;
};

/**
 * Нэг нүүдлийн даалгавар үүсгэнэ.
 *
 * `count` ширхэг хүртэл буцаана — олдохгүй бол олдсоноороо (дуудагч тал
 * хэд олдсоныг мэдэж, хичээлээ тэр чинээгээр бүрдүүлнэ).
 */
export function generateMoveTasks(
  seed: number,
  count: number,
  filter: MoveFilter,
  pieces: { whites: number; blacks: number; whiteKings?: number; blackKings?: number }
): MoveTask[] {
  const rng = makeRng(seed);
  const tasks: MoveTask[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < 400000 && tasks.length < count; attempt += 1) {
    const board = randomBoard(rng, pieces);
    if (!board) continue;

    const game = new Draughts({ board, turn: "w" });
    const moves = game.legalMoves();

    // Шийдэл ЦОРЫН ГАНЦ байх — файлын дээрх тайлбарыг үзнэ үү.
    if (moves.length !== 1) continue;

    const [move] = moves;
    const captures = move.captures.length;

    if (filter.quietOnly && captures > 0) continue;
    if (filter.minCaptures !== undefined && captures < filter.minCaptures) continue;
    if (filter.maxCaptures !== undefined && captures > filter.maxCaptures) continue;
    if (filter.mustPromote && !move.promoted) continue;

    // Идэлттэй даалгаварт хар талд дүрс үлдэх ёстой — эс бөгөөс даалгавар
    // «сүүлчийн дүрсийг ид» болж, тактикийн санаа нь уусна.
    if (captures > 0 && pieceCount(board, "b") - captures < 1) continue;

    const fen = serializePosition(board, "w");
    if (seen.has(fen)) continue;
    seen.add(fen);

    tasks.push({
      fen,
      from: String(squareNumber(move.from.row, move.from.col)),
      to: String(squareNumber(move.to.row, move.to.col)),
      captures,
      promoted: move.promoted,
    });
  }

  return tasks;
}

/**
 * ТУЛГУУРТАЙ (золиостой) хоёр нүүдлийн комбинаци.
 *
 * БОЛЗОЛ:
 *   1. цагааны эхний нүүдэл ИДЭЛТГҮЙ (жинхэнэ тулгуур — дүрсээ өгнө),
 *   2. харын хариу АЛБАДМАЛ бөгөөд идэлт,
 *   3. цагаан дараа нь ганц нүүдэлтэй, тэр нь идэлт,
 *   4. цэвэр ашигтай (идсэн > өгсөн).
 *
 * ⚠ Хоёр өөр ажиллах тулгуур байвал байрлалыг ХАЯНА: шийдэл ганц байх
 * шаардлага нь `draughts-puzzle` тоглуулагчийн үндэс (хадгалсан шугамаас
 * зөрвөл хөлөг дээрх байрлал шугамтай сална).
 */
export function generateCombos(
  seed: number,
  count: number,
  pieces: { whites: number; blacks: number; whiteKings?: number; blackKings?: number },
  options: { minGain?: number } = {}
): ComboTask[] {
  const rng = makeRng(seed);
  const combos: ComboTask[] = [];
  const seen = new Set<string>();

  for (let attempt = 0; attempt < 600000 && combos.length < count; attempt += 1) {
    const board = randomBoard(rng, pieces);
    if (!board) continue;

    const probe = new Draughts({ board, turn: "w" });
    const firstMoves = probe.legalMoves();
    if (firstMoves.length === 0 || firstMoves[0].captures.length > 0) continue;

    let found: ComboTask | null = null;

    for (const first of firstMoves) {
      const game = new Draughts({ board, turn: "w" });
      game.applyMove(first);

      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length === 0) continue;
      const reply = replies[0];
      game.applyMove(reply);

      const finals = game.legalMoves();
      if (finals.length !== 1 || finals[0].captures.length === 0) continue;
      const final = finals[0];

      const gained = final.captures.length;
      const given = reply.captures.length;
      if (gained <= given) continue;
      if (options.minGain !== undefined && gained < options.minGain) continue;

      // Хоёр дахь ажиллах тулгуур — шийдэл ганц биш тул байрлалыг хаяна.
      if (found) {
        found = null;
        break;
      }

      found = {
        fen: serializePosition(board, "w"),
        solution: [moveToken(first), moveToken(reply), moveToken(final)].join(" "),
        gained,
        given,
      };
    }

    if (!found || seen.has(found.fen)) continue;
    seen.add(found.fen);
    combos.push(found);
  }

  return combos;
}
