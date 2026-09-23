/**
 * ЭВДЭРСЭН «draughts-move» ДАСГАЛУУДЫГ СЭРГЭЭНЭ.
 *
 * ⚠ ЮУ БОЛСОН БЭ: эдгээр дасгалыг хөдөлгүүрийн ХУУЧИН, АЛДААТАЙ
 * хувилбараар үүсгэсэн. Тэр үед хүү даамын эгнээг ДАМЖИН өнгөрөхөд
 * шууд даам болж, үлдсэн хэлхээг «нисдэг даамын» дүрмээр
 * үргэлжлүүлдэг байв (`engine.ts` дотор тэр алдааг зассан тайлбартай).
 * Тиймээс хадгалагдсан «зөв хариулт» нь 48, 49 гэх мэт АЛСЫН нүдэнд
 * төгсдөг — өнөөгийн ЗӨВ дүрмээр тийш хүрэх арга байхгүй. Сурагч юу ч
 * дарсан хөлөг хүлээж авахгүй: «идэж болохгүй байна».
 *
 * ⚠ ХАРИУЛТЫГ НЬ ЗАСААД ЗОГСОХГҮЙ, БАЙРЛАЛЫГ НЬ ДАХИН ҮҮСГЭНЭ. Эрүүл
 * 613 дасгалыг хэмжихэд БҮГД нь «цорын ганц хууль ёсны нүүдэлтэй»
 * байрлал байв — энэ бол `generate.ts`-ийн үндсэн зарчим. Эвдэрсэн
 * байрлалуудын ихэнх нь хоёр ба түүнээс дээш нүүдэлтэй, эсвэл
 * даалгавар шаардсан хэмжээний идэлт огт байхгүй болсон. Хариултыг нь
 * л дарвал даалгавар («гурваас дээш ид») байрлалтайгаа зөрөх хэвээр.
 *
 * ⚠ ҮР НЬ ДАСГАЛЫН `id`-ААС: дахин ажиллуулахад ИЖИЛ байрлал гарна.
 *
 * Ажиллуулах:  npm run repair:draughts [-- --apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { netDraughtsMaterial } from "../src/lib/draughts/bot";
import { seedFromString } from "../src/lib/draughts/generate";
import { deserializePosition, squareNumber } from "../src/lib/draughts/notation";

import { makeRng } from "../src/lib/draughts/generate";
import { generateTask, puzzleProblem } from "./curriculum/draughtsGenerators";
import { parseDraughtsPuzzle } from "../src/lib/draughts/puzzle";
import { isEditableUnit } from "./curriculum/levelGuard";

import type { Board, DraughtsMove } from "../src/lib/draughts/engine";
import type { GenSpec, MoveSpec, Pieces } from "./curriculum/draughtsShared";

/**
 * Даалгаврын ТЕКСТЭЭС шаардлагыг БҮРЭН гаргана.
 *
 * ⚠ ЗӨВХӨН ИДЭЛТИЙН ТОО ХАНГАЛТГҮЙ. Урьд нь энэ функц тоон хязгаарыг л
 * буцаадаг байсан тул «ДААМААРАА ид» гэсэн 6 дасгалын шийдэл нь
 * ХҮҮГЭЭР иддэг байв — хүүхэд даалгаврынхаа эсрэг тоглож байж зөв
 * хариу авна. Тиймээс дүрсийн төрөл (`byKing`), чиглэл (`backward`),
 * дамка болох (`mustPromote`), идэлтгүй (`quietOnly`) — бүгдийг энд
 * тусгав.
 *
 * ⚠ Тоон хязгаарыг ЭРҮҮЛ дасгалуудыг хэмжиж авсан (тухайн даалгаврын
 * бодит идэлтийн доод/дээд утга) — өөрөөсөө зохиовол шинэ дасгал нь
 * хөршүүдээсээ хүндрэлээр зөрнө.
 */
