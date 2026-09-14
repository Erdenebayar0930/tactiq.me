/**
 * «Тангрaм» курс — Mind сургуульд ДАНГААР, хүндрэлээр шатласан гурван сэдэв.
 *
 * Ажиллуулах:
 *   npm run seed:tangram -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * СЭДВҮҮД:
 *   1. Хөнгөн — 5×4 талбар, хамгийн НЯГТ дүрсүүд
 *   2. Дунд   — 6×5 талбар
 *   3. Хүнд   — 7×5 талбар, хамгийн ОЛОН ХОНХОРТОЙ дүрсүүд
 *
 * ⚠ ХҮНДРЭЛИЙГ ПЕРИМЕТРЭЭР хэмжинэ (гадна ирмэгийн тоо), таамгаар биш.
 * Нягт дүрс нь бүтэн бие шиг харагдаж, том хэсгүүд хаана орохыг нүдээр
 * шууд сануулна. Олон хонхортой дүрс нь эсрэгээрээ — хэсэг бүрийг
 * оюундаа эргүүлж үзэхээс өөр арга үлдэхгүй.
 *
 * ⚠ Талбарын хэмжээ ч хүндрэлд нөлөөлнө: 64 нүдийг БАГА талбарт багтаахад
 * сонголт хумигдаж, дүрс нь өөрөө нягт болдог. Том талбарт хэсгүүд
 * сунаж, боломж олширно.
 *
 * ⚠ ДҮРС БҮР ЗААВАЛ ШИЙДЭГДЭНЭ: силуэтийг «зурчихаад шийдэл нь байгаа
 * болов уу» гэж найдахын оронд ЭСРЭГЭЭР нь — долоон хэсгийг тавиад
 * нэгдлийг нь силуэт болгоно (`lib/puzzles/tangram.ts`).
 *
 * ⚠ ЭНЭ КУРС нь «Таавар» курсын Tangram СЭДВИЙГ орлоно. Хоёулаа зэрэг
 * байвал Mind дээр нэг агуулга хоёр газар харагдана — тиймээс тэр сэдвийг
 * (явц байхгүй бол) устгана.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq, sql } from "drizzle-orm";

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
/** Сэдэв тус бүрийн дүрсийн тоо — `CHEST_EVERY` (3)-д тэгш хуваагдана. */
const PER_UNIT = 21;

type Tier = {
  title: string;
  color: string;
  width: number;
  height: number;
  /** Периметрээр эрэмбэлсэн жагсаалтын аль хэсгээс авах вэ. */
  band: "low" | "mid" | "high";
  explanation: string;
};

const TIERS: Tier[] = [
  {
    title: "Хөнгөн",
    color: "emerald",
    width: 5,
    height: 4,
    band: "low",
    explanation:
      "ТОМ хэсгээс эхэл: тэд хамгийн цөөн байрлалд багтдаг тул үлдсэн зай " +
      "нь өөрөө тодорно.",
  },
  {
    title: "Дунд",
    color: "amber",
    width: 6,
    height: 5,
    band: "mid",
    explanation:
      "Дүрсийн БУЛАНГУУДЫГ хар: хурц булан бүрд гурвалжны үзүүр ордог, " +
      "тэгш булан бүрд дөрвөлжин эсвэл катет.",
  },
  {
    title: "Хүнд",
    color: "violet",
    width: 7,
    height: 5,
    band: "high",
    explanation:
      "Нарийн хонхор бүр нэг л хэсэгт багтана — түүнийг эхлээд ол, дараа " +
      "нь үлдсэнийг эргэн тойронд нь угс.",
  },
];

type Candidate = { grid: string; figure: Figure; placements: Placement[]; score: number };

