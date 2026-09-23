/**
 * Даамын хөтөлбөрийн ШИНЭ хичээлүүдийн байрлал үүсгэгч ба ХАТУУ шалгагч.
 *
 * ⚠ `src/`-ийн `generate.ts`-ийг ӨӨРЧЛӨХГҮЙ: хуучин хичээлүүд түүгээр
 * үүссэн бөгөөд санд байгаа агуулга дахин ажиллуулахад яг хэвээр гарах
 * ёстой. Шинэ шүүлтүүрүүд (хойш идэх, хамгийн их идэлт, солилцоо, 3
 * нүүдлийн комбинаци) ЭНД.
 *
 * ШАЛГАЛТЫН ЗАРЧИМ (сурагч буруу нүүдэл хийвэл ЯГ ТЭР АЛХАМ дээр үлдэж,
 * хариуг харахгүй — тиймээс хоёр дахь «зөв» хариулт нь сурагчийг гацаана):
 *   • draughts-move — хууль ёсны нүүдэл ЯГ НЭГ (идэлт заавал + хамгийн их
 *     идэлт хөдөлгүүрт шүүгдсэн), хадгалсан нүүдэлтэй таарна.
 *   • draughts-puzzle — `parseDraughtsPuzzle` задлана (өрсөлдөгчийн хариу
 *     бүр албадмал), сурагчийн 2 дахь ба түүнээс хойших нүүдэл бүр ГАНЦ
 *     хууль ёсны нүүдэл, эхний нүүдлийн бусад хувилбар бүр ХҮЧЭЭР ашиг
 *     (эсвэл солилцоо) өгдөггүй.
 */
import { Draughts } from "../../src/lib/draughts/engine";
import { makeRng, moveToken, randomBoard, type Rng } from "../../src/lib/draughts/generate";
import {
  deserializePosition,
  serializePosition,
  squareFromNumber,
  squareNumber,
} from "../../src/lib/draughts/notation";
import { parseDraughtsPuzzle } from "../../src/lib/draughts/puzzle";

import type { Board, DraughtsMove, Piece } from "../../src/lib/draughts/engine";
import type { Combo3Spec, ComboSpec, GenSpec, MoveSpec } from "./draughtsShared";

const SIZE = 10;
const DIRS: readonly [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

export type BoardTask =
  | { type: "draughts-move"; fen: string; from: string; to: string }
  | { type: "draughts-puzzle"; fen: string; solution: string };

const inBounds = (row: number, col: number) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;

const pieceCount = (board: Board, color: "w" | "b") =>
  board.flat().filter((cell) => cell?.color === color).length;

// --- Байрлалын бодит байдал ----------------------------------------------

export function positionProblem(fen: string): string | null {
  const setup = deserializePosition(fen);
  if (!setup) return "байрлал задрахгүй";
  if (setup.turn !== "w") return "цагаан нүүх ёстой";

  const tokens = fen
    .split(":")
    .slice(1)
    .flatMap((part) => (part.length > 1 ? part.slice(1).split(",") : []))
    .filter(Boolean);
  const { board } = setup;
  if (tokens.length !== board.flat().filter(Boolean).length) return "нүд давхардсан";

  const whites = pieceCount(board, "w");
  const blacks = pieceCount(board, "b");
  if (whites < 1 || blacks < 1 || whites > 20 || blacks > 20) return "хүүгийн тоо буруу";

  for (let col = 0; col < SIZE; col += 1) {
    const top = board[0][col];
    const bottom = board[SIZE - 1][col];
    if (top && top.color === "w" && !top.king) return "цагаан хүү сүүлийн эгнээнд";
    if (bottom && bottom.color === "b" && !bottom.king) return "хар хүү сүүлийн эгнээнд";
  }
  return null;
}

// --- Туслах ---------------------------------------------------------------

/** Цагааны идэлт ЭХЭЛЖ болох (нүд, чиглэл) хосын тоо — «хамгийн их идэлт» дасгалд. */
function jumpStartCount(board: Board): number {
  let count = 0;
  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== "w") continue;
      for (const [dr, dc] of DIRS) {
        if (!piece.king) {
          const mid = board[row + dr]?.[col + dc];
          const landRow = row + 2 * dr;
          const landCol = col + 2 * dc;
          if (inBounds(landRow, landCol) && mid?.color === "b" && !board[landRow][landCol]) count += 1;
        } else {
          let r = row + dr;
          let c = col + dc;
          while (inBounds(r, c) && !board[r][c]) {
            r += dr;
            c += dc;
          }
          if (
            inBounds(r, c) &&
            board[r][c]!.color === "b" &&
            inBounds(r + dr, c + dc) &&
            !board[r + dr][c + dc]
          ) {
            count += 1;
          }
        }
      }
    }
  }
  return count;
}

