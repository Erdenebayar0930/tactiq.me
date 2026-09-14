/**
 * «Тангрaм» курс — Mind сургуульд НЭГ хичээл, дүрс бүр нэг дасгал.
 *
 * Ажиллуулах:
 *   npm run seed:tangram -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * ⚠ ДҮРС БҮР ЗААВАЛ ШИЙДЭГДЭНЭ. Силуэтийг «зурчихаад шийдэл нь байгаа
 * болов уу» гэж найдахын оронд ЭСРЭГЭЭР нь үүсгэнэ: долоон хэсгийг
 * хөлөг дээр давхцалгүй тавиад, гарсан НЭГДЛИЙГ силуэт болгоно. Ингэснээр
 * шийдэл нь бүтцийн хувьд баталгаатай.
 *
 * ⚠ ЭРГҮҮЛЭЛТ 90°-ИЙН АЛХМААР (`lib/puzzles/tangram.ts`-ийн тайлбарыг
 * үзнэ үү) — үүсгэгч ч ижил хязгаарт ажилладаг тул сурагчийн боломжоос
 * ГАДУУР дүрс хэзээ ч гарахгүй.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import {
  decodeTangram,
  encodeTangram,
  figureFrom,
  generatePlacements,
  isSolved,
  perimeterOf,
  type Figure,
  type Placement,
} from "../src/lib/puzzles/tangram";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [emailArg] = args.filter((arg) => !arg.startsWith("--"));

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:tangram -- <email> [--force]");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "tangram";
const FIGURE_COUNT = 10;
const BOARD_W = 6;
const BOARD_H = 5;

type Candidate = { figure: Figure; placements: Placement[]; score: number };

function buildFigures(): Candidate[] {
  const seen = new Map<string, Candidate>();

  for (let seed = 1; seed <= 400; seed += 1) {
    const placements = generatePlacements(seed, BOARD_W, BOARD_H);
    if (!placements) continue;

    const figure = figureFrom(placements, BOARD_W, BOARD_H);
    if (!figure) continue;

    const encoded = encodeTangram(figure);
    if (seen.has(encoded)) continue;

    seen.set(encoded, { figure, placements, score: perimeterOf(figure.cells) });
  }

  // Хамгийн нягт дүрсүүдийг эхэнд.
  return [...seen.values()].sort((a, b) => a.score - b.score);
}

// ---------------------------------------------------------------------------

async function main() {
  console.log("Дүрсүүдийг үүсгэж шалгаж байна…");

  const all = buildFigures();
  const chosen = all.slice(0, FIGURE_COUNT);

  if (chosen.length < FIGURE_COUNT) {
    console.error(`❌ ${FIGURE_COUNT} дүрс хүрэлцсэнгүй (${chosen.length}). Санд юу ч бичсэнгүй.`);
    process.exitCode = 1;
    return;
  }

  /*
   * ⚠ Санд хүрэхЭЭС ӨМНӨ дүрс бүрийг ЭРГҮҮЛЖ уншиж, өөрийнх нь шийдлээр
   * ШИЙДЭГДЭЖ байгааг батална. Кодчлол эсвэл шалгагчийн аль нэгэнд алдаа
   * байвал энд баригдана — сурагч дээр биш.
   */
  for (const candidate of chosen) {
    const back = decodeTangram(encodeTangram(candidate.figure));
    if (!back) throw new Error("Дүрс эргэж уншигдсангүй");
    if (!isSolved(back, candidate.placements)) {
      throw new Error("Дүрс өөрийн шийдлээрээ шийдэгдсэнгүй");
    }
  }

  console.log(
    `✓ ${all.length} дүрсээс ${chosen.length}-ыг сонгов; ` +
      `бүгд эргэж уншигдаж, шийдэгдэж байгаа нь батлагдлаа`
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
        title: "Тангрaм",
        titleEn: "Tangram",
        description:
          "Долоон хэсгээр дүрс нөхнө. Эргүүлж, толирдуулж тааруулах — " +
          "орон зайн сэтгэлгээний сонгодог дасгал.",
        descriptionEn:
          "Fill each silhouette with all seven pieces. Rotate and flip to fit — " +
          "the classic spatial-reasoning puzzle.",
        icon: "shapes",
        color: "violet",
        // `lib/tactiq/schools.ts` → "mind" сургууль.
        school: "mind",
        schools: ["mind"],
        status: "active",
      });
      console.log('"Тангрaм" курс үүслээ.');
    } else if (course.status !== "active") {
      await db
        .update(courses)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(courses.slug, COURSE_SLUG));
    }

    const UNIT_TITLE = "Тангрaм";
    const LESSON_TITLE = "Дүрс нөхөх";

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
          color: "violet",
          sortOrder: 0,
          createdBy: owner.uid,
        })
        .returning({ id: units.id });
      unitId = created.id;
    }

    const [existingLesson] = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(and(eq(lessons.unitId, unitId), eq(lessons.title, LESSON_TITLE)))
      .limit(1);

    if (existingLesson && !force) {
      console.log(
        "Хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
          "Дүрсийг ШИНЭЧЛЭХ бол: npm run seed:tangram -- <email> --force"
      );
      return;
    }

    let lessonId: string;

    if (existingLesson) {
      lessonId = existingLesson.id;
      // ⚠ Хичээлийг ХАДГАЛНА (сурагчийн явц `lesson_progress`-д хичээлийн
      // түвшинд байдаг) — зөвхөн дасгалыг сольно.
      await db.delete(exercises).where(eq(exercises.lessonId, lessonId));
    } else {
      lessonId = crypto.randomUUID();
      await db.insert(lessons).values({
        id: lessonId,
        unitId,
        title: LESSON_TITLE,
        // Долоон хэсгийг арван дүрсэнд тааруулах нь урт ажил.
        xpReward: 30,
        sortOrder: 0,
        createdBy: owner.uid,
      });
    }

    for (const [index, candidate] of chosen.entries()) {
      await db.insert(exercises).values({
        lessonId,
        type: "tangram",
        prompt: `${index + 1}-р дүрс — долоон хэсгээр бүрэн нөх.`,
        options: null,
        correctOptionId: null,
        grid: encodeTangram(candidate.figure),
        explanation:
          "Том хэсгээс эхэл: тэдгээр нь хамгийн цөөн байрлалд багтдаг тул " +
          "үлдсэн зай нь өөрөө тодорно.",
        sortOrder: index,
        createdBy: owner.uid,
      });
    }

    console.log(
      `✅ "Тангрaм" — «${LESSON_TITLE}» хичээлд ${chosen.length} дүрс бичигдлээ.\n` +
        `Засах: /admin/courses/${COURSE_SLUG}`
    );
  } finally {
    await pool.end();
  }
}

void main();
