"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FlipHorizontal, RotateCw, Undo2 } from "lucide-react";

import {
  cellKey,
  decodeTangram,
  isSolved,
  orientedCells,
  PIECE_COLORS,
  PIECE_IDS,
  placedCells,
  type Figure,
  type PieceId,
  type Placement,
} from "@/lib/puzzles/tangram";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "tangram" дасгал — долоон хэсгээр дүрсийг нөхнө.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад ЧИРЭХ БИШ, ДАРАХ вэ: SVG дээр чирэх нь гар
 * утсан дээр хуруу гулсахад хуудас өөрөө гүйлгэгдэх, хэсэг санамсаргүй
 * унах зэрэг олон эвгүй тохиолдол үүсгэдэг. Дарж сонгоод дарж тавих нь
 * ижил ажлыг АЛДААГҮЙ гүйцэтгэнэ — тортонд наалддаг тул нарийвчлал ч
 * шаардахгүй.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — хугацаа нь ЗӨВХӨН ХЭМЖИНЭ. Дуусахад дасгал унадаг
 * болговол бага насны сурагч яаран таамаглаж эхэлдэг ба танграмын гол
 * ач холбогдол (тайван орон зайн сэтгэлгээ) алдагдана.
 */

const SQUARE = 34;

/** Нүдний гурвалжныг SVG цэгүүд болгоно. */
function cellPoints(c: number, r: number, d: number): string {
  const cx = (c + 0.5) * SQUARE;
  const cy = (r + 0.5) * SQUARE;
  const x0 = c * SQUARE;
  const y0 = r * SQUARE;
  const x1 = (c + 1) * SQUARE;
  const y1 = (r + 1) * SQUARE;

  const edge =
    d === 0 ? [x0, y0, x1, y0]
    : d === 1 ? [x1, y0, x1, y1]
    : d === 2 ? [x1, y1, x0, y1]
    : [x0, y1, x0, y0];

  return `${edge[0]},${edge[1]} ${edge[2]},${edge[3]} ${cx},${cy}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TangramExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const figure = useMemo(() => decodeTangram(exercise.grid), [exercise.grid]);

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<PieceId | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const done = feedback !== null;

  /**
   * ⚠ Цаг нь ЗӨВХӨН ХЭМЖИХ зорилготой тул дууссаны дараа зогсоно —
   * эс бөгөөс дасгалаа бодож дууссан сурагч дэлгэц дээр цаг үргэлжлэн
   * явж байгааг харж «би удсан юм болов уу» гэж эргэлзэнэ.
   */
  const solvedRef = useRef(false);
  useEffect(() => {
    if (done || solvedRef.current) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [done]);

  if (!figure) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ дүрс буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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

  const used = new Set(placements.map((p) => p.piece));
  const remaining = PIECE_IDS.filter((piece) => !used.has(piece));

  /** Тавьсан хэсгүүдийн эзэлсэн нүднүүд — давхцлыг шалгахад. */
  const occupied = new Map<string, PieceId>();
  for (const placement of placements) {
    for (const x of placedCells(placement)) occupied.set(cellKey(x.c, x.r, x.d), placement.piece);
  }

  const commit = (next: Placement[]) => {
    setPlacements(next);
    if (isSolved(figure, next)) {
      solvedRef.current = true;
      onAnswer(true);
    }
  };

  const tapSquare = (c: number, r: number) => {
    if (done) return;

    // Тухайн дөрвөлжинд хэсэг байвал түүнийг АВНА (буцааж сан руу).
    const hit = [0, 1, 2, 3]
      .map((d) => occupied.get(cellKey(c, r, d)))
      .find((piece): piece is PieceId => piece !== undefined);

    if (hit) {
      commit(placements.filter((p) => p.piece !== hit));
      setSelected(hit);
      return;
    }

    if (!selected) return;

    const candidate: Placement = { piece: selected, c, r, orientation: { rotation, flipped } };
    const cells = placedCells(candidate);

    // Хөлгөөс гарах, эсвэл өөр хэсэгтэй давхцах бол ТАВИХГҮЙ.
    if (cells.some((x) => x.c < 0 || x.r < 0 || x.c >= figure.width || x.r >= figure.height)) return;
    if (cells.some((x) => occupied.has(cellKey(x.c, x.r, x.d)))) return;

    commit([...placements, candidate]);
    setSelected(null);
    setRotation(0);
    setFlipped(false);
  };

  const reset = () => {
    setPlacements([]);
    setSelected(null);
    setRotation(0);
    setFlipped(false);
  };

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <span className="font-num shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-gray-700 dark:bg-white/10 dark:text-gray-200">
          {formatTime(seconds)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${figure.width * SQUARE} ${figure.height * SQUARE}`}
          className="mx-auto block h-auto w-full max-w-md touch-manipulation"
          role="img"
          aria-label="Нөхөх дүрс"
        >
          {/* Нөхөх ёстой талбай — бүдэг дэвсгэр. */}
          {[...figure.cells].map((key) => {
            const [c, r, d] = key.split(",").map(Number);
            return (
              <polygon
                key={`t-${key}`}
                points={cellPoints(c, r, d)}
                className="fill-gray-300 dark:fill-white/15"
              />
            );
          })}

          {/* Тавьсан хэсгүүд. */}
          {placements.map((placement) =>
            placedCells(placement).map((x) => (
              <polygon
                key={`p-${placement.piece}-${x.c},${x.r},${x.d}`}
                points={cellPoints(x.c, x.r, x.d)}
                fill={PIECE_COLORS[placement.piece]}
                stroke={PIECE_COLORS[placement.piece]}
                strokeWidth={1}
              />
            ))
          )}

          {/* Дарах талбай — дөрвөлжин тутамд нэг. */}
          {Array.from({ length: figure.height }, (_, r) =>
            Array.from({ length: figure.width }, (_, c) => (
              <rect
                key={`h-${c}-${r}`}
                x={c * SQUARE}
                y={r * SQUARE}
                width={SQUARE}
                height={SQUARE}
                fill="transparent"
                className={done ? "" : "cursor-pointer"}
                onClick={() => tapSquare(c, r)}
              />
            ))
          )}
        </svg>
      </div>

      {/* Сонгосон хэсгийн урьдчилсан харагдац ба эргүүлэх товчнууд. */}
      {selected && !done && (
        <div className="flex items-center justify-center gap-3">
          <svg viewBox="0 0 140 70" className="h-14 w-28" aria-hidden>
            {orientedCells(selected, { rotation, flipped }).map((x) => (
              <polygon
                key={`s-${x.c},${x.r},${x.d}`}
                points={cellPoints(x.c, x.r, x.d)}
                fill={PIECE_COLORS[selected]}
                stroke={PIECE_COLORS[selected]}
                strokeWidth={1}
              />
            ))}
          </svg>
          <button
            type="button"
            onClick={() => setRotation((value) => (value + 1) % 4)}
            aria-label="Эргүүлэх"
            className="grid size-11 place-items-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
          >
            <RotateCw className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setFlipped((value) => !value)}
            aria-label="Толин тусгал"
            className="grid size-11 place-items-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
          >
            <FlipHorizontal className="size-5" aria-hidden />
          </button>
        </div>
      )}

      {/* Үлдсэн хэсгүүд. */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {remaining.map((piece) => (
          <button
            key={piece}
            type="button"
            onClick={() => {
              setSelected(piece);
              setRotation(0);
              setFlipped(false);
            }}
            disabled={done}
            className={`rounded-xl border-2 p-1 transition-colors ${
              selected === piece
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/15"
                : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
            }`}
          >
            <svg viewBox="0 0 140 70" className="h-10 w-16" aria-label={piece}>
              {orientedCells(piece, { rotation: 0, flipped: false }).map((x) => (
                <polygon
                  key={`r-${piece}-${x.c},${x.r},${x.d}`}
                  points={cellPoints(x.c, x.r, x.d)}
                  fill={PIECE_COLORS[piece]}
                  stroke={PIECE_COLORS[piece]}
                  strokeWidth={1}
                />
              ))}
            </svg>
          </button>
        ))}

        {placements.length > 0 && !done && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <Undo2 className="size-4" aria-hidden />
            Эхнээс
          </button>
        )}
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        {selected
          ? "Хөлөг дээр дарж тавь. Эргүүлэх, толирдуулах товч дээр байна."
          : remaining.length === 0
            ? "Бүх хэсэг тавигдсан — зөв байрлуулбал дуусна."
            : "Хэсэг сонгоод хөлөг дээр дар. Тавьсан хэсгийг дарвал буцаж авна."}
      </p>
    </div>
  );
}
