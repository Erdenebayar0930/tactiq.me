/**
 * «Kids 4-6» сургуулийн ЗУРГААН КУРС — тус бүр 3 бүлэг × 4 хичээл.
 *
 * Ажиллуулах:
 *   npm run seed:kids46 -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * КУРСУУД:
 *   1. Тоо ба Тоолол                  — математик суурь
 *   2. Ухаан ба Сэтгэхүй              — IQ суурь
 *   3. Үсэг ба Анхны Уншлага          — бичиг үсэг
 *   4. Өнгө, Дүрс ба Бүтээлч байдал   — бүтээлч чадвар
 *   5. Хэл ба Харилцаа                — ярих, сонсох
 *   6. Дэлхийг Танин Мэдэхүй          — ерөнхий мэдлэг
 *
 * ⚠ ЭНЭ НАС УНШИЖ ЧАДДАГГҮЙ. Тиймээс даалгавар нь ЗУРАГ, ТЭМДЭГТЭЭР
 * ойлгогдоно; дасгалын бичвэр нь хажууд сууж буй ТОМ ХҮНД зориулагдсан
 * (`lib/puzzles/kids.ts`-ийн тайлбартай ижил зарчим).
 *
 * ⚠ ХОЁР ТӨРӨЛ ашиглана, шинийг НЭМЭХГҮЙ:
 *
 *   • `kids` / `series` — тоолох, харьцуулах, ангилах, дараалал. Дүрсийг
 *     нь апп өөрөө зурдаг тул төхөөрөмж бүр дээр ИЖИЛ харагдана.
 *   • `choice` — үсэг, үг, эможи сонгох. `learn/[lessonId]`-ийн сонголтын
 *     хэсэг нь БҮХ шошго богино (эможи/үсэг) үед том хавтан болж
 *     зурагддаг, тиймээс уншиж чаддаггүй хүүхдэд ч тэмдэг нь тод
 *     харагдана.
 *
 * ⚠ Эможи нь `kids`/`series`-ийн «ижил эсэх» дасгалд ТААРАХГҮЙ (төхөөрөмж
 * бүр өөрөөр зурдаг), гэвч «аль нь нохой вэ?» гэсэн НЭРЛЭХ дасгалд
 * асуудалгүй: тэнд ялгаа нь утга агуулгад л байна.
 *
 * ⚠ ХУУЧИН ХОЁР КУРСЫГ ЗӨӨНӨ, устгахгүй: `kids-counting` → «Тоо ба
 * Тоолол», `kids-thinking` → «Ухаан ба Сэтгэхүй». Тэдгээр дээр сурагчийн
 * явц бий бөгөөд `lesson_progress` нь хичээлийн ID-аар холбогддог тул
 * устгаад дахин үүсгэвэл хийсэн ажил нь тасарна. `kids-code` (Анхны Код)
 * нь шинэ жагсаалтад алга — ХЭВЭЭР үлдээнэ.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessonProgress, lessons, units, users } from "../src/lib/db/schema";
import { decodeKids, encodeKids, type Kids } from "../src/lib/puzzles/kids";
import { decodeSeries, encodeSeries, type Series } from "../src/lib/puzzles/series";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [emailArg] = args.filter((arg) => !arg.startsWith("--"));

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:kids46 -- <email> [--force]");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

/** Хичээл тутмын дасгалын тоо. */
const PER_LESSON = 8;
const SCHOOL = "kids-4-6";

type Option = { id: string; label: string };
type Built = {
  type: "kids" | "series" | "choice";
  /** `kids`/`series` — кодлосон дасгал. `choice` — хоосон. */
  grid: string | null;
  prompt: string;
  options: Option[] | null;
  correctId: string | null;
  /** Давхардлыг барих түлхүүр. */
  key: string;
};
type LessonSpec = { title: string; xp: number; explanation: string; items: Built[] };
type UnitSpec = { title: string; lessons: LessonSpec[] };
type CourseSpec = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  color: string;
  /** Хуучин курсын slug — байвал түүнийг ЗӨӨЖ ашиглана. */
  legacySlug?: string;
  units: UnitSpec[];
};

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * ӨВӨРМӨЦ дасгалуудыг цуглуулна.
 *
 * ⚠ Энэ насны үүсгэгчид БАГА мужтай («1-5 хүртэл тоол» гэхэд таван л
 * хариу). Энгийн давталт нь ижил дасгалыг чимээгүй давтдаг тул давхардлыг
 * барьж, хүрэлцэхгүй бол ЧАНГА уначина.
 */
function uniqueItems(count: number, make: (attempt: number) => Built, label: string): Built[] {
  const byKey = new Map<string, Built>();

  for (let attempt = 0; byKey.size < count && attempt < count * 60; attempt += 1) {
    const item = make(attempt);
    if (!byKey.has(item.key)) byKey.set(item.key, item);
  }

  if (byKey.size < count) {
    throw new Error(`«${label}» — ${count} өвөрмөц дасгал гарсангүй (${byKey.size}).`);
  }

  return [...byKey.values()];
}

function kidsItem(kids: Kids, prompt: string): Built {
  const grid = encodeKids(kids);
  // ⚠ Санд бичихээс ӨМНӨ эргэж уншигдаж байгааг батална.
  if (!decodeKids(grid)) throw new Error(`Дасгал уншигдсангүй: ${grid}`);
  return { type: "kids", grid, prompt, options: null, correctId: null, key: grid };
}

function seriesItem(series: Series, prompt: string): Built {
  const grid = encodeSeries(series);
  if (!decodeSeries(grid)) throw new Error(`Дасгал уншигдсангүй: ${grid}`);
  return { type: "series", grid, prompt, options: null, correctId: null, key: grid };
}

/**
 * Тэмдэгт сонгох дасгал (үсэг, эможи, богино үг).
 *
 * ⚠ Сонголтууд ДАВХЦВАЛ хоёр зөв хариу үүсч, сурагч зөв дарсан ч алдаа
 * гэж тооцогдоно — тиймээс чанга шалгана.
 */
function pickItem(prompt: string, correct: string, wrong: string[], rng: () => number): Built {
  const labels = [correct, ...wrong];
  if (new Set(labels).size !== labels.length) {
    throw new Error(`Сонголт давхцав: «${prompt}» → ${labels.join(" / ")}`);
  }

  const ordered = shuffle(labels, rng);
  const options = ordered.map((label, index) => ({ id: `o${index + 1}`, label }));
  const correctOption = options.find((option) => option.label === correct)!;

  return {
    type: "choice",
    grid: null,
    prompt,
    options,
    correctId: correctOption.id,
    key: `${prompt}|${correct}`,
  };
}

/**
 * Сангаас ГУРВАН өөр буруу хувилбар түүнэ.
 *
 * ⚠ Гараар бичсэн `while (…) { extra += 1 }` мөчлөгүүд нь алхам нь сангийн
 * уртыг ХУВААДАГ үед (жишээ нь 9 өнгөн дээр 3 алхам) хүрэх боломжтой
 * гишүүн гурав л болж, МӨНХИЙН МӨЧЛӨГТ ордог байв. Энд алхам нь үргэлж 1
 * бөгөөд сан дуусмагц ЧАНГА уначина.
 */
function threeOthers<T>(pool: T[], correct: T, start: number, same: (a: T, b: T) => boolean): T[] {
  const out: T[] = [];
  for (let step = 1; step <= pool.length && out.length < 3; step += 1) {
    const candidate = pool[(start + step) % pool.length];
    if (!same(candidate, correct) && !out.some((chosen) => same(chosen, candidate))) {
      out.push(candidate);
    }
  }
  if (out.length < 3) throw new Error("Санд гурван өөр хувилбар алга.");
  return out;
}

const SHAPES = ["c", "s", "t", "d", "p"];
const COLORS = ["r", "b", "g", "y", "v"];
const SHAPE_NAMES: Record<string, string> = {
  c: "дугуй",
  s: "дөрвөлжин",
  t: "гурвалжин",
  d: "ромб",
  p: "од",
};
const COLOR_NAMES: Record<string, string> = {
  r: "улаан",
  b: "цэнхэр",
  g: "ногоон",
  y: "шар",
  v: "ягаан",
};

/** Дүрсийн тэмдэглэгээ — хэлбэр + өнгө. */
const token = (shape: string, color: string) => `${shape}${color}`;

// ---------------------------------------------------------------------------
// 1. Тоо ба Тоолол
// ---------------------------------------------------------------------------

