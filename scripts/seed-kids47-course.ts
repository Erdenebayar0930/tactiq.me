/**
 * Бага насны (4-7) ГУРВАН КУРС — «Kids 4-6» сургуульд.
 *
 * ⚠ СЭДЭВ БҮР НЬ ТУСДАА КУРС: Сэтгэхүй, Тоолол, Анхны Код гурав нь
 * сургуулийн цэсэнд зэрэгцэж харагдана. Курс бүрийн доторх нэгж нь
 * «Level 1» — Level 2, 3-ыг хожим нэгж болгож нэмнэ.
 *
 * Ажиллуулах:
 *   npm run seed:kids47 -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * ⚠ ХУУЧИН нэгдсэн «kids-4-7» курсээс ЗӨӨНӨ (устгаад дахин үүсгэхгүй):
 * тэр курс дээр сурагчийн явц бий бөгөөд `lesson_progress` нь хичээлийн
 * ID-аар холбогддог. Нэгжийг нь шинэ курс руу шилжүүлбэл хичээл, дасгал,
 * явц бүгд бүрэн хэвээр үлдэнэ.
 *
 * СЭДВҮҮД ба хичээлүүд:
 *
 *   Сэтгэхүй → Level 1
 *     Том ба жижиг · Ижил зүйлийг ол · Илүүг нь ол · Дарааллыг үргэлжлүүл
 *   Тоолол → Level 1
 *     1-3 хүртэл тоол · 1-5 хүртэл тоол · Тоог зурагтай холбо ·
 *     Тоонуудыг зөв дараалалд оруул
 *   Анхны Код → Level 1
 *     Дээш · Доош · Баруун · Зүүн · 2 алхам урагш · Зорилгод хүр
 *
 * ⚠ ХИЧЭЭЛ БҮР ОЛОН ДАСГАЛТАЙ. Энэ насанд нэг дасгал хэдхэн секунд үргэлжилдэг
 * тул нэг дасгалтай хичээл нь «нээгээд шууд хаагдлаа» гэсэн мэдрэмж
 * төрүүлнэ. Тиймээс хичээл бүр 5 дасгалтай — том курсуудын «нэг хичээл =
 * нэг дасгал» дүрмээс ЗОРИУД өөр.
 *
 * ⚠ УНШИХ ШААРДЛАГАГҮЙ: 4-7 насны хүүхэд бичиг уншдаггүй тул даалгавар нь
 * зургаараа ойлгогдоно. Дасгалын бичвэр нь зөвхөн хажууд сууж буй том
 * хүнд зориулагдсан.
 *
 * ⚠ ДАСГАЛ БҮР санд бичигдэхээс ӨМНӨ эргэж уншигдаж байгааг батална.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import {
  ARROWS_MAX,
  decodeArrows,
  encodeArrows,
  shortestSteps,
  type Arrow,
  type ArrowMaze,
} from "../src/lib/puzzles/arrows";
import { decodeKids, encodeKids, type Kids } from "../src/lib/puzzles/kids";
import { decodeSeries, encodeSeries, type Series } from "../src/lib/puzzles/series";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [emailArg] = args.filter((arg) => !arg.startsWith("--"));

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:kids47 -- <email> [--force]");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

/** Хуучин нэгдсэн курс — зөөсний дараа устгана. */
const LEGACY_SLUG = "kids-4-7";
/** Хичээл тутмын дасгалын тоо. */
const PER_LESSON = 10;

/**
 * ӨВӨРМӨЦ дасгалуудыг цуглуулна.
 *
 * ⚠ Үүсгэгчдийн боломж ХЯЗГААРТАЙ: «1-3 хүртэл тоол» гэхэд гурван л хариу
 * байна, «2 алхам урагш» нь бүр цөөн. Энгийн `Array.from` нь ижил
 * дасгалыг чимээгүйхэн давтдаг байсан (сумны хичээлүүдэд 5 дасгалаас
 * зөвхөн 2 нь өвөрмөц байв). Энэ туслах нь `grid` давхардвал дахин
 * үүсгэж, хүрэлцэхгүй бол ЧАНГА уначихна — дутууг нь чимээгүй өнгөрөөх
 * нь сурагч дээр л илэрнэ.
 */
