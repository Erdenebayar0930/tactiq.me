/**
 * «🧩 Таавар» курс — Mind сургуульд НАЙМАН СЭДЭВ, тус бүр дотроо дасгалтай.
 *
 * Ажиллуулах:
 *   npm run seed:puzzle -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * СЭДВҮҮД ба тэдгээрийн механик:
 *   1. Logic Puzzle       — эгнээнээс ИЛҮҮЦИЙГ ол        (`series:odd`)
 *   2. Matchstick Puzzle  — нэг таяг зөөж тэгшитгэл засах (`matchstick`)
 *   3. Tangram            — долоон хэсгээр дүрс нөхөх     (`tangram`)
 *   4. Nonogram           — тоонуудаар нүд будах          (`nonogram`)
 *   5. Number Puzzle      — тоон эгнээний дутуу гишүүн    (`series:number`)
 *   6. Sliding Puzzle     — гулсуулж эрэмбэлэх            (`slide-puzzle`)
 *   7. Pattern Puzzle     — дүрсийн эгнээний дараагийнх   (`series:shape`)
 *   8. Word Puzzle        — үсгээс үг угсрах              (`word`)
 *
 * ⚠ ТАЯГНЫ КУРСИЙГ ЗӨӨНӨ, ДАХИН ҮҮСГЭХГҮЙ. Тэр курс дээр сурагчийн ЯВЦ
 * бий (`lesson_progress` нь ХИЧЭЭЛИЙН ID-аар холбогддог) тул устгаад
 * дахин үүсгэвэл хийсэн ажил нь алга болно. Иймд хичээлүүдийг ID-тай нь
 * шинэ сэдэв рүү шилжүүлж, хуучин нэгж, курсийг нь хоосон болсны дараа
 * устгана.
 *
 * ⚠ ДАСГАЛ БҮР санд бичигдэхээс ӨМНӨ эргэж уншигдаж байгааг батална.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import {
  countSolutions as nonogramSolutions,
  decodeNonogram,
  encodeNonogram,
  type Nonogram,
} from "../src/lib/puzzles/nonogram";
import { decodeSeries, encodeSeries, type Series } from "../src/lib/puzzles/series";
import { decodeSlide, encodeSlide } from "../src/lib/puzzles/slide";
import {
  decodeTangram,
  encodeTangram,
  figureFrom,
  generatePlacements,
  perimeterOf,
} from "../src/lib/puzzles/tangram";
import { decodeWord, encodeWord } from "../src/lib/puzzles/word";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [emailArg] = args.filter((arg) => !arg.startsWith("--"));

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:puzzle -- <email> [--force]");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "puzzle";
/** Зөөгддөг сэдвээс бусад нь хэдэн хичээлтэй вэ (`CHEST_EVERY`=3-д хуваагдана). */
const PER_UNIT = 9;

const MATCHSTICK_UNIT = "Matchstick Puzzle";

function makeRng(seed: number) {
  let state = seed >>> 0;
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
}

type Built = { title: string; xp: number; type: string; grid: string; prompt: string };
type UnitSpec = { title: string; color: string; explanation: string; lessons: Built[] };

const xpFor = (index: number, base: number) => base + Math.floor(index / 3) * 2;

// ---------------------------------------------------------------------------
// Үүсгэгчид
// ---------------------------------------------------------------------------

/**
 * Нонограм — санамсаргүй зураг үүсгээд ГАНЦ шийдэлтэйг нь л авна.
 *
 * ⚠ Олон шийдэлтэй нонограм нь логикоор биш ТААЖ бодох болж хувирдаг:
 * сурагч зөв бодсон ч «буруу» гэж хэлэгдэнэ.
 */
function makeNonogram(size: number, rng: () => number): Nonogram {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const filled = new Set<number>();
    for (let i = 0; i < size * size; i += 1) if (rng() < 0.55) filled.add(i);
    if (filled.size === 0 || filled.size === size * size) continue;

    const puzzle: Nonogram = { width: size, height: size, filled };
    if (nonogramSolutions(puzzle, 2) === 1) return puzzle;
  }
  throw new Error(`${size}×${size} нонограм олдсонгүй`);
}

