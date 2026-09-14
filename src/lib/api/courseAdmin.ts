import "server-only";

import { Chess } from "chess.js";

import { formatSolution, parsePuzzle } from "@/lib/chess/puzzle";
import { decodePuzzle, encodePuzzle } from "@/lib/net/puzzle";
import { decodeSlide, encodeSlide } from "@/lib/puzzles/slide";
import {
  decodeGo,
  encodeGo,
  formatPointList,
  parsePointList,
  play,
} from "@/lib/go/position";
import { decodeMemory, encodeMemory } from "@/lib/puzzles/memory";
import { decodeMatchstick, encodeMatchstick } from "@/lib/puzzles/matchstick";
import { decodeRecall, encodeRecall } from "@/lib/puzzles/recall";
import { decodeTangram, encodeTangram } from "@/lib/puzzles/tangram";
import { decodeSudoku, encodeSudoku } from "@/lib/puzzles/sudoku";
import { decodeMaze, encodeMaze } from "@/lib/code/maze";
import { Draughts } from "@/lib/draughts/engine";
import { deserializePosition, squareFromNumber } from "@/lib/draughts/notation";
import { formatDraughtsSolution, parseDraughtsPuzzle } from "@/lib/draughts/puzzle";
import {
  formatMelody,
  MELODY_MAX_NOTES,
  parseMelody,
  parseMeter,
  parseTempo,
  TEMPO_DEFAULT,
} from "@/lib/music/notes";
import { SCHOOLS } from "@/lib/tactiq/schools";

/**
 * `/api/admin/courses/**`-ийн бүх route-д ХАМТ хэрэглэгдэх шалгалтууд —
 * нэг л газар зассанаар курс/нэгж/хичээл/дасгал бүгд ижил дүрмээр
 * шалгагдана.
 */

const SLUG_RE = /^[a-z0-9-]{1,32}$/;

const SCHOOL_SLUGS = new Set(SCHOOLS.map((school) => school.slug));

export function isValidSlug(value: unknown): value is string {
  return typeof value === "string" && SLUG_RE.test(value);
}