function moveMatches(spec: MoveSpec, board: Board, move: DraughtsMove): boolean {
  const piece = board[move.from.row][move.from.col] as Piece;
  const captures = move.captures.length;

  if (spec.quietOnly && captures > 0) return false;
  if (spec.minCaptures !== undefined && captures < spec.minCaptures) return false;
  if (spec.maxCaptures !== undefined && captures > spec.maxCaptures) return false;
  if (spec.mustPromote && !move.promoted) return false;
  if (spec.byKing && !piece.king) return false;
  if (spec.byMan && piece.king) return false;
  if (spec.backward && (piece.king || captures === 0 || move.captures[0].row !== move.from.row + 1)) {
    return false;
  }
  if (spec.majority && (captures < 2 || jumpStartCount(board) < 2)) return false;
  if (captures > 0 && pieceCount(board, "b") - captures < 1) return false;
  return true;
}

/**
 * Цагаан (эхний нүүдлийн ӨӨР хувилбар) хийсний дараах байрлал (хар нүүх
 * ээлж) — энэ хувилбар ч «шийдэл» болж чадах уу?
 *
 *   (а) 2 хагас нүүдлийн minimax: харын АЛЬ Ч хариуны дараа цагаан шууд
 *       идээд цэвэр ашиг ≥ 1 авна;
 *   (б) хоёр талын нүүдэл албадмал хэвээр үргэлжлэх шугам (4 хүртэл
 *       хагас нүүдэл нэмэгдэнэ) цэвэр ашиг ≥ 1 өгнө;
 *   (в) `threshold === 0` (солилцооны даалгавар) үед хар заавал идэх ба
 *       цагаан тэнцүүлж чадах аливаа хувилбар ч «бас солилцоо» гэж тооцогдоно;
 *   (г) хар нүүх нүүдэлгүй болсон бол (хожил) мэдээж шийдэл.
 */
function alternativeWorks(game: Draughts, threshold: 0 | 1): boolean {
  const replies = game.legalMoves();
  if (replies.length === 0) return true;

  let worst = Infinity;
  for (const reply of replies) {
    game.applyMove(reply);
    const finals = game.legalMoves();
    const best =
      finals.length === 0 ? -Infinity : Math.max(...finals.map((m) => m.captures.length));
    game.undo();
    worst = Math.min(worst, best - reply.captures.length);
  }
  if (worst >= 1) return true;
  const blackMustCapture = replies[0].captures.length > 0;
  if (threshold === 0 && blackMustCapture && worst >= 0) return true;

  // (б) албадмал шугам
  let applied = 0;
  let net = 0;
  let blackCaptured = false;
  let works = false;
  for (let step = 0; step < 3; step += 1) {
    const black = game.legalMoves();
    if (black.length !== 1) break;
    game.applyMove(black[0]);
    applied += 1;
    net -= black[0].captures.length;
    if (black[0].captures.length > 0) blackCaptured = true;

    const white = game.legalMoves();
    if (white.length === 0) break;
    const best = Math.max(...white.map((m) => m.captures.length));
    if (net + best >= 1 || (threshold === 0 && blackCaptured && net + best >= 0 && best > 0)) {
      // Цагааны сонголт олон байсан ч хамгийн сайн нь хангалттай.
      works = true;
      break;
    }
    if (white.length !== 1) break;
    game.applyMove(white[0]);
    applied += 1;
    net += white[0].captures.length;
  }
  for (let i = 0; i < applied; i += 1) game.undo();
  return works;
}

