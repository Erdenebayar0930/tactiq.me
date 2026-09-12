"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

import { ChessBoard } from "@/components/chess/ChessBoard";
import { parsePuzzle, puzzleGoalLabel, puzzleOrientation } from "@/lib/chess/puzzle";
import { findKingSquare, resolveMove } from "@/lib/chess/utils";

import type { Move, Square } from "chess.js";
import type { Exercise } from "@/lib/tactiq/courses";

/** Өрсөлдөгчийн хариу нүүдэл хэдэн мс-ийн дараа гарах вэ. */
const REPLY_DELAY_MS = 550;
/** Буруу нүүдлийг хөлөг дээр хэдэн мс харуулаад буцаах вэ. */
const MISTAKE_UNDO_MS = 700;

/**
 * "chess-puzzle" дасгал — ӨРӨГ БОДЛОГО ("2 нүүдэлд мад" гэх мэт).
 *
 * `board-move`-оос ЯЛГАА: тэр нь НЭГ нүүдэл шалгадаг бол энэ нь бүтэн
 * ШУГАМ — сурагч нүүдлээ хийхэд өрсөлдөгч нь хадгалсан хариугаа автоматаар
 * тоглож, сурагч дараагийн нүүдлээ хайна. Мад хийх хүртэл үргэлжилнэ.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад ГАНЦ шугам вэ:
 * Жинхэнэ өрөг бодлогод шийдэл нь ЦОРЫН ГАНЦ байдаг (композицийн үндсэн
 * шаардлага) тул нэг шугам хадгалах нь зөв. Харин "хамгийн сайн нүүдэл"
 * төрлийн тактикт өөр сайн нүүдэл байж болох тул багш аль шугамыг заахаа
 * өөрөө шийднэ — тэр нь `explanation` талбарт тайлбарлагдана.
 */
