/**
 * «Таягны оньсого» курсийг үүсгэж 200 дасгалаар дүүргэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:matchstick -- <багшийн-эсвэл-админы-имэйл> [--force]
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: хичээлийг гарчгаар шалгаад зөвхөн байхгүйг
 * нэмнэ. `--force` нь байгаа хичээлийн дасгалыг шинэчилж, хөтөлбөрт
 * байхгүй хичээлийг устгана (`seed-sudoku-course.ts`-ийн адил).
 *
 * ⚠ ОНЬСОГО БҮР ПРОГРАМЧЛАН ҮҮСГЭГДЭЖ, ГАНЦ ШИЙДЭЛТЭЙ эсэх нь бүрэн
 * хайлтаар батлагдана. Хоёр шийдэлтэй таягны оньсого нь «алийг хүлээж
 * авах вэ?» гэсэн таамаг болж, сурагч зөв бодсон ч буруу гэж хэлэгдэж
 * магадгүй.
 *
 * ҮҮСГЭХ АРГА (`lib/puzzles/matchstick.ts`-ийн моделийг үзнэ үү):
 *   1. ЗӨВ тэгшитгэлүүдийг бүрэн тоочно (a±b=c).
 *   2. Тус бүрээс НЭГ таяг зөөж болох БҮХ хувилбарыг гаргана.
 *   3. Уншигдах БӨГӨӨД БУРУУ болсон хувилбарууд нь оньсого болох
 *      нэр дэвшигч — сурагч тэр нүүдлийг ЭСРЭГЭЭР хийвэл шийднэ.
 *   4. Зөвхөн ГАНЦ шийдэлтэйг үлдээнэ.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";
import {
  applyMove,
  countSolutions,
  decodeMatchstick,
  encodeMatchstick,
  evaluate,
  fromText,
  slots,
  toText,
  type Matchstick,
  type Slot,
} from "../src/lib/puzzles/matchstick";

const args = process.argv.slice(2);
const force = args.includes("--force");
const [emailArg] = args.filter((arg) => !arg.startsWith("--"));

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:matchstick -- <email> [--force]");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

const COURSE_SLUG = "matchstick";
const TOTAL_PUZZLES = 200;

type Tier = "easy" | "medium" | "hard";

type Candidate = {
  /** Оньсогын текст — «6+4=4». */
  text: string;
  /** Шийдэл — «0+4=4». */
  solution: string;
  puzzle: Matchstick;
  tier: Tier;
};

// ---------------------------------------------------------------------------
// 1. Зөв тэгшитгэлүүд
// ---------------------------------------------------------------------------

function trueEquations(): string[] {
  const out = new Set<string>();

  for (let a = 0; a <= 20; a += 1) {
    for (let b = 0; b <= 20; b += 1) {
      for (const op of ["+", "-"] as const) {
        const c = op === "+" ? a + b : a - b;
        if (c < 0 || c > 99) continue;

        const text = `${a}${op}${b}=${c}`;
        // 7 тэмдэгтээс урт бол гар утасны дэлгэцэнд таяг нь жижгэрч танигдахаа болино.
        if (text.length > 7) continue;

        const puzzle = fromText(text);
        if (puzzle && evaluate(puzzle) === true) out.add(text);
      }
    }
  }

  return [...out].sort();
}

// ---------------------------------------------------------------------------
// 2-4. Нэр дэвшигчид
// ---------------------------------------------------------------------------

/**
 * Хүндрэлийг ШИЙДЛИЙН НҮҮДЛИЙН ШИНЖЭЭР тогтооно (таамаглалаар биш):
 *
 *   • хөнгөн — нүүдэл НЭГ нүдний дотор, тэгшитгэл 5 тэмдэгт. Сурагч
 *     зөвхөн нэг тоог л ажиглана.
 *   • дунд   — нүүдэл хоёр нүдний ХООРОНД, эсвэл тэгшитгэл урт.
 *   • хүнд   — нүүдэл ТЭМДЭГ (+ − =) -ийг хөнддөг. Эдгээр нь «аha»
 *     нүүдлүүд: «+»-ийн босоог авч «−» болгох гэх мэт. Сурагч тоонуудыг
 *     л харж байвал хэзээ ч олохгүй.
 */
function classify(puzzle: Matchstick, move: { from: Slot; to: Slot }, text: string): Tier {
  const touchesOperator =
    puzzle.cells[move.from.cell].kind === "operator" ||
    puzzle.cells[move.to.cell].kind === "operator";

  if (touchesOperator) return "hard";
  if (move.from.cell === move.to.cell && text.length === 5) return "easy";
  return "medium";
}

