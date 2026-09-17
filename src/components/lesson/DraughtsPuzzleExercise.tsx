"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Draughts } from "@/lib/draughts/engine";
import { deserializePosition, squareFromNumber } from "@/lib/draughts/notation";
import {
  draughtsPuzzleGoalLabel,
  parseDraughtsPuzzle,
  squareToNumber,
} from "@/lib/draughts/puzzle";
import {
  advanceChain,
  chainBoard,
  chainPosition,
  chainTargets,
  startChain,
} from "@/lib/draughts/chain";
import { DraughtsBoard } from "@/components/draughts/DraughtsBoard";

import type { ChainState } from "@/lib/draughts/chain";
import type { Square as DraughtsSquare } from "@/lib/draughts/engine";
import type { Exercise } from "@/lib/tactiq/courses";

/** Өрсөлдөгчийн албадмал хариу хэдэн мс-ийн дараа гарах вэ. */
const REPLY_DELAY_MS = 550;

/**
 * "draughts-puzzle" дасгал — ОЛОН НҮҮДЭЛТ цохилтын цуваа («тулгууртай
 * 2 нүүдлийн цохилт» гэх мэт).
 *
 * `draughts-move`-оос ЯЛГАА: тэр нь НЭГ нүүдэл шалгадаг бол энд сурагч
 * эхлээд ТУЛГУУР (ихэвчлэн дүрсээ өгөх) нүүдэл хийж, өрсөлдөгчийн
 * АЛБАДМАЛ хариу автоматаар тоглогдож, дараа нь цохилт нь гарна.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 */