export function specFor(prompt: string, pieces: Pieces): MoveSpec | null {
  const base = { type: "move" as const, pieces };

  if (/Даамаараа идэж дүрс хож/.test(prompt))
    return { ...base, byKing: true, minCaptures: 1, maxCaptures: 2 };
  if (/Даамаараа ид/.test(prompt))
    return { ...base, byKing: true, minCaptures: 1, maxCaptures: 4 };
  if (/Хүүгээрээ хойш нь ид/.test(prompt))
    return { ...base, byMan: true, backward: true, minCaptures: 1, maxCaptures: 3 };
  if (/Идээд даам бол/.test(prompt))
    return { ...base, byMan: true, mustPromote: true, minCaptures: 1, maxCaptures: 3 };
  if (/Хүүгээ даам болго|Даам бол|Даам руу гарах/.test(prompt))
    return { ...base, byMan: true, mustPromote: true };
  if (/Боломжтой нүүдлийг хий|Цорын ганц нүүдлээ ол/.test(prompt))
    return { ...base, quietOnly: true };
  if (/дөрвөөс дээш/.test(prompt)) return { ...base, minCaptures: 4, maxCaptures: 5 };
  if (/гурваас дээш/.test(prompt)) return { ...base, minCaptures: 3, maxCaptures: 4 };
  if (/хоёроос дээш/.test(prompt)) return { ...base, minCaptures: 2, maxCaptures: 3 };
  if (/хоёр хүү ид/.test(prompt)) return { ...base, minCaptures: 2, maxCaptures: 2 };
  if (/хамгийн их хүү ид/.test(prompt)) return { ...base, minCaptures: 2, maxCaptures: 2 };
  if (/Хамгийн олон хүү иддэг цуваа/.test(prompt))
    return { ...base, majority: true, minCaptures: 2, maxCaptures: 4 };
  if (/Идэх боломжоо ол/.test(prompt)) return { ...base, minCaptures: 1, maxCaptures: 5 };
  /*
   * ⚠ «Төгсгөлд дүрс хож» нь дүрсийн ТӨРЛИЙГ заадаггүй (даам, хүү
   * хоёулаа тохирно) — зөвхөн материал хожихыг шаардана. Байхгүй
   * шаардлагыг нэмбэл эрүүл дасгал дэмий дахин үүснэ.
   */
  if (/Төгсгөлд дүрс хож/.test(prompt)) return { ...base, minCaptures: 1, maxCaptures: 2 };
  return null;
}

/**
 * «ХАМГААЛАЛТ» хичээлийн дасгал — цохилтод өртөхгүй ГАНЦ нүүдлийг ол.
 *
 * ⚠ ЯАГААД ЭНЭ ХЭЛБЭР ВЭ: хичээлийн өөрийнх нь онол «Хамгаалалт нь
 * хүлээх биш ТООЦОХ: өрсөлдөгчийн боломжит цуваа бүрийг нүүдэл
 * хийхээсээ өмнө тоол» гэж хэлдэг. Дадлага нь яг тэр ажлыг хийлгэх
 * ёстой: нүүдэл бүрийн ДАРАА хар тал юу хийхийг тоолж, ганц аюулгүйг
 * нь олно. Урьд нь эдгээр хичээлд ерөнхий «Идэх боломжоо ол» дасгал
 * байсан — тэр нь ДОВТОЛГООНЫ дасгал, хамгаалалт биш.
 *
 * ⚠ ИДЭЛТГҮЙ (тайван) БАЙРЛАЛ ЗААВАЛ: даамд идэлт албадмал тул цагаанд
 * идэх боломж байвал сонгох эрх алга — хамгаалах шийдвэр гарахгүй.
 */
export const DEFENCE_PROMPT =
  "Цагаанаар тоглож байна. Аюулгүй нүүдлээ ол — бусад нь дүрс алдана.";
export const DEFENCE_PROMPT_EN =
  "White to play. Find the safe move — every other move drops a piece.";

/** Хоёр тал сайнаар тоглосны дараах ЦАГААНЫ цэвэр материал. */
function materialAfterBestPlay(game: Draughts, depth: number): number {
  if (depth === 0 || game.isGameOver()) return netDraughtsMaterial(game, "w");

  const moves = game.legalMoves();
  if (moves.length === 0) return netDraughtsMaterial(game, "w");

  const white = game.turn() === "w";
  let best = white ? -Infinity : Infinity;
  for (const move of moves) {
    game.applyMove(move);
    const value = materialAfterBestPlay(game, depth - 1);
    game.undo();
    best = white ? Math.max(best, value) : Math.min(best, value);
  }
  return best;
}

/**
 * ⚠ ГҮН 3 (хар → цагаан → хар): золиостой цохилтыг харахад хангалттай,
 * гэхдээ аудитыг удаашруулахааргүй. Гүн 1 бол золиосыг «ашигтай» гэж
 * андуурна.
 */
const DEFENCE_DEPTH = 3;

