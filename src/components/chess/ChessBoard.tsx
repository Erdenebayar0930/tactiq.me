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

import type { PointerEvent as ReactPointerEvent } from "react";
import type { Color, PieceSymbol, Square } from "chess.js";

/**
 * Тоглоомын хөлөг — чирж хөдөлгөх (drag-and-drop) харилцан үйлдэлтэй.
 *
 * ⚠ Native HTML5 drag events (`draggable`) БИШ, Pointer Events дээр
 * барьсан — HTML5 DnD нь мобайл хөтчүүд дээр (Safari/Chrome touch)
 * ажилладаггүй. Pointer Events нь хулгана, хуруу хоёрыг ЯГ НЭГ кодын
 * замаар барина.
 *
 * ⚠ pointermove/pointerup сонсогчийг ХӨЛӨГ КОНТЕЙНЕР дээр (тогтмол,
 * хэзээ ч unmount болдоггүй элемент) барьсан, чирж буй дүрсний элемент дээр
 * БИШ — учир нь чирэлт эхэлмэгц эх нүдний дүрс нуугдаж, `FloatingPiece`
 * гэсэн ӨӨР элемент рүү шилждэг. Pointer capture-ыг тухайн (unmount
 * болдог) дүрс дээр авбал чирэлт дундаа тасардаг байсан — контейнер дээр
 * авснаар тогтвортой ажиллана.
 *
 * Даралт-суурьтай "товш, дараа нь товш" горимыг ч дэмждэг — чирэлт эхлээгүй
 * ч анх сонгосон нүд хадгалагдаад, дараагийн товшилтоор шилжинэ.
 */

/**
 * Чирэлт гэж тооцох хамгийн бага хөдөлгөөн (px). Хуруугаар товшиход
 * хэдэн пиксел гулсах нь элбэг — түүнийг чирэлт гэж андуурахгүй.
 */
const DRAG_THRESHOLD = 6;

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Хоёр талд ижил (дүүрэн) дүрсний хэлбэр ашиглаж, зөвхөн өнгөөр ялгана —
 * "цагаан" хувилбарын unicode тэмдэг фонт бүрт өөр өөрөөр (заримдаа зөвхөн
 * гадаад шугамаар) харагддаг, дүүрэн хувилбар бол хаана ч тогтвортой. */
const GLYPH: Record<PieceSymbol, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
  k: "♚",
};

export type BoardSquare = { type: PieceSymbol; color: Color } | null;

/**
 * Дүрсний харагдац — ЭНГИЙН, ЗӨӨЛӨН хавтгай өнгө (өмнө нь glossy градиент +
 * зузаан контур байсан нь хүүхдийн нүдэнд хэт "чанга"/эрчимтэй санагдсан тул
 * хассан). Дулаан цайвар (цагаан) ба зөөлөн бараан (хар) өнгө, нимгэн контур,
 * маш хөнгөн сүүдэртэй — унших/ялгахад хялбар хэвээрээ, гэхдээ тайван.
 */
const PIECE_LOOK: Record<Color, string> = {
  w: "text-[#fbf6ea] [-webkit-text-stroke:1px_rgba(94,68,38,0.5)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]",
  b: "text-[#33302b] [-webkit-text-stroke:1px_rgba(0,0,0,0.25)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]",
};

function squareToIndices(square: Square): { row: number; col: number } {
  const file = square.charCodeAt(0) - "a".charCodeAt(0);
  const rank = Number(square[1]);
  return { row: 8 - rank, col: file };
}

/**
 * Модны судал — нүд бүрийн ЯГ ИЖИЛ өнгөн дээр давхарлагдах ХЭТ ЗӨӨЛӨН хээ.
 * ⚠ Anti-tile: анх 7-8px давтамжтай, ил тод (0.07-0.16) зурвас байсан нь
 * нүд болгонд ижилхэн "судалтай хивс" мэт харагдаж, бодит модноос холдож
 * байсныг зурган ишлэлтэй харьцуулаад олж, ЭРС багасгасан (0.02-0.035,
 * 14-16px давтамж) — ойрхон харахад л мэдрэгдэх зэрэгт хүргэсэн.
 */

