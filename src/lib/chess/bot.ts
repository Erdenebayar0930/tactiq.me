import type { Chess, Color, Move } from "chess.js";

/**
 * Ботын нүүдэл сонгогч — сервер, worker, гадаад хөдөлгүүр (Stockfish гэх мэт)
 * ШААРДЛАГАГҮЙ, бүхэлдээ клиент дээр minimax + материалын үнэлгээгээр
 * ажилладаг. Энэ бол сургалтын платформ — зорилго ХАМГИЙН ХҮЧТЭЙ бот биш,
 * түвшин бүрд ХҮҮХЭД ялах боломжтой, дасгалжуулах зорилготой бот.
 *
 * `theme.ts`-ийн `DIFFICULTY_LABELS`-тай ЯГ ИЖИЛ түлхүүр ашигладаг —
 * хичээлийн "Анхан/Дунд/Ахисан шат" ойлголттой нэг мод.
 */
export type BotDifficulty = "beginner" | "intermediate" | "advanced";

export const BOT_DIFFICULTIES: BotDifficulty[] = ["beginner", "intermediate", "advanced"];

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Нүд бүрийн байрлалын урамшуулал (сентипешкээр, `evaluate`-д /100 хийж
 * пешкийн нэгжид оруулна) — цагаанаас харсан, `chess.board()`-той ижил
 * чиглэлтэй (мөр 0 = 8-р эгнээ). Хараас нь ойлгомжтой: төв нүдийг
 * эзлэх, морийг булангаас гаргах, хаанаа хамгаалалттай байлгах гэх мэт
 * анхан шатны байрлалын мэдлэгийг ботод өгнө — цэвэр материалын тоолол
 * ижил материалтай ч утгагүй нүдрүү явдаг байрлалыг ялгаж чаддаггүй байсан.
 * "Simplified Evaluation Function" (chessprogramming wiki)-ийн стандарт
 * хүснэгтүүд.
 */
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];
const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];
const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];
const ROOK_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];
const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];
/** Дундаж тоглоомын хаан — булан руу нуугдаж, дайсны довтолгооноос зайлсхийхийг урамшуулна. */
const KING_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const PIECE_SQUARE_TABLES: Record<string, number[][]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_TABLE,
};

/** Мад хийхэд оноох оноо — материалын хамгийн их зөрүү (~39)-өөс хавьгүй том тул ямар ч байрлалаас илүү сонгогдоно. */
const MATE_SCORE = 100_000;

/** Minimax-ийн эрэлхийлэх гүн — гүн ихсэх тусам бот хүчтэй, гэхдээ удаан бодно. */
const SEARCH_DEPTH: Record<BotDifficulty, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

/**
 * Хамгийн сайн нүүдлийн оронд ЗАРИМДАА санамсаргүй хууль ёсны нүүдэл
 * сонгох магадлал. "Анхан шат" бот ЗОРИУДААР алдаа гаргадаг байх ёстой —
 * эс бөгөөс шинэхэн сурагч хэзээ ч ялахгүй, урам хугарна.
 */
const RANDOMNESS: Record<BotDifficulty, number> = {
  beginner: 0.55,
  intermediate: 0.15,
  advanced: 0,
};

/**
 * Тухайн байрлалыг цагаан талын ашиг тусаар нь тоолно — эерэг = цагаан давуу.
 * Материал (морь/буудал зэргийн үнэ) + байрлалын урамшуулал (`PIECE_SQUARE_TABLES`)
 * хоёрын нийлбэр. Байрлалын хэсгийг 100-аар хуваадаг тул материалыг хэзээ ч
 * "гүйцэхгүй" — зөвхөн материал тэнцүү үед аль нүд илүү үнэтэйг ялгах жинтэй
 * үлдэнэ.
 */
function evaluate(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const cell = board[rank][file];
      if (!cell) continue;
      const table = PIECE_SQUARE_TABLES[cell.type];
      // Хар талын хувьд хүснэгтийг мөрөөр нь толинд буулгана — хүснэгт
      // цагаанаас (8-р эгнээ дээрээс) харсан тул хараас нь эсрэг тал руугаа эргүүлнэ.
      const positional = (cell.color === "w" ? table[rank][file] : table[7 - rank][file]) / 100;
      const value = PIECE_VALUES[cell.type] + positional;
      score += cell.color === "w" ? value : -value;
    }
  }
  return score;
}

/**
 * Нүүдлүүдийг "ХАМГИЙН ИРЭЭДҮЙТЭЙ" нь эхэнд байхаар эрэмбэлнэ.
 *
 * ⚠ Зөвхөн ХУРД. Үр дүн ӨӨРЧЛӨГДӨХГҮЙ — alpha-beta нь ямар ч дарааллаар
 * ижил оноо буцаадаг. Гэвч сайн нүүдлийг ЭХЭЛЖ үзвэл хайчлалт эрт эхэлж,
 * үзэх мөчрийн тоо олон дахин цөөрдөг.
 *
 * Эрэмбэ: үнэтэй дүрсийг хямд дүрсээр идэх (MVV-LVA-ийн энгийн хувилбар) →
 * бусад идэлт → энгийн нүүдэл. Дүрс болгох (`promotion`) нь мөн өндөр.
 */
