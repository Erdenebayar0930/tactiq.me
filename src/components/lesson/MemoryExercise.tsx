"use client";

import { useEffect, useRef, useState } from "react";

import { makeRng, seedFromString } from "@/lib/net/puzzle";
import { dealMemory, decodeMemory, memoryColumns } from "@/lib/puzzles/memory";

import type { MemoryCard } from "@/lib/puzzles/memory";
import type { Exercise } from "@/lib/tactiq/courses";

/** Тохирохгүй хос хэдэн мс харагдаад хаагдах вэ. */
const PEEK_MS = 900;

/**
 * "memory-game" дасгал — хөзрүүдийг эргүүлж ижил хосыг олно.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — буруу хос нь АЛДАА БИШ:
 * Санах ойн тоглоомд буруу нээлт бол мэдээлэл цуглуулах ХЭВИЙН алхам —
 * тэр хөзөр хаана байгааг сурагч тэндээс сурна. Тиймээс дасгал зөвхөн
 * амжилтаар дуусах ба алдааны тоо биш, НЭЭЛТИЙН тоо л харагдана.
 */
export default function MemoryExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const deck = decodeMemory(exercise.grid);

  /**
   * Тавцанг дасгалын ID-гаар ҮРЛЭЖ холино — хуудсыг сэргээхэд ижил байрлал
   * гарна (`lib/puzzles/memory.ts`-ийн `dealMemory` тайлбарыг үзнэ үү).
   */
  const [cards] = useState<MemoryCard[]>(() =>
    deck ? dealMemory(deck, makeRng(seedFromString(exercise.id))) : []
  );

  /** Одоо нээлттэй байгаа (хараахан тохироогүй) хөзрүүд. */
  const [open, setOpen] = useState<number[]>([]);
  /** Тохирсон хосуудын `pairId`. */
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  /** Хоёр хөзөр нээгдээд хаагдахыг хүлээж байх үе — товшилтыг түгжинэ. */
  const [busy, setBusy] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  if (!deck) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ тоглоом буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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

  const columns = memoryColumns(cards.length);

  const flip = (card: MemoryCard) => {
    if (feedback || busy) return;
    if (matched.has(card.pairId) || open.includes(card.id)) return;

    const next = [...open, card.id];
    setOpen(next);

    if (next.length < 2) return;

    setMoves((value) => value + 1);

    const [firstId, secondId] = next;
    const first = cards.find((item) => item.id === firstId)!;
    const second = cards.find((item) => item.id === secondId)!;

    if (first.pairId === second.pairId) {
      // Тохирлоо — хөзрүүд НЭЭЛТТЭЙ үлдэнэ.
      const nextMatched = new Set(matched).add(first.pairId);
      setMatched(nextMatched);
      setOpen([]);

      if (nextMatched.size === deck.pairs) onAnswer(true);
      return;
    }

    /*
     * Тохирсонгүй — ХЭСЭГ ХУГАЦААНД харуулж байж хаана. Тэр дор нь хаавал
     * сурагч юу байсныг харж амжихгүй бөгөөд санах ойн тоглоом нь цэвэр
     * азын тоглоом болж хувирна.
     */
    setBusy(true);
    timer.current = setTimeout(() => {
      setOpen([]);
      setBusy(false);
    }, PEEK_MS);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">
        Олдсон хос: {matched.size}/{deck.pairs} · {moves} нээлт
      </p>

      <div
        className="mx-auto grid w-full max-w-sm gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => {
          const isMatched = matched.has(card.pairId);
          const isOpen = isMatched || open.includes(card.id);

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(card)}
              disabled={feedback !== null || isOpen || busy}
              aria-label={isOpen ? card.value : "Хөзөр эргүүлэх"}
              /*
                ⚠ Хаалттай ба нээлттэй хөзөр ИЖИЛ ХЭМЖЭЭТЭЙ байх ёстой
                (`aspect-square`) — эс бөгөөс хөзөр эргэх бүрд тор нь
                үсэрч, сурагчийн цээжилсэн байрлал алдагдана.
              */
              className={`grid aspect-square place-items-center rounded-xl text-3xl transition-colors ${
                isMatched
                  ? "bg-emerald-100 ring-2 ring-emerald-400 dark:bg-emerald-500/20"
                  : isOpen
                    ? "bg-white ring-2 ring-brand-400 dark:bg-gray-100"
                    : "bg-gradient-to-br from-brand-400 to-brand-600 hover:from-brand-500 hover:to-brand-700"
              }`}
            >
              {/* Хаалттай хөзрийн ард юу байгааг DOM-д ч гаргахгүй —
                  сониуч сурагч элементийг шалгаад хариуг олох боломжгүй. */}
              {isOpen ? card.value : ""}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Хоёр хөзөр эргүүлж ижил зурагтай хосыг ол. Бүх хосыг олбол дуусна.
      </p>
    </div>
  );
}