function uniqueItems(count: number, make: (attempt: number) => Built, label: string): Built[] {
  const byGrid = new Map<string, Built>();

  for (let attempt = 0; byGrid.size < count && attempt < count * 40; attempt += 1) {
    const item = make(attempt);
    if (!byGrid.has(item.grid)) byGrid.set(item.grid, item);
  }

  if (byGrid.size < count) {
    throw new Error(`«${label}» — ${count} өвөрмөц дасгал гарсангүй (${byGrid.size}).`);
  }

  return [...byGrid.values()];
}
/** Курс бүрийн доторх нэгжийн нэр. */
const LEVEL_UNIT = "Level 1";

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const SHAPES = ["c", "s", "t", "d", "p"];
const COLORS = ["r", "b", "g", "y", "v"];

function token(rng: () => number): string {
  return SHAPES[Math.floor(rng() * SHAPES.length)] + COLORS[Math.floor(rng() * COLORS.length)];
}

type Built = { type: string; grid: string; prompt: string };
type LessonSpec = { title: string; xp: number; explanation: string; items: Built[] };
type CourseSpec = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  color: string;
  /** Хуучин нэгдсэн курс дэх нэгжийн нэр — зөөхөд хэрэглэнэ. */
  legacyUnit: string;
  lessons: LessonSpec[];
};

function kidsItem(kids: Kids, prompt: string): Built {
  const grid = encodeKids(kids);
  if (!decodeKids(grid)) throw new Error(`Дасгал уншигдсангүй: ${grid}`);
  return { type: "kids", grid, prompt };
}

function seriesItem(series: Series, prompt: string): Built {
  const grid = encodeSeries(series);
  if (!decodeSeries(grid)) throw new Error(`Дасгал уншигдсангүй: ${grid}`);
  return { type: "series", grid, prompt };
}

function arrowsItem(maze: ArrowMaze, prompt: string): Built {
  const grid = encodeArrows(maze);
  const back = decodeArrows(grid);
  if (!back) throw new Error(`Зам уншигдсангүй: ${grid}`);
  // ⚠ Зорилгод хүрэх зам ҮНЭХЭЭР байгаа эсэхийг батална.
  if (shortestSteps(back) === null) throw new Error(`Зорилгод хүрэх зам алга: ${grid}`);
  return { type: "arrows", grid, prompt };
}

/** Нээлттэй (ханагүй) хөлөг. */
function openMaze(cols: number, rows: number, start: number, goal: number): ArrowMaze {
  return { cols, rows, start, goal, walls: Array(cols * rows).fill(false) };
}

