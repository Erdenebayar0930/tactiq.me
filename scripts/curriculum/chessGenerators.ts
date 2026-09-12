/**
 * ШАТРЫН БАЙРЛАЛ ҮҮСГЭГЧИД — хөтөлбөрийн хөлөг дээрх дасгалын дийлэнх.
 *
 * Үүсгэгч бүр САНАМСАРГҮЙ (гэхдээ тогтвортой үртэй) НЭГ нэр дэвшигч
 * гаргана. Seeder нь `validateTask`-аар шалгаж, тэнцсэнийг л авна — тэнцээгүй
 * бол дахин оролдоно. Тиймээс энд «ЗӨВ байрлал бүтээх» гэж хичээхгүй,
 * харин «ТЭНЦЭХ МАГАДЛАЛ ӨНДӨРТЭЙ» байрлал бүтээнэ (жишээ нь сэрээний
 * нүдийг геометрээр олж, морийг түүний хажууд тавина).
 *
 * ⚠ ГАНЦ ШИЙДЭЛ: даалгаврын бичвэр («d5 рүү нүү», «шат өг», «мад хий»)
 * зөвшөөрөх нүүдэл ЯГ НЭГ байхыг шалгагч баталгаажуулна
 * (`chessShared.ts` → `validateBoardTask`, `auditMateLine`, `auditWinLine`).
 */
import { Chess } from "chess.js";

import {
  buildMateLine,
  buildWinLine,
  distinctMoves,
  fileOf,
  loadPosition,
  onBoard,
  pick,
  randInt,
  rankOf,
  sq,
  toFen,
  type Bi,
  type Generator,
  type Placement,
  type Rng,
  type Task,
} from "./chessShared";

import type { Move, PieceSymbol, Square } from "chess.js";

// --- Нэр, бичвэр ------------------------------------------------------------

/** «Өөрийн X-ээ» — даалгаврын бичвэрт. */
const YOUR: Record<PieceSymbol, Bi> = {
  k: ["Ноёноо", "your king"],
  q: ["Бэрсээ", "your queen"],
  r: ["Тэргээ", "your rook"],
  b: ["Тэмээгээ", "your bishop"],
  n: ["Морио", "your knight"],
  p: ["Хүүгээ", "your pawn"],
};

/** «Хар X-ийг» — идэх даалгаварт. */
const BLACK_ACC: Record<PieceSymbol, Bi> = {
  k: ["хар ноёныг", "the black king"],
  q: ["хар бэрсийг", "the black queen"],
  r: ["хар тэргийг", "the black rook"],
  b: ["хар тэмээг", "the black bishop"],
  n: ["хар морийг", "the black knight"],
  p: ["хар хүүг", "the black pawn"],
};

export const MOVE_RULE: Record<PieceSymbol, Bi> = {
  k: ["Ноён аль ч чиглэлд ЗӨВХӨН НЭГ нүд нүүнэ.", "The king moves ONE square in any direction."],
  q: [
    "Бэрс шулуун ба ташуу, аль ч чиглэлд хэдэн ч нүд явна — тэрэг, тэмээ хоёрын нийлбэр.",
    "The queen moves any distance straight or diagonally — a rook and a bishop combined.",
  ],
  r: [
    "Тэрэг шулуун — босоо ба хэвтээ шугамаар хэдэн ч нүд явна, дүрсний дээгүүр үсрэхгүй.",
    "The rook moves straight — along files and ranks, any distance, but never jumps.",
  ],
  b: [
    "Тэмээ зөвхөн ташуу явна, тиймээс ямагт НЭГ өнгийн нүдэн дээр үлдэнэ.",
    "The bishop moves only diagonally, so it always stays on squares of ONE colour.",
  ],
  n: [
    "Морь «Г» үсэг хэлбэрээр: хоёр нүд шулуун, нэг нүд хажуу тийш. Дүрсний дээгүүр ҮСРЭЖ чадна.",
    "The knight moves in an L: two squares straight, one sideways. It can JUMP over pieces.",
  ],
  p: [
    "Хүү урагш нэг нүд нүүнэ, эхний нүүдэлдээ хоёр нүд нүүж болно.",
    "A pawn moves forward one square, or two squares on its very first move.",
  ],
};

const fill = (text: Bi, values: Record<string, string>): Bi =>
  text.map((part) => part.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "")) as Bi;

// --- Байрлал угсрах туслахууд ---------------------------------------------

type SquareFilter = (file: number, rank: number) => boolean;

const pawnOk: SquareFilter = (_, rank) => rank >= 1 && rank <= 6;

function put(rng: Rng, placement: Placement, piece: string, filter?: SquareFilter): string | null {
  for (let attempt = 0; attempt < 60; attempt++) {
    const file = randInt(rng, 0, 7);
    const rank = randInt(rng, 0, 7);
    const square = sq(file, rank);
    if (placement.has(square)) continue;
    if (piece.toLowerCase() === "p" && !pawnOk(file, rank)) continue;
    if (filter && !filter(file, rank)) continue;
    placement.set(square, piece);
    return square;
  }
  return null;
}

const dist = (a: string, b: string) =>
  Math.max(Math.abs(fileOf(a) - fileOf(b)), Math.abs(rankOf(a) - rankOf(b)));

/** Хоёр ноёныг тавина (хөрш биш). */
function putKings(
  rng: Rng,
  placement: Placement,
  white?: SquareFilter,
  black?: SquareFilter
): { wk: string; bk: string } | null {
  const bk = put(rng, placement, "k", black);
  if (!bk) return null;
  const wk = put(rng, placement, "K", (f, r) => dist(sq(f, r), bk) >= 2 && (!white || white(f, r)));
  if (!wk) return null;
  return { wk, bk };
}

const PIECE_POOL: PieceSymbol[] = ["q", "r", "r", "b", "b", "n", "n", "p", "p", "p"];

// --- Level 1–2: хөдөлгөөн, координат ---------------------------------------

/**
 * «X дүрсээ Y нүд рүү нүү» — зөвхөн тэр төрлийн ГАНЦ дүрс тэр нүдэнд хүрнэ.
 *
 * ⚠ Идэлтгүй нүүдлийг л сонгоно: хүүхэд «нүү» гэхэд дайсны дүрс идэх нь
 * дараагийн хичээлийн сэдэв.
 */
