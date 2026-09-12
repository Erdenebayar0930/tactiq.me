/**
 * ШАТРЫН БҮТЭН ХӨТӨЛБӨР (Level 1–10, ~1000 дасгал) — CLI.
 *
 * Ажиллуулах:
 *   npm run seed:chess:curriculum -- <багшийн-эсвэл-админы-имэйл>
 *   npx tsx scripts/seed-chess-curriculum.ts --dry-run     (санд хүрэхгүй)
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: сэдэв, хичээлийг МОНГОЛ ГАРЧГААР нь таньж,
 * байхгүйг нь л нэмнэ (даамын хөтөлбөртэй ижил).
 *
 * ⚠ ХОЁР ХЭЛ: бичвэр бүр монгол + англи (`*En` баганууд).
 *
 * ⚠ ХӨЛГИЙН БАЙРЛАЛ ГАРААР БИЧИГДЭХГҮЙ (цөөн нээлтийн урхиас бусад):
 * `curriculum/chessGenerators.ts` санамсаргүй байрлал гаргаж,
 * `curriculum/chessShared.ts`-ийн `validateTask`-аар (chess.js) шалгаад
 * ЗӨВХӨН ГАНЦ зөв хариулттайг нь авна. Үр нь ХИЧЭЭЛИЙН НЭРЭЭС гардаг тул
 * дахин ажиллуулахад ижил дасгал үүснэ.
 *
 * ⚠ НЭГ Ч ДАСГАЛ ШАЛГАЛТАД УНАВАЛ САНД ЮУ Ч БИЧИХГҮЙ. Хагас бичигдсэн
 * хичээл idempotent шалгалтыг хуурна (гарчиг нь байгаа тул дараагийн
 * ажиллуулалт алгасна).
 *
 * Шаардлагатай env (.env.local): DATABASE_URL (dry-run-д шаардлагагүй)
 */
import { randomUUID } from "node:crypto";

import { LEVEL_1, LEVEL_2, LEVEL_3 } from "./curriculum/chessLevels1to3";
import { LEVEL_4, LEVEL_5, LEVEL_6 } from "./curriculum/chessLevels4to6";
import { LEVEL_10, LEVEL_7, LEVEL_8, LEVEL_9 } from "./curriculum/chessLevels7to10";
import {
  makeRng,
  promotionOf,
  seedFromString,
  validateTask,
  type SeedLesson,
  type SeedUnit,
  type Task,
} from "./curriculum/chessShared";

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const emailArg = args.find((arg) => !arg.startsWith("--"));

if (!DRY_RUN && !emailArg) {
  console.error("Хэрэглээ: npm run seed:chess:curriculum -- <email>   (эсвэл --dry-run)");
  process.exit(1);
}

/**
 * ⚠ slug нь ЗААВАЛ "chess" — `courseNav.ts` энэ курст л "board-move" ба
 * "chess-puzzle" дасгалыг зөвшөөрнө. ("chess-kids" нь 4–6 насны зурган
 * курс бөгөөд "chess-puzzle"-ийг зөвшөөрдөггүй.) Даамын хөтөлбөр ч шинэ
 * курс үүсгэлгүй байгаа "checkers" курст сэдэв нэмдэг — ижил жишиг.
 */
const COURSE_SLUG = "chess";

const CURRICULUM: SeedUnit[] = [
  LEVEL_1,
  LEVEL_2,
  LEVEL_3,
  LEVEL_4,
  LEVEL_5,
  LEVEL_6,
  LEVEL_7,
  LEVEL_8,
  LEVEL_9,
  LEVEL_10,
];

/**
 * "chess" курст АЛЬ ХЭДИЙН байгаа (эсвэл "chess-kids"-ээс нийлүүлж буй)
 * сэдвийн гарчиг.
 *
 * ⚠ Seeder сэдвийг ГАРЧГААР нь таньдаг: шинэ сэдэв эдгээрийн аль нэгтэй
 * ижил нэртэй бол хуучин сэдэв дотор чимээгүйхэн хичээл нэмэгдэж, эсвэл
 * алгасагдана. Тиймээс давхцвал ЭХЛЭХЭЭС нь зогсооно.
 */
