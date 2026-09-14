"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";

import {
  answerOf,
  decodeKids,
  isCorrect,
  isOrderPrefixValid,
} from "@/lib/puzzles/kids";
import { shapeOf } from "@/lib/puzzles/series";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "kids" дасгал (4-7 нас) — хараад зөвийг нь дар.
 *
 * Дөрвөн горим (`lib/puzzles/kids.ts`-ийн тайлбарыг үзнэ үү):
 *   count · size · same · order
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ⚠ УНШИХ ШААРДЛАГАГҮЙ: энэ насны хүүхэд бичиг уншдаггүй тул даалгавар нь
 * зургаараа ойлгогдох ёстой. Дэлгэц дээрх бичвэр нь зөвхөн хажууд сууж
 * буй том хүнд зориулагдсан.
 *
 * ⚠ ХҮРЭХ ТАЛБАЙ ТОМ: жижиг хуруу оносон газраа дардаггүй. Бүх сонголт
 * хамгийн багадаа 64px — нэг л удаа буруу дарах нь энэ насанд урам
 * хугалахад хангалттай.
 */

function Shape({ token, scale = 1 }: { token: string; scale?: number }) {
  const { shape, color } = shapeOf(token);
  const size = 48;
  const half = size / 2;
  const pad = 4 + (1 - scale) * 14;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="size-full" aria-hidden>
      {shape === "c" && <circle cx={half} cy={half} r={half - pad} fill={color} />}
      {shape === "s" && (
        <rect x={pad} y={pad} width={size - pad * 2} height={size - pad * 2} rx={5} fill={color} />
      )}
      {shape === "t" && (
        <polygon points={`${half},${pad} ${size - pad},${size - pad} ${pad},${size - pad}`} fill={color} />
      )}
      {shape === "d" && (
        <polygon points={`${half},${pad} ${size - pad},${half} ${half},${size - pad} ${pad},${half}`} fill={color} />
      )}
      {shape === "p" && (
        <polygon
          points={[0, 1, 2, 3, 4]
            .map((i) => {
              const angle = (Math.PI / 2.5) * i - Math.PI / 2;
              return `${half + Math.cos(angle) * (half - pad)},${half + Math.sin(angle) * (half - pad)}`;
            })
            .join(" ")}
          fill={color}
        />
      )}
    </svg>
  );
}

export default function KidsExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const kids = useMemo(() => decodeKids(exercise.grid), [exercise.grid]);

  const [picked, setPicked] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [wrong, setWrong] = useState(false);

  if (!kids) {
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

  const submit = (answer: string) => {
    if (done) return;
    setPicked(answer);
    if (isCorrect(kids, answer)) {
      setWrong(false);
      onAnswer(true);
    } else {
      setWrong(true);
    }
  };

  const tapNumber = (value: number) => {
    if (done || order.includes(value)) return;

    const next = [...order, value];
    setOrder(next);

    if (!isOrderPrefixValid(kids, next)) {
      setWrong(true);
      return;
    }
    setWrong(false);
    if (next.length === (kids.mode === "order" ? kids.numbers.length : 0)) {
      if (isCorrect(kids, next.join(","))) onAnswer(true);
    }
  };

  const retry = () => {
    setWrong(false);
    setPicked(null);
    setOrder([]);
  };

  const tile =
    "grid size-16 place-items-center rounded-2xl transition-colors sm:size-20";

  return (
    <div className="surface space-y-5 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      {/* --- Тоолох: дүрсүүд дээр, тоонууд доор --- */}
      {kids.mode === "count" && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-gray-50 p-5 dark:bg-white/5">
            {kids.shapes.map((token, index) => (
              <span key={index} className="size-14">
                <Shape token={token} />
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => submit(String(value))}
                disabled={done}
                className={`${tile} font-num text-3xl font-black ${
                  picked === String(value)
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </>
      )}

      {/* --- Хэмжээ: хамгийн томыг нь дар --- */}
      {kids.mode === "size" && (
        <div className="flex flex-wrap items-end justify-center gap-4">
          {kids.shapes.map((token, index) => (
            <button
              key={index}
              type="button"
              onClick={() => submit(String(index))}
              disabled={done}
              className={`grid place-items-center rounded-2xl p-2 transition-colors ${
                picked === String(index)
                  ? "bg-rose-100 dark:bg-rose-500/20"
                  : "hover:bg-gray-100 dark:hover:bg-white/10"
              }`}
              style={{ width: 40 + kids.sizes[index] * 22, height: 40 + kids.sizes[index] * 22 }}
              aria-label={`${index + 1}-р дүрс`}
            >
              <Shape token={token} />
            </button>
          ))}
        </div>
      )}

      {/* --- Ижил: дээр зорилт, доор сонголтууд --- */}
      {kids.mode === "same" && (
        <>
          <div className="mx-auto grid w-fit place-items-center rounded-2xl bg-gray-50 p-4 dark:bg-white/5">
            <span className="size-16">
              <Shape token={kids.target} />
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {kids.options.map((token, index) => (
              <button
                key={index}
                type="button"
                onClick={() => submit(String(index))}
                disabled={done}
                aria-label={`${index + 1}-р сонголт`}
                className={`${tile} p-2 ${
                  picked === String(index)
                    ? "bg-rose-100 dark:bg-rose-500/20"
                    : "bg-gray-100 hover:bg-gray-200 dark:bg-white/10"
                }`}
              >
                <Shape token={token} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* --- Дараалал: өсөхөөр дар --- */}
      {kids.mode === "order" && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {order.map((value) => (
              <span
                key={value}
                className="font-num grid size-12 place-items-center rounded-xl bg-brand-500 text-2xl font-black text-white"
              >
                {value}
              </span>
            ))}
            {Array.from({ length: kids.numbers.length - order.length }, (_, i) => (
              <span
                key={`slot-${i}`}
                className="grid size-12 place-items-center rounded-xl border-2 border-dashed border-gray-300 dark:border-white/15"
              />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {kids.numbers.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => tapNumber(value)}
                disabled={done || order.includes(value)}
                className={`${tile} font-num text-3xl font-black ${
                  order.includes(value)
                    ? "bg-gray-100 text-gray-300 dark:bg-white/5 dark:text-white/20"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </>
      )}

      {wrong && !done && (
        <div className="space-y-2 text-center">
          <p className="text-base font-semibold text-rose-600 dark:text-rose-400">
            Дахин оролдоё
          </p>
          <button
            type="button"
            onClick={retry}
            className="mx-auto flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
          >
            <RotateCcw className="size-4" aria-hidden />
            Дахин
          </button>
        </div>
      )}

      {/* ⚠ Зөв хариуг дасгал ДУУССАНЫ дараа л DOM-д гаргана. */}
      {done && feedback === "correct" && kids.mode === "count" && (
        <p className="text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          {answerOf(kids)} ширхэг
        </p>
      )}
    </div>
  );
}
