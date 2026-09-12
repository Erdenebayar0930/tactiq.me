"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Play, RotateCcw, Repeat, Trash2, Undo2 } from "lucide-react";

import {
  decodeMaze,
  programSize,
  reachesGoal,
  runProgram,
  WALL,
  REPEAT_MAX,
  REPEAT_MIN,
  type Command,
  type Direction,
  type Program,
  type ProgramNode,
} from "@/lib/code/maze";

import type { Exercise } from "@/lib/tactiq/courses";

/** Алхам бүрийн хооронд хэдэн мс — хүүхэд дагаж харах хурд. */
const STEP_MS = 420;

/**
 * "code-maze" дасгал — сурагч ТУШААЛЫН ДАРААЛАЛ угсарч дүрсээ зорилго
 * руу хүргэнэ (code.org маягийн блок-код).
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад "буруу" гэж үзэхгүй вэ:
 * Программ ажиллаад зорилгод хүрэхгүй бол тэр нь АЛДАА биш, ДИБАГ хийх
 * мөч. Хүүхэд юу болсныг хараад засах ёстой — тиймээс дасгал зөвхөн
 * амжилтаар дуусна. Энэ бол программчлалын хамгийн эхний, хамгийн чухал
 * дадал: ажиллуулж үзэх → харах → засах.
 */
