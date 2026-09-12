"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { decodeGo, parsePointList, play, pointLabel } from "@/lib/go/position";
import { GoBoard } from "@/components/go/GoBoard";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "go-move" дасгал — го-гийн хөлөг дээр ЗӨВ ОГТЛОЛЦОЛ дээр нэг чулуу тавина.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана
 * (бусад хөлөгт дасгалтай ижил шалтгаан).
 *
 * ЗӨВ ХАРИУЛТ НЬ ОЛОН БАЙЖ БОЛНО (`solution` = "E5 F5"): го-д ижил
 * зорилгод хүрэх тэгш хэмтэй хоёр цэг олонтаа тохиолддог тул зөвхөн НЭГ
 * цэгийг зөвшөөрвөл сурагч ЯГ ИЖИЛ САЙН нүүдэл хийгээд «буруу» гэсэн
 * хариу авна.
 *
 * Хууль бус нүүдэл (өөрийн бүлгээ амьсгалгүй болгох) хөдөлгүүр дээрээ
 * зогсоно — сурагч түүнийг «буруу хариулт» гэж тооцуулахгүй, зүгээр л
 * чулуу тавигдахгүй бөгөөд яагаадыг нь мессежээр хэлнэ.
 */
export default function GoMoveExercise({
  exercise,
  feedback,
  onAnswer,
  onMistake,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
  /** Буруу цэг — чулууг түр харуулаад авч, ижил байрлал дээр дахин оролдуулна. */
  onMistake?: () => void;
}) {
  const start = useMemo(() => decodeGo(exercise.grid), [exercise.grid]);
  const answers = useMemo(
    () => (start ? parsePointList(start.size, exercise.solution) : null),
    [start, exercise.solution]
  );

  const [position, setPosition] = useState(start);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [captured, setCaptured] = useState(0);
  const [illegal, setIllegal] = useState<string | null>(null);
  /** Буруу цэг сонгосон — сануулга (зөв цэг сонгох хүртэл). */
  const [mistake, setMistake] = useState(false);
  /** Буруу чулууг авч байх хооронд хөлгийг түгжинэ. */
  const [reverting, setReverting] = useState(false);

  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) clearTimeout(undoTimer.current);
    };
  }, []);

  if (!start || !answers || !position) {
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

  const handlePlay = (index: number) => {
    if (feedback || reverting) return;

    const result = play(position, index);
    if (!result) {
      setIllegal(
        `${pointLabel(position.size, index)} дээр тавьж болохгүй — тэнд чулуу тань амьсгалгүй үлдэнэ.`
      );
      return;
    }

    setIllegal(null);
    const before = position;
    const beforeLast = lastMove;
    setPosition(result.position);
    setLastMove(index);

    if (!answers.includes(index)) {
      // ⚠ Дасгал ДУУСАХГҮЙ: чулууг түр харуулаад авч, ижил байрлал дээр дахин оролдуулна.
      setMistake(true);
      setReverting(true);
      onMistake?.();
      undoTimer.current = setTimeout(() => {
        setPosition(before);
        setLastMove(beforeLast);
        setReverting(false);
      }, 700);
      return;
    }

    setMistake(false);
    setCaptured(result.captured.length);
    onAnswer(true);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <GoBoard
        position={position}
        interactive={feedback === null && !reverting}
        onPlay={handlePlay}
        lastMove={lastMove}
      />

      {illegal && !feedback && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {illegal}
        </p>
      )}

      {feedback === "correct" && captured > 0 && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          {captured} чулуу барилаа!
        </p>
      )}

      {mistake && feedback === null && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Энэ цэг биш байна. Дахин бодоод үзээрэй.
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