export function reachTask(
  piece: PieceSymbol,
  options: {
    ownBlockers?: number;
    enemies?: number;
    pawnDouble?: boolean;
    prompt?: Bi;
    explain?: Bi;
    minDistance?: number;
  } = {}
): Generator {
  return (rng) => {
    const placement: Placement = new Map();
    let from: string | null;
    if (piece === "k") {
      const kings = putKings(rng, placement);
      if (!kings) return null;
      from = kings.wk;
    } else {
      if (!putKings(rng, placement)) return null;
      from = put(
        rng,
        placement,
        piece.toUpperCase(),
        piece === "p" ? (_, r) => (options.pawnDouble ? r === 1 : r >= 1 && r <= 4) : undefined
      );
    }
    if (!from) return null;

    for (let i = 0; i < (options.ownBlockers ?? 0); i++) put(rng, placement, pick(rng, ["P", "P", "N", "B"]));
    for (let i = 0; i < (options.enemies ?? 0); i++) put(rng, placement, pick(rng, ["p", "n", "b"]));

    const chess = loadPosition(toFen(placement));
    if (!chess) return null;
    const candidates = (chess.moves({ square: from as Square, verbose: true }) as Move[]).filter(
      (m) =>
        !m.captured &&
        !m.promotion &&
        dist(m.from, m.to) >= (options.minDistance ?? 1) &&
        (!options.pawnDouble || m.flags.includes("b"))
    );
    if (candidates.length === 0) return null;
    const move = pick(rng, candidates);

    return {
      type: "board-move",
      fen: chess.fen(),
      from: move.from,
      to: move.to,
      goal: { kind: "reach", piece },
      prompt: fill(options.prompt ?? ["{your} {to} нүд рүү нүү.", "Move {youren} to {to}."], {
        your: YOUR[piece][0],
        youren: YOUR[piece][1],
        to: move.to,
      }),
      explain: options.explain ?? MOVE_RULE[piece],
    };
  };
}

/** Хүүгээ бэрс болго (заримдаа идэж байж). */
export function promoteTask(withCapture: boolean): Generator {
  return (rng) => {
    const placement: Placement = new Map();
    const file = randInt(rng, 0, 7);
    const from = sq(file, 6);
    placement.set(from, "P");
    let to = sq(file, 7);
    if (withCapture) {
      const side = file === 0 ? 1 : file === 7 ? -1 : pick(rng, [-1, 1]);
      to = sq(file + side, 7);
      placement.set(sq(file, 7), pick(rng, ["r", "b", "n"]));
      placement.set(to, pick(rng, ["q", "r", "b", "n"]));
    }
    if (!putKings(rng, placement, (_, r) => r <= 4, (_, r) => r >= 3 && r <= 5)) return null;

    const chess = loadPosition(toFen(placement));
    if (!chess) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from,
      to,
      goal: { kind: "promote" },
      prompt: withCapture
        ? ["Хүүгээ бэрс болго — шууд урагш хаалттай байна!", "Promote your pawn — the way straight ahead is blocked!"]
        : ["Хүүгээ сүүлийн эгнээнд хүргэж бэрс болго.", "Push your pawn to the last rank and make a queen."],
      explain: withCapture
        ? [
            "Хүү ташуу ИДЭЖ байж ч сүүлийн эгнээнд хүрч болно — хүрмэгц бэрс болно.",
            "A pawn can also reach the last rank by CAPTURING diagonally — and it still promotes.",
          ]
        : [
            "Сүүлийн эгнээнд хүрсэн хүү бэрс (эсвэл тэрэг, тэмээ, морь) болно. Ихэвчлэн бэрсийг сонгоно.",
            "A pawn reaching the last rank becomes a queen (or rook, bishop, knight). Usually you pick the queen.",
          ],
    };
  };
}

/** En passant — хар хүү дөнгөж хоёр нүд нүүсэн. */
export function enPassantTask(): Generator {
  return (rng) => {
    const placement: Placement = new Map();
    const file = randInt(rng, 0, 7);
    const side = file === 0 ? 1 : file === 7 ? -1 : pick(rng, [-1, 1]);
    const blackFile = file + side;
    placement.set(sq(file, 4), "P");
    placement.set(sq(blackFile, 4), "p");
    const blocked = (f: number, r: number) => !(f === blackFile && (r === 5 || r === 6));
    if (!putKings(rng, placement, (f, r) => blocked(f, r) && r <= 3, (f, r) => blocked(f, r) && r >= 5))
      return null;
    // Шууд урагш нүүдлийг ч хааж болно — тэгвэл ганц сонголт илүү тод болно.
    if (rng() < 0.5) placement.set(sq(file, 5), pick(rng, ["n", "b"]));
    for (let i = 0; i < randInt(rng, 0, 2); i++) put(rng, placement, "P", (f, r) => blocked(f, r) && r <= 3);

    const ep = sq(blackFile, 5);
    const chess = loadPosition(toFen(placement, { ep }));
    if (!chess) return null;
    return {
      type: "board-move",
      fen: toFen(placement, { ep }),
      from: sq(file, 4),
      to: ep,
      goal: { kind: "enPassant" },
      prompt: [
        "Хар хүү дөнгөж ХОЁР нүд нүүлээ. En passant-аар идээрэй.",
        "The black pawn just moved TWO squares. Capture it en passant.",
      ],
      explain: [
        "Хар хүү хоёр нүд нүүж таны хүүгийн хажууд зогсвол, яг ДАРААГИЙН нүүдэлд түүний алгассан нүд рүү ташуу нүүж идэж болно.",
        "When an enemy pawn jumps two squares and lands beside your pawn, on the VERY NEXT move you may take it by moving diagonally to the square it skipped.",
      ],
    };
  };
}

// --- Level 3: идэлт ---------------------------------------------------------

/** Нүд бүр цагаан талд дайрагдаж байгаа эсэх (хоосон нүд). */
function attackedEmpty(chess: Chess, color: "w" | "b"): string[] {
  const squares: string[] = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      const s = sq(f, r);
      if (!chess.get(s) && chess.isAttacked(s, color)) squares.push(s);
    }
  }
  return squares;
}

