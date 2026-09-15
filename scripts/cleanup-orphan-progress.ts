/**
 * ӨНЧИН ЯВЦЫН МӨРҮҮДИЙГ ЦЭВЭРЛЭНЭ.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/cleanup-orphan-progress.ts [--yes]
 *
 * ⚠ ЯАГААД ҮҮСДЭГ ВЭ: `lesson_progress`, `path_chests`, `course_time`
 * гурав нь курс/хичээл/бүлэг рүү ГАДААД ТҮЛХҮҮРГҮЙ, зөвхөн ID-аар
 * холбогддог (`schema.ts`-ийн тайлбар). Тиймээс курс устгахад сан тэдгээр
 * мөрийг өөрөө цэвэрлэдэггүй — байхгүй хичээл рүү заасан хог үлддэг.
 *
 * ⚠ ЯАГААД АЮУЛТАЙ ВЭ: ижил ID-тай (эсвэл ижил slug-тай) шинэ курс
 * үүсгэвэл хуучин явц «сэргэж» ирж, сурагч хийгээгүй хичээлээ дуусгасан
 * харагдана. Мөн ахицын тоо худал өснө.
 *
 * ⚠ `--yes` туггүйгээр зөвхөн ТООЛНО.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";

const confirmed = process.argv.includes("--yes");

async function main() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    console.error("DATABASE_URL тохируулаагүй байна.");
    process.exit(1);
  }

  const pool = createDbPool(connectionString, 1);
  const db = drizzle(pool);

  try {
    const counts = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM lesson_progress WHERE lesson_id NOT IN (SELECT id FROM lessons))::int AS progress,
        (SELECT count(*) FROM path_chests WHERE unit_id NOT IN (SELECT id FROM units))::int AS chests,
        (SELECT count(*) FROM course_time WHERE course_slug NOT IN (SELECT slug FROM courses))::int AS time
    `);

    console.log("өнчин мөр:", counts.rows[0]);

    if (!confirmed) {
      console.log("⚠ ЗӨВХӨН ТООЛОВ. Устгах бол `--yes` нэмнэ үү.");
      return;
    }

    await db.execute(
      sql`DELETE FROM lesson_progress WHERE lesson_id NOT IN (SELECT id FROM lessons)`
    );
    await db.execute(sql`DELETE FROM path_chests WHERE unit_id NOT IN (SELECT id FROM units)`);
    await db.execute(
      sql`DELETE FROM course_time WHERE course_slug NOT IN (SELECT slug FROM courses)`
    );

    const after = await db.execute(sql`
      SELECT
        (SELECT count(*) FROM lesson_progress WHERE lesson_id NOT IN (SELECT id FROM lessons))::int AS progress,
        (SELECT count(*) FROM path_chests WHERE unit_id NOT IN (SELECT id FROM units))::int AS chests,
        (SELECT count(*) FROM course_time WHERE course_slug NOT IN (SELECT slug FROM courses))::int AS time
    `);
    console.log("✅ цэвэрлэв. Үлдсэн:", after.rows[0]);
  } finally {
    await pool.end();
  }
}

void main();
