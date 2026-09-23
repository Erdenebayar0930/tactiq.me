/**
 * ДААМЫН БҮТЭН ХӨТӨЛБӨР (Level 1–10, ~1000 дасгал) — CLI.
 *
 * Ажиллуулах:
 *   npm run seed:draughts:curriculum -- <багшийн-эсвэл-админы-имэйл>
 *   npx tsx scripts/seed-draughts-curriculum.ts --dry-run     (санд хүрэхгүй)
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: сэдэв, хичээлийг МОНГОЛ ГАРЧГААР нь таньж,
 * байхгүйг нь л нэмнэ. Шинэ хичээлүүд (`curriculum/draughtsExtraLessons.ts`)
 * байгаа сэдвийн АРД нэмэгдэнэ — хуучин хичээлийн нэр, дараалал хэвээр.
 *
 * ⚠ ХОЁР ХЭЛ: бичвэр бүр монгол + англи (`*En` баганууд).
 *
 * ⚠ ТАКТИКИЙН БАЙРЛАЛУУД ГАРААР БИЧИГДЭХГҮЙ:
 *   • ХУУЧИН хичээл (seedKey-гүй) — `lib/draughts/generate.ts`, үр нь
 *     «сэдэв|хичээл» гарчгаас (санд байгаатай ЯГ ижил гарахын тулд өөрчлөөгүй);
 *   • ШИНЭ хичээл (seedKey-тэй) — `curriculum/draughtsGenerators.ts`, үр нь
 *     `seedKey`-ээс, `taskProblem`-оор ХАТУУ шалгагдана (ганц зөв хариулт).
 *
 * ⚠ ДАВХАРДАЛ: шинэ байрлал бүр (хөлөг + нүүх тал) хуучин хөтөлбөр, бусад
 * даамын seed (`seed-draughts-tactics.ts`, `seed-draughts-combos.ts`) болон
 * бие биетэйгээ давхцахгүй.
 *
 * ⚠ НЭГ Ч ДАСГАЛ ШАЛГАЛТАД УНАВАЛ (эсвэл шинэ хичээл дутуу үүсвэл) САНД ЮУ Ч
 * БИЧИХГҮЙ.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL (dry-run-д шаардлагагүй)
 */
import { createHash, randomUUID } from "node:crypto";

import { generateCombos, generateMoveTasks, makeRng, seedFromString } from "../src/lib/draughts/generate";
import { deserializePosition, serializePosition } from "../src/lib/draughts/notation";
import { LEVEL_1, LEVEL_2 } from "./curriculum/draughtsLevels1to2";
import { LEVEL_3, LEVEL_4, LEVEL_5 } from "./curriculum/draughtsLevels3to5";
import { LEVEL_6 } from "./curriculum/draughtsLevels6to10";
import { PRACTICE_UNIT } from "./curriculum/draughtsPractice";
import {
  EXTRA_LEVEL_1,
  EXTRA_LEVEL_2,
  EXTRA_LEVEL_3,
  EXTRA_LEVEL_4,
  EXTRA_LEVEL_5,
  EXTRA_LEVEL_6,
} from "./curriculum/draughtsExtraLessons";
import {
  generateTask,
  moveProblem,
  otherSeedFens,
  puzzleProblem,
  taskProblem,
  type BoardTask,
} from "./curriculum/draughtsGenerators";

import type { GenExercise, SeedExercise, SeedLesson, SeedUnit } from "./curriculum/draughtsShared";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const emailArg = args.find((arg) => !arg.startsWith("--"));

if (!DRY_RUN && !emailArg) {
  console.error("Хэрэглээ: npm run seed:draughts:curriculum -- <email>   (эсвэл --dry-run)");
  process.exit(1);
}

/** ⚠ slug нь ЗААВАЛ "checkers" — `courseNav.ts` энэ курст л даамын дасгалыг зөвшөөрнө. */
const COURSE_SLUG = "checkers";

const withExtras = (unit: SeedUnit, extra: SeedLesson[]): SeedUnit => ({
  ...unit,
  lessons: [...unit.lessons, ...extra],
});

const CURRICULUM: SeedUnit[] = [
  withExtras(LEVEL_1, EXTRA_LEVEL_1),
  withExtras(LEVEL_2, EXTRA_LEVEL_2),
  withExtras(LEVEL_3, EXTRA_LEVEL_3),
  withExtras(LEVEL_4, EXTRA_LEVEL_4),
  withExtras(LEVEL_5, EXTRA_LEVEL_5),
  withExtras(LEVEL_6, EXTRA_LEVEL_6),
  /*
   * ⚠ ХАМГИЙН АРД: «Дадлага» нь ШИНЭ санаа заадаггүй, бүх түвшний
   * идэлт, цохилтыг ДАВТАНа. Тиймээс сурагч бүх сэдвийг үзсний ДАРАА.
   */
  PRACTICE_UNIT,
];