function buildCourses(): CourseSpec[] {
  const rng = makeRng(20260916);

  // --- Сэтгэхүй ------------------------------------------------------------
  const bigSmall = uniqueItems(PER_LESSON, () => {
    const shape = token(rng);
    /*
     * ⚠ Хэмжээнүүд нь ДАВТАГДАХГҮЙ: хоёр дүрс ижил том байвал «хамгийн
     * том» нь хоёр хариутай болно.
     */
    const sizes = [1, 2, 3].sort(() => rng() - 0.5).slice(0, 2 + Math.floor(rng() * 2));
    return kidsItem(
      { mode: "size", shapes: sizes.map(() => shape), sizes },
      "Хамгийн ТОМ нь аль нь вэ?"
    );
  }, "Том ба жижиг");

  const findSame = uniqueItems(PER_LESSON, () => {
    const target = token(rng);
    const options = [target];
    while (options.length < 4) {
      const other = token(rng);
      if (other !== target && !options.includes(other)) options.push(other);
    }
    options.sort(() => rng() - 0.5);
    return kidsItem({ mode: "same", target, options }, "Дээрхтэй ИЖИЛ дүрсийг ол.");
  }, "Ижил зүйлийг ол");

  const findOdd = uniqueItems(PER_LESSON, () => {
    let common = token(rng);
    let odd = token(rng);
    while (odd === common) odd = token(rng);
    const length = 4;
    const at = Math.floor(rng() * length);
    const items = Array.from({ length }, (_, index) => (index === at ? odd : common));
    return seriesItem({ mode: "odd", items, index: at }, "Бусдаас ӨӨР нь аль нь вэ?");
  }, "Илүүг нь ол");

  const continueSeq = uniqueItems(PER_LESSON, (i) => {
    const period = i % 3 === 2 ? 3 : 2;
    const pool: string[] = [];
    while (pool.length < period) {
      const next = token(rng);
      if (!pool.includes(next)) pool.push(next);
    }
    const items = Array.from({ length: 6 }, (_, index) => pool[index % period]);
    return seriesItem({ mode: "shape", items, index: items.length - 1 }, "Дараа нь юу ирэх вэ?");
  }, "Дарааллыг үргэлжлүүл");

  // --- Тоолол --------------------------------------------------------------
  const countTo3 = uniqueItems(PER_LESSON, () => {
    const count = 1 + Math.floor(rng() * 3);
    const shape = token(rng);
    return kidsItem(
      { mode: "count", shapes: Array.from({ length: count }, () => shape) },
      "Хэдэн ширхэг байна вэ?"
    );
  }, "1–3 хүртэл тоол");

  const countTo5 = uniqueItems(PER_LESSON, () => {
    const count = 1 + Math.floor(rng() * 5);
    const shape = token(rng);
    return kidsItem(
      { mode: "count", shapes: Array.from({ length: count }, () => shape) },
      "Хэдэн ширхэг байна вэ?"
    );
  }, "1–5 хүртэл тоол");

  /*
   * «Тоог зурагтай холбо» — тоолох горимын ӨӨР ХЭЛБЭР: энд дүрсүүд нь
   * ХОЛИМОГ тул хүүхэд «ижил зүйлийг» биш, БҮГДИЙГ тоолж сурна.
   */
  const matchNumber = uniqueItems(PER_LESSON, () => {
    const count = 2 + Math.floor(rng() * 4);
    return kidsItem(
      { mode: "count", shapes: Array.from({ length: count }, () => token(rng)) },
      "Зурагт хэдэн зүйл байна — тоог нь дар."
    );
  }, "Тоог зурагтай холбо");

  const orderNumbers = uniqueItems(PER_LESSON, (i) => {
    const size = i % 2 === 0 ? 3 : 4;
    const start = 1 + Math.floor(rng() * 5);
    const numbers = Array.from({ length: size }, (_, index) => start + index);

    // Холино — эрэмбэлэгдсэн хэвээр үлдвэл дасгал биш (`decodeKids` татгалзана).
    let shuffled = [...numbers];
    while (shuffled.every((value, index) => index === 0 || shuffled[index - 1] <= value)) {
      shuffled = [...numbers].sort(() => rng() - 0.5);
    }

    return kidsItem({ mode: "order", numbers: shuffled }, "Тоонуудыг ЖИЖИГЭЭС ТОМ руу дар.");
  }, "Тоонуудыг зөв дараалалд оруул");

  // --- Анхны Код -----------------------------------------------------------
  /**
   * Нэг чиглэлд л явах даалгавар.
   *
   * ⚠ Хөлөг нь НАРИЙН (1 өргөн/өндөр): андуурах зам байхгүй тул сумны
   * утга нь өөрөө ойлгогдоно.
   *
   * ⚠ ОЛОН ЯНЗ БАЙДАЛ: коридорын урт БА эхлэлийн байрлал хоёуланг
   * хувиргана. Зөвхөн уртыг хувиргавал (анхны хувилбар) 5 дасгалаас
   * гуравхан нь өвөрмөц болж байв.
   */
  const oneWay = (arrow: Arrow, label: string): Built[] => {
    /*
     * ⚠ БҮХ ХОСЛОЛЫГ ИЛ ТООЧНО. Урт, алхмыг `attempt % n` гэж тооцвол
     * мөчлөгүүд давхцаж, боломжтой хувилбарын зөвхөн хэсэгт л хүрдэг —
     * анхны хувилбар яг тэрнээс болж 5-аас гуравхан өвөрмөц гаргаж байв.
     * ⚠ Урт нь `ARROWS_MAX` (5)-аас хэтрэхгүй.
     */
    const combos: { span: number; steps: number }[] = [];
    for (let span = 2; span <= ARROWS_MAX; span += 1) {
      for (let steps = 1; steps < span; steps += 1) combos.push({ span, steps });
    }

    return uniqueItems(
      PER_LESSON,
      (attempt) => {
        const { span, steps } = combos[attempt % combos.length];
        const vertical = arrow === "U" || arrow === "D";
        const forwardish = arrow === "D" || arrow === "R";

        // Эхлэлийг чиглэлийн эсрэг захад тавиад, зорилгыг `steps` алхмын зайд.
        const start = forwardish ? 0 : span - 1;
        const goal = forwardish ? start + steps : start - steps;

        return arrowsItem(
          vertical ? openMaze(1, span, start, goal) : openMaze(span, 1, start, goal),
          `${label} — тугтай нүд рүү хүр.`
        );
      },
      label
    );
  };

  /**
   * Яг ХОЁР алхам — чиглэл × коридорын урт × эхлэлийн тал.
   *
   * ⚠ Хоёр алхам багтахын тулд урт нь дор хаяж 3.
   */
  const twoStep: { vertical: boolean; span: number; fromStart: boolean }[] = [];
  for (let span = 3; span <= ARROWS_MAX; span += 1) {
    for (const vertical of [false, true]) {
      for (const fromStart of [true, false]) twoStep.push({ vertical, span, fromStart });
    }
  }

  const twoForward = uniqueItems(
    PER_LESSON,
    (attempt) => {
      const { vertical, span, fromStart } = twoStep[attempt % twoStep.length];
      const start = fromStart ? 0 : span - 1;
      const goal = fromStart ? 2 : span - 3;

      return arrowsItem(
        vertical ? openMaze(1, span, start, goal) : openMaze(span, 1, start, goal),
        "Яг 2 алхам урагшил."
      );
    },
    "2 алхам урагш"
  );

  /** Зорилгод хүр — хөлгийн хэмжээ, зорилгын булан, ханын байрлал хувирна. */
  /** Зорилгод хүр — хэмжээ × эхлэл/зорилгын булан × ханын байрлал. */
  const goalCombos: { size: number; from: number; to: number; wall: number }[] = [];
  for (const size of [3, 4]) {
    const corners = [0, size - 1, size * (size - 1), size * size - 1];
    for (let from = 0; from < corners.length; from += 1) {
      for (let to = 0; to < corners.length; to += 1) {
        if (from === to) continue;
        goalCombos.push({ size, from: corners[from], to: corners[to], wall: -1 });
      }
    }
  }

  const reachGoal = uniqueItems(
    PER_LESSON,
    (attempt) => {
      const combo = goalCombos[attempt % goalCombos.length];
      const maze = openMaze(combo.size, combo.size, combo.from, combo.to);

      /*
       * Хагасаас нь эхлэн хана нэмнэ — эхний хэдэн дасгал нээлттэй хөлөг
       * дээр байж, хүүхэд сумаа эхлээд тайван сурна.
       * ⚠ Зам үлдсэн эсэхийг `arrowsItem` (`shortestSteps`) шалгана.
       */
      if (attempt >= Math.floor(PER_LESSON / 2)) {
        const wall = (attempt * 5 + 4) % (combo.size * combo.size);
        if (wall !== maze.start && wall !== maze.goal) maze.walls[wall] = true;
      }

      return arrowsItem(maze, "Зорилгод хүрэх замаа зохио.");
    },
    "Зорилгод хүр"
  );

  return [
    {
      slug: "kids-thinking",
      title: "Сэтгэхүй",
      titleEn: "Thinking",
      description:
        "Том ба жижиг, ижил, илүүц, дараалал — 4-7 насны хүүхдийн анхны " +
        "логик. Дасгал бүр зургаараа ойлгогдоно.",
      descriptionEn:
        "Big and small, same and different, patterns — first logic for ages 4-7. " +
        "Every task is understood from the picture alone.",
      icon: "brain",
      color: "sky",
      legacyUnit: "Сэтгэхүй · Level 1",
      lessons: [
        { title: "Том ба жижиг", xp: 8, explanation: "Хоёр дүрсийг зэрэгцүүлж хар — аль нь илүү их зай эзэлж байна вэ?", items: bigSmall },
        { title: "Ижил зүйлийг ол", xp: 8, explanation: "Эхлээд ХЭЛБЭРИЙГ нь, дараа нь ӨНГИЙГ нь харьцуул.", items: findSame },
        { title: "Илүүг нь ол", xp: 10, explanation: "Юу нь давтагдаж байна вэ? Давтагдаагүй нь илүүц.", items: findOdd },
        { title: "Дарааллыг үргэлжлүүл", xp: 10, explanation: "Хэдэн дүрс дараад давтагдаж эхэлж байна вэ — түүнийг ол.", items: continueSeq },
      ],
    },
    {
      slug: "kids-counting",
      title: "Тоолол",
      titleEn: "Counting",
      description:
        "1-ээс 5 хүртэл тоолох, тоог зурагтай холбох, дараалалд оруулах — " +
        "тооны анхны ойлголт.",
      descriptionEn:
        "Counting to five, matching numbers to pictures and putting them in " +
        "order — the first sense of number.",
      icon: "calculator",
      color: "amber",
      legacyUnit: "Тоолол · Level 1",
      lessons: [
        { title: "1–3 хүртэл тоол", xp: 8, explanation: "Дүрс бүрийг хуруугаараа зааж тоол — алгасахгүй.", items: countTo3 },
        { title: "1–5 хүртэл тоол", xp: 8, explanation: "Зүүнээс баруун тийш дараалан тоол.", items: countTo5 },
        { title: "Тоог зурагтай холбо", xp: 10, explanation: "Дүрс нь өөр өөр ч БҮГДИЙГ нь тоолно.", items: matchNumber },
        { title: "Тоонуудыг зөв дараалалд оруул", xp: 10, explanation: "Хамгийн жижиг тооноос эхэл.", items: orderNumbers },
      ],
    },
    {
      slug: "kids-code",
      title: "Анхны Код",
      titleEn: "First Code",
      description:
        "Сумаар зам зохиож дүрээ зорилгод хүргэнэ. Эхлээд төлөвлөгөө, " +
        "дараа нь ажиллуулах — программ гэж юу болохын анхны алхам.",
      descriptionEn:
        "Build a path with arrows and run it. Plan first, then execute — " +
        "the first step towards what a program is.",
      icon: "blocks",
      color: "emerald",
      legacyUnit: "Анхны Код · Level 1",
      lessons: [
        { title: "Дээш", xp: 8, explanation: "Дээш сум нь дүрийг НЭГ нүд дээш аваачна.", items: oneWay("U", "Дээш") },
        { title: "Доош", xp: 8, explanation: "Доош сум нь дүрийг НЭГ нүд доош аваачна.", items: oneWay("D", "Доош") },
        { title: "Баруун", xp: 8, explanation: "Баруун сум нь дүрийг НЭГ нүд баруун тийш аваачна.", items: oneWay("R", "Баруун") },
        { title: "Зүүн", xp: 8, explanation: "Зүүн сум нь дүрийг НЭГ нүд зүүн тийш аваачна.", items: oneWay("L", "Зүүн") },
        { title: "2 алхам урагш", xp: 10, explanation: "Хоёр нүд явахын тулд сумыг ХОЁР удаа дарна.", items: twoForward },
        { title: "Зорилгод хүр", xp: 12, explanation: "Эхлээд замаа нүдээрээ дага, дараа нь сумаа дарж бич.", items: reachGoal },
      ],
    },
  ];
}

