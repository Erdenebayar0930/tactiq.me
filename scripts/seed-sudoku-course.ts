/**
 * «Судоку» курсийг үүсгэж, 4×4 → 6×6 → 9×9 хөтөлбөрөөр дүүргэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:sudoku -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: нэгжийг гарчгаар, хичээлийг гарчгаар шалгаад
 * зөвхөн БАЙХГҮЙГ нэмнэ (`seed-puzzles-course.ts`-ийн адил).
 *
 * ⚠ Судоку бүрийг САНД ХҮРЭХЭЭС ӨМНӨ үүсгэж, `decodeSudoku`-ээр эргүүлж
 * шалгана — тэр нь ГАНЦ ШИЙДЭЛТЭЙ эсэхийг хайлтаар баталгаажуулдаг. Олон
 * шийдэлтэй судоку нь логикоор биш ТААЖ бодох тоглоом болж, хичээлийн
 * зорилго бүхэлдээ алдагдана. Нэг нь ч унавал юу ч бичихгүй.
 *
 * ⚠ ЯАГААД ХЭМЖЭЭГЭЭР НЭГЖЛЭВ: 9×9 нь эхлэн суралцагчид хэт том — эхний
 * дасгал дээр урам хугална (`lib/puzzles/sudoku.ts`-ийн тайлбар). Тиймээс
 * 4×4-өөр дүрмийг эхлээд ойлгуулж, хэмжээг ТОМСГОХ нь хүндрэлийг
 * нэмэгдүүлэхээс ӨМНӨ явагдана. Нэгж дотор л хөнгөн → дунд → хүнд.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { makeRng } from "../src/lib/net/puzzle";
import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import {
  decodeSudoku,
  encodeSudoku,
  generateSudoku,
  keepForDifficulty,
  type SudokuSize,
} from "../src/lib/puzzles/sudoku";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:sudoku -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "sudoku";

type Level = "easy" | "medium" | "hard";

type Spec =
  | { kind: "choice"; prompt: string; options: string[]; correct: number; explanation: string }
  | {
      kind: "sudoku";
      prompt: string;
      size: SudokuSize;
      level: Level;
      /** ⚠ ӨВӨРМӨЦ байх ёстой — ижил seed ижил хөлөг гаргана. */
      seed: number;
      explanation: string;
    };

type Unit = {
  title: string;
  color: string;
  lessons: { title: string; xp: number; items: Spec[] }[];
};

/**
 * Хөтөлбөр.
 *
 * `seed` нь нэгж тус бүрд өөр зуутаар (100, 200, …) — санамсаргүй ижил
 * хөлөг хоёр хичээлд давхардахаас сэргийлнэ.
 */
