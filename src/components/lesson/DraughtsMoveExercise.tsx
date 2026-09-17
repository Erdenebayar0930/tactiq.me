"use client";

import { useMemo, useRef, useState } from "react";

import { Draughts } from "@/lib/draughts/engine";
import {
  advanceChain,
  chainBoard,
  chainPosition,
  chainTargets,
  startChain,
} from "@/lib/draughts/chain";
import { deserializePosition, squareNumber } from "@/lib/draughts/notation";
import { DraughtsBoard } from "@/components/draughts/DraughtsBoard";

import type { ChainState } from "@/lib/draughts/chain";
import type { Square as DraughtsSquare } from "@/lib/draughts/engine";
import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "draughts-move" дасгал — `BoardMoveExercise`-тэй ИЖИЛ санаа, гэхдээ
 * `Draughts` хөдөлгүүр + `DraughtsBoard`-оор.
 *
 * ⚠ ИДЭЛТИЙН ХЭЛХЭЭ ИДЭЛТ БҮРД ЗОГСОНО (`lib/draughts/chain.ts`).
 * Хөдөлгүүр нь хэлхээт идэлтийг нэг нүүдэл гэж үздэг бөгөөд тоглолтод
 * тэр нь зөв. Гэвч хичээлд сурагч «эхлэл → төгсгөл» гэсэн хоёр нүдийг
 * хараад дундах идэлтүүдийг ТӨСӨӨЛӨХ шаардлагатай болдог — даам сурч
 * байгаа хүүхдэд яг тэр дундах алхмууд нь сурах зүйл.
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

  /** Хагас дууссан идэлтийн хэлхээ — `null` бол дүрс хөлөг дээр тайван. */
  const [chain, setChain] = useState<ChainState | null>(null);

  const board = useMemo(
    () => {
      const real = gameRef.current.board();
      // Хэлхээ дундуур байвал ХАРУУЛАХ байрлал — хөдөлгүүр хөндөгдөөгүй.
      return chain ? chainBoard(real, chain) : real;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, chain]
  );

  const handleMove = (from: DraughtsSquare, to: DraughtsSquare) => {
    if (feedback) return;

    const game = gameRef.current;
    const step = chain
      ? advanceChain(chain, to)
      : startChain(game.movesFrom(from), from, to);

    /*
     * ⚠ ХУУЛЬ БУС даралт нь АЛДАА БИШ: сурагч хөлөг дээр хамаагүй нүд
     * дарсан байж мэднэ (эсвэл дүрсээ хөдөлгөж үзэж байна). Алдаа гэж
     * тоолвол зүрх хэдхэн товшилтод дуусна.
     */
    if (step.kind === "illegal") return;

    // Хэлхээ үргэлжилнэ — дүрс дундах буулт дээр зогсоно, идэгдсэн дүрс арилна.
    if (step.kind === "partial") {
      setChain(step.state);
      forceUpdate((v) => v + 1);
      return;
    }

    const move = step.move;
    const correct =
      String(squareNumber(move.from.row, move.from.col)) === exercise.correctFrom &&
      String(squareNumber(move.to.row, move.to.col)) === exercise.correctTo;

    /*
     * ⚠ Буруу бол ХЭЛХЭЭГ ТАЙЛНА: байрлал хэвээр үлдэж, сурагч эхнээсээ
     * дахин оролдоно. Дундах алхмууд нь хөдөлгүүрт хэрэгжээгүй тул
     * буцаах (undo) шаардлагагүй.
     */
    if (!correct) {
      setChain(null);
      setMistake(true);
      onMistake?.();
      forceUpdate((v) => v + 1);
      return;
    }

    // ⚠ `move(from, to)` БИШ, `applyMove(move)`: ижил эхлэл, төгсгөлтэй
    // хоёр өөр хэлхээ байж болох тул сурагч ЗУРСАН яг тэр хэлхээг хийнэ.
    game.applyMove(move);

    setChain(null);
    setLastMove({ from: move.from, to: move.to });
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
        /*
          ⚠ Хэлхээ дундуур байхад ЗӨВХӨН тэр дүрсийн дараагийн буултууд
          тодорно: өөр дүрс сонгуулбал сурагч хэлхээгээ хагас орхиод
          хөлгийг эвдэрсэн байрлалд харна.
        */
        getLegalTargets={(square) => {
          if (chain) {
            const at = chainPosition(chain);
            return at.row === square.row && at.col === square.col ? chainTargets(chain) : [];
          }
          return gameRef.current.movesFrom(square).map((m) => m.to);
        }}
        onMove={handleMove}
        lastMove={lastMove}
      />

      {chain && feedback === null && (
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          Идэлт үргэлжилж байна — дараагийн нүдээ дар.
        </p>
      )}

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