const RESERVED_UNIT_TITLES = new Set([
  "Эхлэл",
  "Өрөг бодлого",
  "Хөлөг ба дүрсүүд",
  "Дүрс бүрийн нүүдэл",
  "Идэж сурах",
]);

for (const unit of CURRICULUM) {
  if (RESERVED_UNIT_TITLES.has(unit.title[0])) {
    console.error(`Сэдвийн гарчиг "${unit.title[0]}" одоо байгаа сэдэвтэй давхцаж байна.`);
    process.exit(1);
  }
}

const OPTION_IDS = ["a", "b", "c", "d"];

/**
 * Нэг дасгал үүсгэхэд оролдох дээд тоо — олдохгүй бол олдсоноор (анхааруулна).
 *
 * ⚠ ЦАГААР БИШ, ОРОЛДЛОГООР хязгаарлана: цагийн хязгаар нь хурдан, удаан
 * машин дээр ӨӨР дасгал үүсгэж, «дахин ажиллуулахад ижил» гэсэн баталгааг
 * эвдэнэ.
 */
const ATTEMPTS_PER_EXERCISE = 400;

/** Санд шууд бичигдэх мөр — `exercises` хүснэгтийн нэг дасгал. */
type Row = {
  type: "choice" | "board-move" | "chess-puzzle";
  prompt: string;
  promptEn: string;
  options: { id: string; label: string }[] | null;
  optionsEn: { id: string; label: string }[] | null;
  correctOptionId: string | null;
  fen: string | null;
  correctFrom: string | null;
  correctTo: string | null;
  correctPromotion: string | null;
  solution: string | null;
  explanation: string;
  explanationEn: string;
};

/**
 * ⚠ ДАВХАРДАЛ ХӨТӨЛБӨР ДАЯАР шалгана: ижил байрлал хоёр хичээлд гарвал
 * хүүхэд «энийг хийсэн» гэж уйдна.
 */
const seen = new Set<string>();
const failures: string[] = [];
const shortfalls: string[] = [];

function taskToRow(task: Task): Row {
  const base = {
    prompt: task.prompt[0],
    promptEn: task.prompt[1],
    options: null,
    optionsEn: null,
    correctOptionId: null,
    explanation: task.explain[0],
    explanationEn: task.explain[1],
  };
  if (task.type === "board-move") {
    return {
      ...base,
      type: "board-move",
      fen: task.fen,
      correctFrom: task.from,
      correctTo: task.to,
      correctPromotion: promotionOf(task.fen, task.from, task.to),
      solution: null,
    };
  }
  return {
    ...base,
    type: "chess-puzzle",
    fen: task.fen,
    correctFrom: null,
    correctTo: null,
    correctPromotion: null,
    solution: task.solution,
  };
}

const taskKey = (task: Task) =>
  task.type === "board-move" ? `${task.fen}|${task.from}${task.to}` : `${task.fen}|${task.solution}`;

function buildLesson(unit: SeedUnit, lesson: SeedLesson): Row[] {
  const rows: Row[] = [];
  const where = `${unit.title[0]} / ${lesson.title[0]}`;
  // `seedKey` — нэр солигдоход агуулга өөрчлөгдөхгүйн тулд (`SeedUnit`-ийн тайлбар).
  const baseSeed = seedFromString(`${unit.seedKey ?? unit.title[0]}|${lesson.title[0]}`);

  for (const [index, exercise] of lesson.exercises.entries()) {
    if (exercise.kind === "choice") {
      if (exercise.options.length < 2 || !exercise.options[exercise.correct]) {
        failures.push(`${where}: сонголтын асуулт буруу — ${exercise.prompt[0]}`);
      }
      rows.push({
        type: "choice",
        prompt: exercise.prompt[0],
        promptEn: exercise.prompt[1],
        options: exercise.options.map((option, i) => ({ id: OPTION_IDS[i], label: option[0] })),
        optionsEn: exercise.options.map((option, i) => ({ id: OPTION_IDS[i], label: option[1] })),
        correctOptionId: OPTION_IDS[exercise.correct],
        fen: null,
        correctFrom: null,
        correctTo: null,
        correctPromotion: null,
        solution: null,
        explanation: exercise.explain[0],
        explanationEn: exercise.explain[1],
      });
      continue;
    }

    if (exercise.kind === "fixed") {
      const error = validateTask(exercise.task);
      if (error) {
        failures.push(`${where}: гараар бичсэн дасгал — ${error} (${exercise.task.fen})`);
        continue;
      }
      seen.add(taskKey(exercise.task));
      rows.push(taskToRow(exercise.task));
      continue;
    }

    // Үүсгэгч: үр нь хичээл + дасгалын индексээс — тогтвортой.
    const rng = makeRng(baseSeed + index * 7919);
    let found = 0;
    for (let attempt = 0; attempt < exercise.count * ATTEMPTS_PER_EXERCISE && found < exercise.count; attempt++) {
      const task = exercise.generator(rng);
      if (!task) continue;
      const key = taskKey(task);
      if (seen.has(key)) continue;
      // ⚠ Үүсгэгч өөрөө шүүсэн ч ДАХИН шалгана — санд орох цорын ганц хаалга.
      const error = validateTask(task);
      if (error) continue;
      seen.add(key);
      rows.push(taskToRow(task));
      found += 1;
    }
    if (found < exercise.count) {
      shortfalls.push(`${where}: ${exercise.count} хүссэнээс ${found} олдлоо`);
    }
  }
  return rows;
}

