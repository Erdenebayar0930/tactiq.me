"use client";

import { useMemo, useState } from "react";
import { Delete, RotateCcw } from "lucide-react";

import {
  answerOf,
  decodeSeries,
  isCorrect,
  shapeOf,
  shapeOptions,
  visibleItems,
} from "@/lib/puzzles/series";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "series" дасгал — эгнээний дутуу (эсвэл илүүц) гишүүнийг олно.
 *
 * Гурван горим (`lib/puzzles/series.ts`-ийн тайлбарыг үзнэ үү):
 *   • number — тоон эгнээ, хариуг гараар бичнэ
 *   • shape  — дүрсийн эгнээ, хариуг сонголтоос дарна
 *   • odd    — эгнээнээс илүүцийг нь дарна
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — ДҮРСИЙГ SVG-ЭЭР зурна, эможиор биш: төхөөрөмж бүр
 * эможиг өөрөөр зурдаг тул «энэ хоёр ижил үү» гэдэг нь нүдээр эргэлзээтэй
 * болдог. Хэлбэр, өнгийг өөрсдөө зурвал хаана ч ижил харагдана.
 */

const SHAPE_SIZE = 44;

function ShapeMark({ token, dim = false }: { token: string; dim?: boolean }) {
  const { shape, color } = shapeOf(token);
  const half = SHAPE_SIZE / 2;
  const pad = 5;

  const common = { fill: color, opacity: dim ? 0.35 : 1 };

  return (
    <svg viewBox={`0 0 ${SHAPE_SIZE} ${SHAPE_SIZE}`} className="size-full" aria-hidden>
      {shape === "c" && <circle cx={half} cy={half} r={half - pad} {...common} />}
      {shape === "s" && (
        <rect x={pad} y={pad} width={SHAPE_SIZE - pad * 2} height={SHAPE_SIZE - pad * 2} rx={4} {...common} />
      )}
      {shape === "t" && (
        <polygon points={`${half},${pad} ${SHAPE_SIZE - pad},${SHAPE_SIZE - pad} ${pad},${SHAPE_SIZE - pad}`} {...common} />
      )}
      {shape === "d" && (
        <polygon points={`${half},${pad} ${SHAPE_SIZE - pad},${half} ${half},${SHAPE_SIZE - pad} ${pad},${half}`} {...common} />
      )}
      {shape === "p" && (
        <polygon
          points={[0, 1, 2, 3, 4]
            .map((i) => {
              const angle = (Math.PI / 2.5) * i - Math.PI / 2;
              return `${half + Math.cos(angle) * (half - pad)},${half + Math.sin(angle) * (half - pad)}`;
            })
            .join(" ")}
          {...common}
        />
      )}
    </svg>
  );
}

export default function SeriesExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const series = useMemo(() => decodeSeries(exercise.grid), [exercise.grid]);

  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState(false);

  if (!series) {
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
  const items = visibleItems(series);

  const submit = (answer: string) => {
    if (done) return;
    setPicked(answer);

    if (isCorrect(series, answer)) {
      setWrong(false);
      onAnswer(true);
      return;
    }
    setWrong(true);
  };

  const retry = () => {
    setWrong(false);
    setTyped("");
    setPicked(null);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      {/* Эгнээ. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {items.map((item, index) => {
          const isBlank = item === null;
          const isOdd = series.mode === "odd";

          return (
            <button
              key={index}
              type="button"
              disabled={done || !isOdd}
              onClick={() => isOdd && submit(String(index))}
              aria-label={isBlank ? "Дутуу гишүүн" : `${index + 1}-р гишүүн`}
              className={`grid size-14 place-items-center rounded-xl transition-colors ${
                isBlank
                  ? "border-2 border-dashed border-brand-400 bg-brand-50 dark:bg-brand-500/10"
                  : "bg-gray-100 dark:bg-white/10"
              } ${
                isOdd && !done
                  ? picked === String(index)
                    ? "ring-2 ring-rose-400"
                    : "hover:bg-gray-200 dark:hover:bg-white/20"
                  : ""
              }`}
            >
              {isBlank ? (
                <span className="text-2xl font-black text-brand-500">?</span>
              ) : series.mode === "number" ? (
                <span className="font-num text-xl font-bold text-gray-800 dark:text-gray-100">
                  {item}
                </span>
              ) : (
                <span className="size-9">
                  <ShapeMark token={item} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Тоон горим — гар. */}
      {series.mode === "number" && !done && (
        <>
          <p className="text-center font-num text-2xl font-extrabold text-gray-900 dark:text-white">
            {typed || "—"}
          </p>
          <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => setTyped((value) => (value.length < 4 ? value + digit : value))}
                className="font-num rounded-xl bg-gray-100 py-3 text-xl font-bold text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTyped((value) => value.slice(0, -1))}
              aria-label="Устгах"
              className="grid place-items-center rounded-xl bg-gray-100 py-3 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300"
            >
              <Delete className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setTyped((value) => (value.length < 4 ? value + "0" : value))}
              className="font-num rounded-xl bg-gray-100 py-3 text-xl font-bold text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => typed && submit(typed)}
              disabled={!typed}
              className="rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-40"
            >
              Шалгах
            </button>
          </div>
        </>
      )}

      {/* Дүрсийн горим — сонголтууд. */}
      {series.mode === "shape" && !done && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {shapeOptions(series).map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => submit(token)}
              className={`grid size-14 place-items-center rounded-xl border-2 transition-colors ${
                picked === token
                  ? "border-rose-400"
                  : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              }`}
            >
              <span className="size-9">
                <ShapeMark token={token} />
              </span>
            </button>
          ))}
        </div>
      )}

      {wrong && !done && (
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Болсонгүй — эгнээний ХУУЛИЙГ дахин хар.
          </p>
          <button
            type="button"
            onClick={retry}
            className="mx-auto flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <RotateCcw className="size-4" aria-hidden />
            Дахин
          </button>
        </div>
      )}

      {!wrong && !done && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {series.mode === "odd"
            ? "Бусдаас ялгаатай гишүүнийг дар."
            : series.mode === "number"
              ? "Дутуу тоог олоод бич."
              : "Дутуу дүрсийг сонго."}
        </p>
      )}

      {/* ⚠ Зөв хариуг дасгал ДУУССАНЫ дараа л DOM-д гаргана. */}
      {done && feedback === "correct" && (
        <p className="text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Зөв: {series.mode === "odd" ? `${series.index + 1}-р гишүүн` : answerOf(series)}
        </p>
      )}
    </div>
  );
}
