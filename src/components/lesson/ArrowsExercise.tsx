"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Delete,
  Flag,
  Play,
  RotateCcw,
} from "lucide-react";

import {
  decodeArrows,
  isCorrect,
  MAX_STEPS,
  run,
  type Arrow,
} from "@/lib/puzzles/arrows";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "arrows" дасгал (4-7 нас) — сумаар зам угсарч зорилгод хүрнэ.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — программыг ШУУД биш, «Явуул» дарахад ажиллуулна.
 * Сум дарах бүрд дүр хөдөлдөг байвал энэ нь кодчилол биш, алсын удирдлага
 * болно. Эхлээд БҮТЭН төлөвлөгөө зохиож, дараа нь үр дүнг нь харах нь
 * «программ» гэж юу болохыг заана.
 *
 * ⚠ Хана мөргөвөл ЯГ ХААНА зогссоныг харуулна — «болсонгүй» гэж хэлэхийн
 * оронд хэддэх сум нь буруу байсныг тэмдэглэнэ.
 */

const ARROW_ICONS: Record<Arrow, typeof ArrowUp> = {
  U: ArrowUp,
  D: ArrowDown,
  L: ArrowLeft,
  R: ArrowRight,
};

export default function ArrowsExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const maze = useMemo(() => decodeArrows(exercise.grid), [exercise.grid]);

  const [program, setProgram] = useState<Arrow[]>([]);
  /** Ажиллуулсны дараах үр дүн — юүлэхэд `null`. */
  const [result, setResult] = useState<ReturnType<typeof run> | null>(null);

  if (!maze) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ дасгал буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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
  /** Ажиллуулсан бол дүр хаана зогссон, үгүй бол эхлэлд. */
  const at = result ? (result.path[result.path.length - 1] ?? maze.start) : maze.start;

  const add = (arrow: Arrow) => {
    if (done || program.length >= MAX_STEPS) return;
    setProgram((value) => [...value, arrow]);
    setResult(null);
  };

  const undo = () => {
    if (done) return;
    setProgram((value) => value.slice(0, -1));
    setResult(null);
  };

  const reset = () => {
    setProgram([]);
    setResult(null);
  };

  const play = () => {
    if (done || program.length === 0) return;
    const outcome = run(maze, program);
    setResult(outcome);
    if (isCorrect(maze, program)) onAnswer(true);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      {/* Хөлөг. */}
      <div
        className="mx-auto grid w-fit gap-1.5"
        style={{ gridTemplateColumns: `repeat(${maze.cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: maze.cols * maze.rows }, (_, index) => {
          const isWall = maze.walls[index];
          const isGoal = index === maze.goal;
          const isHere = index === at;
          const visited = result?.path.includes(index) ?? false;

          return (
            <div
              key={index}
              className={`grid size-14 place-items-center rounded-xl ${
                isWall
                  ? "bg-gray-400 dark:bg-white/30"
                  : isHere
                    ? "bg-brand-500"
                    : visited
                      ? "bg-brand-100 dark:bg-brand-500/20"
                      : "bg-gray-100 dark:bg-white/10"
              }`}
            >
              {isHere && <span className="text-2xl">🐣</span>}
              {isGoal && !isHere && <Flag className="size-6 text-emerald-600" aria-hidden />}
            </div>
          );
        })}
      </div>

      {/* Угсарсан программ. */}
      <div className="flex min-h-12 flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-gray-50 p-2 dark:bg-white/5">
        {program.length === 0 ? (
          <span className="text-sm text-gray-400">Сумаа дарж зам зохио</span>
        ) : (
          program.map((arrow, index) => {
            const Icon = ARROW_ICONS[arrow];
            const blocked = result?.blockedAt === index;
            return (
              <span
                key={index}
                className={`grid size-9 place-items-center rounded-lg ${
                  blocked ? "bg-rose-500 text-white" : "bg-brand-500 text-white"
                }`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
            );
          })
        )}
      </div>

      {/* Сумнууд. */}
      {!done && (
        <>
          <div className="mx-auto grid w-fit grid-cols-3 gap-2">
            <span />
            <button
              type="button"
              onClick={() => add("U")}
              aria-label="Дээш"
              className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
            >
              <ArrowUp className="size-7" aria-hidden />
            </button>
            <span />
            <button
              type="button"
              onClick={() => add("L")}
              aria-label="Зүүн"
              className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
            >
              <ArrowLeft className="size-7" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => add("D")}
              aria-label="Доош"
              className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
            >
              <ArrowDown className="size-7" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => add("R")}
              aria-label="Баруун"
              className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
            >
              <ArrowRight className="size-7" aria-hidden />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={play}
              disabled={program.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 font-bold text-white hover:bg-brand-600 disabled:opacity-40"
            >
              <Play className="size-5" aria-hidden />
              Явуул
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={program.length === 0}
              aria-label="Нэг сум буцаах"
              className="grid size-11 place-items-center rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-white/15 dark:text-gray-300"
            >
              <Delete className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={program.length === 0}
              aria-label="Эхнээс"
              className="grid size-11 place-items-center rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-white/15 dark:text-gray-300"
            >
              <RotateCcw className="size-5" aria-hidden />
            </button>
          </div>
        </>
      )}

      {result && !result.reachedGoal && !done && (
        <p className="text-center text-base font-semibold text-rose-600 dark:text-rose-400">
          {result.blockedAt !== null
            ? `${result.blockedAt + 1}-р сум дээр хана таарлаа`
            : "Тугтай нүд рүү хүрсэнгүй"}
        </p>
      )}
    </div>
  );
}
