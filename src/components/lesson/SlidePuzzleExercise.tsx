"use client";

import { useMemo, useState } from "react";

import { makeRng, seedFromString } from "@/lib/net/puzzle";
import {
  canSlide,
  correctCount,
  decodeSlide,
  isSlideSolved,
  scrambleSlide,
  slide,
  solvedSlide,
  type SlideState,
} from "@/lib/puzzles/slide";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "slide-puzzle" дасгал — тоонуудыг хоосон нүд рүү гулгуулж 1-ээс эхлэн
 * эмхэлнэ (сонгодог 15-puzzle).
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * `NetPuzzleExercise`-тэй ижил зарчим: буруу нүүдэл гэж үгүй тул дасгал нь
 * ЗӨВХӨН амжилтаар дуусна. Гацсан сурагчид "Дахин холих" товч байна.
 */
export default function SlidePuzzleExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const target = useMemo(() => decodeSlide(exercise.grid), [exercise.grid]);

  /**
   * Эхлэлийг дасгалын ID-гаар үрлэнэ — хуудсыг сэргээхэд ижил оньсого
   * гарна (`lib/net/puzzle.ts`-ийн `makeRng` тайлбарыг үзнэ үү).
   */
  const [state, setState] = useState<SlideState | null>(() =>
    target ? scrambleSlide(target.size, makeRng(seedFromString(exercise.id))) : null
  );
  const [moves, setMoves] = useState(0);

  if (!target || !state) {
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

  const solvedTiles = solvedSlide(state.size).tiles;

  const push = (index: number) => {
    if (feedback || !canSlide(state, index)) return;

    const next = slide(state, index);
    setState(next);
    setMoves((value) => value + 1);

    if (isSlideSolved(next)) onAnswer(true);
  };

  const reshuffle = () => {
    if (feedback) return;
    setState(scrambleSlide(target.size, makeRng(seedFromString(exercise.id + moves))));
    setMoves(0);
  };

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <button
          type="button"
          onClick={reshuffle}
          disabled={feedback !== null}
          className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/5"
        >
          Дахин холих
        </button>
      </div>

      <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">
        Байрандаа: {correctCount(state)}/{state.size * state.size - 1} · {moves} нүүдэл
      </p>

      <div
        className="mx-auto grid w-full max-w-xs gap-1.5"
        style={{ gridTemplateColumns: `repeat(${state.size}, minmax(0, 1fr))` }}
      >
        {state.tiles.map((tile, index) => {
          if (tile === 0) {
            // Хоосон нүд — товчлуур БИШ. Товшиж болдог мэт харагдвал
            // сурагч дээр нь дарж, юу ч болохгүйд эргэлзэнэ.
            return <div key={index} className="aspect-square rounded-xl" />;
          }

          const inPlace = tile === solvedTiles[index];
          const movable = canSlide(state, index);

          return (
            <button
              key={index}
              type="button"
              onClick={() => push(index)}
              disabled={feedback !== null || !movable}
              className={`aspect-square rounded-xl text-xl font-extrabold transition-colors ${
                inPlace
                  ? "bg-emerald-500 text-white"
                  : "bg-brand-500 text-white hover:bg-brand-600"
              } ${
                // Гулсах боломжтой нүдийг ялгаж харуулна — эс бөгөөс сурагч
                // аль нь хөдлөхийг таамаглан хэд хэдэн удаа дэмий дарна.
                movable && !feedback ? "ring-2 ring-brand-300 ring-offset-1" : "opacity-90"
              }`}
            >
              {tile}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Хоосон нүдний ХАЖУУГИЙН тоог товшиж гулгана. 1-ээс эхлэн дарааллаар нь эмхэлнэ.
      </p>
    </div>
  );
}
