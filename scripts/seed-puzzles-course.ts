/**
 * «Puzzle» курсийг ИДЭВХЖҮҮЛЖ, оньсогын багцаар дүүргэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:puzzlepack -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: хичээлийн түвшинд давхардлыг шалгаад, зөвхөн
 * байхгүйг нь нэмнэ.
 *
 * ⚠ Судоку бүрийг ЭНД үүсгэж, `decodeSudoku`-ээр эргүүлж шалгана — тэр нь
 * ГАНЦ ШИЙДЭЛТЭЙ эсэхийг хайлтаар баталгаажуулдаг. Олон шийдэлтэй судоку
 * нь логикоор биш ТААЖ бодох тоглоом болж, хичээлийн зорилго алдагдана.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import { decodePuzzle, encodePuzzle, generatePuzzle, makeRng } from "../src/lib/net/puzzle";
import { decodeSlide, encodeSlide } from "../src/lib/puzzles/slide";
import {
  decodeSudoku,
  encodeSudoku,
  generateSudoku,
  keepForDifficulty,
  type SudokuSize,
} from "../src/lib/puzzles/sudoku";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:puzzlepack -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "puzzles";

type Spec =
  | { kind: "choice"; prompt: string; options: string[]; correct: number; explanation: string }
  | { kind: "slide"; prompt: string; size: number; explanation: string }
  | {
      kind: "sudoku";
      prompt: string;
      size: SudokuSize;
      level: "easy" | "medium" | "hard";
      seed: number;
      explanation: string;
    }
  | { kind: "net"; prompt: string; size: number; seed: number; explanation: string };

const UNITS: { title: string; color: string; lessons: { title: string; xp: number; items: Spec[] }[] }[] = [
  {
    title: "Гулсдаг оньсого",
    color: "violet",
    lessons: [
      {
        title: "Эхний алхам (3×3)",
        xp: 10,
        items: [
          {
            kind: "choice",
            prompt: "Гулсдаг оньсогод ЯМАР нүд хөдөлж чадах вэ?",
            options: [
              "Зөвхөн хоосон нүдний хажуугийнх",
              "Дурын нүд",
              "Зөвхөн буланд байгаа нүд",
            ],
            correct: 0,
            explanation:
              "Хоосон нүд бол цорын ганц «зай». Түүний хажуугийн тоо л тэр зай руу гулсана.",
          },
          {
            kind: "slide",
            prompt: "Тоонуудыг 1-ээс 8 хүртэл дарааллаар нь эмхэл.",
            size: 3,
            explanation:
              "Эхлээд ДЭЭД мөрөө бүрэн эмхэл, дараа нь түүнийг бүү хөндөөрэй — доод хэсэг рүү шилж.",
          },
          {
            kind: "slide",
            prompt: "Дахин нэг удаа — одоо илүү хурдан бодоорой.",
            size: 3,
            explanation: "Дадлага хийх тусам нүүдлийн тоо цөөрнө.",
          },
        ],
      },
      {
        title: "Сонгодог 15 (4×4)",
        xp: 20,
        items: [
          {
            kind: "slide",
            prompt: "15 тоог дарааллаар нь эмхэл. Тэвчээртэй бай!",
            size: 4,
            explanation:
              "Дээрээс доош, зүүнээс баруун тийш — мөр мөрөөр эмхлэх нь хамгийн найдвартай арга.",
          },
        ],
      },
    ],
  },
  {
    title: "Судоку",
    color: "amber",
    lessons: [
      {
        title: "Судокугийн дүрэм (4×4)",
        xp: 10,
        items: [
          {
            kind: "choice",
            prompt: "Судокугийн үндсэн дүрэм юу вэ?",
            options: [
              "Мөр, багана, хайрцаг бүрд тоо ДАВТАГДАХГҮЙ",
              "Тоонууд өсөх дарааллаар байх",
              "Хамгийн их тоо голд байх",
            ],
            correct: 0,
            explanation:
              "Гурван дүрэм гурвуулаа зэрэг биелэх ёстой: мөр, багана, хайрцаг.",
          },
          {
            kind: "sudoku",
            prompt: "4×4 судоку. 1-ээс 4 хүртэлх тоог бөглө.",
            size: 4,
            level: "easy",
            seed: 11,
            explanation: "Хамгийн цөөн сонголттой нүднээс эхэл — тэнд ихэвчлэн ганц л боломж байдаг.",
          },
          {
            kind: "sudoku",
            prompt: "Дахин 4×4. Одоо арай цөөн тоо өгөгдсөн.",
            size: 4,
            level: "medium",
            seed: 12,
            explanation: "Нэг мөрөнд аль тоо дутаж байгааг бодох нь хамгийн хурдан арга.",
          },
        ],
      },
      {
        title: "Дунд хэмжээ (6×6)",
        xp: 20,
        items: [
          {
            kind: "sudoku",
            prompt: "6×6 судоку. Хайрцаг нь 2 мөр × 3 багана.",
            size: 6,
            level: "easy",
            seed: 21,
            explanation:
              "6×6-д хайрцаг нь дөрвөлжин БИШ — 2×3. Зузаан шугамууд хайрцгийн хилийг заана.",
          },
        ],
      },
      {
        title: "Жинхэнэ судоку (9×9)",
        xp: 30,
        items: [
          {
            kind: "sudoku",
            prompt: "9×9 судоку. Тэвчээр, логик хоёр л хэрэгтэй.",
            size: 9,
            level: "easy",
            seed: 31,
            explanation:
              "Нэг нүдэнд ганц л тоо багтах газрыг хайх, эсвэл нэг тоо ямар мөрөнд заавал орохыг олох — хоёр гол арга.",
          },
        ],
      },
    ],
  },
  {
    title: "Сүлжээний оньсого",
    color: "cyan",
    lessons: [
      {
        title: "Кабель холбох",
        xp: 15,
        items: [
          {
            kind: "net",
            prompt: "Кабелиудыг эргүүлж, бүх компьютерийг сервертэй холбо.",
            size: 4,
            seed: 41,
            explanation: "Серверээс эхэлж, мөчир бүрийг дагаж шалгах нь хамгийн хурдан.",
          },
          {
            kind: "net",
            prompt: "Илүү том сүлжээ.",
            size: 5,
            seed: 42,
            explanation: "Аль хэдийн гэрэлтсэн (холбогдсон) хэсгээ бүү хөндөөрэй.",
          },
        ],
      },
    ],
  },
  {
    title: "Холимог сорил",
    color: "rose",
    lessons: [
      {
        title: "Гурван оньсого",
        xp: 30,
        items: [
          {
            kind: "slide",
            prompt: "1/3 — гулсдаг оньсого.",
            size: 3,
            explanation: "Эхний оньсого дууслаа.",
          },
          {
            kind: "sudoku",
            prompt: "2/3 — судоку.",
            size: 4,
            level: "medium",
            seed: 51,
            explanation: "Хоёр дахь нь ч бүтлээ.",
          },
          {
            kind: "net",
            prompt: "3/3 — сүлжээ.",
            size: 4,
            seed: 52,
            explanation: "Гурвуулаа өөр төрлийн сэтгэлгээ шаарддаг — гурвыг нь чадвал бэрх нь алга!",
          },
        ],
      },
    ],
  },
];

/** Дасгалын өгөгдлийг бэлдэж, ЗААВАЛ эргүүлж шалгана. */
function buildGrid(spec: Spec): string | null {
  if (spec.kind === "choice") return null;

  if (spec.kind === "slide") {
    const grid = encodeSlide(spec.size);
    if (!decodeSlide(grid)) throw new Error(`Гулсдаг оньсого буруу: ${grid}`);
    return grid;
  }

  if (spec.kind === "sudoku") {
    const sudoku = generateSudoku(
      spec.size,
      keepForDifficulty(spec.size, spec.level),
      makeRng(spec.seed)
    );
    const grid = encodeSudoku(sudoku);
    // `decodeSudoku` нь ганц шийдэлтэй эсэхийг хайлтаар шалгана.
    if (!decodeSudoku(grid)) throw new Error(`Судоку шалгалтад унав: ${spec.size}×${spec.size}`);
    return grid;
  }

  const puzzle = generatePuzzle(spec.size, spec.size, makeRng(spec.seed));
  const grid = encodePuzzle(puzzle);
  if (!decodePuzzle(grid)) throw new Error(`Сүлжээний оньсого буруу: ${grid}`);
  return grid;
}