// --- ХАТУУ шалгагч (санд орох цорын ганц хаалга) ----------------------------

export function moveProblem(fen: string, from: string, to: string): string | null {
  const position = positionProblem(fen);
  if (position) return position;

  const setup = deserializePosition(fen)!;
  const game = new Draughts(setup);
  const legal = game.legalMoves();
  if (legal.length !== 1) return `хууль ёсны нүүдэл ${legal.length} (ганц байх ёстой)`;
  if (moveToken(legal[0]) !== `${from}-${to}`) return `хадгалсан хариулт ${from}-${to} хууль бус`;

  const captures = legal[0].captures.length;
  if (captures > 0 && pieceCount(setup.board, "b") - captures < 1) return "хар хүү үлдэхгүй";
  return null;
}

/**
 * `strict` = false үед зөвхөн тоглогдох эсэхийг (хуучин seed-ийн шалгалт),
 * true үед эхний нүүдлийн өөр хувилбарыг ч шалгана.
 */
export function puzzleProblem(fen: string, solution: string, strict = true): string | null {
  const position = positionProblem(fen);
  if (position) return position;

  const parsed = parseDraughtsPuzzle(fen, solution);
  if (!parsed) return "шийдлийн шугам задрахгүй (өрсөлдөгчийн хариу албадмал биш?)";

  const last = parsed.moves[parsed.moves.length - 1];
  if (!last.isPlayer || last.captures === 0) return "сүүлийн нүүдэл идэлт биш";

  const net = parsed.playerCaptures - parsed.opponentCaptures;
  if (net < 0) return "цагаан материал алдана";
  if (!strict) return null;
  if (parsed.opponentCaptures === 0) return "тулгуургүй";

  const setup = deserializePosition(fen)!;

  /*
   * ⚠ ТУЛГУУРЫН НҮҮДЭЛ ДААМ БОЛЖ БОЛОХГҮЙ.
   *
   * Даалгавар нь «тулгуураа өгөөд цохи» — дүрсээ ЗОРИУД өгөх санаа.
   * Гэтэл золиосын нүүдэл нь сүүлийн эгнээнд бууж ДААМ болчихвол хоёр
   * зүйл эвдэрнэ:
   *   1. Тэр нүүдэл дүрсээ өгөхийн оронд дүрс ОЛЖ авна — «золиос» гэдэг
   *      үг худал болно.
   *   2. Дараа нь өрсөлдөгч тэр шинэхэн даамыг иддэг тул сурагч «яагаад
   *      даамаа өгөв?» гэж эргэлзэнэ.
   *
   * Урьд нь энэ шалгуур байгаагүйгээс 367 бодлогын 198 нь ийм болсон.
   */
  const probeSetup = new Draughts(setup);
  const firstIntended = probeSetup
    .legalMoves()
    .find((m) => moveToken(m) === `${parsed.moves[0].from}-${parsed.moves[0].to}`);
  if (firstIntended?.promoted) return "тулгуурын нүүдэл даам болж байна — золиос болохгүй";

  /*
   * ⚠ ӨРСӨЛДӨГЧ ДААМ БОЛОХ ЁСГҮЙ.
   *
   * Тулгуур нь харыг ИДЭХЭД хүргэдэг бөгөөд тэр идэлт нь сүүлийн
   * эгнээнд буувал хар тал ДААМ олж авна. Цагаан хэдэн дүрс хожсон ч
   * даам нь тэр ашгийг дийлэнхдээ давна — сурагчид «энэ бол сайн
   * цохилт» гэж заах нь буруу.
   */
  const promoProbe = new Draughts(setup);
  for (const step of parsed.moves) {
    const played = promoProbe
      .legalMoves()
      .find((m) => moveToken(m) === `${step.from}-${step.to}`);
    if (!played) break;
    if (!step.isPlayer && played.promoted) return "өрсөлдөгч даам болж байна";
    promoProbe.applyMove(played);
  }

  const threshold: 0 | 1 = net > 0 ? 1 : 0;

  const probe = new Draughts(setup);
  const firstMoves = probe.legalMoves();
  const intended = `${parsed.moves[0].from}-${parsed.moves[0].to}`;
  for (const alternative of firstMoves) {
    if (moveToken(alternative) === intended) continue;
    const game = new Draughts(setup);
    game.applyMove(alternative);
    if (alternativeWorks(game, threshold)) return `өөр эхний нүүдэл ч ажиллана: ${moveToken(alternative)}`;
  }

  const game = new Draughts(setup);
  for (const [index, move] of parsed.moves.entries()) {
    if (move.isPlayer && index > 0) {
      const legal = game.legalMoves();
      if (legal.length !== 1) return `${index + 1}-р хагас нүүдэлд ${legal.length} хувилбар`;
    }
    game.move(squareFromNumber(move.from), squareFromNumber(move.to));
  }
  if (pieceCount(game.board(), "b") < 1) return "хар хүү үлдэхгүй";

  /*
   * ⚠ ЦОХИЛТЫН ДАРАА ЦАГААН ИЛҮҮД ГАРСАН БАЙХ.
   *
   * Урьд нь зөвхөн комбинацийн ЦЭВЭР АШГИЙГ (`net`) шалгадаг байв —
   * «нэг өгөөд хоёр авлаа» гэх мэт. Гэтэл эхлэлийн байрлал өөрөө
   * хоцорсон байж болно: цагаан 4, хар 6 дүрстэй үед +1 авсан ч 5:5
   * буюу дээд тал нь тэнцүү хэвээр үлдэнэ. Сурагч «зөв цохилт хийсэн
   * атлаа яагаад хожихгүй байна?» гэж эргэлзэнэ.
   *
   * ⚠ СОЛИЛЦООНЫ дасгалд (net === 0) ялалт шаардахгүй — тэнд зорилго нь
   * тэнцүү солилцоо хийх. Гэхдээ тэндээ ч цагаан ХОЦОРЧ болохгүй.
   */
  /*
   * ⚠ ХҮҮ ЦУВААНЫ ДУНДУУР ДААМЫН ЭГНЭЭГЭЭР ДАЙРЧ ӨНГӨРӨХ ЁСГҮЙ.
   *
   * Эзний дүрэм: «Хүү идэлт хийж яваад сүүлчийн мөрөнд хүрч даам болсон
   * бол тухайн үргэлжилсэн идэлтийн үеэр шууд даамын эрхээр буцаж
   * идэхгүй — даамын эрх ДАРААГИЙН нүүдлээс хэрэгжинэ.»
   *
   * Тэр мөчид «энэ дүрс одоо даам уу, хүү юу?» гэсэн эргэлзээ үүсдэг
   * бөгөөд хөдөлгүүр (олон улсын дүрмээр) түүнийг даам болгодоггүй.
   * Хичээлийн байрлалд ийм маргаантай тохиолдол ОГТ гаргахгүй нь зөв —
   * дүрмийг тусад нь, тайван байрлал дээр заана.
   */
  const crossProbe = new Draughts(setup);
  for (const step of parsed.moves) {
    const played = crossProbe
      .legalMoves()
      .find((m) => moveToken(m) === `${step.from}-${step.to}`);
    if (!played) break;
    const piece = crossProbe.board()[played.from.row][played.from.col]!;
    const kingRow = piece.color === "w" ? 0 : 9;
    if (!piece.king && played.landings.slice(0, -1).some((l) => l.row === kingRow)) {
      return "цуваа нь даамын эгнээгээр дайран өнгөрдөг — дүрмийн хувьд эргэлзээтэй";
    }
    crossProbe.applyMove(played);
  }

  const finalBalance = netMaterial(game.board(), "w");
  const required = net > 0 ? 1 : 0;
  if (finalBalance < required) {
    return `цохилтын дараа цагаан ${finalBalance} үлдэнэ — ${required}-ээс багагүй байх ёстой`;
  }

  return null;
}

