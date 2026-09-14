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
  type PieceId,
  type Placement,
} from "@/lib/puzzles/tangram";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "tangram" дасгал — долоон хэсгийг ЧИРЖ дүрсийг нөхнө.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — ЧИРНЭ, гэхдээ ТОРТОНД НААЛДАНА. Хэсгийг хаана ч
 * тавьж болдог байвал «нөхөгдсөн эсэх» нь ойролцоо тооцоо болж, хүүхэд
 * зөв тавьсан ч «болоогүй» гэж хэлэгдэж мэднэ. Чирэх нь ЗӨВХӨН мэдрэмж
 * — тавихдаа хамгийн ойрын нүд рүү бүхэлд нь наана.
 *
 * ⚠ БҮХ ЗҮЙЛ НЭГ SVG ДОТОР: хөлөг дээр ба доорх САН дахь хэсгүүд ижил
 * координатын системд байна. Хоёр тусдаа элемент байвал хооронд нь чирэх
 * үед хулганы байрлалыг хоёр өөр системээс хөрвүүлэх шаардлагатай болж,
 * гар утсан дээр алдаа ихтэй болдог.
 *
 * ⚠ `touch-none`: эс бөгөөс хуруугаар чирэхэд хөлгийн оронд ХУУДАС
 * гүйлгэгдэнэ.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — хугацаа нь ЗӨВХӨН ХЭМЖИНЭ. Дуусахад дасгал унадаг
 * болговол бага насны сурагч яаран таамаглаж, танграмын гол ач
 * холбогдол (тайван орон зайн сэтгэлгээ) алдагдана.
 */

const SQUARE = 34;

/**
 * Сан дахь хэсгүүдийн ХУВААРЬ.
 *
 * ⚠ Бүтэн хэмжээгээр байрлуулах боломжгүй: том гурвалжин ганцаараа 4
 * дөрвөлжин өргөн тул долоон хэсэг нэг мөрөнд 16+ дөрвөлжин эзэлж, SVG
 * тэр өргөнд тааруулагдахад ХӨЛӨГ өчүүхэн жижиг харагдана. Хагас
 * хэмжээгээр, хоёр мөрөнд байрлуулбал сан нь хөлгийн өргөнтэй ойролцоо
 * болно.
 */
const TRAY_SCALE = 0.5;
const TRAY_PER_ROW = 4;
/** Нэг хэсэгт ногдох өргөн, өндөр — БҮТЭН хэмжээний дөрвөлжингөөр. */
const TRAY_SLOT_W = 2.3;
const TRAY_SLOT_H = 1.4;

