"use client";

import { useMemo, useState } from "react";

import {
  activeTileCount,
  connectedTiles,
  decodePuzzle,
  isEndpoint,
  makeRng,
  rotate,
  scramblePuzzle,
  seedFromString,
  EAST,
  NORTH,
  SOUTH,
  WEST,
  type NetPuzzle,
} from "@/lib/net/puzzle";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "net-puzzle" дасгал — тайл бүрийг товшиж эргүүлээд БҮХ компьютерийг
 * сервертэй холбоно.
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад «алдаа» гэж үзэхгүй вэ:
 * Бусад дасгал (нот, шатрын нүүдэл) буруу хариултыг ШУУД зогсоодог. Энд
 * тийм ойлголт байхгүй: тайл эргүүлэх нь өөрөө туршилт бөгөөд буруу эргэлт
 * гэж үгүй — сурагч эцэст нь холбоно. Тиймээс дасгал нь ЗӨВХӨН амжилтаар
 * дуусна, харин "Дахин холих" товч нь гацсан хүүхдэд шинэ эхлэл өгнө.
 * Ингэснээр оньсого нь шийтгэл биш, тоглоом хэвээр үлдэнэ.
 */
export default function NetPuzzleExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const solved = useMemo(() => decodePuzzle(exercise.grid), [exercise.grid]);

  /**
   * Эхлэл байрлалыг дасгалын ID-гаар ҮРЛЭНЭ — хуудсыг сэргээхэд ижил
   * оньсого гарна (`lib/net/puzzle.ts`-ийн `makeRng` тайлбарыг үзнэ үү).
   */
  const [puzzle, setPuzzle] = useState<NetPuzzle | null>(() =>
    solved ? scramblePuzzle(solved, makeRng(seedFromString(exercise.id))) : null
  );
  const [moves, setMoves] = useState(0);

  const connected = useMemo(
    () => (puzzle ? connectedTiles(puzzle) : new Set<number>()),
    [puzzle]
  );

  if (!solved || !puzzle) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ оньсого буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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

  const total = activeTileCount(puzzle);

  const turn = (index: number) => {
    if (feedback) return;

    const tiles = [...puzzle.tiles];
    tiles[index] = rotate(tiles[index]);

    const next: NetPuzzle = { ...puzzle, tiles };
    setPuzzle(next);
    setMoves((value) => value + 1);

    // Ялалтыг ЭНД шалгана: холбогдсон тайлын тоо нь хоосон биш бүх тайлын
    // тоотой тэнцвэл бүх компьютер сервертэй холбогдсон гэсэн үг.
    if (connectedTiles(next).size === activeTileCount(next)) onAnswer(true);
  };

  const reshuffle = () => {
    if (feedback) return;
    // Шинэ үр — гацсан сурагчид өөр эхлэл. Бүтэц нь ижил тул хичээлийн
    // агуулга өөрчлөгдөхгүй.
    setPuzzle(scramblePuzzle(solved, makeRng(seedFromString(exercise.id + moves))));
    setMoves(0);
  };

  return (
    <div className="surface space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <button
          type="button"
          onClick={reshuffle}
          disabled={feedback !== null}
          className="shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-white/5"
        >
          Дахин холих
        </button>
      </div>

      <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">
        Холбогдсон: {connected.size}/{total}
      </p>

      {/*
        Оньсого нь ДӨРВӨЛЖИН тул `aspect-square` дотор багана бүрийг тэнцүү
        хуваана. Хамгийн том (7×7) хэмжээ ч утасны дэлгэцэд багтана.

        ⚠ Тайл хооронд ЗАЙ ҮЛДЭЭХГҮЙ. Урьд нь `gap-0.5` байсан нь
        кабелийг нүд бүрийн зааг дээр таслаж, ХОЛБОГДСОН зам ч тасархай
        мэт харагдуулж байв — тоглоомын гол мэдээлэл (аль нь холбогдсон бэ)
        яг тэр заагаар дамждаг. Нүднүүдийн хил нь тайлын өөрийн ХҮРЭЭ
        (`ring`) болж үлдэнэ.
      */}
      <div
        className="mx-auto grid w-full max-w-sm overflow-hidden rounded-xl border border-gray-300 bg-white dark:border-white/20"
        style={{ gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))` }}
      >
        {puzzle.tiles.map((tile, index) => (
          <button
            key={index}
            type="button"
            onClick={() => turn(index)}
            disabled={feedback !== null || tile === 0}
            aria-label={`${index + 1}-р нүд — эргүүлэх`}
            className={`relative aspect-square ring-[0.5px] ring-gray-300 transition-colors ${
              tile === 0
                ? "bg-gray-100"
                : "bg-white hover:bg-cyan-50"
            }`}
          >
            <Tile
              tile={tile}
              live={connected.has(index)}
              isServer={index === puzzle.server}
            />
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Нүд бүрийг товшиж эргүүлнэ. Бүх компьютер серверт холбогдвол дасгал дуусна.
      </p>
    </div>
  );
}

/**
 * Нэг тайлын зураг — SVG.
 *
 * ⚠ Зурагт CSS хүрээ (border) БИШ, SVG хэрэглэсэн шалтгаан: кабелийн
 * үзүүрүүд нь төвөөс гарах ДӨРВӨН тусдаа шугам бөгөөд тэдгээрийн зузаан,
 * бөөрөнхий үзүүр нь эргэлтийн үед ч жигд харагдах ёстой. Хүрээгээр
 * зурвал өнцөг бүрд өөр өөр зузаан гарна.
 */
function Tile({
  tile,
  live,
  isServer,
}: {
  tile: number;
  live: boolean;
  isServer: boolean;
}) {
  if (tile === 0) return null;

  /**
   * Холбогдсон = цайвар хөх (амьд кабель), холбогдоогүй = ТОД саарал.
   *
   * ⚠ Урьд нь холбогдоогүй кабель `#cbd5e1` (slate-300) байсан нь цагаан
   * тайл дээр бараг үл ялиг харагдаж, «зам огт гарч ирэхгүй байна» гэсэн
   * сэтгэгдэл төрүүлж байв. Тоглоомын гол ажил бол ТАСАРСАН кабелиудыг
   * ОЛОХ явдал тул тэдгээр нь эхлээд ХАРАГДАХ ёстой — зөвхөн өнгөөрөө
   * амьд кабелиас ялгагдана.
   */
  const stroke = live ? "#06b6d4" : "#64748b";

  /**
   * Үзүүрүүд нүдний ирмэгээс 2px ГАДАГШ гарна (0 биш -2, 40 биш 42).
   * Ингэснээр хөрш тайлын кабельтай ЗААГ ДЭЭР давхцаж, тасралтгүй шугам
   * үүснэ — SVG-ийн ирмэг дээрх дугуй үзүүр (`strokeLinecap`) хагас
   * тайрагддаг тул яг 0/40 дээр зогсоовол үл мэдэг завсар үлдэнэ.
   */
  const arms = [
    { dir: NORTH, x2: 20, y2: -2 },
    { dir: EAST, x2: 42, y2: 20 },
    { dir: SOUTH, x2: 20, y2: 42 },
    { dir: WEST, x2: -2, y2: 20 },
  ];

  return (
    // `overflow-visible` — дээрх 2px-ийн халилт тайрагдахгүйн тулд.
    <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full overflow-visible">
      {arms.map(
        ({ dir, x2, y2 }) =>
          (tile & dir) !== 0 && (
            <line
              key={dir}
              x1={20}
              y1={20}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeWidth={8}
              strokeLinecap="round"
            />
          )
      )}

      {isServer ? (
        // Сервер — том, өндөр хайрцаг дээрээ гэрлүүдтэй (зурган дээрх шиг).
        <g>
          <rect x={11} y={9} width={18} height={22} rx={2} fill="#94a3b8" />
          <rect x={13} y={12} width={14} height={3} fill="#e2e8f0" />
          <rect x={13} y={17} width={14} height={3} fill="#e2e8f0" />
          <circle cx={15} cy={26} r={1.6} fill="#22c55e" />
          <circle cx={20} cy={26} r={1.6} fill="#22c55e" />
          <circle cx={25} cy={26} r={1.6} fill="#facc15" />
        </g>
      ) : isEndpoint(tile) ? (
        // Компьютер — дэлгэц ба тавиур.
        <g>
          <rect
            x={10}
            y={11}
            width={20}
            height={14}
            rx={2}
            fill={live ? "#67e8f9" : "#cbd5e1"}
            stroke="#475569"
            strokeWidth={1.5}
          />
          <rect x={17} y={25} width={6} height={3} fill="#475569" />
          <rect x={13} y={28} width={14} height={2} rx={1} fill="#475569" />
        </g>
      ) : (
        // Дамжуулах зангилаа — зөвхөн кабелийн уулзвар.
        <circle cx={20} cy={20} r={5} fill={stroke} />
      )}
    </svg>
  );
}