/** «Хар X-ийг ид» — тэр төрлийн ганц идэлт. */
export function captureTypeTask(attackers: PieceSymbol[], target: PieceSymbol, extraBlacks = 1): Generator {
  return (rng) => {
    const placement: Placement = new Map();
    if (!putKings(rng, placement)) return null;
    for (const attacker of attackers) if (!put(rng, placement, attacker.toUpperCase())) return null;

    const probe = loadPosition(toFen(placement));
    if (!probe) return null;
    const targets = attackedEmpty(probe, "w").filter((s) => target !== "p" || pawnOk(fileOf(s), rankOf(s)));
    if (targets.length === 0) return null;
    placement.set(pick(rng, targets), target);
    for (let i = 0; i < extraBlacks; i++) {
      put(rng, placement, pick(rng, ["p", "n", "b", "r"].filter((p) => p !== target)));
    }

    const chess = loadPosition(toFen(placement));
    if (!chess) return null;
    const move = distinctMoves(chess).find((m) => m.captured === target);
    if (!move) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: move.from,
      to: move.to,
      goal: { kind: "captureType", piece: target },
      prompt: fill(["{t} ид.", "Capture {te}."], {
        t: BLACK_ACC[target][0][0].toUpperCase() + BLACK_ACC[target][0].slice(1),
        te: BLACK_ACC[target][1],
      }),
      explain: [
        "Дүрс нь нүүдэг замаараа л иднэ: дайсны дүрс байгаа нүд рүү нүүгээд түүнийг хөлгөөс авна. (Хүү л онцгой — ташуу иднэ.)",
        "Pieces capture the way they move: move onto the enemy piece's square and remove it. (Only the pawn is special — it captures diagonally.)",
      ],
    };
  };
}

/**
 * «Хариу идэгдэхгүй дүрсийг ид» — хэд хэдэн идэлт бий, аюулгүй нь ГАНЦ.
 *
 * ⚠ Эхлэгч хүүхдийн хамгийн түгээмэл алдаа нь «хамгаалагдсан дүрсийг
 * бэрсээрээ идэх». Энэ даалгавар яг тэр зуршлыг засна.
 */
export function safeCaptureTask(whites: number, blacks: number, minCaptures = 2): Generator {
  return (rng) => {
    const placement: Placement = new Map();
    if (!putKings(rng, placement)) return null;
    for (let i = 0; i < whites; i++) put(rng, placement, pick(rng, PIECE_POOL).toUpperCase());

    const probe = loadPosition(toFen(placement));
    if (!probe) return null;
    const targets = attackedEmpty(probe, "w");
    for (let i = 0; i < blacks; i++) {
      const piece = pick(rng, PIECE_POOL);
      const choices = targets.filter((s) => !placement.has(s) && (piece !== "p" || pawnOk(fileOf(s), rankOf(s))));
      if (i < 2 && choices.length > 0) placement.set(pick(rng, choices), piece);
      else put(rng, placement, piece);
    }

    const chess = loadPosition(toFen(placement));
    if (!chess || chess.inCheck()) return null;
    const moves = distinctMoves(chess);
    if (moves.filter((m) => m.captured).length < minCaptures) return null;
    const safe = moves.filter((m) => {
      if (!m.captured) return false;
      chess.move(m);
      const recapture = (chess.moves({ verbose: true }) as Move[]).some((reply) => reply.to === m.to);
      chess.undo();
      return !recapture;
    });
    if (safe.length !== 1) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: safe[0].from,
      to: safe[0].to,
      goal: { kind: "safeCapture" },
      prompt: [
        "Хэд хэдэн идэлт бий. ХАМГААЛАЛТГҮЙ дүрсийг ид — хариу идэгдэхгүй!",
        "There are several captures. Take the UNPROTECTED piece — the one you won't lose back!",
      ],
      explain: [
        "Идэхийн өмнө «энэ дүрсийг хэн хамгаалж байна?» гэж асуу. Хамгаалагдсан дүрсийг идвэл өөрийн дүрсээ алдана.",
        "Before capturing, ask: who protects that piece? Taking a protected piece usually loses your own piece back.",
      ],
    };
  };
}

// --- Level 4: шат -----------------------------------------------------------

export function giveCheckTask(pieces: PieceSymbol[], blackExtras = 1): Generator {
  return (rng) => {
    const placement: Placement = new Map();
    if (!putKings(rng, placement)) return null;
    for (const piece of pieces) if (!put(rng, placement, piece.toUpperCase())) return null;
    for (let i = 0; i < blackExtras; i++) put(rng, placement, pick(rng, ["p", "p", "n", "b"]));

    const chess = loadPosition(toFen(placement));
    if (!chess || chess.inCheck()) return null;
    const checks = distinctMoves(chess).filter((m) => m.san.includes("+"));
    if (checks.length !== 1) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: checks[0].from,
      to: checks[0].to,
      goal: { kind: "check" },
      prompt: ["Хар ноёнд ШАТ өг. Ганц л ийм нүүдэл бий!", "Give CHECK to the black king. There is only one way!"],
      explain: [
        "Шат гэдэг нь ноёныг дайрах. Аль дүрс ямар нүднээс ноёныг «харж» чадахыг бод.",
        "Check means attacking the king. Think about which piece could 'see' the king from which square.",
      ],
    };
  };
}

/** Хар дүрс цагаан ноёнд шат өгч буй байрлал бэлдэнэ. */
function checkedPosition(
  rng: Rng,
  whitePieces: string[],
  checker: PieceSymbol,
  blackExtras: number,
  kingFilter?: SquareFilter
): Chess | null {
  const placement: Placement = new Map();
  if (!putKings(rng, placement, kingFilter)) return null;
  for (const piece of whitePieces) put(rng, placement, piece);
  if (!put(rng, placement, checker)) return null;
  for (let i = 0; i < blackExtras; i++) put(rng, placement, pick(rng, ["r", "b", "n", "p"]));
  const chess = loadPosition(toFen(placement));
  if (!chess || !chess.inCheck()) return null;
  return chess;
}