/** Тоон эгнээ — арифметик буюу геометр өсөлт. */
function makeNumberSeries(index: number, rng: () => number): Series {
  const length = 5;
  const geometric = index % 4 === 3;
  const start = 1 + Math.floor(rng() * 6);
  const step = geometric ? 2 + Math.floor(rng() * 2) : 1 + Math.floor(rng() * 6);

  const items: string[] = [];
  let value = start;
  for (let i = 0; i < length; i += 1) {
    items.push(String(value));
    value = geometric ? value * step : value + step;
  }

  // ⚠ Далд гишүүн нь ХАМГИЙН ЭХНИЙХ байж болохгүй: тэгвэл хуулийг тогтоох
  // мэдээлэл дутаж, хэд хэдэн хариу зөв болно.
  return { mode: "number", items, index: 1 + Math.floor(rng() * (length - 1)) };
}

const SHAPE_TOKENS = ["cr", "sb", "tg", "dy", "pv", "cb", "sg", "ty"];

/** Дүрсийн эгнээ — 2 эсвэл 3 гишүүнт давталт. */
function makeShapeSeries(index: number, rng: () => number): Series {
  const period = index % 3 === 2 ? 3 : 2;
  const pool = [...SHAPE_TOKENS].sort(() => rng() - 0.5).slice(0, period);
  const items = Array.from({ length: 6 }, (_, i) => pool[i % period]);

  // Сүүлийн гишүүнийг далдална — «дараа нь юу ирэх вэ» гэсэн сонгодог хэлбэр.
  return { mode: "shape", items, index: items.length - 1 };
}

/** Илүүц гишүүн — бусад нь БҮГД ижил, нэг нь өөр. */
function makeOddSeries(index: number, rng: () => number): Series {
  const shuffled = [...SHAPE_TOKENS].sort(() => rng() - 0.5);
  const common = shuffled[0];
  const odd = shuffled[1];
  const length = 4 + (index % 3);
  const at = Math.floor(rng() * length);

  const items = Array.from({ length }, (_, i) => (i === at ? odd : common));
  return { mode: "odd", items, index: at };
}

/** Үгийн таавар — үг ба түүний сэжүүр. */
const WORDS: { word: string; clue: string }[] = [
  { word: "морь", clue: "Таван хошуу малын нэг, унадаг" },
  { word: "нохой", clue: "Гэрийг манадаг, хуцдаг амьтан" },
  { word: "далай", clue: "Маш их ус, давстай" },
  { word: "сургууль", clue: "Хүүхэд хичээл үздэг газар" },
  { word: "номын", clue: "«___ сан» — ном хадгалдаг газар" },
  /*
   * ⚠ «НАРНЫ» БАЙСАН — СОЛИВ, «уул»-тай ИЖИЛ шалтгаанаар: н-а-р-н-ы нь
   * «НАРЫН» гэсэн бас нэг жинхэнэ үг болно. Хоёр бичлэг хоёулаа
   * тааралддаг тул хүүхэд «нарын гэрэл» гэж угсраад буруудна.
   */
  { word: "тэнгэр", clue: "Толгой дээрх цэнхэр огторгуй" },
  { word: "цэцэг", clue: "Хавар ургадаг, үнэртэй" },
  /*
   * ⚠ «УУЛ» БАЙСАН — СОЛИВ. Энэ дасгал нь үсгийг ХОЛИЖ өгдөг бөгөөд
   * у-у-л гурван үсэг нь «ЛУУ» гэсэн бас нэг ЖИНХЭНЭ монгол үг үүсгэнэ.
   * Хүүхэд зөв монгол үг угсраад «буруу» гэсэн хариу авдаг байв.
   * Орлуулах үгийг сонгохдоо үсгүүд нь өөр утгатай үг үүсгэхгүйг
   * шалгасан (ц-о-н-х).
   */
  { word: "цонх", clue: "Өрөөнөөс гадагш харагддаг шилэн нүх" },
  { word: "гэрэл", clue: "Харанхуйг арилгадаг" },
  { word: "модон", clue: "«___ ширээ» — модоор хийсэн" },
  { word: "бороо", clue: "Тэнгэрээс унадаг ус" },
  { word: "шувуу", clue: "Далавчтай, нисдэг" },
];

// ---------------------------------------------------------------------------