async function main() {
  console.log("Дасгалуудыг үүсгэж шалгаж байна…");

  const specs = buildCourses();
  const lessonCount = specs.reduce((sum, course) => sum + course.lessons.length, 0);
  const exerciseCount = specs.reduce(
    (sum, course) => sum + course.lessons.reduce((n, lesson) => n + lesson.items.length, 0),
    0
  );
  console.log(
    `✓ ${specs.length} курс, ${lessonCount} хичээл, ${exerciseCount} дасгал — бүгд тэнцлээ`
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
      // --- Курс --------------------------------------------------------------
      const [course] = await db
        .select({ slug: courses.slug, status: courses.status })
        .from(courses)
        .where(eq(courses.slug, spec.slug))
        .limit(1);

      if (!course) {
        await db.insert(courses).values({
          slug: spec.slug,
          title: spec.title,
          titleEn: spec.titleEn,
          description: spec.description,
          descriptionEn: spec.descriptionEn,
          icon: spec.icon,
          color: spec.color,
          /*
           * ⚠ «Kids 4-6» СУРГУУЛЬД (`lib/tactiq/schools.ts`). Сургуулийн
           * жагсаалтад «Kids 4-7» гэж байхгүй — хамгийн ойр нь энэ.
           */
          school: "kids-4-6",
          schools: ["kids-4-6"],
          status: "active",
        });
        console.log(`  «${spec.title}» курс үүслээ.`);
      } else if (course.status !== "active") {
        await db
          .update(courses)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(courses.slug, spec.slug));
      }

      // --- Нэгж: хуучин курсээс ЗӨӨХ, эсвэл шинээр -------------------------
      const unitId = await ensureUnit(db, spec, owner.uid, (count) => {
        moved += count;
      });

      // --- Хичээлүүд --------------------------------------------------------
      const existingLessons = await db
        .select({ id: lessons.id, title: lessons.title, sortOrder: lessons.sortOrder })
        .from(lessons)
        .where(eq(lessons.unitId, unitId));
      const byTitle = new Map(existingLessons.map((row) => [row.title, row]));
      let order = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

      for (const lesson of spec.lessons) {
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
            options: null,
            correctOptionId: null,
            grid: item.grid,
            explanation: lesson.explanation,
            sortOrder: index,
            createdBy: owner.uid,
          });
          written += 1;
        }
      }
    }

    // Хуучин нэгдсэн курс хоосон болсон бол устгана.
    const leftover = await db
      .select({ id: units.id })
      .from(units)
      .where(eq(units.courseSlug, LEGACY_SLUG));

    if (leftover.length === 0) {
      const removed = await db
        .delete(courses)
        .where(eq(courses.slug, LEGACY_SLUG))
        .returning({ slug: courses.slug });
      if (removed.length > 0) console.log(`  − хуучин «${LEGACY_SLUG}» курс устлаа`);
    }

    const parts: string[] = [];
    if (moved > 0) parts.push(`${moved} нэгж зөөгдлөө`);
    if (added > 0) parts.push(`${added} хичээл нэмэгдлээ`);
    if (replaced > 0) parts.push(`${replaced} хичээл шинэчлэгдлээ`);

    console.log(
      parts.length === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
            "Шинэчлэх бол: npm run seed:kids47 -- <email> --force"
        : `✅ Kids 4-7 — ${parts.join(", ")}. Нийт ${written} дасгал бичигдлээ.`
    );
  } finally {
    await pool.end();
  }
}

