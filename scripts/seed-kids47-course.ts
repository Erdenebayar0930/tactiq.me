/**
 * «Kids 4-7» курс — Mind сургуульд ГУРВАН сэдэв, тус бүр Level 1.
 *
 * Ажиллуулах:
 *   npm run seed:kids47 -- <багшийн-эсвэл-админы-имэйл> [--force]
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
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import {
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

const COURSE_SLUG = "kids-4-7";
/** Хичээл тутмын дасгалын тоо. */
const PER_LESSON = 5;

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
type UnitSpec = { title: string; color: string; lessons: LessonSpec[] };

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

function buildUnits(): UnitSpec[] {
  const rng = makeRng(20260916);

  // --- Сэтгэхүй ------------------------------------------------------------
  const bigSmall: Built[] = Array.from({ length: PER_LESSON }, () => {
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
  });

  const findSame: Built[] = Array.from({ length: PER_LESSON }, () => {
    const target = token(rng);
    const options = [target];
    while (options.length < 4) {
      const other = token(rng);
      if (other !== target && !options.includes(other)) options.push(other);
    }
    options.sort(() => rng() - 0.5);
    return kidsItem({ mode: "same", target, options }, "Дээрхтэй ИЖИЛ дүрсийг ол.");
  });

  const findOdd: Built[] = Array.from({ length: PER_LESSON }, (_, i) => {
    let common = token(rng);
    let odd = token(rng);
    while (odd === common) odd = token(rng);
    const length = 4;
    const at = Math.floor(rng() * length);
    const items = Array.from({ length }, (_, index) => (index === at ? odd : common));
    return seriesItem({ mode: "odd", items, index: at }, "Бусдаас ӨӨР нь аль нь вэ?");
  });

  const continueSeq: Built[] = Array.from({ length: PER_LESSON }, (_, i) => {
    const period = i < 3 ? 2 : 3;
    const pool: string[] = [];
    while (pool.length < period) {
      const next = token(rng);
      if (!pool.includes(next)) pool.push(next);
    }
    const items = Array.from({ length: 6 }, (_, index) => pool[index % period]);
    return seriesItem({ mode: "shape", items, index: items.length - 1 }, "Дараа нь юу ирэх вэ?");
  });

  // --- Тоолол --------------------------------------------------------------
  const countTo3: Built[] = Array.from({ length: PER_LESSON }, () => {
    const count = 1 + Math.floor(rng() * 3);
    const shape = token(rng);
    return kidsItem(
      { mode: "count", shapes: Array.from({ length: count }, () => shape) },
      "Хэдэн ширхэг байна вэ?"
    );
  });

  const countTo5: Built[] = Array.from({ length: PER_LESSON }, () => {
    const count = 1 + Math.floor(rng() * 5);
    const shape = token(rng);
    return kidsItem(
      { mode: "count", shapes: Array.from({ length: count }, () => shape) },
      "Хэдэн ширхэг байна вэ?"
    );
  });

  /*
   * «Тоог зурагтай холбо» — тоолох горимын ӨӨР ХЭЛБЭР: энд дүрсүүд нь
   * ХОЛИМОГ тул хүүхэд «ижил зүйлийг» биш, БҮГДИЙГ тоолж сурна.
   */
  const matchNumber: Built[] = Array.from({ length: PER_LESSON }, () => {
    const count = 2 + Math.floor(rng() * 4);
    return kidsItem(
      { mode: "count", shapes: Array.from({ length: count }, () => token(rng)) },
      "Зурагт хэдэн зүйл байна — тоог нь дар."
    );
  });

  const orderNumbers: Built[] = Array.from({ length: PER_LESSON }, (_, i) => {
    const size = i < 2 ? 3 : 4;
    const start = 1 + Math.floor(rng() * 3);
    const numbers = Array.from({ length: size }, (_, index) => start + index);

    // Холино — эрэмбэлэгдсэн хэвээр үлдвэл дасгал биш (`decodeKids` татгалзана).
    let shuffled = [...numbers];
    while (shuffled.every((value, index) => index === 0 || shuffled[index - 1] <= value)) {
      shuffled = [...numbers].sort(() => rng() - 0.5);
    }

    return kidsItem({ mode: "order", numbers: shuffled }, "Тоонуудыг ЖИЖИГЭЭС ТОМ руу дар.");
  });

  // --- Анхны Код -----------------------------------------------------------
  /** Нэг чиглэлд л явах энгийн даалгавар — эхний дөрвөн хичээлд. */
  const oneWay = (arrow: Arrow, label: string): Built[] =>
    Array.from({ length: PER_LESSON }, (_, i) => {
      const steps = 1 + (i % 3);
      const span = steps + 1;

      // Хөлгийг чиглэлийн дагуу нарийн (1 өргөн/өндөр) байлгана — андуурах зам үгүй.
      if (arrow === "U" || arrow === "D") {
        const rows = span;
        const start = arrow === "D" ? 0 : rows - 1;
        const goal = arrow === "D" ? rows - 1 : 0;
        return arrowsItem(openMaze(1, rows, start, goal), `${label} — тугтай нүд рүү хүр.`);
      }

      const cols = span;
      const start = arrow === "R" ? 0 : cols - 1;
      const goal = arrow === "R" ? cols - 1 : 0;
      return arrowsItem(openMaze(cols, 1, start, goal), `${label} — тугтай нүд рүү хүр.`);
    });

  const twoForward: Built[] = Array.from({ length: PER_LESSON }, (_, i) => {
    // Яг ХОЁР алхам — «2 алхам урагш» гэдгийг бататгана.
    const horizontal = i % 2 === 0;
    return arrowsItem(
      horizontal ? openMaze(3, 1, 0, 2) : openMaze(1, 3, 0, 2),
      "Яг 2 алхам урагшил."
    );
  });

  const reachGoal: Built[] = Array.from({ length: PER_LESSON }, (_, i) => {
    const size = i < 3 ? 3 : 4;
    const maze = openMaze(size, size, 0, size * size - 1);

    // Хэдэн хана нэмнэ — зам үлдэх эсэхийг `arrowsItem` шалгана.
    if (i >= 2) {
      const middle = Math.floor(size / 2) * size + Math.floor(size / 2);
      if (middle !== maze.start && middle !== maze.goal) maze.walls[middle] = true;
    }

    return arrowsItem(maze, "Зорилгод хүрэх замаа зохио.");
  });

  return [
    {
      title: "Сэтгэхүй · Level 1",
      color: "sky",
      lessons: [
        { title: "Том ба жижиг", xp: 8, explanation: "Хоёр дүрсийг зэрэгцүүлж хар — аль нь илүү их зай эзэлж байна вэ?", items: bigSmall },
        { title: "Ижил зүйлийг ол", xp: 8, explanation: "Эхлээд ХЭЛБЭРИЙГ нь, дараа нь ӨНГИЙГ нь харьцуул.", items: findSame },
        { title: "Илүүг нь ол", xp: 10, explanation: "Юу нь давтагдаж байна вэ? Давтагдаагүй нь илүүц.", items: findOdd },
        { title: "Дарааллыг үргэлжлүүл", xp: 10, explanation: "Хэдэн дүрс дараад давтагдаж эхэлж байна вэ — түүнийг ол.", items: continueSeq },
      ],
    },
    {
      title: "Тоолол · Level 1",
      color: "amber",
      lessons: [
        { title: "1–3 хүртэл тоол", xp: 8, explanation: "Дүрс бүрийг хуруугаараа зааж тоол — алгасахгүй.", items: countTo3 },
        { title: "1–5 хүртэл тоол", xp: 8, explanation: "Зүүнээс баруун тийш дараалан тоол.", items: countTo5 },
        { title: "Тоог зурагтай холбо", xp: 10, explanation: "Дүрс нь өөр өөр ч БҮГДИЙГ нь тоолно.", items: matchNumber },
        { title: "Тоонуудыг зөв дараалалд оруул", xp: 10, explanation: "Хамгийн жижиг тооноос эхэл.", items: orderNumbers },
      ],
    },
    {
      title: "Анхны Код · Level 1",
      color: "emerald",
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

  const unitSpecs = buildUnits();
  const lessonCount = unitSpecs.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const exerciseCount = unitSpecs.reduce(
    (sum, unit) => sum + unit.lessons.reduce((n, lesson) => n + lesson.items.length, 0),
    0
  );
  console.log(
    `✓ ${unitSpecs.length} сэдэв, ${lessonCount} хичээл, ${exerciseCount} дасгал — бүгд тэнцлээ`
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

    const [course] = await db
      .select({ slug: courses.slug, status: courses.status })
      .from(courses)
      .where(eq(courses.slug, COURSE_SLUG))
      .limit(1);

    if (!course) {
      await db.insert(courses).values({
        slug: COURSE_SLUG,
        title: "Kids 4-7",
        titleEn: "Kids 4-7",
        description:
          "Сэтгэхүй, тоолол, анхны код — 4-7 насны хүүхдэд. Дасгал бүр " +
          "зургаараа ойлгогддог тул уншиж мэдэхгүй ч бие даан хийнэ.",
        descriptionEn:
          "Thinking, counting and first coding for ages 4-7. Every task is " +
          "understood from the picture alone — no reading needed.",
        icon: "shapes",
        color: "sky",
        // `lib/tactiq/schools.ts` → "mind" сургууль.
        school: "mind",
        schools: ["mind"],
        status: "active",
      });
      console.log('"Kids 4-7" курс үүслээ.');
    } else if (course.status !== "active") {
      await db
        .update(courses)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(courses.slug, COURSE_SLUG));
    }

    let added = 0;
    let replaced = 0;
    let written = 0;

    for (const [unitIndex, spec] of unitSpecs.entries()) {
      const [existingUnit] = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, spec.title)))
        .limit(1);

      let unitId: string;
      if (existingUnit) {
        unitId = existingUnit.id;
      } else {
        const [created] = await db
          .insert(units)
          .values({
            courseSlug: COURSE_SLUG,
            title: spec.title,
            color: spec.color,
            sortOrder: unitIndex,
            createdBy: owner.uid,
          })
          .returning({ id: units.id });
        unitId = created.id;
      }

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

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} хичээл нэмэгдлээ`);
    if (replaced > 0) parts.push(`${replaced} хичээл шинэчлэгдлээ`);

    console.log(
      parts.length === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
            "Шинэчлэх бол: npm run seed:kids47 -- <email> --force"
        : `✅ "Kids 4-7" — ${parts.join(", ")}. Нийт ${written} дасгал бичигдлээ.\n` +
            `Засах: /admin/courses/${COURSE_SLUG}`
    );
  } finally {
    await pool.end();
  }
}

void main();