/**
 * ЧАНАРЫН шүүлт.
 *
 * ⚠ Бүх тоо нь тэг байх тэгшитгэлүүдийг («0+0=0», «0-8=0») хасна:
 * тэдгээр нь техникийн хувьд зөв ч сурагчид «заль» шиг мэдрэгдэж,
 * математик биш тэмдэг тоглоом болно. Мөн генератор тэднийг ХАМГИЙН
 * ОЛООР гаргадаг тул шүүхгүй бол курс бүхэлдээ тэгээр дүүрнэ.
 */
function goodQuality(solution: string): boolean {
  const digits = solution.replace(/[^0-9]/g, "");
  const nonZero = [...digits].filter((d) => d !== "0").length;
  return nonZero >= 2;
}

function buildCandidates(): Candidate[] {
  const seen = new Map<string, Candidate>();

  for (const equation of trueEquations()) {
    if (!goodQuality(equation)) continue;

    const solved = fromText(equation);
    if (!solved) continue;

    const { filled, empty } = slots(solved);

    for (const from of filled) {
      for (const to of empty) {
        const candidate = applyMove(solved, from, to);
        if (!candidate) continue;

        const text = toText(candidate);
        if (text === null) continue; // уншигдахгүй дүрс — сурагч юу болохыг ойлгохгүй
        if (evaluate(candidate) !== false) continue; // оньсого нь БУРУУ байх ёстой
        if (seen.has(text)) continue;
        if (countSolutions(candidate) !== 1) continue; // ЗӨВХӨН ганц шийдэлтэй

        seen.set(text, {
          text,
          solution: equation,
          puzzle: candidate,
          // ⚠ Сурагчийн нүүдэл нь бидний хийсний ЭСРЭГ тал — тиймээс
          // `to`-гоос `from` руу. Хүндрэлийг сурагчийн нүүдлээр хэмжинэ.
          tier: classify(candidate, { from: to, to: from }, text),
        });
      }
    }
  }

  return [...seen.values()];
}

/**
 * 200 оньсогыг ХҮНДРЭЛЭЭР тэнцүү, ШИЙДЭЛ нь давтагдахгүй байхаар сонгоно.
 *
 * ⚠ Шийдлээр давхардлыг хална: нэг зөв тэгшитгэлээс хэдэн арван оньсого
 * гардаг тул шүүхгүй бол «0+4=4» гэсэн нэг шийдэлтэй 10 оньсого зэрэг
 * тааралдаж, сурагч хариуг хэв маягаар таана.
 *
 * ⚠ RNG ХЭРЭГЛЭХГҮЙ: эрэмбэлээд дараалан сонгоно. Ингэснээр скриптийг
 * дахин ажиллуулахад ЯГ ижил 200 оньсого гарч, `--force` нь агуулгыг
 * дэмий сольдоггүй.
 */
function pick(candidates: Candidate[]): Record<Tier, Candidate[]> {
  const byTier: Record<Tier, Candidate[]> = { easy: [], medium: [], hard: [] };
  const usedSolutions: Record<Tier, Set<string>> = {
    easy: new Set(),
    medium: new Set(),
    hard: new Set(),
  };

  const sorted = [...candidates].sort((a, b) =>
    a.solution === b.solution ? a.text.localeCompare(b.text) : a.solution.localeCompare(b.solution)
  );

  /*
   * ⚠ 200 нь 3-д тэгш хуваагдахгүй тул `ceil` хэрэглэвэл 201 гарна.
   * Илүүдлийг ЭХНИЙ шатлалуудад хуваарилж нийлбэрийг ЯГ 200 болгоно.
   */
  const base = Math.floor(TOTAL_PUZZLES / 3);
  const remainder = TOTAL_PUZZLES % 3;
  const quota: Record<Tier, number> = {
    easy: base + (remainder > 0 ? 1 : 0),
    medium: base + (remainder > 1 ? 1 : 0),
    hard: base,
  };

  // Эхлээд шийдэл нь ӨВӨРМӨЦ оньсогуудаар дүүргэнэ.
  for (const candidate of sorted) {
    const bucket = byTier[candidate.tier];
    if (bucket.length >= quota[candidate.tier]) continue;
    if (usedSolutions[candidate.tier].has(candidate.solution)) continue;
    usedSolutions[candidate.tier].add(candidate.solution);
    bucket.push(candidate);
  }

  // Хүрэлцэхгүй бол шийдэл давтагдахыг зөвшөөрч нөхнө.
  for (const candidate of sorted) {
    const bucket = byTier[candidate.tier];
    if (bucket.length >= quota[candidate.tier]) continue;
    if (bucket.some((item) => item.text === candidate.text)) continue;
    bucket.push(candidate);
  }

  return byTier;
}

