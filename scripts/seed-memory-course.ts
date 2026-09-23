/**
 * «Санах ой» курс — Mind сургуульд ЗУРГААН СЭДЭВ, тус бүр дотроо дасгалтай.
 *
 * Ажиллуулах:
 *   npm run seed:memory -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * СЭДВҮҮД ба тэдгээрийн механик:
 *   1. Memory Cards    — хөзөр эргүүлж хос олох      (`memory-game`)
 *   2. Sequence Memory — асалтын ДАРААЛАЛ сэргээх    (`recall:sequence`)
 *   3. Pattern Memory  — асалтын ХЭВ МАЯГ сэргээх    (`recall:pattern`)
 *   4. Number Memory   — цифрийн мөр сэргээх         (`recall:digits`)
 *   5. Visual Memory   — том талбар дээрх хэв маяг   (`recall:pattern`)
 *   6. Match Pairs     — илүү олон хостой хөзөр      (`memory-game`)
 *
 * ⚠ Хичээл бүр ЯГ НЭГ дасгалтай (судоку, таягны курсийн адил). Замын
 * зураг (`lib/tactiq/path.ts`) нь ХИЧЭЭЛ тутамд нэг цэг зурдаг тул олон
 * дасгалтай цөөн хичээл нь замыг урт БИШ, харин ХООСОН болгодог.
 *
 * ⚠ Сэдэв тус бүр 9 хичээлтэй: `CHEST_EVERY` нь 3 тул шагналын хайрцаг
 * тэгш хуваагдаж, сэдэв бүрд 3 хайрцаг тэнцүү зайтай гарна.
 *
 * ⚠ Хичээл 3 ба 5 ИЖИЛ механиктай ч ЯЛГААТАЙ: «Pattern» нь 3×3 (хэв
 * маягийг ойлгох), «Visual» нь 4×4-6×6 (багтаамжийг сунгах). Тусдаа
 * механик зохиох нь илүүц байсан — ялгаа нь ЭНД, тохиргоонд л байна.
 *
 * ⚠ ДАСГАЛ БҮР санд бичигдэхээс ӨМНӨ эргэж уншигдаж, өөрийн хариугаараа
 * зөв гэж тооцогдож байгааг батална.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import { decodeMemory, encodeMemory } from "../src/lib/puzzles/memory";
import {
  decodeRecall,
  encodeRecall,
  isCorrect,
  makeCells,
  makeDigits,
  type Recall,
} from "../src/lib/puzzles/recall";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [emailArg] = args.filter((arg) => !arg.startsWith("--"));

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:memory -- <email> [--force]");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "memory";
/** Сэдэв бүрийн хичээлийн тоо — `CHEST_EVERY` (3)-д тэгш хуваагдана. */
const PER_UNIT = 9;

/** Тогтвортой үүсгэгч — дахин ажиллуулахад ИЖИЛ агуулга гарна (RNG биш). */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

type Exercise = { type: "memory-game" | "recall"; grid: string; prompt: string };
type Lesson = { title: string; xp: number; exercise: Exercise };
type Unit = { title: string; color: string; explanation: string; lessons: Lesson[] };

/**
 * Хөзрийн зүйлс — эможи нь хүүхдэд ТАНИГДАХУЙЦ байх ёстой.
 *
 * ⚠ Багц бүр 10 зүйлтэй: `MEMORY_MAX_PAIRS` нь 10 тул хамгийн хүнд
 * дасгалд ч хүрэлцэнэ.
 */
const CARD_SETS: string[][] = [
  ["🍎", "🐰", "⭐", "🎵", "🚗", "🌳", "🐟", "🌙", "🍋", "🎈"],
  ["🐶", "🐱", "🐼", "🦊", "🐸", "🐝", "🦋", "🐢", "🐧", "🦁"],
  ["⚽", "🏀", "🎾", "🏐", "🎲", "🎯", "🎸", "🥁", "🎺", "🏓"],
];

function memoryExercise(pairs: number, setIndex: number, prompt: string): Exercise {
  const items = CARD_SETS[setIndex % CARD_SETS.length].slice(0, pairs);
  const grid = encodeMemory({ pairs, items });
  if (!decodeMemory(grid)) throw new Error(`Хөзрийн багц буруу: ${grid}`);
  return { type: "memory-game", grid, prompt };
}

function recallExercise(recall: Recall, prompt: string): Exercise {
  const grid = encodeRecall(recall);
  const back = decodeRecall(grid);
  if (!back) throw new Error(`Дасгал уншигдсангүй: ${grid}`);

  // ⚠ Өөрийнх нь хариугаар ЗӨВ гэж тооцогдох ёстой — эс бөгөөс сурагч
  // төгс сэргээсэн ч дасгал дуусахгүй.
  const answer = back.mode === "digits" ? back.digits : back.cells;
  if (!isCorrect(back, answer)) throw new Error(`Дасгал өөрийн хариугаар унав: ${grid}`);

  return { type: "recall", grid, prompt };
}