/** ЦЭВЭР материалын зөрүү тухайн талын харцаар (хүү = 1, даам = 3). */
function netMaterial(board: Board, color: "w" | "b"): number {
  let mine = 0;
  let theirs = 0;
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      const value = cell.king ? 3 : 1;
      if (cell.color === color) mine += value;
      else theirs += value;
    }
  }
  return mine - theirs;
}

export const taskProblem = (task: BoardTask): string | null =>
  task.type === "draughts-move"
    ? moveProblem(task.fen, task.from, task.to)
    : puzzleProblem(task.fen, task.solution);

// --- Үүсгэгчид ------------------------------------------------------------

function genMove(rng: Rng, spec: MoveSpec): BoardTask | null {
  const board = randomBoard(rng, spec.pieces);
  if (!board) return null;
  const legal = new Draughts({ board, turn: "w" }).legalMoves();
  if (legal.length !== 1 || !moveMatches(spec, board, legal[0])) return null;
  const [move] = legal;
  return {
    type: "draughts-move",
    fen: serializePosition(board, "w"),
    from: String(squareNumber(move.from.row, move.from.col)),
    to: String(squareNumber(move.to.row, move.to.col)),
  };
}

/** Эхний нүүдэл бүрээс ҮЛДСЭН шугамыг албадмалаар тоглож, болзол хангасныг цуглуулна. */
function uniqueLine(
  board: Board,
  plies: number,
  accept: (line: DraughtsMove[]) => boolean
): string | null {
  const firstMoves = new Draughts({ board, turn: "w" }).legalMoves();
  if (firstMoves.length === 0 || firstMoves[0].captures.length > 0) return null;

  let found: string | null = null;
  for (const first of firstMoves) {
    const game = new Draughts({ board, turn: "w" });
    game.applyMove(first);
    const line = [first];
    let ok = true;
    for (let ply = 1; ply < plies; ply += 1) {
      const legal = game.legalMoves();
      // Хар хариу бүр, цагааны 2 дахь нүүдлээс хойш бүр — ГАНЦ.
      if (legal.length !== 1) {
        ok = false;
        break;
      }
      // Харын эхний хариу нь заавал идэлт (жинхэнэ тулгуур), цагааны нүүдэл бүр идэлт.
      const isWhite = ply % 2 === 0;
      if ((isWhite || ply === 1) && legal[0].captures.length === 0) {
        ok = false;
        break;
      }
      game.applyMove(legal[0]);
      line.push(legal[0]);
    }
    if (!ok || !accept(line)) continue;
    if (found) return null; // хоёр дахь ажиллах тулгуур
    found = line.map(moveToken).join(" ");
  }
  return found;
}

