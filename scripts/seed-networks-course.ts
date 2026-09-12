/**
 * «Компьютерийн сүлжээ» курсийг үүсгэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:networks -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: курс байвал ХИЧЭЭЛИЙН түвшинд давхардлыг
 * шалгаад, зөвхөн байхгүйг нь нэмнэ (`seed-chess-puzzles.ts`-тэй ижил
 * зарчим — нэгжийг нэг удаа үүсгэсэн сервер хожмын багцыг авч чадахгүй
 * байх асуудлаас сэргийлнэ).
 *
 * ⚠ Оньсого бүрийг ЭНД үүсгэж, `decodePuzzle`-ээр эргүүлж шалгана: бүх
 * кабель хөрштэйгээ таарсан, гогцоогүй, бүгд серверт холбогдсон эсэх.
 * Шалгалтад унасан оньсогыг санд ОРУУЛАХГҮЙ — эс бөгөөс сурагч хичээл
 * дунд шийдэгдэхгүй оньсого дээр гацна.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import {
  decodePuzzle,
  encodePuzzle,
  generatePuzzle,
  isEndpoint,
  makeRng,
  type NetPuzzle,
} from "../src/lib/net/puzzle";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:networks -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "networks";

/**
 * ⚠ slug нь ЗААВАЛ "networks" — `lib/tactiq/courseNav.ts`-ийн
 * `NET_PUZZLE_COURSES` энэ нэрээр л "net-puzzle" дасгалыг зөвшөөрдөг.
 */

type SeedExercise =
  | {
      type: "choice";
      prompt: string;
      options: { id: string; label: string }[];
      correctOptionId: string;
      explanation: string;
    }
  | {
      type: "net-puzzle";
      prompt: string;
      /** Оньсогын хэмжээ (талын урт) ба давтагдах үр. */
      size: number;
      seed: number;
      explanation: string;
    };

/**
 * Хичээлийн дараалал: ойлголт → жижиг оньсого → том оньсого.
 *
 * Оньсогын хэмжээ 3×3-аас 6×6 хүртэл ӨСНӨ. Эхнээс нь 6×6 өгвөл эхлэн
 * суралцагч 36 нүдийг зэрэг харж дийлэхгүй — Duolingo-гийн адил ур чадвар
 * нэг нэгээр нэмэгдэнэ.
 */
const LESSONS: { title: string; xp: number; exercises: SeedExercise[] }[] = [
  {
    title: "Сүлжээ гэж юу вэ",
    xp: 10,
    exercises: [
      {
        type: "choice",
        prompt: "Компьютерийн «сүлжээ» гэж юу вэ?",
        options: [
          { id: "a", label: "Хоорондоо холбогдсон, мэдээлэл солилцдог компьютерууд" },
          { id: "b", label: "Нэг компьютер дээрх олон програм" },
          { id: "c", label: "Компьютерийн дотор эд анги" },
        ],
        correctOptionId: "a",
        explanation:
          "Сүлжээ бол холболт. Хоёр компьютер холбогдмогц мэдээлэл нэгээс " +
          "нөгөө рүү явж чадна.",
      },
      {
        type: "choice",
        prompt: "«Сервер» юу хийдэг вэ?",
        options: [
          { id: "a", label: "Бусад компьютерт мэдээлэл, үйлчилгээ өгдөг гол компьютер" },
          { id: "b", label: "Зөвхөн тоглоом ажиллуулдаг компьютер" },
          { id: "c", label: "Интернэтийн кабель" },
        ],
        correctOptionId: "a",
        explanation:
          "Сервер бол сүлжээний төв — хичээл, зураг, мессеж бүгд түүн дээр " +
          "хадгалагдаж, хүсэлт ирэхэд илгээгддэг.",
      },
      {
        type: "net-puzzle",
        prompt: "Кабелиудыг эргүүлж, компьютерийг сервертэй холбоно уу.",
        size: 3,
        seed: 101,
        explanation:
          "Мэдээлэл нь ЗӨВХӨН тасралтгүй замаар явна. Нэг л кабель эргүү " +
          "байвал тэр компьютер сүлжээнээс тасарна.",
      },
    ],
  },
  {
    title: "Холболтын зам",
    xp: 15,
    exercises: [
      {
        type: "net-puzzle",
        prompt: "Бүх компьютерийг сервертэй холбо.",
        size: 4,
        seed: 202,
        explanation: "Салаалсан цэгүүд нь жинхэнэ сүлжээний «свич» шиг ажилладаг.",
      },
      {
        type: "choice",
        prompt: "Нэг компьютер руу очих кабель тасарвал юу болох вэ?",
        options: [
          { id: "a", label: "Зөвхөн ТЭР компьютер сүлжээнээс сална" },
          { id: "b", label: "Бүх сүлжээ унана" },
          { id: "c", label: "Сервер ажиллахаа болино" },
        ],
        correctOptionId: "a",
        explanation:
          "Модон бүтэцтэй сүлжээнд нэг мөчир тасрахад бусад нь ажилласаар " +
          "байна — гэхдээ тэр мөчрийн ард байгаа БҮХ төхөөрөмж сална.",
      },
      {
        type: "net-puzzle",
        prompt: "Илүү том сүлжээ. Тасарсан кабелиудыг ол.",
        size: 5,
        seed: 303,
        explanation: "Серверээс эхэлж, мөчир бүрийг дагаж шалгах нь хамгийн хурдан арга.",
      },
    ],
  },
  {
    title: "Том сүлжээ угсрах",
    xp: 20,
    exercises: [
      {
        type: "net-puzzle",
        prompt: "Сургуулийн сүлжээ. Бүх компьютерийг холбо.",
        size: 5,
        seed: 404,
        explanation: "Том сүлжээг хэсэг хэсгээр нь бод — эхлээд серверийн ойрын мөчрүүд.",
      },
      {
        type: "net-puzzle",
        prompt: "Хамгийн том сүлжээ. Тэвчээртэй бай!",
        size: 6,
        seed: 505,
        explanation:
          "Жинхэнэ дата төвүүд ийм зарчмаар ажилладаг — зөвхөн хэдэн мянга " +
          "дахин том.",
      },
    ],
  },
];