function orderMoves(moves: Move[]): Move[] {
  return moves
    .map((move) => {
      let score = 0;
      if (move.captured) {
        score = 10 * PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece];
      }
      if (move.promotion) score += 50;
      return { move, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.move);
}

/**
 * Alpha-beta хайчлалттай minimax. `chess`-ийг ЭНД, ДАРАА нь БУЦААНА
 * (`move`/`undo`) — байрлал бүрийг FEN-ээр хуулбарлахаас хамаагүй хурдан.
 */
function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number {
  // Мад: одоо нүүх ёстой тал (`turn()`) ялагдсан гэсэн үг — материалаар БИШ,
  // шууд MATE_SCORE-оор үнэлнэ, эс бөгөөс жишээ нь дааман бэлдэж буй хатнаа
  // мад хийхийн оронд суулгаж авах шиг "материалаар илүү" боловч алдаатай
  // сонголтыг мад хийхээс дээр гэж бодох эрсдэлтэй. `+ depth` нь үлдсэн
  // гүнийг мад олоход хэрэглэсэн тул хамгийн ХУРДАН мадыг илүүд үзүүлнэ.
  if (chess.isCheckmate()) {
    return (chess.turn() === "w" ? -1 : 1) * (MATE_SCORE + depth);
  }
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);

  const moves = orderMoves(chess.moves({ verbose: true }) as Move[]);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      chess.move(move);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    chess.move(move);
    best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
    chess.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

/**
 * Тухайн байрлалд `chess.turn()` талын ХАМГИЙН САЙН боломжит нүүдэл БА түүний
 * оноо — ЯМАГТ ЦАГААНЫ ХАРААС (`minimax`-тай ижил конвенц: эерэг = цагаан
 * давуу). `analysis.ts` (Robo Coach-ийн тоглолтын шинжилгээ) энэ функцийг
 * тоглогчийн нүүдэл бүрийг "хамгийн сайнтай" харьцуулахад ашиглана — ботын
 * ХҮЧИЙГ өөрчлөхгүй, зөвхөн ижил хайлтыг ДАХИН ашиглана.
 */
export function bestMoveForMover(
  chess: Chess,
  depth: number
): { move: Move | null; score: number } {
  const ranked = rankMoves(chess, depth);
  if (ranked.length === 0) {
    const score = chess.isCheckmate() ? (chess.turn() === "w" ? -MATE_SCORE : MATE_SCORE) : 0;
    return { move: null, score };
  }
  return { move: ranked[0].move, score: ranked[0].score };
}

/**
 * БҮХ хууль ёсны нүүдлийг оноогоор нь эрэмбэлнэ — хамгийн сайнаас муу руу,
 * НҮҮХ ТАЛЫН харцаар.
 *
 * ⚠ `score` нь `minimax`-ийн конвенцоор ЦАГААНЫ ХАРААС (эерэг = цагаан
 * давуу) үлдэнэ — дуудагч талууд аль хэдийн тэр конвенцтой ажилладаг тул
 * энд эргүүлбэл будлиан үүснэ. Эрэмбэ нь харин НҮҮХ ТАЛД тохируулагдсан:
 * `[0]` нь үргэлж тухайн талын хамгийн сайн нүүдэл.
 *
 * `analysis.ts` үүнийг "цорын ганц зөв нүүдэл" (`great`) илрүүлэхэд
 * ашиглана: хамгийн сайн ба ХОЁРДУГААР сайн хоёрын зөрүү том бол тоглогч
 * үнэхээр ганц заммыг олсон гэсэн үг.
 */
export function rankMoves(
  chess: Chess,
  depth: number
): { move: Move; score: number }[] {
  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return [];

  const moverIsWhite = chess.turn() === "w";
  const scored = moves.map((move) => {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !moverIsWhite);
    chess.undo();
    return { move, score };
  });

  scored.sort((a, b) => (moverIsWhite ? b.score - a.score : a.score - b.score));
  return scored;
}

/**
 * ЦЭВЭР материалын зөрүү тухайн талын харцаар (пешкийн нэгжээр).
 *
 * ⚠ Байрлалын урамшуулал ОРООГҮЙ — `evaluate`-ээс ялгаатай. Золиос
 * илрүүлэхэд яг материал л хэрэгтэй: байрлалын жин нэмбэл "сайн нүдэнд
 * зогссон" дүрс золиосыг далдалж, `brilliant` тэмдэг санамсаргүй тарна.
 */
export function netMaterial(chess: Chess, color: Color): number {
  let mine = 0;
  let theirs = 0;
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const value = PIECE_VALUES[cell.type];
      if (cell.color === color) mine += value;
      else theirs += value;
    }
  }
  return mine - theirs;
}

/**
 * Тодорхой нэг нүүдлийг тоглосны дараах оноо — мөн ЦАГААНЫ ХАРААС.
 * `move` нь `chess`-ийн одоогийн байрлалд хууль ёсны байх ёстой.
 */
export function scoreAfterMove(chess: Chess, move: Move, depth: number): number {
  const moverIsWhite = chess.turn() === "w";
  chess.move(move);
  const raw = minimax(chess, depth - 1, -Infinity, Infinity, !moverIsWhite);
  chess.undo();
  return raw;
}

/**
 * Одоогийн (`chess.turn()`) талын өмнөөс хийх нүүдлийг сонгоно.
 *
 * ⚠ `chess` дээр ШУУД `move`/`undo` хийж эрэлхийлдэг тул дуудагдаж
 * дуусахад ЭХНИЙ байрлал хэвээрээ үлдэнэ — дуудагч тал буцаж ирсэн
 * `Move`-ыг ЖИНХЭНЭ хэрэглэхийн тулд өөрөө `chess.move(...)` дуудна.
 */
export function pickBotMove(chess: Chess, difficulty: BotDifficulty): Move | null {
  const moves = chess.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  if (Math.random() < RANDOMNESS[difficulty]) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = SEARCH_DEPTH[difficulty];
  const botIsWhite = chess.turn() === "w";

  let bestMove = moves[0];
  let bestScore = botIsWhite ? -Infinity : Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !botIsWhite);
    chess.undo();

    const better = botIsWhite ? score > bestScore : score < bestScore;
    if (better) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
