/**
 * «🧠 Memory» курс — Mind сургуульд ЗУРГААН хичээл.
 *
 * Ажиллуулах:
 *   npm run seed:memory -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * ХИЧЭЭЛҮҮД ба тэдгээрийн механик:
 *   1. Memory Cards    — хөзөр эргүүлж хос олох      (`memory-game`)
 *   2. Sequence Memory — асалтын ДАРААЛАЛ сэргээх    (`recall:sequence`)
 *   3. Pattern Memory  — асалтын ХЭВ МАЯГ сэргээх    (`recall:pattern`)
 *   4. Number Memory   — цифрийн мөр сэргээх         (`recall:digits`)
 *   5. Visual Memory   — том талбар дээрх хэв маяг   (`recall:pattern`)
 *   6. Match Pairs     — илүү олон хостой хөзөр      (`memory-game`)
 *
 * ⚠ Хичээл 3 ба 5 ИЖИЛ механиктай ч ЯЛГААТАЙ: «Pattern» нь 3×3, цөөн
 * нүдтэй (хэв маягийг ойлгох), «Visual» нь 5×5, олон нүдтэй (багтаамжийг
 * сунгах). Тусдаа механик зохиох нь илүүц байсан — ялгаа нь ЭНД,
 * тохиргоонд л байна.
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

/** Тогтвортой үүсгэгч — дахин ажиллуулахад ИЖИЛ агуулга гарна. */
function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

type Item =
  | { kind: "memory"; grid: string; prompt: string }
  | { kind: "recall"; grid: string; prompt: string };

type LessonSpec = { title: string; xp: number; items: Item[]; explanation: string };

/** Хөзрийн зүйлс — эможи нь хүүхдэд ТАНИГДАХУЙЦ байх ёстой. */
const CARD_SETS: string[][] = [
  ["🍎", "🐰", "⭐", "🎵", "🚗", "🌳", "🐟", "🌙"],
  ["🐶", "🐱", "🐼", "🦊", "🐸", "🐝", "🦋", "🐢"],
  ["⚽", "🏀", "🎾", "🏐", "🎲", "🎯", "🎸", "🥁"],
];

function memoryItem(pairs: number, setIndex: number, label: string): Item {
  const items = CARD_SETS[setIndex % CARD_SETS.length].slice(0, pairs);
  const grid = encodeMemory({ pairs, items });
  if (!decodeMemory(grid)) throw new Error(`Хөзрийн багц буруу: ${grid}`);
  return { kind: "memory", grid, prompt: label };
}

function recallItem(recall: Recall, prompt: string): Item {
  const grid = encodeRecall(recall);
  const back = decodeRecall(grid);
  if (!back) throw new Error(`Дасгал уншигдсангүй: ${grid}`);

  // ⚠ Өөрийнх нь хариугаар ЗӨВ гэж тооцогдох ёстой — эс бөгөөс сурагч
  // төгс сэргээсэн ч дасгал дуусахгүй.
  const answer = back.mode === "digits" ? back.digits : back.cells;
  if (!isCorrect(back, answer)) throw new Error(`Дасгал өөрийн хариугаар унав: ${grid}`);

  return { kind: "recall", grid, prompt };
}