type Drag = {
  piece: PieceId;
  /** Заагчийн цэгээс хэсгийн эх булан хүртэлх зөрүү (дөрвөлжингөөр). */
  dc: number;
  dr: number;
  /** Заагчийн одоогийн байрлал — SVG координат. */
  x: number;
  y: number;
};

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

  const svgRef = useRef<SVGSVGElement | null>(null);
  const solvedRef = useRef(false);

  const [placements, setPlacements] = useState<Placement[]>([]);
  const [active, setActive] = useState<PieceId | null>(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [seconds, setSeconds] = useState(0);

  const done = feedback !== null;

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

  const boardW = figure.width;
  const boardH = figure.height;
  const trayRows = Math.ceil(PIECE_IDS.length / TRAY_PER_ROW);
  const viewW = Math.max(boardW, TRAY_PER_ROW * TRAY_SLOT_W) * SQUARE;
  const viewH = (boardH + 0.6 + trayRows * TRAY_SLOT_H) * SQUARE;

  const placedBy = new Map(placements.map((p) => [p.piece, p]));
  const tray = PIECE_IDS.filter((piece) => !placedBy.has(piece) && piece !== drag?.piece);

  const occupied = new Map<string, PieceId>();
  for (const placement of placements) {
    for (const x of placedCells(placement)) occupied.set(cellKey(x.c, x.r, x.d), placement.piece);
  }

  /** Сан дахь хэсгийн эх булан — БҮТЭН хэмжээний дөрвөлжингөөр. */
  const traySlot = (index: number) => ({
    c: (index % TRAY_PER_ROW) * TRAY_SLOT_W + 0.15,
    r: boardH + 0.7 + Math.floor(index / TRAY_PER_ROW) * TRAY_SLOT_H,
  });

  const commit = (next: Placement[]) => {
    setPlacements(next);
    if (isSolved(figure, next)) {
      solvedRef.current = true;
      onAnswer(true);
    }
  };

  /** Дэлгэцийн цэгийг SVG координат руу. */
  const toSvg = (event: React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  };

  /**
   * @param fromTray Санаас эхэлж байна уу.
   *
   * ⚠ Санаас чирэхэд барих цэгийг ЯГ тооцох боломжгүй: сан нь жижигрүүлж
   * зурагддаг тул тэр цэг хөлгийн масштабт өөр газар унана. Иймд хэсгийг
   * заагчийн ТӨВД авчирна — урьдчилан таамаглах боломжтой, хуруугаар ч
   * тав тухтай.
   */
  const startDrag = (
    event: React.PointerEvent,
    piece: PieceId,
    originC: number,
    originR: number,
    fromTray: boolean
  ) => {
    if (done) return;
    const point = toSvg(event);
    if (!point) return;

    /*
     * ⚠ Capture-ыг ДАРСАН ЭЛЕМЕНТ дээр БИШ, SVG дээр тавина. Чирэх
     * эхлэхэд тухайн хэсэг санаас (эсвэл хөлгөөс) хасагддаг тул түүний
     * элемент DOM-оос алга болно — capture тэр дээр байвал хамт алдагдаж,
     * чирэлт дунд замдаа тасарна. SVG нь үргэлж байрандаа үлдэнэ.
     */
    svgRef.current?.setPointerCapture(event.pointerId);
    setActive(piece);

    // Хэсгийг хөлгөөс АВНА — чирч байх хугацаанд тэр нүднүүд суларна.
    if (placedBy.has(piece)) {
      const existing = placedBy.get(piece)!;
      setRotation(existing.orientation.rotation);
      setFlipped(existing.orientation.flipped);
      setPlacements((current) => current.filter((p) => p.piece !== piece));
    }

    let dc: number;
    let dr: number;

    if (fromTray) {
      const cells = orientedCells(piece, { rotation, flipped });
      dc = (Math.max(...cells.map((x) => x.c)) + 1) / 2;
      dr = (Math.max(...cells.map((x) => x.r)) + 1) / 2;
    } else {
      dc = point.x / SQUARE - originC;
      dr = point.y / SQUARE - originR;
    }

    setDrag({ piece, dc, dr, x: point.x, y: point.y });
  };

  const moveDrag = (event: React.PointerEvent) => {
    if (!drag) return;
    const point = toSvg(event);
    if (point) setDrag({ ...drag, x: point.x, y: point.y });
  };

  /** Чирэлтийн одоогийн байдлаар наалдах нүд. */
  const snapTarget = (): Placement | null => {
    if (!drag) return null;
    const c = Math.round(drag.x / SQUARE - drag.dc);
    const r = Math.round(drag.y / SQUARE - drag.dr);
    const candidate: Placement = {
      piece: drag.piece,
      c,
      r,
      orientation: { rotation, flipped },
    };

    const cells = placedCells(candidate);
    if (cells.some((x) => x.c < 0 || x.r < 0 || x.c >= boardW || x.r >= boardH)) return null;
    if (cells.some((x) => occupied.has(cellKey(x.c, x.r, x.d)))) return null;

    return candidate;
  };

  const endDrag = (event?: React.PointerEvent) => {
    if (event && svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
    if (!drag) return;
    const target = snapTarget();
    // ⚠ Тохирохгүй бол ХАЯХГҮЙ, санд буцаана — хүүхэд «хэсэг алга болов»
    // гэж сандрах ёсгүй.
    if (target) commit([...placements, target]);
    setDrag(null);
  };

  const reset = () => {
    setPlacements([]);
    setDrag(null);
    setActive(null);
    setRotation(0);
    setFlipped(false);
  };

  const preview = snapTarget();
  const orientation = { rotation, flipped };

  return (
    <div className="surface space-y-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <span className="font-num shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-sm font-bold text-gray-700 dark:bg-white/10 dark:text-gray-200">
          {formatTime(seconds)}
        </span>
      </div>

      <svg
        ref={svgRef}
        viewBox={`-4 -4 ${viewW + 8} ${viewH + 8}`}
        className="mx-auto block h-auto w-full max-w-lg touch-none select-none"
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="img"
        aria-label="Тангрaмын дүрс"
      >
        {/* Нөхөх дүрс. */}
        {[...figure.cells].map((key) => {
          const [c, r, d] = key.split(",").map(Number);
          return (
            <polygon
              key={`fig-${key}`}
              points={cellPoints(c, r, d)}
              className="fill-gray-300 dark:fill-white/15"
            />
          );
        })}

        {/* Наалдах байрлалын сүүдэр. */}
        {preview &&
          placedCells(preview).map((x) => (
            <polygon
              key={`pv-${x.c},${x.r},${x.d}`}
              points={cellPoints(x.c, x.r, x.d)}
              fill={PIECE_COLORS[preview.piece]}
              opacity={0.35}
            />
          ))}

        {/* Хөлөг дээрх хэсгүүд. */}
        {placements.map((placement) => (
          <g
            key={`pl-${placement.piece}`}
            className={done ? "" : "cursor-grab"}
            onPointerDown={(event) =>
              startDrag(event, placement.piece, placement.c, placement.r, false)
            }
          >
            {placedCells(placement).map((x) => (
              <polygon
                key={`${x.c},${x.r},${x.d}`}
                points={cellPoints(x.c, x.r, x.d)}
                fill={PIECE_COLORS[placement.piece]}
                stroke={PIECE_COLORS[placement.piece]}
                strokeWidth={1}
              />
            ))}
          </g>
        ))}

        {/* Сангийн зааг. */}
        <line
          x1={0}
          y1={(boardH + 0.3) * SQUARE}
          x2={viewW}
          y2={(boardH + 0.3) * SQUARE}
          className="stroke-gray-200 dark:stroke-white/10"
          strokeWidth={2}
        />

        {/* Сан дахь хэсгүүд. */}
        {tray.map((piece, index) => {
          const slot = traySlot(index);
          return (
            <g
              key={`tr-${piece}`}
              className={done ? "" : "cursor-grab"}
              transform={`translate(${slot.c * SQUARE} ${slot.r * SQUARE}) scale(${TRAY_SCALE})`}
              onPointerDown={(event) => startDrag(event, piece, slot.c, slot.r, true)}
            >
              {orientedCells(
                piece,
                piece === active ? orientation : { rotation: 0, flipped: false }
              ).map((x) => (
                <polygon
                  key={`${x.c},${x.r},${x.d}`}
                  points={cellPoints(x.c, x.r, x.d)}
                  fill={PIECE_COLORS[piece]}
                  stroke={PIECE_COLORS[piece]}
                  strokeWidth={1}
                  opacity={piece === active ? 1 : 0.85}
                />
              ))}
            </g>
          );
        })}

        {/* Чирэгдэж буй хэсэг — заагчийг дагана. */}
        {drag &&
          orientedCells(drag.piece, orientation).map((x) => (
            <polygon
              key={`dg-${x.c},${x.r},${x.d}`}
              points={cellPoints(
                x.c + drag.x / SQUARE - drag.dc,
                x.r + drag.y / SQUARE - drag.dr,
                x.d
              )}
              fill={PIECE_COLORS[drag.piece]}
              opacity={0.9}
              pointerEvents="none"
            />
          ))}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setRotation((value) => (value + 1) % 4)}
          disabled={done || !active}
          aria-label="Эргүүлэх"
          className="grid size-11 place-items-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:bg-white/10 dark:text-gray-200"
        >
          <RotateCw className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          disabled={done || !active}
          aria-label="Толин тусгал"
          className="grid size-11 place-items-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:bg-white/10 dark:text-gray-200"
        >
          <FlipHorizontal className="size-5" aria-hidden />
        </button>
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
        {active
          ? "Хэсгийг чирээд тавь. Эргүүлэх, толирдуулах товч дээр байна."
          : "Доорх хэсгийг чирж дүрс рүү тавь. Тавьсан хэсгийг дахин чирж болно."}
      </p>
    </div>
  );
}