async function main() {
  /**
   * Оньсого бүрийг санд хүрэхээс ӨМНӨ үүсгэж, шалгана. Нэг нь ч буруу бол
   * юу ч бичихгүй — хагас бичигдсэн курс нь idempotent шалгалтыг хуурна.
   */
  const built = LESSONS.map((lesson) => ({
    ...lesson,
    exercises: lesson.exercises.map((exercise) => {
      if (exercise.type !== "net-puzzle") return { exercise, grid: null as string | null };

      const puzzle: NetPuzzle = generatePuzzle(
        exercise.size,
        exercise.size,
        makeRng(exercise.seed)
      );
      const grid = encodePuzzle(puzzle);

      if (!decodePuzzle(grid)) {
        throw new Error(`Оньсого шалгалтад унав: ${lesson.title} (${grid})`);
      }

      return { exercise, grid };
    }),
  }));

  const puzzleStats = built.flatMap((lesson) =>
    lesson.exercises
      .filter((item) => item.grid)
      .map((item) => {
        const puzzle = decodePuzzle(item.grid)!;
        return `${puzzle.cols}×${puzzle.rows} (${puzzle.tiles.filter(isEndpoint).length} компьютер)`;
      })
  );
  console.log(`✓ ${puzzleStats.length} оньсого шалгалтад тэнцлээ: ${puzzleStats.join(", ")}`);

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

    const [existingCourse] = await db
      .select({ slug: courses.slug })
      .from(courses)
      .where(eq(courses.slug, COURSE_SLUG))
      .limit(1);

    if (!existingCourse) {
      await db.insert(courses).values({
        slug: COURSE_SLUG,
        title: "Компьютерийн сүлжээ",
        description:
          "Кабель холбож, сервер, свич, компьютер хоорондын замыг өөрөө " +
          "угсарч сүлжээ хэрхэн ажилладгийг ойлгоно.",
        icon: "globe",
        color: "cyan",
        status: "active",
        // `lib/tactiq/schools.ts` → "codely" сургууль
        school: "codely",
      });
    }

    const UNIT_TITLE = "Сүлжээний үндэс";

    const [existingUnit] = await db
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, UNIT_TITLE)))
      .limit(1);

    let unitId: string;

    if (existingUnit) {
      unitId = existingUnit.id;
    } else {
      const [created] = await db
        .insert(units)
        .values({
          courseSlug: COURSE_SLUG,
          title: UNIT_TITLE,
          color: "cyan",
          sortOrder: 0,
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
    let added = 0;
    let exerciseCount = 0;

    for (const lesson of built) {
      if (existingTitles.has(lesson.title)) continue;

      const lessonId = crypto.randomUUID();

      await db.insert(lessons).values({
        id: lessonId,
        unitId,
        title: lesson.title,
        xpReward: lesson.xp,
        sortOrder: lessonOrder++,
        createdBy: owner.uid,
      });
      added += 1;

      let exerciseOrder = 0;

      for (const { exercise, grid } of lesson.exercises) {
        await db.insert(exercises).values({
          lessonId,
          type: exercise.type,
          prompt: exercise.prompt,
          options: exercise.type === "choice" ? exercise.options : null,
          correctOptionId: exercise.type === "choice" ? exercise.correctOptionId : null,
          grid,
          explanation: exercise.explanation,
          sortOrder: exerciseOrder++,
          createdBy: owner.uid,
        });
        exerciseCount += 1;
      }
    }

    console.log(
      added === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй."
        : `✅ "Компьютерийн сүлжээ" — ${added} хичээл, ${exerciseCount} дасгал нэмэгдлээ.\n` +
            "Засах: /admin/courses/networks"
    );
  } finally {
    await pool.end();
  }
}

void main();