export default function DraughtsPuzzleExercise({
  exercise,
  feedback,
  onAnswer,
  onMistake,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
  /**
   * Буруу нүүдэл. ⚠ Бодлого ДУУСАХГҮЙ: нүүдлийг хийлгэхгүй (даамын
   * хөдөлгүүр undo-гүй), ЯГ ТЭР АЛХАМ дээр дахин оролдуулна.
   */
  onMistake?: () => void;
}) {
  const puzzle = useMemo(
    () => parseDraughtsPuzzle(exercise.fen, exercise.solution),
    [exercise.fen, exercise.solution]
  );

  const gameRef = useRef<Draughts | null>(null);
  if (gameRef.current === null) {
    const setup = puzzle ? deserializePosition(puzzle.fen) : null;
    gameRef.current = new Draughts(setup ?? undefined);
  }

  const [version, forceUpdate] = useState(0);
  /** Шийдлийн хэддэх хагас нүүдэл дээр явж байна вэ. */
  const [ply, setPly] = useState(0);
  const [lastMove, setLastMove] = useState<{ from: DraughtsSquare; to: DraughtsSquare } | null>(
    null
  );
  /** Өрсөлдөгчийн хариуг хүлээх хооронд хөлгийг түгжинэ. */
  const [waiting, setWaiting] = useState(false);
  /** Энэ алхам дээр буруу нүүдэл оролдсон — сануулга (зөв нүүдэл хийх хүртэл). */
  const [mistake, setMistake] = useState(false);

  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (replyTimer.current !== null) clearTimeout(replyTimer.current);
    };
  }, []);

  /**
   * Хагас дууссан идэлтийн хэлхээ (`lib/draughts/chain.ts`).
   *
   * ⚠ Тааврын дундах идэлтүүд нь ХӨДӨЛГҮҮРТ хэрэгжихгүй — зөвхөн
   * харуулах хөлөгт. Буруу үргэлжлэл дарвал байрлал эргэж ирнэ.
   */
  const [chain, setChain] = useState<ChainState | null>(null);

  const board = useMemo(
    () => {
      const real = gameRef.current!.board();
      return chain ? chainBoard(real, chain) : real;
    },
    // `version` зөвхөн "дахин тооцоол" гэсэн дохио — `gameRef` мутацлагддаг
    // тул бодит hook хамаарал биш (`ChessPuzzleExercise`-тэй ижил загвар).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, chain]
  );

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

  const game = gameRef.current!;

  const playReply = (nextPly: number) => {
    const reply = puzzle.moves[nextPly];
    if (!reply) return;

    setWaiting(true);
    replyTimer.current = setTimeout(() => {
      const from = squareFromNumber(reply.from);
      const to = squareFromNumber(reply.to);

      if (!game.move(from, to)) {
        // Шалгагдсан шугам тул энд хүрэх ёсгүй. Хүрвэл сурагчийг гацаахын
        // оронд зөв гэж дуусгана — түүний буруу биш.
        onAnswer(true);
        return;
      }

      setLastMove({ from, to });
      setPly(nextPly + 1);
      setWaiting(false);
      forceUpdate((v) => v + 1);
    }, REPLY_DELAY_MS);
  };

  const handleMove = (from: DraughtsSquare, to: DraughtsSquare) => {
    if (feedback || waiting) return;

    const expected = puzzle.moves[ply];
    if (!expected) return;

    // ИДЭЛТ БҮРД ЗОГСОНО — `lib/draughts/chain.ts`-ийн тайлбарыг үзнэ үү.
    const step = chain ? advanceChain(chain, to) : startChain(game.movesFrom(from), from, to);

    // ⚠ Хууль бус даралт нь АЛДАА БИШ: сурагч зүгээр нэг нүд дарсан байж
    // мэднэ. Алдаа гэж тоолвол зүрх хэдхэн товшилтод дуусна.
    if (step.kind === "illegal") return;

    if (step.kind === "partial") {
      setChain(step.state);
      forceUpdate((v) => v + 1);
      return;
    }

    const move = step.move;
    const correct =
      squareToNumber(move.from) === expected.from && squareToNumber(move.to) === expected.to;

    /*
     * ⚠ Буруу нүүдлийг ХИЙЛГЭХГҮЙ: даамын хөдөлгүүр буцаах (undo) үйлдэлгүй
     * тул хийчихвэл ЯГ ТЭР АЛХАМ руу буцах арга байхгүй. Байрлал хэвээр
     * үлдэж, сурагч дахин оролдоно.
     */
    if (!correct) {
      setChain(null);
      setMistake(true);
      onMistake?.();
      forceUpdate((v) => v + 1);
      return;
    }

    // ⚠ `move(from, to)` БИШ: ижил эхлэл, төгсгөлтэй хоёр өөр хэлхээ
    // байж болох тул сурагч ЗУРСАН яг тэр хэлхээг хэрэгжүүлнэ.
    game.applyMove(move);

    setChain(null);
    setMistake(false);
    setLastMove({ from: move.from, to: move.to });
    forceUpdate((v) => v + 1);

    const nextPly = ply + 1;
    setPly(nextPly);

    if (nextPly >= puzzle.moves.length) {
      onAnswer(true);
      return;
    }

    playReply(nextPly);
  };

  /** Сурагч хэддэх нүүдлээ хайж байна вэ (1-ээс эхэлсэн тоо). */
  const playerStep = Math.floor(ply / 2) + 1;

  return (
    <div className="surface space-y-4 p-5">
      <div>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="mt-1 text-sm font-semibold text-brand-600 dark:text-brand-300">
          {draughtsPuzzleGoalLabel(puzzle)}
          {puzzle.playerMoves > 1 && !feedback && (
            <span className="ml-2 font-medium text-gray-500 dark:text-gray-400">
              ({playerStep}/{puzzle.playerMoves} нүүдэл)
            </span>
          )}
        </p>
      </div>

      <DraughtsBoard
        board={board}
        orientation="white"
        interactive={!feedback && !waiting}
        getLegalTargets={(square) => {
          // Хэлхээ дундуур — зөвхөн тэр дүрсийн дараагийн буултууд.
          if (chain) {
            const at = chainPosition(chain);
            return at.row === square.row && at.col === square.col ? chainTargets(chain) : [];
          }
          return game.movesFrom(square).map((move) => move.to);
        }}
        onMove={handleMove}
        lastMove={lastMove}
      />

      {chain && !feedback && (
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          Идэлт үргэлжилж байна — дараагийн нүдээ дар.
        </p>
      )}

      {waiting && (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          Өрсөлдөгч хариулж байна…
        </p>
      )}

      {mistake && !feedback && (
        <>
          {/* ⚠ Зөв нүүдлийг харуулахгүй — сурагч ЯГ ТЭР АЛХАМ дээр дахин оролдоно. */}
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