const OPTION_IDS = ["a", "b", "c", "d"];

/**
 * Шинэ дасгал бүрт оролдох санамсаргүй байрлалын дээд тоо. ЦАГААР биш
 * оролдлогоор хязгаарлана — эс бөгөөс хурдан/удаан машин өөр агуулга гаргана.
 */
const ATTEMPTS_PER_EXERCISE_BLOCK = 4_000_000;

/** Санд шууд бичигдэх мөр — `exercises` хүснэгтийн нэг дасгал. */
type Row = {
  type: "choice" | "draughts-move" | "draughts-puzzle";
  prompt: string;
  promptEn: string;
  options: { id: string; label: string }[] | null;
  optionsEn: { id: string; label: string }[] | null;
  correctOptionId: string | null;
  fen: string | null;
  correctFrom: string | null;
  correctTo: string | null;
  solution: string | null;
  explanation: string;
  explanationEn: string;
};

type BuiltLesson = { lesson: SeedLesson; rows: Row[]; isNew: boolean };

const failures: string[] = [];
const legacyWarnings: string[] = [];
const legacyAudit: string[] = [];

/** Хөлөг + нүүх тал (хэвшүүлсэн) — давхардлын түлхүүр. Хариултаас үл хамааран ижил байрлалыг давтахгүй. */
const positionKey = (fen: string): string => {
  const setup = deserializePosition(fen);
  return setup ? serializePosition(setup.board, setup.turn) : fen;
};

const seen = new Set<string>();

function choiceRow(exercise: Extract<SeedExercise, { kind: "choice" }>, where: string): Row {
  if (exercise.options.length < 2 || !exercise.options[exercise.correct]) {
    failures.push(`${where}: сонголтын асуулт буруу — ${exercise.prompt[0]}`);
  }
  return {
    type: "choice",
    prompt: exercise.prompt[0],
    promptEn: exercise.prompt[1],
    options: exercise.options.map((option, i) => ({ id: OPTION_IDS[i], label: option[0] })),
    optionsEn: exercise.options.map((option, i) => ({ id: OPTION_IDS[i], label: option[1] })),
    correctOptionId: OPTION_IDS[exercise.correct],
    fen: null,
    correctFrom: null,
    correctTo: null,
    solution: null,
    explanation: exercise.explain[0],
    explanationEn: exercise.explain[1],
  };
}

function boardRow(task: BoardTask, exercise: { prompt: [string, string]; explain: [string, string] }): Row {
  return {
    type: task.type,
    prompt: exercise.prompt[0],
    promptEn: exercise.prompt[1],
    options: null,
    optionsEn: null,
    correctOptionId: null,
    fen: task.fen,
    correctFrom: task.type === "draughts-move" ? task.from : null,
    correctTo: task.type === "draughts-move" ? task.to : null,
    solution: task.type === "draughts-puzzle" ? task.solution : null,
    explanation: exercise.explain[0],
    explanationEn: exercise.explain[1],
  };
}

/**
 * ХУУЧИН хичээл — анхны seed-тэй ЯГ ижил үр, ижил үүсгэгч (санд байгаа
 * агуулгатай таарна). Тоглогдох эсэхийг хатуу шалгана; шинэ, илүү чанд
 * «өөр эхний нүүдэл» шалгалтыг зөвхөн мэдээлэл болгон хэвлэнэ.
 */