/**
 * Курсын «Level 1» нэгжийг олох, эсвэл ХУУЧИН нэгдсэн курсээс ЗӨӨХ.
 *
 * ⚠ ЗӨӨХ нь УСТГААД ДАХИН ҮҮСГЭХЭЭС ЗАРЧМЫН ХУВЬД ӨӨР: нэгжийн ID
 * хэвээр үлдэхэд доторх хичээл, дасгал, БҮХ ЯВЦ хамт дагана.
 * `lesson_progress` нь хичээлийн ID-аар холбогддог тул шинэ ID үүсгэвэл
 * сурагчийн хийсэн ажил тасарна.
 */
async function ensureUnit(
  db: ReturnType<typeof drizzle>,
  spec: CourseSpec,
  ownerUid: string,
  onMoved: (count: number) => void
): Promise<string> {
  const [existing] = await db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.courseSlug, spec.slug), eq(units.title, LEVEL_UNIT)))
    .limit(1);

  if (existing) return existing.id;

  // Хуучин нэгдсэн курсээс зөөх боломжтой юу?
  const [legacy] = await db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.courseSlug, LEGACY_SLUG), eq(units.title, spec.legacyUnit)))
    .limit(1);

  if (legacy) {
    await db
      .update(units)
      .set({ courseSlug: spec.slug, title: LEVEL_UNIT, color: spec.color, sortOrder: 0 })
      .where(eq(units.id, legacy.id));

    /*
     * ⚠ Явцын `course_slug`-ийг ч шинэчилнэ — эс бөгөөс явц нь хуучин
     * курс руу заасаар байж, шинэ курсын ахиц дутуу харагдана.
     */
    await db.execute(
      sql`UPDATE lesson_progress SET course_slug = ${spec.slug}
          WHERE lesson_id IN (SELECT id FROM lessons WHERE unit_id = ${legacy.id})`
    );

    console.log(`  → «${spec.legacyUnit}» нэгж «${spec.title}» курс руу зөөгдлөө`);
    onMoved(1);
    return legacy.id;
  }

  const [created] = await db
    .insert(units)
    .values({
      courseSlug: spec.slug,
      title: LEVEL_UNIT,
      color: spec.color,
      sortOrder: 0,
      createdBy: ownerUid,
    })
    .returning({ id: units.id });

  return created.id;
}

void main();
