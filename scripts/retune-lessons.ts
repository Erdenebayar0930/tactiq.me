/**
 * ХИЧЭЭЛИЙН БҮТЭЦ, ОНООГ АГУУЛГАД НЬ ТОХИРУУЛНА.
 *
 * Ажиллуулах:
 *   npm run retune:lessons -- [--apply]
 *
 * `--apply` -гүй бол ЗӨВХӨН тайлан хэвлэнэ (санд юу ч бичихгүй).
 *
 * ХОЁР АЖИЛ:
 *
 * 1. ТААВРЫН ХЯЛБАР ДАСГАЛУУДЫГ НЭГТГЭНЭ. «Таавар» курс нь 260 хичээлтэй
 *    бөгөөд ТУС БҮРД нь ганц дасгал байсан: сурагч нэг товшилт хийгээд
 *    «хичээл дууслаа» гэсэн дэлгэц үзээд, замын дараагийн зангилаа руу
 *    буцдаг. Хөнгөн дасгалд энэ нь ажлаас илүү ЗАН ҮЙЛ болно. Одоо
 *    хөнгөн/дунд дасгалууд нэг хичээлд бөөгнөрч, ХҮНД нь дангаараа
 *    үлдэнэ — хүнд таавар нь өөрөө бүтэн суулт.
 *
 * 2. БҮХ КУРСЫН ОНООГ ДАХИН ТООЦНО (`lib/tactiq/lessonXp.ts`). Оноо нь
 *    гараар бичигдэж байсан тул 12 дасгалтай хичээл ч, нэг товшилттой ч
 *    ойролцоо оноотой байв.
 *
 * ⚠ ЯВЦ ХАДГАЛАГДАНА: нэгтгэхдээ бүлгийн ЭХНИЙ хичээлийг ҮЛДЭЭЖ, бусад
 *   дасгалыг түүн рүү зөөнө. Устгагдах хичээлүүд дээрх `lesson_progress`
 *   мөрүүд нь утгагүй болох тул цэвэрлэнэ — тэдгээр хичээл цаашид
 *   БАЙХГҮЙ болно.
 *
 * ⚠ `path_chests` нь бүлэг доторх ХИЧЭЭЛИЙН ТООноос хамаардаг
 *   (`lib/tactiq/path.ts`). Хичээлийн тоо цөөрөх тул хайрцгийн байрлал
 *   шилжинэ; аль хэдийн онгойлгосон хайрцгийн мөрүүдийг ҮЛДЭЭНЭ —
 *   тэдгээр нь зоос аль хэдийн олгосны баримт.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { asc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { exercises, lessonProgress, lessons, units } from "../src/lib/db/schema";
import { lessonXpReward } from "../src/lib/tactiq/lessonXp";

const APPLY = process.argv.includes("--apply");

/**
 * Хэдэн дасгалыг НЭГ хичээлд багцлах вэ — хүндрэлээр.
 *
 * ⚠ `хүнд` нь 1: хүнд тааврыг багцлавал нэг суултад 3 удаа гацна.
 * Сурагч эхнийхээ дээр зогсвол дараагийн хоёрыг нь ХЭЗЭЭ Ч үзэхгүй.
 */
const GROUP_SIZE: Record<string, number> = {
  "хөнгөн": 5,
  "дунд": 3,
  "хүнд": 1,
};

/** Багцлах курс/бүлгүүд — «Таавар»-ын хялбар хэсгүүд. */
const MERGE_COURSE = "puzzle";

/**
 * Нэрнээс хүндрэлийн түлхүүр ба дугаарыг салгана: «хөнгөн 12» →
 * `{ key: "хөнгөн", index: 12 }`.
 *
 * ⚠ Дугааргүй нэр (жишээ нь «Судоку гэж юу вэ?») нь БАГЦЛАГДАХГҮЙ:
 * тэдгээр нь тайлбар хичээл бөгөөд хооронд нь холих боломжгүй.
 */
