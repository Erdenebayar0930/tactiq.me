"use client";

import { useMemo, useState } from "react";

import {
  applyMove,
  CELL_H,
  decodeMatchstick,
  evaluate,
  layout,
  slotRects,
  STICK,
  toText,
  type Matchstick,
  type Slot,
} from "@/lib/puzzles/matchstick";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "matchstick" дасгал — НЭГ таяг зөөж тэгшитгэлийг зөв болгоно.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад ЯГ НЭГ нүүдэл вэ: классик таягны оньсогын
 * дүрэм нь «нэг таяг зөө». Чөлөөтэй зөөлгөвөл сурагч хоёр, гурван
 * нүүдлээр зөв тэгшитгэлд хүрч «шийдсэн» болох ба оньсогын гол сорилт
 * (ЯГ нэг нүүдлийг олох) алга болно. Тиймээс нэг нүүдлийн дараа хөлөг
 * ЦООЖЛОГДОНО: зөв бол шууд шалгагдана, буруу бол «Дахин» товчоор
 * эхний байдал руу буцна.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад хоосон сандал ЗӨВХӨН сонгосны дараа
 * харагддаг вэ: тоо бүрт долоон сандал байдаг тул бүгдийг зэрэг
 * харуулбал хөлөг «цоохор тор» болж, одоогийн тэгшитгэл уншигдахаа
 * болино. Таяг сонгомогц боломжит ГАЗРУУД гарч ирнэ — тэр нь юу хийхийг
 * үгээр тайлбарлахгүйгээр заана.
 */

export default function MatchstickExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const start = useMemo(() => decodeMatchstick(exercise.grid), [exercise.grid]);

  const [board, setBoard] = useState<Matchstick | null>(start);
  const [picked, setPicked] = useState<Slot | null>(null);
  /** Нэг нүүдэл хийгдсэн эсэх — хөлгийг цоожлоход хэрэглэнэ. */
  const [moved, setMoved] = useState(false);

  if (!start || !board) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ оньсого буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
        </p>
        <button
          type="button"
          onClick={() => onAnswer(true)}
          className="rounded-xl bg-brand-500 px-4 py-2 font-semibold text-white hover:bg-brand-600"
        >
          Алгасах
        </button>
      </div>
    );
  }

  const locked = moved || feedback !== null;
  const solvedNow = evaluate(board) === true;

  const { offsets, width: total } = layout(board);

  const tapStick = (slot: Slot) => {
    if (locked) return;
    setPicked((current) =>
      current && current.cell === slot.cell && current.slot === slot.slot ? null : slot
    );
  };

  const tapEmpty = (slot: Slot) => {
    if (locked || !picked) return;

    const next = applyMove(board, picked, slot);
    if (!next) return;

    setBoard(next);
    setPicked(null);
    setMoved(true);

    if (evaluate(next) === true) onAnswer(true);
  };

  const reset = () => {
    setBoard(start);
    setPicked(null);
    setMoved(false);
  };

  /*
   * ⚠ Дотооддоо үржихийг «*» гэж хадгална (JS-ийн тооцооллын тэмдэгтэй
   * ижил), харин ХАРУУЛАХДАА «×» — сурагч сургууль дээр түүнийг хардаг.
   */
  const reading = toText(board)?.replaceAll("*", "×") ?? null;

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <div className="overflow-x-auto">
        <svg
          viewBox={`-4 -4 ${total + 8} ${CELL_H + 8}`}
          className="mx-auto block h-auto w-full max-w-md"
          role="img"
          aria-label={reading ? `Одоогийн тэгшитгэл: ${reading}` : "Тэгшитгэл уншигдахгүй байна"}
        >
          {board.cells.map((cell, cellIndex) => {
            const rects = slotRects(cell);

            return (
              <g key={cellIndex} transform={`translate(${offsets[cellIndex]}, 0)`}>
                {rects.map((rect, slotIndex) => {
                  const lit = cell.mask[slotIndex] === "1";
                  const isPicked =
                    picked !== null && picked.cell === cellIndex && picked.slot === slotIndex;

                  if (lit) {
                    return (
                      <rect
                        key={slotIndex}
                        x={rect.x}
                        y={rect.y}
                        width={rect.w}
                        height={rect.h}
                        rx={STICK / 2}
                        transform={
                          rect.rotate
                            ? `rotate(${rect.rotate} ${rect.x + rect.w / 2} ${rect.y + rect.h / 2})`
                            : undefined
                        }
                        className={`transition-colors ${
                          isPicked
                            ? "fill-brand-500"
                            : "fill-amber-500 dark:fill-amber-400"
                        } ${locked ? "" : "cursor-pointer"}`}
                        onClick={() => tapStick({ cell: cellIndex, slot: slotIndex })}
                      />
                    );
                  }

                  // Хоосон сандал — ЗӨВХӨН таяг сонгосон үед л зорилт болно.
                  if (!picked || locked) return null;

                  return (
                    <rect
                      key={slotIndex}
                      x={rect.x}
                      y={rect.y}
                      width={rect.w}
                      height={rect.h}
                      rx={STICK / 2}
                      transform={
                        rect.rotate
                          ? `rotate(${rect.rotate} ${rect.x + rect.w / 2} ${rect.y + rect.h / 2})`
                          : undefined
                      }
                      className="cursor-pointer fill-brand-500/25 transition-colors hover:fill-brand-500/60"
                      onClick={() => tapEmpty({ cell: cellIndex, slot: slotIndex })}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-center font-num text-sm text-gray-500 dark:text-gray-400">
        {reading ?? "Дүрс уншигдахгүй байна"}
      </p>

      {!moved && !picked && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Зөөх таягаа дар, дараа нь тавих газрыг дар.
        </p>
      )}

      {moved && !solvedNow && feedback === null && (
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Болсонгүй — нэг таягаар л зөв болгох арга бий.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Дахин
          </button>
        </div>
      )}
    </div>
  );
}
