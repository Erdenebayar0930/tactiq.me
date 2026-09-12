"use client";

import { useRef, useState } from "react";
import { Crown } from "lucide-react";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { Board as DraughtsGrid, Color, Square } from "@/lib/draughts/engine";

/**
 * Дамын хөлөг — `ChessBoard.tsx`-тэй ИЖИЛ Pointer Events-д суурилсан
 * харилцан үйлдэл (тайлбарыг тэндээс үзнэ үү), 10x10 хэмжээ, зөвхөн бараан
 * 50 нүд идэвхтэй. Модны өнгө, судал `ChessBoard.tsx`-тэй ИЖИЛ (аппын нэг л
 * "гуалин хөлөг" харагдацыг хадгална).
 */

const SIZE = 10;

function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function sameSquare(a: Square, b: Square): boolean {
  return a.row === b.row && a.col === b.col;
}

const GRAIN: Record<"light" | "dark", string> = {
  light:
    "repeating-linear-gradient(100deg, rgba(90,55,20,0.035) 0px, rgba(90,55,20,0.035) 1px, transparent 1px, transparent 15px)",
  dark: "repeating-linear-gradient(100deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 16px)",
};

const PIECE_LOOK: Record<Color, string> = {
  w: "bg-gradient-to-br from-[#fdfaf3] to-[#e2d3ab] border-2 border-[#c9b48a]",
  b: "bg-gradient-to-br from-[#4a463f] to-[#1c1a17] border-2 border-black/50",
};

export function DraughtsBoard({
  board,
  orientation,
  interactive,
  getLegalTargets,
  onMove,
  lastMove,
}: {
  /** `Draughts.board()`-ийн гаралт — 10 мөр, мөр бүр 10 багана. */
  board: DraughtsGrid;
  orientation: "white" | "black";
  interactive: boolean;
  getLegalTargets: (square: Square) => Square[];
  onMove: (from: Square, to: Square) => void;
  lastMove?: { from: Square; to: Square } | null;
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [squareSize, setSquareSize] = useState(42);
  const boardRef = useRef<HTMLDivElement>(null);

  const rowsOrder = orientation === "white" ? range() : range().reverse();
  const colsOrder = orientation === "white" ? range() : range().reverse();

  const reset = () => {
    setSelected(null);
    setLegalTargets([]);
    setDragPos(null);
  };

  const squareFromPoint = (x: number, y: number): Square | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-square]");
    if (!el) return null;
    const [row, col] = el.dataset.square!.split(",").map(Number);
    return { row, col };
  };

  const onPieceDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    square: Square,
    piece: DraughtsGrid[number][number]
  ) => {
    if (!interactive) return;

    if (selected && legalTargets.some((t) => sameSquare(t, square))) {
      onMove(selected, square);
      reset();
      return;
    }

    if (!piece) {
      reset();
      return;
    }

    setSelected(square);
    setLegalTargets(getLegalTargets(square));
    setDragPos({ x: event.clientX, y: event.clientY });
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) setSquareSize(rect.width / SIZE);
    boardRef.current?.setPointerCapture(event.pointerId);
  };

  const onBoardMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragPos) return;
    setDragPos({ x: event.clientX, y: event.clientY });
  };

  const onBoardUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragPos || !selected) return;

    const target = squareFromPoint(event.clientX, event.clientY);
    if (target && legalTargets.some((t) => sameSquare(t, target))) {
      onMove(selected, target);
      reset();
      return;
    }

    setDragPos(null);
  };

  const draggedPiece = selected ? board[selected.row][selected.col] : null;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px] select-none rounded-lg bg-gradient-to-br from-[#4a2f1c] to-[#1c0f07] p-[3%] shadow-[inset_0_2px_3px_rgba(255,255,255,0.12),inset_0_-3px_8px_rgba(0,0,0,0.65),0_8px_24px_rgba(0,0,0,0.45)]">
      <div
        ref={boardRef}
        onPointerMove={onBoardMove}
        onPointerUp={onBoardUp}
        className="relative size-full touch-none overflow-hidden rounded-sm shadow-[inset_0_0_0_2px_rgba(0,0,0,0.5)]"
      >
        <div className="grid size-full grid-cols-10 grid-rows-10">
          {rowsOrder.map((row) =>
            colsOrder.map((col) => {
              const square: Square = { row, col };
              const dark = isDark(row, col);
              const piece = dark ? board[row][col] : null;
              const isSelected = selected && sameSquare(selected, square);
              const isTarget = dark && legalTargets.some((t) => sameSquare(t, square));
              const isLastMove =
                dark && lastMove && (sameSquare(lastMove.from, square) || sameSquare(lastMove.to, square));
              const isDraggingThis = isSelected && dragPos;

              return (
                <div
                  key={`${row},${col}`}
                  data-square={dark ? `${row},${col}` : undefined}
                  style={dark ? { backgroundImage: GRAIN.dark } : { backgroundImage: GRAIN.light }}
                  className={`relative flex items-center justify-center ${
                    dark ? "bg-[#7a4a26]" : "bg-[#e8cea0]"
                  }`}
                >
                  {isLastMove && <div className="absolute inset-0 bg-[#a9c860]/60" />}

                  {isTarget && (
                    <div
                      className={`pointer-events-none absolute rounded-full ${
                        piece ? "inset-1 border-4 border-sky-500/70" : "size-1/3 bg-sky-500/50"
                      }`}
                    />
                  )}

                  {piece && !isDraggingThis && (
                    <div
                      onPointerDown={(event) => onPieceDown(event, square, piece)}
                      className={`relative flex size-[78%] items-center justify-center rounded-full ${
                        PIECE_LOOK[piece.color]
                      } ${interactive ? "cursor-grab active:cursor-grabbing" : ""} shadow-[0_2px_2px_rgba(0,0,0,0.35)]`}
                    >
                      {isSelected && (
                        <div className="pointer-events-none absolute -inset-1 rounded-full ring-[3px] ring-amber-400" />
                      )}
                      {piece.king && (
                        <Crown
                          className={piece.color === "w" ? "size-[45%] text-amber-600" : "size-[45%] text-amber-400"}
                          aria-hidden
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {dragPos && draggedPiece && (
          <FloatingPiece piece={draggedPiece} x={dragPos.x} y={dragPos.y} size={squareSize} />
        )}
      </div>
    </div>
  );
}

function range(): number[] {
  return Array.from({ length: SIZE }, (_, i) => i);
}

function FloatingPiece({
  piece,
  x,
  y,
  size,
}: {
  piece: NonNullable<DraughtsGrid[number][number]>;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <div
      style={{ position: "fixed", left: x - size / 2, top: y - size / 2, width: size, height: size }}
      className="pointer-events-none z-50 flex scale-110 items-center justify-center"
    >
      <div
        className={`flex size-[78%] items-center justify-center rounded-full ${PIECE_LOOK[piece.color]} shadow-[0_3px_4px_rgba(0,0,0,0.45)]`}
      >
        {piece.king && (
          <Crown
            className={piece.color === "w" ? "size-[45%] text-amber-600" : "size-[45%] text-amber-400"}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