const OPTION_IDS = ["a", "b", "c", "d"];

async function main() {
  // Санд хүрэхээс ӨМНӨ бүх оньсогыг үүсгэж шалгана — нэг нь ч буруу бол
  // юу ч бичихгүй (хагас бичигдсэн курс нь idempotent шалгалтыг хуурна).
  const built = UNITS.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      items: lesson.items.map((spec) => ({ spec, grid: buildGrid(spec) })),
    })),
  }));

  const counts = built
    .flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.items))
    .reduce<Record<string, number>>((acc, item) => {
      acc[item.spec.kind] = (acc[item.spec.kind] ?? 0) + 1;
      return acc;
    }, {});
  console.log(
    "✓ Бүх оньсого шалгалтад тэнцлээ: " +
      Object.entries(counts)
        .map(([kind, n]) => `${kind}=${n}`)
        .join(", ")
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
        title: "Puzzle",
        description:
          "Гулсдаг оньсого, судоку, сүлжээний холболт — логик, орон зайн " +
          "сэтгэлгээг хөгжүүлэх тоглоомууд.",
        icon: "puzzle",
        color: "violet",
        status: "active",
        school: "mind",
      });
    } else if (course.status !== "active") {
      // Курс нь "coming-soon" төлөвтэй байсан — агуулга орж ирсэн тул
      // сурагчид сонгох боломжтой болгоно.
      await db
        .update(courses)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(courses.slug, COURSE_SLUG));
      console.log('"Puzzle" курс "coming-soon" → "active" боллоо.');
    }

    let addedLessons = 0;
    let addedExercises = 0;

    for (const [unitIndex, unit] of built.entries()) {
      const [existingUnit] = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, unit.title)))
        .limit(1);

      let unitId: string;

      if (existingUnit) {
        unitId = existingUnit.id;
      } else {
        const [created] = await db
          .insert(units)
          .values({
            courseSlug: COURSE_SLUG,
            title: unit.title,
            color: unit.color,
            sortOrder: unitIndex,
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

      for (const lesson of unit.lessons) {
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
        addedLessons += 1;

        let exerciseOrder = 0;

        for (const { spec, grid } of lesson.items) {
          const type =
            spec.kind === "choice"
              ? "choice"
              : spec.kind === "slide"
                ? "slide-puzzle"
                : spec.kind === "sudoku"
                  ? "sudoku"
                  : "net-puzzle";

          await db.insert(exercises).values({
            lessonId,
            type,
            prompt: spec.prompt,
            options:
              spec.kind === "choice"
                ? spec.options.map((label, i) => ({ id: OPTION_IDS[i], label }))
                : null,
            correctOptionId: spec.kind === "choice" ? OPTION_IDS[spec.correct] : null,
            grid,
            explanation: spec.explanation,
            sortOrder: exerciseOrder++,
            createdBy: owner.uid,
          });
          addedExercises += 1;
        }
      }
    }

    console.log(
      addedLessons === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй."
        : `✅ "Puzzle" — ${addedLessons} хичээл, ${addedExercises} дасгал нэмэгдлээ.\n` +
            "Засах: /admin/courses/puzzles"
    );
  } finally {
    await pool.end();
  }
}

void main();
