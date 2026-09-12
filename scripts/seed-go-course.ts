/**
 * «Го (囲碁)» курсийг үүсгэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:go -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: курс байвал ХИЧЭЭЛИЙН түвшинд давхардлыг
 * шалгаад, зөвхөн байхгүйг нь нэмнэ (`seed-networks-course.ts`-тэй ижил
 * зарчим).
 *
 * ⚠ Байрлал бүрийг ЭНД тоглож шалгана: зөв хариулт нь ХУУЛЬ ЁСНЫ эсэх,
 * мөн хичээлийн санаанд нийцэж яг хэдэн чулуу барих ёстой эсэх. Шалгалтад
 * унасан дасгалыг санд ОРУУЛАХГҮЙ — эс бөгөөс сурагч тавьж болохгүй цэг
 * дээр «зөв хариулт» хайж гацна.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { randomUUID } from "node:crypto";

import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import {
  encodeGo,
  formatPointList,
  parsePoint,
  play,
  type GoPosition,
  type Stone,
} from "../src/lib/go/position";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:go -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

/**
 * ⚠ slug нь ЗААВАЛ "go" — `lib/tactiq/courseNav.ts`-ийн `GO_COURSES` энэ
 * нэрээр л "go-move" дасгалыг зөвшөөрдөг.
 */
const COURSE_SLUG = "go";
const SIZE = 9;

/** Цэгийн нэрээр (E5) байрлал угсарна — координат гараар тоолохоос найдвартай. */
function position(black: string[], white: string[], turn: Stone): GoPosition {
  const cells: (Stone | null)[] = Array.from({ length: SIZE * SIZE }, () => null);

  for (const [color, points] of [
    ["b", black],
    ["w", white],
  ] as const) {
    for (const label of points) {
      const index = parsePoint(SIZE, label);
      if (index === null) throw new Error(`Буруу цэг: ${label}`);
      cells[index] = color;
    }
  }

  return { size: SIZE, cells, turn };
}

type SeedExercise =
  | {
      type: "choice";
      prompt: string;
      options: { id: string; label: string }[];
      correctOptionId: string;
      explanation: string;
    }
  | {
      type: "go-move";
      prompt: string;
      black: string[];
      white: string[];
      turn: Stone;
      /** Зөв хариулт — тэгш хэмтэй байрлалд хэд хэдэн байж болно */
      answers: string[];
      /** Зөв нүүдэл хэдэн чулуу барих ёстой вэ (шалгалтад) */
      captures: number;
      explanation: string;
    };

/**
 * Хичээлийн дараалал: дүрэм → амьсгал → барих → атари → «амиа хорлох мэт
 * харагдах» барилт. Го-гийн бүх тактик амьсгалын ойлголт дээр тогддог тул
 * түүнийг ЭХЭНД тавьж, олон талаас нь давтуулна.
 */
