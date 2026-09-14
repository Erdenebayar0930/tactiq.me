"use client";

import { useMemo, useState } from "react";
import { Eraser, Paintbrush, RotateCcw, X } from "lucide-react";

import {
  columnClues,
  decodeNonogram,
  isSolved,
  rowClues,
} from "@/lib/puzzles/nonogram";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "nonogram" дасгал — мөр, баганын тоонуудаар нүд будаж зураг гаргана.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — ХОЁР БАГАЖ (будах / тэмдэглэх). Нонограм бодоход
 * «энэ нүд ЗААВАЛ хоосон» гэж дүгнэх нь «энэ нүд будагдана» гэдгээс дутуугүй
 * чухал. Тэмдэглэх багажгүй бол сурагч тэр дүгнэлтээ хаана ч тэмдэглэж
 * чадахгүй, бүгдийг толгойдоо барих болно — тэр нь оньсогыг санах ойн
 * сорилт болгож хувиргана.
 *
 * ⚠ ✕ тэмдэг нь ХАРИУД ОРОХГҮЙ: зөвхөн сурагчийн тэмдэглэл. Шалгалт нь
 * ЗӨВХӨН будсан нүднүүдийг харна.
 */

type Tool = "fill" | "mark";

export default function NonogramExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const puzzle = useMemo(() => decodeNonogram(exercise.grid), [exercise.grid]);

  const clues = useMemo(
    () => (puzzle ? { rows: rowClues(puzzle), columns: columnClues(puzzle) } : null),
    [puzzle]
  );

  const [filled, setFilled] = useState<Set<number>>(new Set());
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [tool, setTool] = useState<Tool>("fill");

  if (!puzzle || !clues) {
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

  const done = feedback !== null;
  const { width, height } = puzzle;

  /** Тоонуудын багана хэдэн мөр эзлэх вэ — хамгийн урт нь. */
  const clueRows = Math.max(...clues.columns.map((runs) => runs.length));
  const clueCols = Math.max(...clues.rows.map((runs) => runs.length));

  const tap = (index: number) => {
    if (done) return;

    if (tool === "mark") {
      // ⚠ Тэмдэглэсэн нүд будагдсан байж БОЛОХГҮЙ — хоёулаа зэрэг байвал
      // сурагч өөрийн тэмдэглэлдээ итгэхээ болино.
      const nextMarked = new Set(marked);
      if (nextMarked.has(index)) nextMarked.delete(index);
      else nextMarked.add(index);
      setMarked(nextMarked);

      if (filled.has(index)) {
        const nextFilled = new Set(filled);
        nextFilled.delete(index);
        setFilled(nextFilled);
      }
      return;
    }

    const next = new Set(filled);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setFilled(next);

    if (marked.has(index)) {
      const nextMarked = new Set(marked);
      nextMarked.delete(index);
      setMarked(nextMarked);
    }

    if (isSolved(puzzle, next)) onAnswer(true);
  };

  const reset = () => {
    setFilled(new Set());
    setMarked(new Set());
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <div className="overflow-x-auto">
        <div
          className="mx-auto grid w-max gap-px"
          style={{
            gridTemplateColumns: `repeat(${clueCols}, 1.1rem) repeat(${width}, 1.75rem)`,
          }}
        >
          {/* Баганын тоонууд — дээд талд. */}
          {Array.from({ length: clueRows }, (_, row) => (
            <div key={`ch-${row}`} className="contents">
              {Array.from({ length: clueCols }, (_, pad) => (
                <span key={`pad-${row}-${pad}`} />
              ))}
              {clues.columns.map((runs, c) => {
                // ⚠ Тоонуудыг ДООШОО тэгшилнэ: сүүлийн тоо нь торны хамгийн
                // ойрхон мөрөнд байх ёстой, эс бөгөөс аль тоо аль баганынх
                // болох нь уншигдахгүй.
                const offset = clueRows - runs.length;
                const value = row >= offset ? runs[row - offset] : null;
                return (
                  <span
                    key={`c-${row}-${c}`}
                    className="font-num grid h-5 place-items-center text-xs font-bold text-gray-600 dark:text-gray-300"
                  >
                    {value === null || value === 0 ? "" : value}
                  </span>
                );
              })}
            </div>
          ))}

          {/* Мөр бүр: зүүн талд тоонууд, дараа нь нүднүүд. */}
          {Array.from({ length: height }, (_, r) => (
            <div key={`row-${r}`} className="contents">
              {Array.from({ length: clueCols }, (_, col) => {
                const runs = clues.rows[r];
                const offset = clueCols - runs.length;
                const value = col >= offset ? runs[col - offset] : null;
                return (
                  <span
                    key={`rc-${r}-${col}`}
                    className="font-num grid h-7 place-items-center text-xs font-bold text-gray-600 dark:text-gray-300"
                  >
                    {value === null || value === 0 ? "" : value}
                  </span>
                );
              })}

              {Array.from({ length: width }, (_, c) => {
                const index = r * width + c;
                const isFilled = filled.has(index);
                const isMarked = marked.has(index);

                return (
                  <button
                    key={`cell-${index}`}
                    type="button"
                    onClick={() => tap(index)}
                    disabled={done}
                    aria-label={`${r + 1}-р мөр, ${c + 1}-р багана`}
                    /*
                      ⚠ Тав дахь нүд бүрд зузаан зураас: 10×10 торонд нүд
                      тоолохоо больж, «хэддэх багана вэ» гэдэг нь харагдахаа
                      болино.
                    */
                    className={`grid size-7 place-items-center rounded-[3px] transition-colors ${
                      isFilled
                        ? "bg-gray-800 dark:bg-gray-100"
                        : "bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20"
                    } ${c % 5 === 0 && c > 0 ? "ml-1" : ""} ${r % 5 === 0 && r > 0 ? "mt-1" : ""}`}
                  >
                    {isMarked && !isFilled && (
                      <X className="size-3.5 text-gray-400" aria-hidden />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setTool("fill")}
          disabled={done}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            tool === "fill"
              ? "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
          }`}
        >
          <Paintbrush className="size-4" aria-hidden />
          Будах
        </button>
        <button
          type="button"
          onClick={() => setTool("mark")}
          disabled={done}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
            tool === "mark"
              ? "bg-brand-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
          }`}
        >
          <X className="size-4" aria-hidden />
          Хоосон гэж тэмдэглэх
        </button>
        {(filled.size > 0 || marked.size > 0) && !done && (
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

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        Тоонууд нь тухайн мөр/баганад дараалан будагдах нүднүүдийн БҮЛГИЙН урт.
        Бүлэг хооронд дор хаяж нэг хоосон нүд байна.
      </p>
    </div>
  );
}