function buildLessons(): LessonSpec[] {
  const rng = makeRng(20260914);

  return [
    {
      title: "Memory Cards",
      xp: 15,
      explanation: "Нээсэн хөзрийнхөө БАЙРЛАЛЫГ сана — зөвхөн зургийг нь биш.",
      items: [
        memoryItem(3, 0, "Ижил хосуудыг ол."),
        memoryItem(4, 1, "Дөрвөн хос — байрлалыг нь сана."),
        memoryItem(5, 2, "Таван хос."),
      ],
    },
    {
      title: "Sequence Memory",
      xp: 18,
      explanation:
        "Дарааллыг бүхэлд нь биш, ХЭСЭГЛЭН сана (2-3 нүдээр) — тархи урт " +
        "дарааллыг богино бүлгүүдээр илүү сайн барьдаг.",
      items: [3, 4, 5, 6].map((count) =>
        recallItem(
          { mode: "sequence", size: 3, cells: makeCells(3, count, rng) },
          `${count} нүд асна — ижил дарааллаар нь дар.`
        )
      ),
    },
    {
      title: "Pattern Memory",
      xp: 18,
      explanation:
        "Нүд бүрийг тусад нь биш, ДҮРС болгож хар — «гурвалжин», «шулуун» " +
        "гэж нэрлэвэл санахад хамаагүй хялбар.",
      items: [3, 4, 5, 6].map((count) =>
        recallItem(
          { mode: "pattern", size: 3, cells: makeCells(3, count, rng) },
          `${count} нүд зэрэг асна — тэдгээрийг дар (дараалал хамаагүй).`
        )
      ),
    },
    {
      title: "Number Memory",
      xp: 18,
      explanation:
        "Цифрүүдийг 2-3-аар нь бүлэглэж сана: «58 29 3» гэж уншвал таван " +
        "цифр биш, гурван зүйл цээжлэх болно.",
      items: [4, 5, 6, 7].map((length) =>
        recallItem(
          { mode: "digits", digits: makeDigits(length, rng) },
          `${length} оронтой тоо — санаад бич.`
        )
      ),
    },
    {
      title: "Visual Memory",
      xp: 20,
      explanation:
        "Том талбарт бүх нүдийг нэг дор барих боломжгүй — талбарыг оюун " +
        "дотроо хэсэгт хувааж, хэсэг тус бүрээр сана.",
      items: [4, 5, 6, 7].map((count, index) =>
        recallItem(
          { mode: "pattern", size: index < 2 ? 4 : 5, cells: makeCells(index < 2 ? 4 : 5, count, rng) },
          `${count} нүд асна — бүгдийг нь ол.`
        )
      ),
    },
    {
      title: "Match Pairs",
      xp: 22,
      explanation:
        "Олон хостой үед ЭХЛЭЭД бүх хөзрийг дараалан нээж байрлалыг нь " +
        "цээжил, дараа нь хосуудыг цуглуул.",
      items: [
        memoryItem(6, 1, "Зургаан хос."),
        memoryItem(7, 2, "Долоон хос."),
        memoryItem(8, 0, "Найман хос — хамгийн хүнд."),
      ],
    },
  ];
}

async function main() {
  console.log("Дасгалуудыг үүсгэж шалгаж байна…");

  const specs = buildLessons();
  const total = specs.reduce((sum, lesson) => sum + lesson.items.length, 0);
  console.log(`✓ ${specs.length} хичээл, ${total} дасгал — бүгд шалгалтад тэнцлээ`);

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
          "Хөзрийн хос, дараалал, хэв маяг, тоо — санах ойн зургаан " +
          "төрлийн дасгал. Тархиа өдөр бүр сургана.",
        descriptionEn:
          "Card pairs, sequences, patterns and numbers — six kinds of memory " +
          "training in one course.",
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

    const UNIT_TITLE = "Санах ой";

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
          color: "teal",
          sortOrder: 0,
          createdBy: owner.uid,
        })
        .returning({ id: units.id });
      unitId = created.id;
    }

    const existing = await db
      .select({ id: lessons.id, title: lessons.title })
      .from(lessons)
      .where(eq(lessons.unitId, unitId));
    const byTitle = new Map(existing.map((row) => [row.title, row]));

    let added = 0;
    let replaced = 0;
    let written = 0;

    for (const [index, spec] of specs.entries()) {
      const found = byTitle.get(spec.title);
      if (found && !force) continue;

      let lessonId: string;

      if (found) {
        lessonId = found.id;
        // ⚠ Хичээлийг ХАДГАЛНА (явц нь хичээлийн түвшинд) — дасгалыг сольно.
        await db.update(lessons).set({ xpReward: spec.xp }).where(eq(lessons.id, lessonId));
        await db.delete(exercises).where(eq(exercises.lessonId, lessonId));
        replaced += 1;
      } else {
        lessonId = crypto.randomUUID();
        await db.insert(lessons).values({
          id: lessonId,
          unitId,
          title: spec.title,
          xpReward: spec.xp,
          sortOrder: index,
          createdBy: owner.uid,
        });
        added += 1;
      }

      for (const [order, item] of spec.items.entries()) {
        await db.insert(exercises).values({
          lessonId,
          type: item.kind === "memory" ? "memory-game" : "recall",
          prompt: item.prompt,
          options: null,
          correctOptionId: null,
          grid: item.grid,
          explanation: spec.explanation,
          sortOrder: order,
          createdBy: owner.uid,
        });
        written += 1;
      }
    }

    if (added === 0 && replaced === 0) {
      console.log(
        "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
          "Шинэчлэх бол: npm run seed:memory -- <email> --force"
      );
    } else {
      const parts: string[] = [];
      if (added > 0) parts.push(`${added} хичээл нэмэгдлээ`);
      if (replaced > 0) parts.push(`${replaced} хичээл шинэчлэгдлээ`);
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
