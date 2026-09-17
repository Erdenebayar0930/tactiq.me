/**
 * САНАХ ОЙН ХӨЗРҮҮДИЙГ ДАЛБААНЫ ЗУРГААР СОЛИНО.
 *
 * Ажиллуулах:
 *   npm run reskin:memory -- [--apply]
 *
 * ⚠ ЯАГААД: хөзөр дээр эможи гардаг байсан бөгөөд эможи нь iOS, Android,
 * Windows гурван өөр зурагтай. Хос олох тоглоомд энэ нь гоо зүйн асуудал
 * биш: «🐼» ба «🐻» зэрэг хос эможи зарим төхөөрөмж дээр БАРАГ ИЖИЛ
 * харагддаг тул сурагч буруу хос нээгээд яагаад болоогүйг ойлгохгүй.
 *
 * ⚠ ДАЛБАА нь нэмэлт ач холбогдолтой: хүүхэд тоглох зуураа улс орныг
 * танина. Далбаа бүр өөр хэлбэр, өнгөтэй тул ялгахад ч хялбар.
 *
 * ⚠ ШАТРЫН курсын хөзрийг ХӨНДӨХГҮЙ: тэнд шатрын дүрсүүд (♟♞♝♜♛)
 * зориудаар тавигдсан — тэр хичээл нь дүрсийг цээжлүүлэх тухай.
 *
 * Шаардлагатай env (.env.local): DATABASE_URL
 */
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

import { createDbPool, resolveDatabaseUrl } from "../src/lib/db/createPool";
import { exercises, lessons, units } from "../src/lib/db/schema";
import { decodeMemory, encodeMemory } from "../src/lib/puzzles/memory";
import { FLAG_KEYS, itemArtToken } from "../src/lib/tactiq/itemArt";

const APPLY = process.argv.includes("--apply");

/** Далбааг солих курс — шатрынх нь дүрсээрээ үлдэнэ. */
const COURSE = "memory";

async function main(): Promise<void> {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) throw new Error("DATABASE_URL алга (.env.local).");

  const pool = createDbPool(connectionString, 1);
  const db = drizzle(pool);

  try {
    const rows = await db
      .select({
        id: exercises.id,
        grid: exercises.grid,
        title: lessons.title,
        sortOrder: lessons.sortOrder,
      })
      .from(exercises)
      .innerJoin(lessons, eq(lessons.id, exercises.lessonId))
      .innerJoin(units, eq(units.id, lessons.unitId))
      .where(eq(units.courseSlug, COURSE))
      .orderBy(asc(lessons.sortOrder));

    let changed = 0;
    let offset = 0;

    for (const row of rows) {
      const deck = decodeMemory(row.grid);
      if (!deck) continue;

      /*
       * ⚠ ДАВТАГДАХГҮЙ БАЙХ нь зүгээр нэг гоо зүй биш: `decodeMemory`
       * давхардсан хөзрийг ТАТГАЛЗДАГ (хоёр ижил зүйл байвал дөрвөн
       * хөзөр адилхан харагдана). Тиймээс жагсаалтаас ДАРААЛАН авч,
       * хичээл хооронд л шилжүүлнэ.
       */
      if (deck.pairs > FLAG_KEYS.length) {
        throw new Error(`${row.title}: ${deck.pairs} хос — далбаа хүрэлцэхгүй`);
      }

      const items = Array.from({ length: deck.pairs }, (_, index) =>
        itemArtToken(FLAG_KEYS[(offset + index) % FLAG_KEYS.length])
      );
      offset += deck.pairs;

      const next = encodeMemory({ pairs: deck.pairs, items });
      /*
       * ⚠ ДАХИН ЗАДАЛЖ ШАЛГАНА: `MEMORY_ITEM_MAX` нь урт хязгаартай
       * бөгөөд тэмдэглэгээ («img:flag-mn») эможиноос урт. Санд бичихээс
       * ӨМНӨ шалгахгүй бол дасгал нь клиент дээр «хөзөр алга» болж
       * унана.
       */
      if (!decodeMemory(next)) throw new Error(`${row.title}: шинэ хөзөр задлагдсангүй`);

      console.log(`  ${row.title.padEnd(14)} ${deck.items.join("")} → ${items.length} далбаа`);
      changed += 1;

      if (APPLY) {
        await db.update(exercises).set({ grid: next }).where(eq(exercises.id, row.id));
      }
    }

    console.log(APPLY ? `✔ ${changed} хөзөр солив` : `… ТУРШИЛТ: ${changed} хөзөр солигдох`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