function numbers(): UnitSpec[] {
  const rng = makeRng(460_001);

  /**
   * Эможи эгнээг тоолох.
   *
   * ⚠ `kids:count` нь ТАВ хүртэл л дэмждэг (`decodeKids`). 6-10-ыг
   * тоолуулахын тулд эможиг асуултад давтаж, тоог нь сонгуулна —
   * сонголтууд цифр тул дэлгэц дээр том хавтан болж зурагдана.
   */
  const countGlyphs = (min: number, max: number, glyphs: string[], label: string, prompt: string) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const count = min + (i % (max - min + 1));
        const glyph = glyphs[Math.floor(i / (max - min + 1)) % glyphs.length];
        const wrong = [count + 1, count - 1, count + 2]
          .filter((value) => value > 0 && value !== count)
          .slice(0, 3)
          .map(String);
        return pickItem(`${glyph.repeat(count)}  — хэд вэ?`, String(count), wrong, rng);
      },
      label
    );

  /** Ижил дүрсийг `n` ширхэг — «хэд байна вэ?» */
  const countTo = (max: number, min: number, label: string) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const count = min + (i % (max - min + 1));
        const shape = token(SHAPES[i % SHAPES.length], COLORS[Math.floor(i / 2) % COLORS.length]);
        return kidsItem(
          { mode: "count", shapes: Array.from({ length: count }, () => shape) },
          "Хэдэн ширхэг байна вэ? — тоог нь дар."
        );
      },
      label
    );

  const toFive = countTo(5, 1, "1–5 хүртэл тоо");
  const toTen = countGlyphs(
    6,
    10,
    ["🍎", "⭐", "🐟", "🌷", "🧸"],
    "6–10 хүртэл тоо",
    "Хэд вэ?"
  );

  /** Холимог дүрс — «БҮГДИЙГ нь тоол», зөвхөн ижлийг нь биш. */
  const recognise = uniqueItems(
    PER_LESSON,
    (i) => {
      // ⚠ `kids:count` нь тав хүртэл — түүнээс хэтрүүлбэл `decodeKids` татгална.
      const count = 1 + (i % 5);
      return kidsItem(
        {
          mode: "count",
          /*
           * ⚠ Хэлбэр, өнгө хоёул `i + index`-ээс хамаарвал `i` ба `i + 5`
           * ЯГ ижил дасгал гаргана (хоёулаа 5 урттай). Өнгийг удаан
           * эргэдэг тоолуураар авна.
           */
          shapes: Array.from({ length: count }, (_, index) =>
            token(
              SHAPES[(i + index) % SHAPES.length],
              COLORS[(Math.floor(i / 5) + index) % COLORS.length]
            )
          ),
        },
        "Зурагт хэдэн зүйл байна вэ?"
      );
    },
    "Тоо таних"
  );

  const linkPicture = uniqueItems(
    PER_LESSON,
    (i) => {
      const count = 1 + (i % 5);
      // ⚠ Өнгө нь `i`-ээс УДААН эргэнэ — эс тэгвэл `i` ба `i + 5` ижил дасгал болно.
      const shape = token(SHAPES[(i + 2) % SHAPES.length], COLORS[(Math.floor(i / 5) + 3) % COLORS.length]);
      return kidsItem(
        { mode: "count", shapes: Array.from({ length: count }, () => shape) },
        "Зураг дээрх тоотой тохирох ТООГ нь дар."
      );
    },
    "Тоо ба зургийг холбох"
  );

  const countThings = countGlyphs(
    2,
    9,
    ["🚗", "🐶", "🥛", "🎈", "🌳"],
    "Юмс тоолох",
    "Хуруугаараа зааж тоол — хэд вэ?"
  );

  /** Нэгээр нэмэх/хасах — тоон эгнээний дутуу гишүүн. */
  const step = (delta: number, label: string, prompt: string) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const start = 1 + (i % 8);
        const items = [start, start + delta, start + delta * 2, start + delta * 3];
        // Дутуу гишүүн нь эхнийх БИШ: эхлэлгүй бол дүрэм нь харагдахгүй.
        const index = 1 + (Math.floor(i / 8) % 3);
        return seriesItem({ mode: "number", items: items.map(String), index }, prompt);
      },
      label
    );

  const plusOne = step(1, "Нэгээр нэмэх", "Дутуу тоог ол — нэг нэгээр нэмэгдэж байна.");
  const minusOne = step(-1, "Нэгээр хасах", "Дутуу тоог ол — нэг нэгээр хорогдож байна.");

  /**
   * «Аль нь олон вэ?» — ХЭМЖЭЭГЭЭР харьцуулна.
   *
   * ⚠ Хоёр овоолгыг зэрэг үзүүлж «аль нь олон вэ» гэж асуух горим
   * `kids`-д алга. Хамгийн ойр нь `size`: хүүхэд «илүү их»-ийг нүдээр
   * шүүнэ. Шинэ горим нэмэхийн оронд үүнийг сонгов — нэмбэл төрөл,
   * шалгагч, засварлагчийг бүгдийг нь өргөтгөх шаардлагатай.
   */
  const whichMore = uniqueItems(
    PER_LESSON,
    (i) => {
      const shape = token(SHAPES[i % SHAPES.length], COLORS[i % COLORS.length]);
      const sizes = shuffle([1, 2, 3], rng).slice(0, 2 + (i % 2));
      return kidsItem(
        { mode: "size", shapes: sizes.map(() => shape), sizes },
        "Аль нь ИЛҮҮ ОЛОН (том) вэ?"
      );
    },
    "Аль нь олон вэ?"
  );

  /** Хэмжээ харьцуулах гурван хичээл — асуулт нь өөр, бүтэц нь нэг. */
  const compare = (label: string, prompt: string, seed: number) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const shape = token(SHAPES[(i + seed) % SHAPES.length], COLORS[(i + seed) % COLORS.length]);
        const sizes = shuffle([1, 2, 3], rng).slice(0, 2 + ((i + seed) % 2));
        return kidsItem({ mode: "size", shapes: sizes.map(() => shape), sizes }, prompt);
      },
      label
    );

  const bigSmall = compare("Их ба бага", "Хамгийн ИХ нь аль нь вэ?", 1);
  const longShort = compare("Урт ба богино", "Хамгийн УРТ нь аль нь вэ?", 2);
  const bigTiny = compare("Том ба жижиг", "Хамгийн ТОМ нь аль нь вэ?", 3);

  const match = uniqueItems(
    PER_LESSON,
    (i) => {
      const target = token(SHAPES[i % SHAPES.length], COLORS[Math.floor(i / 5) % COLORS.length]);
      const options = [target];
      for (let extra = 1; options.length < 4 && extra <= SHAPES.length * COLORS.length; extra += 1) {
        const other = token(
          SHAPES[(i + extra) % SHAPES.length],
          COLORS[(i + extra * 2 + Math.floor(extra / SHAPES.length)) % COLORS.length]
        );
        if (!options.includes(other)) options.push(other);
      }
      if (options.length < 4) throw new Error("Дөрвөн өөр дүрс гарсангүй.");
      return kidsItem(
        { mode: "same", target, options: shuffle(options, rng) },
        "Дээрхтэй ИЖИЛ нэгийг нь ол."
      );
    },
    "Хослуулах"
  );

  return [
    {
      title: "Бүлэг 1 — Тоотой танилцъя",
      lessons: [
        { title: "1–5 хүртэл тоо", xp: 8, explanation: "Хуруугаараа зааж, чангаар тоол.", items: toFive },
        { title: "6–10 хүртэл тоо", xp: 8, explanation: "Тав хүртэл тоолоод цааш үргэлжлүүл.", items: toTen },
        { title: "Тоо таних", xp: 8, explanation: "Дүрс нь өөр ч БҮГДИЙГ нь тоолно.", items: recognise },
        { title: "Тоо ба зургийг холбох", xp: 10, explanation: "Тоолсон тоогоо тоон товчтой нь тааруул.", items: linkPicture },
      ],
    },
    {
      title: "Бүлэг 2 — Тоолж суръя",
      lessons: [
        { title: "Юмс тоолох", xp: 8, explanation: "Зүүнээс баруун тийш алгасалгүй тоол.", items: countThings },
        { title: "Нэгээр нэмэх", xp: 10, explanation: "Дараагийн тоо нь нэгээр ИХ.", items: plusOne },
        { title: "Нэгээр хасах", xp: 10, explanation: "Дараагийн тоо нь нэгээр БАГА.", items: minusOne },
        { title: "Аль нь олон вэ?", xp: 10, explanation: "Илүү их зай эзэлж буйг нь сонго.", items: whichMore },
      ],
    },
    {
      title: "Бүлэг 3 — Анхны математик",
      lessons: [
        { title: "Их ба бага", xp: 8, explanation: "Хоёр дүрсийг зэрэгцүүлж хар.", items: bigSmall },
        { title: "Урт ба богино", xp: 8, explanation: "Нэг ирмэгээс нь эхлүүлж харьцуул.", items: longShort },
        { title: "Том ба жижиг", xp: 8, explanation: "Эзлэх талбайгаар нь жиш.", items: bigTiny },
        { title: "Хослуулах", xp: 10, explanation: "Хэлбэр БА өнгө хоёул таарах ёстой.", items: match },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 2. Ухаан ба Сэтгэхүй
// ---------------------------------------------------------------------------

function thinking(): UnitSpec[] {
  const rng = makeRng(460_002);

  const findSame = uniqueItems(
    PER_LESSON,
    (i) => {
      const target = token(SHAPES[i % SHAPES.length], COLORS[(i * 3) % COLORS.length]);
      const options = [target];
      for (let extra = 1; options.length < 4 && extra <= SHAPES.length * COLORS.length; extra += 1) {
        const other = token(
          SHAPES[(i + extra * 2) % SHAPES.length],
          COLORS[(i + extra + Math.floor(extra / SHAPES.length)) % COLORS.length]
        );
        if (!options.includes(other)) options.push(other);
      }
      if (options.length < 4) throw new Error("Дөрвөн өөр дүрс гарсангүй.");
      return kidsItem(
        { mode: "same", target, options: shuffle(options, rng) },
        "Дээрхтэй ИЖИЛ дүрсийг ол."
      );
    },
    "Ижил зүйлийг олох"
  );

  /** Илүүцийг ол — нэг гишүүн нь бусдаасаа `by`-гаар ялгаатай. */
  const oddOneOut = (by: "shape" | "color", label: string, prompt: string, seed: number) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const shape = SHAPES[(i + seed) % SHAPES.length];
        const color = COLORS[(i + seed) % COLORS.length];
        const common = token(shape, color);
        const odd =
          by === "shape"
            ? token(SHAPES[(i + seed + 2) % SHAPES.length], color)
            : token(shape, COLORS[(i + seed + 2) % COLORS.length]);

        const length = 4 + (Math.floor(i / 5) % 2);
        const at = i % length;
        const items = Array.from({ length }, (_, index) => (index === at ? odd : common));
        return seriesItem({ mode: "odd", items, index: at }, prompt);
      },
      label
    );

  const findDifferent = oddOneOut("shape", "Өөр зүйлийг олох", "Бусдаас ӨӨР нь аль нь вэ?", 0);
  const findGap = oddOneOut("color", "Ялгааг олох", "Өнгөөрөө ялгарч буйг нь ол.", 1);

  /** Дутуу гишүүн — давтамжит эгнээнээс нэгийг далдална. */
  const missing = uniqueItems(
    PER_LESSON,
    (i) => {
      const period = 2 + (i % 2);
      const pool = Array.from({ length: period }, (_, index) =>
        token(SHAPES[(i + index) % SHAPES.length], COLORS[(i + index) % COLORS.length])
      );
      const items = Array.from({ length: 5 }, (_, index) => pool[index % period]);
      const index = 1 + (Math.floor(i / 4) % 4);
      return seriesItem({ mode: "shape", items, index }, "Дутуу зургийг ол.");
    },
    "Дутуу зургийг олох"
  );

  const byColor = oddOneOut("color", "Өнгөөр ангилах", "Өнгөөрөө ТОХИРОХГҮЙ нэгийг ол.", 2);
  const byShape = oddOneOut("shape", "Дүрсээр ангилах", "Хэлбэрээрээ ТОХИРОХГҮЙ нэгийг ол.", 3);

  const bySize = uniqueItems(
    PER_LESSON,
    (i) => {
      const shape = token(SHAPES[(i + 4) % SHAPES.length], COLORS[(i + 1) % COLORS.length]);
      const sizes = shuffle([1, 2, 3], rng).slice(0, 2 + (i % 2));
      return kidsItem(
        { mode: "size", shapes: sizes.map(() => shape), sizes },
        "Хамгийн том хэмжээтэйг нь ангилж ол."
      );
    },
    "Хэмжээгээр ангилах"
  );

  const byKind = oddOneOut("shape", "Төрлөөр нь ялгах", "Аль нь өөр ТӨРЛИЙНХ вэ?", 4);

  /** Давтамжит эгнээний ДАРААГИЙНХ — сүүлийн гишүүнийг далдална. */
  const nextIn = (period: number, sameShape: boolean, label: string, prompt: string, seed: number) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const pool = Array.from({ length: period }, (_, index) =>
          sameShape
            ? token(SHAPES[(i + seed) % SHAPES.length], COLORS[(i + seed + index) % COLORS.length])
            : token(SHAPES[(i + seed + index) % SHAPES.length], COLORS[(i + seed) % COLORS.length])
        );
        const length = 5 + (Math.floor(i / 5) % 2);
        const items = Array.from({ length }, (_, index) => pool[index % period]);
        return seriesItem({ mode: "shape", items, index: length - 1 }, prompt);
      },
      label
    );

  return [
    {
      title: "Бүлэг 1 — Ажиглая",
      lessons: [
        { title: "Ижил зүйлийг олох", xp: 8, explanation: "Хэлбэр БА өнгө хоёул таарах ёстой.", items: findSame },
        { title: "Өөр зүйлийг олох", xp: 8, explanation: "Бусад нь бүгд ижил — нэг нь л өөр.", items: findDifferent },
        { title: "Ялгааг олох", xp: 8, explanation: "Энэ удаад ялгаа нь ӨНГӨНД байна.", items: findGap },
        { title: "Дутуу зургийг олох", xp: 10, explanation: "Эгнээ давтагдаж байгааг ол, дараа нь нөх.", items: missing },
      ],
    },
    {
      title: "Бүлэг 2 — Ангилъя",
      lessons: [
        { title: "Өнгөөр ангилах", xp: 8, explanation: "Хэлбэрийг нь бус, ӨНГИЙГ нь хар.", items: byColor },
        { title: "Дүрсээр ангилах", xp: 8, explanation: "Өнгийг нь бус, ХЭЛБЭРИЙГ нь хар.", items: byShape },
        { title: "Хэмжээгээр ангилах", xp: 8, explanation: "Хамгийн том, хамгийн жижгийг нь ялга.", items: bySize },
        { title: "Төрлөөр нь ялгах", xp: 10, explanation: "Нэг бүлэгт багтахгүй нэгийг ол.", items: byKind },
      ],
    },
    {
      title: "Бүлэг 3 — Дараалал",
      lessons: [
        { title: "Энгийн дараалал", xp: 8, explanation: "Хоёр зүйл ээлжилж давтагдана.", items: nextIn(2, false, "Энгийн дараалал", "Дараа нь юу ирэх вэ?", 0) },
        { title: "Дүрсний дараалал", xp: 10, explanation: "Хэлбэрүүд дараалан солигдож байна.", items: nextIn(3, false, "Дүрсний дараалал", "Дараагийн ДҮРС юу вэ?", 1) },
        { title: "Өнгөний дараалал", xp: 10, explanation: "Хэлбэр нь нэг — ӨНГӨ нь ээлжилнэ.", items: nextIn(2, true, "Өнгөний дараалал", "Дараагийн ӨНГӨ юу вэ?", 2) },
        { title: "Дараагийн зүйлийг олох", xp: 12, explanation: "Эхлээд дүрмийг нь ол, дараа нь үргэлжлүүл.", items: nextIn(3, true, "Дараагийн зүйлийг олох", "Эгнээг үргэлжлүүл.", 3) },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 3. Үсэг ба Анхны Уншлага
// ---------------------------------------------------------------------------

/*
 * ⚠ ҮСЭГ, ҮГИЙГ `kids`/`series` төрлөөр үзүүлэх БОЛОМЖГҮЙ: тэд зөвхөн
 * хэлбэр + өнгөний тэмдэглэгээ мэднэ. Тиймээс `choice` ашиглана —
 * сонголтууд богино (нэг үсэг, нэг эможи) тул дасгалын дэлгэц тэднийг
 * ТОМ ХАВТАН болгож зурна (`learn/[lessonId]`-ийн `isGlyphGrid`).
 */

const VOWELS = ["А", "Э", "И", "О", "У", "Ө", "Ү", "Я", "Е", "Ю"];
const CONSONANTS = ["Б", "В", "Г", "Д", "Ж", "З", "К", "Л", "М", "Н", "П", "Р", "С", "Т", "Х", "Ч", "Ш"];

/** Зураг → түүний нэр ба ЭХНИЙ үсэг. */
const PICTURE_WORDS: { glyph: string; word: string; letter: string; syllables: number }[] = [
  { glyph: "🍎", word: "алим", letter: "А", syllables: 2 },
  { glyph: "🐶", word: "нохой", letter: "Н", syllables: 2 },
  { glyph: "🐱", word: "муур", letter: "М", syllables: 1 },
  { glyph: "🐴", word: "морь", letter: "М", syllables: 1 },
  { glyph: "🌳", word: "мод", letter: "М", syllables: 1 },
  { glyph: "🏠", word: "гэр", letter: "Г", syllables: 1 },
  { glyph: "📖", word: "ном", letter: "Н", syllables: 1 },
  { glyph: "☀️", word: "нар", letter: "Н", syllables: 1 },
  { glyph: "🌙", word: "сар", letter: "С", syllables: 1 },
  { glyph: "💧", word: "ус", letter: "У", syllables: 1 },
  { glyph: "🐟", word: "загас", letter: "З", syllables: 2 },
  { glyph: "🐦", word: "шувуу", letter: "Ш", syllables: 2 },
  { glyph: "🌸", word: "цэцэг", letter: "Ц", syllables: 2 },
  { glyph: "🚗", word: "машин", letter: "М", syllables: 2 },
  { glyph: "🥛", word: "сүү", letter: "С", syllables: 1 },
  { glyph: "🍞", word: "талх", letter: "Т", syllables: 1 },
];

function letters(): UnitSpec[] {
  const rng = makeRng(460_003);

  /** Эгшиг/гийгүүлэгчийг ялгах — нэг нь зөв, гурав нь нөгөө бүлгээс. */
  const letterGroup = (wantVowel: boolean, label: string, prompt: string) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const correct = wantVowel ? VOWELS[i % VOWELS.length] : CONSONANTS[i % CONSONANTS.length];
        const pool = wantVowel ? CONSONANTS : VOWELS;
        const wrong = [0, 1, 2].map((k) => pool[(i * 3 + k) % pool.length]);
        return pickItem(prompt, correct, wrong, rng);
      },
      label
    );

  /** Нэрлэсэн үсгийг ол. */
  const namedLetter = (label: string, seed: number) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const all = [...VOWELS, ...CONSONANTS];
        const correct = all[(i * 3 + seed) % all.length];
        const wrong = threeOthers(all, correct, i * 3 + seed, (a, b) => a === b);
        return pickItem(`Аль нь «${correct}» үсэг вэ?`, correct, wrong, rng);
      },
      label
    );

  /** Зургийн ЭХНИЙ үсгийг ол. */
  const firstLetter = uniqueItems(
    PER_LESSON,
    (i) => {
      const entry = PICTURE_WORDS[i % PICTURE_WORDS.length];
      const all = [...VOWELS, ...CONSONANTS];
      const wrong = threeOthers(all, entry.letter, i * 7, (a, b) => a === b);
      return pickItem(
        `${entry.glyph} «${entry.word}» — ЭХНИЙ үсэг нь юу вэ?`,
        entry.letter,
        wrong,
        rng
      );
    },
    "Эхний авиаг олох"
  );

  /** Ижил авиагаар эхэлдэг үгс — тэр авианы үсгийг ол. */
  const sameSound = uniqueItems(
    PER_LESSON,
    (i) => {
      const entry = PICTURE_WORDS[(i * 5) % PICTURE_WORDS.length];
      const friends = PICTURE_WORDS.filter(
        (other) => other.letter === entry.letter && other.word !== entry.word
      );
      const list = [entry.word, ...friends.map((other) => other.word)].slice(0, 3).join(", ");
      const all = [...VOWELS, ...CONSONANTS];
      const wrong = threeOthers(all, entry.letter, i * 11, (a, b) => a === b);
      return pickItem(`«${list}» — ямар үсгээр эхэлж байна вэ?`, entry.letter, wrong, rng);
    },
    "Ижил авиаг олох"
  );

  /** Үсгийн авиа — авиаг нь сонсоод үсгийг нь ол. */
  const letterSound = uniqueItems(
    PER_LESSON,
    (i) => {
      const all = [...CONSONANTS, ...VOWELS];
      const correct = all[(i * 5 + 2) % all.length];
      const wrong = threeOthers(all, correct, i * 5 + 2, (a, b) => a === b);
      return pickItem(
        `«${correct.toLowerCase()}» гэж дуудахад ямар үсэг гарах вэ? (том хүн уншиж өгнө)`,
        correct,
        wrong,
        rng
      );
    },
    "Үсгийн авиа"
  );

  /** Зураг → эхний үсэг (өөр асуултын хэлбэр). */
  const pictureSound = uniqueItems(
    PER_LESSON,
    (i) => {
      const entry = PICTURE_WORDS[(i * 3 + 1) % PICTURE_WORDS.length];
      const all = [...VOWELS, ...CONSONANTS];
      const wrong = threeOthers(all, entry.letter, i * 9, (a, b) => a === b);
      return pickItem(
        `${entry.glyph} Энэ зургийн нэр ямар үсгээр эхэлдэг вэ?`,
        entry.letter,
        wrong,
        rng
      );
    },
    "Зураг ба авиаг холбох"
  );

  const syllables = uniqueItems(
    PER_LESSON,
    (i) => {
      const entry = PICTURE_WORDS[(i * 7) % PICTURE_WORDS.length];
      const correct = String(entry.syllables);
      const wrong = ["1", "2", "3", "4"].filter((value) => value !== correct).slice(0, 3);
      return pickItem(
        `${entry.glyph} «${entry.word}» — хэдэн ҮЕтэй вэ? (алга ташиж тоол)`,
        correct,
        wrong,
        rng
      );
    },
    "Үе таних"
  );

  /** Зураг → үг (богино үгс). */
  const shortWords = uniqueItems(
    PER_LESSON,
    (i) => {
      const entry = PICTURE_WORDS[(i * 3) % PICTURE_WORDS.length];
      const wrong = threeOthers(PICTURE_WORDS, entry, i * 3, (a, b) => a.word === b.word).map((other) => other.word);
      return pickItem(`${entry.glyph} Энэ юу вэ? — үгийг нь сонго.`, entry.word, wrong, rng);
    },
    "Богино үг"
  );

  /** Үсгүүдээс үг угсрах. */
  const buildWord = uniqueItems(
    PER_LESSON,
    (i) => {
      const entry = PICTURE_WORDS[(i * 5 + 2) % PICTURE_WORDS.length];
      const spelled = [...entry.word].join("-");
      const wrong = threeOthers(PICTURE_WORDS, entry, i * 5 + 2, (a, b) => a.word === b.word).map((other) => other.word);
      return pickItem(`«${spelled}» — ямар үг болох вэ?`, entry.word, wrong, rng);
    },
    "Үсгээр үг бүтээх"
  );

  /** Үг → зураг (уншсанаа ойлгож байгааг шалгана). */
  const readWord = uniqueItems(
    PER_LESSON,
    (i) => {
      const entry = PICTURE_WORDS[(i * 9 + 4) % PICTURE_WORDS.length];
      const wrong = threeOthers(PICTURE_WORDS, entry, i * 9 + 4, (a, b) => a.glyph === b.glyph).map((other) => other.glyph);
      return pickItem(`«${entry.word}» — аль зураг нь вэ?`, entry.glyph, wrong, rng);
    },
    "Энгийн үг унших"
  );

  return [
    {
      title: "Бүлэг 1 — Үсэгтэй танилцъя",
      lessons: [
        { title: "Эгшиг үсэг", xp: 8, explanation: "Эгшиг үсгийг дуугаа таслалгүй сунгаж дуудна.", items: letterGroup(true, "Эгшиг үсэг", "Аль нь ЭГШИГ үсэг вэ?") },
        { title: "Гийгүүлэгч үсэг", xp: 8, explanation: "Гийгүүлэгчийг ганцаараа удаан дуудаж болохгүй.", items: letterGroup(false, "Гийгүүлэгч үсэг", "Аль нь ГИЙГҮҮЛЭГЧ үсэг вэ?") },
        { title: "Үсэг таних", xp: 8, explanation: "Үсгийн хэлбэрийг нь нүдээр тогтоо.", items: namedLetter("Үсэг таних", 0) },
        { title: "Үсэг сонгох", xp: 8, explanation: "Төстэй үсгүүдийг сайн ажигла.", items: namedLetter("Үсэг сонгох", 7) },
      ],
    },
    {
      title: "Бүлэг 2 — Авиа",
      lessons: [
        { title: "Үсгийн авиа", xp: 10, explanation: "Үсэг бүр өөрийн дуутай.", items: letterSound },
        { title: "Эхний авиаг олох", xp: 10, explanation: "Үгээ аажим дуудаж, эхний дууг нь сонс.", items: firstLetter },
        { title: "Ижил авиаг олох", xp: 10, explanation: "Ижил дуугаар эхэлдэг үгсийг сонс.", items: sameSound },
        { title: "Зураг ба авиаг холбох", xp: 10, explanation: "Зургаа нэрлээд эхний дууг нь ол.", items: pictureSound },
      ],
    },
    {
      title: "Бүлэг 3 — Үг",
      lessons: [
        { title: "Үе таних", xp: 10, explanation: "Үе бүрд нэг алга таш.", items: syllables },
        { title: "Богино үг", xp: 10, explanation: "Зургаа нэрлээд ижил үгийг нь ол.", items: shortWords },
        { title: "Үсгээр үг бүтээх", xp: 12, explanation: "Үсгүүдийг дараалан нийлүүлж уншина.", items: buildWord },
        { title: "Энгийн үг унших", xp: 12, explanation: "Уншсан үгээ зурагтай нь тааруул.", items: readWord },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 4. Өнгө, Дүрс ба Бүтээлч байдал
// ---------------------------------------------------------------------------

/** Өнгөний нэр → эможи хавтан. */
const COLOR_TILES: { name: string; glyph: string }[] = [
  { name: "УЛААН", glyph: "🔴" },
  { name: "ЦЭНХЭР", glyph: "🔵" },
  { name: "НОГООН", glyph: "🟢" },
  { name: "ШАР", glyph: "🟡" },
  { name: "ЯГААН", glyph: "🟣" },
  { name: "УЛБАР ШАР", glyph: "🟠" },
  { name: "ХҮРЭН", glyph: "🟤" },
  { name: "ХАР", glyph: "⚫" },
  { name: "ЦАГААН", glyph: "⚪" },
];

function colorsAndShapes(): UnitSpec[] {
  const rng = makeRng(460_004);

  const namedColor = (label: string, seed: number) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const correct = COLOR_TILES[(i * 2 + seed) % COLOR_TILES.length];
        const wrong = threeOthers(
          COLOR_TILES,
          correct,
          i * 2 + seed,
          (a, b) => a.glyph === b.glyph
        ).map((tile) => tile.glyph);
        return pickItem(`Аль нь ${correct.name} вэ?`, correct.glyph, wrong, rng);
      },
      label
    );

  /** Ижил өнгө — хэлбэр нь ондоо ч ӨНГӨ нь таарах нэгийг ол. */
  const sameColor = uniqueItems(
    PER_LESSON,
    (i) => {
      const color = COLORS[i % COLORS.length];
      const target = token(SHAPES[i % SHAPES.length], color);
      const options = [target];
      for (let extra = 1; options.length < 4 && extra <= SHAPES.length * COLORS.length; extra += 1) {
        const other = token(
          SHAPES[(i + extra) % SHAPES.length],
          COLORS[(i + extra * 2 + Math.floor(extra / SHAPES.length)) % COLORS.length]
        );
        if (!options.includes(other)) options.push(other);
      }
      if (options.length < 4) throw new Error("Дөрвөн өөр дүрс гарсангүй.");
      return kidsItem(
        { mode: "same", target, options: shuffle(options, rng) },
        `Дээрхтэй ИЖИЛ (${COLOR_NAMES[color]}) нэгийг ол.`
      );
    },
    "Ижил өнгө олох"
  );

  /** Өнгө холих — сургуулийн өмнөх насны сонгодог хосууд. */
  const MIXES: { a: string; b: string; result: string; wrong: string[] }[] = [
    { a: "🔴", b: "🟡", result: "🟠", wrong: ["🟢", "🔵", "🟣"] },
    { a: "🔵", b: "🟡", result: "🟢", wrong: ["🟠", "🟣", "🔴"] },
    { a: "🔴", b: "🔵", result: "🟣", wrong: ["🟢", "🟠", "🟡"] },
    { a: "🟡", b: "🔴", result: "🟠", wrong: ["🔵", "🟤", "⚫"] },
    { a: "🟡", b: "🔵", result: "🟢", wrong: ["🟣", "🟤", "⚪"] },
    { a: "🔵", b: "🔴", result: "🟣", wrong: ["🟡", "🟤", "⚫"] },
    { a: "🟢", b: "🔴", result: "🟤", wrong: ["🟣", "🟠", "⚪"] },
    { a: "⚫", b: "⚪", result: "🔘", wrong: ["🟡", "🟢", "🔴"] },
  ];

  const mixColors = uniqueItems(
    PER_LESSON,
    (i) => {
      const mix = MIXES[i % MIXES.length];
      return pickItem(`${mix.a} + ${mix.b} = ? (өнгө холивол юу болох вэ?)`, mix.result, mix.wrong, rng);
    },
    "Өнгө холих"
  );

  /**
   * Нэг ХЭЛБЭРИЙГ таних — сонголтод тэр хэлбэрээс ГАНЦ Л байна.
   *
   * ⚠ `same` горим нь «дээрхтэй ижил»-ийг асуудаг тул зорилт нь тэр
   * хэлбэр, бусад нь өөр хэлбэр байхад «дугуйг ол» гэсэнтэй адил
   * болно.
   */
  const findShape = (shape: string, label: string) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const color = COLORS[i % COLORS.length];
        const target = token(shape, color);
        const others = SHAPES.filter((other) => other !== shape);
        const options = [
          target,
          ...others.slice(0, 3).map((other, index) =>
            token(other, COLORS[(i + index + 1) % COLORS.length])
          ),
        ];
        return kidsItem(
          { mode: "same", target, options: shuffle(options, rng) },
          `Аль нь ${SHAPE_NAMES[shape].toUpperCase()} вэ?`
        );
      },
      label
    );

  /** Хээ үргэлжлүүлэх — давтамжит эгнээний сүүлийг далдална. */
  const pattern = (period: number, label: string, prompt: string, seed: number) =>
    uniqueItems(
      PER_LESSON,
      (i) => {
        const pool = Array.from({ length: period }, (_, index) =>
          token(SHAPES[(i + seed + index) % SHAPES.length], COLORS[(i + seed + index) % COLORS.length])
        );
        const length = 5 + (Math.floor(i / 5) % 2);
        const items = Array.from({ length }, (_, index) => pool[index % period]);
        return seriesItem({ mode: "shape", items, index: length - 1 }, prompt);
      },
      label
    );

  return [
    {
      title: "Бүлэг 1 — Өнгө",
      lessons: [
        { title: "Үндсэн өнгө", xp: 8, explanation: "Улаан, шар, цэнхэр — үндсэн гурван өнгө.", items: namedColor("Үндсэн өнгө", 0) },
        { title: "Өнгө ялгах", xp: 8, explanation: "Ойролцоо өнгийг сайн ажигла.", items: namedColor("Өнгө ялгах", 5) },
        { title: "Ижил өнгө олох", xp: 8, explanation: "Хэлбэр нь өөр ч ӨНГӨ нь таарна.", items: sameColor },
        { title: "Өнгө холих", xp: 10, explanation: "Хоёр өнгө нийлээд шинэ өнгө үүснэ.", items: mixColors },
      ],
    },
    {
      title: "Бүлэг 2 — Дүрс",
      lessons: [
        { title: "Дугуй", xp: 8, explanation: "Дугуй нь булангүй.", items: findShape("c", "Дугуй") },
        { title: "Дөрвөлжин", xp: 8, explanation: "Дөрвөлжин нь дөрвөн тэнцүү талтай.", items: findShape("s", "Дөрвөлжин") },
        { title: "Гурвалжин", xp: 8, explanation: "Гурвалжин нь гурван талтай.", items: findShape("t", "Гурвалжин") },
        { title: "Тэгш өнцөгт", xp: 8, explanation: "Ромб нь налуу дөрвөлжин — талууд нь тэнцүү.", items: findShape("d", "Тэгш өнцөгт") },
      ],
    },
    {
      title: "Бүлэг 3 — Бүтээцгээе",
      lessons: [
        { title: "Дүрсээр зураг бүтээх", xp: 10, explanation: "Дүрсүүдийг дарааллаар нь угсарна.", items: pattern(2, "Дүрсээр зураг бүтээх", "Зургийг үргэлжлүүл — дараа нь юу ирэх вэ?", 0) },
        { title: "Өнгөөр зураглах", xp: 10, explanation: "Өнгө нь ээлжлэн давтагдана.", items: pattern(2, "Өнгөөр зураглах", "Өнгөний дарааллыг үргэлжлүүл.", 2) },
        { title: "Хээг үргэлжлүүлэх", xp: 12, explanation: "Гурван зүйл давтагдаж байна.", items: pattern(3, "Хээг үргэлжлүүлэх", "Хээг үргэлжлүүл.", 1) },
        { title: "Өөрийн зураг бүтээх", xp: 12, explanation: "Эхлээд дүрмийг ол, дараа нь өөрөө үргэлжлүүл.", items: pattern(3, "Өөрийн зураг бүтээх", "Дүрмийг нь олоод үргэлжлүүл.", 3) },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// 5, 6. Үгийн сан дээр суурилсан курсууд
// ---------------------------------------------------------------------------

/**
 * ЗУРАГТ ҮГИЙН САН — эможи + нэр.
 *
 * ⚠ Бүлэг тус бүр ДОР ХАЯЖ 8 гишүүнтэй байх ёстой: хичээл бүр 8 өвөрмөц
 * дасгалтай бөгөөд асуулт бүр өөр гишүүнийг нэрлэдэг. Дутвал
 * `uniqueItems` уначина.
 */
const VOCAB: Record<string, { glyph: string; name: string }[]> = {
  family: [
    { glyph: "👩", name: "ЭЭЖ" },
    { glyph: "👨", name: "ААВ" },
    { glyph: "👵", name: "ЭМЭЭ" },
    { glyph: "👴", name: "ӨВӨӨ" },
    { glyph: "👧", name: "ОХИН" },
    { glyph: "👦", name: "ХҮҮ" },
    { glyph: "👶", name: "НЯЛХ ХҮҮХЭД" },
    { glyph: "👨‍👩‍👧", name: "ГЭР БҮЛ" },
  ],
  animals: [
    { glyph: "🐶", name: "НОХОЙ" },
    { glyph: "🐱", name: "МУУР" },
    { glyph: "🐴", name: "МОРЬ" },
    { glyph: "🐄", name: "ҮХЭР" },
    { glyph: "🐑", name: "ХОНЬ" },
    { glyph: "🐐", name: "ЯМАА" },
    { glyph: "🐫", name: "ТЭМЭЭ" },
    { glyph: "🐟", name: "ЗАГАС" },
    { glyph: "🐦", name: "ШУВУУ" },
    { glyph: "🐰", name: "ТУУЛАЙ" },
  ],
  food: [
    { glyph: "🍎", name: "АЛИМ" },
    { glyph: "🍞", name: "ТАЛХ" },
    { glyph: "🥛", name: "СҮҮ" },
    { glyph: "🍚", name: "БУДАА" },
    { glyph: "🥕", name: "ЛУУВАН" },
    { glyph: "🥔", name: "ТӨМС" },
    { glyph: "🍲", name: "ШӨЛ" },
    { glyph: "🧀", name: "БЯСЛАГ" },
  ],
  toys: [
    { glyph: "🧸", name: "БАМБАРУУШ" },
    { glyph: "⚽", name: "БӨМБӨГ" },
    { glyph: "🚗", name: "МАШИН" },
    { glyph: "🧩", name: "ТААВАР" },
    { glyph: "🪁", name: "ЦААСАН ШУВУУ" },
    { glyph: "🎈", name: "БӨМБӨЛӨГ" },
    { glyph: "🪀", name: "ЭРГЭДЭГ ТОГЛООМ" },
    { glyph: "🎨", name: "БУДАГ" },
  ],
  home: [
    { glyph: "🛏️", name: "ОР" },
    { glyph: "🪑", name: "САНДАЛ" },
    { glyph: "🚪", name: "ХААЛГА" },
    { glyph: "🪟", name: "ЦОНХ" },
    { glyph: "🛋️", name: "БУЙДАН" },
    { glyph: "🚿", name: "ШҮРШҮҮР" },
    { glyph: "🍽️", name: "ТАВАГ" },
    { glyph: "🔑", name: "ТҮЛХҮҮР" },
  ],
  school: [
    { glyph: "✏️", name: "ХАРАНДАА" },
    { glyph: "📚", name: "НОМ" },
    { glyph: "🎒", name: "ЦҮНХ" },
    { glyph: "🖍️", name: "ӨНГИЙН ХАРАНДАА" },
    { glyph: "✂️", name: "ХАЙЧ" },
    { glyph: "🧩", name: "ТААВАР" },
    { glyph: "🎨", name: "БУДАГ" },
    { glyph: "📐", name: "ШУГАМ" },
  ],
  city: [
    { glyph: "🏢", name: "БАЙШИН" },
    { glyph: "🚌", name: "АВТОБУС" },
    { glyph: "🚦", name: "ЗАМЫН ГЭРЭЛ" },
    { glyph: "🏥", name: "ЭМНЭЛЭГ" },
    { glyph: "🏫", name: "СУРГУУЛЬ" },
    { glyph: "🏪", name: "ДЭЛГҮҮР" },
    { glyph: "🚒", name: "ГАЛЫН МАШИН" },
    { glyph: "🌉", name: "ГҮҮР" },
  ],
  daily: [
    { glyph: "🪥", name: "ШҮДНИЙ СОЙЗ" },
    { glyph: "🧼", name: "САВАН" },
    { glyph: "👕", name: "ЦАМЦ" },
    { glyph: "👟", name: "ГУТАЛ" },
    { glyph: "🧦", name: "ОЙМС" },
    { glyph: "⏰", name: "СЭРҮҮЛЭГ" },
    { glyph: "🪣", name: "ХУВИН" },
    { glyph: "🧴", name: "ТОС" },
  ],
  plants: [
    { glyph: "🌳", name: "МОД" },
    { glyph: "🌲", name: "ГАЦУУР" },
    { glyph: "🌷", name: "ЦЭЦЭГ" },
    { glyph: "🌻", name: "НАРАНЦЭЦЭГ" },
    { glyph: "🌵", name: "ТОРТОГ" },
    { glyph: "🍃", name: "НАВЧ" },
    { glyph: "🌱", name: "НАХИА" },
    { glyph: "🌾", name: "ӨВС" },
  ],
  weather: [
    { glyph: "☀️", name: "НАРТАЙ" },
    { glyph: "🌧️", name: "БОРООТОЙ" },
    { glyph: "❄️", name: "ЦАСТАЙ" },
    { glyph: "⛅", name: "ҮҮЛЭРХЭГ" },
    { glyph: "🌈", name: "СОЛОНГО" },
    { glyph: "⛈️", name: "АЯНГАТАЙ" },
    { glyph: "💨", name: "САЛХИТАЙ" },
    { glyph: "🌫️", name: "МАНАНТАЙ" },
  ],
  seasons: [
    { glyph: "❄️", name: "ӨВӨЛ" },
    { glyph: "⛄", name: "ӨВЛИЙН ЦАСАН ХҮН" },
    { glyph: "🌷", name: "ХАВАР" },
    { glyph: "🌱", name: "ХАВРЫН НАХИА" },
    { glyph: "🏖️", name: "ЗУН" },
    { glyph: "🌻", name: "ЗУНЫ ЦЭЦЭГ" },
    { glyph: "🍂", name: "НАМАР" },
    { glyph: "🍁", name: "НАМРЫН НАВЧ" },
  ],
  body: [
    { glyph: "👁️", name: "НҮД" },
    { glyph: "👂", name: "ЧИХ" },
    { glyph: "👃", name: "ХАМАР" },
    { glyph: "👄", name: "АМ" },
    { glyph: "✋", name: "ГАР" },
    { glyph: "🦶", name: "ХӨЛ" },
    { glyph: "🦷", name: "ШҮД" },
    { glyph: "💇", name: "ҮС" },
  ],
  healthy: [
    { glyph: "🪥", name: "ШҮДЭЭ УГААХ" },
    { glyph: "🧼", name: "ГАРАА УГААХ" },
    { glyph: "🥗", name: "НОГОО ИДЭХ" },
    { glyph: "💧", name: "УС УУХ" },
    { glyph: "😴", name: "САЙН УНТАХ" },
    { glyph: "🏃", name: "ГҮЙЖ ТОГЛОХ" },
    { glyph: "🍎", name: "ЖИМС ИДЭХ" },
    { glyph: "🧽", name: "ЦЭВЭРЛЭХ" },
  ],
  dayNight: [
    { glyph: "☀️", name: "ӨДӨР" },
    { glyph: "🌙", name: "ШӨНӨ" },
    { glyph: "⭐", name: "ОД" },
    { glyph: "🌅", name: "НАР МАНДАХ" },
    { glyph: "🌃", name: "ШӨНИЙН ХОТ" },
    { glyph: "🛏️", name: "УНТАХ ЦАГ" },
    { glyph: "🍳", name: "ӨГЛӨӨНИЙ ХООЛ" },
    { glyph: "🌞", name: "ҮД ДУНДЫН НАР" },
  ],
  feelings: [
    { glyph: "😀", name: "БАЯРТАЙ" },
    { glyph: "😢", name: "ГУНИГТАЙ" },
    { glyph: "😡", name: "УУРТАЙ" },
    { glyph: "😴", name: "НОЙРМОГ" },
    { glyph: "😮", name: "ГАЙХСАН" },
    { glyph: "😨", name: "АЙСАН" },
    { glyph: "🥰", name: "ХАЙРТАЙ" },
    { glyph: "😐", name: "ТАЙВАН" },
  ],
  actions: [
    { glyph: "🏃", name: "ГҮЙЖ БАЙНА" },
    { glyph: "🧍", name: "ЗОГСОЖ БАЙНА" },
    { glyph: "🪑", name: "СУУЖ БАЙНА" },
    { glyph: "😴", name: "УНТАЖ БАЙНА" },
    { glyph: "🍽️", name: "ИДЭЖ БАЙНА" },
    { glyph: "📖", name: "УНШИЖ БАЙНА" },
    { glyph: "🎨", name: "ЗУРЖ БАЙНА" },
    { glyph: "🚿", name: "УГААЖ БАЙНА" },
  ],
};

/**
 * «Аль нь <нэр> вэ?» — нэг бүлгээс дөрвөн зураг, нэг нь зөв.
 *
 * ⚠ Буруу хувилбарууд нь ИЖИЛ бүлгээс: өөр бүлгээс авбал (жишээ нь
 * амьтны дунд ганц хоол) хүүхэд нэрийг нь мэдэхгүй ч таамаглаад олчихно.
 */
function nameIt(group: string, prompt: (name: string) => string, label: string, seed: number) {
  const entries = VOCAB[group];
  return uniqueItems(
    PER_LESSON,
    (i) => {
      const correct = entries[(i + seed) % entries.length];
      const wrong = threeOthers(entries, correct, i + seed, (a, b) => a.glyph === b.glyph).map(
        (other) => other.glyph
      );
      return pickItem(prompt(correct.name), correct.glyph, wrong, makeRng(seed * 31 + i));
    },
    label
  );
}

function language(): UnitSpec[] {
  return [
    {
      title: "Бүлэг 1 — Үгийн сан",
      lessons: [
        { title: "Гэр бүл", xp: 8, explanation: "Гэр бүлийн гишүүдээ нэрлэж сур.", items: nameIt("family", (name) => `Аль нь ${name} вэ?`, "Гэр бүл", 0) },
        { title: "Амьтад", xp: 8, explanation: "Амьтан бүр өөрийн нэр, дуутай.", items: nameIt("animals", (name) => `Аль нь ${name} вэ?`, "Амьтад", 0) },
        { title: "Хоол хүнс", xp: 8, explanation: "Хоолныхоо нэрийг хэлж сур.", items: nameIt("food", (name) => `Аль нь ${name} вэ?`, "Хоол хүнс", 0) },
        { title: "Тоглоом ба эд зүйл", xp: 8, explanation: "Эд зүйлээ нэрлэвэл гуйхад амар.", items: nameIt("toys", (name) => `Аль нь ${name} вэ?`, "Тоглоом ба эд зүйл", 0) },
      ],
    },
    {
      title: "Бүлэг 2 — Өгүүлбэр",
      lessons: [
        { title: "Нэрлэж суръя", xp: 8, explanation: "«Энэ бол …» гэж бүтэн өгүүлбэрээр хэл.", items: nameIt("home", (name) => `«Энэ бол ${name}» — аль нь вэ?`, "Нэрлэж суръя", 1) },
        { title: "Богино өгүүлбэр", xp: 10, explanation: "Хоёр үгээр бүтэн санаа хэлж болно.", items: nameIt("actions", (name) => `«Хүүхэд ${name}» — аль зураг вэ?`, "Богино өгүүлбэр", 0) },
        { title: "Асуулт ба хариулт", xp: 10, explanation: "Асуултад бүтэн өгүүлбэрээр хариул.", items: nameIt("food", (name) => `«Чи юу идэх вэ?» — ${name} гэж хариулав. Аль нь вэ?`, "Асуулт ба хариулт", 3) },
        { title: "Юу болж байна вэ?", xp: 10, explanation: "Зураг дээр юу болж байгааг үгээр хэл.", items: nameIt("actions", (name) => `Зурагт юу болж байна вэ? — ${name}`, "Юу болж байна вэ?", 4) },
      ],
    },
    {
      title: "Бүлэг 3 — Ярьж суръя",
      lessons: [
        { title: "Өөрийгөө танилцуулах", xp: 10, explanation: "«Намайг … гэдэг» гэж хэлж сур.", items: nameIt("family", (name) => `«Би бол …» — ${name}-ийн зургийг ол.`, "Өөрийгөө танилцуулах", 2) },
        { title: "Өөрийн хүсэлээ хэлэх", xp: 10, explanation: "«Би … хүсэж байна» гэж хэл.", items: nameIt("toys", (name) => `«Би ${name}-оор тоглох хүсэлтэй» — аль нь вэ?`, "Өөрийн хүсэлээ хэлэх", 2) },
        { title: "Сэтгэл хөдлөлөө илэрхийлэх", xp: 10, explanation: "Ямар байгаагаа хэлж сурвал бусад ойлгоно.", items: nameIt("feelings", (name) => `Аль нь ${name} царай вэ?`, "Сэтгэл хөдлөл", 0) },
        { title: "Богино түүх ярих", xp: 12, explanation: "Эхлээд юу болсон, дараа нь юу болсныг дараалуулж хэл.", items: nameIt("actions", (name) => `Түүхийн энэ хэсэгт хүүхэд ${name}. Аль зураг вэ?`, "Богино түүх", 6) },
      ],
    },
  ];
}

function world(): UnitSpec[] {
  return [
    {
      title: "Бүлэг 1 — Миний орчин",
      lessons: [
        { title: "Миний гэр", xp: 8, explanation: "Гэрийн эд зүйлсээ нэрлэж сур.", items: nameIt("home", (name) => `Аль нь ${name} вэ?`, "Миний гэр", 0) },
        { title: "Миний цэцэрлэг", xp: 8, explanation: "Цэцэрлэгт хэрэглэдэг зүйлс.", items: nameIt("school", (name) => `Аль нь ${name} вэ?`, "Миний цэцэрлэг", 0) },
        { title: "Миний хот", xp: 8, explanation: "Гудамжинд харагддаг зүйлс.", items: nameIt("city", (name) => `Аль нь ${name} вэ?`, "Миний хот", 0) },
        { title: "Өдөр тутмын зүйлс", xp: 8, explanation: "Өдөр бүр хэрэглэдэг зүйлс.", items: nameIt("daily", (name) => `Аль нь ${name} вэ?`, "Өдөр тутмын зүйлс", 0) },
      ],
    },
    {
      title: "Бүлэг 2 — Байгаль",
      lessons: [
        { title: "Амьтад", xp: 8, explanation: "Тэжээвэр ба зэрлэг амьтад.", items: nameIt("animals", (name) => `${name} — аль зураг нь вэ?`, "Амьтад (байгаль)", 3) },
        { title: "Ургамал", xp: 8, explanation: "Ургамал усаар ургадаг.", items: nameIt("plants", (name) => `Аль нь ${name} вэ?`, "Ургамал", 0) },
        { title: "Цаг агаар", xp: 8, explanation: "Цонхоор хараад цаг агаараа хэл.", items: nameIt("weather", (name) => `Аль нь ${name} өдөр вэ?`, "Цаг агаар", 0) },
        { title: "Улирал", xp: 10, explanation: "Дөрвөн улирал ээлжлэн ирдэг.", items: nameIt("seasons", (name) => `Аль нь ${name} вэ?`, "Улирал", 0) },
      ],
    },
    {
      title: "Бүлэг 3 — Бидний бие",
      lessons: [
        { title: "Биеийн хэсгүүд", xp: 8, explanation: "Биеийнхээ хэсгүүдийг зааж нэрлэ.", items: nameIt("body", (name) => `Аль нь ${name} вэ?`, "Биеийн хэсгүүд", 0) },
        { title: "Таван мэдрэхүй", xp: 10, explanation: "Нүд хардаг, чих сонсдог, хамар үнэрлэдэг.", items: nameIt("body", (name) => `${name} — биеийн аль хэсэг вэ?`, "Таван мэдрэхүй", 2) },
        { title: "Эрүүл дадал", xp: 10, explanation: "Өдөр бүр давтвал дадал болно.", items: nameIt("healthy", (name) => `Аль нь «${name}» вэ?`, "Эрүүл дадал", 0) },
        { title: "Өдөр ба шөнө", xp: 10, explanation: "Өдөр нартай, шөнө одтой.", items: nameIt("dayNight", (name) => `Аль нь ${name} вэ?`, "Өдөр ба шөнө", 0) },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Курсын тодорхойлолтууд
// ---------------------------------------------------------------------------

function buildCourses(): CourseSpec[] {
  return [
    {
      slug: "kids-numbers",
      title: "Тоо ба Тоолол",
      titleEn: "Numbers & Counting",
      description:
        "1-ээс 10 хүртэл тоолж, тоог зурагтай холбож, их багыг харьцуулж " +
        "сурна. Математикийн хамгийн анхны суурь.",
      descriptionEn:
        "Count to ten, match numbers to pictures and compare sizes — the " +
        "very first maths foundation.",
      icon: "calculator",
      color: "sky",
      // ⚠ Хуучин «Тоолол» курс — явцтай тул ЗӨӨНӨ, устгахгүй.
      legacySlug: "kids-counting",
      units: numbers(),
    },
    {
      slug: "kids-mind",
      title: "Ухаан ба Сэтгэхүй",
      titleEn: "Mind & Thinking",
      description:
        "Ижил, өөрийг ялгах, ангилах, дараалал үргэлжлүүлэх — сэтгэхүйн " +
        "анхны дасгалууд.",
      descriptionEn:
        "Spot same and different, sort into groups and continue patterns — " +
        "first thinking exercises.",
      icon: "brain",
      color: "violet",
      legacySlug: "kids-thinking",
      units: thinking(),
    },
    {
      slug: "kids-letters",
      title: "Үсэг ба Анхны Уншлага",
      titleEn: "Letters & First Reading",
      description:
        "Эгшиг, гийгүүлэгч үсэг, авиа таних, үе тоолж богино үг унших — " +
        "бичиг үсгийн эхлэл.",
      descriptionEn:
        "Vowels and consonants, first sounds, syllables and short words — " +
        "the start of literacy.",
      icon: "braces",
      color: "amber",
      units: letters(),
    },
    {
      slug: "kids-colors-shapes",
      title: "Өнгө, Дүрс ба Бүтээлч байдал",
      titleEn: "Colours, Shapes & Creativity",
      description:
        "Үндсэн өнгө, гол дүрсүүдийг таниад хээ, дараалал бүтээж сурна.",
      descriptionEn:
        "Learn the basic colours and shapes, then build patterns of your own.",
      icon: "palette",
      color: "rose",
      units: colorsAndShapes(),
    },
    {
      slug: "kids-language",
      title: "Хэл ба Харилцаа",
      titleEn: "Language & Communication",
      description:
        "Гэр бүл, амьтан, хоолны нэр, богино өгүүлбэр, сэтгэл хөдлөлөө " +
        "илэрхийлж сурах.",
      descriptionEn:
        "Family, animals and food words, short sentences and naming your " +
        "feelings.",
      icon: "users",
      color: "emerald",
      units: language(),
    },
    {
      slug: "kids-world",
      title: "Дэлхийг Танин Мэдэхүй",
      titleEn: "Discovering the World",
      description:
        "Гэр, цэцэрлэг, хот, байгаль, цаг агаар, бидний бие — эргэн тойрноо " +
        "танин мэдэх.",
      descriptionEn:
        "Home, kindergarten, town, nature, weather and our bodies — getting " +
        "to know the world around us.",
      icon: "globe",
      color: "teal",
      units: world(),
    },
  ];
}

// ---------------------------------------------------------------------------
// Санд бичих
// ---------------------------------------------------------------------------

async function main() {
  console.log("Дасгалуудыг үүсгэж шалгаж байна…");

  const specs = buildCourses();
  const unitCount = specs.reduce((sum, course) => sum + course.units.length, 0);
  const lessonList = specs.flatMap((course) => course.units.flatMap((unit) => unit.lessons));
  const exerciseCount = lessonList.reduce((sum, lesson) => sum + lesson.items.length, 0);

  console.log(
    `✓ ${specs.length} курс, ${unitCount} бүлэг, ${lessonList.length} хичээл, ` +
      `${exerciseCount} дасгал — бүгд тэнцлээ`
  );

  const pool = createDbPool(connectionString!, 1);
  const db = drizzle(pool);

  try {
    const [owner] = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.email, emailArg.trim().toLowerCase()))
      .limit(1);

    if (!owner) {
      console.error(`"${emailArg}" имэйлтэй хэрэглэгч олдсонгүй.`);
      process.exitCode = 1;
      return;
    }

    let added = 0;
    let replaced = 0;
    let moved = 0;
    let written = 0;

    for (const spec of specs) {
      const [course] = await db
        .select({ slug: courses.slug, status: courses.status })
        .from(courses)
        .where(eq(courses.slug, spec.slug))
        .limit(1);

      if (!course) {
        /*
         * ⚠ Хуучин курс байвал ШИНЭЭР үүсгэхгүй, НЭРИЙГ нь сольж ЗӨӨНӨ:
         * `units.course_slug` ба `lesson_progress.course_slug` хоёрыг
         * хамт шинэчилбэл хичээл, дасгал, сурагчийн явц бүрэн дагана.
         * Устгаад дахин үүсгэвэл явц тасарна.
         */
        const legacy = spec.legacySlug
          ? (
              await db
                .select({ slug: courses.slug })
                .from(courses)
                .where(eq(courses.slug, spec.legacySlug))
                .limit(1)
            )[0]
          : undefined;

        if (legacy) {
          /*
           * ⚠ `courses.slug`-ийг ШУУД СОЛИХ БОЛОМЖГҮЙ: `units.course_slug`
           * нь түүн рүү гадаад түлхүүрээр холбогдсон бөгөөд ON UPDATE
           * CASCADE байхгүй тул Postgres татгалзана (23503).
           *
           * Тиймээс ШИНЭ курсыг эхлээд үүсгээд, бүлэг, явц, идэвхтэй
           * курсыг нь тийш нь зөөж, дараа нь хуучныг устгана. Бүлэг,
           * хичээлийн ID хэвээр үлдэх тул сурагчийн явц бүрэн дагана.
           */
          await db.insert(courses).values({
            slug: spec.slug,
            title: spec.title,
            titleEn: spec.titleEn,
            description: spec.description,
            descriptionEn: spec.descriptionEn,
            icon: spec.icon,
            color: spec.color,
            school: SCHOOL,
            schools: [SCHOOL],
            status: "active",
          });

          await db
            .update(units)
            .set({ courseSlug: spec.slug })
            .where(eq(units.courseSlug, legacy.slug));

          await db.execute(
            sql`UPDATE lesson_progress SET course_slug = ${spec.slug}
                WHERE course_slug = ${legacy.slug}`
          );

          /*
           * ⚠ Сурагчийн ИДЭВХТЭЙ курс ч хуучин slug руу заасаар байвал
           * «Курс олдсонгүй» болно — тэднийг ч дагуулна.
           */
          await db.execute(
            sql`UPDATE users SET active_course_slug = ${spec.slug}
                WHERE active_course_slug = ${legacy.slug}`
          );

          await db.delete(courses).where(eq(courses.slug, legacy.slug));

          console.log(`  → «${legacy.slug}» → «${spec.slug}» болж зөөгдлөө`);
          moved += 1;
        } else {
          await db.insert(courses).values({
            slug: spec.slug,
            title: spec.title,
            titleEn: spec.titleEn,
            description: spec.description,
            descriptionEn: spec.descriptionEn,
            icon: spec.icon,
            color: spec.color,
            school: SCHOOL,
            schools: [SCHOOL],
            status: "active",
          });
          console.log(`  «${spec.title}» курс үүслээ.`);
        }
      } else if (course.status !== "active") {
        await db
          .update(courses)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(courses.slug, spec.slug));
      }

      for (const [unitIndex, unitSpec] of spec.units.entries()) {
        const unitId = await ensureUnit(db, spec, unitSpec, unitIndex, owner.uid);

        /*
         * ХУУЧИН ХИЧЭЭЛҮҮДИЙГ ЦЭВЭРЛЭНЭ.
         *
         * ⚠ Зөөсөн курсын «Level 1» бүлэг нь ӨМНӨХ нэртэй хичээлүүдээ
         * авчирдаг («1–3 хүртэл тоол» г.м). Тэднийг үлдээвэл бүлэг дөрөв
         * биш НАЙМАН хичээлтэй болж, хагас нь давхардсан хуучин агуулга
         * болно. Шинэ жагсаалтад БАЙХГҮЙ хичээлийг устгана.
         *
         * ⚠ Дасгал, явцыг нь ЭХЛЭЭД устгана: `lesson_progress` нь
         * хичээлийн ID-аар холбогддог тул үлдвэл орфан мөр болно.
         */
        const titles = unitSpec.lessons.map((lesson) => lesson.title);
        const stale = await db
          .select({ id: lessons.id, title: lessons.title })
          .from(lessons)
          .where(and(eq(lessons.unitId, unitId), notInArray(lessons.title, titles)));

        if (stale.length > 0) {
          const ids = stale.map((row) => row.id);
          await db.delete(exercises).where(inArray(exercises.lessonId, ids));
          await db.delete(lessonProgress).where(inArray(lessonProgress.lessonId, ids));
          await db.delete(lessons).where(inArray(lessons.id, ids));
          console.log(
            `  − «${unitSpec.title}»-с хуучин ${stale.length} хичээл устлаа ` +
              `(${stale.map((row) => row.title).join(", ")})`
          );
        }

        const existingLessons = await db
          .select({ id: lessons.id, title: lessons.title, sortOrder: lessons.sortOrder })
          .from(lessons)
          .where(eq(lessons.unitId, unitId));
        const byTitle = new Map(existingLessons.map((row) => [row.title, row]));
        let order = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

        for (const lesson of unitSpec.lessons) {
          const found = byTitle.get(lesson.title);
          if (found && !force) continue;

          let lessonId: string;

          if (found) {
            lessonId = found.id;
            // ⚠ Хичээлийг ХАДГАЛНА (явц нь хичээлийн түвшинд) — дасгалыг сольно.
            await db.update(lessons).set({ xpReward: lesson.xp }).where(eq(lessons.id, lessonId));
            await db.delete(exercises).where(eq(exercises.lessonId, lessonId));
            replaced += 1;
          } else {
            lessonId = crypto.randomUUID();
            await db.insert(lessons).values({
              id: lessonId,
              unitId,
              title: lesson.title,
              xpReward: lesson.xp,
              sortOrder: order++,
              createdBy: owner.uid,
            });
            added += 1;
          }

          for (const [index, item] of lesson.items.entries()) {
            await db.insert(exercises).values({
              lessonId,
              type: item.type,
              prompt: item.prompt,
              options: item.options,
              correctOptionId: item.correctId,
              grid: item.grid,
              explanation: lesson.explanation,
              sortOrder: index,
              createdBy: owner.uid,
            });
            written += 1;
          }
        }
      }
    }

    const parts: string[] = [];
    if (moved > 0) parts.push(`${moved} курс зөөгдлөө`);
    if (added > 0) parts.push(`${added} хичээл нэмэгдлээ`);
    if (replaced > 0) parts.push(`${replaced} хичээл шинэчлэгдлээ`);

    console.log(
      parts.length === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
            "Шинэчлэх бол: npm run seed:kids46 -- <email> --force"
        : `✅ Kids 4-6 — ${parts.join(", ")}. Нийт ${written} дасгал бичигдлээ.`
    );
  } finally {
    await pool.end();
  }
}

/**
 * Бүлгийг олох, эсвэл үүсгэх.
 *
 * ⚠ Зөөсөн курсын ГАНЦ «Level 1» бүлгийг эхний шинэ бүлэг болгож
 * НЭРЛЭНЭ: түүний доторх хичээлүүд дээр явц бий бөгөөд шинэ бүлэг
 * үүсгээд хуучныг нь хоосон үлдээвэл сурагч хийсэн ажлаа замын гадна
 * харна.
 */
async function ensureUnit(
  db: ReturnType<typeof drizzle>,
  spec: CourseSpec,
  unitSpec: UnitSpec,
  unitIndex: number,
  ownerUid: string
): Promise<string> {
  const [existing] = await db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.courseSlug, spec.slug), eq(units.title, unitSpec.title)))
    .limit(1);

  if (existing) return existing.id;

  if (unitIndex === 0) {
    const [legacyUnit] = await db
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.courseSlug, spec.slug), eq(units.title, "Level 1")))
      .limit(1);

    if (legacyUnit) {
      await db
        .update(units)
        .set({ title: unitSpec.title, color: spec.color, sortOrder: 0 })
        .where(eq(units.id, legacyUnit.id));
      console.log(`  → «Level 1» бүлэг «${unitSpec.title}» болов`);
      return legacyUnit.id;
    }
  }

  const [created] = await db
    .insert(units)
    .values({
      courseSlug: spec.slug,
      title: unitSpec.title,
      color: spec.color,
      sortOrder: unitIndex,
      createdBy: ownerUid,
    })
    .returning({ id: units.id });

  return created.id;
}

void main();
