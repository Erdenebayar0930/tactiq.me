/**
 * DAAMAL KIDS — 4–6 насны 6 курсийг үүсгэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:kids -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: курс/сэдэв/хичээлийг нэрээр нь таньж, зөвхөн
 * байхгүйг нь нэмнэ.
 *
 * ⚠ БҮХ БИЧВЭР ХОЁР ХЭЛТЭЙ (`*En` баганууд, `lib/i18n/content.ts`).
 *
 * ⚠ Дасгал бүрийг санд орохоос ӨМНӨ шалгана: санах ойн хөзөр давхардаагүй
 * (`decodeMemory`), гулсдаг оньсого зөв (`decodeSlide`), шатрын нүүдэл
 * ХУУЛЬ ЁСНЫ (`chess.js`). Шалгалтад унасан дасгал санд ОРОХГҮЙ.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { randomUUID } from "node:crypto";

import { Chess } from "chess.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import { decodeMemory, encodeMemory } from "../src/lib/puzzles/memory";
import { decodeSlide, encodeSlide } from "../src/lib/puzzles/slide";
import { KIDS_COURSES } from "./curriculum/kidsCourses";

import type { KidsCourse, KidsLesson } from "./curriculum/kidsShared";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:kids -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const OPTION_IDS = ["a", "b", "c", "d"];

type Row = {
  type: "choice" | "memory-game" | "slide-puzzle" | "code-maze" | "board-move";
  prompt: string;
  promptEn: string;
  options: { id: string; label: string }[] | null;
  optionsEn: { id: string; label: string }[] | null;
  correctOptionId: string | null;
  fen: string | null;
  correctFrom: string | null;
  correctTo: string | null;
  grid: string | null;
  explanation: string;
  explanationEn: string;
};

const emptyRow = {
  options: null,
  optionsEn: null,
  correctOptionId: null,
  fen: null,
  correctFrom: null,
  correctTo: null,
  grid: null,
};

function buildLesson(lesson: KidsLesson): Row[] {
  return lesson.exercises.map((exercise) => {
    const base = {
      prompt: exercise.prompt[0],
      promptEn: exercise.prompt[1],
      explanation: exercise.explain[0],
      explanationEn: exercise.explain[1],
    };

    if (exercise.kind === "choice") {
      if (exercise.options.length < 2) {
        throw new Error(`"${lesson.title[0]}" — сонголт хоёроос цөөн байна.`);
      }
      return {
        ...emptyRow,
        ...base,
        type: "choice" as const,
        options: exercise.options.map((option, index) => ({
          id: OPTION_IDS[index],
          label: option[0],
        })),
        optionsEn: exercise.options.map((option, index) => ({
          id: OPTION_IDS[index],
          label: option[1],
        })),
        correctOptionId: OPTION_IDS[exercise.correct],
      };
    }

    if (exercise.kind === "memory") {
      const grid = encodeMemory({ pairs: exercise.items.length, items: exercise.items });
      // ⚠ Задлагчаар шалгана: хөзөр давхардвал тоглоомын дүрэм эвдэрнэ.
      if (!decodeMemory(grid)) {
        throw new Error(`"${lesson.title[0]}" — санах ойн хөзөр буруу: ${grid}`);
      }
      return { ...emptyRow, ...base, type: "memory-game" as const, grid };
    }

    if (exercise.kind === "slide") {
      const grid = encodeSlide(exercise.size);
      if (!decodeSlide(grid)) {
        throw new Error(`"${lesson.title[0]}" — гулсдаг оньсого буруу: ${grid}`);
      }
      return { ...emptyRow, ...base, type: "slide-puzzle" as const, grid };
    }

    if (exercise.kind === "maze") {
      return { ...emptyRow, ...base, type: "code-maze" as const, grid: exercise.grid };
    }

    // board-move — нүүдэл ХУУЛЬ ЁСНЫ эсэхийг `chess.js`-ээр шалгана.
    const chess = new Chess(exercise.fen);
    const legal = chess
      .moves({ verbose: true })
      .some((move) => move.from === exercise.from && move.to === exercise.to);
    if (!legal) {
      throw new Error(
        `"${lesson.title[0]}" — хууль бус нүүдэл: ${exercise.from}${exercise.to} (${exercise.fen})`
      );
    }

    return {
      ...emptyRow,
      ...base,
      type: "board-move" as const,
      fen: exercise.fen,
      correctFrom: exercise.from,
      correctTo: exercise.to,
    };
  });
}

async function main() {
  console.log("Дасгалууд бэлдэж, шалгаж байна…");

  const built = KIDS_COURSES.map((course: KidsCourse) => ({
    course,
    units: course.units.map((unit) => ({
      unit,
      lessons: unit.lessons.map((lesson) => ({ lesson, rows: buildLesson(lesson) })),
    })),
  }));

  const totals = built.map((entry) => {
    const lessonCount = entry.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
    const rowCount = entry.units.reduce(
      (sum, unit) => sum + unit.lessons.reduce((inner, item) => inner + item.rows.length, 0),
      0
    );
    return `${entry.course.slug}: ${lessonCount} хичээл / ${rowCount} дасгал`;
  });
  console.log(`✓ ${totals.join(", ")}`);

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

    let addedCourses = 0;
    let addedLessons = 0;
    let addedRows = 0;

    for (const entry of built) {
      const { course } = entry;

      const [existing] = await db
        .select({ slug: courses.slug })
        .from(courses)
        .where(eq(courses.slug, course.slug))
        .limit(1);

      if (!existing) {
        // Шинэ курс жагсаалтын ТӨГСГӨЛД — эрэмбийг админ `/admin/courses`
        // дээрх дээш/доош товчоор өөрчилнө.
        const all = await db.select({ sortOrder: courses.sortOrder }).from(courses);
        const sortOrder = all.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

        await db.insert(courses).values({
          slug: course.slug,
          title: course.title[0],
          titleEn: course.title[1],
          description: course.description[0],
          descriptionEn: course.description[1],
          icon: course.icon,
          color: course.color,
          status: "active",
          school: course.school,
          sortOrder,
        });
        addedCourses += 1;
      }

      for (const unitEntry of entry.units) {
        const [existingUnit] = await db
          .select({ id: units.id })
          .from(units)
          .where(and(eq(units.courseSlug, course.slug), eq(units.title, unitEntry.unit.title[0])))
          .limit(1);

        let unitId: string;

        if (existingUnit) {
          unitId = existingUnit.id;
        } else {
          const existingUnits = await db
            .select({ sortOrder: units.sortOrder })
            .from(units)
            .where(eq(units.courseSlug, course.slug));
          const sortOrder = existingUnits.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

          const [created] = await db
            .insert(units)
            .values({
              courseSlug: course.slug,
              title: unitEntry.unit.title[0],
              titleEn: unitEntry.unit.title[1],
              color: unitEntry.unit.color,
              sortOrder,
              createdBy: owner.uid,
            })
            .returning({ id: units.id });
          unitId = created.id;
        }

        const existingLessons = await db
          .select({ title: lessons.title, sortOrder: lessons.sortOrder })
          .from(lessons)
          .where(eq(lessons.unitId, unitId));
        const existingTitles = new Set(existingLessons.map((row) => row.title));
        let lessonOrder = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

        for (const { lesson, rows } of unitEntry.lessons) {
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
    }

    console.log(
      addedLessons === 0 && addedCourses === 0
        ? "Бүх агуулга аль хэдийн байна — юу ч өөрчлөөгүй."
        : `✅ ${addedCourses} курс, ${addedLessons} хичээл, ${addedRows} дасгал нэмэгдлээ.`
    );
  } finally {
    await pool.end();
  }
}

void main();
