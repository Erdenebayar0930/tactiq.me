/**
 * DAAMAL KIDS (4–6 нас) — хөтөлбөрийн хуваалцах төрөл, туслахууд.
 *
 * ⚠ ЭНЭ НАСНЫ ХҮҮХЭД УНШИЖ ЧАДАХГҮЙ. Тиймээс дасгал бүр ЗУРГААР (эможи)
 * ойлгогдох ёстой: асуулт нь богино, сонголтууд нь ихэвчлэн эможи эсвэл
 * ганц тоо/үсэг байна. Урт өгүүлбэр бол насанд хүрэгчид зориулсан дасгал —
 * хүүхэд түүнийг таамаглаж эхэлнэ.
 *
 * ⚠ Агуулга нь ГАРААР бус ҮҮСГЭГДЭНЭ: тоолох, нэмэх, үг таних зэрэг нь
 * загварчилсан (template) даалгаврууд тул 100+ хичээлийг гараар бичих нь
 * алдаа их, засварлахад хүнд. Үг, эможийн САН (`kidsData.ts`) + үүсгэгч
 * хоёр нь агуулгыг тогтвортой, засварлахад амархан байлгана.
 */

/** [монгол, англи] — бичвэр бүр ХОЁР хэлтэй (`lib/i18n/content.ts`). */
export type Bi = [mn: string, en: string];

export type KidsExercise =
  | {
      kind: "choice";
      prompt: Bi;
      options: Bi[];
      /** 0-ээс индекс. */
      correct: number;
      explain: Bi;
    }
  | { kind: "memory"; prompt: Bi; explain: Bi; items: string[] }
  | { kind: "slide"; prompt: Bi; explain: Bi; size: number }
  | { kind: "maze"; prompt: Bi; explain: Bi; grid: string }
  | {
      kind: "board-move";
      prompt: Bi;
      explain: Bi;
      fen: string;
      from: string;
      to: string;
    };

export type KidsLesson = { title: Bi; xp: number; exercises: KidsExercise[] };

export type KidsCourse = {
  slug: string;
  title: Bi;
  description: Bi;
  icon: string;
  color: string;
  school: string;
  /** Нэг курс = нэг «зам», сэдвүүд нь түвшний бүлгүүд. */
  units: { title: Bi; color: string; lessons: KidsLesson[] }[];
};

// --- Туслахууд ------------------------------------------------------------

export const choice = (
  prompt: Bi,
  options: Bi[],
  correct: number,
  explain: Bi
): KidsExercise => ({ kind: "choice", prompt, options, correct, explain });

export const memory = (prompt: Bi, explain: Bi, items: string[]): KidsExercise => ({
  kind: "memory",
  prompt,
  explain,
  items,
});

export const slide = (prompt: Bi, explain: Bi, size: number): KidsExercise => ({
  kind: "slide",
  prompt,
  explain,
  size,
});

/**
 * Давтагдах санамсаргүй тоо.
 *
 * ⚠ Хичээлийн агуулга нь дахин үүсгэхэд ЯГ ИЖИЛ гарах ёстой: script-ийг
 * дахин ажиллуулахад «шинэ» дасгал үүсвэл сурагчийн дуусгасан хичээл
 * өөрчлөгдөж, явц нь утгаа алдана.
 */
export function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Fisher–Yates — өгөгдсөн rng-ээр тогтвортой холино. */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

/**
 * Зөв хариулт + буруу хариултуудаас СОНГОЛТЫН багц үүсгэнэ.
 *
 * ⚠ Зөв хариултын БАЙРЛАЛЫГ холино: үргэлж эхэнд байвал хүүхэд агуулгыг
 * биш, байрлалыг цээжилнэ (энэ насны хүүхэд үүнийг маш хурдан олдог).
 */
export function options(
  correct: Bi,
  wrong: Bi[],
  rng: () => number
): { options: Bi[]; correct: number } {
  const all = shuffle([correct, ...wrong], rng);
  return { options: all, correct: all.indexOf(correct) };
}

/** Тоог сонголт болгоно — хоёр хэлэнд ижил тул давхардуулж бичихгүй. */
export const num = (value: number): Bi => [String(value), String(value)];

/** Эможи давтах — «хэдэн ширхэг вэ?» асуултын зураг. */
export const repeatEmoji = (emoji: string, count: number) => emoji.repeat(count);