function buildLegacyLesson(unit: SeedUnit, lesson: SeedLesson): Row[] {
  const rows: Row[] = [];
  const where = `${unit.title[0]} / ${lesson.title[0]}`;
  const baseSeed = seedFromString(`${unit.title[0]}|${lesson.title[0]}`);

  for (const [index, exercise] of lesson.exercises.entries()) {
    if (exercise.kind === "gen") {
      failures.push(`${where}: seedKey-гүй хичээлд шинэ үүсгэгч хэрэглэж болохгүй`);
      continue;
    }
    if (exercise.kind === "choice") {
      rows.push(choiceRow(exercise, where));
      continue;
    }

    if (exercise.kind === "move") {
      const tasks = generateMoveTasks(baseSeed + index * 7919, exercise.count, exercise.filter, exercise.pieces);
      if (tasks.length < exercise.count) {
        legacyWarnings.push(`${where}: ${exercise.count} хүссэнээс ${tasks.length} байрлал`);
      }
      for (const task of tasks) {
        const problem = moveProblem(task.fen, task.from, task.to);
        if (problem) failures.push(`${where}: ${problem} (${task.fen})`);
        seen.add(positionKey(task.fen));
        rows.push(boardRow({ type: "draughts-move", fen: task.fen, from: task.from, to: task.to }, exercise));
      }
      continue;
    }

    const combos = generateCombos(baseSeed + index * 104729, exercise.count, exercise.pieces, {
      minGain: exercise.minGain,
    });
    if (combos.length < exercise.count) {
      legacyWarnings.push(`${where}: ${exercise.count} хүссэнээс ${combos.length} комбинаци`);
    }
    for (const task of combos) {
      const problem = puzzleProblem(task.fen, task.solution, false);
      if (problem) failures.push(`${where}: ${problem} (${task.fen} | ${task.solution})`);
      const strict = puzzleProblem(task.fen, task.solution, true);
      if (strict) legacyAudit.push(`${where}: ${strict}`);
      seen.add(positionKey(task.fen));
      rows.push(boardRow({ type: "draughts-puzzle", fen: task.fen, solution: task.solution }, exercise));
    }
  }
  return rows;
}

/** ШИНЭ хичээл — үр нь `seedKey`-ээс; бүх дасгал хатуу шалгалт + давхардлын шалгалттай. */
function buildNewLesson(unit: SeedUnit, lesson: SeedLesson): Row[] {
  const rows: Row[] = [];
  const where = `${unit.title[0]} / ${lesson.title[0]}`;
  const baseSeed = seedFromString(`draughts-curriculum-v2|${lesson.seedKey}`);

  for (const [index, exercise] of lesson.exercises.entries()) {
    if (exercise.kind === "choice") {
      rows.push(choiceRow(exercise, where));
      continue;
    }
    if (exercise.kind !== "gen") {
      failures.push(`${where}: шинэ хичээлд зөвхөн gen() / q() хэрэглэнэ`);
      continue;
    }

    const spec = (exercise as GenExercise).spec;
    const rng = makeRng((baseSeed + index * 7919) >>> 0);
    let found = 0;
    for (let attempt = 0; attempt < ATTEMPTS_PER_EXERCISE_BLOCK && found < exercise.count; attempt += 1) {
      const task = generateTask(rng, spec);
      if (!task) continue;
      const key = positionKey(task.fen);
      if (seen.has(key)) continue;
      // ⚠ Санд орох цорын ганц хаалга — үүсгэгч шүүсэн ч ДАХИН, бүрэн шалгана.
      if (taskProblem(task)) continue;
      seen.add(key);
      rows.push(boardRow(task, exercise));
      found += 1;
    }
    if (found < exercise.count) {
      failures.push(`${where}: #${index + 1} — ${exercise.count} хүссэнээс ${found} олдлоо`);
    }
  }

  // Эцсийн хамгаалалт: санд бичих мөр бүрийг дахин шалгана.
  for (const row of rows) {
    if (row.type === "draughts-move") {
      const problem = moveProblem(row.fen!, row.correctFrom!, row.correctTo!);
      if (problem) failures.push(`${where}: ${problem} (${row.fen})`);
    } else if (row.type === "draughts-puzzle") {
      const problem = puzzleProblem(row.fen!, row.solution!);
      if (problem) failures.push(`${where}: ${problem} (${row.fen} | ${row.solution})`);
    }
  }
  return rows;
}

function checkStructure() {
  const seedKeys = new Set<string>();
  for (const unit of CURRICULUM) {
    const titles = new Set<string>();
    const titlesEn = new Set<string>();
    for (const lesson of unit.lessons) {
      if (titles.has(lesson.title[0])) failures.push(`${unit.title[0]}: давхар гарчиг "${lesson.title[0]}"`);
      if (titlesEn.has(lesson.title[1])) failures.push(`${unit.title[0]}: давхар англи гарчиг "${lesson.title[1]}"`);
      titles.add(lesson.title[0]);
      titlesEn.add(lesson.title[1]);
      if (!lesson.title[0].trim() || !lesson.title[1].trim()) failures.push(`${unit.title[0]}: хоосон гарчиг`);
      for (const exercise of lesson.exercises) {
        if (!exercise.prompt[0] || !exercise.prompt[1] || !exercise.explain[0] || !exercise.explain[1]) {
          failures.push(`${unit.title[0]} / ${lesson.title[0]}: орчуулгагүй бичвэр`);
        }
      }
      if (lesson.seedKey) {
        if (seedKeys.has(lesson.seedKey)) failures.push(`давхар seedKey "${lesson.seedKey}"`);
        seedKeys.add(lesson.seedKey);
      }
    }
  }
}