function buildUnits(): UnitSpec[] {
  const rng = makeRng(20260915);

  const logic: Built[] = Array.from({ length: PER_UNIT }, (_, i) => {
    const series = makeOddSeries(i, rng);
    const grid = encodeSeries(series);
    if (!decodeSeries(grid)) throw new Error(`Логик таавар унав: ${grid}`);
    return {
      title: `Логик ${i + 1}`,
      xp: xpFor(i, 8),
      type: "series",
      grid,
      prompt: "Бусдаас ЯЛГААТАЙ дүрсийг ол.",
    };
  });

  const tangram: Built[] = (() => {
    const found: { grid: string; score: number }[] = [];
    for (let seed = 1; seed <= 400 && found.length < 60; seed += 1) {
      const placements = generatePlacements(seed, 6, 5);
      if (!placements) continue;
      const figure = figureFrom(placements, 6, 5);
      if (!figure) continue;
      const grid = encodeTangram(figure);
      if (!decodeTangram(grid)) continue;
      if (found.some((item) => item.grid === grid)) continue;
      found.push({ grid, score: perimeterOf(figure.cells) });
    }
    // Хамгийн НЯГТ дүрсүүд нь хүүхдэд «дүрс» гэж танигдана.
    found.sort((a, b) => a.score - b.score);
    return found.slice(0, PER_UNIT).map((item, i) => ({
      title: `Дүрс ${i + 1}`,
      xp: xpFor(i, 10),
      type: "tangram",
      grid: item.grid,
      prompt: "Долоон хэсгээр дүрсийг бүрэн нөх.",
    }));
  })();

  const nonogram: Built[] = Array.from({ length: PER_UNIT }, (_, i) => {
    const size = i < 3 ? 4 : i < 6 ? 5 : 6;
    const grid = encodeNonogram(makeNonogram(size, rng));
    if (!decodeNonogram(grid)) throw new Error(`Нонограм унав: ${grid}`);
    return {
      title: `Нонограм ${i + 1}`,
      xp: xpFor(i, 10),
      type: "nonogram",
      grid,
      prompt: `${size}×${size} — тоонуудын дагуу нүднүүдийг буд.`,
    };
  });

  const numbers: Built[] = Array.from({ length: PER_UNIT }, (_, i) => {
    const series = makeNumberSeries(i, rng);
    const grid = encodeSeries(series);
    if (!decodeSeries(grid)) throw new Error(`Тоон эгнээ унав: ${grid}`);
    return {
      title: `Тоо ${i + 1}`,
      xp: xpFor(i, 8),
      type: "series",
      grid,
      prompt: "Эгнээний дутуу тоог ол.",
    };
  });

  const sliding: Built[] = Array.from({ length: PER_UNIT }, (_, i) => {
    const size = i < 4 ? 3 : i < 7 ? 4 : 5;
    const grid = encodeSlide(size);
    if (!decodeSlide(grid)) throw new Error(`Гулсдаг оньсого унав: ${grid}`);
    return {
      title: `Гулсах ${i + 1}`,
      xp: xpFor(i, 10),
      type: "slide-puzzle",
      grid,
      prompt: `${size}×${size} — тоонуудыг дарааллаар нь эрэмбэл.`,
    };
  });

  const pattern: Built[] = Array.from({ length: PER_UNIT }, (_, i) => {
    const series = makeShapeSeries(i, rng);
    const grid = encodeSeries(series);
    if (!decodeSeries(grid)) throw new Error(`Дүрсийн эгнээ унав: ${grid}`);
    return {
      title: `Хэв маяг ${i + 1}`,
      xp: xpFor(i, 8),
      type: "series",
      grid,
      prompt: "Дараа нь ямар дүрс ирэх вэ?",
    };
  });

  const word: Built[] = WORDS.slice(0, PER_UNIT).map((entry, i) => {
    const grid = encodeWord({ answer: entry.word });
    if (!decodeWord(grid)) throw new Error(`Үгийн таавар унав: ${grid}`);
    return {
      title: `Үг ${i + 1}`,
      xp: xpFor(i, 8),
      type: "word",
      grid,
      prompt: entry.clue,
    };
  });

  return [
    {
      title: "Logic Puzzle",
      color: "sky",
      explanation: "Юугаараа ижил, юугаараа ялгаатай вэ — эхлээд ИЖИЛ ЗҮЙЛИЙГ нь ол.",
      lessons: logic,
    },
    {
      title: MATCHSTICK_UNIT,
      color: "amber",
      explanation:
        "Таягны НИЙТ ТОО хэзээ ч өөрчлөгдөхгүй — зөөх нь авч хаях биш. " +
        "Тэмдгийг ч мартаж болохгүй: «+»-ийн босоог авбал «−» болно.",
      lessons: [], // ⚠ ЗӨӨГДӨНӨ — доорх `migrateMatchstick`-ийг үзнэ үү.
    },
    {
      title: "Tangram",
      color: "violet",
      explanation: "Том хэсгээс эхэл: тэд хамгийн цөөн байрлалд багтдаг.",
      lessons: tangram,
    },
    {
      title: "Nonogram",
      color: "emerald",
      explanation:
        "Хамгийн ТОМ тоотой мөр, багананаас эхэл — тэнд сонголт хамгийн цөөн. " +
        "«Энэ нүд заавал хоосон» гэдгээ ✕-ээр тэмдэглэ.",
      lessons: nonogram,
    },
    {
      title: "Number Puzzle",
      color: "rose",
      explanation: "Хоёр хөрш тооны ЗӨРҮҮГ хар — ихэвчлэн тэр нь хууль нь байдаг.",
      lessons: numbers,
    },
    {
      title: "Sliding Puzzle",
      color: "indigo",
      explanation:
        "Дээд мөрийг ЭХЛЭЭД бүрэн цэгцэл, дараа нь түүнд хүрэхгүйгээр доошоо ажилла.",
      lessons: sliding,
    },
    {
      title: "Pattern Puzzle",
      color: "teal",
      explanation: "Давталтын УРТЫГ эхлээд ол: хоёр юу, гурав юу дараалж байна вэ?",
      lessons: pattern,
    },
    {
      title: "Word Puzzle",
      color: "orange",
      explanation: "Эхний үсгийг тааварла — үлдсэн нь ихэвчлэн өөрөө нийлдэг.",
      lessons: word,
    },
  ];
}

