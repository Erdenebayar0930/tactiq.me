/**
 * «Бяцхан кодчин» курсийг ITkids сургуульд үүсгэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:coding -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: хичээлийн түвшинд давхардлыг шалгаад, зөвхөн
 * байхгүйг нь нэмнэ.
 *
 * ⚠ Лабиринт бүрийг ЭНД `decodeMaze`-ээр эргүүлж шалгана — тэр нь зам
 * нээлттэй эсэх, блокийн хязгаарт багтах эсэхийг ХАЙЛТААР баталгаажуулдаг.
 * Шийдэгдэхгүй түвшин санд орвол сурагч хичээл дунд бүрмөсөн гацна.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import { decodeMaze, minimalBlocks, shortestProgram } from "../src/lib/code/maze";
import type { Direction } from "../src/lib/code/maze";

const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:coding -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "kids-coding";

/**
 * ⚠ slug нь ЗААВАЛ "kids-coding" — `lib/tactiq/courseNav.ts`-ийн
 * `CODE_MAZE_COURSES` энэ нэрээр л "code-maze" дасгалыг зөвшөөрдөг.
 */

type Item =
  | { kind: "choice"; prompt: string; options: string[]; correct: number; explanation: string }
  | {
      kind: "maze";
      prompt: string;
      /**
       * Лабиринтыг МӨР МӨРӨӨР бичнэ — нэг урт мөрөөр биш.
       *
       * ⚠ Урт мөрөөр бичих үед тэмдэгтийн тоо амархан зөрдөг (энэ файл
       * дээр бодитоор гарсан: 4×4 гэж бичээд 17 тэмдэгт өгсөн). Мөр
       * мөрөөр бичвэл хэмжээ нь НҮДЭЭР харагдана, багана нь автоматаар
       * эхний мөрийн уртаас тодорхойлогдоно.
       */
      rows: string[];
      facing: Direction;
      /** Блокийн хязгаар — өгвөл сурагчид «Давтах» блок гарч ирнэ. */
      limit?: number;
      explanation: string;
    };

/** Мөрүүдээс хадгалах мөр угсарна. */
function buildMaze(item: Extract<Item, { kind: "maze" }>): string {
  const cols = item.rows[0].length;
  const limit = item.limit ? `:${item.limit}` : "";
  return `maze:${cols}x${item.rows.length}:${item.facing}:${item.rows.join("")}${limit}`;
}

/**
 * ТҮВШНҮҮД — хялбараас хүнд рүү, ойлголт бүрийг НЭГ НЭГЭЭР нэмнэ:
 *
 *   1. Дараалал   — зөвхөн «Урагш»
 *   2. Эргэлт     — «Зүүн/Баруун» нэмэгдэнэ
 *   3. Давталт    — блокийн ХЯЗГААР гарч ирснээр давталт зайлшгүй болно
 *
 * ⚠ Давталтын товч нь ЗӨВХӨН хязгаартай түвшинд харагдана
 * (`CodeMazeExercise`) — тиймээс 3-р нэгжийн лабиринт бүр хязгаартай.
 */