async function main() {
  console.log("Дасгалууд үүсгэж, даамын хөдөлгүүрээр шалгаж байна…");
  const started = Date.now();

  checkStructure();

  // 1. Бусад даамын seed-ийн байрлалууд — давхардлын жагсаалтад.
  const others = otherSeedFens();
  for (const fen of others) seen.add(positionKey(fen));
  console.log(`  (бусад seed-ийн ${others.length} байрлалыг давхардлын шалгалтад нэмлээ)`);

  // 2. ЭХЛЭЭД бүх хуучин хичээл — шинэ байрлал тэдэнтэй давхцахгүйн тулд.
  const legacyRows = new Map<SeedLesson, Row[]>();
  for (const unit of CURRICULUM) {
    for (const lesson of unit.lessons) {
      if (!lesson.seedKey) legacyRows.set(lesson, buildLegacyLesson(unit, lesson));
    }
  }

  // 3. Шинэ хичээлүүд.
  const built = CURRICULUM.map((unit) => {
    console.log(`\n${unit.title[0]}`);
    const lessons: BuiltLesson[] = unit.lessons.map((lesson) => {
      const isNew = Boolean(lesson.seedKey);
      const lessonStarted = Date.now();
      const rows = isNew ? buildNewLesson(unit, lesson) : legacyRows.get(lesson)!;
      const byType = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.type] = (acc[row.type] ?? 0) + 1;
        return acc;
      }, {});
      console.log(
        `  ${isNew ? "[шинэ ]" : "[хуучин]"} ${String(rows.length).padStart(3)}  ${lesson.title[0]}  ` +
          Object.entries(byType)
            .map(([type, n]) => `${type}:${n}`)
            .join(" ") +
          (isNew ? `  (${((Date.now() - lessonStarted) / 1000).toFixed(1)}с)` : "")
      );
      return { lesson, rows, isNew };
    });

    const sum = (items: BuiltLesson[]) => items.reduce((total, item) => total + item.rows.length, 0);
    const oldLessons = lessons.filter((item) => !item.isNew);
    const newLessons = lessons.filter((item) => item.isNew);
    console.log(
      `  = хуучин ${oldLessons.length} хичээл / ${sum(oldLessons)} дасгал; ` +
        `шинэ ${newLessons.length} хичээл / ${sum(newLessons)} дасгал; ` +
        `нийт ${lessons.length} / ${sum(lessons)}`
    );
    return { unit, lessons };
  });

  const all = built.flatMap((entry) => entry.lessons);
  const oldAll = all.filter((item) => !item.isNew);
  const newAll = all.filter((item) => item.isNew);
  const count = (items: BuiltLesson[]) => items.reduce((total, item) => total + item.rows.length, 0);

  console.log("\n=== ХУРААНГУЙ ===");
  console.log(`Сэдэв ${"".padEnd(34)} хуучин(хич/дас)  шинэ(хич/дас)  нийт(хич/дас)`);
  for (const entry of built) {
    const o = entry.lessons.filter((item) => !item.isNew);
    const n = entry.lessons.filter((item) => item.isNew);
    console.log(
      `${entry.unit.title[0].padEnd(40)} ${`${o.length}/${count(o)}`.padStart(10)}  ${`${n.length}/${count(n)}`.padStart(12)}  ${`${entry.lessons.length}/${count(entry.lessons)}`.padStart(12)}`
    );
  }
  console.log(
    `${"НИЙТ".padEnd(40)} ${`${oldAll.length}/${count(oldAll)}`.padStart(10)}  ${`${newAll.length}/${count(newAll)}`.padStart(12)}  ${`${all.length}/${count(all)}`.padStart(12)}`
  );

  if (legacyWarnings.length > 0) {
    console.warn("\n⚠ Хуучин хичээлд дутуу үүссэн (санд байгаа хэвээр):\n  " + legacyWarnings.join("\n  "));
  }
  if (legacyAudit.length > 0) {
    console.warn(
      `\nℹ Хуучин ${legacyAudit.length} комбинаци шинэ чанд шалгалтад «өөр эхний нүүдэл ч ашигтай» гэж тэмдэглэгдлээ ` +
        "(санд аль хэдийн байгаа тул өөрчлөөгүй):\n  " +
        legacyAudit.join("\n  ")
    );
  }
  if (failures.length > 0) {
    console.error(`\n✗ Шалгалтад унасан (${failures.length}):\n  ` + failures.join("\n  "));
    console.error("Санд юу ч бичсэнгүй.");
    process.exitCode = 1;
    return;
  }

  // Агуулгын хурууны хээ — хоёр ажиллуулалт ИЖИЛ агуулга гаргасныг харьцуулахад.
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(built.map((entry) => entry.lessons.map((item) => [item.lesson.title[0], item.rows]))))
    .digest("hex")
    .slice(0, 16);

  console.log(
    `\n✓ ${built.length} сэдэв, ${all.length} хичээл, ${count(all)} дасгал шалгалтад тэнцлээ, ` +
      `байрлалын давхардалгүй — ${((Date.now() - started) / 1000).toFixed(1)}с. Хурууны хээ: ${fingerprint}`
  );

  if (DRY_RUN) {
    console.log("--dry-run: санд юу ч бичсэнгүй.");
    return;
  }

  await writeToDatabase(built);
}

