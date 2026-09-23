/**
 * «3 НҮҮДЛИЙН КОМБИНАЦИ» ХИЧЭЭЛИЙГ НЭРТЭЙГЭЭ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: энэ хичээлийн бодлогууд нь ГУРВАН хагас
 * нүүдэлтэй байв — өөрөөр хэлбэл сурагч ХОЁР нүүдэл хийдэг. Яг дээрх
 * «2 нүүдлийн комбинаци» хичээлтэй ижил. Гарчиг нь гурав гэж хэлээд
 * хөлөг дээр хоёр гардаг.
 *
 * ⚠ ЗӨВ нь ТАВАН хагас нүүдэл: цагаан → хар → цагаан → хар → цагаан.
 * Тэгвэл сурагч ГУРВАН нүүдэл хийнэ. `Урт комбинаци` хичээл яг ийм
 * бүтэцтэй тул генератор нь бэлэн (`combo3`).
 *
 * ⚠ ДАСГАЛЫН ID ХЭВЭЭР: сурагчийн ахиц ID-аар холбогддог.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-three-move-lesson.ts [--apply]
 */
import { Client } from "pg";

import { makeRng, seedFromString } from "../src/lib/draughts/generate";
import { generateTask, puzzleProblem } from "./curriculum/draughtsGenerators";

const PROMPT = "Цагаанаар тоглож байна. Гурван нүүдлээр цохилтоо гүйцээ.";
const PROMPT_EN = "White to play. Finish the strike in three moves.";
const EXPLAIN =
  "Эхний нүүдэл тулгуур, дараагийн бүх хариу албадмал. Гурван нүүдлээ ЭХЛЭХЭЭСЭЭ ӨМНӨ эцэс хүртэл нь тооц.";
const EXPLAIN_EN =
  "The first move is the setup and every reply after it is forced. Calculate all three moves to the end BEFORE you start.";

const SHAPES = [
  { whites: 5, blacks: 5 },
  { whites: 6, blacks: 6 },
  { whites: 5, blacks: 6 },
];

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<{ id: string; solution: string | null }>(`
      select e.id, e.solution
        from exercises e
        join lessons l on l.id = e.lesson_id
        join units u on u.id = l.unit_id
       where u.course_slug = 'checkers' and l.title = '3 нүүдлийн комбинаци'
       order by e.sort_order`)
  ).rows;

  console.log(`«3 нүүдлийн комбинаци»: ${rows.length} дасгал`);

  let changed = 0;
  let failed = 0;
  const used = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const plies = row.solution?.trim().split(/\s+/).length ?? 0;
    if (plies === 5) {
      console.log(`  = ${row.id} аль хэдийн 3 нүүдэлтэй`);
      continue;
    }

    const rng = makeRng(seedFromString(row.id));
    const pieces = SHAPES[index % SHAPES.length];
    let task: ReturnType<typeof generateTask> = null;

    for (let attempt = 0; attempt < 600000 && !task; attempt += 1) {
      const candidate = generateTask(rng, { type: "combo3", pieces });
      if (!candidate || candidate.type !== "draughts-puzzle") continue;
      // ⚠ Курсийн нийтлэг шалгуур — эс бөгөөс `repair:draughts` дарж бичнэ.
      if (puzzleProblem(candidate.fen, candidate.solution)) continue;
      if (used.has(candidate.solution)) continue;
      task = candidate;
    }

    if (!task || task.type !== "draughts-puzzle") {
      console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
      failed++;
      continue;
    }

    used.add(task.solution);
    console.log(`  ${task.fen}  ${task.solution}`);
    changed++;

    if (apply) {
      await client.query(
        `update exercises
            set prompt=$2, prompt_en=$3, explanation=$4, explanation_en=$5,
                fen=$6, solution=$7
          where id=$1`,
        [row.id, PROMPT, PROMPT_EN, EXPLAIN, EXPLAIN_EN, task.fen, task.solution]
      );
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
