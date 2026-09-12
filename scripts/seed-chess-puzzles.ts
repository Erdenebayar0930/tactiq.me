/**
 * ШАТРЫН ӨРӨГ БОДЛОГЫН нэгжийг шатрын курст нэмэх CLI.
 *
 * Ажиллуулах:
 *   npm run seed:puzzles -- <багшийн-эсвэл-админы-имэйл>
 *
 * ⚠ ДАХИН АЖИЛЛУУЛЖ БОЛНО: ижил нэртэй нэгж байвал юу ч хөндөхгүй гарна.
 *
 * ⚠ БОДЛОГЫН ЧАНАРЫГ ЭНД ШАЛГАНА, зөвхөн хууль ёсны эсэхийг биш:
 *   1. шийдэл нь бодитоор мадаар төгсөх ёстой (мад гэж зарласан бол)
 *   2. сурагчийн ЭХНИЙ нүүдэл нь ЦОРЫН ГАНЦ шийдэл байх ёстой
 *   3. өрсөлдөгчийн хариу бүр АЛБАДМАЛ (өөр хууль ёсны нүүдэлгүй) байх ёстой
 *
 * Яагаад (2) ба (3) чухал вэ: өөр шийдэлтэй бодлого дээр сурагч ЗӨВ мад
 * хийчихээд "буруу" гэсэн хариу авна — учир нь тоглуулагч хадгалсан ГАНЦ
 * шугамтай харьцуулдаг. Энэ бол хүүхдийн итгэлийг алдагдуулах хамгийн
 * хортой алдаа тул шалгалтад унасан бодлогыг ОРУУЛАХГҮЙ, шалтгааныг нь
 * хэвлэнэ.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { auditMateLine, MATE_SEARCH_MAX_DEPTH } from "../src/lib/chess/mateSearch";
import { formatSolution, parsePuzzle } from "../src/lib/chess/puzzle";
import { courses, exercises, lessons, units, users } from "../src/lib/db/schema";


const [emailArg] = process.argv.slice(2);

if (!emailArg) {
  console.error("Хэрэглээ: npm run seed:puzzles -- <email>");
  process.exit(1);
}

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

/*
 * ⚠ ЭНЭ SCRIPT ИДЭВХГҮЙ. «Өрөг бодлого» бүлгийг "chess" курсийн 10 түвшинтэй
 * нэгтгэсэн: бодлогууд нь 6-р (Нэг нүүдэлд мад), 8-р (Хоёр нүүдэлд мад),
 * 10-р (Нээлтийн урхи) түвшинд орсон. Ажиллуулбал устгасан хуучин бүлгийг
 * ДАХИН үүсгэж, давхардал буцаж ирнэ. Шатрын агуулгыг
 * `scripts/seed-chess-curriculum.ts` л удирдана.
 */
console.error(
  "seed-chess-puzzles идэвхгүй: өрөг бодлогууд шатрын 6, 8, 10-р түвшинд нэгтгэгдсэн. " +
    "scripts/seed-chess-curriculum.ts-ийг ашиглана уу."
);
process.exit(0);

const COURSE_SLUG = "chess";
const UNIT_TITLE = "Өрөг бодлого";

type Puzzle = {
  prompt: string;
  fen: string;
  solution: string;
  explanation: string;
};