// ---------------------------------------------------------------------------
// Тоолох асуултууд (`choice`) — шинэ код шаардахгүй
// ---------------------------------------------------------------------------

type Choice = {
  prompt: string;
  options: string[];
  correct: number;
  explanation: string;
};

const COUNTING: Choice[] = [
  {
    prompt: "«8» тоог таягаар бичихэд хэдэн таяг орох вэ?",
    options: ["7", "6", "8", "5"],
    correct: 0,
    explanation: "«8» нь долоон сегмент бүгдийг хэрэглэнэ — хамгийн их таягтай тоо.",
  },
  {
    prompt: "Хамгийн БАГА таягтай тоо аль нь вэ?",
    options: ["1", "7", "4", "0"],
    correct: 0,
    explanation: "«1» нь зөвхөн хоёр таягтай. «7» гурав, «4» дөрөв, «0» зургаа.",
  },
  {
    prompt: "2×2 тортой дөрвөлжин (12 таяг) дотор ХЭДЭН дөрвөлжин байна?",
    options: ["5", "4", "6", "8"],
    correct: 0,
    explanation: "Дөрвөн жижиг дөрвөлжин, дээр нь бүх торыг бүрхсэн нэг том — нийт 5.",
  },
  {
    prompt: "3×3 тор байгуулахад хэдэн таяг хэрэгтэй вэ?",
    options: ["24", "18", "21", "27"],
    correct: 0,
    explanation: "Хэвтээ 4 мөр × 3 = 12, босоо 4 багана × 3 = 12. Нийт 24.",
  },
  {
    prompt: "3×3 тор дотор хэдэн дөрвөлжин байна (бүх хэмжээг тоолно)?",
    options: ["14", "9", "12", "10"],
    correct: 0,
    explanation: "1×1 нь 9, 2×2 нь 4, 3×3 нь 1 — нийт 14.",
  },
  {
    prompt: "Таяг зөөх үед таягны НИЙТ тоо яах вэ?",
    options: [
      "Өөрчлөгдөхгүй",
      "Нэгээр багасна",
      "Нэгээр нэмэгдэнэ",
      "Хоёр дахин болно",
    ],
    correct: 0,
    explanation:
      "Зөөх нь нэг таягийг өөр газар ТАВИХ — авч хаях биш. Тиймээс тоо ямагт хэвээр. " +
      "Энэ нь оньсого бодоход хамгийн хэрэгтэй дүрэм.",
  },
];

// ---------------------------------------------------------------------------
// Хөтөлбөр
// ---------------------------------------------------------------------------

type Item =
  | { kind: "choice"; spec: Choice }
  | { kind: "matchstick"; grid: string; prompt: string; explanation: string };

type Unit = { title: string; color: string; lessons: { title: string; xp: number; items: Item[] }[] };

const TIER_LABEL: Record<Tier, string> = { easy: "хөнгөн", medium: "дунд", hard: "хүнд" };
const TIER_XP: Record<Tier, number> = { easy: 8, medium: 10, hard: 12 };
const TIER_COLOR: Record<Tier, string> = { easy: "emerald", medium: "amber", hard: "rose" };

const TIER_HINT: Record<Tier, string> = {
  easy: "Нэг тоог ажигла — таяг тэр тооны дотор зөөгдөнө.",
  medium: "Таяг нэг тооноос НӨГӨӨ тоо руу шилжиж болно.",
  hard: "Тэмдгийг ч мартаж болохгүй: «+»-ийн босоог авбал «−» болно, «−»-д нэмбэл «=».",
};

function buildUnits(picked: Record<Tier, Candidate[]>): Unit[] {
  const unitList: Unit[] = [
    {
      title: "Дүрэм ба тоолох",
      color: "sky",
      lessons: COUNTING.map((spec, index) => ({
        title: `Тоолох ${index + 1}`,
        xp: 8,
        items: [{ kind: "choice" as const, spec }],
      })),
    },
  ];

  for (const tier of ["easy", "medium", "hard"] as const) {
    unitList.push({
      title: `Тэгшитгэл засах — ${TIER_LABEL[tier]}`,
      color: TIER_COLOR[tier],
      lessons: picked[tier].map((candidate, index) => ({
        title: `${TIER_LABEL[tier]} ${index + 1}`,
        xp: TIER_XP[tier],
        items: [
          {
            kind: "matchstick" as const,
            grid: encodeMatchstick(candidate.puzzle),
            prompt: "Нэг таяг зөөж тэгшитгэлийг зөв болго.",
            explanation: `Шийдэл: ${candidate.solution}. ${TIER_HINT[tier]}`,
          },
        ],
      })),
    });
  }

  return unitList;
}

const OPTION_IDS = ["a", "b", "c", "d"];

