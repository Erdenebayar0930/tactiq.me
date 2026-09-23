/**
 * DAAMAL KIDS — 6 курсын агуулгыг ҮҮСГЭНЭ (4–6 нас).
 *
 * ⚠ Хичээлүүд нь ГАРААР БИЧИГДЭХГҮЙ, загвараас үүснэ: тоолох, нэмэх, үг
 * таних зэрэг нь давтагдах бүтэцтэй тул 100+ хичээлийг гараар бичих нь
 * алдаа их, засварлахад хүнд байх байсан. Үр нь хичээлийн нэрнээс гардаг
 * тул дахин ажиллуулахад ЯГ ИЖИЛ агуулга гарна.
 *
 * ⚠ Дасгал бүр ЗУРГААР ойлгогдоно (`kidsShared.ts`-ийн тайлбар): 4–6
 * насны хүүхэд уншиж чадахгүй.
 */
import { Chess } from "chess.js";

import {
  ANIMALS,
  BODY,
  COLORS,
  DAILY,
  FAMILY,
  FOOD,
  MN_LETTERS,
  MN_SYLLABLES,
  NUMBER_WORDS,
  SHAPES,
  emojiLabel,
  wordLabel,
  type Word,
} from "./kidsData";
import {
  choice,
  makeRng,
  memory,
  num,
  options,
  repeatEmoji,
  seedFromString,
  shuffle,
  slide,
  type Bi,
  type KidsCourse,
  type KidsExercise,
  type KidsLesson,
} from "./kidsShared";

/** Хичээл бүрд ӨӨР, гэхдээ ТОГТВОРТОЙ үр. */
const rngFor = (key: string) => makeRng(seedFromString(key));

/** Тухайн үгээс бусдыг санамсаргүй сонгож «буруу хариулт» болгоно. */
function distractors(pool: Word[], correct: Word, count: number, rng: () => number): Word[] {
  return shuffle(
    pool.filter((word) => word.emoji !== correct.emoji),
    rng
  ).slice(0, count);
}

// ---------------------------------------------------------------------------
// 1. MATH KIDS
// ---------------------------------------------------------------------------

/** «Хэдэн ширхэг вэ?» — эможи тоолох. */
function countingLesson(level: number, max: number): KidsLesson {
  const rng = rngFor(`math-count-${level}`);
  const exercises: KidsExercise[] = [];

  for (let index = 0; index < 5; index += 1) {
    const word = shuffle(ANIMALS.concat(FOOD), rng)[0];
    const count = 1 + Math.floor(rng() * max);
    const wrong = shuffle(
      Array.from({ length: max }, (_, i) => i + 1).filter((value) => value !== count),
      rng
    ).slice(0, 2);

    const picked = options(num(count), wrong.map(num), rng);
    exercises.push(
      choice(
        [`Хэдэн ${word.mn} байна вэ?`, `How many ${word.en} are there?`],
        picked.options,
        picked.correct,
        [
          `${repeatEmoji(word.emoji, count)} — ${count}`,
          `${repeatEmoji(word.emoji, count)} — ${count}`,
        ]
      )
    );
    // Асуултын зурган хэсэг — эможи нь сонголтод биш, асуултад байна.
    const last = exercises[exercises.length - 1];
    if (last.kind === "choice") {
      last.prompt = [
        `${repeatEmoji(word.emoji, count)}\nХэдэн ${word.mn} байна вэ?`,
        `${repeatEmoji(word.emoji, count)}\nHow many ${word.en}?`,
      ];
    }
  }

  return {
    title: [`Тоолъё — 1-ээс ${max}`, `Counting — 1 to ${max}`],
    xp: 10,
    exercises,
  };
}

/** Хэлбэр таних. */
function shapeLesson(level: number): KidsLesson {
  const rng = rngFor(`math-shape-${level}`);
  const exercises = SHAPES.slice(0, 5).map((shape) => {
    const picked = options(
      emojiLabel(shape),
      distractors(SHAPES, shape, 2, rng).map(emojiLabel),
      rng
    );
    return choice(
      [`Аль нь ${shape.mn} вэ?`, `Which one is a ${shape.en}?`],
      picked.options,
      picked.correct,
      [`${shape.emoji} — ${shape.mn}`, `${shape.emoji} — ${shape.en}`]
    );
  });

  return { title: ["Хэлбэрүүд", "Shapes"], xp: 10, exercises };
}

/** Хэмжээ — том/жижиг. */
function sizeLesson(): KidsLesson {
  const pairs: [Word, Word][] = [
    [
      { emoji: "🐘", mn: "заан", en: "elephant" },
      { emoji: "🐭", mn: "хулгана", en: "mouse" },
    ],
    [
      { emoji: "🌳", mn: "мод", en: "tree" },
      { emoji: "🌱", mn: "нахиа", en: "sprout" },
    ],
    [
      { emoji: "🚌", mn: "автобус", en: "bus" },
      { emoji: "🚲", mn: "дугуй", en: "bicycle" },
    ],
    [
      { emoji: "🐳", mn: "халим", en: "whale" },
      { emoji: "🐟", mn: "загас", en: "fish" },
    ],
  ];

  const exercises = pairs.flatMap(([big, small], index) => [
    choice(
      ["Аль нь ТОМ вэ?", "Which one is BIG?"],
      index % 2 === 0
        ? [emojiLabel(big), emojiLabel(small)]
        : [emojiLabel(small), emojiLabel(big)],
      index % 2 === 0 ? 0 : 1,
      [`${big.emoji} ${big.mn} нь том.`, `${big.emoji} the ${big.en} is big.`]
    ),
    choice(
      ["Аль нь ЖИЖИГ вэ?", "Which one is SMALL?"],
      index % 2 === 0
        ? [emojiLabel(big), emojiLabel(small)]
        : [emojiLabel(small), emojiLabel(big)],
      index % 2 === 0 ? 1 : 0,
      [`${small.emoji} ${small.mn} нь жижиг.`, `${small.emoji} the ${small.en} is small.`]
    ),
  ]);

  return { title: ["Том ба жижиг", "Big and small"], xp: 10, exercises };
}

/** Дараалал — «дараа нь юу вэ?» */
function sequenceLesson(level: number, step: number): KidsLesson {
  const rng = rngFor(`math-seq-${level}-${step}`);
  const exercises: KidsExercise[] = [];

  for (let index = 0; index < 5; index += 1) {
    const start = 1 + Math.floor(rng() * 5);
    const series = [start, start + step, start + step * 2];
    const answer = start + step * 3;
    const wrong = [answer + step, Math.max(1, answer - step)];

    const picked = options(num(answer), wrong.map(num), rng);
    exercises.push(
      choice(
        [`${series.join(" · ")} · ?`, `${series.join(" · ")} · ?`],
        picked.options,
        picked.correct,
        [
          `Тоо ${step}-аар нэмэгдэж байна: дараагийнх нь ${answer}.`,
          `The numbers grow by ${step}: the next one is ${answer}.`,
        ]
      )
    );
  }

  return {
    title: step === 1 ? ["Дараалал", "Sequences"] : ["Дараалал — 2-оор", "Sequences — by 2"],
    xp: 10,
    exercises,
  };
}

/** Нэмэх / хасах — эможигоор. */
function arithmeticLesson(level: number, kind: "add" | "sub", max: number): KidsLesson {
  const rng = rngFor(`math-${kind}-${level}`);
  const exercises: KidsExercise[] = [];

  for (let index = 0; index < 5; index += 1) {
    const emoji = shuffle(FOOD, rng)[0].emoji;
    const a = 1 + Math.floor(rng() * (max - 1));
    const b = 1 + Math.floor(rng() * (max - a));
    const answer = kind === "add" ? a + b : Math.max(0, a);
    const left = kind === "add" ? a : a + b;
    const right = b;
    const result = kind === "add" ? a + b : left - right;

    const wrong = shuffle(
      [result + 1, Math.max(0, result - 1), result + 2].filter((value) => value !== result),
      rng
    ).slice(0, 2);

    const picked = options(num(result), wrong.map(num), rng);
    const sign = kind === "add" ? "+" : "−";

    exercises.push(
      choice(
        [
          `${repeatEmoji(emoji, left)} ${sign} ${repeatEmoji(emoji, right)} = ?`,
          `${repeatEmoji(emoji, left)} ${sign} ${repeatEmoji(emoji, right)} = ?`,
        ],
        picked.options,
        picked.correct,
        [
          `${left} ${sign} ${right} = ${result}`,
          `${left} ${sign} ${right} = ${result}`,
        ]
      )
    );
    void answer;
  }

  return {
    title: kind === "add" ? ["Нэмэх", "Adding"] : ["Хасах", "Subtracting"],
    xp: 15,
    exercises,
  };
}