/**
 * Өгөгдсөн талбарт өвөрмөц дүрсүүдийг цуглуулж, периметрээр эрэмбэлнэ.
 *
 * ⚠ Үр (`seed`) нь 1-ээс дараалан явна — RNG БИШ. Скриптийг дахин
 * ажиллуулахад ЯГ ижил дүрсүүд гарах ёстой, эс бөгөөс `--force` бүрд
 * агуулга дэмий солигдож, сурагчийн дассан дүрсүүд алга болно.
 */
function collect(width: number, height: number, attempts: number): Candidate[] {
  const seen = new Map<string, Candidate>();

  for (let seed = 1; seed <= attempts; seed += 1) {
    const placements = generatePlacements(seed, width, height);
    if (!placements) continue;

    const figure = figureFrom(placements, width, height);
    if (!figure) continue;

    const grid = encodeTangram(figure);
    if (seen.has(grid)) continue;

    seen.set(grid, { grid, figure, placements, score: perimeterOf(figure.cells) });
  }

  return [...seen.values()].sort((a, b) => a.score - b.score || a.grid.localeCompare(b.grid));
}

function pickBand(sorted: Candidate[], band: Tier["band"], count: number): Candidate[] {
  if (band === "low") return sorted.slice(0, count);
  if (band === "high") return sorted.slice(-count);

  const start = Math.max(0, Math.floor(sorted.length / 2) - Math.floor(count / 2));
  return sorted.slice(start, start + count);
}