const UNITS: Unit[] = [
  {
    title: "Дүрэм (4×4)",
    color: "sky",
    lessons: [
      {
        title: "Судоку гэж юу вэ?",
        xp: 10,
        items: [
          {
            kind: "choice",
            prompt: "Судокугийн үндсэн дүрэм юу вэ?",
            options: [
              "Мөр, багана, хайрцаг бүрд тоо давтагдахгүй",
              "Зөвхөн мөрөнд тоо давтагдахгүй",
              "Тоонуудыг өсөхөөр эрэмбэлнэ",
              "Хамгийн их тоог дунд нь тавина",
            ],
            correct: 0,
            explanation:
              "Гурван дүрэм ЗЭРЭГ биелэх ёстой: мөр, багана, хайрцаг. Гурвуулаа " +
              "зөв байж л судоку шийдэгдсэн гэж тооцно.",
          },
          {
            kind: "choice",
            prompt: "4×4 судокуд ямар тоонууд хэрэглэгдэх вэ?",
            options: ["1-ээс 4", "0-ээс 4", "1-ээс 9", "1-ээс 16"],
            correct: 0,
            explanation:
              "Хэмжээ нь хэрэглэх тоог хэлнэ: 4×4 → 1-4, 6×6 → 1-6, 9×9 → 1-9.",
          },
          {
            kind: "sudoku",
            prompt: "Эхний судоку. 4×4 — 1-ээс 4 хүртэлх тоог бөглө.",
            size: 4,
            level: "easy",
            seed: 101,
            explanation:
              "Хамгийн цөөн боломжтой нүднээс эхэл — тэнд ихэвчлэн ганц л тоо тохирно.",
          },
        ],
      },
      {
        title: "Хайрцаг гэж юу вэ?",
        xp: 10,
        items: [
          {
            kind: "choice",
            prompt: "4×4 судокугийн хайрцаг ямар хэмжээтэй вэ?",
            options: ["2×2", "1×4", "4×4", "2×3"],
            correct: 0,
            explanation:
              "4×4 нь дөрвөн 2×2 хайрцагт хуваагдана. Зузаан шугамууд хайрцгийн хилийг заана.",
          },
          {
            kind: "sudoku",
            prompt: "Хайрцаг бүрийг шалгаж бөглө.",
            size: 4,
            level: "easy",
            seed: 102,
            explanation:
              "Мөр, багана нь тодорхойгүй үед ХАЙРЦГИЙГ хар — тэнд дутуу тоо шууд харагддаг.",
          },
        ],
      },
    ],
  },
  {
    title: "4×4 — хөнгөнөөс хүнд",
    color: "emerald",
    lessons: [
      {
        title: "4×4 хөнгөн",
        xp: 15,
        items: [
          {
            kind: "sudoku",
            prompt: "4×4 хөнгөн. Олон тоо өгөгдсөн.",
            size: 4,
            level: "easy",
            seed: 201,
            explanation: "Нэг мөрөнд аль тоо дутаж байгааг бодох нь хамгийн хурдан арга.",
          },
          {
            kind: "sudoku",
            prompt: "Дахин 4×4 хөнгөн.",
            size: 4,
            level: "easy",
            seed: 202,
            explanation: "Дүрэм гурвыг дараалан шалгах дадал эндээс тогтоно.",
          },
        ],
      },
      {
        title: "4×4 дунд",
        xp: 20,
        items: [
          {
            kind: "sudoku",
            prompt: "4×4 дунд. Өгөгдсөн тоо цөөрлөө.",
            size: 4,
            level: "medium",
            seed: 211,
            explanation:
              "Нэг нүдэнд хоёр тоо тохирвол тэр нүдийг ОРХИ — өөр нүднээс эхэлбэл " +
              "дараа нь тэр өөрөө тодорно.",
          },
          {
            kind: "sudoku",
            prompt: "Дахин 4×4 дунд.",
            size: 4,
            level: "medium",
            seed: 212,
            explanation: "Таамаглах шаардлагагүй — ямагт логикоор гарах нүд байдаг.",
          },
        ],
      },
      {
        title: "4×4 хүнд",
        xp: 25,
        items: [
          {
            kind: "sudoku",
            prompt: "4×4 хүнд. Хамгийн цөөн тоо өгөгдсөн.",
            size: 4,
            level: "hard",
            seed: 221,
            explanation:
              "Хүнд хөлөг ч ГАНЦ шийдэлтэй — тэвчээртэй шалгавал зөв нүд ямагт олдоно.",
          },
        ],
      },
    ],
  },
  {
    title: "6×6 — хайрцаг дөрвөлжин биш",
    color: "amber",
    lessons: [
      {
        title: "6×6 хөнгөн",
        xp: 20,
        items: [
          {
            kind: "choice",
            prompt: "6×6 судокугийн хайрцаг ямар хэмжээтэй вэ?",
            options: ["2 мөр × 3 багана", "3×3", "6×6", "2×2"],
            correct: 0,
            explanation:
              "6×6-д хайрцаг нь ДӨРВӨЛЖИН БИШ — 2 мөр, 3 багана. Үүнийг мартвал " +
              "хайрцгийн шалгалт бүхэлдээ буруу болно.",
          },
          {
            kind: "sudoku",
            prompt: "6×6 хөнгөн. 1-ээс 6 хүртэлх тоог бөглө.",
            size: 6,
            level: "easy",
            seed: 301,
            explanation: "Зузаан шугамууд 2×3 хайрцгийн хилийг заана — тэднийг дага.",
          },
        ],
      },
      {
        title: "6×6 дунд",
        xp: 25,
        items: [
          {
            kind: "sudoku",
            prompt: "6×6 дунд.",
            size: 6,
            level: "medium",
            seed: 311,
            explanation: "Хайрцаг нь 2×3 тул мөрөөс илүү БАГАНА руу анхаарвал хурдан гарна.",
          },
          {
            kind: "sudoku",
            prompt: "Дахин 6×6 дунд.",
            size: 6,
            level: "medium",
            seed: 312,
            explanation: "Аль тоо хамгийн олон удаа өгөгдсөн бэ? Түүнээс эхлэх нь дөт.",
          },
        ],
      },
      {
        title: "6×6 хүнд",
        xp: 30,
        items: [
          {
            kind: "sudoku",
            prompt: "6×6 хүнд.",
            size: 6,
            level: "hard",
            seed: 321,
            explanation: "Нүд бүрийн боломжуудыг санаж бодох чадвар эндээс хөгжинө.",
          },
        ],
      },
    ],
  },
  {
    title: "9×9 — жинхэнэ судоку",
    color: "violet",
    lessons: [
      {
        title: "9×9 хөнгөн",
        xp: 30,
        items: [
          {
            kind: "sudoku",
            prompt: "9×9 хөнгөн. Тэвчээр, логик хоёр л хэрэгтэй.",
            size: 9,
            level: "easy",
            seed: 401,
            explanation:
              "Том хөлөг ч ижил гурван дүрэм. Нэг хайрцгийг бүтэн дуусгахыг хичээ.",
          },
        ],
      },
      {
        title: "9×9 дунд",
        xp: 35,
        items: [
          {
            kind: "sudoku",
            prompt: "9×9 дунд.",
            size: 9,
            level: "medium",
            seed: 411,
            explanation:
              "Тоо тус бүрээр (1, 2, 3…) бүх хайрцгийг шалгах арга нь хамгийн тогтвортой.",
          },
        ],
      },
      {
        title: "9×9 хүнд",
        xp: 40,
        items: [
          {
            kind: "sudoku",
            prompt: "9×9 хүнд. Хөтөлбөрийн хамгийн хүнд хөлөг.",
            size: 9,
            level: "hard",
            seed: 421,
            explanation:
              "Ганц шийдэлтэй тул ТААХ шаардлагагүй — ямагт логикоор гарах нүд байна.",
          },
        ],
      },
    ],
  },
];