async function writeToDatabase(built: { unit: SeedUnit; lessons: BuiltLesson[] }[]) {
  // ⚠ Санны модулийг ЗӨВХӨН бодит ажиллуулалтад ачаална — dry-run нь
  // DATABASE_URL-гүй орчинд ч ажиллах ёстой.
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { and, eq } = await import("drizzle-orm");
  const { createDbPool, resolveDatabaseUrl } = await import("../src/lib/db/createPool");
  const { courses, exercises, lessons, units, users } = await import("../src/lib/db/schema");

  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
    process.exitCode = 1;
    return;
  }

  const pool = createDbPool(connectionString, 1);
  const db = drizzle(pool);

  try {
    const [owner] = await db
      .select({ uid: users.uid })
      .from(users)
      .where(eq(users.email, emailArg!.trim().toLowerCase()))
      .limit(1);

    if (!owner) {
      console.error(`"${emailArg}" имэйлтэй хэрэглэгч олдсонгүй.`);
      process.exitCode = 1;
      return;
    }

    const [course] = await db
      .select({ slug: courses.slug })
      .from(courses)
      .where(eq(courses.slug, COURSE_SLUG))
      .limit(1);

    if (!course) {
      console.error(`"${COURSE_SLUG}" курс олдсонгүй.`);
      process.exitCode = 1;
      return;
    }

    let addedUnits = 0;
    let addedLessons = 0;
    let addedRows = 0;

    for (const entry of built) {
      const [existingUnit] = await db
        .select({ id: units.id, titleEn: units.titleEn })
        .from(units)
        .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, entry.unit.title[0])))
        .limit(1);

      let unitId: string;

      if (existingUnit) {
        unitId = existingUnit.id;
        if (!existingUnit.titleEn) {
          await db.update(units).set({ titleEn: entry.unit.title[1] }).where(eq(units.id, unitId));
        }
      } else {
        const existing = await db
          .select({ sortOrder: units.sortOrder })
          .from(units)
          .where(eq(units.courseSlug, COURSE_SLUG));
        const sortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

        const [created] = await db
          .insert(units)
          .values({
            courseSlug: COURSE_SLUG,
            title: entry.unit.title[0],
            titleEn: entry.unit.title[1],
            color: entry.unit.color,
            sortOrder,
            createdBy: owner.uid,
          })
          .returning({ id: units.id });
        unitId = created.id;
        addedUnits += 1;
      }

      const existingLessons = await db
        .select({ title: lessons.title, sortOrder: lessons.sortOrder })
        .from(lessons)
        .where(eq(lessons.unitId, unitId));
      const existingTitles = new Set(existingLessons.map((row) => row.title));
      // Шинэ хичээлүүд байгаа хичээлүүдийн АРД — сурагчдын ахиц хэвээр.
      let lessonOrder = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

      for (const { lesson, rows } of entry.lessons) {
        if (existingTitles.has(lesson.title[0])) continue;

        const lessonId = randomUUID();
        await db.insert(lessons).values({
          id: lessonId,
          unitId,
          title: lesson.title[0],
          titleEn: lesson.title[1],
          xpReward: lesson.xp,
          sortOrder: lessonOrder++,
          createdBy: owner.uid,
        });
        addedLessons += 1;

        let sortOrder = 0;
        for (const row of rows) {
          await db.insert(exercises).values({
            lessonId,
            ...row,
            sortOrder: sortOrder++,
            createdBy: owner.uid,
          });
          addedRows += 1;
        }
      }
    }

    console.log(
      addedLessons === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй."
        : `✅ ${addedUnits} сэдэв, ${addedLessons} хичээл, ${addedRows} дасгал нэмэгдлээ.\n` +
            "Засах: /admin/courses/checkers"
    );
  } finally {
    await pool.end();
  }
}

void main();