export function defenceProblem(
  position: { board: Board; turn: "w" | "b" },
  move: DraughtsMove
): string | null {
  const game = new Draughts(position);
  const moves = game.legalMoves();

  if (moves.some((m) => m.captures.length > 0)) return "идэлт албадмал — сонгох эрх алга";
  if (moves.length < 3) return `${moves.length} нүүдэлтэй — сонголт хэт цөөн`;

  const base = netDraughtsMaterial(game, "w");
  const safe: DraughtsMove[] = [];
  let survivors = 0;

  for (const candidate of moves) {
    game.applyMove(candidate);
    const value = materialAfterBestPlay(game, DEFENCE_DEPTH);
    game.undo();

    if (value >= base) safe.push(candidate);
    // ⚠ Бусад нь ДҮРС АЛДАХ ёстой: «бага зэрэг муу» нүүдэл байвал
    //    даалгаврын «бусад нь дүрс алдана» гэсэн амлалт худал болно.
    else if (value > base - 1) survivors++;
  }

  if (safe.length !== 1) return `${safe.length} аюулгүй нүүдэл байна — ганц байх ёстой`;
  if (survivors > 0) return `${survivors} нүүдэл дүрс алдахгүй өнгөрнө`;

  const [only] = safe;
  if (
    only.from.row !== move.from.row ||
    only.from.col !== move.from.col ||
    only.to.row !== move.to.row ||
    only.to.col !== move.to.col
  ) {
    return "хадгалагдсан хариулт нь аюулгүй нүүдэл биш";
  }

  return null;
}

/**
 * «ТӨВИЙН ХЯНАЛТ» хичээлийн дасгал — төв рүү нүүх үү, зах рүү гарах уу.
 *
 * ⚠ ХИЧЭЭЛ ӨӨРӨӨ ТОДОРХОЙЛОЛТОО ӨГСӨН: «Захын хүү хоёр чигт,
 * төвийн хүү дөрөв чигт ажиллана», «зах руу түрэгдсэн хүүний
 * нүүдлийн эрх бага». Тиймээс дадлага нь ТЭР СОНГОЛТЫГ хийлгэнэ.
 *
 * ⚠ `defenceProblem`-ИЙГ ДАВТАХГҮЙ: «аюулгүй нүүдэл ганц,
 * бусад нь дүрс алдана» гэсэн дүрэм нэг газар л бичигдэнэ. Ертөнц нь
 * дээр нэмэгдэх нь: хариу нь ЗААВАЛ төвд буух бөгөөд хөлөг дээр
 * зах руу гарах (шийтгэгдэх) нүүдэл байх ёстой.
 */
export const CENTRE_PROMPT =
  "Цагаанаар тоглож байна. Төв рүү нүү — зах руу гарвал дүрсээ алдана.";
export const CENTRE_PROMPT_EN =
  "White to play. Move to the centre — every move to the edge drops a piece.";

/** Захын багана — энд гарсан хүү хоёрхон ташуу чигтэй болж сулрана. */
export const isEdgeCol = (col: number) => col === 0 || col === 9;

/** Дөрөвөн ташуу хөрш нь хөлөг дээр байгаа, захын багана БИШ нүд. */
export function isCentreSquare(square: { row: number; col: number }): boolean {
  if (square.row < 1 || square.row > 8) return false;
  if (square.col < 2 || square.col > 7) return false;
  return true;
}

export function centreProblem(
  position: { board: Board; turn: "w" | "b" },
  move: DraughtsMove
): string | null {
  const shared = defenceProblem(position, move);
  if (shared) return shared;

  if (!isCentreSquare(move.to)) {
    return `хариулт ${squareNumber(move.to.row, move.to.col)} нүдэнд буудаг — төв биш`;
  }

  /*
   * ⚠ ЗАХЫН СОНГОЛТ ХӨЛӨГ ДЭЭР БАЙХ ЁСТОЙ. Байхгүй бол даалгаврын
   * «зах руу гарвал дүрсээ алдана» гэсэн сургаал хийсвэр үлдэнэ.
   */
  const edgeMoves = new Draughts(position).legalMoves().filter((m) => isEdgeCol(m.to.col));
  if (edgeMoves.length === 0) return "зах руу гарах нүүдэл алга — сонголт харагдахгүй";

  return null;
}

/**
 * «ХОЖИЛ» хичээлийн дасгал — нэг нүүдлээр тоглолтыг дуусгана.
 *
 * ⚠ `MoveSpec`-ээр ИЛЭРХИЙЛЭГДЭХГҮЙ: энэ нь нүүдлийн ШИНЖ (идэлтийн тоо,
 * дүрсийн төрөл) БИШ, нүүдлийн ДАРААХ БАЙРЛАЛЫН шинж. Тиймээс тусдаа
 * шалгуур.
 */
/**
 * ⚠ ТУСГАЙ ҮҮСГЭГЧТЭЙ бодлогууд — энэ скрипт тэднийг ДАРЖ БИЧИХГҮЙ.
 * Ерөнхий комбинациар сольвол хичээлийн ТУСГАЙ санаа (гурвалсан эгнээг
 * цоолох) алга болно. Нэг удаа яг ингэж алдсан.
 */