const LESSONS: { title: string; xp: number; exercises: SeedExercise[] }[] = [
  {
    title: "Го гэж юу вэ",
    xp: 10,
    exercises: [
      {
        type: "choice",
        prompt: "Го тоглоомд чулуугаа хаана тавих вэ?",
        options: [
          { id: "a", label: "Шугамуудын ОГТЛОЛЦОЛ дээр" },
          { id: "b", label: "Дөрвөлжин нүдэн дотор" },
          { id: "c", label: "Хөлгийн зөвхөн захад" },
        ],
        correctOptionId: "a",
        explanation:
          "Шатраас ялгаатай нь го-д чулуу нүдэн дотор биш, шугамын огтлолцол " +
          "дээр тавигдана. Тавьсан чулуу цаашид ХӨДӨЛДӨГГҮЙ.",
      },
      {
        type: "choice",
        prompt: "Го-гийн зорилго юу вэ?",
        options: [
          { id: "a", label: "Хөлөг дээр илүү их ТАЛБАЙ эзлэх" },
          { id: "b", label: "Өрсөлдөгчийн хааныг барих" },
          { id: "c", label: "Бүх чулуугаа хөлөг дээр тавьж дуусгах" },
        ],
        correctOptionId: "a",
        explanation:
          "Го бол талбайн тоглоом: тоглолт дуусахад хэн илүү их огтлолцлыг " +
          "тойрч эзэлсэн нь ялна. Чулуу барих нь зорилго БИШ, харин арга.",
      },
      {
        type: "go-move",
        prompt: "Хөлгийн голд байгаа «од» цэг (E5) дээр хар чулуугаа тавина уу.",
        black: [],
        white: [],
        turn: "b",
        answers: ["E5"],
        captures: 0,
        explanation:
          "Хөлөг дээрх бүдүүн цэгүүдийг «од» (hoshi) гэнэ. 9×9 хөлгийн голын " +
          "од нь E5 — эндээс эхлэх нь хамгийн тэнцвэртэй.",
      },
    ],
  },
  {
    title: "Амьсгал",
    xp: 15,
    exercises: [
      {
        type: "choice",
        prompt: "Чулууны «амьсгал» (liberty) гэж юу вэ?",
        options: [
          { id: "a", label: "Чулуутай ШУУД залгаа хоосон огтлолцол" },
          { id: "b", label: "Чулууны эргэн тойрны бүх огтлолцол" },
          { id: "c", label: "Чулууны доорх шугам" },
        ],
        correctOptionId: "a",
        explanation:
          "Амьсгал бол дээш, доош, зүүн, баруун талын ХООСОН огтлолцол. " +
          "Ташуу тал тооцогдохгүй.",
      },
      {
        type: "choice",
        prompt: "Бүх амьсгал нь хаагдсан чулуунд юу тохиолдох вэ?",
        options: [
          { id: "a", label: "Хөлгөөс АВАГДАНА" },
          { id: "b", label: "Өнгөө сольдог" },
          { id: "c", label: "Юу ч болохгүй" },
        ],
        correctOptionId: "a",
        explanation:
          "Амьсгалгүй үлдсэн чулуу (эсвэл бүлэг) шууд хөлгөөс авагдаж, " +
          "өрсөлдөгчийн олзны сав руу орно.",
      },
      {
        type: "go-move",
        prompt: "Цагаан чулууны СҮҮЛИЙН амьсгалыг хааж, түүнийг барина уу.",
        black: ["C5", "D6", "D4"],
        white: ["D5"],
        turn: "b",
        answers: ["E5"],
        captures: 1,
        explanation:
          "Цагаан D5-ын дөрвөн амьсгалаас гурав нь аль хэдийн хаагдсан. " +
          "E5 дээр тавихад сүүлийнх нь хаагдаж, чулуу авагдана.",
      },
    ],
  },
  {
    title: "Бүлгийг барих",
    xp: 15,
    exercises: [
      {
        type: "choice",
        prompt: "Хоёр чулуу хажуу хажуудаа байвал юу болох вэ?",
        options: [
          { id: "a", label: "Нэг БҮЛЭГ болж, амьсгалаа хуваалцана" },
          { id: "b", label: "Тус тусдаа, бие даасан хэвээр байна" },
          { id: "c", label: "Хоёулаа хүчгүй болно" },
        ],
        correctOptionId: "a",
        explanation:
          "Залгаа, ижил өнгийн чулуунууд нэг бүлэг болно. Бүлэг бүхэлдээ " +
          "амьд эсвэл бүхэлдээ авагдана — нэг нэгээрээ БИШ.",
      },
      {
        type: "go-move",
        prompt: "Хоёр цагаан чулууг нэг дор барина уу.",
        black: ["C5", "D6", "E6", "D4", "E4"],
        white: ["D5", "E5"],
        turn: "b",
        answers: ["F5"],
        captures: 2,
        explanation:
          "D5, E5 нь НЭГ бүлэг тул амьсгалаа хуваалцана. F5 нь тэдний " +
          "сүүлийн амьсгал — хаамагц хоёулаа хамт авагдана.",
      },
    ],
  },
  {
    title: "Атари",
    xp: 15,
    exercises: [
      {
        type: "choice",
        prompt: "«Атари» гэж юу вэ?",
        options: [
          { id: "a", label: "Ердөө НЭГ амьсгал үлдсэн байдал" },
          { id: "b", label: "Чулуу авагдсаны дараах байдал" },
          { id: "c", label: "Хөлгийн зах" },
        ],
        correctOptionId: "a",
        explanation:
          "Атари гэдэг нь «дараагийн нүүдэлд авагдаж магадгүй» гэсэн " +
          "сануулга. Атарид орсон бүлэг зугтах эсвэл өргөжих ёстой.",
      },
      {
        type: "go-move",
        prompt: "Цагаан чулууг атарид оруулна уу (ганц амьсгалтай болго).",
        black: ["D5", "E6"],
        white: ["E5"],
        turn: "b",
        answers: ["E4", "F5"],
        captures: 0,
        explanation:
          "E5-д хоёр амьсгал (E4, F5) үлдсэн. Аль нэгийг нь хаавал ганц " +
          "амьсгалтай буюу атарид орно — хоёулаа зөв хариулт.",
      },
    ],
  },
  {
    title: "Амиа хорлох ба барих",
    xp: 20,
    exercises: [
      {
        type: "choice",
        prompt: "Өөрийн чулууг амьсгалгүй болгох нүүдлийг юу гэх вэ?",
        options: [
          { id: "a", label: "Амиа хорлолт — ХОРИОТОЙ нүүдэл" },
          { id: "b", label: "Атари" },
          { id: "c", label: "Зөвшөөрөгдсөн, зүгээр л сул нүүдэл" },
        ],
        correctOptionId: "a",
        explanation:
          "Амьсгалгүй үлдэх цэг дээр тавихыг хориглоно. ГАНЦ ЯЛГААТАЙ " +
          "тохиолдол: тэр нүүдэл өрсөлдөгчийн бүлгийг БАРЬЖ байвал зөвшөөрөгдөнө.",
      },
      {
        type: "go-move",
        prompt:
          "E5 нь цагаанаар бүслэгдсэн харагдаж байна. Гэсэн ч тэнд тавьж болно — яагаадыг нь олоод барина уу.",
        black: ["C5", "D4", "D6"],
        white: ["D5", "E4", "E6", "F5"],
        turn: "b",
        answers: ["E5"],
        captures: 1,
        explanation:
          "E5 дээр тавихад хар чулуу эхлээд амьсгалгүй мэт харагдана. Гэвч " +
          "энэ нүүдэл цагаан D5-ыг БАРЬЖ байгаа тул D5 хоосорч, хар чулуу " +
          "амьсгалтай болно. Барилт үргэлж эхэлж бодогдоно.",
      },
    ],
  },
];

