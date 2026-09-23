import { Draughts } from "./engine";
import { deserializePosition, squareFromNumber, squareNumber } from "./notation";

import type { Square } from "./engine";

/**
 * ДААМЫН ОЛОН НҮҮДЭЛТ БОДЛОГЫН шийдлийн шугам — нэг эх сурвалж.
 *
 * `lib/chess/puzzle.ts`-тэй ЯГ ижил зорилготой (админы шалгалт, админы
 * маягт, сурагчийн тоглуулагч гурвуулаа ижил задлагч ашиглана), гэхдээ
 * дамын хөдөлгүүр, 1-50 дугаарлалтаар.
 *
 * ⚠ `server-only` БИШ: клиент компонент ба сервер талын шалгалт хоёулаа
 * импортолдог.
 */

/**
 * Шийдлийн ХАДГАЛАХ хэлбэр: "<хаанаас>-<хаашаа>" хосууд, зайгаар
 * тусгаарлагдсан — албан ёсны 1-50 дугаарлалтаар.
 *
 *   "32-28 19-30 25-34"
 *
 * ⚠ Идэлтийг «x»-ээр биш «-»-ээр бичнэ: даамын хөдөлгүүр дунд дамжсан
 * нүднүүдийг ӨӨРӨӨ олдог тул эхлэл-төгсгөл хоёр л хангалттай бөгөөд нэг
 * л хэлбэр байх нь задлагчийг энгийн байлгана.
 */
const MOVE_RE = /^(\d{1,2})-(\d{1,2})$/;

export type DraughtsPuzzleMove = {
  /** 1-50 дугаар — хадгалагдах хэлбэр */
  from: number;
  to: number;
  /** Энэ нүүдэлд идэгдсэн дүрсийн тоо */
  captures: number;
  /** Сурагчийн ээлж эсэх: 0, 2, 4-р нүүдэл нь сурагчийнх. */
  isPlayer: boolean;
};

export type ParsedDraughtsPuzzle = {
  /** Эхлэх байрлал (хэвшсэн хэлбэрээр) */
  fen: string;
  moves: DraughtsPuzzleMove[];
  /** Сурагч хэдэн нүүдэл хийх вэ ("2 нүүдлийн цохилт" = 2) */
  playerMoves: number;
  /** Сурагчийн НИЙТ идсэн дүрс — «тулгуур» өгөөд хэд авсныг харуулна */
  playerCaptures: number;
  /** Өрсөлдөгчийн НИЙТ идсэн дүрс (золиос) */
  opponentCaptures: number;
};

/**
 * Шийдлийн дээд урт (хагас нүүдлээр). 7 = сурагчийн 4 нүүдэл — үүнээс
 * урт цуваа нь дэлгэц дээр цээжлэх даалгавар болж хувирна
 * (`lib/chess/puzzle.ts`-ийн адил шалтгаан).
 */
export const DRAUGHTS_PUZZLE_MAX_MOVES = 7;

/** "32-28" → нүүдэл. Буруу бол `null`. */
export function parseDraughtsMoveToken(value: string): { from: number; to: number } | null {
  const match = MOVE_RE.exec(value.trim());
  if (!match) return null;

  const from = Number(match[1]);
  const to = Number(match[2]);
  if (from < 1 || from > 50 || to < 1 || to > 50 || from === to) return null;

  return { from, to };
}

export const toMoveToken = (move: { from: number; to: number }) => `${move.from}-${move.to}`;

export const squareToNumber = (square: Square) => squareNumber(square.row, square.col);

/**
 * Шийдлийн шугамыг эхлэх байрлалаас нь ТОГЛОЖ ҮЗЭЖ шалгана.
 *
 * ЗӨВ ШИЙДЛИЙН ШААРДЛАГА:
 *   • байрлал задарна,
 *   • нүүдэл бүр тухайн байрлалд ХУУЛЬ ЁСНЫ (даамын «идэлт заавал, хамгийн
 *     урт цуваа» дүрэм хөдөлгүүр дотор аль хэдийн шалгагдсан),
 *   • нүүдлийн тоо СОНДГОЙ — эхнийх ба сүүлчийнх нь хоёулаа сурагчийнх,
 *   • ⚠ ӨРСӨЛДӨГЧИЙН ХАРИУ БҮР АЛБАДМАЛ (тухайн байрлалд хууль ёсны нүүдэл
 *     ЯГ НЭГ) байх.
 *
 * Сүүлчийн болзол нь ЭНЭ ТӨРЛИЙН ЦӨМ: «тулгууртай цохилт» гэдэг нь
 * өрсөлдөгчид сонголт үлдээхгүй цуваа юм. Албадмал биш бол сурагч зөв
 * тоглосон ч өрсөлдөгч өөрөөр хариулж, хадгалсан шугам утгагүй болно —
 * тоглуулагч тэр үед «зөв» нүүдлийг хүлээх боловч хөлөг дээрх байрлал
 * огт өөр байх байсан.
 */
