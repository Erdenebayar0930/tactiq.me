/**
 * ҮГИЙН ТААВАР — холилдсон үсгүүдээс үгийг угсарна.
 *
 * ⚠ `server-only` БИШ: клиент компонент, серверийн шалгалт, seed script
 * гурвуулаа импортолдог.
 *
 * ⚠ ХОЛИЛТЫГ ХАДГАЛАХГҮЙ. Зөвхөн ХАРИУГ хадгалж, үсгүүдийг дасгалын
 * ID-гаар үрлэж холино (`shuffleFor`). Хоёр шалтгаан:
 *
 *   • Холилтыг мөрөнд хадгалбал багш түүнийг гараар засаж, хариуны
 *     үсгүүдтэй ТААРАХГҮЙ болгож чадна — тэр үед оньсого шийдэгдэхгүй.
 *   • ID-аас үүсэх тул хуудсыг сэргээхэд ИЖИЛ холилт гарна: сурагч
 *     дахин ачаалаад өөр (илүү хялбар) холилт авах боломжгүй.
 */

/** Хадгалах хэлбэр: "word:<хариу>" — кирилл үсэг, 3-14 тэмдэгт. */
export const WORD_RE = /^word:([Ѐ-ӿ]{3,14})$/;

export type WordPuzzle = { answer: string };

export function encodeWord(puzzle: WordPuzzle): string {
  return `word:${puzzle.answer}`;
}

/**
 * Задалж ШАЛГАНА.
 *
 * ⚠ Бүх үсэг нь ИЖИЛ байх үг (жишээ нь «ааа») нь холихын аргагүй —
 * сурагч юу ч дарсан зөв болно, таавар нь утгагүй.
 */
export function decodeWord(raw: string | null | undefined): WordPuzzle | null {
  if (typeof raw !== "string") return null;

  const match = WORD_RE.exec(raw.trim());
  if (!match) return null;

  const answer = match[1];
  if (new Set(answer).size < 2) return null;

  return { answer };
}

export function isCorrect(puzzle: WordPuzzle, attempt: string): boolean {
  return attempt === puzzle.answer;
}

/**
 * Үсгүүдийг үрээр холино.
 *
 * ⚠ Үр дүн нь ХАРИУТАЙ ИЖИЛ байх ёсгүй — тэгвэл таавар нь «бэлэн үгийг
 * дарах» болно. Тааралдвал хоёр үсгийг сольж баталгаажуулна.
 */
export function shuffleFor(answer: string, rng: () => number): string[] {
  const letters = [...answer];

  for (let i = letters.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }

  if (letters.join("") === answer && letters.length > 1) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }

  return letters;
}
