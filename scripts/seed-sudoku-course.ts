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

const args = process.argv.slice(2);

/**
 * ⚠ `--force` нь БАЙГАА хичээлийн дасгалыг ШИНЭЧИЛНЭ (хуучныг устгаад
 * шинээр бичнэ). Туггүй үед скрипт зөвхөн БАЙХГҮЙГ нэмнэ — sibling
 * seed-үүдийн (`seed-puzzles-course.ts`) гэрээ тэр хэвээр.
 *
 * Дасгалыг сольсон ч ЯВЦ АЛДАГДАХГҮЙ: `lesson_progress` нь ХИЧЭЭЛИЙН
 * түвшинд (`lessonId`) бүртгэгддэг, дасгал руу заадаггүй бөгөөд дасгал
 * руу өөр ямар ч хүснэгт заадаггүй. Хичээлийн XP-г ч дагуулж шинэчилнэ.
 */
const force = args.includes("--force");
const [emailArg] = args.filter((arg) => !arg.startsWith("--"));

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:sudoku -- <email> [--force]");
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

/** Хүндрэлийн хичээл тус бүрд хэдэн хөлөг вэ. */
const PER_LESSON = 20;

/**
 * Хөлөг бүрийн ӨВӨРМӨЦ seed.
 *
 * ⚠ ДАВХАРДВАЛ ижил хөлөг хоёр хичээлд гарна — сурагч тэр дор нь анзаарна.
 * Тиймээс (хэмжээ, хүндрэл, индекс) гурвыг зайтай зурвасуудад хуваана:
 * 4×4 хөнгөн → 40000…40019, 4×4 дунд → 41000…, 9×9 хүнд → 92000… .
 * «Дүрэм» нэгжийн 101/102-той ч хөндөлдөхгүй.
 */
function seedFor(size: SudokuSize, levelIndex: number, index: number): number {
  return size * 10_000 + levelIndex * 1_000 + index;
}

const LEVELS: { level: Level; label: string }[] = [
  { level: "easy", label: "хөнгөн" },
  { level: "medium", label: "дунд" },
  { level: "hard", label: "хүнд" },
];

/**
 * Тайлбарын сан — хэмжээ, хүндрэл тус бүрд.
 *
 * ⚠ 20 хөлөгт ИЖИЛ тайлбар давтвал сурагч уншихаа болино. Тиймээс хөлөг
 * тус бүрд эндээс дараалан (индексээр) өөр зөвлөгөө хуваарилна — бүгд
 * тухайн хэмжээ/хүндрэлд ҮНЭХЭЭР хамаатай байхаар бичсэн.
 */
const TIPS: Record<SudokuSize, Record<Level, string[]>> = {
  4: {
    easy: [
      "Нэг мөрөнд аль тоо дутаж байгааг хар — 4 тооны гурав нь байвал дөрөв дэх нь шууд тодорно.",
      "Хайрцаг бүр 2×2. Гурван нүд бөглөгдсөн хайрцгийг эрж хай.",
      "Багана руу ч ижил дүрмээр хар — мөр, багана, хайрцаг гурвуулаа хүчинтэй.",
    ],
    medium: [
      "Нэг нүдэнд хоёр тоо тохирвол түүнийг ОРХИ — өөр нүднээс эхэлбэл дараа нь өөрөө тодорно.",
      "Аль тоо хамгийн олон удаа өгөгдсөн бэ? Түүнийг бүх хайрцгаас хайж эхэл.",
      "Хоёр дүрэм зэрэг шалгавал (мөр БА хайрцаг) боломж хурдан хумигдана.",
    ],
    hard: [
      "Цөөн тоо өгөгдсөн ч ГАНЦ шийдэлтэй — таах шаардлагагүй, зөвхөн тэвчээр.",
      "Нүд бүрийн боломжийг санаж бод: хамгийн цөөн боломжтойгоос эхэл.",
      "Бүх нүд тодорхойгүй санагдвал тоо тус бүрээр (1, 2, 3, 4) хайрцгуудыг шүү.",
    ],
  },
  6: {
    easy: [
      "Хайрцаг нь 2 мөр × 3 багана — ДӨРВӨЛЖИН БИШ. Зузаан шугамууд хилийг заана.",
      "6 тооны тав нь байвал зургаа дахь нь шууд тодорно.",
      "Хайрцаг өргөн тул МӨРӨӨС илүү багана руу анхаарвал хурдан гарна.",
    ],
    medium: [
      "Хайрцаг 2×3 тул нэг мөр хоёр хайрцгийг л хөндөнө — тэр хоёрыг хамт шалга.",
      "Аль тоо хамгийн олон өгөгдсөн бэ? Түүнийг зургаан хайрцгаас дараалан хай.",
      "Багана нь гурван хайрцгийг хөндөнө — багананы шалгалт илүү их мэдээлэл өгнө.",
    ],
    hard: [
      "Нүд бүрийн боломжуудыг санаж бодох чадвар эндээс хөгжинө.",
      "Хоёр нүдэнд ижил хоёр тоо л тохирвол тэр хоёр тоо бусад нүднээс хасагдана.",
      "Ганц шийдэлтэй тул мухардвал буруу тавьсан нүд байна — эргэж шалга.",
    ],
  },
  9: {
    easy: [
      "Том хөлөг ч ижил гурван дүрэм. Нэг хайрцгийг бүтэн дуусгахыг хичээ.",
      "Тоо тус бүрээр (1, 2, 3…) бүх хайрцгийг шалгах арга хамгийн тогтвортой.",
      "Олон тоо өгөгдсөн мөр, багана, хайрцгаас эхэл — тэнд боломж хамгийн цөөн.",
    ],
    medium: [
      "Гурван хайрцгийн мөрийг хамт хар: хоёрт нь тоо байвал гуравдахь нь хумигдана.",
      "Нэг хайрцагт тухайн тоо зөвхөн нэг нүдэнд тохирвол тэр нь шийдэгдсэн.",
      "Бүх нүдийг зэрэг бодох гэж БИТГИЙ хичээ — нэг тоог сонгоод түүнийг л ажилла.",
    ],
    hard: [
      "Ганц шийдэлтэй тул ТААХ шаардлагагүй — ямагт логикоор гарах нүд байна.",
      "Хоёр нүдэнд ижил хоёр тоо л тохирвол бусад нүднээс тэр хоёрыг хас.",
      "Ахиц гарахаа болиход тоо тус бүрээр бүх хайрцгийг эргүүлж шүү — нэг нь ил гарна.",
    ],
  },
};