/** Тусгай даалгавар бүрийг ЗАСДАГ скрипт. */
export function scriptFor(prompt: string): string {
  if (prompt.includes("цоол")) return "scripts/fix-breakthrough-lesson.ts";
  if (prompt.includes("Завсраар")) return "scripts/fix-intermediate-lesson.ts";
  if (prompt.includes("Замаа чөлөөлөөд")) return "scripts/fix-clearance-lesson.ts";
  if (prompt.includes("Хамгаалагчийг")) return "scripts/fix-defence-break-lesson.ts";
  if (prompt.includes("золиослоод")) return "scripts/fix-sacrifice-lessons.ts";
  if (prompt.includes("Урхиа")) return "scripts/fix-trap-lessons.ts";
  if (prompt.includes("даам гар")) return "scripts/fix-promote-break-lesson.ts";
  if (prompt.includes("дараалан ид")) return "scripts/fix-chain-combo-lessons.ts";
  if (prompt.includes("Хоёр нүүдлийн комбинац")) return "scripts/fix-basic-combo-lesson.ts";
  if (prompt.includes("Сул талыг") || prompt.includes("Довтолж"))
    return "scripts/fix-positional-lessons.ts";
  if (prompt.includes("Төв рүү нүү")) return "scripts/fix-centre-lesson.ts";
  return "scripts/repair-draughts-moves.ts";
}

export const SPECIAL_PUZZLE_PROMPTS = new Set([
  "Цагаанаар тоглож байна. Дунд хүүд нь өгөөд цоол.",
  "Цагаанаар тоглож байна. Завсраар өгөөд цувааг уртасга.",
  "Цагаанаар тоглож байна. Замаа чөлөөлөөд цохи.",
  "Цагаанаар тоглож байна. Хамгаалагчийг нь татаад задал.",
  "Цагаанаар тоглож байна. Хоёр хүү золиослоод илүүг нь ав.",
  "Цагаанаар тоглож байна. Урхиа тавь — нэг хүү өгөөд гурваас доошгүйг ав.",
  "Цагаанаар тоглож байна. Цоолж орж даам гар.",
  "Цагаанаар тоглож байна. Хоёр нүүдлийн комбинацийг хий.",
  "Цагаанаар тоглож байна. Нэг хүү өгөөд гурван удаа дараалан ид.",
  "Цагаанаар тоглож байна. Комбинациар даам руу гар.",
  "Цагаанаар тоглож байна. Сул талыг нь ол — хамгаалалтгүй хүүг ид.",
  "Цагаанаар тоглож байна. Довтолж, өрсөлдөгчийн талд ор.",
  "Цагаанаар тоглож байна. Тулгуураа өгөөд дараалсан цувааг хий.",
  "Цагаанаар тоглож байна. Гинжин цохилтоо эцэс хүртэл хий.",
]);

export const WIN_PROMPT = "Цагаанаар тоглож байна. Нэг нүүдлээр тоглолтыг хож.";
export const WIN_PROMPT_EN = "White to play. Win the game in one move.";

export function winProblem(
  position: { board: Board; turn: "w" | "b" },
  move: DraughtsMove
): string | null {
  const after = new Draughts(position);
  after.applyMove(move);

  /*
   * ⚠ ХОЖИЛ = ӨРСӨЛДӨГЧИЙН БҮХ ДҮРСИЙГ ИДЭХ, өөр юу ч биш.
   *
   * Урьд нь энэ шалгуур нь «хар тал нүүх боломжгүй болсон» гэдгийг
   * хожил гэж үздэг байв (олон улсын FMJD дүрэм тийм). ЭНЭ САЙТЫН
   * дүрмээр (эзний шийдвэр) нүүдэлгүй болох нь ТЭНЦЭЭ — тиймээс боож
   * хаасан байрлалыг «хож» гэж заавал сурагчийг ТӨӨРӨГДҮҮЛНЭ.
   * `engine.ts`-ийн `winner()` ч ижил дүрэмтэй.
   */
  const blackLeft = after.board().flat().filter((cell) => cell?.color === "b").length;
  if (blackLeft > 0) return `${blackLeft} хар дүрс үлдэж байна — хожил биш`;

  return null;
}

/**
 * «ТЭНЦЭЭ» хичээлийн дасгал — нэг нүүдлээр өрсөлдөгчийг нүүдэлгүй болгоно.
 *
 * ⚠ САЙТЫН ДҮРЭМ: нүүдэлгүй болох нь ТЭНЦЭЭ (`engine.ts`-ийн `winner()`).
 * Тиймээс хожигдох гэж буй тал үүнийг АВРАЛ болгон ашиглаж чадна —
 * хичээлийн заах зүйл яг энэ.
 *
 * ⚠ `WIN_PROMPT`-оос ЯЛГААТАЙ нь: энд хөлөг дээр ХЭД ХЭДЭН хууль ёсны
 * нүүдэл байх ЁСТОЙ, тэдгээрээс ЗӨВХӨН НЭГ нь тэнцээ гаргана. Ганц
 * нүүдэлтэй байрлалд сонгох зүйлгүй тул дасгал утгагүй болно. Иймд
 * курсийн ердийн «ганц хууль ёсны нүүдэл» шалгуур ЭНД ХАМААРАХГҮЙ —
 * оронд нь «зорилгод хүргэх нүүдэл ганц» гэсэн шалгуур ажиллана.
 */