export function cleanTitle(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export function cleanText(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export function isValidStatus(value: unknown): value is "active" | "coming-soon" {
  return value === "active" || value === "coming-soon";
}

/**
 * Курсын сургуулийг шалгана — `lib/tactiq/schools.ts`-д бүртгэлтэй slug л
 * зөвшөөрнө.
 *
 * ⚠ Танихгүй утгыг АЛДАА болгохгүй, ХООСОН мөр рүү унана. Шалтгаан: хоосон
 * нь "бүлэглээгүй" гэсэн хүчинтэй төлөв бөгөөд `/courses` дэлгэц түүнийг
 * "Бусад" бүлэгт харуулдаг. 400 буцаавал админ курсээ огт хадгалж чадахгүй
 * болох ба алдааны шалтгаан нь түүнд ойлгомжгүй байна.
 */
export function cleanSchool(value: unknown): string {
  const slug = String(value ?? "").trim().toLowerCase();
  return SCHOOL_SLUGS.has(slug) ? slug : "";
}

/**
 * Курсын сургуулиудыг (олноор) шалгана — дарааллыг хадгална (эхнийх нь
 * ҮНДСЭН), давхардал ба танихгүй slug-ийг хасна.
 *
 * Ганц мөр ирвэл (хуучин клиент `school: "mind"` илгээдэг) нэг элементтэй
 * жагсаалт болгоно. Хоосон жагсаалт нь "бүлэглээгүй" гэсэн хүчинтэй төлөв.
 */
export function cleanSchools(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  const result: string[] = [];
  for (const entry of raw) {
    const slug = cleanSchool(entry);
    if (slug && !result.includes(slug)) result.push(slug);
  }
  return result;
}

export type ExerciseOptionInput = { id: string; label: string };

/**
 * Дасгалын сонголтуудыг шалгана: хамгийн багадаа 2, өвөрмөц `id`, хоосон
 * биш `label`, мөн `correctOptionId` тэдгээрийн НЭГТЭЙ нь тохирсон байх.
 */
export function validateExerciseOptions(
  rawOptions: unknown,
  rawCorrectOptionId: unknown
): { options: ExerciseOptionInput[]; correctOptionId: string } | null {
  if (!Array.isArray(rawOptions) || rawOptions.length < 2) return null;

  const options: ExerciseOptionInput[] = [];
  const seenIds = new Set<string>();
  for (const entry of rawOptions) {
    if (typeof entry !== "object" || entry === null) return null;
    const id = cleanText((entry as Record<string, unknown>).id, 8);
    const label = cleanText((entry as Record<string, unknown>).label, 200);
    if (!id || !label || seenIds.has(id)) return null;
    seenIds.add(id);
    options.push({ id, label });
  }

  const correctOptionId = cleanText(rawCorrectOptionId, 8);
  if (!seenIds.has(correctOptionId)) return null;

  return { options, correctOptionId };
}

/**
 * "choice" дасгалын АНГЛИ сонголтууд — ЗААВАЛ БИШ.
 *
 * ⚠ `id` нь монгол хувилбартай таарах ёстой (зөв хариулт `correctOptionId`
 * -аар шалгагддаг). Таарахгүй бичлэгийг АЛГАСНА, бүхэл дасгалыг
 * татгалзахгүй: орчуулга бол нэмэлт, агуулгыг хаах шалтгаан биш.
 */
function validateOptionsEn(
  rawOptions: unknown,
  allowedIds: ReadonlySet<string>
): ExerciseOptionInput[] | null {
  if (!Array.isArray(rawOptions)) return null;

  const options: ExerciseOptionInput[] = [];
  for (const entry of rawOptions) {
    if (typeof entry !== "object" || entry === null) continue;
    const id = cleanText((entry as Record<string, unknown>).id, 8);
    const label = cleanText((entry as Record<string, unknown>).label, 200);
    if (!id || !label || !allowedIds.has(id)) continue;
    options.push({ id, label });
  }

  return options.length > 0 ? options : null;
}

const SQUARE_RE = /^[a-h][1-8]$/;

/**
 * "board-move" дасгалыг шалгана: `fen` ачаалагдах ёстой, `from`→`to` нь ТУХАЙН
 * байрлалд ХУУЛЬ ЁСНЫ нүүдэл байх ёстой (chess.js-ээр бодитоор тоглуулж
 * шалгана) — эс бөгөөс админ FEN эсвэл нүдийг андуурвал сурагч хэзээ ч
 * "зөв" гэдэгт хүрэхгүй дасгал үүсэх эрсдэлтэй.
 */
export function validateBoardMove(
  rawFen: unknown,
  rawFrom: unknown,
  rawTo: unknown,
  rawPromotion: unknown
): { fen: string; correctFrom: string; correctTo: string; correctPromotion: string | null } | null {
  const fen = cleanText(rawFen, 200);
  const from = cleanText(rawFrom, 4).toLowerCase();
  const to = cleanText(rawTo, 4).toLowerCase();
  const promotion = cleanText(rawPromotion, 4).toLowerCase() || null;

  if (!fen || !SQUARE_RE.test(from) || !SQUARE_RE.test(to)) return null;

  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return null;
  }

  const legalMoves = chess.moves({ square: from as never, verbose: true }) as {
    to: string;
    promotion?: string;
  }[];
  const match = legalMoves.find(
    (move) => move.to === to && (promotion ? move.promotion === promotion : true)
  );
  if (!match) return null;

  return { fen, correctFrom: from, correctTo: to, correctPromotion: match.promotion ?? null };
}

/**
 * "draughts-move" дасгалыг шалгана: `fen` (дамын PDN-төстэй байрлал)
 * ачаалагдах ёстой, `from`→`to` (Олон улсын дамын 1-50 нүдний дугаараар)
 * нь ТУХАЙН байрлалд ХУУЛЬ ЁСНЫ нүүдэл байх ёстой (`Draughts` хөдөлгүүрээр
 * бодитоор шалгана — олон дараалсан идэлтийн хэлхээ ч ЗӨВХӨН эцсийн
 * буух нүдээрээ таарна, дундын идэлтүүдийг тусад нь хадгалах шаардлагагүй).
 */
export function validateDraughtsMove(
  rawFen: unknown,
  rawFrom: unknown,
  rawTo: unknown
): { fen: string; correctFrom: string; correctTo: string } | null {
  const fen = cleanText(rawFen, 200);
  const fromNum = Number(cleanText(rawFrom, 4));
  const toNum = Number(cleanText(rawTo, 4));

  if (!fen || !Number.isInteger(fromNum) || !Number.isInteger(toNum)) return null;
  if (fromNum < 1 || fromNum > 50 || toNum < 1 || toNum > 50) return null;

  const position = deserializePosition(fen);
  if (!position) return null;

  const game = new Draughts(position);
  const from = squareFromNumber(fromNum);
  const to = squareFromNumber(toNum);
  const match = game.movesFrom(from).some((move) => move.to.row === to.row && move.to.col === to.col);
  if (!match) return null;

  return { fen, correctFrom: String(fromNum), correctTo: String(toNum) };
}

/**
 * "piano-play" дасгалыг шалгана: ая нь ЗӨВХӨН зөв нотуудаас тогтох ёстой.
 *
 * ⚠ Нэг ч нот буруу бол БҮХЭЛД НЬ татгалзана. Хэсэгчлэн хүлээж авбал
 * сурагч тоглож ДУУСГАЖ ЧАДАХГҮЙ хичээл үүснэ — тоглуулагч задлаж чадаагүй
 * нотыг гар дээрээ огт зурахгүй тул тэр алхам дээр мөнхөд гацна.
 */
function validateMelody(rawMelody: unknown): { melody: string } | null {
  if (typeof rawMelody !== "string") return null;

  const notes = parseMelody(rawMelody);
  if (!notes || notes.length > MELODY_MAX_NOTES) return null;

  // Хэвшсэн хэлбэрээр ("c4" → "C4", нэг зайгаар) хадгална — тоглуулагч
  // мөрийн ЯГ ТЭНЦҮҮГ шалгадаг тул хадгалах үед нэгтгэх нь чухал.
  return { melody: formatMelody(notes) };
}

/**
 * Темп ба хэмжээ — хоёулаа ХАТУУ хүрээтэй.
 *
 * ⚠ Темпийг шалгахгүй өнгөрөөвөл 5 BPM (нот бүр 12 секунд) эсвэл 5000 BPM
 * (сонсогдохгүй шуугиан) гэсэн утга санд орж, дасгал бүтэн эвдэрнэ.
 * Хоосон утга нь АЛДАА БИШ — анхдагчид (90 BPM, 4/4) шилжинэ.
 */
function validateTiming(
  rawTempo: unknown,
  rawMeter: unknown
): { tempoBpm: number; meter: string } | null {
  const tempoBpm = rawTempo === undefined || rawTempo === null || rawTempo === ""
    ? TEMPO_DEFAULT
    : parseTempo(rawTempo);
  if (tempoBpm === null) return null;

  const meter = rawMeter === undefined || rawMeter === null || rawMeter === ""
    ? "4/4"
    : parseMeter(rawMeter);
  if (meter === null) return null;

  return { tempoBpm, meter };
}

/**
 * "chess-puzzle" дасгалыг шалгана: шийдлийн шугамыг эхлэх байрлалаас нь
 * БОДИТООР тоглож үзнэ (`lib/chess/puzzle.ts`).
 *
 * ⚠ Хэлбэрийг нь шалгаад өнгөрөөж БОЛОХГҮЙ: хууль бус нүүдэл агуулсан
 * шугам санд ороход сурагч тэр нүүдлийг хөлөг дээр хийж ЧАДАХГҮЙ тул
 * бодлого дуусашгүй болж гацна.
 */
function validatePuzzleSolution(
  rawFen: unknown,
  rawSolution: unknown
): { fen: string; solution: string } | null {
  const fen = cleanText(rawFen, 200);
  if (!fen || typeof rawSolution !== "string") return null;

  const puzzle = parsePuzzle(fen, rawSolution);
  if (!puzzle) return null;

  // Хэвшсэн хэлбэрээр хадгална — тоглуулагч ба админ ижил мөр уншина.
  return { fen: puzzle.fen, solution: formatSolution(puzzle.moves) };
}
/**
 * "net-puzzle" дасгалыг шалгана.
 *
 * ⚠ `decodePuzzle` нь ЗӨВХӨН хэлбэрийг биш, БҮТЦИЙГ шалгадаг: бүх
 * кабель хөрштэйгээ таарсан, сервер байгаа, бүгд холбогдсон, гогцоогүй.
 * Эдгээрийн аль нэг нь зөрчигдвөл сурагчид ШИЙДЭГДЭХГҮЙ оньсого очно.
 */
/**
 * "slide-puzzle" ба "sudoku" дасгалын өгөгдлийг шалгана.
 *
 * ⚠ Гурван төрөл (`net-puzzle`, `slide-puzzle`, `sudoku`) НЭГ `grid`
 * баганыг хуваалцдаг ба тус бүр өөрийн угтвартай ("slide:", "sudoku:").
 * Тиймээс шалгалт нь ЗААВАЛ дасгалын ТӨРЛӨӨР сонгогдоно — эс бөгөөс
 * судокугийн мөрийг сүлжээний оньсого гэж уншиж, хоосон хөлөг үзүүлнэ.
 */
/**
 * "code-maze" даалгаврыг шалгана.
 *
 * ⚠ `decodeMaze` нь ШИЙДЭГДЭХ эсэхийг ч шалгадаг: эхлэлээс зорилго руу
 * зам байгаа эсэх, мөн блокийн хязгаар өгсөн бол ХАМГИЙН БОГИНО программ
 * тэр хязгаарт багтаж байгаа эсэх. Эс бөгөөс сурагч математикийн хувьд
 * шийдэгдэхгүй даалгавар дээр мөнхөд гацна.
 */
function validateCodeMaze(rawGrid: unknown): { grid: string } | null {
  if (typeof rawGrid !== "string") return null;
  const maze = decodeMaze(rawGrid);
  return maze ? { grid: encodeMaze(maze) } : null;
}

/**
 * "memory-game" дасгалыг шалгана.
 *
 * ⚠ `decodeMemory` нь зүйлс ДАВТАГДААГҮЙ эсэхийг ч шалгадаг: хоёр ижил
 * зүйл байвал дөрвөн хөзөр адилхан харагдаж, сурагч «зөв» хос нээсэн ч
 * тоглоом хүлээж авахгүй — дүрэм өөрөө эвдэрнэ.
 */
function validateMemory(rawGrid: unknown): { grid: string } | null {
  if (typeof rawGrid !== "string") return null;
  const deck = decodeMemory(rawGrid);
  return deck ? { grid: encodeMemory(deck) } : null;
}

function validateSlidePuzzle(rawGrid: unknown): { grid: string } | null {
  if (typeof rawGrid !== "string") return null;
  const state = decodeSlide(rawGrid);
  return state ? { grid: encodeSlide(state.size) } : null;
}

/**
 * ⚠ `decodeSudoku` нь ГАНЦ ШИЙДЭЛТЭЙ эсэхийг ч шалгадаг (хайлт хийнэ).
 * 9×9-д энэ нь хэдэн миллисекунд — хүсэлтийн дотор ажиллуулахад
 * асуудалгүй (`mateSearch`-ийн шатрын хайлтаас олон зуун дахин хямд).
 */
function validateSudoku(rawGrid: unknown): { grid: string } | null {
  if (typeof rawGrid !== "string") return null;
  const sudoku = decodeSudoku(rawGrid);
  return sudoku ? { grid: encodeSudoku(sudoku) } : null;
}

/**
 * ⚠ `decodeMatchstick` нь оньсого БУРУУ тэгшитгэл эсэх, БӨГӨӨД нэг таяг
 * зөөж шийдэгдэх эсэхийг ч шалгадаг. Аль хэдийн зөв тэгшитгэл бол сурагч
 * юу ч хийхгүйгээр гацна; шийдэлгүй бол мөнхөд оролдоно.
 */
function validateMatchstick(rawGrid: unknown): { grid: string } | null {
  if (typeof rawGrid !== "string") return null;
  const puzzle = decodeMatchstick(rawGrid);
  return puzzle ? { grid: encodeMatchstick(puzzle) } : null;
}

/**
 * ⚠ `decodeTangram` нь дүрсийн ТАЛБАЙГ шалгадаг: долоон хэсгийн нийт
 * талбайтай тэнцэхгүй дүрс нь ШИЙДЭГДЭХГҮЙ — сурагч хэчнээн оролдсон ч
 * дуусахгүй.
 */
function validateTangram(rawGrid: unknown): { grid: string } | null {
  if (typeof rawGrid !== "string") return null;
  const figure = decodeTangram(rawGrid);
  return figure ? { grid: encodeTangram(figure) } : null;
}

/**
 * ⚠ `decodeRecall` нь талбараас гадуурх нүд, давхардал, бүх нүд асах
 * зэрэг ШИЙДЭГДЭХГҮЙ тохиолдлуудыг ч барина.
 */
function validateRecall(rawGrid: unknown): { grid: string } | null {
  if (typeof rawGrid !== "string") return null;
  const recall = decodeRecall(rawGrid);
  return recall ? { grid: encodeRecall(recall) } : null;
}

function validateNetPuzzle(rawGrid: unknown): { grid: string } | null {
  if (typeof rawGrid !== "string") return null;

  const puzzle = decodePuzzle(rawGrid);
  if (!puzzle) return null;

  return { grid: encodePuzzle(puzzle) };
}

/**
 * "draughts-puzzle" дасгалыг шалгана: шугамыг эхлэх байрлалаас нь БОДИТООР
 * тоглож үзнэ (`lib/draughts/puzzle.ts`).
 *
 * ⚠ Тэр задлагч нь өрсөлдөгчийн хариу бүр АЛБАДМАЛ эсэхийг ч шалгадаг —
 * албадмал биш цуваа санд ороход сурагч зөв тоглосон ч хөлөг дээрх байрлал
 * хадгалсан шугамаас салж, дасгал утгагүй болно.
 */
function validateDraughtsPuzzle(
  rawFen: unknown,
  rawSolution: unknown
): { fen: string; solution: string } | null {
  if (typeof rawFen !== "string" || typeof rawSolution !== "string") return null;

  const puzzle = parseDraughtsPuzzle(rawFen, rawSolution);
  if (!puzzle) return null;

  return { fen: puzzle.fen, solution: formatDraughtsSolution(puzzle.moves) };
}

/**
 * "go-move" дасгалыг шалгана: байрлал задрах ёстой БА зөв хариулт бүр нь
 * хөлөг дээрх ХООСОН, ХУУЛЬ ЁСНЫ огтлолцол байх ёстой.
 *
 * ⚠ Зөвхөн хэлбэрийг шалгаад өнгөрөөж БОЛОХГҮЙ: аль хэдийн чулуутай (эсвэл
 * амиа хорлох) цэгийг «зөв хариулт» болгож хадгалбал сурагч түүн дээр
 * ХЭЗЭЭ Ч тавьж чадахгүй тул дасгал дуусашгүй болно.
 */
function validateGoMove(
  rawGrid: unknown,
  rawSolution: unknown
): { grid: string; solution: string } | null {
  if (typeof rawGrid !== "string") return null;

  const position = decodeGo(rawGrid);
  if (!position) return null;

  if (typeof rawSolution !== "string") return null;
  const points = parsePointList(position.size, rawSolution);
  if (!points) return null;
  if (points.some((point) => play(position, point) === null)) return null;

  return { grid: encodeGo(position), solution: formatPointList(position.size, points) };
}

export type ExerciseType =
  | "choice"
  | "board-move"
  | "draughts-move"
  | "draughts-puzzle"
  | "chess-puzzle"
  | "net-puzzle"
  | "slide-puzzle"
  | "sudoku"
  | "matchstick"
  | "tangram"
  | "recall"
  | "memory-game"
  | "code-maze"
  | "go-move"
  | "piano-play"
  | "rhythm-tap";

export function parseExerciseType(value: unknown): ExerciseType {
  if (
    value === "board-move" ||
    value === "draughts-move" ||
    value === "draughts-puzzle" ||
    value === "chess-puzzle" ||
    value === "net-puzzle" ||
    value === "slide-puzzle" ||
    value === "sudoku" ||
    value === "matchstick" ||
    value === "tangram" ||
    value === "recall" ||
    value === "memory-game" ||
    value === "code-maze" ||
    value === "go-move" ||
    value === "piano-play" ||
    value === "rhythm-tap"
  ) {
    return value;
  }
  return "choice";
}

export type ExerciseFields = {
  type: ExerciseType;
  options: ExerciseOptionInput[] | null;
  /** "choice"-ийн англи шошгууд — ЗААВАЛ БИШ (`null` = орчуулга алга). */
  optionsEn: ExerciseOptionInput[] | null;
  correctOptionId: string | null;
  fen: string | null;
  correctFrom: string | null;
  correctTo: string | null;
  correctPromotion: string | null;
  grid: string | null;
  solution: string | null;
  melody: string | null;
  tempoBpm: number | null;
  meter: string | null;
};

/**
 * Дасгалын БҮХ талбарыг (аль ч төрлийн) `body`-с шалгаж бэлдэнэ — create/update
 * ХОЁУЛАНД ХАМТ хэрэглэгдэнэ, тэдгээрийн шалгалт хэзээ ч зөрөхгүй.
 */
export function validateExerciseFields(body: Record<string, unknown>): ExerciseFields | null {
  const type = parseExerciseType(body.type);

  if (type === "board-move") {
    const validated = validateBoardMove(body.fen, body.correctFrom, body.correctTo, body.correctPromotion);
    if (!validated) return null;
    return {
      type,
      options: null,
      optionsEn: null,
      correctOptionId: null,
      ...validated,
      grid: null,
      solution: null,
      melody: null,
      tempoBpm: null,
      meter: null,
    };
  }

  if (type === "draughts-move") {
    const validated = validateDraughtsMove(body.fen, body.correctFrom, body.correctTo);
    if (!validated) return null;
    return {
      type,
      options: null,
      optionsEn: null,
      correctOptionId: null,
      ...validated,
      correctPromotion: null,
      grid: null,
      solution: null,
      melody: null,
      tempoBpm: null,
      meter: null,
    };
  }

  if (
    type === "net-puzzle" ||
    type === "slide-puzzle" ||
    type === "sudoku" ||
    type === "matchstick" ||
    type === "tangram" ||
    type === "recall" ||
    type === "code-maze" ||
    type === "memory-game"
  ) {
    const validated =
      type === "net-puzzle"
        ? validateNetPuzzle(body.grid)
        : type === "slide-puzzle"
          ? validateSlidePuzzle(body.grid)
          : type === "sudoku"
            ? validateSudoku(body.grid)
            : type === "matchstick"
              ? validateMatchstick(body.grid)
              : type === "tangram"
                ? validateTangram(body.grid)
                : type === "recall"
                  ? validateRecall(body.grid)
              : type === "memory-game"
                ? validateMemory(body.grid)
                : validateCodeMaze(body.grid);
    if (!validated) return null;
    return {
      type,
      options: null,
      optionsEn: null,
      correctOptionId: null,
      fen: null,
      correctFrom: null,
      correctTo: null,
      correctPromotion: null,
      solution: null,
      melody: null,
      tempoBpm: null,
      meter: null,
      ...validated,
    };
  }

  if (type === "chess-puzzle") {
    const validated = validatePuzzleSolution(body.fen, body.solution);
    if (!validated) return null;
    return {
      type,
      options: null,
      optionsEn: null,
      correctOptionId: null,
      correctFrom: null,
      correctTo: null,
      correctPromotion: null,
      grid: null,
      melody: null,
      tempoBpm: null,
      meter: null,
      ...validated,
    };
  }

  if (type === "draughts-puzzle") {
    const validated = validateDraughtsPuzzle(body.fen, body.solution);
    if (!validated) return null;
    return {
      type,
      options: null,
      optionsEn: null,
      correctOptionId: null,
      correctFrom: null,
      correctTo: null,
      correctPromotion: null,
      grid: null,
      melody: null,
      tempoBpm: null,
      meter: null,
      ...validated,
    };
  }

  if (type === "go-move") {
    const validated = validateGoMove(body.grid, body.solution);
    if (!validated) return null;
    return {
      type,
      options: null,
      optionsEn: null,
      correctOptionId: null,
      fen: null,
      correctFrom: null,
      correctTo: null,
      correctPromotion: null,
      melody: null,
      tempoBpm: null,
      meter: null,
      ...validated,
    };
  }

  if (type === "piano-play" || type === "rhythm-tap") {
    const validated = validateMelody(body.melody);
    if (!validated) return null;

    const timing = validateTiming(body.tempoBpm, body.meter);
    if (!timing) return null;

    return {
      type,
      options: null,
      optionsEn: null,
      correctOptionId: null,
      fen: null,
      correctFrom: null,
      correctTo: null,
      correctPromotion: null,
      grid: null,
      solution: null,
      ...validated,
      ...timing,
    };
  }

  const validated = validateExerciseOptions(body.options, body.correctOptionId);
  if (!validated) return null;
  return {
    type,
    options: validated.options,
    optionsEn: validateOptionsEn(
      body.optionsEn,
      new Set(validated.options.map((option) => option.id))
    ),
    correctOptionId: validated.correctOptionId,
    fen: null,
    correctFrom: null,
    correctTo: null,
    correctPromotion: null,
    grid: null,
    solution: null,
    melody: null,
    tempoBpm: null,
    meter: null,
  };
}