/**
 * Дасгал бүрийг БОДИТООР тоглож шалгана.
 *
 * Санд орохоос ӨМНӨ: зөв хариулт бүр хууль ёсны эсэх, мөн хичээлийн
 * санаанд нийцэж яг тэдэн чулуу барьж байгаа эсэх.
 */
function buildExercise(exercise: SeedExercise) {
  if (exercise.type === "choice") {
    return { exercise, grid: null, solution: null };
  }

  const start = position(exercise.black, exercise.white, exercise.turn);

  for (const label of exercise.answers) {
    const index = parsePoint(SIZE, label);
    if (index === null) throw new Error(`Буруу цэг: ${label}`);

    const result = play(start, index);
    if (!result) {
      throw new Error(`«${exercise.prompt}» — ${label} дээр тавих нь хууль бус.`);
    }
    if (result.captured.length !== exercise.captures) {
      throw new Error(
        `«${exercise.prompt}» — ${label} нь ${result.captured.length} чулуу барьж байна ` +
          `(хүлээгдсэн: ${exercise.captures}).`
      );
    }
  }

  const points = exercise.answers.map((label) => parsePoint(SIZE, label)!);
  return { exercise, grid: encodeGo(start), solution: formatPointList(SIZE, points) };
}

async function main() {
  const built = LESSONS.map((lesson) => ({
    ...lesson,
    exercises: lesson.exercises.map(buildExercise),
  }));

  const checked = built.reduce(
    (total, lesson) => total + lesson.exercises.filter((item) => item.grid !== null).length,
    0
  );
  console.log(`✓ ${checked} го-гийн дасгал шалгалтад тэнцлээ.`);

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
        title: "Го (囲碁)",
        description:
          "Дэлхийн хамгийн эртний стратегийн тоглоом. Амьсгал, барилт, " +
          "талбай эзлэх зарчмыг 9×9 хөлөг дээр гараараа тоглож сурна.",
        icon: "circle-dot",
        color: "amber",
        status: "active",
        // `lib/tactiq/schools.ts` → "mind" сургууль (Шатар, Даамтай нэг гэр)
        school: "mind",
      });
    }

    const UNIT_TITLE = "Го-гийн үндэс";

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
          color: "amber",
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

      const lessonId = randomUUID();

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

      for (const { exercise, grid, solution } of lesson.exercises) {
        await db.insert(exercises).values({
          lessonId,
          type: exercise.type,
          prompt: exercise.prompt,
          options: exercise.type === "choice" ? exercise.options : null,
          correctOptionId: exercise.type === "choice" ? exercise.correctOptionId : null,
          grid,
          solution,
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
        : `✅ "Го" — ${added} хичээл, ${exerciseCount} дасгал нэмэгдлээ.\n` +
            "Засах: /admin/courses/go"
    );
  } finally {
    await pool.end();
  }
}

void main();