/** Дасгалын хөлгийг бэлдэж, ЗААВАЛ эргүүлж шалгана. */
function buildGrid(spec: Spec): string | null {
  if (spec.kind === "choice") return null;

  const sudoku = generateSudoku(
    spec.size,
    keepForDifficulty(spec.size, spec.level),
    makeRng(spec.seed)
  );
  const grid = encodeSudoku(sudoku);

  // `decodeSudoku` нь ганц шийдэлтэй эсэхийг хайлтаар шалгана.
  if (!decodeSudoku(grid)) {
    throw new Error(`Судоку шалгалтад унав: ${spec.size}×${spec.size} (seed ${spec.seed})`);
  }

  return grid;
}

const OPTION_IDS = ["a", "b", "c", "d"];

async function main() {
  /*
   * ⚠ Санд хүрэхээс ӨМНӨ бүх хөлгийг үүсгэж шалгана — нэг нь ч буруу бол
   * юу ч бичихгүй. Хагас бичигдсэн курс нь дахин ажиллуулах үеийн
   * давхардлын шалгалтыг хуурч, дутуу хичээл мөнхөд үлдэнэ.
   *
   * Хөлөг үүсгэх нь хямд: нүд хасах бүрд «ганц шийдэлтэй хэвээр юу» гэсэн
   * хайлт явуулдаг ч хэмжсэнээр 9×9 хүнд нь ~7ms, бүх 14 хөлөг нийлээд
   * 25ms-аас бага. Тиймээс энд хүлээлт гэж байхгүй.
   */
  console.log("Хөлгүүдийг үүсгэж шалгаж байна…");

  const built = UNITS.map((unit) => ({
    ...unit,
    lessons: unit.lessons.map((lesson) => ({
      ...lesson,
      items: lesson.items.map((spec) => ({ spec, grid: buildGrid(spec) })),
    })),
  }));

  const bySize = built
    .flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.items))
    .reduce<Record<string, number>>((acc, { spec }) => {
      const key = spec.kind === "choice" ? "асуулт" : `${spec.size}×${spec.size}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

  console.log(
    "✓ Бүгд шалгалтад тэнцлээ: " +
      Object.entries(bySize)
        .map(([key, n]) => `${key}=${n}`)
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
        title: "Судоку",
        titleEn: "Sudoku",
        description:
          "4×4-өөс 9×9 хүртэл. Дүрмийг жижиг хөлгөөр ойлгоод, хэмжээ, " +
          "хүндрэлийг шатлан нэмнэ. Хөлөг бүр ГАНЦ шийдэлтэй тул таах " +
          "шаардлагагүй — зөвхөн логик.",
        descriptionEn:
          "From 4×4 to 9×9. Learn the rules on a small grid, then step up in " +
          "size and difficulty. Every puzzle has exactly one solution, so " +
          "logic alone is enough.",
        icon: "grid",
        color: "sky",
        status: "active",
        // `lib/tactiq/schools.ts` → "mind" сургууль (логик, стратеги).
        school: "mind",
        schools: ["mind"],
      });
      console.log('"Судоку" курс үүслээ.');
    } else if (course.status !== "active") {
      await db
        .update(courses)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(courses.slug, COURSE_SLUG));
      console.log('"Судоку" курс "coming-soon" → "active" боллоо.');
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
          await db.insert(exercises).values({
            lessonId,
            type: spec.kind === "choice" ? "choice" : "sudoku",
            prompt: spec.prompt,
            options:
              spec.kind === "choice"
                ? spec.options.map((label, index) => ({ id: OPTION_IDS[index], label }))
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
        : `✅ "Судоку" — ${addedLessons} хичээл, ${addedExercises} дасгал нэмэгдлээ.\n` +
            `Засах: /admin/courses/${COURSE_SLUG}`
    );
  } finally {
    await pool.end();
  }
}

void main();
