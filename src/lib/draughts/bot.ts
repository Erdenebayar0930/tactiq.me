import { Draughts } from "./engine";

import type { Color, DraughtsMove } from "./engine";

/**
 * Дамын ботын нүүдэл сонгогч — `chess/bot.ts`-тэй ЯГ ИЖИЛ бүтэц (minimax +
 * alpha-beta, түвшин тутамд гүн/санамсаргүй байдал өөр) — зөвхөн үнэлгээ,
 * хөдөлгүүрийн API нь дамын дүрэмд тохирсон.
 */
export type DraughtsBotDifficulty = "beginner" | "intermediate" | "advanced";

export const DRAUGHTS_BOT_DIFFICULTIES: DraughtsBotDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const MAN_VALUE = 1;
const KING_VALUE = 3;
const MATE_SCORE = 100_000;

const SEARCH_DEPTH: Record<DraughtsBotDifficulty, number> = {
  beginner: 2,
  intermediate: 3,
  advanced: 4,
};

const RANDOMNESS: Record<DraughtsBotDifficulty, number> = {
  beginner: 0.5,
  intermediate: 0.12,
  advanced: 0,
};

/** Байрлалыг цагаан талын ашиг тусаар нь тоолно — материал + бэрийн ахисан байдлын жижиг урамшуулал. */
function evaluate(game: Draughts): number {
  let score = 0;
  const board = game.board();

  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const cell = board[row][col];
      if (!cell) continue;

      let value = cell.king ? KING_VALUE : MAN_VALUE;
      if (!cell.king) {
        // Хаадаж очих эгнээнд ойртох тусам бага зэрэг илүү үнэтэй — бот
        // зорилгогүй тэнэж бус, урагшлахыг эрмэлзэнэ.
        const advancement = cell.color === "w" ? 9 - row : row;
        value += advancement * 0.03;
      }

      score += cell.color === "w" ? value : -value;
    }
  }

  return score;
}

/**
 * Alpha-beta хайчлалттай minimax. `game`-ийг ЭНД, ДАРАА нь БУЦААНА
 * (`applyMove`/`undo`) — `chess/bot.ts`-тэй ижил шалтгаанаар.
 */
function minimax(
  game: Draughts,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number {
  const moves = game.legalMoves();

  /*
   * ⚠ НҮҮДЭЛГҮЙ БОЛОХ нь ХОЖИЛ БИШ. Урьд нь энд «нүүх ёстой тал
   * ялагдсан» гэж үздэг байсан тул бот өрсөлдөгчөө БООЖ ХААХЫГ хожил
   * гэж тооцож, тэр зорилгоор тоглодог байв. Сайтын дүрмээр нүүдэлгүй
   * болох нь ТЭНЦЭЭ (`engine.ts`-ийн `winner()`), тиймээс дүгнэлтийг
   * хөдөлгүүрээс ШУУД асууна — хоёр газар бичвэл бот өөр дүрмээр
   * тоглоно.
   */
  if (moves.length === 0 || game.isDraw()) {
    const champion = game.winner();
    if (champion === null) return 0;
    return (champion === "w" ? 1 : -1) * (MATE_SCORE + depth);
  }
  if (depth === 0) return evaluate(game);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      game.applyMove(move);
      best = Math.max(best, minimax(game, depth - 1, alpha, beta, false));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const move of moves) {
    game.applyMove(move);
    best = Math.min(best, minimax(game, depth - 1, alpha, beta, true));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

/**
 * Одоогийн (`game.turn()`) талын өмнөөс хийх нүүдлийг сонгоно.
 *
 * ⚠ `game` дээр ШУУД `applyMove`/`undo` хийж эрэлхийлдэг тул дуудагдаж
 * дуусахад ЭХНИЙ байрлал хэвээрээ үлдэнэ.
 */
export function pickBotMove(
  game: Draughts,
  difficulty: DraughtsBotDifficulty
): DraughtsMove | null {
  const moves = game.legalMoves();
  if (moves.length === 0) return null;

  if (Math.random() < RANDOMNESS[difficulty]) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = SEARCH_DEPTH[difficulty];
  const botIsWhite = game.turn() === "w";

  let bestMove = moves[0];
  let bestScore = botIsWhite ? -Infinity : Infinity;

  for (const move of moves) {
    game.applyMove(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !botIsWhite);
    game.undo();

    const better = botIsWhite ? score > bestScore : score < bestScore;
    if (better) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * БҮХ хууль ёсны нүүдлийг оноогоор нь эрэмбэлнэ — хамгийн сайнаас муу руу,
 * НҮҮХ ТАЛЫН харцаар. `chess/bot.ts`-ийн `rankMoves`-ийн даам хувилбар.
 *
 * ⚠ `score` нь ЦАГААНЫ ХАРААС (`minimax`-ийн конвенц) үлдэнэ; зөвхөн ЭРЭМБЭ
 * нь нүүх талд тохируулагдана — `[0]` нь ямагт тухайн талын хамгийн сайн.
 */
export function rankDraughtsMoves(
  game: Draughts,
  depth: number
): { move: DraughtsMove; score: number }[] {
  const moves = game.legalMoves();
  if (moves.length === 0) return [];

  const moverIsWhite = game.turn() === "w";
  const scored = moves.map((move) => {
    game.applyMove(move);
    const score = minimax(game, depth - 1, -Infinity, Infinity, !moverIsWhite);
    game.undo();
    return { move, score };
  });

  scored.sort((a, b) => (moverIsWhite ? b.score - a.score : a.score - b.score));
  return scored;
}

/** Тодорхой нэг нүүдлийг тоглосны дараах оноо — мөн ЦАГААНЫ ХАРААС. */
export function scoreAfterDraughtsMove(
  game: Draughts,
  move: DraughtsMove,
  depth: number
): number {
  const moverIsWhite = game.turn() === "w";
  game.applyMove(move);
  const score = minimax(game, depth - 1, -Infinity, Infinity, !moverIsWhite);
  game.undo();
  return score;
}

/**
 * ЦЭВЭР материалын зөрүү тухайн талын харцаар (энгийн дүрс = 1, даам = 3).
 *
 * ⚠ `evaluate`-ийн урагшлалтын урамшуулал ОРООГҮЙ — золиос илрүүлэхэд яг
 * материал л хэрэгтэй. Урамшуулал нэмбэл сайн байрлалд гарсан дүрс золиосыг
 * далдалж, "Гайхалтай" тэмдэг санамсаргүй тарна.
 */
export function netDraughtsMaterial(game: Draughts, color: Color): number {
  let mine = 0;
  let theirs = 0;

  for (const row of game.board()) {
    for (const cell of row) {
      if (!cell) continue;
      const value = cell.king ? KING_VALUE : MAN_VALUE;
      if (cell.color === color) mine += value;
      else theirs += value;
    }
  }

  return mine - theirs;
}