/** Хичээлийн XP — сэдэв дотор хүндрэл ахих тусам өснө. */
function xpFor(index: number, base: number): number {
  return base + Math.floor(index / 3) * 2;
}

function buildUnits(): Unit[] {
  const rng = makeRng(20260914);

  /** Memory Cards — 3 хосоос 7 хүртэл. */
  const cardPairs = [3, 3, 4, 4, 5, 5, 6, 6, 7];
  /** Match Pairs — 5 хосоос 10 хүртэл (илүү хүнд үргэлжлэл). */
  const matchPairs = [5, 6, 6, 7, 7, 8, 8, 9, 10];
  /** Sequence — уртыг аажим сунгана. */
  const seqLengths = [3, 3, 4, 4, 5, 5, 6, 6, 7];
  /** Pattern — 3×3 талбар, нүдний тоо ахина (дээд тал нь 8). */
  const patternCounts = [3, 3, 4, 4, 5, 5, 6, 6, 7];
  /** Number — 3 цифрээс 8 хүртэл. */
  const digitLengths = [3, 4, 4, 5, 5, 6, 6, 7, 8];
  /** Visual — талбар ТОМРОНО: 4×4 → 5×5 → 6×6. */
  const visual: { size: number; count: number }[] = [
    { size: 4, count: 4 },
    { size: 4, count: 5 },
    { size: 4, count: 6 },
    { size: 5, count: 5 },
    { size: 5, count: 6 },
    { size: 5, count: 7 },
    { size: 6, count: 7 },
    { size: 6, count: 8 },
    { size: 6, count: 9 },
  ];

  return [
    {
      title: "Memory Cards",
      color: "sky",
      explanation: "Нээсэн хөзрийнхөө БАЙРЛАЛЫГ сана — зөвхөн зургийг нь биш.",
      lessons: cardPairs.map((pairs, index) => ({
        title: `Хос олох ${index + 1}`,
        xp: xpFor(index, 8),
        exercise: memoryExercise(pairs, index, `${pairs} хос — ижил зургуудыг ол.`),
      })),
    },
    {
      title: "Sequence Memory",
      color: "emerald",
      explanation:
        "Дарааллыг бүхэлд нь биш, ХЭСЭГЛЭН сана (2-3 нүдээр) — тархи урт " +
        "дарааллыг богино бүлгүүдээр илүү сайн барьдаг.",
      lessons: seqLengths.map((count, index) => ({
        title: `Дараалал ${index + 1}`,
        xp: xpFor(index, 8),
        exercise: recallExercise(
          { mode: "sequence", size: index < 6 ? 3 : 4, cells: makeCells(index < 6 ? 3 : 4, count, rng) },
          `${count} нүд асна — ижил ДАРААЛЛААР нь дар.`
        ),
      })),
    },
    {
      title: "Pattern Memory",
      color: "amber",
      explanation:
        "Нүд бүрийг тусад нь биш, ДҮРС болгож хар — «гурвалжин», «шулуун» " +
        "гэж нэрлэвэл санахад хамаагүй хялбар.",
      lessons: patternCounts.map((count, index) => ({
        title: `Хэв маяг ${index + 1}`,
        xp: xpFor(index, 8),
        exercise: recallExercise(
          { mode: "pattern", size: 3, cells: makeCells(3, count, rng) },
          `${count} нүд зэрэг асна — тэдгээрийг дар (дараалал хамаагүй).`
        ),
      })),
    },
    {
      title: "Number Memory",
      color: "rose",
      explanation:
        "Цифрүүдийг 2-3-аар нь бүлэглэж сана: «58 29 3» гэж уншвал таван " +
        "цифр биш, гурван зүйл цээжлэх болно.",
      lessons: digitLengths.map((length, index) => ({
        title: `Тоо ${index + 1}`,
        xp: xpFor(index, 8),
        exercise: recallExercise(
          { mode: "digits", digits: makeDigits(length, rng) },
          `${length} оронтой тоо — санаад бич.`
        ),
      })),
    },
    {
      title: "Visual Memory",
      color: "indigo",
      explanation:
        "Том талбарт бүх нүдийг нэг дор барих боломжгүй — талбарыг оюун " +
        "дотроо хэсэгт хувааж, хэсэг тус бүрээр сана.",
      lessons: visual.map(({ size, count }, index) => ({
        title: `Харааны ${index + 1}`,
        xp: xpFor(index, 10),
        exercise: recallExercise(
          { mode: "pattern", size, cells: makeCells(size, count, rng) },
          `${size}×${size} талбарт ${count} нүд асна — бүгдийг нь ол.`
        ),
      })),
    },
    {
      title: "Match Pairs",
      color: "violet",
      explanation:
        "Олон хостой үед ЭХЛЭЭД бүх хөзрийг дараалан нээж байрлалыг нь " +
        "цээжил, дараа нь хосуудыг цуглуул.",
      lessons: matchPairs.map((pairs, index) => ({
        title: `Хос олох ${index + 1}`,
        xp: xpFor(index, 10),
        exercise: memoryExercise(pairs, index + 1, `${pairs} хос — байрлалыг нь сана.`),
      })),
    },
  ];
}