export function kingEscapeTask(): Generator {
  return (rng) => {
    const chess = checkedPosition(
      rng,
      rng() < 0.5 ? [] : ["P"],
      pick(rng, ["r", "q", "b", "n"]),
      randInt(rng, 0, 2),
      (f, r) => f === 0 || f === 7 || r === 0 || r === 7 || rng() < 0.3
    );
    if (!chess) return null;
    const escapes = distinctMoves(chess).filter((m) => m.piece === "k");
    if (escapes.length !== 1) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: escapes[0].from,
      to: escapes[0].to,
      goal: { kind: "kingEscape" },
      prompt: [
        "Цагаан ноён шатанд байна! НОЁНОО аюулгүй нүд рүү нүү.",
        "The white king is in check! Move YOUR KING to a safe square.",
      ],
      explain: [
        "Ноён дайрагдсан нүд рүү ОРЖ болохгүй. Нүд бүрийг «хар дүрс энд хүрч чадах уу?» гэж шалга.",
        "The king may never step onto an attacked square. Check each square: can a black piece reach it?",
      ],
    };
  };
}

export function blockTask(): Generator {
  return (rng) => {
    const chess = checkedPosition(rng, [pick(rng, ["R", "B", "N", "Q"]), pick(rng, ["P", "N", "B"])], pick(rng, ["r", "q", "b"]), randInt(rng, 0, 1));
    if (!chess) return null;
    const moves = distinctMoves(chess);
    const checkers = chess.attackers(findKing(chess), "b");
    if (checkers.length !== 1) return null;
    if (moves.some((m) => m.to === checkers[0])) return null; // идэж болохгүй — ХААХ хичээл
    const blocks = moves.filter((m) => m.piece !== "k" && !m.captured);
    if (blocks.length !== 1) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: blocks[0].from,
      to: blocks[0].to,
      goal: { kind: "block" },
      prompt: [
        "Шат! Ноёноо биш, ДҮРСЭЭ хаалт болгон тавьж шатыг хаа.",
        "Check! Don't move the king — BLOCK the check with a piece.",
      ],
      explain: [
        "Холоос шатлаж буй тэрэг, тэмээ, бэрсийн замын ДУНД дүрсээ тавибал шат хаагдана.",
        "A check from a rook, bishop or queen far away can be blocked by putting a piece in between.",
      ],
    };
  };
}

function findKing(chess: Chess): Square {
  for (const row of chess.board()) for (const cell of row) if (cell?.type === "k" && cell.color === "w") return cell.square;
  throw new Error("ноён алга");
}

export function captureCheckerTask(): Generator {
  return (rng) => {
    const chess = checkedPosition(rng, [pick(rng, ["R", "B", "N", "Q", "P"]), pick(rng, ["P", "N", "B", "R"])], pick(rng, ["r", "q", "b", "n"]), randInt(rng, 0, 1));
    if (!chess) return null;
    const checkers = chess.attackers(findKing(chess), "b");
    if (checkers.length !== 1) return null;
    const takes = distinctMoves(chess).filter((m) => m.to === checkers[0]);
    if (takes.length !== 1) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: takes[0].from,
      to: takes[0].to,
      goal: { kind: "captureChecker" },
      prompt: ["Шат! Шат өгч буй хар дүрсийг ИД.", "Check! CAPTURE the piece that is giving check."],
      explain: [
        "Шатнаас гарах гурван арга: ноёноо нүүлгэх, шатыг хаах, эсвэл шатлагч дүрсийг идэх. Идэж чадвал ихэвчлэн хамгийн сайн.",
        "Three ways out of check: move the king, block, or capture the checking piece. Capturing is often the best.",
      ],
    };
  };
}

// --- Level 5: рокировка -----------------------------------------------------

export function castleTask(mode: "one" | "choose"): Generator {
  return (rng) => {
    const placement: Placement = new Map([["e1", "K"]]);
    const sides = mode === "one" ? [pick(rng, ["h1", "a1"])] : ["h1", "a1"];
    for (const s of sides) placement.set(s, "R");
    const castling =(sides.includes("h1") ? "K" : "") + (sides.includes("a1") ? "Q" : "");

    for (const s of ["f2", "g2", "h2", "a2", "b2", "c2"]) if (rng() < 0.6) placement.set(s, "P");
    if (!put(rng, placement, "k", (_, r) => r >= 5)) return null;

    // Хар довтлогч — рокировкыг хааж магадгүй.
    const attackers = mode === "choose" ? 1 : randInt(rng, 0, 1);
    for (let i = 0; i < attackers; i++) put(rng, placement, pick(rng, ["b", "r", "n", "q"]), (_, r) => r >= 2);
    // Заримдаа замд цагаан дүрс.
    if (mode === "choose" && rng() < 0.4) {
      placement.set(pick(rng, ["b1", "c1", "d1", "f1", "g1"]), pick(rng, ["N", "B"]));
    }
    const fen = toFen(placement, { castling });
    const chess = loadPosition(fen);
    if (!chess || chess.inCheck()) return null;
    const castles = distinctMoves(chess).filter((m) => m.flags.includes("k") || m.flags.includes("q"));
    if (castles.length !== 1) return null;
    const move = castles[0];
    const kingside = move.flags.includes("k");
    return {
      type: "board-move",
      fen: chess.fen(),
      from: move.from,
      to: move.to,
      goal: { kind: "castle" },
      prompt:
        mode === "one"
          ? ["Рокировка хий: ноёноо тэрэг тийш ХОЁР нүд нүү.", "Castle: move your king TWO squares towards the rook."]
          : [
              "Рокировка хий — гэхдээ зөвхөн НЭГ талд боломжтой. Аль нь вэ?",
              "Castle — but it is allowed on only ONE side. Which one?",
            ],
      explain: kingside
        ? [
            "Богино рокировка: ноён e1→g1, тэрэг h1→f1. Ноён шатанд байж, шатлагдсан нүдийг дамжиж, замд дүрс байж болохгүй.",
            "Short castling: king e1→g1, rook h1→f1. Not allowed out of, through or into check, or with pieces in the way.",
          ]
        : [
            "Урт рокировка: ноён e1→c1, тэрэг a1→d1. Ноён шатанд байж, шатлагдсан нүдийг дамжиж, замд дүрс байж болохгүй.",
            "Long castling: king e1→c1, rook a1→d1. Not allowed out of, through or into check, or with pieces in the way.",
          ],
    };
  };
}

// --- Мад -----------------------------------------------------------------

