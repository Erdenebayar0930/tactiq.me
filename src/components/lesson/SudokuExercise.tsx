"use client";

import { useMemo, useState } from "react";

import {
  boxDims,
  decodeSudoku,
  isPlacementValid,
  isSudokuComplete,
} from "@/lib/puzzles/sudoku";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "sudoku" дасгал — мөр, багана, хайрцаг бүрд тоо ДАВТАГДАХГҮЙ.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад зөрчлийг ШУУД улаанаар тэмдэглэдэг вэ:
 * Сонгодог судокуд алдаагаа хожим олдог ч, эхлэн суралцаж буй хүүхэд
 * алдаагаа 20 нүүдлийн дараа мэдвэл юуг нь буруу хийснээ эргүүлж олохгүй.
 * Шууд тэмдэглэх нь дүрмийг өөрийг нь заана — «энэ мөрөнд 3 аль хэдийн
 * байна» гэдгийг үг ашиглалгүй харуулна.
 */
export default function SudokuExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const sudoku = useMemo(() => decodeSudoku(exercise.grid), [exercise.grid]);

  const [cells, setCells] = useState<number[]>(() => sudoku?.givens.slice() ?? []);
  const [selected, setSelected] = useState<number | null>(null);

  if (!sudoku) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ судоку буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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

  const { size, givens } = sudoku;
  const { boxRows, boxCols } = boxDims(size);
  const filled = cells.filter((value) => value !== 0).length;

  const place = (value: number) => {
    if (feedback || selected === null) return;
    // Өгөгдсөн нүдийг ХЭЗЭЭ Ч засахгүй — тэдгээр нь бодлогын нөхцөл.
    if (givens[selected] !== 0) return;

    const next = [...cells];
    // Ижил тоог дахин дарвал арилгана — «баллуур» тусад нь хэрэггүй.
    next[selected] = next[selected] === value ? 0 : value;
    setCells(next);

    if (isSudokuComplete(size, next)) onAnswer(true);
  };

  const clearCell = () => {
    if (feedback || selected === null || givens[selected] !== 0) return;
    const next = [...cells];
    next[selected] = 0;
    setCells(next);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">
        Бөглөсөн: {filled}/{size * size}
      </p>

      <div
        className="mx-auto grid w-full max-w-xs overflow-hidden rounded-lg border-2 border-gray-800 dark:border-gray-300"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {cells.map((value, index) => {
          const row = Math.floor(index / size);
          const col = index % size;
          const isGiven = givens[index] !== 0;
          const isSelected = selected === index;

          // Зөрчилтэй нүд — тавьсан тоо нь дүрэм зөрчиж байна уу.
          const conflict = value !== 0 && !isPlacementValid({ size, cells }, index, value);

          /**
           * ХАЙРЦГИЙН ХИЛ — зузаан шугамаар. Үүнгүйгээр 6×6, 9×9 судоку нь
           * жигд тор болж, хайрцгийн дүрмийг нүдээр баримжаалах боломжгүй
           * болно (судокугийн гурван дүрмийн нэг нь харагдахгүй гэсэн үг).
           */
          const thickRight = (col + 1) % boxCols === 0 && col !== size - 1;
          const thickBottom = (row + 1) % boxRows === 0 && row !== size - 1;

          let tone = "bg-white text-brand-700 dark:bg-gray-50";
          if (isGiven) tone = "bg-gray-100 font-extrabold text-gray-900 dark:bg-gray-200";
          if (conflict) tone = "bg-rose-100 font-bold text-rose-700";
          if (isSelected) tone = `${tone} ring-2 ring-inset ring-brand-500`;

          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              disabled={feedback !== null}
              aria-label={`${row + 1}-р мөр, ${col + 1}-р багана`}
              className={`aspect-square border-gray-300 text-lg font-semibold transition-colors ${tone} ${
                thickRight ? "border-r-2 border-r-gray-800" : "border-r"
              } ${thickBottom ? "border-b-2 border-b-gray-800" : "border-b"}`}
            >
              {value === 0 ? "" : value}
            </button>
          );
        })}
      </div>

      {/* Тоо оруулах товчнууд — гар утсанд бодит гар гаргах нь дэлгэцийн
          хагасыг иддэг тул тусдаа самбар илүү тохиромжтой. */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {Array.from({ length: size }, (_, i) => i + 1).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => place(value)}
            disabled={feedback !== null || selected === null}
            className="h-11 w-11 rounded-xl bg-brand-500 text-lg font-bold text-white hover:bg-brand-600 disabled:opacity-40"
          >
            {value}
          </button>
        ))}
        <button
          type="button"
          onClick={clearCell}
          disabled={feedback !== null || selected === null}
          className="h-11 rounded-xl px-3 text-sm font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-400 dark:hover:bg-white/5"
        >
          Арилгах
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Нүдээ сонгоод тоог дарна. Мөр, багана, хайрцаг бүрд тоо давтагдахгүй.
      </p>
    </div>
  );
}