export const DRAW_PROMPT = "Цагаанаар тоглож байна. Нэг нүүдлээр тэнцээ гарга.";
export const DRAW_PROMPT_EN = "White to play. Force a draw in one move.";

export function drawProblem(
  position: { board: Board; turn: "w" | "b" },
  move: DraughtsMove
): string | null {
  const after = new Draughts(position);
  after.applyMove(move);

  const blackLeft = after.board().flat().filter((cell) => cell?.color === "b").length;
  // ⚠ Бүх дүрсийг идчихвэл энэ нь ХОЖИЛ — тэнцээний хичээлд буруу жишээ.
  if (blackLeft === 0) return "хар дүрс үлдэхгүй — энэ нь хожил, тэнцээ биш";
  if (after.legalMoves().length > 0) return "хар тал нүүсээр байна — тэнцээ биш";

  return null;
}

/**
 * Дасгал даалгавартайгаа ЗӨРЖ БАЙНА УУ — зөрвөл шалтгааныг буцаана.
 *
 * ⚠ Үүсгэгчийн ӨӨРИЙНХ нь шалгуурыг (`moveMatches` дотор нуугдсан
 * дүрмүүд) энд ДАВТАХГҮЙ: `generateTask` зөвхөн болзол хангасныг
 * буцаадаг тул шинээр үүсгэсэн бүхэн автоматаар тохирно. Энд зөвхөн
 * САНД АЛЬ ХЭДИЙН БАЙГАА дасгалыг шүүнэ.
 */
export function mismatch(spec: MoveSpec, board: Board, move: DraughtsMove): string | null {
  const piece = board[move.from.row][move.from.col]!;
  if (spec.byKing && !piece.king) return "даалгавар ДААМААР гэсэн ч шийдэл нь ХҮҮГЭЭР";
  if (spec.byMan && piece.king) return "даалгавар ХҮҮГЭЭР гэсэн ч шийдэл нь ДААМААР";
  if (spec.mustPromote && !move.promoted) return "даалгавар ДААМ БОЛ гэсэн ч болдоггүй";
  if (spec.quietOnly && move.captures.length > 0) return "идэлтгүй нүүдэл байх ёстой";
  /*
   * ⚠ ЧИГЛЭЛИЙГ ч шалгана. Энэ мөр байгаагүйгээс «Идэлтийн чиглэл»
   * хичээлийн 6 дасгалын 3 нь УРАГШ иддэг хэвээр үлдсэн — гарчиг нь
   * «хойш ч идэж болно» гэж заадаг атал хөлөг дээр тэр нь харагдахгүй.
   *
   * ⚠ Дүрмийг үүсгэгчийн `moveMatches`-ээс ҮНЭНЧЭЭР хуулав: цагааны
   * хувьд идэгдэх дүрс нэг мөр ДООШ (`from.row + 1`) байвал хойш идэлт.
   */
  if (spec.backward && (move.captures.length === 0 || move.captures[0].row !== move.from.row + 1))
    return "даалгавар ХОЙШ идэхийг шаардсан ч урагш иддэг";
  if (spec.minCaptures !== undefined && move.captures.length < spec.minCaptures)
    return `${spec.minCaptures} идэх ёстой ч ${move.captures.length} иддэг`;

  /*
   * ⚠ ДААМЫН ЭГНЭЭГЭЭР ДАЙРАН ӨНГӨРӨХ ЦУВАА ХИЧЭЭЛД ТОХИРОХГҮЙ.
   *
   * Олон улсын дүрмээр хүү дамкын эгнээг ДАМЖИН гарвал даам болохгүй —
   * зөвхөн ТЭНД ЗОГСВОЛ болно. Дүрмийн хувьд зөв ч сурагч дүрсээ тэр
   * эгнээнд буугаад цааш яваад, даам болоогүйг хараад эргэлзэнэ: «яагаад
   * даам болохгүй байна вэ?» Хичээлийн байрлалд ийм эргэлзээ хэрэггүй —
   * дүрмийг өөр дасгалаар тусад нь заана.
   */
  const piece2 = board[move.from.row][move.from.col]!;
  const kingRow = piece2.color === "w" ? 0 : 9;
  if (!piece2.king && move.landings.slice(0, -1).some((landing) => landing.row === kingRow))
    return "цуваа нь даамын эгнээгээр дайран өнгөрдөг — сурагчийг эргэлзүүлнэ";

  return null;
}

