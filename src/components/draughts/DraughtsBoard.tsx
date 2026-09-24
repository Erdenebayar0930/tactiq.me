"use client";

import { useEffect, useRef, useState } from "react";
import {
  BOARD_COORD,
  BOARD_DARK,
  BOARD_FRAME,
  BOARD_GRAIN,
  BOARD_LAST_MOVE,
  BOARD_LIGHT,
  BOARD_SIZE,
} from "@/lib/tactiq/boardTheme";
import { Crown } from "lucide-react";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { Board as DraughtsGrid, Color, Square } from "@/lib/draughts/engine";

/**
 * Дамын хөлөг — `ChessBoard.tsx`-тэй ИЖИЛ Pointer Events-д суурилсан
 * харилцан үйлдэл (тайлбарыг тэндээс үзнэ үү), 10x10 хэмжээ, зөвхөн бараан
 * 50 нүд идэвхтэй. Модны өнгө, судал `ChessBoard.tsx`-тэй ИЖИЛ (аппын нэг л
 * "гуалин хөлөг" харагдацыг хадгална).
 */

const SIZE = 10;

/**
 * Чирэлт гэж тооцох хамгийн бага хөдөлгөөн (px). Хуруугаар товшиход
 * хэдэн пиксел гулсах нь элбэг — түүнийг чирэлт гэж андуурахгүй.
 */
const DRAG_THRESHOLD = 6;

function isDark(row: number, col: number): boolean {
  return (row + col) % 2 === 1;
}

function sameSquare(a: Square, b: Square): boolean {
  return a.row === b.row && a.col === b.col;
}

const GRAIN: Record<"light" | "dark", string> = {
  light:
    "repeating-linear-gradient(100deg, rgba(90,55,20,0.035) 0px, rgba(90,55,20,0.035) 1px, transparent 1px, transparent 15px)",
  dark: "repeating-linear-gradient(100deg, rgba(0,0,0,0.07) 0px, rgba(0,0,0,0.07) 1px, transparent 1px, transparent 16px)",
};

const PIECE_LOOK: Record<Color, string> = {
  w: "bg-gradient-to-br from-[#fdfaf3] to-[#e2d3ab] border-2 border-[#c9b48a]",
  b: "bg-gradient-to-br from-[#4a463f] to-[#1c1a17] border-2 border-black/50",
};

/**
 * Гулсах хөдөлгөөний үргэлжлэх хугацаа (мс).
 *
 * ⚠ Хэт БОГИНО бол нүүдэл «гэнэт» болж, хүүхэд юу болсныг анзаарахгүй.
 * Хэт УРТ бол тоглоом удаашрч уйтгартай болно. 260мс нь нүдээр дагахад
 * хангалттай, гэхдээ хүлээлт мэдрэгдэхгүй завсар.
 */
const ANIM_MS = 260;

