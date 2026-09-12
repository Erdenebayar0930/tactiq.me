/**
 * Нотын НЭГ ЭХ СУРВАЛЖ — нэр, давтамж, монгол дуудлага.
 *
 * ЯАГААД ТУСДАА ФАЙЛ ВЭ: нот нь дасгалын компонент (`PianoExercise`), админы
 * оруулах маягт, серверийн шалгалт (`lib/api/courseAdmin.ts`) гэсэн ГУРВАН
 * тусдаа газарт хэрэгтэй. Гурвуулаа өөр өөрөөр задалж эхэлбэл админ дээр
 * хүлээн авсан аяыг тоглуулагч танихгүй байх эвдрэл гарна.
 *
 * ⚠ `server-only` БИШ: клиент компонент ба сервер талын шалгалт хоёулаа
 * импортолдог.
 */

/** Нэг октав дахь 12 хагас аялгуу. Диезээр (♯) бичнэ — бемоль дэмжихгүй. */
const CHROMATIC = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export type NoteLetter = (typeof CHROMATIC)[number];

/**
 * Нотын нэр — шинжлэх ухааны бичиглэл: үсэг + (заавал биш ♯) + октавын дугаар.
 * Жишээ: "C4" (дунд до), "F#5".
 */
export type NoteName = string;