/** FEN-ээс дүрсийн тоо — шинэ байрлалыг ИЖИЛ бүрэлдэхүүнтэй гаргахад. */
export function piecesOf(fen: string): Pieces {
  const white = fen.split(":W")[1]?.split(":B")[0] ?? "";
  const black = fen.split(":B")[1] ?? "";
  const count = (part: string, king: boolean) =>
    (part.match(/K?\d+/g) ?? []).filter((token) => token.startsWith("K") === king).length;
  return {
    // ⚠ `whites` нь ЭНГИЙН хүүгийн тоо; дамкуудыг тусад нь дамжуулна.
    whites: count(white, false),
    blacks: count(black, false),
    whiteKings: count(white, true),
    blackKings: count(black, true),
  };
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<{
      id: string;
      prompt: string;
      fen: string | null;
      correct_from: string | null;
      correct_to: string | null;
      unit: string;
    }>(`select e.id, e.prompt, e.fen, e.correct_from, e.correct_to, u.title as unit
          from exercises e
          join lessons l on l.id = e.lesson_id
          join units u on u.id = l.unit_id
         where e.type = 'draughts-move' order by e.prompt, e.sort_order`)
  ).rows;

  let healthy = 0;
  let repaired = 0;
  const unrepaired: string[] = [];

  let locked = 0;

  for (const row of rows) {
    /*
     * ⚠ LEVEL 4-ӨӨС ӨМНӨХ АГУУЛГА ЦАРЦСАН (эзний заавар). Зөвхөн
     * тоолоод өнгөрнө — засвар хийхгүй.
     */
    if (!isEditableUnit(row.unit)) {
      locked++;
      continue;
    }

    if (!row.fen) {
      unrepaired.push(`${row.id} — FEN хоосон`);
      continue;
    }

    const isWin = row.prompt === WIN_PROMPT;
    const isDraw = row.prompt === DRAW_PROMPT;
    const isDefence = row.prompt === DEFENCE_PROMPT;
    const isCentre = row.prompt === CENTRE_PROMPT;
    /** Зорилгоор тодорхойлогддог даалгаврууд — `MoveSpec`-т багтахгүй. */
    const goal = isWin || isDraw || isDefence || isCentre;
    const spec = goal ? null : specFor(row.prompt, piecesOf(row.fen));
    if (!spec && !goal) {
      unrepaired.push(`${row.id} — даалгаврын шаардлага танигдсангүй: ${row.prompt}`);
      continue;
    }

    const position = deserializePosition(row.fen);
    /** Юу нь болоогүйг сурагчийн үгээр — лог дээр шууд уншигдана. */
    let problem: string | null = position ? null : "FEN уншигдахгүй";

    if (position) {
      const moves = new Draughts(position).legalMoves();
      const hit = moves.find(
        (m) =>
          String(squareNumber(m.from.row, m.from.col)) === row.correct_from &&
          String(squareNumber(m.to.row, m.to.col)) === row.correct_to
      );

      if (!hit) problem = "хадгалагдсан хариулт хууль бус";
      else if (isCentre) {
        // ⚠ Төвийн дасгалд ч нүүдэл ОЛОН байх ёстой — шалгуур өөрөө барина.
        problem = centreProblem(position, hit);
      } else if (isDefence) {
        // ⚠ Хамгаалалтын дасгалд нүүдэл ОЛОН байх ёстой (доорх шалгуур өөрөө барина).
        problem = defenceProblem(position, hit);
      } else if (isDraw) {
        /*
         * ⚠ ТЭНЦЭЭНИЙ дасгалд «ганц хууль ёсны нүүдэл» БИШ, «тэнцээ
         * гаргах нүүдэл ганц» байх ёстой (дээрх `DRAW_PROMPT`-ийн
         * тайлбарыг үзнэ үү).
         */
        const drawing = moves.filter((m) => !drawProblem(position, m));
        if (moves.length < 2) problem = "сонгох нүүдэл алга — бодох зүйлгүй";
        else if (drawing.length !== 1) problem = `${drawing.length} нүүдэл тэнцээ гаргана`;
        else problem = drawProblem(position, hit);
      } else if (moves.length !== 1) {
        // ⚠ Ганц хууль ёсны нүүдэл байх нь үүсгэгчийн ҮНДСЭН зарчим.
        problem = `${moves.length} хууль ёсны нүүдэлтэй`;
      } else problem = isWin ? winProblem(position, hit) : mismatch(spec!, position.board, hit);
    }

    /*
     * ⚠ ХОЖЛЫН дасгалыг ЭНД дахин үүсгэхгүй: түүний үүсгэгч нь
     * `fix-win-lesson.ts`-д байна (тэр файл ЭНЭ файлаас `winProblem`-ыг
     * импортолдог тул энд буцааж импортловол тойрог үүснэ). Энд зөвхөн
     * шалгаж, хаана засахыг хэлнэ.
     */
    if (goal && problem) {
      const script = isWin
        ? "scripts/fix-win-lesson.ts"
        : isDraw
          ? "scripts/add-draw-lesson.ts"
          : isCentre
            ? "scripts/fix-centre-lesson.ts"
            : "scripts/fix-defence-lessons.ts";
      unrepaired.push(`${row.id} — ${problem} (засвар: ${script})`);
      continue;
    }

    if (!problem) {
      healthy++;
      continue;
    }

    /*
     * ⚠ `generateMoveTasks` БИШ, `generateTask`: эхнийх нь зөвхөн
     * идэлтийн ТОО мэддэг бөгөөд «даамаараа», «хойш», «дамка бол»
     * гэсэн шаардлагыг ойлгодоггүй. Яг тэр хязгаарлалтаас болж
     * «Даамаараа ид» гэсэн дасгалууд ХҮҮГЭЭР иддэг шийдэлтэй
     * үүссэн юм.
     */
    const rng = makeRng(seedFromString(row.id));
    let task: ReturnType<typeof generateTask> = null;
    for (let attempt = 0; attempt < 600000 && !task; attempt += 1) {
      const candidate = generateTask(rng, spec!);
      if (!candidate || candidate.type !== "draughts-move") continue;

      /*
       * ⚠ ҮҮСГЭСНИЙ ДАРАА ДАХИН ШАЛГАНА. `generateTask` нь `MoveSpec`-ийн
       * болзлыг хангадаг ч ЭНД нэмэлт шалгуур бий (жишээ нь даамын
       * эгнээгээр дайрах хориг). Шалгахгүй бол засвар нь ижил алдаатай
       * байрлалыг дахин бичиж мэднэ.
       */
      const fresh = deserializePosition(candidate.fen);
      if (!fresh) continue;
      const freshMove = new Draughts(fresh)
        .legalMoves()
        .find(
          (m) =>
            String(squareNumber(m.from.row, m.from.col)) === candidate.from &&
            String(squareNumber(m.to.row, m.to.col)) === candidate.to
        );
      if (!freshMove || mismatch(spec!, fresh.board, freshMove)) continue;

      task = candidate;
    }

    if (!task || task.type !== "draughts-move") {
      unrepaired.push(`${row.id} — байрлал үүсгэж чадсангүй (${row.prompt})`);
      continue;
    }

    console.log(`  ${row.id}`);
    console.log(`    ${row.prompt}`);
    console.log(`    хуучин: ${row.fen}  ${row.correct_from}-${row.correct_to}  (${problem})`);
    console.log(`    шинэ:   ${task.fen}  ${task.from}-${task.to}`);
    repaired++;

    if (apply) {
      await client.query(
        "update exercises set fen=$2, correct_from=$3, correct_to=$4 where id=$1",
        [row.id, task.fen, task.from, task.to]
      );
    }
  }


  /* --- ОЛОН НҮҮДЭЛТ БОДЛОГУУД (`draughts-puzzle`) --- */
  const puzzles = (
    await client.query<{
      id: string; prompt: string; fen: string | null; solution: string | null; unit: string;
    }>(
      `select e.id, e.prompt, e.fen, e.solution, u.title as unit
         from exercises e
         join lessons l on l.id = e.lesson_id
         join units u on u.id = l.unit_id
        where e.type = 'draughts-puzzle'`
    )
  ).rows;

  let puzzlesHealthy = 0;
  let puzzlesRepaired = 0;

  for (const row of puzzles) {
    if (!isEditableUnit(row.unit)) {
      locked++;
      continue;
    }

    /*
     * ⚠ `parseDraughtsPuzzle` нь «тоглогдох уу» гэдгийг л хэлнэ.
     * `puzzleProblem` нь АГУУЛГЫН шалгууруудыг (тулгуур байгаа эсэх,
     * шийдэл ганц эсэх, тулгуур нь даам болдоггүй эсэх) шалгадаг.
     */
    if (row.fen && row.solution && !puzzleProblem(row.fen, row.solution)) {
      puzzlesHealthy++;
      continue;
    }

    // ⚠ Тусгай үүсгэгчтэй бодлогыг ерөнхий комбинациар СОЛИХГҮЙ.
    if (SPECIAL_PUZZLE_PROMPTS.has(row.prompt)) {
      /*
       * ⚠ ЗӨВ СКРИПТИЙГ НЭРЛЭНЭ. Урьд нь бүх тусгай бодлогод
       * `fix-breakthrough-lesson.ts` гэж бичдэг байсан тул огт өөр
       * хичээлийн алдааг буруу скрипт руу заадаг байв.
       */
      unrepaired.push(`${row.id} — тусгай бодлого эвдэрсэн (засвар: ${scriptFor(row.prompt)})`);
      continue;
    }
    if (!row.fen || !row.solution) {
      unrepaired.push(`${row.id} — FEN эсвэл шугам хоосон`);
      continue;
    }

    /*
     * ⚠ Шугамын УРТААР төрлийг тогтооно: 3 хагас нүүдэл = энгийн тулгуурт
     * идэлт, 5 = урт комбинаци. Даалгаврын текстийг харахаас илүү бат.
     */
    const plies = row.solution.trim().split(/\s+/).filter(Boolean).length;
    const pieces = piecesOf(row.fen);

    /*
     * ⚠ СОЛИЛЦООНЫ хичээл нь ТЭНЦҮҮ солилцоо заадаг (өгсөн = авсан).
     * Даалгаврыг нь харахгүй бол ерөнхий үүсгэгч ашигтай комбинаци
     * гаргаж, «солилцоо хий» гэсэн даалгавартай байрлал нь ашиг өгдөг
     * болж зөрнө. Тиймээс даалгаврын текстээс таньж `exchange` тохируулна.
     */
    const isExchange = /солилцоо/i.test(row.prompt);
    const spec: GenSpec =
      plies >= 5
        ? { type: "combo3", pieces }
        : { type: "combo", pieces, ...(isExchange ? { exchange: true } : {}) };

    /*
     * ⚠ Үүсгэгч санамсаргүй хөлөг тавиад болзол хангаагүйг ХАЯДАГ тул олон
     * удаа оролдоно. НЭГ `rng`-г үргэлжлүүлнэ — дахин эхлүүлбэл ижил хөлөг
     * дахин гарч, мөчлөг үүрд эргэнэ.
     */
    const rng = makeRng(seedFromString(row.id));
    let task: ReturnType<typeof generateTask> = null;
    for (let attempt = 0; attempt < 600000 && !task; attempt += 1) {
      const candidate = generateTask(rng, spec);
      // ⚠ Үүсгэсний ДАРАА дахин шалгана: тоглуулагч яг энэ шалгуурыг хэрэглэнэ.
      if (
        candidate &&
        candidate.type === "draughts-puzzle" &&
        !puzzleProblem(candidate.fen, candidate.solution)
      ) {
        task = candidate;
      }
    }

    if (!task || task.type !== "draughts-puzzle") {
      unrepaired.push(`${row.id} — бодлого үүсгэж чадсангүй (${row.prompt})`);
      continue;
    }

    console.log(`  ${row.id}`);
    console.log(`    ${row.prompt}`);
    console.log(`    хуучин: ${row.fen}  ${row.solution}  (хууль бус)`);
    console.log(`    шинэ:   ${task.fen}  ${task.solution}`);
    puzzlesRepaired++;

    if (apply) {
      await client.query("update exercises set fen=$2, solution=$3 where id=$1", [
        row.id,
        task.fen,
        task.solution,
      ]);
    }
  }

  console.log(
    `\nбодлого ${puzzles.length} — эрүүл ${puzzlesHealthy}, ${apply ? "зассан" : "засагдах"} ${puzzlesRepaired}`
  );
  /* ⚠ Царцсан агуулгыг ЧИМЭЭГҮЙ алгасахгүй — хэдийг хөндөөгүйг хэлнэ. */
  if (locked > 0) {
    console.log(`
⛔ Level 4-өөс өмнөх ${locked} дасгалыг хөндөөгүй (царцсан).`);
  }

  console.log(
    `\nнийт ${rows.length} — эрүүл ${healthy}, ${apply ? "зассан" : "засагдах"} ${repaired}, чадаагүй ${unrepaired.length}`
  );
  for (const line of unrepaired) console.log(`  ✗ ${line}`);

  await client.end();
  return unrepaired.length;
}

/*
 * ⚠ ЗӨВХӨН ШУУД АЖИЛЛУУЛАХАД: аудит нь энэ файлаас `specFor`/`mismatch`-ыг
 * импортолдог (дүрмийг хоёр газар бичвэл нэг нь хоцорно). Импортлоход
 * `main()` дуудагдвал аудит санг зассан ч байж мэднэ.
 */
if (process.argv[1]?.includes("repair-draughts-moves")) {
  main().then((failed) => process.exit(failed ? 1 : 0));
}
