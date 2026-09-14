"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Delete, Eye, RotateCcw } from "lucide-react";

import {
  decodeRecall,
  isCorrect,
  isPrefixValid,
  showMs,
  type Recall,
} from "@/lib/puzzles/recall";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "recall" дасгал — богино үзүүлээд нуух, сурагч сэргээнэ.
 *
 * Гурван горим (`lib/puzzles/recall.ts`-ийн тайлбарыг үзнэ үү):
 *   • sequence — нүднүүд ЭЭЛЖЛЭН асна, ижил дарааллаар дарна
 *   • pattern  — нүднүүд ЗЭРЭГ асна, дараалал хамаагүй
 *   • digits   — цифрүүд харагдана, гараар бичнэ
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад «Харах» товчоор ЭХЛҮҮЛДЭГ вэ: дасгал нээгдмэгц
 * автоматаар үзүүлбэл сурагч дэлгэц рүү хараагүй, гар утсаа өргөж амжаагүй
 * байхад өнгөрч, хараагүй зүйлээ санах шаардлагатай болно. Эхлүүлэх
 * товч нь «би бэлэн» гэдгийг сурагч өөрөө хэлэх боломж.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — буруу даралтыг ТЭР ДОР НЬ хэлнэ. Бүгдийг оруулсны
 * дараа л «буруу» гэвэл хүүхэд аль нь буруу байсныг мэдэхгүй, зүгээр л
 * бүхэлд нь дахин цээжилнэ.
 */

type Phase = "ready" | "showing" | "recall" | "wrong";

export default function RecallExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const recall = useMemo(() => decodeRecall(exercise.grid), [exercise.grid]);

  const [phase, setPhase] = useState<Phase>("ready");
  /** `sequence` горимд одоо хэдэн дэх нүд асаж байна. */
  const [step, setStep] = useState(-1);
  const [cells, setCells] = useState<number[]>([]);
  const [typed, setTyped] = useState("");

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ⚠ Дасгалаас гарахад бүх таймерыг цэвэрлэнэ — эс бөгөөс дараагийн
  // дасгал дээр өмнөхийн таймер гал асааж, дэлгэц «өөрөө» анивчина.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (!recall) {
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

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const start = () => {
    clearTimers();
    setCells([]);
    setTyped("");
    setStep(-1);
    setPhase("showing");

    if (recall.mode === "sequence") {
      // Нүд бүрийг ээлжлэн асаана.
      const gap = 700;
      recall.cells.forEach((_, index) => {
        timers.current.push(setTimeout(() => setStep(index), index * gap));
        timers.current.push(setTimeout(() => setStep(-1), index * gap + gap * 0.65));
      });
      timers.current.push(
        setTimeout(() => setPhase("recall"), recall.cells.length * gap + 250)
      );
      return;
    }

    timers.current.push(setTimeout(() => setPhase("recall"), showMs(recall)));
  };

  const retry = () => {
    setPhase("ready");
    setCells([]);
    setTyped("");
  };

  const tapCell = (index: number) => {
    if (phase !== "recall" || done || recall.mode === "digits") return;

    const next = [...cells, index];
    setCells(next);

    if (!isPrefixValid(recall, next)) {
      setPhase("wrong");
      return;
    }
    if (isCorrect(recall, next)) onAnswer(true);
  };

  const tapDigit = (digit: string) => {
    if (phase !== "recall" || done || recall.mode !== "digits") return;

    const next = typed + digit;
    setTyped(next);

    if (next.length < recall.digits.length) return;
    if (isCorrect(recall, next)) onAnswer(true);
    else setPhase("wrong");
  };

  const size = recall.mode === "digits" ? 0 : recall.size;
  const lit = new Set<number>(
    phase !== "showing" || recall.mode === "digits"
      ? []
      : recall.mode === "pattern"
        ? recall.cells
        : step >= 0
          ? [recall.cells[step]]
          : []
  );
  const chosen = new Set(cells);

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      {recall.mode === "digits" ? (
        <div className="grid min-h-20 place-items-center rounded-2xl bg-gray-100 px-4 py-6 dark:bg-white/5">
          <span className="font-num text-4xl font-extrabold tracking-[0.3em] text-gray-900 dark:text-white">
            {phase === "showing" ? recall.digits : typed || "—"}
          </span>
        </div>
      ) : (
        <div
          className="mx-auto grid w-full max-w-xs gap-2"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: size * size }, (_, index) => {
            const isLit = lit.has(index);
            const isChosen = chosen.has(index);

            return (
              <button
                key={index}
                type="button"
                onClick={() => tapCell(index)}
                disabled={phase !== "recall" || done}
                aria-label={`${index + 1}-р нүд`}
                className={`aspect-square rounded-xl transition-colors ${
                  isLit
                    ? "bg-brand-500"
                    : isChosen
                      ? "bg-emerald-500"
                      : "bg-gray-200 dark:bg-white/10"
                } ${phase === "recall" && !done ? "hover:bg-gray-300 dark:hover:bg-white/20" : ""}`}
              />
            );
          })}
        </div>
      )}

      {phase === "ready" && !done && (
        <button
          type="button"
          onClick={start}
          className="mx-auto flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
        >
          <Eye className="size-5" aria-hidden />
          Харах
        </button>
      )}

      {phase === "showing" && (
        <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
          Санаж ав…
        </p>
      )}

      {phase === "recall" && recall.mode === "digits" && (
        <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => tapDigit(digit)}
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
            onClick={() => tapDigit("0")}
            className="font-num rounded-xl bg-gray-100 py-3 text-xl font-bold text-gray-800 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-100"
          >
            0
          </button>
        </div>
      )}

      {phase === "recall" && recall.mode !== "digits" && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {recall.mode === "sequence"
            ? "Асаж байсан ДАРААЛЛААР нь дар."
            : "Асаж байсан нүднүүдийг дар (дараалал хамаагүй)."}
        </p>
      )}

      {phase === "wrong" && !done && (
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Болсонгүй — дахин үзээд оролдоорой.
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
    </div>
  );
}