function parseTitle(title: string): { key: string; index: number } | null {
  const match = /^(.*?)\s*(\d+)$/.exec(title.trim());
  if (!match) return null;

  const stem = match[1].trim();
  if (!stem) return null;

  return { key: stem.toLowerCase(), index: Number(match[2]) };
}

function groupSizeFor(key: string): number {
  for (const [needle, size] of Object.entries(GROUP_SIZE)) {
    if (key.includes(needle)) return size;
  }

  /*
   * ⚠ ХҮНДРЭЛ ТОДОРХОЙГҮЙ бол 3-аар багцална. «Логик 1…9», «Үг 1…9»
   * зэрэг нь бүгд ганц товшилттой дасгал — тэднийг дангаар нь үлдээвэл
   * дээрх асуудал хэвээрээ.
   */
  return 3;
}

/** Нэг хичээлийн товч танилцуулга — багц дотор хэдэн дасгал байгааг хэлнэ. */
function mergedTitle(stem: string, from: number, to: number): string {
  const name = stem.charAt(0).toUpperCase() + stem.slice(1);
  return from === to ? `${name} ${from}` : `${name} ${from}–${to}`;
}

async function main(): Promise<void> {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) throw new Error("DATABASE_URL алга (.env.local).");

  // ⚠ Нэг холболт: энэ скрипт олон зуун жижиг UPDATE хийдэг тул зэрэгцүүлэх
  // ашиггүй, харин хуваалцсан сангийн холболтыг үрнэ.
  const pool = createDbPool(connectionString, 1);
  const db = drizzle(pool);

  try {
    const unitRows = await db
      .select({ id: units.id, title: units.title, courseSlug: units.courseSlug })
      .from(units)
      .orderBy(asc(units.courseSlug), asc(units.sortOrder));

    let mergedLessons = 0;
    let removedLessons = 0;

    for (const unit of unitRows) {
      if (unit.courseSlug !== MERGE_COURSE) continue;

      const unitLessons = await db
        .select({ id: lessons.id, title: lessons.title, sortOrder: lessons.sortOrder })
        .from(lessons)
        .where(eq(lessons.unitId, unit.id))
        .orderBy(asc(lessons.sortOrder));

      /*
       * Дараалсан, ИЖИЛ түлхүүртэй хичээлүүдийг л нийлүүлнэ. Дараалал
       * нь чухал: «хөнгөн 1-5» дунд «дунд 3» орж ирвэл тэр нь өөр багц.
       */
      let run: typeof unitLessons = [];
      let runKey: string | null = null;

      const flush = async () => {
        if (runKey === null || run.length === 0) return;

        const size = groupSizeFor(runKey);
        if (size <= 1) {
          run = [];
          runKey = null;
          return;
        }

        for (let start = 0; start < run.length; start += size) {
          const group = run.slice(start, start + size);
          if (group.length < 2) continue;

          const [keeper, ...rest] = group;
          const restIds = rest.map((row) => row.id);
          const first = parseTitle(keeper.title);
          const last = parseTitle(group[group.length - 1].title);
          const stem = first ? runKey : keeper.title;
          const title =
            first && last ? mergedTitle(stem, first.index, last.index) : keeper.title;

          mergedLessons += 1;
          removedLessons += restIds.length;

          if (!APPLY) continue;

          /*
           * ⚠ ДАРААЛАЛ: эхлээд дасгалыг ЗӨӨНӨ, дараа нь хоосон хичээлийг
           * устгана. Эсрэгээр хийвэл `exercises.lesson_id`-ийн FK нь
           * дасгалуудыг хамт устгана (`ON DELETE CASCADE`).
           */
          let order = await db
            .select({ id: exercises.id })
            .from(exercises)
            .where(eq(exercises.lessonId, keeper.id))
            .then((rows) => rows.length);

          for (const id of restIds) {
            const moved = await db
              .select({ id: exercises.id })
              .from(exercises)
              .where(eq(exercises.lessonId, id))
              .orderBy(asc(exercises.sortOrder));

            for (const row of moved) {
              await db
                .update(exercises)
                .set({ lessonId: keeper.id, sortOrder: order })
                .where(eq(exercises.id, row.id));
              order += 1;
            }
          }

          // ⚠ Явцын мөрүүд нь FK-гүй тул ГАРААР цэвэрлэнэ.
          await db.delete(lessonProgress).where(inArray(lessonProgress.lessonId, restIds));
          await db.delete(lessons).where(inArray(lessons.id, restIds));
          await db.update(lessons).set({ title }).where(eq(lessons.id, keeper.id));
        }

        run = [];
        runKey = null;
      };

      for (const lesson of unitLessons) {
        const parsed = parseTitle(lesson.title);
        if (!parsed) {
          await flush();
          continue;
        }

        if (parsed.key !== runKey) await flush();
        runKey = parsed.key;
        run.push(lesson);
      }
      await flush();
    }

    /*
     * ХОЁРДУГААР АЖИЛ — оноо. Нэгтгэлийн ДАРАА ажиллана: нийлсэн хичээл
     * илүү олон дасгалтай болсон тул оноо нь ч өсөх ёстой.
     */
    const all = await db
      .select({
        id: lessons.id,
        title: lessons.title,
        xpReward: lessons.xpReward,
        unitId: lessons.unitId,
        sortOrder: lessons.sortOrder,
        courseSlug: units.courseSlug,
      })
      .from(lessons)
      .innerJoin(units, eq(units.id, lessons.unitId))
      .orderBy(asc(units.courseSlug), asc(lessons.sortOrder));

    /*
     * Бүлэг доторх БАЙРЛАЛ — нэрэндээ хүндрэлгүй хичээлүүдийн оноог
     * эндээс шатлана (`lib/tactiq/lessonXp.ts`).
     */
    const unitSize = new Map<string, number>();
    for (const lesson of all) {
      unitSize.set(lesson.unitId, (unitSize.get(lesson.unitId) ?? 0) + 1);
    }
    const seen = new Map<string, number>();

    const byCourse = new Map<string, { changed: number; lo: number; hi: number }>();
    let updated = 0;

    for (const lesson of all) {
      const types = await db
        .select({ type: exercises.type })
        .from(exercises)
        .where(eq(exercises.lessonId, lesson.id))
        .orderBy(asc(exercises.sortOrder));

      const position = seen.get(lesson.unitId) ?? 0;
      seen.set(lesson.unitId, position + 1);
      const size = unitSize.get(lesson.unitId) ?? 1;

      const xp = lessonXpReward(
        types.map((row) => row.type),
        lesson.title,
        size > 1 ? position / (size - 1) : 0.5
      );

      const stat = byCourse.get(lesson.courseSlug) ?? { changed: 0, lo: xp, hi: xp };
      stat.lo = Math.min(stat.lo, xp);
      stat.hi = Math.max(stat.hi, xp);
      if (xp !== lesson.xpReward) stat.changed += 1;
      byCourse.set(lesson.courseSlug, stat);

      if (xp === lesson.xpReward) continue;
      updated += 1;
      if (APPLY) {
        await db.update(lessons).set({ xpReward: xp }).where(eq(lessons.id, lesson.id));
      }
    }

    console.log(APPLY ? "✔ БИЧСЭН" : "… ТУРШИЛТ (--apply өгөөгүй)");
    console.log(`Нэгтгэсэн хичээл: ${mergedLessons}, устсан: ${removedLessons}`);
    console.log(`Оноо өөрчлөгдсөн: ${updated} / ${all.length}`);
    for (const [slug, stat] of [...byCourse].sort()) {
      console.log(`  ${slug.padEnd(10)} ${stat.lo}–${stat.hi} оноо, ${stat.changed} засвар`);
    }
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