const edge: SquareFilter = (f, r) => f === 0 || f === 7 || r === 0 || r === 7;
const topEdge: SquareFilter = (_, r) => r === 7;

type MateSpec = {
  whites: string[];
  blacks?: string[];
  blackKing?: SquareFilter;
  /** Цагаан ноёныг хар ноёнд ойртуулах (хамгийн их зай). */
  kingNear?: number;
  /** Хар ноёны өмнө хүүгийн хана. */
  shield?: boolean;
};

function matePosition(rng: Rng, spec: MateSpec): string | null {
  const placement: Placement = new Map();
  const bk = put(rng, placement, "k", spec.blackKing);
  if (!bk) return null;

  if (spec.shield) {
    const f = fileOf(bk);
    for (const df of [-1, 0, 1]) {
      if (!onBoard(f + df, 6)) continue;
      if (rng() < 0.15) continue;
      placement.set(sq(f + df, rng() < 0.15 ? 5 : 6), "p");
    }
  }

  const wk = put(
    rng,
    placement,
    "K",
    (f, r) => dist(sq(f, r), bk) >= 2 && (!spec.kingNear || dist(sq(f, r), bk) <= spec.kingNear)
  );
  if (!wk) return null;
  for (const piece of spec.whites) if (!put(rng, placement, piece)) return null;
  for (const piece of spec.blacks ?? []) put(rng, placement, piece);

  const chess = loadPosition(toFen(placement));
  if (!chess || chess.inCheck()) return null;
  return chess.fen();
}

export function mateTask(
  spec: MateSpec,
  depth: 1 | 2,
  text: { prompt?: Bi; explain: Bi; requireStalemateTrap?: boolean }
): Generator {
  return (rng) => {
    const fen = matePosition(rng, spec);
    if (!fen) return null;
    if (text.requireStalemateTrap && !hasStalemateMove(fen)) return null;
    const solution = buildMateLine(fen, depth);
    if (!solution) return null;
    return {
      type: "chess-puzzle",
      fen,
      solution,
      goal: { kind: "mate" },
      prompt:
        text.prompt ??
        (depth === 1
          ? ["Цагаанаар тоглож байна. Нэг нүүдлээр МАД хий.", "White to play. Checkmate in ONE move."]
          : [
              "Цагаанаар тоглож байна. ХОЁР нүүдлээр мад хий — хар тал хариу нүүнэ.",
              "White to play. Checkmate in TWO moves — Black will reply in between.",
            ]),
      explain: text.explain,
    };
  };
}

function hasStalemateMove(fen: string): boolean {
  const chess = new Chess(fen);
  return distinctMoves(chess).some((m) => {
    chess.move(m);
    const stalemate = chess.isStalemate();
    chess.undo();
    return stalemate;
  });
}

export const MATE_SPECS = {
  backRankRook: { whites: ["R"], blackKing: topEdge, shield: true, blacks: [] } as MateSpec,
  backRankQueen: { whites: ["Q", "P"], blackKing: topEdge, shield: true } as MateSpec,
  backRankDefended: { whites: ["R", "R"], blackKing: topEdge, shield: true, blacks: ["r"] } as MateSpec,
  queenKing: { whites: ["Q"], blackKing: edge, kingNear: 3 } as MateSpec,
  rookKing: { whites: ["R"], blackKing: edge, kingNear: 2 } as MateSpec,
  twoRooks: { whites: ["R", "R"], blackKing: edge } as MateSpec,
  queenRook: { whites: ["Q", "R"], blackKing: edge, blacks: ["p", "p"] } as MateSpec,
  minors: { whites: ["N", "B", "P"], blackKing: edge, kingNear: 3, blacks: ["p", "p"] } as MateSpec,
  knightQueen: { whites: ["Q", "N"], blackKing: edge, blacks: ["p", "r"] } as MateSpec,
  mixed: { whites: ["Q", "B", "P", "P"], blackKing: edge, blacks: ["p", "p", "n"] } as MateSpec,
};

// --- Level 7: тактик (материал хожих) --------------------------------------

function winTask(
  build: (rng: Rng) => string | null,
  min: number,
  prompt: Bi,
  explain: Bi
): Generator {
  return (rng) => {
    const fen = build(rng);
    if (!fen) return null;
    const solution = buildWinLine(fen, min);
    if (!solution) return null;
    return { type: "chess-puzzle", fen, solution, goal: { kind: "win", min }, prompt, explain };
  };
}

const KNIGHT_JUMPS = [
  [1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2],
];

const jumps = (square: string) =>
  KNIGHT_JUMPS.map(([df, dr]) => [fileOf(square) + df, rankOf(square) + dr])
    .filter(([f, r]) => onBoard(f, r))
    .map(([f, r]) => sq(f, r));

export function knightForkTask(target: "r" | "q"): Generator {
  return winTask(
    (rng) => {
      const placement: Placement = new Map();
      const bk = put(rng, placement, "k");
      if (!bk) return null;
      const forkSquare = pick(rng, jumps(bk));
      const targetSquare = pick(rng, jumps(forkSquare).filter((s) => s !== bk));
      if (!targetSquare || placement.has(targetSquare)) return null;
      placement.set(targetSquare, target);
      const start = pick(rng, jumps(forkSquare).filter((s) => !placement.has(s)));
      if (!start) return null;
      placement.set(start, "N");
      if (!put(rng, placement, "K", (f, r) => dist(sq(f, r), bk) >= 2 && sq(f, r) !== forkSquare)) return null;
      for (let i = 0; i < randInt(rng, 0, 2); i++) put(rng, placement, pick(rng, ["P", "p"]), (f, r) => sq(f, r) !== forkSquare);
      const chess = loadPosition(toFen(placement));
      return chess && !chess.inCheck() ? chess.fen() : null;
    },
    target === "q" ? 6 : 4,
    [
      "Мориор СЭРЭЭ хий: ноён ба өөр дүрсийг НЭГ ЗЭРЭГ дайраад, дараа нь ид.",
      "Use your knight for a FORK: attack the king and another piece AT ONCE, then capture.",
    ],
    [
      "Сэрээ — нэг дүрс хоёр зүйлийг зэрэг дайрна. Ноён шатнаас гарах ёстой тул нөгөө дүрс хамгаалалтгүй үлдэнэ.",
      "A fork attacks two things at once. The king must get out of check, so the other piece is left undefended.",
    ]
  );
}

