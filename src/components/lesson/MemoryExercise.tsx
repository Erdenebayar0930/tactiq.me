"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import { makeRng, seedFromString } from "@/lib/net/puzzle";
import { itemArt } from "@/lib/tactiq/itemArt";
import { dealMemory, decodeMemory, memoryColumns } from "@/lib/puzzles/memory";

import type { MemoryCard } from "@/lib/puzzles/memory";
import type { Exercise } from "@/lib/tactiq/courses";

/** Тохирохгүй хос хэдэн мс харагдаад хаагдах вэ. */
const PEEK_MS = 900;

/**
 * Хос бүрийн зөөлөн дэвсгэр өнгө.
 *
 * ⚠ Классуудыг БҮТНЭЭР бичсэн: Tailwind нь эх кодыг ТЕКСТЭЭР сканнердана
 * — `` `bg-${name}-100` `` гэж угсарвал CSS-д огт үүсэхгүй
 * (`lib/tactiq/theme.ts`-ийн адил шалтгаан).
 *
 * ⚠ Өнгө нь ХОСЫГ ИЛЧЛЭХГҮЙ: `pairId`-аар сонгодог тул ижил хос ижил
 * өнгөтэй байх ч, өнгө нь зөвхөн НЭЭГДСЭН хөзөрт харагдана. Хаалттай
 * хөзрүүд бүгд ижил ар талтай.
 */
const FACE_TINTS = [
  "bg-rose-100 dark:bg-rose-500/25",
  "bg-amber-100 dark:bg-amber-500/25",
  "bg-emerald-100 dark:bg-emerald-500/25",
  "bg-sky-100 dark:bg-sky-500/25",
  "bg-violet-100 dark:bg-violet-500/25",
  "bg-teal-100 dark:bg-teal-500/25",
  "bg-orange-100 dark:bg-orange-500/25",
  "bg-indigo-100 dark:bg-indigo-500/25",
  "bg-pink-100 dark:bg-pink-500/25",
  "bg-lime-100 dark:bg-lime-500/25",
];

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
        className="mx-auto grid w-full max-w-sm gap-2.5"
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
              aria-label={isOpen ? (itemArt(card.value)?.label ?? card.value) : "Хөзөр эргүүлэх"}
              /*
                ⚠ Хаалттай ба нээлттэй хөзөр ИЖИЛ ХЭМЖЭЭТЭЙ байх ёстой
                (`aspect-square`) — эс бөгөөс хөзөр эргэх бүрд тор нь
                үсэрч, сурагчийн цээжилсэн байрлал алдагдана.

                `perspective` нь эргэлтийг хавтгай биш, ГҮНТЭЙ харуулна.
              */
              className={`aspect-square [perspective:700px] ${
                isOpen || feedback ? "" : "transition-transform hover:-translate-y-0.5"
              }`}
            >
              <span
                className="relative block size-full transition-transform duration-300 [transform-style:preserve-3d]"
                style={{ transform: isOpen ? "rotateY(180deg)" : undefined }}
              >
                {/* АР ТАЛ — бүх хөзөрт ИЖИЛ. */}
                <span
                  className={`absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-md [backface-visibility:hidden] ${
                    isOpen ? "" : "ring-1 ring-brand-700/20"
                  }`}
                >
                  <span
                    aria-hidden
                    className="text-2xl font-black text-white/35 [text-shadow:0_1px_0_rgba(0,0,0,0.15)]"
                  >
                    ?
                  </span>
                </span>

                {/*
                  НҮҮР ТАЛ — ⚠ ЗӨВХӨН нээлттэй үед л DOM-д орно. Хаалттай
                  хөзрийн утгыг урьдчилан зурвал сониуч сурагч элементийг
                  шалгаад бүх хариуг олно. Тиймээс хаагдах хөдөлгөөний
                  үеэр ар тал нь эрт харагдана — тэр нь нууцыг хадгалахын
                  төлөөх ЗОРИУДЫН буулт.
                */}
                {isOpen && (
                  <span
                    className={`absolute inset-0 grid place-items-center rounded-2xl bg-white shadow-md [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-gray-800 ${
                      isMatched ? "ring-2 ring-emerald-400" : "ring-1 ring-gray-200 dark:ring-white/10"
                    }`}
                  >
                    <CardFace value={card.value} pairId={card.pairId} />
                  </span>
                )}
              </span>
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

/**
 * Хөзрийн НҮҮР — зураг (`img:<түлхүүр>`) эсвэл текст/эможи.
 *
 * ⚠ ЗУРАГТАЙ хөзөр нь өнгөт дугуйгүй: далбааны цагаан тал (Япон, Польш,
 * Дани…) өнгөт дугуй дээр бохир харагдана. Тиймээс зургийг цагаан
 * хавтан дээр, нимгэн хүрээтэй тавина.
 *
 * ⚠ Хосын өнгө нь ЗӨВХӨН текст хөзөрт үлдэв: зурагт хөзөр өөрөө өнгөтэй
 * тул нэмэлт өнгө нь ялгахад тус болохгүй, харин бүдгэрүүлнэ.
 */
function CardFace({ value, pairId }: { value: string; pairId: number }) {
  const art = itemArt(value);

  if (art) {
    return (
      <span className="grid size-[86%] place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 dark:ring-white/20">
        <Image
          src={art.src}
          alt=""
          aria-hidden
          width={192}
          height={132}
          className="h-auto w-full select-none object-contain"
        />
      </span>
    );
  }

  return (
    <span
      className={`grid size-[78%] place-items-center rounded-full text-3xl ${
        FACE_TINTS[pairId % FACE_TINTS.length]
      }`}
    >
      {value}
    </span>
  );
}
