"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";

import {
  isSharp,
  melodyBeats,
  midiToFrequency,
  midiToNote,
  noteSolfege,
  noteToMidi,
  parseMelody,
  parseTempo,
  TEMPO_DEFAULT,
  tempoLabel,
} from "@/lib/music/notes";
import { playMelody, playTone, toMs, unlockAudio } from "@/lib/music/synth";

import type { Exercise } from "@/lib/tactiq/courses";

/**
 * "piano-play" дасгал — сурагч аяыг ТӨГӨЛДӨР ХУУРЫН товчлуур дээр НОТ ДАРААЛЛААР
 * тоглоно (сонголт огт харагдахгүй).
 *
 * ⚠ `learn/[lessonId]/page.tsx`-с `next/dynamic`-аар ЛАЗИ ачаалагдана —
 * Web Audio синтезатор ба энэ компонент ЗӨВХӨН хөгжмийн дасгалтай хичээл
 * дээр л татагдана.
 *
 * ЗАГВАРЫН ШИЙДЭЛ — яагаад "нот бүрд шууд хариу" вэ:
 * Бүтэн аяыг тоглож дуустал юу ч хэлэхгүй бол сурагч 8 дахь нот дээр
 * алдахад эхнээс нь дахин эхлэх шаардлагатай болж, эхний долоог дахин
 * зөв тоглох "шийтгэл" үүрнэ. Тиймээс АЛДСАН ДОР НЬ зогсоож, зөв нотыг
 * харуулна — Duolingo-гийн хичээлийн мөчлөгтэй ижил.
 */