export function queenForkTask(): Generator {
  return winTask(
    (rng) => {
      const placement: Placement = new Map();
      if (!putKings(rng, placement)) return null;
      if (!put(rng, placement, "Q")) return null;
      put(rng, placement, pick(rng, ["r", "n", "b"]));
      put(rng, placement, pick(rng, ["p", "p", "n"]));
      if (rng() < 0.5) put(rng, placement, "P");
      const chess = loadPosition(toFen(placement));
      return chess && !chess.inCheck() ? chess.fen() : null;
    },
    3,
    [
      "Бэрсээрээ СЭРЭЭ хий: шат өгөөд хамгаалалтгүй дүрсийг зэрэг дайр.",
      "FORK with your queen: give check and attack an undefended piece at the same time.",
    ],
    [
      "Бэрс найман чиглэлд дайрдаг тул сэрээнд маш сайн. Хамгаалалтгүй дүрс + ноён = олз.",
      "The queen attacks in eight directions, which makes her a great forker. Undefended piece + king = prize.",
    ]
  );
}

export function pawnForkTask(): Generator {
  return winTask(
    (rng) => {
      const placement: Placement = new Map();
      const file = randInt(rng, 1, 6);
      const rank = randInt(rng, 2, 4);
      placement.set(sq(file, rank), "P");
      placement.set(sq(file - 1, rank + 2), pick(rng, ["n", "b", "r"]));
      placement.set(sq(file + 1, rank + 2), pick(rng, ["n", "r", "q"]));
      if (!putKings(rng, placement, (f, r) => r <= 3, (f, r) => r >= 5 && !(f === file && r === rank + 1))) return null;
      if (rng() < 0.5) put(rng, placement, "p", (f, r) => r >= 4 && !(f === file && r === rank + 1));
      const chess = loadPosition(toFen(placement));
      return chess && !chess.inCheck() ? chess.fen() : null;
    },
    2,
    [
      "Хүүгээр СЭРЭЭ хий: нэг нүүдлээр хоёр дүрсийг дайраад, дараа нь нэгийг нь ид.",
      "Make a PAWN FORK: attack two pieces with one push, then take one of them.",
    ],
    [
      "Хамгийн хямд дүрс хоёр үнэтэй дүрсийг зэрэг дайрвал нэгийг нь заавал алдана.",
      "When the cheapest piece attacks two valuable ones, one of them must fall.",
    ]
  );
}

