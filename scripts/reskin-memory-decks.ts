/**
 * САНАХ ОЙН ХӨЗРҮҮДИЙГ АМЬТНЫ ЗУРГААР СОЛИНО.
 *
 * Ажиллуулах:
 *   npm run reskin:memory -- [--apply]
 *
 * ⚠ ЯАГААД: хөзөр дээр эможи гардаг байсан бөгөөд эможи нь iOS, Android,
 * Windows гурван өөр зурагтай. Хос олох тоглоомд энэ нь гоо зүйн асуудал
 * биш: «🐼» ба «🐻» зэрэг хос эможи зарим төхөөрөмж дээр БАРАГ ИЖИЛ
 * харагддаг тул сурагч буруу хос нээгээд яагаад болоогүйг ойлгохгүй.
 *
 * ⚠ АМЬТАД нь нэмэлт ач холбогдолтой: хүүхэд тоглох зуураа амьтдыг
 * танина. Мөн амьтан бүр өөр ХЭЛБЭРТЭЙ тул хос олоход хялбар — урьд нь
 * туршиж үзсэн далбаанууд бүгд адилхан дөрвөлжин байсан тул зөвхөн
 * өнгөөрөө ялгагддаг, хөзөр дээр жижигхэн харагдахад хүнд байв.
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
import { ANIMAL_KEYS, itemArtToken } from "../src/lib/tactiq/itemArt";

const APPLY = process.argv.includes("--apply");

/** Амьтан тавих курс — шатрынх нь дүрсээрээ үлдэнэ. */
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
      if (deck.pairs > ANIMAL_KEYS.length) {
        throw new Error(`${row.title}: ${deck.pairs} хос — амьтан хүрэлцэхгүй`);
      }

      const items = Array.from({ length: deck.pairs }, (_, index) =>
        itemArtToken(ANIMAL_KEYS[(offset + index) % ANIMAL_KEYS.length])
      );
      offset += deck.pairs;

      const next = encodeMemory({ pairs: deck.pairs, items });
      /*
       * ⚠ ДАХИН ЗАДАЛЖ ШАЛГАНА: `MEMORY_ITEM_MAX` нь урт хязгаартай
       * бөгөөд тэмдэглэгээ («img:animal-chinchilla») эможиноос урт. Санд бичихээс
       * ӨМНӨ шалгахгүй бол дасгал нь клиент дээр «хөзөр алга» болж
       * унана.
       */
      if (!decodeMemory(next)) throw new Error(`${row.title}: шинэ хөзөр задлагдсангүй`);

      console.log(`  ${row.title.padEnd(14)} ${deck.items.join("")} → ${items.length} амьтан`);
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