export default function ChessPuzzleExercise({
  exercise,
  feedback,
  onAnswer,
  onMistake,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
  /**
   * Буруу нүүдэл. ⚠ Бодлого ДУУСАХГҮЙ: буруу нүүдлийг түр харуулаад буцааж,
   * ЯГ ТЭР АЛХАМ дээр (өмнөх зөв нүүдлүүд хэвээр) дахин оролдуулна.
   */
  onMistake?: () => void;
}) {
  const puzzle = useMemo(
    () => parsePuzzle(exercise.fen, exercise.solution),
    [exercise.fen, exercise.solution]
  );

  const gameRef = useRef<Chess | null>(null);
  if (gameRef.current === null) {
    try {
      gameRef.current = new Chess(puzzle?.fen || exercise.fen || undefined);
    } catch {
      gameRef.current = new Chess();
    }
  }

  const [version, forceUpdate] = useState(0);
  /** Шийдлийн хэддэх хагас нүүдэл дээр явж байна вэ. */
  const [ply, setPly] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  /** Өрсөлдөгчийн хариуг хүлээж байх хооронд хөлгийг түгжинэ. */
  const [waiting, setWaiting] = useState(false);
  /** Энэ алхам дээр буруу нүүдэл хийсэн — сануулга (зөв нүүдэл хийх хүртэл). */
  const [mistake, setMistake] = useState(false);
  /** Буруу нүүдлийг буцааж байх хооронд хөлгийг түгжинэ. */
  const [reverting, setReverting] = useState(false);

  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (replyTimer.current !== null) clearTimeout(replyTimer.current);
    };
  }, []);

  const board = useMemo(
    () => gameRef.current!.board(),
    // `version` зөвхөн "дахин тооцоол" гэсэн дохио — `gameRef` мутацлагддаг
    // тул бодит hook хамаарал биш (`BoardMoveExercise`-тэй ижил загвар).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  /**
   * Бодлого эвдэрсэн (FEN эсвэл шугам буруу). Хоосон хөлөг үзүүлэхийн оронд
   * шалтгааныг хэлж, сурагчийг гацаанаас гаргана.
   */
  if (!puzzle) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ бодлогын шийдэл буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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

  const orientation = puzzleOrientation(puzzle.fen);
  const chess = gameRef.current!;

  const playReply = (nextPly: number) => {
    const reply = puzzle.moves[nextPly];
    if (!reply) return;

    setWaiting(true);
    replyTimer.current = setTimeout(() => {
      try {
        chess.move({
          from: reply.from,
          to: reply.to,
          promotion: reply.promotion ?? undefined,
        });
      } catch {
        // Шалгагдсан шугам тул энд хүрэх ёсгүй. Хэрэв хүрвэл бодлогыг
        // гацаахын оронд зөв гэж дуусгана — сурагч буруугүй.
        onAnswer(true);
        return;
      }

      setLastMove({ from: reply.from, to: reply.to });
      setPly(nextPly + 1);
      setWaiting(false);
      forceUpdate((v) => v + 1);
    }, REPLY_DELAY_MS);
  };

  const handleMove = (from: Square, to: Square) => {
    if (feedback || waiting || reverting) return;

    const match = resolveMove(chess, from, to);
    if (!match) return;

    const expected = puzzle.moves[ply];
    if (!expected) return;

    const correct =
      from === expected.from &&
      to === expected.to &&
      (expected.promotion ? match.promotion === expected.promotion : true);

    // Буруу нүүдлийг ч хөлөг дээр ҮЗҮҮЛНЭ — сурагч юу хийснээ хараад
    // яагаад болохгүйг өөрөө олж мэдэх боломжтой болно.
    const previousMove = lastMove;
    const applied = chess.move({ from, to, promotion: match.promotion });
    if (!applied) return;

    setLastMove({ from, to });
    forceUpdate((v) => v + 1);

    if (!correct) {
      // ЯГ ТЭР АЛХАМ дээр дахин оролдуулна: буруу нүүдлийг буцааж, `ply`-г хөндөхгүй.
      setMistake(true);
      setReverting(true);
      onMistake?.();
      replyTimer.current = setTimeout(() => {
        chess.undo();
        setLastMove(previousMove);
        setReverting(false);
        forceUpdate((v) => v + 1);
      }, MISTAKE_UNDO_MS);
      return;
    }

    setMistake(false);
    const nextPly = ply + 1;
    setPly(nextPly);

    // Шугам дууссан — бодлого бүтэн шийдэгдлээ.
    if (nextPly >= puzzle.moves.length) {
      onAnswer(true);
      return;
    }

    playReply(nextPly);
  };

  const kingSquare = chess.inCheck() ? findKingSquare(chess) : null;
  /** Сурагч хэддэх нүүдлээ хайж байна вэ (1-ээс эхэлсэн тоо). */
  const playerStep = Math.floor(ply / 2) + 1;

  return (
    <div className="surface space-y-4 p-5">
      <div>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
          {puzzleGoalLabel(puzzle)}
          {/* Олон нүүдэлт бодлогод явцыг хэлнэ — сурагч хэд үлдснийг мэдэхгүй
              бол "болсон уу?" гэж эргэлзэж, хөлөг рүү санамсаргүй дарж эхэлдэг. */}
          {puzzle.playerMoves > 1 && !feedback && (
            <span className="ml-2 font-medium text-gray-500 dark:text-gray-400">
              ({playerStep}/{puzzle.playerMoves} нүүдэл)
            </span>
          )}
        </p>
      </div>

      <ChessBoard
        board={board}
        orientation={orientation}
        interactive={!feedback && !waiting && !reverting}
        getLegalTargets={(square) =>
          (chess.moves({ square, verbose: true }) as Move[]).map((move) => move.to as Square)
        }
        onMove={handleMove}
        lastMove={lastMove}
        checkedSquare={kingSquare}
      />

      {waiting && (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Өрсөлдөгч хариулж байна…
        </p>
      )}

      {/*
        ⚠ ЗӨВ НҮҮДЛИЙГ ХАРУУЛАХГҮЙ. Сурагч ЯГ ТЭР АЛХАМ дээр дахин оролддог —
        шийдлийг бичвэл дахин бодохгүйгээр хуулна. Тайлбар нь сануулга болж үлдэнэ.
      */}
      {mistake && !feedback && (
        <>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Энэ нүүдэл биш байна. Дахин бодоод үзээрэй.
          </p>
          {exercise.explanation && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {exercise.explanation}
            </p>
          )}
        </>
      )}
    </div>
  );
}