async function main() {
  console.log("Дасгалууд үүсгэж, chess.js-ээр шалгаж байна…");
  const started = Date.now();

  const built = CURRICULUM.map((unit) => {
    console.log(`\n${unit.title[0]}`);
    // Хичээл бүрийг бүтээнгүүт шууд хэвлэнэ — удаан үүсгэгч аль нь болохыг
    // төгсгөлийг хүлээлгүй харах боломжтой.
    const lessons = unit.lessons.map((lesson) => {
      const lessonStarted = Date.now();
      const rows = buildLesson(unit, lesson);
      const byType = rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.type] = (acc[row.type] ?? 0) + 1;
        return acc;
      }, {});
      console.log(
        `  ${String(rows.length).padStart(3)}  ${lesson.title[0]}  ` +
          Object.entries(byType)
            .map(([type, n]) => `${type}:${n}`)
            .join(" ") +
          `  (${((Date.now() - lessonStarted) / 1000).toFixed(1)}с)`
      );
      return { lesson, rows };
    });
    const count = lessons.reduce((sum, item) => sum + item.rows.length, 0);
    console.log(`  = ${count} дасгал`);
    return { unit, lessons };
  });

  const totalLessons = built.reduce((sum, entry) => sum + entry.lessons.length, 0);
  const allRows = built.flatMap((entry) => entry.lessons.flatMap((item) => item.rows));
  const board = allRows.filter((row) => row.type !== "choice").length;

  if (shortfalls.length > 0) console.warn("\n⚠ Дутуу үүссэн:\n  " + shortfalls.join("\n  "));
  if (failures.length > 0) {
    console.error("\n✗ Шалгалтад унасан:\n  " + failures.join("\n  "));
    process.exitCode = 1;
    return;
  }

  // Эцсийн хамгаалалт: санд бичих МӨР бүрийг (хэвшүүлсний дараа) дахин шалгана.
  console.log(
    `\n✓ ${built.length} сэдэв, ${totalLessons} хичээл, ${allRows.length} дасгал ` +
      `(хөлөг дээр ${board}, асуулт ${allRows.length - board}) шалгалтад тэнцлээ ` +
      `— ${((Date.now() - started) / 1000).toFixed(1)}с.`
  );

  if (DRY_RUN) {
    console.log("--dry-run: санд юу ч бичсэнгүй.");
    return;
  }

  await writeToDatabase(built);
}

async function writeToDatabase(built: { unit: SeedUnit; lessons: { lesson: SeedLesson; rows: Row[] }[] }[]) {
  // ⚠ Санны модулийг ЗӨВХӨН бодит ажиллуулалтад ачаална — dry-run нь
  // DATABASE_URL-гүй орчинд (CI, шинэ машин) ч ажиллах ёстой.
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
        // Байгаа сэдвүүдийн АРД нэмнэ — дунд нь оруулбал сурагчдын аль
        // хэдийн дуусгасан замыг эвдэнэ.
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
            "Засах: /admin/courses/chess"
    );
  } finally {
    await pool.end();
  }
}

void main();
