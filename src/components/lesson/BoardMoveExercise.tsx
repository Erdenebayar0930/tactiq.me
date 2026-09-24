"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

import { resolveMove } from "@/lib/chess/utils";
import { ChessBoard, mentionsSquare } from "@/components/chess/ChessBoard";
import { PromotionPicker } from "@/components/chess/PromotionPicker";

import type { Color, Move, PieceSymbol, Square } from "chess.js";
import type { Exercise } from "@/lib/tactiq/courses";

/** Буруу нүүдлийг хөлөг дээр хэдэн мс харуулаад буцаах вэ. */
const MISTAKE_UNDO_MS = 700;

/**
 * "board-move" дасгал — сурагч ЖИНХЭНЭ хөлөг дээр гараараа зөв нүүдлийг
 * хийнэ (сонголт огт харагдахгүй). `ChessBoard`-ыг `/play/bot`-той ижил
 * pointer-based харилцан үйлдэлтэйгээр л дахин ашигладаг.
 *
 * ⚠ АЛДАА ДАСГАЛЫГ ДУУСГАХГҮЙ. Буруу нүүдлийг хөлөг дээр түр харуулаад
 * БУЦААНА — сурагч ижил байрлал дээр дахин оролдоно (`onMistake`). Зөв
 * нүүдэл хийх хүртэл дараагийн дасгал руу шилжихгүй.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана —
 * `chess.js` (дүрмийн хөдөлгүүр) + энэ компонент ЗӨВХӨН `board-move`
 * дасгалтай хичээл дээр л татагдана, `choice`/`fill` гэх мэт бусад
 * төрлийн дасгал бүхий хичээл дээр огт ачаалагдахгүй.
 */
export default function BoardMoveExercise({
  exercise,
  feedback,
  onAnswer,
  onMistake,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
  onMistake?: () => void;
}) {
  const gameRef = useRef(new Chess(exercise.fen || undefined));
  const [version, forceUpdate] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  /** Буруу нүүдэл хийсэн — сануулга харуулна (дараагийн зөв нүүдэл хүртэл). */
  const [mistake, setMistake] = useState(false);
  /** Буруу нүүдлийг буцааж байх хооронд хөлгийг түгжинэ. */
  const [reverting, setReverting] = useState(false);
  /**
   * ХУВИРГАЛТЫН СОНГОЛТ ХҮЛЭЭГДЭЖ БАЙНА.
   *
   * ⚠ Нүүдлийг ЭНД ХИЙХГҮЙ, зөвхөн хадгална: сурагч дүрсээ сонгосны
   * дараа л хөлөг дээр буулгана. Эс бөгөөс бэрс болгоод дараа нь
   * солих гэсэн хоёр алхамт эвгүй урсгал үүснэ.
   */
  const [pending, setPending] = useState<{ from: Square; to: Square; color: Color } | null>(null);

  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (undoTimer.current !== null) clearTimeout(undoTimer.current);
    };
  }, []);

  const board = useMemo(
    () => gameRef.current.board(),
    // `version` зөвхөн "дахин тооцоол" гэсэн дохио — `gameRef` мутацлагддаг
    // тул бодит hook хамаарал биш (`/play/bot`-той ижил загвар).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  const handleMove = (from: Square, to: Square) => {
    if (feedback || reverting || pending) return;

    const chess = gameRef.current;
    const match = resolveMove(chess, from, to);
    if (!match) return;

    /*
     * ⚠ ХУВИРГАЛТ БОЛ СОНГОЛТ АСУУНА. `resolveMove` нь ямагт бэрсийг
     * буцаадаг — түүнийг шууд хийвэл сурагч тэрэг, тэмээ, морь сонгох
     * шатрын ДҮРМИЙГ хөлөг дээр хэрэгжүүлж чадахгүй.
     */
    if (match.promotion) {
      setPending({ from, to, color: match.color });
      return;
    }

    play(from, to, undefined);
  };

  /** Нүүдлийг хөлөг дээр буулгаж, зөв эсэхийг шалгана. */
  const play = (from: Square, to: Square, promotion: PieceSymbol | undefined) => {
    const chess = gameRef.current;
    const applied = chess.move({ from, to, promotion });
    if (!applied) return;

    setLastMove({ from, to });
    forceUpdate((v) => v + 1);

    const correct =
      from === exercise.correctFrom &&
      to === exercise.correctTo &&
      (exercise.correctPromotion ? applied.promotion === exercise.correctPromotion : true);

    if (!correct) {
      // Буруу нүүдлийг ХАРУУЛААД буцаана — юу хийснээ харж, ижил байрлал дээр дахин бодно.
      setMistake(true);
      setReverting(true);
      onMistake?.();
      undoTimer.current = setTimeout(() => {
        chess.undo();
        setLastMove(null);
        setReverting(false);
        forceUpdate((v) => v + 1);
      }, MISTAKE_UNDO_MS);
      return;
    }

    setMistake(false);
    onAnswer(true);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      {/*
        ⚠ `relative` — сонголтын цонх хөлгийн ДЭЭР бүрхэж гарна
        (`PromotionPicker` нь `absolute inset-0`).
      */}
      <div className="relative">
      <ChessBoard
        /* Нүдний нэр дурдсан дасгал дээр л координат харуулна. */
        coordinates={mentionsSquare(exercise.prompt)}
        board={board}
        orientation="white"
        interactive={feedback === null && !reverting && !pending}
        getLegalTargets={(square) =>
          (gameRef.current.moves({ square, verbose: true }) as Move[]).map(
            (move) => move.to as Square
          )
        }
        onMove={handleMove}
        lastMove={lastMove}
      />

      {pending && (
        <PromotionPicker
          color={pending.color}
          onPick={(piece) => {
            const { from, to } = pending;
            setPending(null);
            play(from, to, piece);
          }}
          onCancel={() => setPending(null)}
        />
      )}
      </div>

      {mistake && feedback === null && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            Энэ нүүдэл биш байна. Дахин бодоод үзээрэй.
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