const LESSONS: { title: string; xp: number; puzzles: Puzzle[] }[] = [
  {
    title: "Сүүлийн эгнээний мад",
    xp: 15,
    puzzles: [
      {
        prompt: "Цагаанаар тоглож байна. Нэг нүүдлээр мад хий.",
        fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
        solution: "a1a8",
        explanation:
          "Хар ноёныг өөрийнх нь хүүнүүд боож, зугтах нүд үлдээгүй — тэрүүг " +
          "«сүүлийн эгнээний мад» гэнэ.",
      },
      {
        prompt: "Цагаанаар тоглож байна. Нэг нүүдлээр мад хий.",
        fen: "6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
        solution: "b1b8",
        explanation: "Тэрэг эгнээгээр орж, ноён зугтах нүдгүй.",
      },
    ],
  },
  {
    title: "Бэрсийн мад",
    xp: 15,
    puzzles: [
      {
        prompt: "Цагаанаар тоглож байна. Нэг нүүдлээр мад хий.",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
        solution: "f3f7",
        explanation:
          "«Сурагчийн мад» — бэрс f7 идэж, түүнийг тэмээ хамгаалж байна. " +
          "f7 нүд бол хамгийн сул тал: зөвхөн ноён хамгаалдаг.",
      },
      {
        prompt: "Цагаанаар тоглож байна. Нэг нүүдлээр мад хий.",
        // ⚠ Өмнө нь энд "7k/8/6K1/8/8/8/8/7Q" байсныг ЭНЭ ФАЙЛЫН АУДИТ
        // унагаасан: тэр байрлалд ГУРВАН өөр мад (Kf7#, Qa8#, Qh7#) байсан
        // тул сурагч зөв мадаар дуусгаад "буруу" гэсэн хариу авах байлаа.
        fen: "6k1/5ppp/8/8/8/7Q/5PPP/6K1 w - - 0 1",
        solution: "h3c8",
        explanation:
          "Бэрс хол зайнаас сүүлийн эгнээнд орлоо. Ноёны өмнөх хүүнүүд " +
          "нь өөрсдөө шоронгийн хана болж байна.",
      },
    ],
  },
  {
    title: "Хоёр нүүдэлт бодлого",
    xp: 25,
    puzzles: [
      {
        prompt:
          "Цагаанаар тоглож байна. ХОЁР нүүдлээр мад хий — эхний нүүдлийн дараа хар ноён хариулна.",
        // Хоёр тэргийн «шат»: нэг нь эгнээ хаана, нөгөө нь мад хийнэ.
        fen: "K7/8/8/8/3R4/6R1/8/2k5 w - - 0 1",
        solution: "g3g2 c1b1 d4d1",
        explanation:
          "Rg2 нь ноёныг хоёр дахь эгнээнээс салгана. Ноён b1 рүү зугтахад нөгөө тэрэг Rd1# хийнэ — «шатны мад» гэдэг сонгодог арга.",
      },
      {
        prompt: "Цагаанаар тоглож байна. ХОЁР нүүдлээр мад хий.",
        // Бэрс ба тэргийн хамтын ажиллагаа.
        fen: "8/8/8/6Q1/4R3/8/8/3k1K2 w - - 0 1",
        solution: "g5g2 d1c1 e4e1",
        explanation:
          "Бэрс хоёр дахь эгнээг эзэлж, ноёны зугтах замыг хаана. Дараа нь тэрэг сүүлийн эгнээнд бууж мад.",
      },
      {
        prompt:
          "Цагаанаар тоглож байна. ХОЁР нүүдлээр мад хий. Санамж: заримдаа хамгийн хүчтэй нүүдэл бол НОЁНЫ нүүдэл байдаг.",
        // «Тэвчээрийн нүүдэл» (waiting move): цагаан шууд мад хийхгүй,
        // харин ноёныг ойртуулж, хар ноёныг албадан хөдөлгөнө.
        fen: "3B4/6R1/8/8/8/8/8/4K2k w - - 0 1",
        solution: "e1f2 h1h2 g7h7",
        explanation:
          "Kf2 нь заналхийлэлгүй мэт ч хар ноёнд h2-оос өөр нүүдэл үлдээхгүй. Дараа нь Rh7# — тэмээ g1 нүдийг хаасан байна.",
      },
    ],
  },
  {
    title: "Хараар мад хий",
    xp: 20,
    puzzles: [
      {
        prompt: "ХАРААР тоглож байна. Нэг нүүдлээр мад хий.",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
        solution: "d8h4",
        explanation:
          "«Тэнэгийн мад» — хамгийн богино мад. Ноёныхоо өмнөх хүүнүүдийг " +
          "болгоомжгүй хөдөлгөвөл ийм болно.",
      },
    ],
  },
];

/**
 * Бодлогыг ЧАНАРЫН шалгуураар шалгана.
 *
 * Хууль ёсны эсэхээс гадна — сурагчийн НҮҮДЭЛ БҮР дээр шийдэл нь ЦОРЫН
 * ГАНЦ мөн эсэхийг машинаар шалгана (`lib/chess/mateSearch.ts`). Энэ нь
 * `npm run audit:puzzles`-ийн ашигладаг ЯГ ИЖИЛ шалгуур — санд орох
 * агуулга ба санд БАЙГАА агуулга хоёр өөр стандартаар хэмжигдэхгүй.
 *
 * @returns алдааны тайлбар, эсвэл зөв бол `null`
 */