export default function PianoExercise({
  exercise,
  feedback,
  onAnswer,
  onMistake,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
  /** Буруу нот — ая ДУУСАХГҮЙ, ЯГ ТЭР НОТ дээрээ үлдэж дахин оролдуулна. */
  onMistake?: () => void;
}) {
  const melody = useMemo(() => parseMelody(exercise.melody) ?? [], [exercise.melody]);

  /**
   * Темп — аяыг ЯМАР хурдаар сонсгох вэ. Хоосон бол дунд хурд.
   *
   * ⚠ Энэ нь зөвхөн "Сонсох"-д нөлөөлнө: сурагчийн ТОГЛОХ хурдыг шалгахгүй.
   * Хэмнэлийг үнэлдэг дасгал нь тусдаа ("rhythm-tap") — нот таних, хэмнэл
   * барих хоёрыг нэг дор шаардвал алдсан хүүхэд алийг нь буруу хийснээ
   * мэдэхгүй.
   */
  const bpm = parseTempo(exercise.tempoBpm) ?? TEMPO_DEFAULT;
  /** Ая дотор ядаж нэг нот 1 цохилтоос ялгаатай бол хэмнэлийг ил үзүүлнэ. */
  const hasRhythm = melody.some((item) => item.beats !== 1);

  /** Дараагийн тоглох ёстой нотын индекс. */
  const [position, setPosition] = useState(0);
  /** Энэ нот дээр буруу товч дарсан — сануулга (зөв нот дарах хүртэл). */
  const [mistake, setMistake] = useState(false);
  /** Дарагдсан агшинд товчлуурыг тодруулна (хурууны буцаа холбоос). */
  const [pressed, setPressed] = useState<string | null>(null);
  /** Аяыг тоглуулж байх хооронд "Сонсох" товчийг түгжинэ. */
  const [listening, setListening] = useState(false);

  const listenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (listenTimer.current !== null) clearTimeout(listenTimer.current);
      if (pressTimer.current !== null) clearTimeout(pressTimer.current);
    };
  }, []);

  /**
   * Гарын ХҮРЭЭГ аяны нотоос АВТОМАТААР тооцно.
   *
   * ЯАГААД: 88 товчлуурыг утасны дэлгэцэд багтаавал товчлуур бүр 4px болж,
   * хүүхэд огт онох боломжгүй. Аянд хэрэглэгдэх нотуудыг бүрэн багтаасан
   * бүтэн октавуудыг л зурснаар товчлуур том, дарахад тохиромжтой хэвээр
   * үлдэнэ.
   *
   * Аяны нот бүр ЗААВАЛ гарын дотор байна — эс бөгөөс дасгал дуусашгүй.
   */
  const { fromMidi, toMidi } = useMemo(() => {
    const midis = melody.map((item) => noteToMidi(item.note) ?? 60);
    const low = midis.length > 0 ? Math.min(...midis) : 60;
    const high = midis.length > 0 ? Math.max(...midis) : 72;

    // Октавын эхлэл (До) хүртэл доош, төгсгөл (Си) хүртэл дээш тэгшилнэ —
    // хагас октав зурвал гар танил бус харагдана.
    const start = low - (((low % 12) + 12) % 12);
    const endBase = high - (((high % 12) + 12) % 12);
    return { fromMidi: start, toMidi: endBase + 11 };
  }, [melody]);

  /** Цагаан товчлуурууд — хар товчлуурыг тэдгээрийн ЗААГ дээр байрлуулна. */
  const whiteKeys = useMemo(() => {
    const keys: number[] = [];
    for (let midi = fromMidi; midi <= toMidi; midi += 1) {
      if (!isSharp(midi)) keys.push(midi);
    }
    return keys;
  }, [fromMidi, toMidi]);

  const done = position >= melody.length;

  const press = (midi: number) => {
    if (feedback || done) return;

    // ⚠ Хөтөч нь хэрэглэгчийн үйлдлийн ДОТОР л аудио контекстыг сэрээхийг
    // зөвшөөрдөг — энэ дуудлагыг эндээс зөөвөл эхний нот чимээгүй гарна.
    unlockAudio();
    playTone(midiToFrequency(midi));

    const note = midiToNote(midi);
    setPressed(note);
    if (pressTimer.current !== null) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setPressed(null), 180);

    if (note !== melody[position].note) {
      // ⚠ Аяыг эхнээс нь эхлүүлэхгүй — ЯГ ТЭР НОТ дээрээ үлдэж дахин оролдоно.
      setMistake(true);
      onMistake?.();
      return;
    }

    setMistake(false);
    const nextPosition = position + 1;
    setPosition(nextPosition);
    if (nextPosition >= melody.length) onAnswer(true);
  };

  const listen = () => {
    if (listening) return;
    unlockAudio();
    setListening(true);

    const seconds = playMelody(
      melody.map((item) => ({
        frequency: midiToFrequency(noteToMidi(item.note) ?? 60),
        beats: item.beats,
      })),
      bpm
    );

    if (listenTimer.current !== null) clearTimeout(listenTimer.current);
    listenTimer.current = setTimeout(() => setListening(false), toMs(seconds));
  };

  /**
   * Ая буруу хадгалагдсан тохиолдол (админ буруу бичсэн). Хоосон дэлгэц
   * үзүүлэхийн оронд шалтгааныг хэлж, сурагчийг гацаанаас гаргана —
   * "Үргэлжлүүлэх" товч гарч ирэхийн тулд хариулт өгөх ёстой.
   */
  if (melody.length === 0) {
    return (
      <div className="surface space-y-3 p-5">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Энэ дасгалын ая буруу тохируулагдсан байна. Багшдаа мэдэгдээрэй.
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
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

        <button
          type="button"
          onClick={listen}
          disabled={listening || feedback !== null}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-brand-500 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
        >
          <Volume2 className="h-4 w-4" />
          {listening ? "Тоглож байна…" : "Сонсох"}
        </button>
      </div>

      {/* Хэмнэлтэй ая дээр темпийг ил хэлнэ — "Сонсох" дээр сонсогдох
          хурд хаанаас гарч байгааг сурагч, багш хоёулаа харна. */}
      {hasRhythm && (
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Темп {bpm} · {tempoLabel(bpm)} · нийт {melodyBeats(melody)} цохилт
        </p>
      )}

      {/*
        Тоглох ёстой нотын дараалал. Аль хэдийн зөв дарсныг ногооноор, одоо
        дарах ёстойг тодруулна — сурагч хаана явж байгаагаа ямагт харна.
      */}
      <div className="flex flex-wrap gap-1.5">
        {melody.map(({ note, beats }, index) => {
          const played = index < position;
          const current = index === position && !feedback;

          let tone =
            "border-gray-200 text-gray-500 dark:border-white/10 dark:text-gray-400";
          if (played) {
            tone =
              "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
          } else if (current) {
            tone = "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300";
          }

          return (
            <span
              key={`${note}-${index}`}
              className={`rounded-lg border-2 px-2.5 py-1 text-sm font-semibold ${tone}`}
            >
              {noteSolfege(note) || note}
              {/* Нэг цохилтоос ялгаатай урттай нотод л уртыг бичнэ —
                  бүх нот дээр "1" гэж бичвэл зөвхөн чимээ шуугиан болно. */}
              {beats !== 1 && (
                <span className="ml-1 text-[11px] font-medium opacity-70">×{beats}</span>
              )}
            </span>
          );
        })}
      </div>

      {/*
        Гар. Цагаан товчлуурууд урсгал (flex) дотор жигд, хар товчлуурууд
        тэдгээрийн ЗААГ дээр `absolute`-аар байрлана — жинхэнэ хуурын
        байрлалыг давтана.

        ⚠ Гадна талд `overflow-x-auto`: 2-3 октав нь утасны дэлгэцэд
        багтахгүй тул гар нь ӨӨРӨӨ хэвтээ гүйнэ. Үүнгүй бол ХУУДАС
        бүхэлдээ хэвтээ гүйж, бусад бүх дэлгэц эвдэрнэ.
      */}
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div
          className="relative mx-auto flex h-44 select-none touch-none"
          style={{ width: `${whiteKeys.length * 44}px` }}
        >
          {whiteKeys.map((midi) => {
            const note = midiToNote(midi);
            const isPressed = pressed === note;

            return (
              <button
                key={note}
                type="button"
                onPointerDown={() => press(midi)}
                disabled={feedback !== null}
                aria-label={`${noteSolfege(note)} (${note})`}
                className={`relative flex h-full flex-1 items-end justify-center rounded-b-lg border border-gray-300 pb-2 text-xs font-semibold transition-colors dark:border-gray-600 ${
                  isPressed
                    ? "bg-brand-200 text-brand-800 dark:bg-brand-400/40 dark:text-white"
                    : "bg-white text-gray-500 dark:bg-gray-100 dark:text-gray-600"
                }`}
              >
                {noteSolfege(note)}
              </button>
            );
          })}

          {whiteKeys.map((midi, index) => {
            // Цагаан товчлуурын БАРУУН хажууд хар товчлуур байгаа эсэх
            // (Ми→Фа, Си→До хоёрын хооронд хар товч БАЙХГҮЙ).
            const sharpMidi = midi + 1;
            if (sharpMidi > toMidi || !isSharp(sharpMidi)) return null;

            const note = midiToNote(sharpMidi);
            const isPressed = pressed === note;

            return (
              <button
                key={note}
                type="button"
                onPointerDown={() => press(sharpMidi)}
                disabled={feedback !== null}
                aria-label={note}
                style={{ left: `${(index + 1) * 44 - 13}px` }}
                className={`absolute top-0 z-10 h-28 w-[26px] rounded-b-md border border-gray-900 transition-colors ${
                  isPressed ? "bg-brand-500" : "bg-gray-900 dark:bg-black"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/*
        ⚠ Зөв нотыг харуулахгүй — сурагч ЯГ ТЭР НОТ дээр дахин оролддог.
        Нотыг бичвэл сонсож, санахын оронд уншиж хуулна.
      */}
      {mistake && !feedback && (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
          Энэ нот биш байна. Аяыг дахин сонсоод оролдоорой.
        </p>
      )}
    </div>
  );
}
