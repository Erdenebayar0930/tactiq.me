import { Chess } from "chess.js";

import type { Move, Square } from "chess.js";

/**
 * ӨРӨГ БОДЛОГЫН шийдлийн шугам — нэг эх сурвалж.
 *
 * ЯАГААД ТУСДАА ФАЙЛ ВЭ: шийдлийг ГУРВАН газар задлах шаардлагатай —
 * админы шалгалт (`lib/api/courseAdmin.ts`), админы оруулах маягт, сурагчийн
 * тоглуулагч. Гурвуулаа өөрсдийн гэсэн задлагчтай бол админ хадгалж чадсан
 * бодлогыг сурагч дээр "хууль бус нүүдэл" гэж унагаах эвдрэл гарна.
 *
 * ⚠ `server-only` БИШ: клиент компонент ба сервер талын шалгалт хоёулаа
 * импортолдог.
 */

/**
 * Шийдлийн ХАДГАЛАХ хэлбэр: UCI нүүдлүүд, зайгаар тусгаарлагдсан.
 *
 *   "d1h5 e8e7 h5e5"
 *
 * ЯАГААД UCI (нүднээс нүд) вэ, SAN ("Qh5+") БИШ:
 *   • SAN нь ЯГ ТУХАЙН байрлалаас хамаарна — FEN-ийг өчүүхэн засахад
 *     хуучин SAN мөр чимээгүйхэн өөр нүүдэл заах эсвэл огт задрахгүй болно.
 *   • UCI нь хөлөг дээрх хос нүд — хүнд уншихад арай төвөгтэй ч эргэлзээгүй.
 *   • Хувиргалтыг таван дахь тэмдэгтээр өгнө: "e7e8q".
 */
export const UCI_RE = /^([a-h][1-8])([a-h][1-8])([qrbn]?)$/;

export type PuzzleMove = {
  from: Square;
  to: Square;
  promotion: string | null;
  /** Хүнд харагдах бичиглэл ("Qh5+") — админы жагсаалтад. */
  san: string;
  /** Сурагчийн ээлж эсэх: 0, 2, 4-р нүүдэл нь сурагчийнх. */
  isPlayer: boolean;
};

export type ParsedPuzzle = {
  /** Эхлэх байрлал — задлахад ашигласан FEN (хэвшсэн хэлбэрээр). */
  fen: string;
  moves: PuzzleMove[];
  /** Шийдэл мадаар төгсөж байна уу — "N нүүдэлд мад" гэж шалгахад. */
  endsInMate: boolean;
  /** Сурагч хэдэн нүүдэл хийх вэ ("2 нүүдэлд мад" = 2). */
  playerMoves: number;
};

/** UCI мөрийг нүд болгож задална. Буруу бол `null`. */
export function parseUci(
  value: string
): { from: Square; to: Square; promotion: string | null } | null {
  const match = UCI_RE.exec(value.trim().toLowerCase());
  if (!match) return null;

  const [, from, to, promotion] = match;
  return { from: from as Square, to: to as Square, promotion: promotion || null };
}

/** Нүүдлийг UCI мөр болгоно ("e2","e4",null → "e2e4"). */
export function toUci(move: { from: string; to: string; promotion?: string | null }): string {
  return `${move.from}${move.to}${move.promotion ?? ""}`;
}