async function main() {
  console.log("Тааваруудыг үүсгэж шалгаж байна…");

  const specs = buildUnits();
  const generated = specs.reduce((sum, unit) => sum + unit.lessons.length, 0);
  console.log(`✓ ${specs.length} сэдэв, ${generated} дасгал үүсгэгдэж шалгагдлаа`);

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
        title: "Таавар",
        titleEn: "Puzzle",
        description:
          "Логик, таяг, тангрaм, нонограм, тоо, гулсах, хэв маяг, үг — " +
          "найман төрлийн таавар нэг курст.",
        descriptionEn:
          "Logic, matchsticks, tangram, nonograms, numbers, sliding tiles, " +
          "patterns and words — eight kinds of puzzle in one course.",
        icon: "puzzle",
        color: "violet",
        // `lib/tactiq/schools.ts` → "mind" сургууль.
        school: "mind",
        schools: ["mind"],
        status: "active",
      });
      console.log('"Таавар" курс үүслээ.');
    } else if (course.status !== "active") {
      await db
        .update(courses)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(courses.slug, COURSE_SLUG));
    }

    /** Сэдэв байхгүй бол үүсгээд ID-г нь буцаана. */
    const ensureUnit = async (spec: UnitSpec, sortOrder: number): Promise<string> => {
      const [existing] = await db
        .select({ id: units.id })
        .from(units)
        .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, spec.title)))
        .limit(1);

      if (existing) return existing.id;

      const [created] = await db
        .insert(units)
        .values({
          courseSlug: COURSE_SLUG,
          title: spec.title,
          color: spec.color,
          sortOrder,
          createdBy: owner.uid,
        })
        .returning({ id: units.id });
      return created.id;
    };

    let addedLessons = 0;
    let replacedLessons = 0;
    let movedLessons = 0;

    for (const [index, spec] of specs.entries()) {
      const unitId = await ensureUnit(spec, index);

      if (spec.title === MATCHSTICK_UNIT) {
        movedLessons += await migrateMatchstick(db, unitId);
        continue;
      }

      const existingLessons = await db
        .select({ id: lessons.id, title: lessons.title, sortOrder: lessons.sortOrder })
        .from(lessons)
        .where(eq(lessons.unitId, unitId));
      const byTitle = new Map(existingLessons.map((row) => [row.title, row]));
      let order = existingLessons.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

      for (const lesson of spec.lessons) {
        const found = byTitle.get(lesson.title);
        if (found && !force) continue;

        let lessonId: string;

        if (found) {
          lessonId = found.id;
          // ⚠ Хичээлийг ХАДГАЛНА (явц нь хичээлийн түвшинд) — дасгалыг сольно.
          await db.update(lessons).set({ xpReward: lesson.xp }).where(eq(lessons.id, lessonId));
          await db.delete(exercises).where(eq(exercises.lessonId, lessonId));
          replacedLessons += 1;
        } else {
          lessonId = crypto.randomUUID();
          await db.insert(lessons).values({
            id: lessonId,
            unitId,
            title: lesson.title,
            xpReward: lesson.xp,
            sortOrder: order++,
            createdBy: owner.uid,
          });
          addedLessons += 1;
        }

        await db.insert(exercises).values({
          lessonId,
          type: lesson.type,
          prompt: lesson.prompt,
          options: null,
          correctOptionId: null,
          grid: lesson.grid,
          explanation: spec.explanation,
          sortOrder: 0,
          createdBy: owner.uid,
        });
      }
    }

    const parts: string[] = [];
    if (addedLessons > 0) parts.push(`${addedLessons} хичээл нэмэгдлээ`);
    if (replacedLessons > 0) parts.push(`${replacedLessons} хичээл шинэчлэгдлээ`);
    if (movedLessons > 0) parts.push(`${movedLessons} таягны хичээл зөөгдлөө`);

    console.log(
      parts.length === 0
        ? "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
            "Шинэчлэх бол: npm run seed:puzzle -- <email> --force"
        : `✅ "Таавар" — ${parts.join(", ")}.\nЗасах: /admin/courses/${COURSE_SLUG}`
    );
  } finally {
    await pool.end();
  }
}

