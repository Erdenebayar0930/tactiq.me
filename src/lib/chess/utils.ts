import type { Chess, Move, Square } from "chess.js";

/**
 * P2P (`/play/[roomId]`) болон бот (`/play/bot`) хуудас ХОЁУЛАА хэрэглэдэг
 * туслах функцууд — нэг газар байлгаснаар нүүдэл шийдвэрлэх дүрэм хоёр
 * газар зэрэг зөв байх шаардлагагүй болно.
 */

/** Шахад орсон (эсвэл ямар нэг өнгийн) хааны нүд. */
export function findKingSquare(chess: Chess, color: "w" | "b" = chess.turn()): Square | null {
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell && cell.type === "k" && cell.color === color) return cell.square;
    }
  }
  return null;
}

/**
 * `from`→`to` нүүдлийг бодит `Move` болгож шийднэ.
 *
 * Пешка сүүлийн эгнээнд хүрвэл `chess.moves()` энэ хос нүдэнд ДӨРВӨН
 * (ялгаатай `promotion`) хувилбар буцаадаг — бид ЯМАГТ хатан руу
 * хувиргахыг сонгоно (v1: сонголт хийх UI-гүй, зөвшөөрсөн хялбарчлал).
 */
export function resolveMove(chess: Chess, from: Square, to: Square): Move | null {
  const candidates = (chess.moves({ square: from, verbose: true }) as Move[]).filter(
    (candidate) => candidate.to === to
  );
  if (candidates.length === 0) return null;
  return candidates.find((candidate) => candidate.promotion === "q") ?? candidates[0];
}