export function parseDraughtsPuzzle(
  rawFen: string | null | undefined,
  rawSolution: string | null | undefined
): ParsedDraughtsPuzzle | null {
  if (typeof rawFen !== "string" || typeof rawSolution !== "string") return null;

  const setup = deserializePosition(rawFen);
  if (!setup) return null;

  const tokens = rawSolution.trim().split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length % 2 === 0) return null;
  if (tokens.length > DRAUGHTS_PUZZLE_MAX_MOVES) return null;

  const game = new Draughts(setup);
  const moves: DraughtsPuzzleMove[] = [];

  for (const [index, token] of tokens.entries()) {
    const parsed = parseDraughtsMoveToken(token);
    if (!parsed) return null;

    const isPlayer = index % 2 === 0;
    // Өрсөлдөгчийн хариу нь АЛБАДМАЛ байх ёстой (дээрх тайлбарыг үзнэ үү).
    if (!isPlayer && game.legalMoves().length !== 1) return null;

    const applied = game.move(squareFromNumber(parsed.from), squareFromNumber(parsed.to));
    if (!applied) return null;

    moves.push({
      from: parsed.from,
      to: parsed.to,
      captures: applied.captures.length,
      isPlayer,
    });
  }

  const playerCaptures = moves
    .filter((move) => move.isPlayer)
    .reduce((total, move) => total + move.captures, 0);
  const opponentCaptures = moves
    .filter((move) => !move.isPlayer)
    .reduce((total, move) => total + move.captures, 0);

  return {
    fen: rawFen.trim(),
    moves,
    playerMoves: Math.ceil(moves.length / 2),
    playerCaptures,
    opponentCaptures,
  };
}

/** Задалсан шугамыг ЭРГЭЭД хадгалах мөр болгоно. */
export const formatDraughtsSolution = (moves: DraughtsPuzzleMove[]) =>
  moves.map(toMoveToken).join(" ");

/** Дасгал дээр автоматаар харагдах монгол гарчиг. */
export function draughtsPuzzleGoalLabel(puzzle: ParsedDraughtsPuzzle): string {
  const base = `${puzzle.playerMoves} нүүдлийн цохилт`;

  /*
   * ⚠ ТАКТИКИЙН НЭРИЙГ ЭНД ТАВИХГҮЙ — БАРИМТЫГ хэлнэ.
   *
   * Урьд нь өгсөн дүрсийн тоогоор «(тулгууртай)» / «(золиостой)» гэж
   * нэрлэдэг байв. Гэтэл нэг дүрс өгдөг тактик ГАНЦ биш: тулгуур ч,
   * УРХИ ч, ЦООЛОХ ч, ЗАМ ЧӨЛӨӨЛӨХ ч нэг хүү өгдөг. Тиймээс шошго нь
   * «Урхиа тавь» гэсэн даалгаврын доор «(тулгууртай)» гэж бичигдэж,
   * хичээлтэйгээ шууд зөрчилдөж байлаа.
   *
   * Тактикийн нэрийг ДААЛГАВАР өөрөө хэлдэг. Шошгоны ажил бол хэлбэрийг
   * товчлох: хэдэн нүүдэл, хэдэн дүрс өгөх вэ. «Дүрсээ өгнө» гэдгийг
   * урьдчилан хэлэх нь сурагчид ЧУХАЛ — дүрсээ алдаж байгаа нь алдаа
   * биш, санаа гэдгийг мэдэж байх ёстой.
   */
  if (puzzle.opponentCaptures === 0) return base;
  return `${base} · ${puzzle.opponentCaptures} хүү өгнө`;
}