/**
 * Шийдлийн шугамыг эхлэх байрлалаас нь ТОГЛОЖ ҮЗЭЖ шалгана.
 *
 * ⚠ ЗААВАЛ бодитоор тоглох ёстой: зөвхөн бичиглэлийг шалгавал "хууль бус
 * боловч зөв хэлбэртэй" шугам (жишээ нь боожгүй байрлалд хааныг хөдөлгөх)
 * санд ороод, сурагч дээр ГАЦАА болж илэрнэ — хөлөг тэр нүүдлийг
 * зөвшөөрөхгүй тул бодлогыг хэзээ ч дуусгаж чадахгүй.
 *
 * ЗӨВ ШИЙДЛИЙН ШААРДЛАГА:
 *   • FEN нь хүчинтэй
 *   • нүүдэл бүр тухайн байрлалд ХУУЛЬ ЁСНЫ
 *   • нүүдлийн тоо СОНДГОЙ — эхнийх ба сүүлчийнх нь ХОЁУЛАА сурагчийнх
 *     байх ёстой (сурагчийн нүүдлээр төгсдөггүй бодлого нь "одоо юу
 *     болох вэ?" гэсэн хариултгүй асуулт болно)
 *
 * Мадаар төгсөхийг ШААРДАХГҮЙ: материал хожих, хосолсон дайралт зэрэг
 * тактикийн бодлого нь мадгүй ч бүрэн утгатай.
 */
export function parsePuzzle(
  rawFen: string | null | undefined,
  rawSolution: string | null | undefined
): ParsedPuzzle | null {
  if (typeof rawSolution !== "string") return null;

  let chess: Chess;
  try {
    chess = new Chess(rawFen || undefined);
  } catch {
    return null;
  }

  const tokens = rawSolution
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);

  if (tokens.length === 0 || tokens.length % 2 === 0) return null;
  if (tokens.length > PUZZLE_MAX_MOVES) return null;

  const fen = chess.fen();
  const moves: PuzzleMove[] = [];

  for (const [index, token] of tokens.entries()) {
    const parsed = parseUci(token);
    if (!parsed) return null;

    let applied: Move;
    try {
      applied = chess.move({
        from: parsed.from,
        to: parsed.to,
        promotion: parsed.promotion ?? undefined,
      });
    } catch {
      // chess.js нь хууль бус нүүдэлд шиддэг — энэ бол хүлээгдсэн тохиолдол.
      return null;
    }

    moves.push({
      from: parsed.from,
      to: parsed.to,
      promotion: applied.promotion ?? null,
      san: applied.san,
      isPlayer: index % 2 === 0,
    });
  }

  return {
    fen,
    moves,
    endsInMate: chess.isCheckmate(),
    playerMoves: Math.ceil(moves.length / 2),
  };
}

/** Задалсан шугамыг ЭРГЭЭД хадгалах мөр болгоно. */
export function formatSolution(moves: PuzzleMove[]): string {
  return moves.map(toUci).join(" ");
}

/**
 * Шийдлийн дээд урт (хагас нүүдлээр).
 *
 * 9 = сурагчийн 5 нүүдэл. Үүнээс урт бодлого нь дэлгэц дээр цээжлэх
 * даалгавар болж хувирдаг бөгөөд нэг алдаа гарахад бүхэлд нь дахин
 * эхлүүлэх нь сурагчийг залхаана.
 */
export const PUZZLE_MAX_MOVES = 9;

/** "2 нүүдэлд мад" гэх мэт монгол гарчиг — дасгал дээр автоматаар харагдана. */
export function puzzleGoalLabel(puzzle: ParsedPuzzle): string {
  if (puzzle.endsInMate) return `${puzzle.playerMoves} нүүдэлд мад`;
  return puzzle.playerMoves === 1 ? "Хамгийн сайн нүүдлийг ол" : "Хамгийн сайн шугамыг ол";
}

/**
 * Эхлэх байрлалд ХЭН нүүх ээлжтэй вэ — хөлгийг зөв талаас нь харуулахад.
 *
 * ⚠ Бодлогыг ЯМАГТ сурагчийн талаас харуулна. Хар нүүх бодлогыг цагаан
 * талаас нь харуулбал хүүхэд толин тусгал дээр бодох шаардлагатай болно.
 */
export function puzzleOrientation(fen: string): "white" | "black" {
  try {
    return new Chess(fen).turn() === "b" ? "black" : "white";
  } catch {
    return "white";
  }
}
