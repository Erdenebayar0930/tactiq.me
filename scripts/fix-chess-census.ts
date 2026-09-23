/**
 * ХӨЛГИЙН ҮНДСЭН ДҮРМИЙГ ЗӨРЧСӨН ШАТРЫН БАЙРЛАЛУУДЫГ ДАХИН ҮҮСГЭНЭ.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: хөлөг дээр ГУРВАН цагаан морь (эсвэл гурван
 * тэмээ, гурван тэрэг) гарч байв. Жишээ: `8/2PN3K/1Pk5/1N6/8/8/8/4N3`
 * — «Морио a7 нүд рүү нүү» гэсэн дасгал дээр морь ГУРАВ. Шинээр сурах
 * хүүхэд «яагаад 3 морь байна?» гэж эргэлзэж, дүрсийн тоо гэдэг үндсэн
 * дүрэм буруугаар бодлогдоно.
 *
 * ⚠ ЯАГААД ГАРСАН БЭ: `chessGenerators.ts`-ийн үүсгэгчид нэмэлт дүрсийг
 * САНАМСАРГҮЙ тавьдаг — `put(rng, placement, pick(rng, ["P","P","N","B"]))`.
 * Нүүж байгаа дүрс нь морь бол тэр дээр нь дахиад хоёр морь нэмэгдэж
 * болно. `chess.js` үүнийг хууль бус гэж үздэггүй (хүү хувиргаснаар
 * бодитоор гарах боломжтой) тул шалгуураас шууд өнгөрч байв.
 *
 * ⚠ ДАХИН ГАРАХГҮЙ БОЛГОСОН НЬ ЭНЭ СКРИПТ БИШ: `chessShared.ts`-ийн
 * `loadPosition()` дотор `censusProblem()` шалгуур нэмэгдсэн. Үүсгэгч
 * бүр тэр функцээр дамждаг тул одооноос ийм байрлал АНХНААСАА гарахгүй.
 * Энэ скрипт нь ЗӨВХӨН санд аль хэдийн байгаа мөрүүдийг засна.
 *
 * ⚠ ДААЛГАВРЫН БИЧВЭРИЙГ ч ДАХИН БИЧНЭ: «Морио a7 нүд рүү нүү» гэсэн
 * текст дотор бай нүд байгаа тул шинэ байрлалын хариултаар шинэчлэхгүй
 * бол даалгавар хөлөгтэйгээ зөрнө.
 *
 * ⚠ ҮР НЬ ДАСГАЛЫН `id`-ААС: дахин ажиллуулахад ижил байрлал гарна.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-chess-census.ts [--apply]
 */
import { Client } from "pg";

import { kingEscapeTask, reachTask, safeCaptureTask } from "./curriculum/chessGenerators";
import { censusProblem, makeRng, seedFromString, validateTask } from "./curriculum/chessShared";

import type { Generator, Task } from "./curriculum/chessShared";

/**
 * ХИЧЭЭЛ → ҮҮСГЭГЧ. Тохиргоо нь `chessLevels*.ts`-д байгаатай ЯГ ИЖИЛ
 * байх ёстой — эс бөгөөс засварласан дасгал хөршүүдээсээ хүндрэлээр
 * зөрнө.
 */
const GENERATORS: Record<string, Generator> = {
  Морь: reachTask("n", { ownBlockers: 4 }),
  "Морины аялал": reachTask("n", {
    ownBlockers: 4,
    enemies: 2,
    prompt: ["Морь үсэрнэ! {your} {to} нүд рүү нүү.", "Knights jump! Move {youren} to {to}."],
  }),
  "Хамгаалагдсан дүрсийг бүү ид": safeCaptureTask(3, 3),
  "Ноёноо зайлуул": kingEscapeTask(),
};

type Row = { id: string; fen: string; lesson: string; prompt: string };

function regenerate(seed: number, generator: Generator): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 200000; attempt += 1) {
    const task = generator(rng);
    if (!task || task.type !== "board-move") continue;
    if (validateTask(task)) continue;
    /*
     * ⚠ ДАХИН ШАЛГАНА. `loadPosition` аль хэдийн барьдаг ч энд илээр
     * шалгаснаар шалгуур нь хожим тэндээс салсан ч энэ скрипт эвдэрсэн
     * байрлалыг ДАХИН бичихгүй.
     */
    if (censusProblem(task.fen.split(" ")[0])) continue;
    return task;
  }

  return null;
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<Row>(
      `select e.id, e.fen, e.prompt, l.title as lesson
         from exercises e
         join lessons l on l.id = e.lesson_id
         join units u on u.id = l.unit_id
        where u.course_slug = 'chess' and e.type = 'board-move' and e.fen is not null
        order by l.title, e.sort_order`
    )
  ).rows;

  const broken = rows.filter((row) => censusProblem(row.fen.split(" ")[0]));
  console.log(`шатрын хөлөгт дасгал ${rows.length} — дүрсийн тоо зөрчсөн ${broken.length}`);

  let changed = 0;
  const failed: string[] = [];

  for (const row of broken) {
    const generator = GENERATORS[row.lesson];
    if (!generator) {
      failed.push(`${row.id} — «${row.lesson}» хичээлийн үүсгэгч тодорхойлогдоогүй`);
      continue;
    }

    const task = regenerate(seedFromString(row.id), generator);
    if (!task || task.type !== "board-move") {
      failed.push(`${row.id} — байрлал үүсгэж чадсангүй («${row.lesson}»)`);
      continue;
    }

    console.log(
      `\n«${row.lesson}»\n  хуучин: ${row.fen}  [${censusProblem(row.fen.split(" ")[0])}]\n  шинэ:   ${task.fen}  ${task.from}${task.to}\n  ${task.prompt[0]}`
    );
    changed++;

    if (apply) {
      await client.query(
        `update exercises
            set fen=$2, correct_from=$3, correct_to=$4,
                prompt=$5, prompt_en=$6, explanation=$7, explanation_en=$8
          where id=$1`,
        [
          row.id,
          task.fen,
          task.from,
          task.to,
          task.prompt[0],
          task.prompt[1],
          task.explain[0],
          task.explain[1],
        ]
      );
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed.length}`);
  for (const line of failed) console.log(`  ✗ ${line}`);

  await client.end();
  return failed.length;
}

main().then((failed) => process.exit(failed ? 1 : 0));