async function main() {
  console.log("Оньсогуудыг үүсгэж шалгаж байна…");

  const candidates = buildCandidates();
  const picked = pick(candidates);
  const total = picked.easy.length + picked.medium.length + picked.hard.length;

  console.log(
    `✓ нэр дэвшигч ${candidates.length}; сонгосон ${total} ` +
      `(хөнгөн ${picked.easy.length}, дунд ${picked.medium.length}, хүнд ${picked.hard.length})`
  );

  if (total < TOTAL_PUZZLES) {
    console.error(`❌ ${TOTAL_PUZZLES} оньсого хүрэлцсэнгүй (${total}). Санд юу ч бичсэнгүй.`);
    process.exitCode = 1;
    return;
  }

  const built = buildUnits(picked);

  // ⚠ Санд хүрэхээс ӨМНӨ бүх grid эргэж уншигдаж, ганц шийдэлтэй эсэхийг батална.
  for (const unit of built) {
    for (const lesson of unit.lessons) {
      for (const item of lesson.items) {
        if (item.kind !== "matchstick") continue;
        const back = decodeMatchstick(item.grid);
        if (!back || countSolutions(back) !== 1) {
          throw new Error(`Оньсого шалгалтад унав: ${item.grid}`);
        }
      }
    }
  }
  console.log("✓ Бүх оньсого эргэж уншигдаж, ганц шийдэлтэй нь батлагдлаа");

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
        title: "Таягны оньсого",
        titleEn: "Matchstick Puzzle",
        description:
          "Нэг таяг зөөж буруу тэгшитгэлийг зөв болго. Тоолох дасгалаас " +
          "эхлээд тэмдэг өөрчлөх «аha» нүүдэл хүртэл.",
        descriptionEn:
          "Move a single matchstick to fix a wrong equation. From counting " +
          "warm-ups to the operator-swapping aha moves.",
        icon: "lightbulb",
        color: "amber",
        status: "active",
        // `lib/tactiq/schools.ts` → "mind" сургууль (логик).
        school: "mind",
        schools: ["mind"],
      });
      console.log('"Таягны оньсого" курс үүслээ.');
    } else if (course.status !== "active") {
      await db
        .update(courses)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(courses.slug, COURSE_SLUG));
      console.log('"Таягны оньсого" курс "coming-soon" → "active" боллоо.');
    }

    let addedLessons = 0;
    let addedExercises = 0;
    let replacedLessons = 0;
    let removedLessons = 0;

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

      if (force) {
        const wanted = new Set(unit.lessons.map((lesson) => lesson.title));
        for (const row of existingLessons.filter((item) => !wanted.has(item.title))) {
          await db.delete(lessons).where(eq(lessons.id, row.id));
          removedLessons += 1;
        }
      }

      for (const lesson of unit.lessons) {
        const existing = existingByTitle.get(lesson.title);
        if (existing && !force) continue;

        let lessonId: string;

        if (existing) {
          lessonId = existing.id;
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
            sortOrder: lessonOrder++,
            createdBy: owner.uid,
          });
          addedLessons += 1;
        }

        let exerciseOrder = 0;

        for (const item of lesson.items) {
          await db.insert(exercises).values({
            lessonId,
            type: item.kind === "choice" ? "choice" : "matchstick",
            prompt: item.kind === "choice" ? item.spec.prompt : item.prompt,
            options:
              item.kind === "choice"
                ? item.spec.options.map((label, index) => ({ id: OPTION_IDS[index], label }))
                : null,
            correctOptionId: item.kind === "choice" ? OPTION_IDS[item.spec.correct] : null,
            grid: item.kind === "matchstick" ? item.grid : null,
            explanation: item.kind === "choice" ? item.spec.explanation : item.explanation,
            sortOrder: exerciseOrder++,
            createdBy: owner.uid,
          });
          addedExercises += 1;
        }
      }
    }

    if (addedLessons === 0 && replacedLessons === 0 && removedLessons === 0) {
      console.log(
        "Бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.\n" +
          "Шинэчлэх бол: npm run seed:matchstick -- <email> --force"
      );
    } else {
      const parts: string[] = [];
      if (addedLessons > 0) parts.push(`${addedLessons} хичээл нэмэгдлээ`);
      if (replacedLessons > 0) parts.push(`${replacedLessons} хичээл шинэчлэгдлээ`);
      if (removedLessons > 0) parts.push(`${removedLessons} хоцрогдсон хичээл устав`);
      console.log(
        `✅ "Таягны оньсого" — ${parts.join(", ")}. Нийт ${addedExercises} дасгал бичигдлээ.\n` +
          `Засах: /admin/courses/${COURSE_SLUG}`
      );
    }
  } finally {
    await pool.end();
  }
}

void main();