function auditPuzzle(puzzle: Puzzle): string | null {
  const parsed = parsePuzzle(puzzle.fen, puzzle.solution);
  if (!parsed) return "шийдэл хууль бус эсвэл хэлбэр буруу";

  if (!parsed.endsInMate) return "мадаар төгсөхгүй байна";

  const report = auditMateLine(parsed.fen, parsed.moves);

  // Хайлтын гүнээс давсан бодлого: шугам нь хууль ёсны, мадаар төгсдөг нь
  // шалгагдсан тул ОРУУЛНА, гэхдээ нотлогдоогүйг ил хэлнэ.
  if (report?.startsWith("HETSUU_GUN:")) {
    console.warn(
      `  ⚠ ${parsed.playerMoves} нүүдэлт бодлого — цорын ганц шийдэл эсэхийг ` +
        `машинаар шалгаагүй (хайлтын дээд гүн ${MATE_SEARCH_MAX_DEPTH}). ` +
        `Гараар хянана уу: ${puzzle.fen}`
    );
    return null;
  }

  return report;
}
async function main() {
  // Санд хүрэхээс ӨМНӨ бүх бодлогыг шалгана — нэг нь ч буруу бол юу ч
  // бичихгүй. Хагас бичигдсэн нэгж нь idempotent шалгалтыг ч хуурна
  // (нэгж байгаа тул дараагийн ажиллуулалт алгасна).
  const audited = LESSONS.map((lesson) => ({
    ...lesson,
    puzzles: lesson.puzzles.map((puzzle) => ({ puzzle, error: auditPuzzle(puzzle) })),
  }));

  const failures = audited.flatMap((lesson) =>
    lesson.puzzles
      .filter((item) => item.error)
      .map((item) => `  ✗ ${lesson.title}: ${item.puzzle.fen}\n    ${item.error}`)
  );

  if (failures.length > 0) {
    console.error("Бодлогын шалгалт унасан:\n" + failures.join("\n"));
    process.exitCode = 1;
    return;
  }

  console.log(
    `✓ ${audited.reduce((n, l) => n + l.puzzles.length, 0)} бодлого шалгалтад тэнцлээ ` +
      "(ганц шийдэлтэй, хариу албадмал, мадаар төгсдөг)."
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
      .select({ slug: courses.slug })
      .from(courses)
      .where(eq(courses.slug, COURSE_SLUG))
      .limit(1);

    if (!course) {
      console.error(`"${COURSE_SLUG}" курс байхгүй байна.`);
      process.exitCode = 1;
      return;
    }

    /**
     * Нэгжийг ОЛОХ, эсвэл үүсгэх.
     *
     * ⚠ Давхардлыг ХИЧЭЭЛИЙН ТҮВШИНД шалгана, нэгжийн биш. Урьд нь «нэгж
     * байвал бүхэлд нь гарах» байсан нь шинэ хичээл нэмэхийг БҮРМӨСӨН
     * хаадаг байв: нэгжээ нэг удаа үүсгэсэн бүх сервер хожмын багцыг
     * хэзээ ч авахгүй. Одоо байхгүй хичээлүүд л нэмэгдэнэ.
     */
    const [existingUnit] = await db
      .select({ id: units.id })
      .from(units)
      .where(and(eq(units.courseSlug, COURSE_SLUG), eq(units.title, UNIT_TITLE)))
      .limit(1);

    let unitId: string;

    if (existingUnit) {
      unitId = existingUnit.id;
    } else {
      // Байгаа нэгжүүдийн АРД нэмнэ — хичээлийн зам дарааллаар нээгддэг тул
      // дунд нь оруулбал сурагчдын аль хэдийн дуусгасан замыг эвдэнэ.
      const existingUnits = await db
        .select({ sortOrder: units.sortOrder })
        .from(units)
        .where(eq(units.courseSlug, COURSE_SLUG));
      const nextOrder = existingUnits.reduce((max, row) => Math.max(max, row.sortOrder + 1), 0);

      const [created] = await db
        .insert(units)
        .values({
          courseSlug: COURSE_SLUG,
          title: UNIT_TITLE,
          color: "amber",
          sortOrder: nextOrder,
          createdBy: owner.uid,
        })
        .returning({ id: units.id });
      unitId = created.id;
    }

    // Тухайн нэгжид АЛЬ ХЭДИЙН байгаа хичээлүүд — нэрээр нь давхардлыг шалгана.
    const existingLessons = await db
      .select({ title: lessons.title, sortOrder: lessons.sortOrder })
      .from(lessons)
      .where(eq(lessons.unitId, unitId));
    const existingTitles = new Set(existingLessons.map((row) => row.title));

    let lessonOrder = existingLessons.reduce(
      (max, row) => Math.max(max, row.sortOrder + 1),
      0
    );
    let skipped = 0;
    let puzzleCount = 0;

    for (const lesson of audited) {
      if (existingTitles.has(lesson.title)) {
        skipped += 1;
        continue;
      }

      const lessonId = crypto.randomUUID();

      await db.insert(lessons).values({
        id: lessonId,
        unitId,
        title: lesson.title,
        xpReward: lesson.xp,
        sortOrder: lessonOrder++,
        createdBy: owner.uid,
      });

      let exerciseOrder = 0;

      for (const { puzzle } of lesson.puzzles) {
        const parsed = parsePuzzle(puzzle.fen, puzzle.solution)!;

        await db.insert(exercises).values({
          lessonId,
          type: "chess-puzzle",
          prompt: puzzle.prompt,
          // Хэвшсэн хэлбэрээр нь хадгална — админ, тоглуулагч ижил мөр уншина.
          fen: parsed.fen,
          solution: formatSolution(parsed.moves),
          explanation: puzzle.explanation,
          sortOrder: exerciseOrder++,
          createdBy: owner.uid,
        });
        puzzleCount += 1;
      }
    }

    const added = audited.length - skipped;
    console.log(
      added === 0
        ? `"${UNIT_TITLE}" нэгжийн бүх хичээл аль хэдийн байна — юу ч өөрчлөөгүй.`
        : `✅ "${UNIT_TITLE}" — ${added} хичээл, ${puzzleCount} бодлого нэмэгдлээ` +
            (skipped > 0 ? ` (${skipped} хичээл аль хэдийн байсан)` : "") +
            "\nЗасах: /admin/courses/chess"
    );
  } finally {
    await pool.end();
  }
}

void main();