/**
 * Таягны курсийн хичээлүүдийг ID-тай нь шинэ сэдэв рүү ЗӨӨНӨ.
 *
 * ⚠ УСТГААД ДАХИН ҮҮСГЭХГҮЙ: `lesson_progress` нь ХИЧЭЭЛИЙН ID-аар
 * холбогддог тул шинэ ID үүсгэвэл сурагчийн хийсэн ажил тасарна.
 * `UPDATE`-ээр зөөвөл явц нь бүрэн хэвээр үлдэнэ.
 *
 * ⚠ `lesson_progress.course_slug`-ийг ч шинэчилнэ — эс бөгөөс явц нь
 * хуучин курс руу заасаар байж, шинэ курсын ахиц дутуу харагдана.
 */
async function migrateMatchstick(
  db: ReturnType<typeof drizzle>,
  targetUnitId: string
): Promise<number> {
  const oldUnits = await db
    .select({ id: units.id, sortOrder: units.sortOrder })
    .from(units)
    .where(eq(units.courseSlug, "matchstick"))
    .orderBy(asc(units.sortOrder));

  if (oldUnits.length === 0) return 0;

  const ids = oldUnits.map((unit) => unit.id);
  const rows = await db
    .select({ id: lessons.id, unitId: lessons.unitId, sortOrder: lessons.sortOrder })
    .from(lessons)
    .where(inArray(lessons.unitId, ids));

  // Хуучин нэгжийн дараалал → хичээлийн дараалал гэсэн эрэмбээр дугаарлана.
  const unitOrder = new Map(oldUnits.map((unit, index) => [unit.id, index]));
  rows.sort(
    (a, b) =>
      (unitOrder.get(a.unitId) ?? 0) - (unitOrder.get(b.unitId) ?? 0) ||
      a.sortOrder - b.sortOrder
  );

  for (const [index, row] of rows.entries()) {
    await db
      .update(lessons)
      .set({ unitId: targetUnitId, sortOrder: index })
      .where(eq(lessons.id, row.id));
  }

  // Явцын мөрүүдийг шинэ курс руу заалгана.
  await db.execute(
    sql`UPDATE lesson_progress SET course_slug = ${COURSE_SLUG} WHERE course_slug = 'matchstick'`
  );

  // Хоосон болсон нэгжүүд, дараа нь курс.
  for (const unit of oldUnits) await db.delete(units).where(eq(units.id, unit.id));
  await db.delete(courses).where(eq(courses.slug, "matchstick"));

  console.log(`  → таягны ${rows.length} хичээл зөөгдөж, хуучин курс устлаа`);
  return rows.length;
}

void main();