export default function CodeMazeExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const maze = decodeMaze(exercise.grid);

  const [program, setProgram] = useState<Program>([]);
  /** Аль давталтын дотор тушаал нэмэх вэ (`null` = үндсэн дараалалд). */
  const [activeRepeat, setActiveRepeat] = useState<number | null>(null);
  /** Ажиллуулж байх үеийн алхмын индекс (`null` = зогссон). */
  const [step, setStep] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  if (!maze) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ даалгавар буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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

  const frames = runProgram(maze, program);
  const running = step !== null;
  const size = programSize(program);
  const overLimit = maze.limit !== null && size > maze.limit;

  // Дэлгэц дээрх ОДООГИЙН байрлал: ажиллаж байвал тухайн фрэйм, эс бөгөөс эхлэл.
  const current =
    running && frames[step!] !== undefined
      ? frames[step!]
      : { index: maze.start, facing: maze.facing, blocked: false };

  const addCommand = (cmd: Command) => {
    if (running || feedback) return;
    setFailed(false);

    setProgram((prev) => {
      if (activeRepeat === null) return [...prev, { kind: "cmd", cmd }];

      // Давталтын ДОТОР нэмнэ — идэвхтэй блокийг сонгосон үед.
      return prev.map((node, index) =>
        index === activeRepeat && node.kind === "repeat"
          ? { ...node, body: [...node.body, { kind: "cmd", cmd }] }
          : node
      );
    });
  };

  const addRepeat = () => {
    if (running || feedback) return;
    setFailed(false);
    setProgram((prev) => {
      // Шинэ давталтыг ШУУД идэвхтэй болгоно — дараагийн тушаал нь дотор
      // нь орно. Эс бөгөөс хүүхэд давталт нэмээд, дараа нь түүнийг товшихыг
      // мэдэхгүй тул хоосон давталт үлдээнэ.
      setActiveRepeat(prev.length);
      return [...prev, { kind: "repeat", times: 2, body: [] }];
    });
  };

  const setTimes = (index: number, times: number) => {
    if (running || feedback) return;
    setProgram((prev) =>
      prev.map((node, i) => (i === index && node.kind === "repeat" ? { ...node, times } : node))
    );
  };

  const removeLast = () => {
    if (running || feedback) return;
    setFailed(false);

    setProgram((prev) => {
      // Идэвхтэй давталтын дотроос эхлээд хасна — хүүхэд яг тэнд ажиллаж
      // байгаа тул "буцаах" нь тэр контекстэд хамаарах ёстой.
      if (activeRepeat !== null) {
        const node = prev[activeRepeat];
        if (node?.kind === "repeat" && node.body.length > 0) {
          return prev.map((item, i) =>
            i === activeRepeat && item.kind === "repeat"
              ? { ...item, body: item.body.slice(0, -1) }
              : item
          );
        }
      }

      if (prev.length === 0) return prev;
      if (activeRepeat === prev.length - 1) setActiveRepeat(null);
      return prev.slice(0, -1);
    });
  };

  const clearAll = () => {
    if (running || feedback) return;
    setProgram([]);
    setActiveRepeat(null);
    setFailed(false);
  };

  const run = () => {
    if (running || feedback || frames.length === 0 || overLimit) return;

    setFailed(false);
    setActiveRepeat(null);

    /**
     * Алхмуудыг ЭНД гүйлгэнэ — симуляц нь аль хэдийн бүрэн тооцоологдсон
     * (`runProgram`), тиймээс энд зөвхөн индексийг нэмэгдүүлнэ. Симуляц ба
     * анимаци хоёрыг сүлжвэл алдаа хайхад хоёулаа буруутай болно.
     */
    let index = 0;
    setStep(0);

    const tick = () => {
      index += 1;

      if (index >= frames.length) {
        setStep(null);
        if (reachesGoal(maze, program)) onAnswer(true);
        else setFailed(true);
        return;
      }

      setStep(index);
      timer.current = setTimeout(tick, STEP_MS);
    };

    timer.current = setTimeout(tick, STEP_MS);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      {/* Талбар */}
      <div
        className="mx-auto grid w-full max-w-xs overflow-hidden rounded-xl border-2 border-gray-300 dark:border-white/20"
        style={{ gridTemplateColumns: `repeat(${maze.cols}, minmax(0, 1fr))` }}
      >
        {maze.cells.map((cell, index) => {
          const isGoal = index === maze.goal;
          const isHero = index === current.index;

          return (
            <div
              key={index}
              className={`relative flex aspect-square items-center justify-center border border-gray-200 text-2xl ${
                cell === WALL ? "bg-gray-700 dark:bg-gray-800" : "bg-emerald-50 dark:bg-emerald-900/20"
              }`}
            >
              {isGoal && !isHero && <span aria-label="Зорилго">🥕</span>}
              {isHero && (
                <span
                  className={`transition-transform ${current.blocked ? "opacity-60" : ""}`}
                  style={{ transform: `rotate(${ROTATION[current.facing]}deg)` }}
                  aria-label="Дүр"
                >
                  🐰
                </span>
              )}
            </div>
          );
        })}
      </div>

      {current.blocked && running && (
        <p className="text-center text-sm font-semibold text-amber-600 dark:text-amber-400">
          Хананд мөргөлөө!
        </p>
      )}

      {/* Тушаалын самбар */}
      <div className="flex flex-wrap gap-2">
        <PaletteButton onClick={() => addCommand("forward")} disabled={running || !!feedback}>
          <ArrowUp className="size-4" aria-hidden /> Урагш
        </PaletteButton>
        <PaletteButton onClick={() => addCommand("left")} disabled={running || !!feedback}>
          ↰ Зүүн
        </PaletteButton>
        <PaletteButton onClick={() => addCommand("right")} disabled={running || !!feedback}>
          ↱ Баруун
        </PaletteButton>

        {/*
          Давталтыг ЗӨВХӨН хязгаартай дасгалд харуулна. Хязгааргүй үед
          давталт нь хэрэггүй нэмэлт ойлголт болж, эхний хичээлүүдийг
          хүндрүүлнэ — түүнийг заах цаг нь хязгаар гарч ирэх үе.
        */}
        {maze.limit !== null && (
          <PaletteButton onClick={addRepeat} disabled={running || !!feedback}>
            <Repeat className="size-4" aria-hidden /> Давтах
          </PaletteButton>
        )}
      </div>

      {/* Программ */}
      <div className="rounded-xl border-2 border-dashed border-gray-300 p-3 dark:border-white/15">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Программ
            {maze.limit !== null && (
              <span className={overLimit ? "ml-1 text-rose-600" : "ml-1"}>
                — {size}/{maze.limit} блок
              </span>
            )}
          </p>

          <div className="flex gap-1">
            <button
              type="button"
              onClick={removeLast}
              disabled={running || !!feedback || program.length === 0}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-white/5"
              aria-label="Сүүлийнхийг буцаах"
            >
              <Undo2 className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={running || !!feedback || program.length === 0}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-white/5"
              aria-label="Бүгдийг цэвэрлэх"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {program.length === 0 ? (
          <p className="py-2 text-center text-sm text-gray-400">
            Дээрх тушаалуудыг товшиж программаа угсарна.
          </p>
        ) : (
          <div className="flex flex-wrap items-start gap-1.5">
            {program.map((node, index) => (
              <ProgramChip
                key={index}
                node={node}
                active={activeRepeat === index}
                disabled={running || !!feedback}
                onSelect={() =>
                  setActiveRepeat((value) =>
                    node.kind === "repeat" ? (value === index ? null : index) : null
                  )
                }
                onTimes={(times) => setTimes(index, times)}
              />
            ))}
          </div>
        )}
      </div>

      {overLimit && (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
          Блок хэтэрлээ. «Давтах» ашиглан богиносгоно уу.
        </p>
      )}

      {failed && (
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          Зорилгод хүрсэнгүй. Программаа засаад дахин оролдоорой.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={run}
          disabled={running || !!feedback || program.length === 0 || overLimit}
          className="btn-primary flex flex-1 items-center justify-center gap-2 py-3 disabled:opacity-50"
        >
          <Play className="size-4" aria-hidden />
          {running ? "Ажиллаж байна…" : "Ажиллуулах"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (timer.current !== null) clearTimeout(timer.current);
            setStep(null);
            setFailed(false);
          }}
          disabled={!running}
          className="rounded-xl border-2 border-gray-300 px-4 text-sm font-semibold text-gray-600 disabled:opacity-40 dark:border-white/15 dark:text-gray-300"
          aria-label="Зогсоох"
        >
          <RotateCcw className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Дүрсийг чиглэлээр эргүүлэх өнцөг — эможи нь анхнаасаа БАРУУН харсан. */
const ROTATION: Record<Direction, number> = { E: 0, S: 90, W: 180, N: 270 };

function PaletteButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

const CMD_LABEL: Record<Command, string> = {
  forward: "Урагш",
  left: "↰ Зүүн",
  right: "↱ Баруун",
};

function ProgramChip({
  node,
  active,
  disabled,
  onSelect,
  onTimes,
}: {
  node: ProgramNode;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onTimes: (times: number) => void;
}) {
  if (node.kind === "cmd") {
    return (
      <span className="rounded-lg bg-brand-100 px-2.5 py-1.5 text-xs font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
        {CMD_LABEL[node.cmd]}
      </span>
    );
  }

  return (
    <span
      className={`flex flex-wrap items-center gap-1.5 rounded-lg border-2 px-2 py-1.5 ${
        active
          ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10"
          : "border-amber-300 bg-amber-50/50 dark:bg-amber-500/5"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className="text-xs font-bold text-amber-700 dark:text-amber-300"
      >
        Давтах {node.times}×{active ? " ✎" : ""}
      </button>

      {/* Тоог өөрчлөх — жижиг +/− товч. Тоо шивүүлэх нь гар утсанд эвгүй. */}
      <span className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onTimes(Math.max(REPEAT_MIN, node.times - 1))}
          disabled={disabled}
          className="size-5 rounded bg-amber-200 text-xs font-bold text-amber-800 disabled:opacity-40"
          aria-label="Тоог багасгах"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => onTimes(Math.min(REPEAT_MAX, node.times + 1))}
          disabled={disabled}
          className="size-5 rounded bg-amber-200 text-xs font-bold text-amber-800 disabled:opacity-40"
          aria-label="Тоог нэмэх"
        >
          +
        </button>
      </span>

      {node.body.length === 0 ? (
        <span className="text-[11px] text-amber-600 dark:text-amber-400">
          {active ? "тушаал нэмнэ үү" : "хоосон"}
        </span>
      ) : (
        node.body.map((inner, index) => (
          <span
            key={index}
            className="rounded bg-white px-2 py-1 text-[11px] font-bold text-brand-700 dark:bg-gray-100"
          >
            {CMD_LABEL[inner.cmd]}
          </span>
        ))
      )}
    </span>
  );
}
