"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

import {
  BEAT_LABELS,
  beatSeconds,
  beatsPerBar,
  melodyBeats,
  midiToFrequency,
  noteToMidi,
  parseMelody,
  parseMeter,
  parseTempo,
  TEMPO_DEFAULT,
  tempoLabel,
} from "@/lib/music/notes";
import {
  playClick,
  playCountIn,
  playMelody,
  playTone,
  toMs,
  unlockAudio,
} from "@/lib/music/synth";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "rhythm-tap" дасгал — сурагч ХЭМНЭЛИЙГ тогшино (өндөр биш, ХУГАЦАА).
 *
 * ЯАГААД ӨНДРИЙГ ХАССАН БЭ: хэмнэл ба нот таних хоёрыг ЗЭРЭГ шаардвал
 * сурагч алдахдаа алийг нь буруу хийснээ мэдэхгүй. Энд ганц том талбай
 * тогшдог тул ЗӨВХӨН хугацаа үнэлэгдэнэ — "Duolingo"-гийн нэг ур чадвар,
 * нэг дасгал зарчим.
 *
 * ҮНЭЛГЭЭ: тогшилтуудын ХООРОНДЫН зайг харьцуулна, эхлэх АГШНЫГ БИШ.
 * Хүн метрономтой яг таг зэрэг дарж чаддаггүй (сонсох→хөдлөх сааталт нь
 * дунджаар 150-250мс) тул үнэмлэхүй мөчөөр үнэлбэл зөв тогшсон хүүхэд ч
 * унана. Хоорондын зай нь тэр сааталтыг АВТОМАТААР хасдаг.
 */