/** "C4", "F#5" гэх мэт нэр зөв эсэх. Октав 1-7 — төгөлдөр хуурын хэрэглээний хүрээ. */
export const NOTE_RE = /^([A-G])(#?)([1-7])$/;

/**
 * Нотын нэрийг MIDI дугаар болгоно (C4 = 60). Буруу нэр бол `null`.
 *
 * MIDI дугаараар дамжуулах шалтгаан: өндөр/нам харьцуулах, интервал бодох,
 * товчлуурын дарааллыг эрэмбэлэх — бүгд энгийн бүхэл тооны арифметик болно.
 */
export function noteToMidi(name: string): number | null {
  /**
   * ⚠ ТОМ ҮСЭГ болгож байж таарна. Хөгжимд нотын үсэг ҮРГЭЛЖ том бичигддэг
   * ба жижиг үсэг нь өөр утга агуулдаггүй (шатрын FEN-ээс ялгаатай — тэнд
   * жижиг/том нь өнгө заадаг тул хөрвүүлэх нь АЛДАА байх байсан). Багш
   * маягтад "c4" гэж бичихэд татгалзвал зөвхөн будлиан үүснэ.
   */
  const match = NOTE_RE.exec(name.trim().toUpperCase());
  if (!match) return null;

  const [, letter, sharp, octave] = match;
  const index = CHROMATIC.indexOf(`${letter}${sharp}` as NoteLetter);
  if (index < 0) return null;

  // MIDI-д C-1 = 0 тул октав бүр 12, C4 = (4 + 1) * 12 = 60.
  return (Number(octave) + 1) * 12 + index;
}

/** MIDI дугаараас нэр рүү буцаана (60 → "C4"). */
export function midiToNote(midi: number): NoteName {
  const letter = CHROMATIC[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${letter}${octave}`;
}

/**
 * Давтамж (Гц) — A4 = 440 Гц-ээс тэгш темперацлагдсан хэмжүүрээр.
 *
 * Хагас аялгуу тутам давтамж `2^(1/12)` дахин өснө; октав бүрд яг хоёр дахин.
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Хар товчлуур эсэх — гарын зурагт байрлалыг шийднэ. */
export function isSharp(midi: number): boolean {
  return CHROMATIC[((midi % 12) + 12) % 12].includes("#");
}

/**
 * Сурагчид харагдах МОНГОЛ дуудлага.
 *
 * ЯАГААД: 8-12 насны хүүхэд "C", "D" гэсэн латин үсгээр биш "До", "Ре" гэж
 * сурдаг (ЕБС-ийн хөгжмийн хөтөлбөр). Товчлуур дээр зөвхөн латин үсэг
 * бичвэл хичээл нь өөрөө бичиг үсгийн даалгавар болж хувирна.
 *
 * Диез нотод дуудлага өгөөгүй — хар товчлуур дээр бичээс тавихгүй (жижиг
 * бөгөөд эхлэн суралцагчийн аянд ховор тохиолдоно).
 */
const SOLFEGE: Record<string, string> = {
  C: "До",
  D: "Ре",
  E: "Ми",
  F: "Фа",
  G: "Соль",
  A: "Ля",
  B: "Си",
};

/** "C4" → "До". Диез бол хоосон мөр. */
export function noteSolfege(name: string): string {
  // `noteToMidi`-тай ИЖИЛ хэлбэрт буулгана — эс бөгөөс "c4" нь дугаар авч
  // чаддаг мөртлөө дуудлагагүй болж, товчлуур дээр бичээсгүй үлдэнэ.
  const match = NOTE_RE.exec(name.trim().toUpperCase());
  if (!match) return "";
  const [, letter, sharp] = match;
  return sharp ? "" : (SOLFEGE[letter] ?? "");
}

/**
 * Нэг нот — өндөр (`note`) БА үргэлжлэх хугацаа (`beats`, цохилтоор).
 *
 * ЯАГААД ХУГАЦАА ХЭРЭГТЭЙ ВЭ: зөвхөн өндрийг хадгалбал "Анивчих одод" ба
 * ямар нэг санамсаргүй нотын жагсаалт хоёр ЯГ АДИЛХАН сонсогдоно — бүх нот
 * тэнцүү урттай. Хэмнэл (ритм) бол аяыг таниулдаг гол бүрэлдэхүүн бөгөөд
 * "хэмжээ" (2/4, 3/4), "темп" гэсэн ойлголтыг заахад бүр ЗААВАЛ хэрэгтэй.
 */
export type MelodyNote = {
  note: NoteName;
  /** Цохилтын тоо: 1 = улирал, 0.5 = найм, 2 = хагас нот. */
  beats: number;
};

/** Зөвшөөрөгдөх урт — стандарт нотын үргэлжлэлүүд. */
const ALLOWED_BEATS = [0.5, 1, 1.5, 2, 3, 4];

/** Нотын урт → монгол нэр (дасгал дээр тайлбарлахад). */
export const BEAT_LABELS: Record<string, string> = {
  "0.5": "хагас цохилт",
  "1": "нэг цохилт",
  "1.5": "нэг ба хагас",
  "2": "хоёр цохилт",
  "3": "гурван цохилт",
  "4": "дөрвөн цохилт",
};

/**
 * Аяны мөрийг (`exercises.melody`) нот массив болгоно.
 *
 * Хэлбэр: хоосон зайгаар тусгаарласан нотууд, хугацааг хоёр цэгээр —
 *   "C4 D4 E4 C4"          → бүгд НЭГ цохилт (хугацаа бичээгүй бол 1)
 *   "C4:1 D4:0.5 E4:0.5"   → улирал, найм, найм
 *
 * Таслал, олон зай, мөр таслалтыг ч зөвшөөрнө (админ гараар бичихэд
 * хүлцэнгүй байх нь алдааг багасгана).
 *
 * ⚠ Хугацаагүй хуучин мөрүүд (шинэ багана нэмэхээс өмнөх агуулга) ХЭВЭЭР
 * ажиллана — тэдгээр нь "бүх нот 1 цохилт" гэж уншигдана.
 *
 * Нэг ч нот буруу бол `null` — ХЭСЭГЧЛЭН зөв аяыг хүлээж авбал сурагч
 * дуусгаж чадахгүй хичээл үүснэ.
 */
export function parseMelody(raw: string | null | undefined): MelodyNote[] | null {
  if (typeof raw !== "string") return null;

  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);

  if (parts.length === 0) return null;

  const notes: MelodyNote[] = [];
  for (const part of parts) {
    const [rawNote, rawBeats] = part.split(":");

    const midi = noteToMidi(rawNote);
    if (midi === null) return null;

    let beats = 1;
    if (rawBeats !== undefined) {
      beats = Number(rawBeats);
      // Дурын бутархай зөвшөөрөхгүй: 0.37 цохилт нь хөгжмийн утгагүй бөгөөд
      // сурагчид ялгаж сонсогдохгүй. Стандарт үргэлжлэлээр хязгаарлана.
      if (!ALLOWED_BEATS.includes(beats)) return null;
    }

    // Нэрийг ХЭВШСЭН хэлбэрт нь буулгана ("c4" → "C4") — товчлууртай
    // харьцуулахад мөрийн яг тэнцүүг ашигладаг тул энэ нэгтгэл чухал.
    notes.push({ note: midiToNote(midi), beats });
  }

  return notes;
}

/**
 * Задалсан аяыг ЭРГЭЭД мөр болгоно — санд хадгалахын өмнө нэгтгэхэд.
 *
 * Бүх нот 1 цохилттой бол хугацааг ОГТ БИЧИХГҮЙ: "C4 D4" нь "C4:1 D4:1"-тэй
 * утга нэг боловч богино, багш нарт уншихад амар.
 */
export function formatMelody(notes: MelodyNote[]): string {
  const plain = notes.every((item) => item.beats === 1);
  return notes
    .map((item) => (plain ? item.note : `${item.note}:${item.beats}`))
    .join(" ");
}

/** Аяны нийт үргэлжлэл цохилтоор — хэмжээнд багтаж байгаа эсэхийг шалгахад. */
export function melodyBeats(notes: MelodyNote[]): number {
  return notes.reduce((total, item) => total + item.beats, 0);
}

/**
 * Хэмжээ (цохилтын хуваарь) — "2/4", "3/4", "4/4".
 *
 * ЗӨВХӨН эдгээрийг дэмжинэ: эхлэн суралцагчийн бүх хичээл эдгээрийн дотор
 * багтдаг ба бүгд дөрөвний нэгээр (♩ = 1 цохилт) тоолдог тул тоолох логик
 * НЭГ хэвээр үлдэнэ. 6/8 гэх мэт нийлмэл хэмжээ нь өөр тоолол шаарддаг тул
 * дэмжихийн өмнө тоолуур, метрономыг дахин зохиох хэрэгтэй.
 */
export const METERS = ["2/4", "3/4", "4/4"] as const;
export type Meter = (typeof METERS)[number];

export function parseMeter(value: unknown): Meter | null {
  return typeof value === "string" && (METERS as readonly string[]).includes(value)
    ? (value as Meter)
    : null;
}

/** Нэг тактад хэдэн цохилт байх вэ ("3/4" → 3). */
export function beatsPerBar(meter: Meter): number {
  return Number(meter.split("/")[0]);
}

/**
 * Темп (BPM) — минутад хэдэн цохилт.
 *
 * Хязгаар нь сурган хүмүүжүүлэх шалтгаантай: 40-өөс доош нь хүүхдэд
 * "зогссон" мэт санагдаж хэмнэл алдагдана, 200-аас дээш нь дэлгэц дээр
 * дарж амжихааргүй болно.
 */
export const TEMPO_MIN = 40;
export const TEMPO_MAX = 200;
export const TEMPO_DEFAULT = 90;

export function parseTempo(value: unknown): number | null {
  const bpm = Math.round(Number(value));
  if (!Number.isFinite(bpm) || bpm < TEMPO_MIN || bpm > TEMPO_MAX) return null;
  return bpm;
}

/** Темпний монгол нэр — итали нэр томьёог хүүхдэд ойлгомжтой болгоно. */
export function tempoLabel(bpm: number): string {
  if (bpm < 66) return "Маш удаан";
  if (bpm < 88) return "Удаан";
  if (bpm < 120) return "Дунд";
  if (bpm < 160) return "Хурдан";
  return "Маш хурдан";
}

/** Нэг цохилт хэдэн секунд үргэлжлэх вэ. */
export function beatSeconds(bpm: number): number {
  return 60 / bpm;
}

/** Аяны дээд урт — хэт урт аяыг хүүхэд цээжлэхгүй, DB талбар ч 200 тэмдэгт. */
export const MELODY_MAX_NOTES = 24;