type Dir = [number, number];
const ORTHO: Dir[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAG: Dir[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

/**
 * Хар ноён ба үнэтэй дүрсийг НЭГ шугамд тавьж, цагаан шугаман дүрсийг
 * тэр шугам руу нүүж чадах байдлаар байрлуулна (рентген / хүлээс).
 *
 * ⚠ `kingFirst` = рентген (skewer): ноён шатлагч талд ойр. Эс бөгөөс
 * хүлээс (pin): үнэтэй дүрс нь ноён ба довтлогчийн дунд.
 */
function lineTactic(kingFirst: boolean) {
  return (rng: Rng): string | null => {
    const slider = pick(rng, ["R", "B", "Q"]);
    const dirs = slider === "R" ? ORTHO : slider === "B" ? DIAG : [...ORTHO, ...DIAG];
    const [df, dr] = pick(rng, dirs);
    const placement: Placement = new Map();
    const k0 = [randInt(rng, 0, 7), randInt(rng, 0, 7)];
    // Шугамын дагуу: [эхний дүрс] -> [хоёр дахь дүрс] -> [цагаан довтлогчийн буух нүд]
    const gap1 = randInt(rng, 1, 2);
    const gap2 = randInt(rng, 1, 3);
    const a = k0;
    const b = [a[0] + df * gap1, a[1] + dr * gap1];
    const c = [b[0] + df * gap2, b[1] + dr * gap2];
    if (!onBoard(b[0], b[1]) || !onBoard(c[0], c[1])) return null;

    const valuable = slider === "Q" ? "r" : pick(rng, ["q", "r"]);
    if (valuable === "r" && slider === "R") return null;
    const kingAt = kingFirst ? b : a;
    const pieceAt = kingFirst ? a : b;
    placement.set(sq(kingAt[0], kingAt[1]), "k");
    placement.set(sq(pieceAt[0], pieceAt[1]), kingFirst ? valuable : pick(rng, ["q", "r", "n", "b"]));

    // Цагаан довтлогчийг `c` рүү нэг нүүдлээр хүрэх нүдэнд тавина.
    const landing = sq(c[0], c[1]);
    const cross = dirs.filter(([x, y]) => !(x === df && y === dr) && !(x === -df && y === -dr));
    const [ef, er] = pick(rng, cross);
    const steps = randInt(rng, 1, 4);
    const start = [c[0] + ef * steps, c[1] + er * steps];
    if (!onBoard(start[0], start[1])) return null;
    const startSquare = sq(start[0], start[1]);
    if (placement.has(startSquare) || startSquare === landing) return null;
    placement.set(startSquare, slider);

    if (!put(rng, placement, "K", (f, r) => dist(sq(f, r), sq(kingAt[0], kingAt[1])) >= 2)) return null;
    if (rng() < 0.6) put(rng, placement, pick(rng, ["P", "p", "p"]));
    const chess = loadPosition(toFen(placement));
    return chess && !chess.inCheck() ? chess.fen() : null;
  };
}

export function skewerTask(): Generator {
  return winTask(
    lineTactic(true),
    3,
    [
      "РЕНТГЕН хий: ноёнд шат өг — ноён зайлахад ард нь байгаа дүрсийг ид.",
      "SKEWER: check the king — when it steps aside, take the piece behind it.",
    ],
    [
      "Рентген бол «эсрэг хүлээс»: үнэтэй дүрс (ноён) урдаа, хямд дүрс ард нь. Ноён зайлах ёстой тул ард нь байгаа дүрс унана.",
      "A skewer is a reverse pin: the valuable piece (the king) is in front and must move, exposing the piece behind.",
    ]
  );
}

export function pinTask(): Generator {
  return winTask(
    lineTactic(false),
    2,
    [
      "ХҮЛЭЭС ашигла: ноёноос нь салж чадахгүй дүрсийг хүлээж, дараа нь ид.",
      "Use a PIN: pin a piece that cannot leave its king, then win it.",
    ],
    [
      "Хүлээстэй дүрс ард нь ноён байгаа тул хөдөлж чадахгүй — түүнийг дахин дайрвал хамгаалагдахгүй.",
      "A pinned piece cannot move because its king is behind it — attack it again and it is lost.",
    ]
  );
}

export function discoveredTask(): Generator {
  return winTask(
    (rng) => {
      const placement: Placement = new Map();
      const slider = pick(rng, ["R", "B", "Q"]);
      const dirs = slider === "R" ? ORTHO : slider === "B" ? DIAG : [...ORTHO, ...DIAG];
      const [df, dr] = pick(rng, dirs);
      const s0 = [randInt(rng, 0, 7), randInt(rng, 0, 7)];
      const a = randInt(rng, 1, 2);
      const b = a + randInt(rng, 1, 3);
      const mid = [s0[0] + df * a, s0[1] + dr * a];
      const far = [s0[0] + df * b, s0[1] + dr * b];
      if (!onBoard(mid[0], mid[1]) || !onBoard(far[0], far[1])) return null;
      placement.set(sq(s0[0], s0[1]), slider);
      const blocker = pick(rng, ["N", "N", "B"]);
      placement.set(sq(mid[0], mid[1]), blocker);
      const discoverCheck = rng() < 0.5;
      placement.set(sq(far[0], far[1]), discoverCheck ? "k" : "q");
      if (discoverCheck) {
        if (!put(rng, placement, pick(rng, ["q", "r"]))) return null;
      } else if (!put(rng, placement, "k")) return null;
      if (!put(rng, placement, "K")) return null;
      if (rng() < 0.5) put(rng, placement, "p");
      const chess = loadPosition(toFen(placement));
      return chess && !chess.inCheck() ? chess.fen() : null;
    },
    4,
    [
      "НЭЭЛТТЭЙ ДАЙРАЛТ: урдах дүрсээ нүүлгэж, ард нь байгаа дүрсийн замыг нээ.",
      "DISCOVERED ATTACK: move the front piece and open the line for the piece behind it.",
    ],
    [
      "Урдах дүрс нүүхдээ өөрөө дайрна, ард нь байгаа дүрс ч мөн дайрна — хоёр заналхийллийг зэрэг хамгаалах боломжгүй.",
      "The moving piece makes its own threat while the piece behind attacks too — two threats cannot both be parried.",
    ]
  );
}

/** Хамгаалалтгүй / хямдаар идэгдэх дүрсийг олох — олон дүрстэй байрлал. */
export function winMaterialTask(): Generator {
  return winTask(
    (rng) => {
      const placement: Placement = new Map();
      if (!putKings(rng, placement)) return null;
      for (let i = 0; i < 3; i++) put(rng, placement, pick(rng, ["Q", "R", "B", "N", "P", "P"]));
      for (let i = 0; i < 3; i++) put(rng, placement, pick(rng, ["q", "r", "b", "n", "p", "p"]));
      const chess = loadPosition(toFen(placement));
      return chess && !chess.inCheck() ? chess.fen() : null;
    },
    3,
    [
      "Хамгийн хүчтэй хоёр нүүдлийг ол — хар тал хэрхэн ч хамгаалсан материал хож.",
      "Find the strongest two moves — win material however Black defends.",
    ],
    [
      "Шат, идэлт, заналхийлэл гэсэн дарааллаар хай. Хар талын ХАМГИЙН САЙН хариуг бодож үз.",
      "Look for checks, captures and threats — in that order. Always consider Black's BEST reply.",
    ]
  );
}

// --- Level 9: эндшпиль -----------------------------------------------------

export function oppositionTask(): Generator {
  return (rng) => {
    const placement: Placement = new Map();
    const bk = put(rng, placement, "k", (_, r) => r >= 3 && r <= 6);
    if (!bk) return null;
    const wk = put(rng, placement, "K", (f, r) => {
      const d = dist(sq(f, r), bk);
      return d >= 2 && d <= 3 && r < rankOf(bk);
    });
    if (!wk) return null;
    if (rng() < 0.7) put(rng, placement, "P", (f, r) => r >= 1 && r < rankOf(wk) && Math.abs(f - fileOf(wk)) <= 1);
    const chess = loadPosition(toFen(placement));
    if (!chess) return null;
    const hits = distinctMoves(chess).filter((m) => {
      if (m.piece !== "k") return false;
      const df = Math.abs(fileOf(m.to) - fileOf(bk));
      const dr = Math.abs(rankOf(m.to) - rankOf(bk));
      return (df === 0 && dr === 2) || (dr === 0 && df === 2);
    });
    if (hits.length !== 1) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: hits[0].from,
      to: hits[0].to,
      goal: { kind: "opposition" },
      prompt: [
        "ОППОЗИЦИ ав: ноёноо хар ноёны яг эсрэг, дунд нь НЭГ нүд үлдээж зогсоо.",
        "Take the OPPOSITION: place your king directly facing the black king with ONE square between.",
      ],
      explain: [
        "Хаад нүүр тулж, дунд нь нэг нүд үлдвэл нүүх ээлжтэй тал ухрах ёстой болно. Хүүгийн эндшпилийн гол зэвсэг!",
        "When the kings face each other with one square between, the side to move must give way. The key weapon in pawn endgames!",
      ],
    };
  };
}

/** Эндшпилийн хөдөлгөөн: хүүгээ бэрс болго (хар ноён гүйцэхгүй). */
export function runnerTask(): Generator {
  return (rng) => {
    const placement: Placement = new Map();
    const file = randInt(rng, 0, 7);
    const rank = randInt(rng, 4, 6);
    placement.set(sq(file, rank), "P");
    const promotion = sq(file, 7);
    // ⚠ «Гүйцэхгүй» гэж ХЭЛЖ байгаа тул бодитоор үнэн байх ёстой: түлхсэний
    // дараа хүүд (6 − rank) нүүдэл үлдэнэ, хар тал түрүүлж нүүнэ. Хар ноён
    // хувирах нүднээс ТҮҮНЭЭС 2-оор илүү зайтай бол замыг нь хааж ч, бэрсийг
    // идэж ч чадахгүй (нөөцтэй, консерватив нөхцөл).
    if (
      !putKings(
        rng,
        placement,
        (f, r) => r <= rank && f !== file,
        (f, r) => dist(sq(f, r), promotion) >= 8 - rank + 2
      )
    )
      return null;
    const chess = loadPosition(toFen(placement));
    if (!chess || chess.inCheck()) return null;
    const push = distinctMoves(chess).find((m) => m.from === sq(file, rank) && m.to === sq(file, rank + 1));
    if (!push) return null;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: push.from,
      to: push.to,
      goal: { kind: "reach", piece: "p" },
      prompt: fill(["Хар ноён хүүг гүйцэхгүй! Хүүгээ {to} рүү урагшлуул.", "The black king can't catch the pawn! Push it to {to}."], {
        to: push.to,
      }),
      explain: [
        "«Квадратын дүрэм»: хүүгээс сүүлийн эгнээ хүртэл квадрат зурна. Хар ноён түүн дотор орж чадахгүй бол хүү бэрс болно.",
        "The 'rule of the square': draw a square from the pawn to the last rank. If the black king cannot step into it, the pawn promotes.",
      ],
    };
  };
}

