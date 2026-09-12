"use client";

import { useMemo, useRef, useState } from "react";

import { Draughts } from "@/lib/draughts/engine";
import { deserializePosition, squareNumber } from "@/lib/draughts/notation";
import { DraughtsBoard } from "@/components/draughts/DraughtsBoard";

import type { Square as DraughtsSquare } from "@/lib/draughts/engine";
import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "draughts-move" дасгал — `BoardMoveExercise`-тэй ИЖИЛ санаа, гэхдээ
 * `Draughts` хөдөлгүүр + `DraughtsBoard`-оор.
 *
 * ⚠ АЛДАА ДАСГАЛЫГ ДУУСГАХГҮЙ. Буруу нүүдлийг хөлөг дээр ХИЙЛГЭХГҮЙ —
 * байрлал хэвээр үлдэж, сурагч ижил байрлал дээр дахин оролдоно
 * (`onMistake`). Шатрынхаас ялгаатай нь даамын хөдөлгүүр буцаах (undo)
 * үйлдэлгүй тул нүүдлийг ЭХЛЭЭД шалгана.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана —
 * `board-move`-той ижил шалтгаанаар (доорх файлын тайлбарыг үзнэ үү).
 */
export default function DraughtsMoveExercise({
  exercise,
  feedback,
  onAnswer,
  onMistake,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
  onMistake?: () => void;
}) {
  const gameRef = useRef<Draughts>(
    (() => {
      const position = exercise.fen ? deserializePosition(exercise.fen) : null;
      return new Draughts(position ?? undefined);
    })()
  );
  const [version, forceUpdate] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: DraughtsSquare; to: DraughtsSquare } | null>(
    null
  );
  /** Буруу нүүдэл оролдсон — сануулга харуулна (дараагийн зөв нүүдэл хүртэл). */
  const [mistake, setMistake] = useState(false);

  const board = useMemo(
    () => gameRef.current.board(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  const handleMove = (from: DraughtsSquare, to: DraughtsSquare) => {
    if (feedback) return;

    const game = gameRef.current;
    const legal = game
      .movesFrom(from)
      .some((move) => move.to.row === to.row && move.to.col === to.col);
    if (!legal) return;

    const correct =
      String(squareNumber(from.row, from.col)) === exercise.correctFrom &&
      String(squareNumber(to.row, to.col)) === exercise.correctTo;

    if (!correct) {
      setMistake(true);
      onMistake?.();
      return;
    }

    const applied = game.move(from, to);
    if (!applied) return;

    setLastMove({ from, to });
    setMistake(false);
    forceUpdate((v) => v + 1);
    onAnswer(true);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <DraughtsBoard
        board={board}
        orientation="white"
        interactive={feedback === null}
        getLegalTargets={(square) => gameRef.current.movesFrom(square).map((m) => m.to)}
        onMove={handleMove}
        lastMove={lastMove}
      />

      {mistake && feedback === null && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Энэ нүүдэл биш байна. Дахин бодоод үзээрэй.
          </p>
          {exercise.explanation && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {exercise.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