async function main() {
  console.log("Дүрсүүдийг үүсгэж шалгаж байна…");

  const chosen: { tier: Tier; items: Candidate[] }[] = [];

  for (const tier of TIERS) {
    const sorted = collect(tier.width, tier.height, 2000);
    const items = pickBand(sorted, tier.band, PER_UNIT);

    if (items.length < PER_UNIT) {
      console.error(`❌ «${tier.title}» сэдэвт ${PER_UNIT} дүрс хүрэлцсэнгүй (${items.length}).`);
      process.exitCode = 1;
      return;
    }

    /*
     * ⚠ Санд хүрэхЭЭС ӨМНӨ дүрс бүрийг эргүүлж уншиж, ӨӨРИЙНХӨӨ шийдлээр
     * шийдэгдэж байгааг батална. Кодчлол эсвэл шалгагчид алдаа байвал
     * энд баригдана — сурагч дээр биш.
     */
    for (const item of items) {
      const back = decodeTangram(item.grid);
      if (!back) throw new Error(`Дүрс эргэж уншигдсангүй: ${item.grid}`);
      if (!isSolved(back, item.placements)) {
        throw new Error(`Дүрс өөрийн шийдлээрээ шийдэгдсэнгүй: ${item.grid}`);
      }
    }

    const perimeters = items.map((item) => item.score);
    console.log(
      `  ${tier.title.padEnd(7)} ${tier.width}×${tier.height} — ${sorted.length} дүрсээс ` +
        `${items.length}, периметр ${Math.min(...perimeters)}..${Math.max(...perimeters)}`
    );

    chosen.push({ tier, items });
  }

  console.log(`✓ ${chosen.length} сэдэв × ${PER_UNIT} дүрс — бүгд шийдэгдэхээр батлагдлаа`);

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
          "орон зайн сэтгэлгээний сонгодог дасгал, хөнгөнөөс хүнд рүү.",
        descriptionEn:
          "Fill each silhouette with all seven pieces. Rotate and flip to fit — " +
          "the classic spatial-reasoning puzzle, easy to hard.",
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

    let added = 0;
    let replaced = 0;

    for (const [unitIndex, { tier, items }] of chosen.entries()) {
      const [existingUnit] = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, tier.title)))
        .limit(1);

      let unitId: string;
      if (existingUnit) {
        unitId = existingUnit.id;
      } else {
        const [created] = await db
          .insert(units)
          .values({
            courseSlug: COURSE_SLUG,
            title: tier.title,
            color: tier.color,
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
      const byTitle = new Map(existingLessons.map((row) => [row.title, row]));
      let order = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

      if (force) {
        const wanted = new Set(items.map((_, index) => `${tier.title} ${index + 1}`));
        for (const row of existingLessons.filter((lesson) => !wanted.has(lesson.title))) {
          await db.delete(lessons).where(eq(lessons.id, row.id));
        }
      }

      for (const [index, item] of items.entries()) {
        const title = `${tier.title} ${index + 1}`;
        const xp = 10 + Math.floor(index / 7) * 2 + unitIndex * 2;

        const found = byTitle.get(title);
        if (found && !force) continue;

        let lessonId: string;

        if (found) {
          lessonId = found.id;
          // ⚠ Хичээлийг ХАДГАЛНА (явц нь хичээлийн түвшинд) — дасгалыг сольно.
          await db.update(lessons).set({ xpReward: xp }).where(eq(lessons.id, lessonId));
          await db.delete(exercises).where(eq(exercises.lessonId, lessonId));
          replaced += 1;
        } else {
          lessonId = crypto.randomUUID();
          await db.insert(lessons).values({
            id: lessonId,
            unitId,
            title,
            xpReward: xp,
            sortOrder: order++,
            createdBy: owner.uid,
          });
          added += 1;
        }

        await db.insert(exercises).values({
          lessonId,
          type: "tangram",
          prompt: "Долоон хэсгээр дүрсийг бүрэн нөх.",
          options: null,
          correctOptionId: null,
          grid: item.grid,
          explanation: tier.explanation,
          sortOrder: 0,
          createdBy: owner.uid,
        });
      }
    }

    const removed = await removePuzzleTangramUnit(db);

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} хичээл нэмэгдлээ`);
    if (replaced > 0) parts.push(`${replaced} хичээл шинэчлэгдлээ`);
    if (removed > 0) parts.push(`«Таавар» курсын Tangram сэдэв (${removed} хичээл) устлаа`);

    console.log(
      parts.length === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
            "Шинэчлэх бол: npm run seed:tangram -- <email> --force"
        : `✅ "Тангрaм" — ${parts.join(", ")}.\nЗасах: /admin/courses/${COURSE_SLUG}`
    );
  } finally {
    await pool.end();
  }
}

/**
 * «Таавар» курсын Tangram сэдвийг устгана — давхардал үүсгэхгүйн тулд.
 *
 * ⚠ ЯВЦ БАЙВАЛ ХӨНДӨХГҮЙ. `lesson_progress` нь хичээлийн ID-аар
 * холбогддог тул сурагчийн хийсэн ажилтай сэдвийг устгавал тэр ажил
 * өнчирнө. Тийм тохиолдолд анхааруулаад ҮЛДЭЭНЭ — хүнээр шийдүүлэх нь
 * зөв.
 */
async function removePuzzleTangramUnit(db: ReturnType<typeof drizzle>): Promise<number> {
  const [unit] = await db
    .select({ id: units.id })
    .from(units)
    .where(and(eq(units.courseSlug, "puzzle"), eq(units.title, "Tangram")))
    .limit(1);

  if (!unit) return 0;

  const rows = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(eq(lessons.unitId, unit.id));

  const progress = await db.execute(
    sql`SELECT count(*)::int AS n FROM lesson_progress lp
        JOIN lessons l ON l.id = lp.lesson_id
        WHERE l.unit_id = ${unit.id}`
  );
  const used = Number((progress.rows[0] as { n: number } | undefined)?.n ?? 0);

  if (used > 0) {
    console.warn(
      `  ⚠ «Таавар» курсын Tangram сэдэвт ${used} явцын мөр байна — УСТГААГҮЙ.\n` +
        "     Хоёр газар давхар харагдах тул гараар шийдэх шаардлагатай."
    );
    return 0;
  }

  // `lessons`/`exercises` нь CASCADE тул хамт устана.
  await db.delete(units).where(eq(units.id, unit.id));
  console.log(`  − «Таавар» курсын Tangram сэдэв (${rows.length} хичээл) устлаа`);
  return rows.length;
}

void main();
