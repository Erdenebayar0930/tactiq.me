/**
 * Даамын хөтөлбөрийн ХУВААЛЦАХ төрөл, туслахууд.
 *
 * ⚠ Агуулга нь ТҮВШНЭЭР нь тусдаа файлд (`draughtsLevels*.ts`) байрлана:
 * 10 түвшний 60+ хичээл нэг файлд байвал тэр файл хэнд ч уншигдахгүй
 * болно. Seeder (`scripts/seed-draughts-curriculum.ts`) тэднийг нийлүүлнэ.
 */
import type { MoveFilter } from "../../src/lib/draughts/generate";

/** Дүрсийн тоо — байрлал үүсгэгчид дамжуулах тохиргоо. */
export type Pieces = {
  whites: number;
  blacks: number;
  whiteKings?: number;
  blackKings?: number;
};

/** [монгол, англи] — бичвэр бүр ХОЁР хэлтэй (`lib/i18n/content.ts`). */
export type Bi = [mn: string, en: string];

export type SeedExercise =
  | {
      kind: "choice";
      prompt: Bi;
      options: Bi[];
      /** 0-ээс индекс — "a"/"b"/"c"/"d" руу хөрвүүлнэ. */
      correct: number;
      explain: Bi;
    }
  | {
      kind: "move";
      prompt: Bi;
      explain: Bi;
      /** Хэдэн байрлал үүсгэх вэ (олдохгүй бол олдсоноор). */
      count: number;
      filter: MoveFilter;
      pieces: Pieces;
    }
  | {
      kind: "combo";
      prompt: Bi;
      explain: Bi;
      count: number;
      pieces: Pieces;
      minGain?: number;
    };

/**
 * ШИНЭ (2-р шатны) хичээлийн үүсгэгчийн тохиргоо — `draughtsGenerators.ts`.
 * Хуучин `move`/`combo` нь `src/lib/draughts/generate.ts`-ийг шууд
 * дууддаг тул тэдгээрийн гаралт ӨӨРЧЛӨГДӨХГҮЙ (санд аль хэдийн байгаа).
 */
export type MoveSpec = {
  type: "move";
  pieces: Pieces;
  minCaptures?: number;
  maxCaptures?: number;
  quietOnly?: boolean;
  mustPromote?: boolean;
  /** Нүүх дүрс нь даам байх. */
  byKing?: boolean;
  /** Нүүх дүрс нь энгийн хүү байх. */
  byMan?: boolean;
  /** Хүүгийн эхний үсрэлт ХОЙШ (цагааны хувьд доош) чиглэх. */
  backward?: boolean;
  /** Хөлөг дээр өөр (богино) идэлт ч эхэлж болох — «хамгийн их идэлт» дүрмийн дасгал. */
  majority?: boolean;
};

export type ComboSpec = {
  type: "combo";
  pieces: Pieces;
  minGain?: number;
  /** Цэвэр ашиггүй, тэнцүү солилцоо (өгсөн = авсан). */
  exchange?: boolean;
};

/** Сурагчийн 3 нүүдэлтэй цуваа: тулгуур → албадмал идэлт → албадмал хариу → эцсийн идэлт. */
export type Combo3Spec = { type: "combo3"; pieces: Pieces; minGain?: number };

export type GenSpec = MoveSpec | ComboSpec | Combo3Spec;

export type GenExercise = { kind: "gen"; prompt: Bi; explain: Bi; count: number; spec: GenSpec };

export type SeedLesson = {
  title: Bi;
  xp: number;
  exercises: (SeedExercise | GenExercise)[];
  /**
   * ТОГТВОРТОЙ үрийн түлхүүр. Байвал энэ нь ШИНЭ хичээл: үр нь гарчгаас
   * биш энэ түлхүүрээс гарах тул гарчгийг засахад агуулга өөрчлөгдөхгүй.
   * Байхгүй бол хуучин хичээл (үр нь гарчгаас — санд байгаатай ижил).
   */
  seedKey?: string;
};
export type SeedUnit = { title: Bi; color: string; lessons: SeedLesson[] };

// --- Бичихэд хэмнэлттэй туслахууд ---------------------------------------

export const q = (prompt: Bi, options: Bi[], correct: number, explain: Bi): SeedExercise => ({
  kind: "choice",
  prompt,
  options,
  correct,
  explain,
});

export const move = (
  prompt: Bi,
  explain: Bi,
  count: number,
  filter: MoveFilter,
  pieces: Pieces
): SeedExercise => ({ kind: "move", prompt, explain, count, filter, pieces });

export const combo = (
  prompt: Bi,
  explain: Bi,
  count: number,
  pieces: Pieces,
  minGain?: number
): SeedExercise => ({ kind: "combo", prompt, explain, count, pieces, minGain });

export const gen = (prompt: Bi, explain: Bi, count: number, spec: GenSpec): GenExercise => ({
  kind: "gen",
  prompt,
  explain,
  count,
  spec,
});

// --- Дахин дахин хэрэглэгдэх даалгавар, тайлбар --------------------------

export const CAPTURE_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Идэх боломжоо ол.",
  "White to play. Find the capture.",
];

export const CAPTURE_EXPLAIN: Bi = [
  "Даамд идэх боломж гарвал ЗААВАЛ идэх ёстой — тиймээс идэлтийг эхлээд хай.",
  "In draughts a capture is compulsory — so always look for captures first.",
];

export const CHAIN_EXPLAIN: Bi = [
  "Идсэн газраа зогсохгүй: цааш идэх боломж байвал ҮРГЭЛЖЛҮҮЛЭН үсэрнэ.",
  "Do not stop after the first jump: keep jumping while captures remain.",
];

export const QUIET_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Боломжтой нүүдлийг хий.",
  "White to play. Make the available move.",
];

export const COMBO_PROMPT: Bi = [
  "Цагаанаар тоглож байна. Тулгуураа өгөөд цохи.",
  "White to play. Give the setup piece, then strike.",
];

export const COMBO_EXPLAIN: Bi = [
  "Эхний нүүдэл нь ТУЛГУУР — дүрсээ зориуд өгнө. Хар тал идэхээс өөр аргагүй бөгөөд дараа нь цагаан илүүг эргүүлж авна.",
  "The first move is a setup sacrifice. Black has no choice but to take, and White then wins more material back.",
];