function mathKids(): KidsCourse {
  const rng = rngFor("math-memory");

  return {
    slug: "math-kids",
    title: ["Тоо Kids", "Math Kids"],
    description: [
      "4–6 насны хүүхдэд: тоолох, хэлбэр, хэмжээ, дараалал, нэмэх, хасах — бүгд зурган дасгалаар.",
      "For ages 4–6: counting, shapes, sizes, sequences, adding and subtracting — all through pictures.",
    ],
    icon: "calculator",
    color: "sky",
    school: "mind",
    units: [
      {
        title: ["Тоолж сурах", "Learning to count"],
        color: "sky",
        lessons: [
          countingLesson(1, 3),
          countingLesson(2, 5),
          countingLesson(3, 5),
          countingLesson(4, 10),
          countingLesson(5, 10),
          {
            title: ["Тооны санах ой", "Number memory"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил тоонуудыг хосоор нь ол.", "Find the matching numbers."],
                ["Ижил хосыг олоход анхаарал, санах ой хоёулаа хөгжинө.", "Matching pairs trains attention and memory."],
                ["1", "2", "3", "4"]
              ),
            ],
          },
        ],
      },
      {
        title: ["Хэлбэр ба хэмжээ", "Shapes and sizes"],
        color: "violet",
        lessons: [
          shapeLesson(1),
          shapeLesson(2),
          sizeLesson(),
          {
            title: ["Хэлбэрийн санах ой", "Shape memory"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил хэлбэрүүдийг ол.", "Find the matching shapes."],
                ["Хэлбэрийг нүдээр таних нь геометрийн эхний алхам.", "Recognising shapes by eye is the first step in geometry."],
                shuffle(SHAPES, rng)
                  .slice(0, 4)
                  .map((shape) => shape.emoji)
              ),
            ],
          },
        ],
      },
      {
        title: ["Дараалал", "Sequences"],
        color: "emerald",
        lessons: [sequenceLesson(1, 1), sequenceLesson(2, 1), sequenceLesson(3, 2)],
      },
      {
        title: ["Нэмэх, хасах", "Adding and subtracting"],
        color: "amber",
        lessons: [
          arithmeticLesson(1, "add", 5),
          arithmeticLesson(2, "add", 8),
          arithmeticLesson(3, "add", 10),
          arithmeticLesson(4, "sub", 5),
          arithmeticLesson(5, "sub", 8),
          arithmeticLesson(6, "sub", 10),
        ],
      },
      {
        title: ["Оньсого", "Puzzles"],
        color: "rose",
        lessons: [
          {
            title: ["Гулсдаг оньсого", "Sliding puzzle"],
            xp: 15,
            exercises: [
              slide(
                ["Тоонуудыг эрэмбэлж өр.", "Slide the numbers into order."],
                ["Алхам алхмаар бодох нь оньсогын гол ур чадвар.", "Thinking step by step is the key puzzle skill."],
                3
              ),
            ],
          },
          {
            title: ["Том оньсого", "Bigger puzzle"],
            xp: 20,
            exercises: [
              slide(
                ["Дөрвөн эгнээтэй оньсогыг эвл.", "Solve the four-row puzzle."],
                ["Илүү олон хэсэг = илүү олон алхам. Яаралгүй бод.", "More pieces means more steps. Take your time."],
                4
              ),
            ],
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 2. МОНГОЛ ХЭЛ KIDS
// ---------------------------------------------------------------------------

/** Үсэг таних — «аль нь энэ үсгээр эхэлдэг вэ?» */
function letterLesson(index: number, letters: typeof MN_LETTERS): KidsLesson {
  const rng = rngFor(`mn-letters-${index}`);
  const pool = MN_LETTERS.map((entry) => entry.word);

  const exercises = letters.map((entry) => {
    const picked = options(
      emojiLabel(entry.word),
      distractors(pool, entry.word, 2, rng).map(emojiLabel),
      rng
    );
    return choice(
      [`«${entry.letter}» үсгээр эхэлдэг нь аль нь вэ?`, `Which one starts with "${entry.letter}"?`],
      picked.options,
      picked.correct,
      [
        `${entry.word.emoji} ${entry.word.mn} — «${entry.letter}» авиагаар эхэлнэ.`,
        `${entry.word.emoji} ${entry.word.mn} (${entry.word.en}) starts with "${entry.letter}".`,
      ]
    );
  });

  const title = `${letters[0].letter}–${letters[letters.length - 1].letter}`;
  return { title: [`Үсэг: ${title}`, `Letters: ${title}`], xp: 10, exercises };
}

/**
 * ҮСЭГ СУРАХ — 100 дасгалтай нэгтгэл хичээлийн үсгийн сан.
 *
 * ⚠ `MN_LETTERS`-ийг ЭНД ХЭРЭГЛЭХГҮЙ. Тэнд «Е → ээж» (Э-ээр эхэлдэг),
 * «В → 🚐» (зураг таарахгүй) гэсэн алдаа бий, харин тэр санг засвал 3-3-аар
 * хуваасан хуучин хичээлүүдийн нэр (`Үсэг: А–В`) өөрчлөгдөж, seed нь
 * тэдгээрийг ШИНЭ хичээл гэж үзээд давхар нэмнэ. Тиймээс тусдаа, шалгасан сан.
 *
 * `lookalikes` — ХЭЛБЭРЭЭРЭЭ төстэй үсгүүд. «Аль нь М вэ?» асуултын буруу
 * хариулт санамсаргүй бус төстэй үсэг байх ёстой: М-ийг Я-гаас ялгах нь
 * хялбар, Н-ээс ялгах нь жинхэнэ сурах зүйл.
 */
const LETTER_BANK: { letter: string; word: Word; lookalikes: [string, string] }[] = [
  { letter: "А", word: { emoji: "🍎", mn: "алим", en: "apple" }, lookalikes: ["Д", "Л"] },
  { letter: "Б", word: { emoji: "🐻", mn: "баавгай", en: "bear" }, lookalikes: ["В", "Р"] },
  { letter: "В", word: { emoji: "🚃", mn: "вагон", en: "railway car" }, lookalikes: ["Б", "З"] },
  { letter: "Г", word: { emoji: "👟", mn: "гутал", en: "shoe" }, lookalikes: ["Т", "П"] },
  { letter: "Д", word: { emoji: "🏪", mn: "дэлгүүр", en: "shop" }, lookalikes: ["Л", "А"] },
  { letter: "Ж", word: { emoji: "🍪", mn: "жигнэмэг", en: "cookie" }, lookalikes: ["Х", "К"] },
  { letter: "З", word: { emoji: "🐟", mn: "загас", en: "fish" }, lookalikes: ["Э", "В"] },
  { letter: "И", word: { emoji: "🐆", mn: "ирвэс", en: "snow leopard" }, lookalikes: ["Н", "П"] },
  { letter: "К", word: { emoji: "💻", mn: "компьютер", en: "computer" }, lookalikes: ["Ж", "Х"] },
  { letter: "Л", word: { emoji: "🥕", mn: "лууван", en: "carrot" }, lookalikes: ["Д", "П"] },
  { letter: "М", word: { emoji: "🐱", mn: "муур", en: "cat" }, lookalikes: ["Н", "Л"] },
  { letter: "Н", word: { emoji: "🐶", mn: "нохой", en: "dog" }, lookalikes: ["И", "П"] },
  { letter: "О", word: { emoji: "🛏️", mn: "ор", en: "bed" }, lookalikes: ["Ө", "С"] },
  { letter: "Ө", word: { emoji: "🥚", mn: "өндөг", en: "egg" }, lookalikes: ["О", "Э"] },
  { letter: "П", word: { emoji: "🍕", mn: "пицца", en: "pizza" }, lookalikes: ["Н", "Л"] },
  { letter: "Р", word: { emoji: "📻", mn: "радио", en: "radio" }, lookalikes: ["В", "Б"] },
  { letter: "С", word: { emoji: "🪑", mn: "сандал", en: "chair" }, lookalikes: ["О", "Э"] },
  { letter: "Т", word: { emoji: "🐫", mn: "тэмээ", en: "camel" }, lookalikes: ["Г", "П"] },
  { letter: "У", word: { emoji: "💧", mn: "ус", en: "water" }, lookalikes: ["Ү", "Ч"] },
  { letter: "Ү", word: { emoji: "🐄", mn: "үхэр", en: "cow" }, lookalikes: ["У", "Ч"] },
  { letter: "Х", word: { emoji: "🐑", mn: "хонь", en: "sheep" }, lookalikes: ["Ж", "К"] },
  { letter: "Ц", word: { emoji: "🌸", mn: "цэцэг", en: "flower" }, lookalikes: ["Ч", "Ш"] },
  { letter: "Ч", word: { emoji: "🐺", mn: "чоно", en: "wolf" }, lookalikes: ["У", "Ц"] },
  { letter: "Ш", word: { emoji: "🐦", mn: "шувуу", en: "bird" }, lookalikes: ["Ц", "Ч"] },
  { letter: "Э", word: { emoji: "👵", mn: "эмээ", en: "grandmother" }, lookalikes: ["З", "С"] },
  { letter: "Я", word: { emoji: "🐐", mn: "ямаа", en: "goat" }, lookalikes: ["Р", "Б"] },
];

/** Жинхэнэ цагаан толгойн дараалал — «дараа нь аль үсэг вэ?» асуултад. */
const MN_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОӨПРСТУҮФХЦЧШЩЪЫЬЭЮЯ";

const LETTER_MASTERY_EXERCISES = 100;
const LETTER_SEQUENCE_EXERCISES = 9;

/**
 * ҮСЭГ СУРАХ — 100 дасгал.
 *
 * Үсэг бүрт (цагаан толгойн дарааллаар) гурван алхам — ХЭЛБЭР → АВИА → ЭСРЭГ ЧИГЛЭЛ:
 *   1. «М үсэг аль нь вэ?»          — төстэй хэлбэртэй үсгүүдээс ялгана
 *   2. «М-ээр эхэлдэг зураг аль нь?» — үсэг → авиа → зураг
 *   3. «🐱 аль үсгээр эхэлдэг вэ?»    — зураг → үсэг (урвуу санах)
 * Дээр нь 2 үсэг тутамд том/жижиг үсэг (13), 3 үсэг тутамд цагаан толгойн
 * дараалал (9): 26×3 + 13 + 9 = 100.
 *
 * ⚠ Урт хичээл тул 3-3 үсэгтэй богино түвшнүүдийн ДАРАА байрлана — шинэ
 * үсэг заахгүй, аль хэдийн үзсэнийг бататгана.
 */
function letterMasteryLesson(): KidsLesson {
  const rng = rngFor("mn-letters-mastery-100");
  const bankLetters = LETTER_BANK.map((entry) => entry.letter);
  const letterOption = (letter: string): Bi => [letter, letter];
  const pickOthers = (pool: string[], exclude: string[], count: number) =>
    shuffle(
      pool.filter((item) => !exclude.includes(item)),
      rng
    ).slice(0, count);

  // Дарааллын асуулт — 4 үсэг бүгд танил байх цонхнуудаас (Ё, Й, Щ, Ъ… орохгүй).
  const known = new Set([...bankLetters, "Е"]);
  const alphabet = [...MN_ALPHABET];
  const windows: string[][] = [];
  for (let start = 0; start + 4 <= alphabet.length; start += 1) {
    const window = alphabet.slice(start, start + 4);
    if (window.every((letter) => known.has(letter))) windows.push(window);
  }
  const sequenceWindows = Array.from(
    { length: LETTER_SEQUENCE_EXERCISES },
    (_, index) => windows[Math.floor((index * windows.length) / LETTER_SEQUENCE_EXERCISES)]
  );

  const sequenceExercise = ([a, b, c, next]: string[]): KidsExercise => {
    const picked = options(
      letterOption(next),
      pickOthers([...known], [a, b, c, next], 2).map(letterOption),
      rng
    );
    return choice(
      [`${a} ${b} ${c} … дараа нь аль үсэг вэ?`, `${a} ${b} ${c} … which letter comes next?`],
      picked.options,
      picked.correct,
      [
        `${a} ${b} ${c} ${next} — цагаан толгойн дараалал.`,
        `${a} ${b} ${c} ${next} — that is the alphabet order.`,
      ]
    );
  };

  const exercises: KidsExercise[] = [];
  let sequenceIndex = 0;

  LETTER_BANK.forEach(({ letter, word, lookalikes }, index) => {
    // 1. Хэлбэр таних
    const shape = options(letterOption(letter), lookalikes.map(letterOption), rng);
    exercises.push(
      choice(
        [`«${letter}» үсэг аль нь вэ?`, `Which one is the letter "${letter}"?`],
        shape.options,
        shape.correct,
        [
          `Энэ бол «${letter}». ${lookalikes.join(", ")} нь өөр үсэг — хэлбэрийг нь сайн хар.`,
          `This is "${letter}". ${lookalikes.join(", ")} are different letters — look closely.`,
        ]
      )
    );

    // 2. Үсэг → зураг
    const otherWords = shuffle(
      LETTER_BANK.filter((entry) => entry.letter !== letter),
      rng
    )
      .slice(0, 2)
      .map((entry) => emojiLabel(entry.word));
    const picture = options(emojiLabel(word), otherWords, rng);
    exercises.push(
      choice(
        [`«${letter}» үсгээр эхэлдэг нь аль нь вэ?`, `Which one starts with "${letter}"?`],
        picture.options,
        picture.correct,
        [
          `${word.emoji} ${word.mn} — «${letter}» авиагаар эхэлнэ.`,
          `${word.emoji} ${word.mn} (${word.en}) starts with "${letter}".`,
        ]
      )
    );

    // 3. Зураг → үсэг. Нэрийг асуултад БИЧИХГҮЙ — бичвэл эхний үсэг нь хариугаа хэлчихнэ.
    const firstLetter = options(
      letterOption(letter),
      pickOthers(bankLetters, [letter], 2).map(letterOption),
      rng
    );
    exercises.push(
      choice(
        [`${word.emoji} — аль үсгээр эхэлдэг вэ?`, `${word.emoji} — which letter does it start with?`],
        firstLetter.options,
        firstLetter.correct,
        [
          `${word.emoji} ${word.mn} — «${letter}» үсгээр эхэлнэ.`,
          `${word.emoji} ${word.mn} (${word.en}) starts with "${letter}".`,
        ]
      )
    );

    // 4. Том → жижиг үсэг (2 үсэг тутамд). Буруу хариулт нь төстэй үсгийн жижиг хэлбэр.
    if (index % 2 === 0) {
      const lower = letter.toLowerCase();
      const small = options(
        letterOption(lower),
        lookalikes.map((other) => letterOption(other.toLowerCase())),
        rng
      );
      exercises.push(
        choice(
          [`«${letter}» том үсгийн жижиг нь аль вэ?`, `Which is the small letter for "${letter}"?`],
          small.options,
          small.correct,
          [
            `${letter} → ${lower}: нэг үсгийн том, жижиг хэлбэр.`,
            `${letter} → ${lower}: the big and small forms of one letter.`,
          ]
        )
      );
    }

    // 5. Цагаан толгойн дараалал (3 үсэг тутамд)
    if ((index + 1) % 3 === 0 && sequenceIndex < LETTER_SEQUENCE_EXERCISES) {
      exercises.push(sequenceExercise(sequenceWindows[sequenceIndex++]));
    }
  });

  while (sequenceIndex < LETTER_SEQUENCE_EXERCISES) {
    exercises.push(sequenceExercise(sequenceWindows[sequenceIndex++]));
  }

  // ⚠ Тоо зөрвөл seed ЗОГСОНО — «100 дасгал» гэсэн нэр худал болохоос сэргийлнэ.
  if (exercises.length !== LETTER_MASTERY_EXERCISES) {
    throw new Error(
      `Үсэг сурах хичээл ${LETTER_MASTERY_EXERCISES} биш ${exercises.length} дасгалтай боллоо.`
    );
  }

  return {
    title: ["Үсэг сурах — 100 дасгал", "Learn the letters — 100 exercises"],
    xp: 50,
    exercises,
  };
}

/** Үе — «ма» гэх мэт нээлттэй үе. */
function syllableLesson(): KidsLesson {
  const rng = rngFor("mn-syllables");
  const pool = MN_SYLLABLES.map((entry) => entry.word);

  const exercises = MN_SYLLABLES.map((entry) => {
    const picked = options(
      emojiLabel(entry.word),
      distractors(pool, entry.word, 2, rng).map(emojiLabel),
      rng
    );
    return choice(
      [`«${entry.syllable}» гэж эхэлдэг үг аль нь вэ?`, `Which word starts with "${entry.syllable}"?`],
      picked.options,
      picked.correct,
      [
        `${entry.word.emoji} ${entry.word.mn} — «${entry.syllable}» үеээр эхэлнэ.`,
        `${entry.word.emoji} ${entry.word.mn} (${entry.word.en}) starts with "${entry.syllable}".`,
      ]
    );
  });

  return { title: ["Үе унших", "Reading syllables"], xp: 15, exercises };
}

/** Энгийн үг унших — эможи → үг. */
function wordReadingLesson(index: number, pool: Word[], titleMn: string, titleEn: string): KidsLesson {
  const rng = rngFor(`mn-words-${index}-${titleEn}`);

  const exercises = pool.slice(0, 6).map((word) => {
    const picked = options(
      [word.mn, word.mn],
      distractors(pool, word, 2, rng).map((entry) => [entry.mn, entry.mn] as Bi),
      rng
    );
    return choice(
      [`${word.emoji} — энэ юу вэ?`, `${word.emoji} — what is this?`],
      picked.options,
      picked.correct,
      [`${word.emoji} = ${word.mn}`, `${word.emoji} = ${word.mn} (${word.en})`]
    );
  });

  return { title: [titleMn, titleEn], xp: 10, exercises };
}

function mongolianKids(): KidsCourse {
  return {
    slug: "mongolian-kids",
    title: ["Монгол хэл Kids", "Mongolian Kids"],
    description: [
      "Авиа, үсэг, үе, энгийн үг — 4–6 насны хүүхдэд зурган дасгалаар.",
      "Sounds, letters, syllables and first words for ages 4–6, taught through pictures.",
    ],
    icon: "book",
    color: "rose",
    school: "life",
    units: [
      {
        title: ["Үсэг таних", "Meeting the letters"],
        color: "rose",
        /*
         * ⚠ Үсгүүдийг 3-3-аар нь задалсан: 4–6 насны хүүхэд нэг суултад
         * 5+ шинэ үсэг цээжлэхгүй. Богино түвшин олон байх нь урт түвшин
         * цөөн байхаас ХАМААГҮЙ үр дүнтэй (мөн зам дээр ахиц ойр ойрхон
         * харагдана).
         */
        lessons: [
          ...Array.from({ length: 9 }, (_, index) =>
            letterLesson(index + 1, MN_LETTERS.slice(index * 3, index * 3 + 3))
          ),
          // Бүх үсгийг бататгах урт давтлага — богино түвшнүүдийн ДАРАА.
          letterMasteryLesson(),
        ],
      },
      {
        title: ["Үе, үг", "Syllables and words"],
        color: "violet",
        lessons: [
          syllableLesson(),
          wordReadingLesson(1, ANIMALS.slice(0, 6), "Амьтны нэр", "Animal words"),
          wordReadingLesson(2, ANIMALS.slice(6, 12), "Амьтны нэр — 2", "Animal words — 2"),
          wordReadingLesson(3, FOOD.slice(0, 6), "Хоолны нэр", "Food words"),
          wordReadingLesson(4, FOOD.slice(4, 10), "Хоолны нэр — 2", "Food words — 2"),
          wordReadingLesson(5, FAMILY, "Гэр бүл", "Family words"),
          wordReadingLesson(6, BODY, "Биеийн эрхтэн", "Body words"),
          wordReadingLesson(7, DAILY.slice(0, 6), "Өдөр тутмын үг", "Everyday words"),
          wordReadingLesson(8, DAILY.slice(2, 8), "Өдөр тутмын үг — 2", "Everyday words — 2"),
        ],
      },
      {
        title: ["Санах ой", "Memory"],
        color: "amber",
        lessons: [
          {
            title: ["Үсгийн санах ой", "Letter memory"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил үсгүүдийг ол.", "Find the matching letters."],
                ["Үсгийн хэлбэрийг санах нь уншихын эхлэл.", "Remembering letter shapes is where reading begins."],
                ["А", "Б", "М", "Н", "С"]
              ),
            ],
          },
          {
            title: ["Үгийн санах ой", "Word memory"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил зургуудыг ол.", "Find the matching pictures."],
                ["Зураг санах нь үгийн сан тэлэхэд тусална.", "Remembering pictures helps build vocabulary."],
                ANIMALS.slice(0, 5).map((word) => word.emoji)
              ),
            ],
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 3. ENGLISH KIDS
// ---------------------------------------------------------------------------

/** Англи үг таних — эможи → англи үг. */
function englishLesson(index: number, pool: Word[], titleMn: string, titleEn: string): KidsLesson {
  const rng = rngFor(`en-${index}-${titleEn}`);

  const exercises = pool.slice(0, 6).map((word) => {
    const picked = options(
      [word.en, word.en],
      distractors(pool, word, 2, rng).map((entry) => [entry.en, entry.en] as Bi),
      rng
    );
    return choice(
      [`${word.emoji} — англиар юу гэх вэ?`, `${word.emoji} — what is this in English?`],
      picked.options,
      picked.correct,
      [`${word.emoji} ${word.mn} = ${word.en}`, `${word.emoji} ${word.en}`]
    );
  });

  return { title: [titleMn, titleEn], xp: 10, exercises };
}

/** Англи тоо — 1..10. */
function englishNumbersLesson(from: number, to: number): KidsLesson {
  const rng = rngFor(`en-numbers-${from}-${to}`);
  const pool = NUMBER_WORDS.slice(from - 1, to);

  const exercises = pool.map((entry) => {
    const picked = options(
      [entry.en, entry.en],
      shuffle(
        NUMBER_WORDS.filter((other) => other.value !== entry.value),
        rng
      )
        .slice(0, 2)
        .map((other) => [other.en, other.en] as Bi),
      rng
    );
    return choice(
      [`${entry.value} — англиар юу гэх вэ?`, `${entry.value} — how do you say it in English?`],
      picked.options,
      picked.correct,
      [`${entry.value} = ${entry.en} (${entry.mn})`, `${entry.value} = ${entry.en}`]
    );
  });

  return { title: [`Тоо ${from}–${to}`, `Numbers ${from}–${to}`], xp: 10, exercises };
}

function englishKids(): KidsCourse {
  return {
    slug: "english-kids",
    title: ["English Kids", "English Kids"],
    description: [
      "Colors, numbers, animals, family, food, body, daily words — эхний англи үгсээ зургаар сурна.",
      "Colours, numbers, animals, family, food, body and daily words — first English through pictures.",
    ],
    icon: "globe",
    color: "emerald",
    school: "life",
    units: [
      {
        title: ["Colours & numbers", "Colours & numbers"],
        color: "emerald",
        lessons: [
          englishLesson(1, COLORS.slice(0, 4), "Өнгө", "Colours"),
          englishLesson(2, COLORS.slice(3, 7), "Өнгө — 2", "Colours — 2"),
          englishLesson(3, COLORS.slice(4, 8), "Өнгө — 3", "Colours — 3"),
          englishNumbersLesson(1, 3),
          englishNumbersLesson(4, 6),
          englishNumbersLesson(7, 10),
        ],
      },
      {
        title: ["Animals & family", "Animals & family"],
        color: "sky",
        lessons: [
          englishLesson(4, ANIMALS.slice(0, 4), "Амьтад", "Animals"),
          englishLesson(5, ANIMALS.slice(4, 8), "Амьтад — 2", "Animals — 2"),
          englishLesson(6, ANIMALS.slice(8, 12), "Амьтад — 3", "Animals — 3"),
          englishLesson(7, FAMILY.slice(0, 4), "Гэр бүл", "Family"),
          englishLesson(8, FAMILY.slice(3, 7), "Гэр бүл — 2", "Family — 2"),
        ],
      },
      {
        title: ["Food & body", "Food & body"],
        color: "amber",
        lessons: [
          englishLesson(9, FOOD.slice(0, 4), "Хоол", "Food"),
          englishLesson(10, FOOD.slice(3, 7), "Хоол — 2", "Food — 2"),
          englishLesson(11, FOOD.slice(6, 10), "Хоол — 3", "Food — 3"),
          englishLesson(12, BODY.slice(0, 4), "Бие", "Body"),
          englishLesson(13, BODY.slice(3, 7), "Бие — 2", "Body — 2"),
        ],
      },
      {
        title: ["Daily words", "Daily words"],
        color: "violet",
        lessons: [
          englishLesson(14, DAILY.slice(0, 4), "Өдөр тутам", "Everyday"),
          englishLesson(15, DAILY.slice(4, 8), "Өдөр тутам — 2", "Everyday — 2"),
          englishLesson(16, [...COLORS.slice(0, 3), ...ANIMALS.slice(0, 3)], "Холимог давталт", "Mixed review"),
          englishLesson(17, [...FOOD.slice(0, 3), ...DAILY.slice(0, 3)], "Холимог давталт — 2", "Mixed review — 2"),
          {
            title: ["Word memory", "Word memory"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил зургуудыг ол.", "Find the matching pictures."],
                ["Санах ойн тоглоом нь шинэ үгийг цээжлэхэд тусална.", "A memory game helps new words stick."],
                DAILY.slice(0, 5).map((word) => word.emoji)
              ),
            ],
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 4. LOGIC KIDS
// ---------------------------------------------------------------------------

/** Хэв маяг — «дараа нь юу вэ?» (ABAB, AABB, ABC). */
function patternLesson(index: number, pattern: string[]): KidsLesson {
  const rng = rngFor(`logic-pattern-${index}-${pattern.join("")}`);
  const exercises: KidsExercise[] = [];

  for (let step = 0; step < 5; step += 1) {
    const palette = shuffle(COLORS, rng).slice(0, 3);
    const sequence = pattern.map((slot) => palette["ABC".indexOf(slot)].emoji);
    const shown = [...sequence, ...sequence].slice(0, pattern.length + 2);
    const answer = sequence[(pattern.length + 2) % pattern.length];
    const wrongPool = palette.filter((color) => color.emoji !== answer);

    const picked = options(
      [answer, answer],
      wrongPool.map((color) => [color.emoji, color.emoji] as Bi),
      rng
    );
    exercises.push(
      choice(
        [`${shown.join(" ")} ?`, `${shown.join(" ")} ?`],
        picked.options,
        picked.correct,
        [
          "Хэв маяг давтагдана — дараагийнх нь эхнээсээ үргэлжилнэ.",
          "The pattern repeats — the next one continues the cycle.",
        ]
      )
    );
  }

  return {
    title: [`Хэв маяг ${pattern.join("")}`, `Pattern ${pattern.join("")}`],
    xp: 10,
    exercises,
  };
}

/** Ижилийг олох / илүүцийг олох. */
function oddOneOutLesson(index: number, group: Word[], intruderPool: Word[]): KidsLesson {
  const rng = rngFor(`logic-odd-${index}`);
  const exercises: KidsExercise[] = [];

  for (let step = 0; step < 5; step += 1) {
    const members = shuffle(group, rng).slice(0, 2);
    const intruder = shuffle(intruderPool, rng)[0];
    const all = shuffle([...members, intruder], rng);

    exercises.push(
      choice(
        ["Аль нь ИЛҮҮЦ вэ?", "Which one does NOT belong?"],
        all.map(emojiLabel),
        all.indexOf(intruder),
        [
          `${intruder.emoji} нь бусдаас өөр бүлэгт багтана.`,
          `${intruder.emoji} belongs to a different group.`,
        ]
      )
    );
  }

  return { title: ["Илүүцийг ол", "Odd one out"], xp: 10, exercises };
}

function logicKids(): KidsCourse {
  return {
    slug: "logic-kids",
    title: ["Логик Kids", "Logic Kids"],
    description: [
      "Хэв маяг, ижилийг олох, ангилах, лабиринт, санах ой — сэтгэн бодох эхний алхмууд.",
      "Patterns, matching, sorting, mazes and memory — the first steps in thinking.",
    ],
    icon: "puzzle",
    color: "violet",
    school: "mind",
    units: [
      {
        title: ["Хэв маяг", "Patterns"],
        color: "violet",
        lessons: [
          patternLesson(1, ["A", "B"]),
          patternLesson(2, ["A", "A", "B"]),
          patternLesson(3, ["A", "B", "B"]),
          patternLesson(4, ["A", "B", "C"]),
          patternLesson(5, ["A", "A", "B", "C"]),
        ],
      },
      {
        title: ["Ангилах", "Sorting"],
        color: "emerald",
        lessons: [
          oddOneOutLesson(1, ANIMALS, FOOD),
          oddOneOutLesson(2, FOOD, ANIMALS),
          oddOneOutLesson(3, SHAPES, ANIMALS),
          oddOneOutLesson(4, COLORS, FOOD),
          oddOneOutLesson(5, FAMILY, ANIMALS),
          oddOneOutLesson(6, DAILY, ANIMALS),
        ],
      },
      {
        title: ["Санах ой", "Memory"],
        color: "amber",
        lessons: [
          {
            title: ["Санах ой — 3 хос", "Memory — 3 pairs"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил хосуудыг ол.", "Find the matching pairs."],
                ["Хөзрүүдийг ХААНА байсныг санахыг хичээ.", "Try to remember WHERE each card was."],
                ANIMALS.slice(0, 3).map((word) => word.emoji)
              ),
            ],
          },
          {
            title: ["Санах ой — 4 хос", "Memory — 4 pairs"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил хосуудыг ол.", "Find the matching pairs."],
                ["Хос олох тусам самбар цэвэрлэгдэнэ.", "Each pair you find clears the board a little."],
                SHAPES.slice(0, 4).map((word) => word.emoji)
              ),
            ],
          },
          {
            title: ["Санах ой — 5 хос", "Memory — 5 pairs"],
            xp: 15,
            exercises: [
              memory(
                ["Ижил хосуудыг ол.", "Find the matching pairs."],
                ["Хос олох тусам самбар цэвэрлэгдэнэ.", "Each pair you find clears the board a little."],
                FOOD.slice(0, 5).map((word) => word.emoji)
              ),
            ],
          },
          {
            title: ["Санах ой — 6 хос", "Memory — 6 pairs"],
            xp: 15,
            exercises: [
              memory(
                ["Ижил хосуудыг ол.", "Find the matching pairs."],
                ["Хамгийн том самбар — тэвчээртэй бай.", "The biggest board — stay patient."],
                ANIMALS.slice(0, 6).map((word) => word.emoji)
              ),
            ],
          },
        ],
      },
      {
        title: ["Оньсого", "Puzzles"],
        color: "sky",
        lessons: [
          {
            title: ["Гулсдаг оньсого", "Sliding puzzle"],
            xp: 15,
            exercises: [
              slide(
                ["Хэсгүүдийг эрэмбэл.", "Put the tiles in order."],
                ["Нэг хэсэг хөдлөхөд нөгөө нь суларна — дараалуулж бод.", "Moving one tile frees another — think in order."],
                3
              ),
            ],
          },
          {
            title: ["Том гулсдаг оньсого", "Bigger sliding puzzle"],
            xp: 20,
            exercises: [
              slide(
                ["Дөрвөн эгнээтэй оньсогыг эвл.", "Solve the four-row puzzle."],
                ["Илүү олон хэсэг = илүү олон алхам.", "More tiles means more steps."],
                4
              ),
            ],
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 5. CHESS KIDS
// ---------------------------------------------------------------------------

/**
 * Хүүхдийн шатрын НЭГ НҮҮДЛИЙН даалгавар үүсгэнэ.
 *
 * ⚠ Байрлалыг `chess.js`-ээр ШАЛГАНА: цагаан талд ЯГ НЭГ идэлт байх ба
 * тэр нь заасан дүрсээр хийгдэнэ. Хоёр идэлт байвал хүүхэд «зөв» нүүдэл
 * хийгээд буруу гэсэн хариу авна.
 */
function chessCaptureTasks(
  piece: "N" | "B" | "R" | "Q",
  count: number,
  seedKey: string
): { fen: string; from: string; to: string }[] {
  const rng = rngFor(seedKey);
  const files = "abcdefgh";
  const tasks: { fen: string; from: string; to: string }[] = [];
  const seen = new Set<string>();

  const square = () =>
    `${files[Math.floor(rng() * 8)]}${1 + Math.floor(rng() * 8)}`;

  for (let attempt = 0; attempt < 200000 && tasks.length < count; attempt += 1) {
    const chess = new Chess();
    chess.clear();

    const used = new Set<string>();
    const place = (symbol: string, color: "w" | "b"): string | null => {
      for (let tries = 0; tries < 40; tries += 1) {
        const target = square();
        if (used.has(target)) continue;
        used.add(target);
        try {
          chess.put({ type: symbol as "n", color }, target as "a1");
        } catch {
          return null;
        }
        return target;
      }
      return null;
    };

    const whiteKing = place("k", "w");
    const blackKing = whiteKing ? place("k", "b") : null;
    if (!whiteKing || !blackKing) continue;
    const from = place(piece.toLowerCase(), "w");
    if (!from) continue;
    if (!place("p", "b")) continue;

    // Ээлж, эрх — цагаан нүүнэ, сэлгээ байхгүй.
    const parts = chess.fen().split(" ");
    const fen = [parts[0], "w", "-", "-", "0", "1"].join(" ");

    let game: Chess;
    try {
      game = new Chess(fen);
    } catch {
      continue;
    }
    if (game.isGameOver() || game.inCheck()) continue;

    /*
     * ⚠ НҮҮХГҮЙ ТАЛЫН (хар) НООН ЦОХИЛТОД БАЙВАЛ ХАЯНА. Тийм байрлал хууль
     * бус боловч `chess.js` шалгадаггүй бөгөөд «ноёныг идэх» нүүдлийг
     * зөвшөөрдөг — хүүхдэд «ноёныг иддэг» гэсэн БУРУУ дүрэм заана (санд
     * бодитоор илэрсэн). Ноён ХЭЗЭЭ Ч идэгдэхгүй.
     */
    if (game.isAttacked(blackKing as "a1", "w")) continue;

    const captures = game
      .moves({ verbose: true })
      .filter((move) => move.captured && move.captured !== "k");
    if (captures.length !== 1) continue;
    if (captures[0].from !== from) continue;
    if (seen.has(fen)) continue;

    seen.add(fen);
    tasks.push({ fen, from: captures[0].from, to: captures[0].to });
  }

  return tasks;
}

/**
 * Монгол шатрын нэр: ноён, бэрс, тэрэг, тэмээ, морь, хүү.
 *
 * ⚠ ХУВИЛАЛЫГ ГАРААР БИЧНЭ (`withMn` = «-аар/-ээр», `withOwnMn` = «-аараа»).
 * Урьд нь `${mn}оороо` гэж залгаж «тэргээрээ», «мориороо» гэсэн алдаатай
 * үг үүсгэж байсан — монгол хэлний эгшиг зохицол, үндэс хувирал нь нэг
 * дагавараар залгагдахгүй (тэрэг → тэргээр, морь → мориор).
 */
const PIECE_INFO: Record<
  "N" | "B" | "R" | "Q",
  { mn: string; withMn: string; withOwnMn: string; en: string; glyph: string }
> = {
  N: { mn: "морь", withMn: "мориор", withOwnMn: "мориороо", en: "knight", glyph: "♞" },
  B: { mn: "тэмээ", withMn: "тэмээгээр", withOwnMn: "тэмээгээрээ", en: "bishop", glyph: "♝" },
  R: { mn: "тэрэг", withMn: "тэргээр", withOwnMn: "тэргээрээ", en: "rook", glyph: "♜" },
  Q: { mn: "бэрс", withMn: "бэрсээр", withOwnMn: "бэрсээрээ", en: "queen", glyph: "♛" },
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function chessPieceLesson(piece: "N" | "B" | "R" | "Q"): KidsLesson {
  const info = PIECE_INFO[piece];
  const tasks = chessCaptureTasks(piece, 5, `chess-kids-${piece}`);

  const howMoves: Record<string, Bi> = {
    N: ["Морь «Г» үсэг шиг үсэрнэ: хоёр нүд шулуун, нэг нүд хажуу тийш.", "The knight jumps in an L: two squares straight, then one to the side."],
    B: ["Тэмээ ташуу шугамаар хэдэн ч нүд явна.", "The bishop slides along diagonals, any distance."],
    R: ["Тэрэг шулуун — дээш, доош, хажуу тийш явна.", "The rook moves in straight lines: up, down and sideways."],
    Q: ["Бэрс шулуун ба ташуу — бүх чигт явна.", "The queen moves in every direction, straight and diagonal."],
  };

  return {
    title: [`${info.glyph} ${info.mn}`, `${info.glyph} The ${info.en}`],
    xp: 15,
    exercises: [
      choice(
        [`${info.glyph} Энэ дүрсийг юу гэдэг вэ?`, `${info.glyph} What is this piece called?`],
        [
          [info.mn, info.en],
          [PIECE_INFO[piece === "N" ? "R" : "N"].mn, PIECE_INFO[piece === "N" ? "R" : "N"].en],
          [PIECE_INFO[piece === "Q" ? "B" : "Q"].mn, PIECE_INFO[piece === "Q" ? "B" : "Q"].en],
        ],
        0,
        howMoves[piece]
      ),
      ...tasks.map((task) => ({
        kind: "board-move" as const,
        prompt: [
          `Цагаанаар тогло. ${capitalize(info.withOwnMn)} дайсны дүрсийг ид.`,
          `White to play. Capture the enemy piece with your ${info.en}.`,
        ] as Bi,
        explain: howMoves[piece],
        fen: task.fen,
        from: task.from,
        to: task.to,
      })),
    ],
  };
}

/** Хүү ба ноён — идэлтгүй, зөвхөн ойлголтын хичээл. */
function chessSimplePieceLesson(kind: "pawn" | "king"): KidsLesson {
  if (kind === "pawn") {
    return {
      title: ["♟ Хүү", "♟ The pawn"],
      xp: 10,
      exercises: [
        choice(
          ["♟ Хүү хэрхэн нүүдэг вэ?", "♟ How does a pawn move?"],
          [
            ["Урагш нэг нүд", "One square forward"],
            ["Хойш нэг нүд", "One square backwards"],
            ["Ташуу хэдэн ч нүд", "Any distance diagonally"],
          ],
          0,
          [
            "Хүү урагш нүүнэ, харин ИДЭХДЭЭ ташуу явна — энэ хоёр нь өөр.",
            "A pawn moves forward but CAPTURES diagonally — those are two different things.",
          ]
        ),
        choice(
          ["♟ Хүү хэрхэн иддэг вэ?", "♟ How does a pawn capture?"],
          [
            ["Ташуу урагш", "Diagonally forward"],
            ["Шулуун урагш", "Straight forward"],
            ["Хажуу тийш", "Sideways"],
          ],
          0,
          [
            "Хүү урд талын дүрсийг идэж чадахгүй — ташуу байгааг л иднэ.",
            "A pawn cannot take the piece right in front of it — only the ones diagonally ahead.",
          ]
        ),
        choice(
          ["♟ Хүү хамгийн хол эгнээнд хүрвэл юу болох вэ?", "♟ What happens when a pawn reaches the far row?"],
          [
            ["Бэрс болж хувирна", "It becomes a queen"],
            ["Алга болно", "It disappears"],
            ["Юу ч болохгүй", "Nothing happens"],
          ],
          0,
          [
            "Хамгийн жижиг дүрс хамгийн хүчтэй нь болж хувирдаг — энэ бол шатрын гайхамшиг.",
            "The smallest piece turns into the strongest one — that is the magic of chess.",
          ]
        ),
      ],
    };
  }

  return {
    title: ["♚ Ноён", "♚ The king"],
    xp: 10,
    exercises: [
      choice(
        ["♚ Ноён хэдэн нүд нүүдэг вэ?", "♚ How far does the king move?"],
        [
          ["Аль ч чигт НЭГ нүд", "One square in any direction"],
          ["Хэдэн ч нүд", "Any distance"],
          ["Зөвхөн урагш", "Only forwards"],
        ],
        0,
        [
          "Ноён удаан ч гэсэн хамгийн чухал дүрс — түүнийг алдвал тоглолт дуусна.",
          "The king is slow but the most important piece — lose it and the game is over.",
        ]
      ),
      choice(
        ["Шатрын зорилго юу вэ?", "What is the goal of chess?"],
        [
          ["Өрсөлдөгчийн ноёнд мад хийх", "To checkmate the opponent's king"],
          ["Бүх хүүг идэх", "To take every pawn"],
          ["Хөлгийг дүүргэх", "To fill the board"],
        ],
        0,
        [
          "Мад гэдэг нь ноён зугтах газаргүй боогдсон байдал.",
          "Checkmate means the king is attacked with nowhere to escape.",
        ]
      ),
      choice(
        ["Ноёноо хамгаалахын тулд юу хийх нь зөв вэ?", "What is a good way to keep your king safe?"],
        [
          ["Дүрсээрээ хүрээлүүлж, аюулаас хол байлгах", "Keep pieces around it and stay away from danger"],
          ["Хөлгийн голд гаргах", "March it into the middle"],
          ["Ганцааранг нь явуулах", "Send it out alone"],
        ],
        0,
        [
          "Эхлэл ба дунд хэсэгт ноён НУУГДАЖ байх ёстой — тэр бол хамгаалах зүйл, довтлох зэвсэг биш.",
          "In the opening and middlegame the king hides — it is something to protect, not a weapon.",
        ]
      ),
    ],
  };
}

/** Дүрсийн үнэ + хамгаалалт — ойлголтын хичээлүүд. */
function chessValueLesson(): KidsLesson {
  return {
    title: ["Дүрсийн үнэ", "Piece values"],
    xp: 10,
    exercises: [
      choice(
        ["Аль дүрс хамгийн хүчтэй вэ (ноёноос гадна)?", "Which piece is the strongest (apart from the king)?"],
        [
          ["♛ бэрс", "♛ the queen"],
          ["♟ хүү", "♟ the pawn"],
          ["♞ морь", "♞ the knight"],
        ],
        0,
        [
          "Бэрс шулуун ба ташуу бүх чигт явдаг тул хамгийн олон нүдийг хянана.",
          "The queen moves in every direction, so it controls the most squares.",
        ]
      ),
      choice(
        ["♜ тэрэг ба ♟ хүү — аль нь илүү үнэтэй вэ?", "♜ rook or ♟ pawn — which is worth more?"],
        [
          ["♜ тэрэг", "♜ the rook"],
          ["♟ хүү", "♟ the pawn"],
          ["Адилхан", "They are equal"],
        ],
        0,
        [
          "Тэрэг бүтэн эгнээ, багана хянадаг тул хүүгээс хамаагүй үнэтэй.",
          "A rook controls whole ranks and files, so it is worth much more than a pawn.",
        ]
      ),
      choice(
        ["Дүрсээ «хамгаалсан» гэж юу гэсэн үг вэ?", "What does it mean that a piece is defended?"],
        [
          ["Идэгдвэл өөр дүрс эргүүлж идэж чадна", "If it is taken, another piece can take back"],
          ["Түүнийг идэж болохгүй", "It cannot be captured at all"],
          ["Тэр дүрс хөдлөхгүй", "It never moves"],
        ],
        0,
        [
          "Хамгаалалт нь дүрсээ идэгдэхээс хаадаггүй — харин ИДСЭН тал төлбөрөө төлнө.",
          "Defence does not stop a capture — it makes the capturer pay for it.",
        ]
      ),
    ],
  };
}

/**
 * Идэх ДАДЛАГА — зөвхөн хөлгийн даалгаврууд (ойлголтын асуултгүй).
 *
 * ⚠ Үр нь `chessPieceLesson`-ийнхоос ӨӨР: эс бөгөөс сурагч яг ижил
 * байрлалыг хоёр удаа хийж, дадлага давталт болж хувирна.
 */
function chessCaptureDrill(piece: "N" | "B" | "R" | "Q", index: number): KidsLesson {
  const info = PIECE_INFO[piece];
  const tasks = chessCaptureTasks(piece, 5, `chess-kids-drill-${piece}-${index}`);

  return {
    title: [`${info.glyph} ${info.withMn} ид`, `${info.glyph} Capture with the ${info.en}`],
    xp: 15,
    exercises: tasks.map((task) => ({
      kind: "board-move" as const,
      prompt: [
        `Цагаанаар тогло. ${capitalize(info.withOwnMn)} ид.`,
        `White to play. Capture with your ${info.en}.`,
      ] as Bi,
      explain: [
        "Идэх дүрс нь дайсны дүрсний БАЙРАНД очно.",
        "The capturing piece lands on the square of the piece it takes.",
      ] as Bi,
      fen: task.fen,
      from: task.from,
      to: task.to,
    })),
  };
}

/**
 * Хүүхдийн шатрын бүлгүүд — ТУСДАА КУРС БИШ, "chess" курсэд орно.
 *
 * ⚠ Урьд нь "chess-kids" гэсэн тусдаа курс байсныг "chess"-тэй нэгтгэсэн
 * (`drizzle/0037_merge_chess_kids.sql`) — шатар НЭГ л курс. Seed нь курсийг
 * slug-аар, бүлгийг нэрээр таньдаг тул энэ script-ийг дахин ажиллуулахад
 * "chess" курсийн байгаа бүлгүүд давхардахгүй. Гарчиг/тайлбар нь зөвхөн
 * "chess" курс ОГТ байхгүй шинэ сан дээр хэрэглэгдэнэ.
 */
function chessKids(): KidsCourse {
  return {
    slug: "chess",
    title: ["Шатар", "Chess"],
    description: [
      "Хөлөг, дүрсүүд, нүүдлээс эхлээд мад, тактик хүртэл — шатрыг анхнаас нь сур.",
      "From the board, pieces and moves to checkmates and tactics — learn chess from scratch.",
    ],
    icon: "crown",
    color: "indigo",
    school: "mind",
    units: [
      {
        title: ["Хөлөг ба дүрсүүд", "Board and pieces"],
        color: "indigo",
        lessons: [
          {
            title: ["Хөлөгтэй танилцах", "Meet the board"],
            xp: 10,
            exercises: [
              choice(
                ["Шатрын хөлөг хэдэн нүдтэй вэ?", "How many squares does a chessboard have?"],
                [
                  ["64", "64"],
                  ["100", "100"],
                  ["32", "32"],
                ],
                0,
                ["8 эгнээ × 8 багана = 64 нүд.", "8 rows × 8 columns = 64 squares."]
              ),
              choice(
                ["Хөлөг дээр хэдэн өнгийн нүд байдаг вэ?", "How many colours of square are there?"],
                [
                  ["2 — цайвар ба бараан", "2 — light and dark"],
                  ["4", "4"],
                  ["1", "1"],
                ],
                0,
                ["Цайвар, бараан нүд ээлжилнэ.", "Light and dark squares alternate."]
              ),
              choice(
                ["Хэн эхэлж нүүдэг вэ?", "Who moves first?"],
                [
                  ["Цагаан", "White"],
                  ["Хар", "Black"],
                  ["Хэн ч болно", "Anyone"],
                ],
                0,
                ["Шатарт ямагт цагаан эхэлнэ.", "In chess White always starts."]
              ),
            ],
          },
          {
            title: ["Дүрсүүдийг таних", "Naming the pieces"],
            xp: 10,
            exercises: (["N", "B", "R", "Q"] as const).map((piece) =>
              choice(
                [
                  `${PIECE_INFO[piece].glyph} Энэ ямар дүрс вэ?`,
                  `${PIECE_INFO[piece].glyph} Which piece is this?`,
                ],
                [
                  [PIECE_INFO[piece].mn, PIECE_INFO[piece].en],
                  [PIECE_INFO[piece === "N" ? "Q" : "N"].mn, PIECE_INFO[piece === "N" ? "Q" : "N"].en],
                  [PIECE_INFO[piece === "R" ? "B" : "R"].mn, PIECE_INFO[piece === "R" ? "B" : "R"].en],
                ],
                0,
                [
                  `${PIECE_INFO[piece].glyph} — ${PIECE_INFO[piece].mn}.`,
                  `${PIECE_INFO[piece].glyph} — the ${PIECE_INFO[piece].en}.`,
                ]
              )
            ),
          },
        ],
      },
      {
        title: ["Дүрс бүрийн нүүдэл", "How each piece moves"],
        color: "sky",
        lessons: [
          chessSimplePieceLesson("pawn"),
          chessPieceLesson("R"),
          chessPieceLesson("B"),
          chessPieceLesson("N"),
          chessPieceLesson("Q"),
          chessSimplePieceLesson("king"),
        ],
      },
      {
        title: ["Идэж сурах", "Learning to capture"],
        color: "emerald",
        lessons: [
          chessCaptureDrill("R", 1),
          chessCaptureDrill("B", 2),
          chessCaptureDrill("N", 3),
          chessCaptureDrill("Q", 4),
          chessValueLesson(),
          {
            title: ["Дүрсийн санах ой", "Piece memory"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил дүрсүүдийг ол.", "Find the matching pieces."],
                ["Дүрсийг хараад тэр дор нь таних нь шатрын эхний ур чадвар.", "Recognising a piece at a glance is the first chess skill."],
                ["♟", "♞", "♝", "♜", "♛"]
              ),
            ],
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// 6. CREATIVE KIDS
// ---------------------------------------------------------------------------

function creativeKids(): KidsCourse {
  const rng = rngFor("creative");

  const colorLesson = (index: number, pool: Word[]): KidsLesson => ({
    title: [`Өнгө ${index}`, `Colours ${index}`],
    xp: 10,
    exercises: pool.map((color) => {
      const picked = options(
        emojiLabel(color),
        distractors(COLORS, color, 2, rng).map(emojiLabel),
        rng
      );
      return choice(
        [`Аль нь ${color.mn} вэ?`, `Which one is ${color.en}?`],
        picked.options,
        picked.correct,
        [`${color.emoji} — ${color.mn}`, `${color.emoji} — ${color.en}`]
      );
    }),
  });

  return {
    slug: "creative-kids",
    title: ["Бүтээл Kids", "Creative Kids"],
    description: [
      "Өнгө, дүрс, зураас, зураг эвлүүлэх — гараа сургаж, төсөөллөө хөгжүүлнэ.",
      "Colours, shapes, lines and picture puzzles — training the hand and the imagination.",
    ],
    icon: "palette",
    color: "orange",
    school: "create",
    units: [
      {
        title: ["Өнгө", "Colours"],
        color: "orange",
        lessons: [
          colorLesson(1, COLORS.slice(0, 3)),
          colorLesson(2, COLORS.slice(2, 5)),
          colorLesson(3, COLORS.slice(4, 7)),
          colorLesson(4, COLORS.slice(5, 8)),
        ],
      },
      {
        title: ["Дүрс ба зураас", "Shapes and lines"],
        color: "rose",
        lessons: [
          {
            title: ["Дүрс таних", "Recognising shapes"],
            xp: 10,
            exercises: SHAPES.slice(0, 5).map((shape) => {
              const picked = options(
                emojiLabel(shape),
                distractors(SHAPES, shape, 2, rng).map(emojiLabel),
                rng
              );
              return choice(
                [`Аль нь ${shape.mn} вэ?`, `Which one is a ${shape.en}?`],
                picked.options,
                picked.correct,
                [`${shape.emoji} — ${shape.mn}`, `${shape.emoji} — ${shape.en}`]
              );
            }),
          },
          {
            title: ["Дүрсийн санах ой", "Shape memory"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил дүрсүүдийг ол.", "Find the matching shapes."],
                ["Дүрсийг санах нь зурахад тусална.", "Remembering shapes helps you draw them."],
                SHAPES.slice(0, 4).map((shape) => shape.emoji)
              ),
            ],
          },
        ],
      },
      {
        title: ["Зураас ба хээ", "Lines and patterns"],
        color: "violet",
        lessons: [
          {
            title: ["Зураас", "Lines"],
            xp: 10,
            exercises: [
              choice(
                ["Аль нь ШУЛУУН зураас вэ?", "Which one is a STRAIGHT line?"],
                [
                  ["➖", "➖"],
                  ["〰️", "〰️"],
                  ["🌀", "🌀"],
                ],
                0,
                ["➖ шулуун, 〰️ долгионтой, 🌀 мушгиа.", "➖ is straight, 〰️ is wavy, 🌀 is a spiral."]
              ),
              choice(
                ["Аль нь ДОЛГИОНТОЙ зураас вэ?", "Which one is a WAVY line?"],
                [
                  ["〰️", "〰️"],
                  ["➖", "➖"],
                  ["🔺", "🔺"],
                ],
                0,
                ["Долгионт зураас дээш доош эргэлддэг.", "A wavy line curves up and down."]
              ),
              choice(
                ["Аль нь ДУГУЙ хэлбэр вэ?", "Which one is ROUND?"],
                [
                  ["🔵", "🔵"],
                  ["🟥", "🟥"],
                  ["🔺", "🔺"],
                ],
                0,
                ["Дугуйд булан байхгүй.", "A circle has no corners."]
              ),
            ],
          },
          {
            title: ["Хээ үргэлжлүүл", "Continue the pattern"],
            xp: 10,
            exercises: [
              choice(
                ["🔴 🔵 🔴 🔵 ?", "🔴 🔵 🔴 🔵 ?"],
                [
                  ["🔴", "🔴"],
                  ["🔵", "🔵"],
                  ["🟡", "🟡"],
                ],
                0,
                ["Хоёр өнгө ээлжилнэ.", "The two colours alternate."]
              ),
              choice(
                ["⭐ ⭐ ❤️ ⭐ ⭐ ?", "⭐ ⭐ ❤️ ⭐ ⭐ ?"],
                [
                  ["❤️", "❤️"],
                  ["⭐", "⭐"],
                  ["🔺", "🔺"],
                ],
                0,
                ["Хоёр од тутамд нэг зүрх.", "One heart after every two stars."]
              ),
              choice(
                ["🟥 🔺 🟥 🔺 ?", "🟥 🔺 🟥 🔺 ?"],
                [
                  ["🟥", "🟥"],
                  ["🔺", "🔺"],
                  ["🔵", "🔵"],
                ],
                0,
                ["Дөрвөлжин, гурвалжин ээлжилнэ.", "Square and triangle alternate."]
              ),
            ],
          },
          {
            title: ["Өнгөний санах ой", "Colour memory"],
            xp: 10,
            exercises: [
              memory(
                ["Ижил өнгүүдийг ол.", "Find the matching colours."],
                ["Өнгө санах нь зурахад тусална.", "Remembering colours helps when you draw."],
                COLORS.slice(0, 5).map((color) => color.emoji)
              ),
            ],
          },
        ],
      },
      {
        title: ["Зураг эвлүүлэх", "Picture puzzles"],
        color: "amber",
        lessons: [
          {
            title: ["Жижиг зураг", "Small picture"],
            xp: 15,
            exercises: [
              slide(
                ["Зургийг эвлүүл.", "Put the picture together."],
                ["Хэсэг бүрийг зөв байранд нь оруул.", "Move each tile into its right place."],
                3
              ),
            ],
          },
          {
            title: ["Том зураг", "Big picture"],
            xp: 20,
            exercises: [
              slide(
                ["Том зургийг эвлүүл.", "Solve the bigger picture."],
                ["Тэвчээр — том зураг илүү олон алхамтай.", "Be patient — a bigger picture takes more steps."],
                4
              ),
            ],
          },
          {
            title: ["Зургийн санах ой", "Picture memory"],
            xp: 15,
            exercises: [
              memory(
                ["Ижил зургуудыг ол.", "Find the matching pictures."],
                ["Санах ой сайжрах тусам зурах санаа ч олширно.", "The better your memory, the more ideas you have to draw."],
                /*
                 * ⚠ ХӨЗӨР ДАВХАРДАХ ЁСГҮЙ: `SHAPES`-ийн «дугуй» ба
                 * `COLORS`-ийн «цэнхэр» хоёр ЯГ ИЖИЛ эможи (🔵) —
                 * хамтад нь хийвэл дөрвөн хөзөр адилхан болж, тоглоомын
                 * дүрэм эвдэрнэ (seed-ийн шалгалт үүнийг барьсан).
                 */
                Array.from(
                  new Set([...SHAPES, ...COLORS].map((word) => word.emoji))
                ).slice(0, 6)
              ),
            ],
          },
          {
            title: ["Бүтээл хийх", "Making something"],
            xp: 15,
            exercises: [
              choice(
                ["Зураг зурахын өмнө юу хийх нь зөв вэ?", "What is a good thing to do before you draw?"],
                [
                  ["Юу зурахаа бодох", "Think about what you want to draw"],
                  ["Бүх өнгийг хольж хийх", "Mix every colour together"],
                  ["Цаасаа урах", "Tear the paper"],
                ],
                0,
                [
                  "Санаагаа эхлээд толгойдоо зурвал гар нь дагах болно.",
                  "Picture the idea in your head first, and your hand will follow.",
                ]
              ),
              choice(
                ["Алдаа гарвал юу хийх вэ?", "What do you do if you make a mistake?"],
                [
                  ["Түүнээс шинэ санаа гаргах", "Turn it into a new idea"],
                  ["Зургаа хаях", "Throw the drawing away"],
                  ["Дахиж хэзээ ч зурахгүй", "Never draw again"],
                ],
                0,
                [
                  "Бүтээлд «буруу» гэж үгүй — алдаа нь ихэвчлэн хамгийн сонирхолтой санаа болдог.",
                  "In art there is no wrong — a mistake often becomes the most interesting idea.",
                ]
              ),
            ],
          },
        ],
      },
    ],
  };
}

/**
 * ⚠ ШАТАР ЭНД ОРОХГҮЙ. `chessKids()`-ийн бүлгүүдийг (Дүрс бүрийн нүүдэл,
 * Идэж сурах) "chess" курсийн 10 түвшинтэй нэгтгэж, давхардлыг устгасан
 * (ойлголтын асуултууд нь 2-р түвшинд, санах ойн тоглоом нь 2-р түвшинд
 * орсон). Энд буцааж нэмбэл seed нь устгасан хуучин бүлгүүдийг "chess"
 * курсэд ДАХИН үүсгэнэ. Шатрын агуулгыг `scripts/seed-chess-curriculum.ts`
 * л удирдана.
 */
export const KIDS_COURSES: KidsCourse[] = [
  mathKids(),
  mongolianKids(),
  englishKids(),
  logicKids(),
  creativeKids(),
];

/** Шатрын хүүхдийн хуучин агуулга — seed-д ОРОХГҮЙ (дээрх тайлбар), лавлагаанд л үлдсэн. */
export const LEGACY_CHESS_KIDS = chessKids;