function genCombo(rng: Rng, spec: ComboSpec): BoardTask | null {
  const board = randomBoard(rng, spec.pieces);
  if (!board) return null;
  const blacks = pieceCount(board, "b");
  const solution = uniqueLine(board, 3, ([, reply, final]) => {
    const gained = final.captures.length;
    const given = reply.captures.length;
    if (blacks - gained < 1) return false;
    if (spec.exchange) return gained === given;
    return gained > given && (spec.minGain === undefined || gained >= spec.minGain);
  });
  return solution ? { type: "draughts-puzzle", fen: serializePosition(board, "w"), solution } : null;
}

function genCombo3(rng: Rng, spec: Combo3Spec): BoardTask | null {
  const board = randomBoard(rng, spec.pieces);
  if (!board) return null;
  const blacks = pieceCount(board, "b");
  const solution = uniqueLine(board, 5, (line) => {
    const white = line[2].captures.length + line[4].captures.length;
    const black = line[1].captures.length + line[3].captures.length;
    if (blacks - white < 1) return false;
    return white - black >= (spec.minGain ?? 1);
  });
  return solution ? { type: "draughts-puzzle", fen: serializePosition(board, "w"), solution } : null;
}

export function generateTask(rng: Rng, spec: GenSpec): BoardTask | null {
  if (spec.type === "move") return genMove(rng, spec);
  if (spec.type === "combo") return genCombo(rng, spec);
  return genCombo3(rng, spec);
}