/**
 * Хэмжээ тус бүрийн нэгж — хүндрэл бүрд `PER_LESSON` хөлөгтэй гурван хичээл.
 *
 * ⚠ XP: платформын бусад хичээл 1-3 дасгалтай, 10-30 XP авдаг. Энд хичээл
 * бүр 20 хөлөгтэй тул XP-г өсгөсөн, ГЭХДЭЭ дасгал тутмын харьцаагаар
 * (~10 XP) БИШ — эдгээр нь шинэ зүйл ЗААХ хичээл биш, ижил дүрмийг
 * давтах ДАСГАЛ. Тэр харьцаагаар өгвөл нэг хичээл 200 XP болж, лигийн
 * тэнцвэрийг бусад курсийн эсрэг эвдэнэ. Хичээл тус бүрийн XP-г админаас
 * (`/admin/courses/sudoku`) хүссэн үед засаж болно.
 */
function sizeUnit(
  size: SudokuSize,
  title: string,
  color: string,
  xp: [number, number, number]
): Unit {
  return {
    title,
    color,
    lessons: LEVELS.map(({ level, label }, levelIndex) => ({
      title: `${size}×${size} ${label}`,
      xp: xp[levelIndex],
      items: Array.from({ length: PER_LESSON }, (_, index): Spec => {
        const tips = TIPS[size][level];

        return {
          kind: "sudoku",
          prompt: `${size}×${size} ${label} — ${index + 1}/${PER_LESSON}`,
          size,
          level,
          seed: seedFor(size, levelIndex, index),
          explanation: tips[index % tips.length],
        };
      }),
    })),
  };
}

/**
 * Хөтөлбөр.
 *
 * Эхний нэгж нь ДҮРМИЙГ заана (гараар бичсэн асуулт + хоёр жижиг хөлөг),
 * дараагийн гурав нь хэмжээ тус бүрийн дасгал (програмчлан үүсгэгдсэн).
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
  sizeUnit(4, "4×4 — хөнгөнөөс хүнд", "emerald", [40, 45, 50]),
  sizeUnit(6, "6×6 — хайрцаг дөрвөлжин биш", "amber", [45, 50, 55]),
  sizeUnit(9, "9×9 — жинхэнэ судоку", "violet", [50, 55, 60]),
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
    let replacedLessons = 0;
    let removedExercises = 0;

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
        .select({ id: lessons.id, title: lessons.title, sortOrder: lessons.sortOrder })
        .from(lessons)
        .where(eq(lessons.unitId, unitId));
      const existingByTitle = new Map(existingLessons.map((row) => [row.title, row]));
      let lessonOrder = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

      for (const lesson of unit.lessons) {
        const existing = existingByTitle.get(lesson.title);

        if (existing && !force) continue;

        let lessonId: string;

        if (existing) {
          /*
           * `--force`: хичээлийг ХАДГАЛЖ (тиймээс сурагчийн явц хэвээр),
           * зөвхөн дасгалыг бүхэлд сольно. XP нь дасгалын тоотой хамт
           * өөрчлөгддөг тул түүнийг ч шинэчилнэ.
           */
          lessonId = existing.id;

          await db
            .update(lessons)
            .set({ xpReward: lesson.xp })
            .where(eq(lessons.id, lessonId));

          const removed = await db
            .delete(exercises)
            .where(eq(exercises.lessonId, lessonId))
            .returning({ id: exercises.id });

          replacedLessons += 1;
          removedExercises += removed.length;
        } else {
          lessonId = crypto.randomUUID();

          await db.insert(lessons).values({
            id: lessonId,
            unitId,
            title: lesson.title,
            xpReward: lesson.xp,
            sortOrder: lessonOrder++,
            createdBy: owner.uid,
          });
          addedLessons += 1;
        }

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

    if (addedLessons === 0 && replacedLessons === 0) {
      console.log(
        "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
          "Дасгалыг ШИНЭЧЛЭХ бол: npm run seed:sudoku -- <email> --force"
      );
    } else {
      const parts = [];
      if (addedLessons > 0) parts.push(`${addedLessons} хичээл нэмэгдлээ`);
      if (replacedLessons > 0) {
        parts.push(`${replacedLessons} хичээлийн дасгал шинэчлэгдлээ (${removedExercises} устав)`);
      }
      console.log(
        `✅ "Судоку" — ${parts.join(", ")}. Нийт ${addedExercises} дасгал бичигдлээ.\n` +
          `Засах: /admin/courses/${COURSE_SLUG}`
      );
    }
  } finally {
    await pool.end();
  }
}

void main();
