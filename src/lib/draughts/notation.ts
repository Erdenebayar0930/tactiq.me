import type { Board, Color, Piece } from "./engine";

/**
 * Дамын байрлалыг МӨР болгож хадгалах/сэргээх — шатрын FEN-тэй адил
 * зорилготой, гэхдээ дамд ийм стандарт бэлэн сан байхгүй тул PDN
 * (Portable Draughts Notation)-той ТӨСТЭЙ энгийн хэлбэрийг өөрсдөө
 * зохиосон: албан ёсны 1-50 нүдний дугаарлалт ашигладаг тул хэн ч (өөр
 * дамын сан/сайт) танихуйц.
 *
 * Хэлбэр: `<нүүх тал>:W<цагаан нүднүүд>:B<хар нүднүүд>` — нүд бүр
 * "K<дугаар>" (хаан) эсвэл "<дугаар>" (энгийн бэр), таслалаар тусгаарлана.
 * Жишээ нь эхлэх байрлал: "w:W31,32,...,50:B1,2,...,20".
 *
 * ⚠ Админ ЭНЭ мөрийг ГАРААР бичдэггүй — зөвхөн хөлөг дээр байрлал
 * тохируулаад/нүүдэл хийгээд, ЭНД АВТОМАТААР хөрвүүлэгддэг
 * (`admin/courses/[slug]/page.tsx`-ийн `DraughtsMoveEditor`).
 */

const SIZE = 10;

/** Мөр/баганаас 1-50 (Олон улсын дамын албан ёсны дугаарлалт) руу. */
export function squareNumber(row: number, col: number): number {
  const firstDarkCol = row % 2 === 0 ? 1 : 0;
  const index = (col - firstDarkCol) / 2;
  return row * 5 + index + 1;
}

/** 1-50-аас мөр/багана руу — `squareNumber`-ийн урвуу. */
export function squareFromNumber(n: number): { row: number; col: number } {
  const row = Math.floor((n - 1) / 5);
  const indexInRow = (n - 1) % 5;
  const firstDarkCol = row % 2 === 0 ? 1 : 0;
  return { row, col: firstDarkCol + indexInRow * 2 };
}

export function serializePosition(board: Board, turn: Color): string {
  const white: string[] = [];
  const black: string[] = [];

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = board[row][col];
      if (!cell) continue;
      const label = `${cell.king ? "K" : ""}${squareNumber(row, col)}`;
      (cell.color === "w" ? white : black).push(label);
    }
  }

  return `${turn}:W${white.join(",")}:B${black.join(",")}`;
}

const POSITION_RE = /^([wb]):W([^:]*):B(.*)$/;

export function deserializePosition(value: string): { board: Board; turn: Color } | null {
  const match = POSITION_RE.exec(value.trim());
  if (!match) return null;

  const [, turn, whitePart, blackPart] = match;
  const board: Board = Array.from({ length: SIZE }, () => Array<Piece | null>(SIZE).fill(null));

  for (const [part, color] of [
    [whitePart, "w"],
    [blackPart, "b"],
  ] as const) {
    if (!part) continue;
    for (const token of part.split(",")) {
      if (!token) continue;
      const king = token.startsWith("K");
      const n = Number(king ? token.slice(1) : token);
      if (!Number.isInteger(n) || n < 1 || n > 50) return null;
      const { row, col } = squareFromNumber(n);
      board[row][col] = { color, king };
    }
  }

  return { board, turn: turn as Color };
}