const UNITS: {
  title: string;
  color: string;
  lessons: { title: string; xp: number; items: Item[] }[];
}[] = [
  {
    title: "Дараалал",
    color: "emerald",
    lessons: [
      {
        title: "Эхний тушаал",
        xp: 10,
        items: [
          {
            kind: "choice",
            prompt: "«Программ» гэж юу вэ?",
            options: [
              "Компьютерт өгөх тушаалуудын ДАРААЛАЛ",
              "Компьютерийн дэлгэц",
              "Интернэтийн хаяг",
            ],
            correct: 0,
            explanation:
              "Программ бол жор шиг: тушаалуудыг зөв ДАРААЛЛААР бичвэл л " +
              "зөв үр дүн гарна.",
          },
          {
            kind: "maze",
            prompt: "Туулайг лууван руу хүргэ. «Урагш» тушаалыг ашигла.",
            rows: ["S.G", "...", "..."],
            facing: "E",
            explanation: "Тушаал бүр нэг нүд урагшилна. Хоёр нүд явахын тулд хоёр тушаал.",
          },
          {
            kind: "maze",
            prompt: "Одоо арай хол. Хэдэн «Урагш» хэрэгтэй вэ?",
            rows: ["S..G", "....", "...."],
            facing: "E",
            explanation: "Гурван нүд = гурван тушаал. Тоолж үзээрэй!",
          },
        ],
      },
      {
        title: "Эргэх",
        xp: 15,
        items: [
          {
            kind: "choice",
            prompt: "Туулай БАРУУН тийш харж байна. «↰ Зүүн» дарвал хаашаа харах вэ?",
            options: ["Дээш", "Доош", "Зүүн тийш"],
            correct: 0,
            explanation:
              "Эргэлт нь БАЙРЛАЛЫГ өөрчлөхгүй, зөвхөн ХАРАХ ЧИГЛЭЛИЙГ өөрчилнө.",
          },
          {
            kind: "maze",
            prompt: "Булан тойрч оч. Эргэх тушаал хэрэгтэй болно.",
            rows: ["S..", "..#", "..G"],
            facing: "E",
            explanation: "Эргэлт нь өөрөө нэг тушаал зарцуулна — тэр ч бас алхам.",
          },
          {
            kind: "maze",
            prompt: "Хоёр эргэлттэй зам.",
            rows: ["S..#", ".#..", ".#..", "..G."],
            facing: "E",
            explanation: "Эхлээд замаа НҮДЭЭРЭЭ дага, дараа нь тушаал болгон буулга.",
          },
        ],
      },
    ],
  },
  {
    title: "Давталт",
    color: "amber",
    lessons: [
      {
        title: "Давтах гэж юу вэ",
        xp: 20,
        items: [
          {
            kind: "choice",
            prompt: "«Урагш, Урагш, Урагш, Урагш» гэдгийг хэрхэн БОГИНО бичих вэ?",
            options: ["Давтах 4 × [Урагш]", "Урагш 4", "Богино бичих боломжгүй"],
            correct: 0,
            explanation:
              "Давталт нь ижил тушаалыг дахин дахин бичихээс аварна. Программ " +
              "богино байх тусам АЛДАА бага гардаг.",
          },
          {
            kind: "maze",
            // Задгайгаар 6 тушаал, харин «Давтах 6 × [Урагш]» = 2 блок.
            prompt: "Урт зам. Ердөө 3 блокт багтаа — «Давтах» туслана!",
            rows: ["S.....G", "#######", "#######"],
            facing: "E",
            limit: 3,
            explanation:
              "«Давтах 6 × [Урагш]» нь ердөө 2 блок. Хэдэн ч удаа давтсан " +
              "программын УРТ өөрчлөгдөхгүй — энэ бол давталтын гол хүч.",
          },
          {
            kind: "maze",
            prompt: "Бүр урт зам. Одоо 2 блокт багтаа.",
            rows: ["S......G", "########", "########"],
            facing: "E",
            limit: 2,
            explanation:
              "Зам уртсахад давталтын ТОО л өөрчлөгдөнө, программ уртсахгүй.",
          },
        ],
      },
      {
        title: "Давталт ба эргэлт",
        xp: 25,
        items: [
          {
            kind: "maze",
            // Задгайгаар 5 тушаал; давталттай 3 блок.
            prompt: "Урт зам, нэг эргэлт. 3 блокт багтаа.",
            rows: ["S....", "....#", "....#", "....#", "G...."],
            facing: "E",
            limit: 3,
            explanation:
              "Давталтыг замын урт хэсэгт, эргэлтийг тусад нь — хамтад нь " +
              "ашиглах нь жинхэнэ программын бүтэц.",
          },
          {
            kind: "maze",
            // Задгайгаар 12 тушаал; давталттай 8 блок.
            prompt: "Хоёр эргэлт, хоёр урт зам. 8 блокт багтаа.",
            rows: ["S....", "####.", "G...."],
            facing: "E",
            limit: 8,
            explanation:
              "Урт хэсэг бүрд нэг давталт — программ богино, ойлгомжтой хэвээр.",
          },
        ],
      },
    ],
  },
];
const OPTION_IDS = ["a", "b", "c", "d"];

async function main() {
  // Санд хүрэхээс ӨМНӨ лабиринт бүрийг шалгана.
  const problems: string[] = [];

  for (const unit of UNITS) {
    for (const lesson of unit.lessons) {
      for (const item of lesson.items) {
        if (item.kind !== "maze") continue;

        const grid = buildMaze(item);
        const maze = decodeMaze(grid);
        if (!maze) {
          problems.push(`  ✗ ${lesson.title}: ${grid}`);
          continue;
        }

        console.log(
          `  ✓ ${lesson.title}: ${maze.cols}×${maze.rows}, задгай ` +
            `${shortestProgram(maze)} тушаал, давталттай ${minimalBlocks(maze)} блок` +
            (maze.limit !== null ? `, хязгаар ${maze.limit}` : "")
        );
      }
    }
  }

  if (problems.length > 0) {
    console.error("Лабиринт шалгалтад унав:\n" + problems.join("\n"));
    process.exitCode = 1;
    return;
  }

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
      .select({ slug: courses.slug })
      .from(courses)
      .where(eq(courses.slug, COURSE_SLUG))
      .limit(1);

    if (!course) {
      await db.insert(courses).values({
        slug: COURSE_SLUG,
        title: "Бяцхан кодчин",
        description:
          "Тушаалын блок угсарч дүрсээ хөдөлгөнө. Дараалал, эргэлт, давталт " +
          "гэсэн программчлалын гурван үндсэн ойлголтыг тоглоомоор сурна.",
        icon: "blocks",
        color: "emerald",
        status: "active",
        // `lib/tactiq/schools.ts` → "itkids" сургууль
        school: "itkids",
      });
    }

    let addedLessons = 0;
    let addedExercises = 0;

    for (const [unitIndex, unit] of UNITS.entries()) {
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

        for (const item of lesson.items) {
          await db.insert(exercises).values({
            lessonId,
            type: item.kind === "choice" ? "choice" : "code-maze",
            prompt: item.prompt,
            options:
              item.kind === "choice"
                ? item.options.map((label, i) => ({ id: OPTION_IDS[i], label }))
                : null,
            correctOptionId: item.kind === "choice" ? OPTION_IDS[item.correct] : null,
            grid: item.kind === "maze" ? buildMaze(item) : null,
            explanation: item.explanation,
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
        : `✅ "Бяцхан кодчин" — ${addedLessons} хичээл, ${addedExercises} дасгал нэмэгдлээ.\n` +
            "Засах: /admin/courses/kids-coding"
    );
  } finally {
    await pool.end();
  }
}

void main();