// --- Level 10: нээлт -------------------------------------------------------

/** Алдартай нээлтийн мөрүүд — байрлал нь бодит тоглолтоос. */
const OPENING_LINES = [
  "e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6",
  "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7",
  "d4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O",
  "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6",
  "e4 e6 d4 d5 Nc3 Nf6 Bg5 Be7 e5 Nfd7",
  "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O",
  "e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6",
  "Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O",
  "e4 e5 Nf3 d6 d4 Nd7 Bc4 c6 O-O Be7",
  "c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6",
  "e4 e5 Nc3 Nf6 Bc4 Nc6 d3 Bb4 Nge2 d5",
  "d4 d5 Nf3 Nf6 e3 e6 Bd3 c5 b3 Nc6",
  "e4 e5 Nf3 Nf6 d3 Nc6 Be2 Bc5 O-O d6",
  "e4 d6 d4 Nf6 Nc3 g6 Be2 Bg7 Nf3 O-O",
  "e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O",
  "d4 Nf6 Nf3 e6 e3 b6 Bd3 Bb7 O-O Be7",
  "e4 Nc6 Nf3 e5 Bb5 Nf6 d3 Bc5 c3 O-O",
  "Nf3 Nf6 e3 d5 Be2 e6 O-O Bd6 d4 O-O",
  "e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6",
  "d4 e6 e4 d5 Nd2 c5 Ngf3 Nc6 Bb5 Bd6",
];

const DEVELOP_TARGETS: Record<string, [PieceSymbol, string]> = {
  f3: ["n", "f3"],
  c3: ["n", "c3"],
  c4: ["b", "c4"],
  e2: ["b", "e2"],
  d3: ["b", "d3"],
  b5: ["b", "b5"],
  e4: ["p", "e4"],
  d4: ["p", "d4"],
};

/** Нээлтийн байрлал: төвийн хүү, хөнгөн дүрсээ гаргах, рокировка. */
export function openingTask(kind: "center" | "develop" | "castle"): Generator {
  return (rng) => {
    const line = pick(rng, OPENING_LINES).split(" ");
    const plies = randInt(rng, 0, line.length);
    const chess = new Chess();
    for (const san of line.slice(0, plies)) chess.move(san);
    if (chess.turn() !== "w") return null;
    const moves = distinctMoves(chess);

    if (kind === "castle") {
      const castle = moves.filter((m) => m.flags.includes("k") || m.flags.includes("q"));
      if (castle.length !== 1) return null;
      return {
        type: "board-move",
        fen: chess.fen(),
        from: castle[0].from,
        to: castle[0].to,
        goal: { kind: "castle" },
        prompt: ["Ноёноо аюулгүй болго — РОКИРОВКА хий.", "Make your king safe — CASTLE."],
        explain: [
          "Нээлтийн гурван дүрэм: төвийг эзэл, хөнгөн дүрсээ гарга, рокировка хий. Төвд үлдсэн ноён довтолгоонд өртөмтгий.",
          "Three opening rules: take the centre, develop your pieces, castle. A king left in the centre is easy to attack.",
        ],
      };
    }

    const wanted = Object.values(DEVELOP_TARGETS).filter(([piece]) =>
      kind === "center" ? piece === "p" : piece !== "p"
    );
    const options = wanted.filter(([piece, target]) => {
      const reaching = moves.filter((m) => m.piece === piece && m.to === target);
      return reaching.length === 1 && !reaching[0].captured;
    });
    if (options.length === 0) return null;
    const [piece, target] = pick(rng, options);
    const move = moves.find((m) => m.piece === piece && m.to === target)!;
    return {
      type: "board-move",
      fen: chess.fen(),
      from: move.from,
      to: move.to,
      goal: { kind: "reach", piece },
      prompt: fill(
        kind === "center"
          ? ["Төвийг эзэл: хүүгээ {to} рүү нүү.", "Take the centre: move a pawn to {to}."]
          : ["{your} {to} рүү гаргаж хөгжүүл.", "Develop {youren} to {to}."],
        { your: YOUR[piece][0], youren: YOUR[piece][1], to: target }
      ),
      explain:
        kind === "center"
          ? [
              "e4, d4, e5, d5 бол ТӨВ. Төвийн хүү дүрсүүдэд зай гаргаж, өрсөлдөгчийн нүдийг хяналтад авна.",
              "e4, d4, e5 and d5 are the CENTRE. Central pawns give your pieces room and control key squares.",
            ]
          : [
              "Морь, тэмээгээ эрт гарга — ялангуяа морийг төв рүү (f3, c3). Нэг дүрсээр олон удаа нүүхгүй.",
              "Bring out knights and bishops early — knights towards the centre (f3, c3). Don't move one piece many times.",
            ],
    };
  };
}

/** Хэд хэдэн үүсгэгчээс санамсаргүй нэгийг — Challenge хичээлд. */
export const anyOf =
  (...generators: Generator[]): Generator =>
  (rng) =>
    pick(rng, generators)(rng);

export type { Task };