// --- Бусад даамын seed-ийн байрлалууд (давхардлаас сэргийлэх) ----------------

/**
 * `seed-draughts-tactics.ts` ба `seed-draughts-combos.ts`-ийн байрлалуудыг
 * ЯГ ТЭР алгоритмаар дахин гаргана. Тэдгээр script нь импортлох үед санд
 * холбогддог тул шууд импортлох боломжгүй — логикийг энд үнэнчээр хуулсан.
 */
export function otherSeedFens(): string[] {
  const place = (rng: Rng, whites: number, blacks: number): Board | null => {
    const board: Board = Array.from({ length: SIZE }, () => Array<Piece | null>(SIZE).fill(null));
    const used = new Set<number>();
    const put = (color: "w" | "b", count: number): boolean => {
      for (let placed = 0; placed < count; placed++) {
        let attempts = 0;
        for (;;) {
          if (attempts++ > 200) return false;
          const n = 1 + Math.floor(rng() * 50);
          if (used.has(n)) continue;
          const { row, col } = squareFromNumber(n);
          if (color === "w" && row === 0) continue;
          if (color === "b" && row === SIZE - 1) continue;
          used.add(n);
          board[row][col] = { color, king: false };
          break;
        }
      }
      return true;
    };
    return put("w", whites) && put("b", blacks) ? board : null;
  };

  const fens: string[] = [];

  // seed-draughts-tactics.ts
  {
    const rng = makeRng(20260910);
    const seen = new Set<string>();
    for (let attempt = 0; attempt < 200000 && seen.size < 20; attempt++) {
      const stage = Math.floor(seen.size / 5);
      const board = place(rng, 2 + stage, 3 + stage);
      if (!board) continue;
      const moves = new Draughts({ board, turn: "w" }).legalMoves();
      if (moves.length !== 1 || moves[0].captures.length === 0) continue;
      if (pieceCount(board, "b") - moves[0].captures.length < 1) continue;
      const fen = serializePosition(board, "w");
      if (seen.has(fen)) continue;
      seen.add(fen);
    }
    fens.push(...seen);
  }

  // seed-draughts-combos.ts
  {
    const rng = makeRng(20260911);
    const seen = new Set<string>();
    for (let attempt = 0; attempt < 400000 && seen.size < 12; attempt++) {
      const stage = Math.floor(seen.size / 3);
      const board = place(rng, 3 + stage, 3 + stage);
      if (!board) continue;
      const firstMoves = new Draughts({ board, turn: "w" }).legalMoves();
      if (firstMoves.length === 0 || firstMoves[0].captures.length > 0) continue;
      let found: string | null = null;
      let twice = false;
      for (const first of firstMoves) {
        const game = new Draughts({ board, turn: "w" });
        game.applyMove(first);
        const replies = game.legalMoves();
        if (replies.length !== 1 || replies[0].captures.length === 0) continue;
        game.applyMove(replies[0]);
        const finals = game.legalMoves();
        if (finals.length !== 1 || finals[0].captures.length === 0) continue;
        if (finals[0].captures.length <= replies[0].captures.length) continue;
        if (found) {
          twice = true;
          break;
        }
        found = [moveToken(first), moveToken(replies[0]), moveToken(finals[0])].join(" ");
      }
      if (!found || twice) continue;
      const fen = serializePosition(board, "w");
      if (seen.has(fen) || !parseDraughtsPuzzle(fen, found)) continue;
      seen.add(fen);
    }
    fens.push(...seen);
  }

  return fens;
}