export function ChessBoard({
  board,
  orientation,
  interactive,
  getLegalTargets,
  onMove,
  lastMove,
  checkedSquare,
}: {
  /** `Chess.board()`-ийн гаралт — 8 мөр (8-р эгнээнээс 1-р эгнээ хүртэл), мөр бүр 8 багана (a-h) */
  board: BoardSquare[][];
  /** Аль тал доод талд байрлахыг тодорхойлно — тоглогч өөрийн дүрсийг доор харна */
  orientation: "white" | "black";
  /** Одоо чирэх боломжтой эсэх (миний ээлж, тоглоом дуусаагүй) */
  interactive: boolean;
  getLegalTargets: (square: Square) => Square[];
  onMove: (from: Square, to: Square) => void;
  lastMove?: { from: Square; to: Square } | null;
  /** Шахад орсон хааны нүд — улаан туяагаар тодотгоно */
  checkedSquare?: Square | null;
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  /** Чирэлт эхлэх мөчид хэмжинэ (event handler дотор — refs render үед уншиж болохгүй). */
  const [squareSize, setSquareSize] = useState(56);
  /**
   * НҮҮХ БОЛОМЖГҮЙ дүрс дээр дарсны дохио — `DraughtsBoard`-той ижил.
   *
   * ⚠ Урьд нь ӨРСӨЛДӨГЧИЙН дүрс ч сонгогдож, шар тойрогт ороод хөдлөхгүй
   * байв. Хүүхэд хөлгийг эвдэрсэн гэж ойлгоно. Сонголтыг зөвшөөрөхгүй,
   * оронд нь богинохон улаанаар цохиулна.
   */
  const [refused, setRefused] = useState<Square | null>(null);
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

  const rows = orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const cols = orientation === "white" ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const squareName = (row: number, col: number): Square => `${FILES[col]}${8 - row}` as Square;

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
    return (el?.dataset.square as Square | undefined) ?? null;
  };

  /*
   * ⚠ НҮД дээр барина, дүрс дээр БИШ: урьд нь зөвхөн дүрсний элемент
   * сонсдог байсан тул дүрс сонгоод ХООСОН нүд дарахад юу ч болдоггүй
   * байв — товшилт-товшилтоор зөвхөн идэх нүүдэл л ажилладаг байв.
   */
  const onSquareDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    square: Square,
    piece: BoardSquare
  ) => {
    if (!interactive) return;

    // Сонгосон дүрс аль хэдийн байгаа бөгөөд ЭНЭ нүд түүний зөвшөөрөгдсөн
    // очих газар бол — товшилт-товшилтоор шилжих (шинэ чирэлт эхлэхээс өмнө).
    if (selected && legalTargets.includes(square)) {
      onMove(selected, square);
      reset();
      return;
    }

    if (!piece) {
      reset();
      return;
    }

    /*
     * ⚠ ОЧИХ НҮД БАЙХГҮЙ бол СОНГОХГҮЙ: өрсөлдөгчийн дүрс, хөлддөг
     * (боож байгаа) дүрс, шад доор хаанаа хамгаалахаас өөр аргагүй үеийн
     * бусад дүрс — бүгд «сонгогдчихоод хөдлөхгүй» гэсэн ижил гацаа
     * үүсгэдэг байв.
     */
    const targets = getLegalTargets(square);
    if (targets.length === 0) {
      reset();
      setRefused(square);
      return;
    }

    pressRef.current = { x: event.clientX, y: event.clientY, wasSelected: selected === square };
    setSelected(square);
    setLegalTargets(targets);
    const rect = boardRef.current?.getBoundingClientRect();
    if (rect) setSquareSize(rect.width / 8);
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
    if (target && legalTargets.includes(target)) {
      onMove(selected, target);
      reset();
      return;
    }

    // Хоосон/буруу газар тавьсан — сонголтоо БАРИНА (товшилт-товшилтоор
    // үргэлжлүүлэх боломжтой байлгана), зөвхөн чирэлтийн "ghost"-ыг арилгана.
    setDragPos(null);
  };

  const draggedPiece = selected ? board[squareToIndices(selected).row][squareToIndices(selected).col] : null;

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
   * ⚠ НӨӨЦ нь ХУУДСААС ХАМААРНА, тиймээс `--board-reserve` хувьсагчаар
   * тохируулагддаг (анхдагч 22rem — тоглох дэлгэц). Хичээлийн дэлгэцэнд
   * толгой, явцын мөр, замын ДҮР, «Үргэлжлүүлэх» товч гэсэн дөрвөн
   * нэмэлт мөр байдаг тул тэр хуудас нь илүү их нөөц өгнө
   * (`learn/[lessonId]`). Хатуу 22rem байхад дүрийн толгой наалдсан
   * толгой мөрийн дор орж таслагдаж байв.
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
      {/* Мөрийн дугаар (1-8) — хүрээний баруун захад, хөлөгтэй ижил чиглэлтэй эргэдэг */}
      <div className={`pointer-events-none absolute inset-y-[4%] right-0 flex w-[4%] flex-col text-[2.4vw] font-semibold sm:text-xs ${BOARD_COORD}`}>
        {rows.map((row) => (
          <span key={row} className="flex flex-1 items-center justify-center">
            {8 - row}
          </span>
        ))}
      </div>
      {/* Баганын үсэг (a-h) — хүрээний доод захад */}
      <div className={`pointer-events-none absolute inset-x-[4%] bottom-0 flex h-[4%] text-[2.4vw] font-semibold sm:text-xs ${BOARD_COORD}`}>
        {cols.map((col) => (
          <span key={col} className="flex flex-1 items-center justify-center">
            {FILES[col]}
          </span>
        ))}
      </div>

      <div
        ref={boardRef}
        onPointerMove={onBoardMove}
        onPointerUp={onBoardUp}
        /*
          ⚠ `pointercancel` ба `lostpointercapture` ЗААВАЛ: хөтөч
          чирэлтийг ГАНЦААРАА тасалж болно — хуруу дэлгэцийн захаар
          хальтрах, хуудас гүйлгэх дохио танигдах, дуудлага ирэх,
          систем зураг дарах. Тэр үед `pointerup` ХЭЗЭЭ Ч ИРЭХГҮЙ.

          Зохицуулаагүй байхад: `dragPos` тогтож үлдэж, хөвөгч дүрс
          хуруунд наалдана. Түүнчлэн тэр нүд нь `isDraggingThis` тул
          дүрсээ ЗУРАХАА БОЛЬДОГ — дарах зорилтот хэсэг үгүй болж,
          хөлөг «гацсан» болно. Гарах цорын ганц зам нь хуудсыг дахин
          ачаалах байв.
        */
        onPointerCancel={reset}
        onLostPointerCapture={() => setDragPos(null)}
        /*
          ⚠ Дотоод хүрээ нь НИМГЭН, ЗӨӨЛӨН: хар 2px хүрээ нь цайвар
          хөлгийн зах дээр хар шугам болж, нүд татдаг байв.
        */
        className="relative size-full touch-none overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgba(90,65,35,0.35)]"
      >
        <div className="grid size-full grid-cols-8 grid-rows-8">
          {rows.map((row) =>
            cols.map((col) => {
              const square = squareName(row, col);
              const piece = board[row][col];
              const isLight = (row + col) % 2 === 0;
              const isSelected = selected === square;
              const isTarget = legalTargets.includes(square);
              const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
              const isChecked = checkedSquare === square;
              const isDraggingThis = isSelected && dragPos;

              return (
                <div
                  key={square}
                  data-square={square}
                  onPointerDown={(event) => onSquareDown(event, square, piece)}
                  style={{ backgroundImage: BOARD_GRAIN[isLight ? "light" : "dark"] }}
                  className={`relative flex items-center justify-center ${
                    isLight ? BOARD_LIGHT : BOARD_DARK
                  } ${isTarget ? "cursor-pointer" : ""}`}
                >
                  {isLastMove && <div className={`absolute inset-0 ${BOARD_LAST_MOVE}`} />}
                  {isChecked && <div className="absolute inset-0 bg-rose-500/60" />}

                  {isTarget && (
                    <div
                      className={`pointer-events-none absolute rounded-full ${
                        piece ? "inset-1 border-4 border-sky-500/70" : "size-1/3 bg-sky-500/50"
                      }`}
                    />
                  )}

                  {piece && !isDraggingThis && (
                    <div
                      className={`relative flex size-full items-center justify-center ${
                        interactive ? "cursor-grab active:cursor-grabbing" : ""
                      }`}
                    >
                      <div className="absolute bottom-[8%] h-[14%] w-[55%] rounded-full bg-black/20 blur-[2px]" />
                      {/* Сонгосон дүрс — цэнхэр дэвсгэрийн оронд алт өнгийн цагираг дүрсний эргэн тойронд */}
                      {refused === square && (
                        <div className="board-refuse pointer-events-none absolute inset-[6%] rounded-full ring-[3px] ring-rose-500" />
                      )}
                      {isSelected && (
                        <div className="pointer-events-none absolute inset-[6%] rounded-full ring-[3px] ring-amber-400 ring-offset-1 ring-offset-transparent" />
                      )}
                      <div
                        className={`relative text-[8vw] leading-none sm:text-5xl ${PIECE_LOOK[piece.color]}`}
                      >
                        {GLYPH[piece.type]}
                      </div>
                    </div>
                  )}
                  {isSelected && !piece && (
                    <div className="pointer-events-none absolute inset-[15%] rounded-full ring-[3px] ring-amber-400" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {dragPos && draggedPiece && (
          <FloatingPiece piece={draggedPiece} x={dragPos.x} y={dragPos.y} size={squareSize} />
        )}
      </div>
    </div>
  );
}

function FloatingPiece({
  piece,
  x,
  y,
  size,
}: {
  piece: NonNullable<BoardSquare>;
  x: number;
  y: number;
  size: number;
}) {
  return (
    <div
      style={{ position: "fixed", left: x - size / 2, top: y - size / 2, width: size, height: size }}
      className="pointer-events-none z-50 flex scale-110 items-center justify-center"
    >
      <div className={`text-[8vw] leading-none sm:text-5xl ${PIECE_LOOK[piece.color]}`}>
        {GLYPH[piece.type]}
      </div>
    </div>
  );
}
