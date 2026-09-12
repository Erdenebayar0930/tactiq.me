/**
 * САНД БАЙГАА бүх өрөг бодлогыг шалгах CLI.
 *
 * Ажиллуулах:
 *   npm run audit:puzzles
 *
 * ЮУГ ШАЛГАХ ВЭ:
 *   1. шийдэл нь эхлэх байрлалаас хууль ёсны эсэх
 *   2. мадаар төгсдөг бол — түлхүүр нүүдэл нь ЦОРЫН ГАНЦ эсэх
 *      (`lib/chess/mateSearch.ts`, дээд гүн `MATE_SEARCH_MAX_DEPTH`)
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: багш админ дэлгэцээс бодлого оруулахад сервер нь
 * зөвхөн ХУУЛЬ ЁСНЫ эсэхийг шалгадаг — «цорын ганц шийдэлтэй юу» гэдгийг
 * шалгах хайлт нь хүсэлтийн дотор ажиллуулахад хэтэрхий үнэтэй (нэг
 * товшилт серверийн CPU-г секундээр атгана). Тиймээс тэр шалгуурыг ЭНД,
 * офлайнаар хийнэ — жишээ нь шинэ багц оруулсны дараа.
 *
 * ⚠ ЮУ Ч ЗАСАХГҮЙ, зөвхөн тайлагнана. Асуудалтай бодлогыг админ дэлгэцээс
 * гараар засна — аль нь болохыг мөр бүрд хичээлийн нэрээр хэлнэ.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { auditMateLine } from "../src/lib/chess/mateSearch";
import { parsePuzzle, puzzleGoalLabel } from "../src/lib/chess/puzzle";
import { exercises, lessons, units } from "../src/lib/db/schema";

const connectionString = resolveDatabaseUrl();
if (!connectionString) {
  console.error("DATABASE_URL (эсвэл POSTGRES_URL) тохируулаагүй байна.");
  process.exit(1);
}

type Report = { level: "error" | "warn"; message: string };

function audit(fen: string | null, solution: string | null): Report | null {
  const parsed = parsePuzzle(fen, solution);
  if (!parsed) {
    return { level: "error", message: "шийдэл хууль бус эсвэл хэлбэр буруу" };
  }

  // Мадгүй (тактик) бодлогод «цорын ганц» гэсэн ойлголт байхгүй — хамгийн
  // сайн нүүдэл нь хүний үнэлгээний асуудал тул машин шийдэхгүй.
  if (!parsed.endsInMate) return null;

  const report = auditMateLine(parsed.fen, parsed.moves);
  if (!report) return null;

  if (report.startsWith("HETSUU_GUN:")) {
    return {
      level: "warn",
      message: `${parsed.playerMoves} нүүдэлт — цорын ганц шийдэл эсэхийг машинаар шалгаагүй (гараар хянана уу)`,
    };
  }

  return { level: "error", message: report };
}
async function main() {
  const pool = createDbPool(connectionString!, 1);
  const db = drizzle(pool);

  try {
    const rows = await db
      .select({
        id: exercises.id,
        prompt: exercises.prompt,
        fen: exercises.fen,
        solution: exercises.solution,
        lesson: lessons.title,
        course: units.courseSlug,
      })
      .from(exercises)
      .innerJoin(lessons, eq(lessons.id, exercises.lessonId))
      .innerJoin(units, eq(units.id, lessons.unitId))
      .where(eq(exercises.type, "chess-puzzle"))
      .orderBy(sql`${units.courseSlug}, ${lessons.title}`);

    if (rows.length === 0) {
      console.log("Санд өрөг бодлого алга.");
      return;
    }

    let errors = 0;
    let warnings = 0;

    for (const row of rows) {
      const report = audit(row.fen, row.solution);
      const parsed = parsePuzzle(row.fen, row.solution);
      const goal = parsed ? puzzleGoalLabel(parsed) : "?";
      const where = `${row.course} / ${row.lesson}`;

      if (!report) {
        console.log(`✓ ${where} | ${goal} | ${row.solution}`);
        continue;
      }

      if (report.level === "error") {
        errors += 1;
        console.error(`✗ ${where} | ${row.solution}\n    ${report.message}`);
      } else {
        warnings += 1;
        console.warn(`⚠ ${where} | ${row.solution}\n    ${report.message}`);
      }
    }

    console.log(
      `\nНийт ${rows.length} бодлого — ${errors} алдаа, ${warnings} анхааруулга.`
    );

    // Алдаатай бол тэгээс ялгаатай кодоор гарна — CI эсвэл deploy скриптэд
    // холбоход шууд ажиллана.
    if (errors > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
