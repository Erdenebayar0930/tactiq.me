/**
 * MIND-ЭЭС БУСАД БҮХ КУРСЫГ УСТГАНА.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/delete-non-mind-courses.ts --yes
 *
 * ⚠ БУЦААХ АРГАГҮЙ. Хичээл, дасгал, сурагчдын явц, бэлгийн хайрцаг,
 * зарцуулсан хугацаа бүгд хамт устана. `--yes` туггүйгээр зөвхөн ТООЛОНО.
 *
 * ⚠ ГАДААД ТҮЛХҮҮРГҮЙ ХОЛБООС: `lesson_progress`, `path_chests`,
 * `course_time` нь курс/хичээл/бүлэг рүү ЗӨВХӨН ТҮЛХҮҮРЭЭР холбогддог
 * (`schema.ts`-ийн тайлбар). Сан тэднийг өөрөө цэвэрлэхгүй тул ГАРААР
 * устгана — эс бөгөөс өнчин мөр үлдэж, дараа нь ижил slug-тай курс
 * үүсгэвэл хуучин явц «сэргэж» ирнэ.
 *
 * ⚠ ДАРААЛАЛ ЧУХАЛ: хүүхэд мөрүүдийг эхлээд устгана, эс бөгөөс
 * `units_course_slug_courses_slug_fk` татгалзана.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, inArray, ne, sql } from "drizzle-orm";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import {
  courseTime,
  courses,
  exercises,
  lessonProgress,
  lessons,
  pathChests,
  units,
  users,
} from "../src/lib/db/schema";

const KEEP_SCHOOL = "mind";
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
    const doomed = await db
      .select({ slug: courses.slug, title: courses.title, school: courses.school })
      .from(courses)
      .where(ne(courses.school, KEEP_SCHOOL));

    if (doomed.length === 0) {
      console.log("Mind-ээс бусад курс алга — юу ч хийсэнгүй.");
      return;
    }

    const slugs = doomed.map((row) => row.slug);

    const unitRows = await db
      .select({ id: units.id })
      .from(units)
      .where(inArray(units.courseSlug, slugs));
    const unitIds = unitRows.map((row) => row.id);

    const lessonRows =
      unitIds.length > 0
        ? await db.select({ id: lessons.id }).from(lessons).where(inArray(lessons.unitId, unitIds))
        : [];
    const lessonIds = lessonRows.map((row) => row.id);

    console.log(
      `${doomed.length} курс, ${unitIds.length} бүлэг, ${lessonIds.length} хичээл устах гэж байна.`
    );
    for (const row of doomed) console.log(`  − ${row.school} / ${row.slug} — ${row.title}`);

    if (!confirmed) {
      console.log("\n⚠ ЗӨВХӨН ТООЛОВ. Үнэхээр устгах бол `--yes` нэмнэ үү.");
      return;
    }

    /*
     * Хүүхэд мөрүүдээс дээш: дасгал → явц/хайрцаг → хичээл → бүлэг → курс.
     */
    if (lessonIds.length > 0) {
      await db.delete(exercises).where(inArray(exercises.lessonId, lessonIds));
      await db.delete(lessonProgress).where(inArray(lessonProgress.lessonId, lessonIds));
      await db.delete(lessons).where(inArray(lessons.id, lessonIds));
    }

    if (unitIds.length > 0) {
      await db.delete(pathChests).where(inArray(pathChests.unitId, unitIds));
      await db.delete(units).where(inArray(units.courseSlug, slugs));
    }

    // Курсын түлхүүрээр холбогдсон үлдэгдэл (хичээлгүй ч мөр үлдсэн байж болно).
    await db.delete(lessonProgress).where(inArray(lessonProgress.courseSlug, slugs));
    await db.delete(courseTime).where(inArray(courseTime.courseSlug, slugs));

    /*
     * ⚠ Сурагчийн ИДЭВХТЭЙ курс устсан бол хоослоно — эс бөгөөс `/learn`
     * дээр «Курс олдсонгүй» гарч, тэр хүн мухардана.
     */
    const cleared = await db
      .update(users)
      .set({ activeCourseSlug: null })
      .where(inArray(users.activeCourseSlug, slugs))
      .returning({ uid: users.uid });

    await db.delete(courses).where(inArray(courses.slug, slugs));

    console.log(`\n✅ ${doomed.length} курс устлаа.`);
    if (cleared.length > 0) {
      console.log(`   ${cleared.length} сурагчийн идэвхтэй курс хоосорлоо — дахин сонгоно.`);
    }

    const left = await db
      .select({ school: courses.school, n: sql<number>`count(*)` })
      .from(courses)
      .groupBy(courses.school);
    console.log("   Үлдсэн:", left);
  } finally {
    await pool.end();
  }
}

void main();