async function main() {
  console.log("Дасгалуудыг үүсгэж шалгаж байна…");

  const unitSpecs = buildUnits();
  const total = unitSpecs.reduce((sum, unit) => sum + unit.lessons.length, 0);

  for (const unit of unitSpecs) {
    if (unit.lessons.length !== PER_UNIT) {
      throw new Error(`«${unit.title}» сэдэвт ${unit.lessons.length} хичээл — ${PER_UNIT} байх ёстой`);
    }
  }

  console.log(`✓ ${unitSpecs.length} сэдэв × ${PER_UNIT} хичээл = ${total} дасгал, бүгд тэнцлээ`);

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
        title: "Санах ой",
        titleEn: "Memory",
        description:
          "Хөзрийн хос, дараалал, хэв маяг, тоо — санах ойн зургаан сэдэв. " +
          "Сэдэв бүр хөнгөнөөс хүнд рүү шатална.",
        descriptionEn:
          "Card pairs, sequences, patterns and numbers — six memory topics, " +
          "each stepping up from easy to hard.",
        icon: "brain",
        color: "teal",
        // `lib/tactiq/schools.ts` → "mind" сургууль.
        school: "mind",
        schools: ["mind"],
        status: "active",
      });
      console.log('"Санах ой" курс үүслээ.');
    } else if (course.status !== "active") {
      await db
        .update(courses)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(courses.slug, COURSE_SLUG));
    }

    /*
     * ⚠ `--force` үед ХӨТӨЛБӨРТ БАЙХГҮЙ сэдвийг устгана. Бүтэц өөрчлөгдөх
     * бүрд (жишээ нь нэг сэдэв → зургаан сэдэв) хуучин нь замд өнчин
     * үлдэж, сурагч хоёр хувилбарыг зэрэг харахаас сэргийлнэ.
     */
    let removedUnits = 0;
    if (force) {
      const wanted = new Set(unitSpecs.map((unit) => unit.title));
      const existingUnits = await db
        .select({ id: units.id, title: units.title })
        .from(units)
        .where(eq(units.courseSlug, COURSE_SLUG));

      for (const row of existingUnits.filter((unit) => !wanted.has(unit.title))) {
        // `lessons`/`exercises` нь CASCADE тул хамт устана.
        await db.delete(units).where(eq(units.id, row.id));
        removedUnits += 1;
        console.log(`  − хоцрогдсон сэдэв устав: ${row.title}`);
      }
    }

    let addedLessons = 0;
    let replacedLessons = 0;
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

      if (force) {
        const wanted = new Set(spec.lessons.map((lesson) => lesson.title));
        for (const row of existingLessons.filter((lesson) => !wanted.has(lesson.title))) {
          await db.delete(lessons).where(eq(lessons.id, row.id));
        }
      }

      for (const lesson of spec.lessons) {
        const found = byTitle.get(lesson.title);
        if (found && !force) continue;

        let lessonId: string;

        if (found) {
          lessonId = found.id;
          // ⚠ Хичээлийг ХАДГАЛНА (явц нь хичээлийн түвшинд) — дасгалыг сольно.
          await db.update(lessons).set({ xpReward: lesson.xp }).where(eq(lessons.id, lessonId));
          await db.delete(exercises).where(eq(exercises.lessonId, lessonId));
          replacedLessons += 1;
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
          addedLessons += 1;
        }

        await db.insert(exercises).values({
          lessonId,
          type: lesson.exercise.type,
          prompt: lesson.exercise.prompt,
          options: null,
          correctOptionId: null,
          grid: lesson.exercise.grid,
          explanation: spec.explanation,
          sortOrder: 0,
          createdBy: owner.uid,
        });
        written += 1;
      }
    }

    if (addedLessons === 0 && replacedLessons === 0 && removedUnits === 0) {
      console.log(
        "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
          "Шинэчлэх бол: npm run seed:memory -- <email> --force"
      );
    } else {
      const parts: string[] = [];
      if (addedLessons > 0) parts.push(`${addedLessons} хичээл нэмэгдлээ`);
      if (replacedLessons > 0) parts.push(`${replacedLessons} хичээл шинэчлэгдлээ`);
      if (removedUnits > 0) parts.push(`${removedUnits} хоцрогдсон сэдэв устав`);
      console.log(
        `✅ "Санах ой" — ${parts.join(", ")}. Нийт ${written} дасгал бичигдлээ.\n` +
          `Засах: /admin/courses/${COURSE_SLUG}`
      );
    }
  } finally {
    await pool.end();
  }
}

void main();