export function DraughtsBoard({
  board,
  orientation,
  interactive,
  getLegalTargets,
  onMove,
  lastMove,
  animate,
  onAnimationEnd,
}: {
  /** `Draughts.board()`-ийн гаралт — 10 мөр, мөр бүр 10 багана. */
  board: DraughtsGrid;
  orientation: "white" | "black";
  interactive: boolean;
  getLegalTargets: (square: Square) => Square[];
  onMove: (from: Square, to: Square) => void;
  lastMove?: { from: Square; to: Square } | null;
  /**
   * ГУЛСАХ ХӨДӨЛГӨӨН — ботын нүүдлийг харагдуулна.
   *
   * ⚠ ЗӨВХӨН БОТЫНХОД. Хүний нүүдэл нь чирэлтээр хийгддэг тул дүрс нь
   * аль хэдийн хүссэн газраа очсон байдаг — түүнийг дахин гулсуулбал
   * хоёр дахин хөдөлсөн мэт харагдана.
   *
   * ⚠ Нүүдэл нь аль хэдийн ХИЙГДСЭН байна (`board` шинэчлэгдсэн). Энэ нь
   * зөвхөн ХАРАГДАЦ: хөдөлгөөний туршид очих нүдэн дэх дүрсийг нуугаад,
   * оронд нь хөвөгч хуулбарыг гулсуулна.
   */
  animate?: { from: Square; to: Square } | null;
  onAnimationEnd?: () => void;
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [squareSize, setSquareSize] = useState(42);
  const boardRef = useRef<HTMLDivElement>(null);
  /**
   * Дарсан мөчийн байрлал — ТОВШИЛТ, ЧИРЭЛТ хоёрыг ялгана.
   *
   * ⚠ Дарахад шууд чирэлт эхлүүлдэг байхад товшилт бүрд дүрс нүднээсээ
   * алга болж, хуруун доор «үсэрдэг» байв. Одоо хуруу `DRAG_THRESHOLD`-оос
   * илүү хөдөлсөн үед л чирэлт эхэлнэ — түүнээс өмнө бол энгийн сонголт:
   * дүрс байрандаа үлдэж, очих нүднүүд нь тодорно, дараагийн товшилтоор нүүнэ.
   *
   * `wasSelected` — энэ дүрс дарахаас ӨМНӨ сонгогдсон байсан эсэх: дахин
   * товшвол сонголтыг цуцална.
   */
  const pressRef = useRef<{ x: number; y: number; wasSelected: boolean } | null>(null);
  /**
   * Хөдөлгөөний ЯВЦ: `false` = эхлэлийн нүдэнд, `true` = очих нүдэнд.
   *
   * ⚠ Хоёр ШАТ ЗААВАЛ: CSS шилжилт нь утга ӨӨРЧЛӨГДӨХӨД л ажилладаг.
   * Шууд очих байрлалаар зурвал шилжих зүйлгүй тул дүрс гэнэт гарч ирнэ.
   */
  const [animDone, setAnimDone] = useState(false);

  /**
   * НҮҮХ БОЛОМЖГҮЙ дүрс дээр дарсныг заах богино дохио.
   *
   * ⚠ Урьд нь ДУРЫН дүрсийг, тэр дундаа ӨРСӨЛДӨГЧИЙНХИЙГ ч сонгуулдаг
   * байв: дүрс шар тойрогт орно, гэтэл очих нүд байхгүй тул юу ч
   * болохгүй. Хүүхэд «хөлөг эвдэрсэн» гэж ойлгоно. Сонголтыг эхнээс нь
   * ЗӨВШӨӨРӨХГҮЙ, оронд нь тэр дүрсийг богинохон улаан цохиулна —
   * «энэ дүрсээр нүүхгүй» гэдгийг үггүйгээр хэлнэ.
   */
  const [refused, setRefused] = useState<Square | null>(null);

  const rowsOrder = orientation === "white" ? range() : range().reverse();
  const colsOrder = orientation === "white" ? range() : range().reverse();

  /*
   * ⚠ Хөдөлгөөн бүрийг ШИНЭЭР эхлүүлнэ: `animate` солигдоход төлөвөө
   * тэглэхгүй бол хоёр дахь нүүдэл нь аль хэдийн «дууссан» байрлалаас
   * эхэлж, огт хөдлөхгүй.
   */
  useEffect(() => {
    if (!animate) return;

    setAnimDone(false);
    const start = requestAnimationFrame(() => setAnimDone(true));
    const done = setTimeout(() => onAnimationEnd?.(), ANIM_MS);

    return () => {
      cancelAnimationFrame(start);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate?.from.row, animate?.from.col, animate?.to.row, animate?.to.col]);

  const reset = () => {
    setSelected(null);
    setLegalTargets([]);
    setDragPos(null);
    pressRef.current = null;
  };

  /* Дохиог өөрөө унтраана — дараагийн даралтад дахин асна. */
  useEffect(() => {
    if (!refused) return;
    const timer = setTimeout(() => setRefused(null), 500);
    return () => clearTimeout(timer);
  }, [refused]);

  const squareFromPoint = (x: number, y: number): Square | null => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-square]");
    if (!el) return null;
    const [row, col] = el.dataset.square!.split(",").map(Number);
    return { row, col };
  };

  /* ⚠ НҮД дээр барина, дүрс дээр БИШ — `ChessBoard.tsx`-ийн `onSquareDown`-ыг үзнэ үү. */
  const onSquareDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    square: Square,
    piece: DraughtsGrid[number][number]
  ) => {
    if (!interactive) return;

    if (selected && legalTargets.some((t) => sameSquare(t, square))) {
      onMove(selected, square);
      reset();
      return;
    }

    if (!piece) {
      reset();
      return;
    }

    /*
     * ⚠ ОЧИХ НҮД БАЙХГҮЙ бол СОНГОХГҮЙ. Энэ нь гурван тохиолдлыг нэг
     * дор барина: өрсөлдөгчийн дүрс, хаагдсан дүрс, мөн идэлт заавал
     * үед идэж чадахгүй өөрийн дүрс. Гурвуулаа «сонгогдчихоод хөдлөхгүй»
     * гэсэн ижил ГАЦАА үүсгэдэг байв.
     */
    const targets = getLegalTargets(square);
    if (targets.length === 0) {
      reset();
      setRefused(square);
      return;
    }

    pressRef.current = {
      x: event.clientX,
      y: event.clientY,
      wasSelected: Boolean(selected && sameSquare(selected, square)),
    };
    setSelected(square);
    setLegalTargets(targets);
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) setSquareSize(rect.width / SIZE);
    boardRef.current?.setPointerCapture(event.pointerId);
  };

  const onBoardMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    if (!dragPos) {
      if (!press) return;
      const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
      if (moved < DRAG_THRESHOLD) return;
    }
    setDragPos({ x: event.clientX, y: event.clientY });
  };

  const onBoardUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    pressRef.current = null;

    // Чирэлгүй ТОВШИЛТ: сонголт хэвээр үлдэнэ (очих нүдээ товшихыг хүлээнэ),
    // харин аль хэдийн сонгосон дүрсээ дахин товшсон бол сонголтыг цуцална.
    if (!dragPos) {
      if (press?.wasSelected) reset();
      return;
    }
    if (!selected) return;

    const target = squareFromPoint(event.clientX, event.clientY);
    if (target && legalTargets.some((t) => sameSquare(t, target))) {
      onMove(selected, target);
      reset();
      return;
    }

    setDragPos(null);
  };

  const draggedPiece = selected ? board[selected.row][selected.col] : null;

  /*
   * Гулсах дүрс ба түүний ОДООГИЙН байрлал.
   *
   * ⚠ Дүрсийг ОЧИХ нүднээс уншина: нүүдэл аль хэдийн хийгдсэн тул
   * эхлэлийн нүд ХООСОН. Даам болсон бол ч энэ нь зөв дүрсийг өгнө.
   */
  const animatedPiece = animate ? board[animate.to.row][animate.to.col] : null;
  const animSquare = animate ? (animDone ? animate.to : animate.from) : null;
  const animPoint = {
    x: animSquare
      ? (colsOrder.indexOf(animSquare.col) + 0.5) * squareSize - squareSize * 0.39
      : 0,
    y: animSquare
      ? (rowsOrder.indexOf(animSquare.row) + 0.5) * squareSize - squareSize * 0.39
      : 0,
  };

  /*
   * ⚠ ӨНДРӨӨР Ч ХЯЗГААРЛАНА, зөвхөн өргөнөөр биш.
   *
   * `max-w-[560px]` дангаараа ширээний компьютер дээр асуудал үүсгэдэг:
   * хөлөг 560px өндөр болж, дээр нь толгой (~90px), доор нь
   * дасгалжуулагчийн тайлбар (~100px) нэмэгдэхэд ноутбукийн дэлгэцэнд
   * БАГТАХГҮЙ — тоглогч хөлгөө харахын тулд гүйлгэх шаардлагатай болно.
   *
   * ⚠ `100dvh` нь хөтчийн мөрийг хассан ЖИНХЭНЭ өндөр (`100vh` нь гар
   * утсан дээр худал утга өгдөг).
   *
   * ⚠ 22rem нөөцлөв. Дээд талын мэдээллийг нягтруулсны дараа (буцах мөр
   * нэг мөр боллоо, тоглолтын толгой намссан) 26rem шаардлагагүй болсон
   * — тэр зай нь ХӨЛӨГТ очно.
   *
   * ⚠ Дээд хязгаарыг ч 560 → 620px болгов: өндөр дэлгэцэнд хөлөг
   * агуулгын баганыг бүтнээр эзлэх ёстой, тэр бол энэ дэлгэцийн гол
   * зүйл.
   */
  return (
    <div className={`relative mx-auto aspect-square select-none ${BOARD_SIZE} ${BOARD_FRAME}`}>
      <div
        ref={boardRef}
        onPointerMove={onBoardMove}
        onPointerUp={onBoardUp}
        /*
          ⚠ `pointercancel` ба `lostpointercapture` — шатрын хөлөгтэй
          ИЖИЛ шалтгаанаар (`components/chess/ChessBoard.tsx`): хөтөч
          чирэлтийг тасалбал `pointerup` ирэхгүй, дүрс хуруунд
          наалдаж, тэр нүд дүрсээ зурахаа болино — хөлөг гацна.
        */
        onPointerCancel={reset}
        onLostPointerCapture={() => setDragPos(null)}
        className="relative size-full touch-none overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgba(90,65,35,0.35)]"
      >
        <div className="grid size-full grid-cols-10 grid-rows-10">
          {rowsOrder.map((row) =>
            colsOrder.map((col) => {
              const square: Square = { row, col };
              const dark = isDark(row, col);
              const piece = dark ? board[row][col] : null;
              const isSelected = selected && sameSquare(selected, square);
              const isTarget = dark && legalTargets.some((t) => sameSquare(t, square));
              const isLastMove =
                dark && lastMove && (sameSquare(lastMove.from, square) || sameSquare(lastMove.to, square));
              const isDraggingThis = isSelected && dragPos;
              // Хөдөлгөөний туршид ОЧИХ нүдний дүрсийг нуулаа — хөвөгч
              // хуулбар нь тэр байрлал руу очиж байгаа.
              const isAnimTarget = Boolean(animate && sameSquare(animate.to, square));

              return (
                <div
                  key={`${row},${col}`}
                  data-square={dark ? `${row},${col}` : undefined}
                  onPointerDown={(event) => onSquareDown(event, square, piece)}
                  style={dark ? { backgroundImage: GRAIN.dark } : { backgroundImage: GRAIN.light }}
                  className={`relative flex items-center justify-center ${
                    dark ? BOARD_DARK : BOARD_LIGHT
                  } ${isTarget ? "cursor-pointer" : ""}`}
                >
                  {isLastMove && <div className={`absolute inset-0 ${BOARD_LAST_MOVE}`} />}

                  {isTarget && (
                    <div
                      className={`pointer-events-none absolute rounded-full ${
                        piece ? "inset-1 border-4 border-sky-500/70" : "size-1/3 bg-sky-500/50"
                      }`}
                    />
                  )}

                  {piece && !isDraggingThis && !isAnimTarget && (
                    <div
                      className={`relative flex size-[78%] items-center justify-center rounded-full ${
                        PIECE_LOOK[piece.color]
                      } ${interactive ? "cursor-grab active:cursor-grabbing" : ""} shadow-[0_2px_2px_rgba(0,0,0,0.35)]`}
                    >
                      {isSelected && (
                        <div className="pointer-events-none absolute -inset-1 rounded-full ring-[3px] ring-amber-400" />
                      )}
                      {refused && sameSquare(refused, square) && (
                        <div className="board-refuse pointer-events-none absolute -inset-1 rounded-full ring-[3px] ring-rose-500" />
                      )}
                      {piece.king && (
                        <Crown
                          className={piece.color === "w" ? "size-[45%] text-amber-600" : "size-[45%] text-amber-400"}
                          aria-hidden
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {dragPos && draggedPiece && (
          <FloatingPiece piece={draggedPiece} x={dragPos.x} y={dragPos.y} size={squareSize} />
        )}

        {/*
          ГУЛСАХ ДҮРС — хөлгийн ДОТОР, үнэмлэхүй байрлалаар.

          ⚠ `FloatingPiece` (чирэлтийнх) нь `position: fixed` бөгөөд
          хулганы координатаар явдаг. Энд харин хөлгийн нүднүүдийн
          байрлал хэрэгтэй тул тусдаа.
        */}
        {animate && animatedPiece && (
          <div
            className={`pointer-events-none absolute grid place-items-center rounded-full ${
              PIECE_LOOK[animatedPiece.color]
            } shadow-[0_2px_2px_rgba(0,0,0,0.35)]`}
            style={{
              width: squareSize * 0.78,
              height: squareSize * 0.78,
              left: animPoint.x,
              top: animPoint.y,
              transition: `left ${ANIM_MS}ms ease-in-out, top ${ANIM_MS}ms ease-in-out`,
            }}
          >
            {animatedPiece.king && (
              <Crown
                className={
                  animatedPiece.color === "w"
                    ? "size-[45%] text-amber-600"
                    : "size-[45%] text-amber-400"
                }
                aria-hidden
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function range(): number[] {
  return Array.from({ length: SIZE }, (_, i) => i);
}

function FloatingPiece({
  piece,
  x,
  y,
  size,
}: {
  piece: NonNullable<DraughtsGrid[number][number]>;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <div
      style={{ position: "fixed", left: x - size / 2, top: y - size / 2, width: size, height: size }}
      className="pointer-events-none z-50 flex scale-110 items-center justify-center"
    >
      <div
        className={`flex size-[78%] items-center justify-center rounded-full ${PIECE_LOOK[piece.color]} shadow-[0_3px_4px_rgba(0,0,0,0.45)]`}
      >
        {piece.king && (
          <Crown
            className={piece.color === "w" ? "size-[45%] text-amber-600" : "size-[45%] text-amber-400"}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