export default function RhythmExercise({
  exercise,
  feedback,
  onAnswer,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
}) {
  const notes = parseMelody(exercise.melody) ?? [];
  const meter = parseMeter(exercise.meter) ?? "4/4";
  const bpm = parseTempo(exercise.tempoBpm) ?? TEMPO_DEFAULT;

  /** "idle" → тоолуур → тогших → дууссан */
  const [phase, setPhase] = useState<"idle" | "count" | "tap">("idle");
  /** Сурагчийн тогшилтын мөчүүд (мс, `performance.now()`). */
  const taps = useRef<number[]>([]);
  const [tapCount, setTapCount] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  const start = () => {
    if (phase !== "idle" || feedback) return;

    unlockAudio();
    taps.current = [];
    setTapCount(0);
    setPhase("count");

    // Тоолуур (нэг такт) → дараа нь сурагчийн ээлж.
    const countSeconds = playCountIn(beatsPerBar(meter), bpm);
    timers.current.push(setTimeout(() => setPhase("tap"), toMs(countSeconds)));

    /**
     * ⚠ Тогших хугацаа ДУУСАХ мөчийг ЗААВАЛ таймераар барина. Үүнгүй бол
     * шаардлагатай тооноос ЦӨӨН тогшсон сурагч (жишээ нь эхний цохилтын
     * дараа зогссон) хэзээ ч хариу авахгүй, дасгал дуусахгүй гацна.
     *
     * Нэмэлт нэг цохилтын "хүлцэл" өгнө — сүүлийн нот арай хожуу
     * тогшигдвол таслахгүйн тулд.
     */
    const totalSeconds = countSeconds + (melodyBeats(notes) + 1) * beatSeconds(bpm);
    timers.current.push(setTimeout(() => finish(), toMs(totalSeconds)));
  };

  const finish = () => {
    clearTimers();
    setPhase("idle");
    onAnswer(gradeTaps(taps.current, notes.map((item) => item.beats), bpm));
  };

  /**
   * @param time Тогшилтын мөч — ХӨТЧИЙН үйл явдлаас (`event.timeStamp`).
   *
   * ⚠ Энд `performance.now()` дуудвал React-ийн боловсруулалтын хойшлолт
   * (нэг фрэйм хүртэл) хэмжилтэд ОРНО — 60 FPS дээр 16мс хүртэл. Хэмнэлийн
   * үнэлгээ нь яг эдгээр мс-үүд дээр тогддог тул үйл явдал ҮҮССЭН мөчийг
   * ашиглана. `timeStamp` нь `performance.now()`-той ижил цагийн суурьтай.
   */
  const tap = (time: number) => {
    if (phase !== "tap" || feedback) return;

    // Тогшилт бүрд сонсогдох хариу — чимээгүй товч дээр хүүхэд өөрийгөө
    // дарагдсан эсэхийг мэдэхгүй.
    playTone(midiToFrequency(noteToMidi("C5") ?? 72), 0, 0.12);

    taps.current.push(time);
    setTapCount(taps.current.length);

    // Хүлээгдэж буй тоог гүйцээмэгц шууд дүгнэнэ — сурагч илүү хүлээхгүй.
    if (taps.current.length >= notes.length) finish();
  };

  const listen = () => {
    if (phase !== "idle" || feedback) return;
    unlockAudio();

    const countSeconds = playCountIn(beatsPerBar(meter), bpm);
    playMelody(
      notes.map((item) => ({
        frequency: midiToFrequency(noteToMidi(item.note) ?? 60),
        beats: item.beats,
      })),
      bpm,
      countSeconds
    );

    // Метрономыг ая дуустал үргэлжлүүлнэ — сурагч нот бүр ямар цохилт дээр
    // унаж байгааг ХАРЬЦУУЛЖ сонсоно. Энэ бол "хэмжээ"-г ойлгуулах гол арга.
    const beat = beatSeconds(bpm);
    const bar = beatsPerBar(meter);
    const totalBeats = Math.ceil(melodyBeats(notes));
    for (let i = 0; i < totalBeats; i += 1) {
      playClick(countSeconds + i * beat, i % bar === 0);
    }
  };

  if (notes.length === 0) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ дасгалын хэмнэл буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
          Хэмжээ {meter}
        </span>
        <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-semibold text-gray-700 dark:bg-white/10 dark:text-gray-200">
          Темп {bpm} · {tempoLabel(bpm)}
        </span>
      </div>

      {/* Хэмнэлийн зураг — нотын урт нь ӨРГӨНӨӨР илэрхийлэгдэнэ. Хүүхэд
          "хоёр цохилт" гэдгийг үгээр биш, урт хайрцгаар хардаг. */}
      <div className="flex items-end gap-1.5">
        {notes.map((item, index) => (
          <div
            key={index}
            style={{ flexGrow: item.beats }}
            className={`flex h-12 items-center justify-center rounded-lg border-2 text-xs font-semibold ${
              index < tapCount
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                : "border-gray-300 text-gray-500 dark:border-white/15 dark:text-gray-400"
            }`}
          >
            {BEAT_LABELS[String(item.beats)] ?? `${item.beats} цохилт`}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={listen}
          disabled={phase !== "idle" || feedback !== null}
          className="flex items-center gap-1.5 rounded-xl border-2 border-brand-500 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
        >
          <Play className="h-4 w-4" />
          Сонсох
        </button>

        <button
          type="button"
          onClick={start}
          disabled={phase !== "idle" || feedback !== null}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {phase === "count" ? "Тоолж байна…" : "Эхлэх"}
        </button>
      </div>

      {/* Тогших талбай. Товчлуураас ТОМ байх нь зориуд: хэмнэл тогшихдоо
          хүүхэд хурууныхаа байрлалыг биш, ЗӨВХӨН цагийг бодох ёстой. */}
      <button
        type="button"
        onPointerDown={(event) => tap(event.timeStamp)}
        disabled={phase !== "tap"}
        className={`h-28 w-full select-none touch-none rounded-2xl border-4 text-lg font-bold transition-colors ${
          phase === "tap"
            ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
            : "border-dashed border-gray-300 text-gray-400 dark:border-white/15"
        }`}
      >
        {phase === "tap"
          ? `Тогшино уу — ${tapCount}/${notes.length}`
          : phase === "count"
            ? "Тоолуурыг сонс…"
            : "«Эхлэх» дарна уу"}
      </button>
    </div>
  );
}

/**
 * Тогшилтыг үнэлнэ.
 *
 * Хүлээгдэж буй зай (сек) = тухайн нотын урт × нэг цохилтын хугацаа.
 * Сурагчийн зайг түүнтэй харьцуулж, ХАРЬЦААГААР (үнэмлэхүй мс-ээр БИШ)
 * хүлцэнэ: 40 BPM дээрх 100мс алдаа өчүүхэн, 180 BPM дээр тэр нь бүтэн нот
 * алдсантай тэнцэнэ. Харьцаа нь темп бүрд шударга хэвээр үлдэнэ.
 *
 * ⚠ ЭКСПОРТЛОСОН: энэ бол дасгалын ЦОРЫН ГАНЦ үнэлгээ тул тусад нь
 * ажиллуулж шалгах боломжтой байх ёстой (`scripts/`-ийн шалгалт, ирээдүйн
 * unit test).
 */
export function gradeTaps(
  tapTimes: number[],
  expectedBeats: number[],
  bpm: number,
  /** Зөвшөөрөх хазайлт — хүлээгдсэн зайны хувиар. 0.35 = ±35%. */
  tolerance = 0.35
): boolean {
  // Тоо таарахгүй бол хэмнэл яригдахгүй (дутуу эсвэл илүү тогшсон).
  if (tapTimes.length !== expectedBeats.length) return false;

  // Нэг тогшилттой дасгалд ХООРОНДЫН зай гэж байхгүй — дарсан нь хангалттай.
  if (tapTimes.length < 2) return true;

  const beat = beatSeconds(bpm) * 1000;

  for (let i = 1; i < tapTimes.length; i += 1) {
    const actual = tapTimes[i] - tapTimes[i - 1];
    // i-1 дэх нотын УРТ нь дараагийн тогшилт хүртэлх зайг тодорхойлно.
    const expected = expectedBeats[i - 1] * beat;
    if (Math.abs(actual - expected) > expected * tolerance) return false;
  }

  return true;
}
