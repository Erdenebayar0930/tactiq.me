"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import { makeRng, seedFromString } from "@/lib/net/puzzle";
import { decodeWord, isCorrect, shuffleFor } from "@/lib/puzzles/word";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "word" дасгал — холилдсон үсгүүдээс үгийг угсарна.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ⚠ Холилтыг дасгалын ID-гаар ҮРЛЭНЭ: хуудсыг сэргээхэд ИЖИЛ холилт
 * гарна — сурагч дахин ачаалж илүү хялбар холилт «хайх» боломжгүй
 * (`lib/puzzles/word.ts`-ийн тайлбарыг үзнэ үү).
 *
 * ЗАГВАРЫН ШИЙДЭЛ — үсгийг БУЦААЖ авч болно. Нэг үсэг андуурсны улмаас
 * бүхэлд нь дахин эхлүүлэх нь хүүхдийг яаралгүй бодохоос сэргийлнэ.
 */
export default function WordExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const puzzle = useMemo(() => decodeWord(exercise.grid), [exercise.grid]);

  /** Холилт — дасгалын ID-аас, тиймээс рендэр бүрт ижил. */
  const letters = useMemo(
    () => (puzzle ? shuffleFor(puzzle.answer, makeRng(seedFromString(exercise.id))) : []),
    [puzzle, exercise.id]
  );

  /** Сонгосон үсгүүдийн ИНДЕКС (үсэг давтагдаж болох тул индексээр). */
  const [picked, setPicked] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);

  if (!puzzle) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ таавар буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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

  const done = feedback !== null;
  const attempt = picked.map((index) => letters[index]).join("");

  const pick = (index: number) => {
    if (done || picked.includes(index)) return;

    const next = [...picked, index];
    setPicked(next);
    setWrong(false);

    if (next.length < puzzle.answer.length) return;

    const word = next.map((i) => letters[i]).join("");
    if (isCorrect(puzzle, word)) onAnswer(true);
    else setWrong(true);
  };

  const undo = () => {
    if (done) return;
    setPicked((value) => value.slice(0, -1));
    setWrong(false);
  };

  const reset = () => {
    setPicked([]);
    setWrong(false);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      {/* Угсарч буй үг. */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {Array.from({ length: puzzle.answer.length }, (_, slot) => {
          const index = picked[slot];
          const letter = index === undefined ? "" : letters[index];

          return (
            <span
              key={slot}
              className={`grid size-11 place-items-center rounded-xl text-xl font-bold transition-colors ${
                letter
                  ? wrong
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                    : "bg-brand-500 text-white"
                  : "border-2 border-dashed border-gray-300 dark:border-white/15"
              }`}
            >
              {letter}
            </span>
          );
        })}
      </div>

      {/* Холилдсон үсгүүд. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {letters.map((letter, index) => {
          const used = picked.includes(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => pick(index)}
              disabled={done || used}
              className={`grid size-12 place-items-center rounded-xl text-xl font-bold transition-colors ${
                used
                  ? "bg-gray-100 text-gray-300 dark:bg-white/5 dark:text-white/20"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {!done && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={picked.length === 0}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-white/15 dark:text-gray-300"
          >
            Нэг үсэг буцаах
          </button>
          {picked.length > 0 && (
            <button
              type="button"
              onClick={reset}
              aria-label="Эхнээс"
              className="grid size-10 place-items-center rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300"
            >
              <RotateCcw className="size-4" aria-hidden />
            </button>
          )}
        </div>
      )}

      {wrong && !done && (
        <p className="text-center text-sm font-medium text-rose-600 dark:text-rose-400">
          Тийм үг байхгүй — үсгээ буцааж дахин угсараарай.
        </p>
      )}

      {!wrong && !done && attempt.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          Үсгүүдийг дарж үг угсар.
        </p>
      )}
    </div>
  );
}
