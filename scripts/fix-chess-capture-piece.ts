/**
 * «ХЭН ИДЭХ ВЭ» ГЭДЭГ НЬ ХИЧЭЭЛИЙН НЭРТЭЙ ЗӨРЖ БАЙСНЫГ ЗАСНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: «Морь, хүүгээр идэх» хичээл дотор идэлтийг
 * НОЁН хийдэг дасгалууд байв. Жишээ: `8/8/2P2k2/K7/n7/8/8/7b` —
 * «Хар морийг ид» гэсэн ч цорын ганц хариулт нь `a5a4`, өөрөөр хэлбэл
 * ЦАГААН НОЁН иднэ. Сурагч морио ч, хүүгээ ч хөдөлгөхгүйгээр «зөв»
 * хариулт авна — хичээлийн сэдэв бүрмөсөн алга болно.
 *
 * ⚠ ЯАГААД ГАРСАН БЭ: `captureTypeTask` нь байг `attackedEmpty(probe, "w")`
 * дундаас сонгодог байв — тэр функц ЦАГААНЫ БҮХ дүрсийн, НОЁНЫ Ч
 * дайралтыг буцаана. Дараа нь шалгуур (`goalHolds` → `captureType`)
 * зөвхөн ИДЭГДСЭН дүрсийн төрлийг хардаг байсан тул ИДСЭН дүрс
 * хэнийг ч хамаагүй байв.
 *
 * ⚠ ДАХИН ГАРАХГҮЙ БОЛГОСОН НЬ ЭНЭ СКРИПТ БИШ:
 *   • `chessGenerators.ts` → `attackedEmptyBy()` нь ЗӨВХӨН хичээлийн
 *     дүрсийн дайралтад бай тавьдаг болов, мөн өөр дүрсээр ч идэж
 *     болох байрлалыг бүрнээ хаяна;
 *   • `chessShared.ts` → `captureType` зорилгод `by` нэмэгдэж, шалгуур
 *     нь ИДСЭН дүрсийг ч шалгадаг болов.
 * Энэ скрипт нь ЗӨВХӨН санд аль хэдийн байгаа мөрүүдийг засна.
 *
 * ⚠ ҮР НЬ ДАСГАЛЫН `id`-ААС: дахин ажиллуулахад ижил байрлал гарна.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-chess-capture-piece.ts [--apply]
 */
import { Chess } from "chess.js";
import { Client } from "pg";

import { captureTypeTask } from "./curriculum/chessGenerators";
import { makeRng, seedFromString, validateTask } from "./curriculum/chessShared";

import type { Move, PieceSymbol, Square } from "chess.js";
import type { Generator, Task } from "./curriculum/chessShared";

/**
 * ХИЧЭЭЛ → (идэгч дүрсүүд, бай). `chessLevels1to3.ts`-д байгаатай ЯГ
 * ИЖИЛ байх ёстой — эс бөгөөс засварласан дасгал хөршүүдээсээ зөрнө.
 *
 * ⚠ НЭГ ХИЧЭЭЛ ХОЁР ҮҮСГЭГЧТЭЙ байж болно («Морь, хүүгээр идэх» нь
 * морь→бэрс ба хүү→морь). Тиймээс дасгалын БАЙГААР нь (даалгаврын
 * бичвэрээс) алийг нь хэрэглэхийг тогтооно.
 */
const LESSONS: Record<string, { attackers: PieceSymbol[]; target: PieceSymbol; extras?: number }[]> = {
  "Дүрсийн үнэ цэнэ": [{ attackers: ["q"], target: "r" }],
  "Тэрэг, тэмээгээр идэх": [
    { attackers: ["r"], target: "n" },
    { attackers: ["b"], target: "r" },
  ],
  "Морь, хүүгээр идэх": [
    { attackers: ["n"], target: "q" },
    { attackers: ["p"], target: "n" },
  ],
  "Аль дүрсээр идэх вэ?": [
    { attackers: ["n", "b"], target: "r", extras: 2 },
    { attackers: ["r", "p"], target: "b", extras: 2 },
  ],
  /*
   * ⚠ ХОЛИМОГ ХИЧЭЭЛ: `anyOf(safeCaptureTask…, captureTypeTask(["q","n"], "r", 2))`.
   * Доорх бичвэрийн шүүлтүүр нь таслагдсан дүрсийг нэрлэсэн
   * («Хар тэргийг ид.») дасгалыг л авах тул `safeCaptureTask`-ын
   * «ХАМГААЛАЛТГҮЙ дүрсийг ид» дасгалууд хөндөгдөхгүй.
   */
  "Идэлт — Challenge": [{ attackers: ["q", "n"], target: "r", extras: 2 }],
};

/** Даалгаврын бичвэр дэх бай — аль үүсгэгчийг хэрэглэхийг тогтооно. */
const TARGET_WORD: Record<string, PieceSymbol> = {
  бэрсийг: "q",
  тэргийг: "r",
  тэмээг: "b",
  морийг: "n",
  хүүг: "p",
};

type Row = {
  id: string;
  fen: string;
  correct_from: string;
  correct_to: string;
  prompt: string;
  lesson: string;
};

/** Идэлтийг ХЭН хийж байна, ЮУГ идэж байна. */
function moveOf(row: Row): Move | null {
  try {
    const chess = new Chess(row.fen);
    return (
      (chess.moves({ square: row.correct_from as Square, verbose: true }) as Move[]).find(
        (m) => m.to === row.correct_to
      ) ?? null
    );
  } catch {
    return null;
  }
}

function regenerate(seed: number, generator: Generator): Task | null {
  const rng = makeRng(seed);
  for (let attempt = 0; attempt < 300000; attempt += 1) {
    const task = generator(rng);
    if (!task || task.type !== "board-move") continue;
    if (validateTask(task)) continue;
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
      `select e.id, e.fen, e.correct_from, e.correct_to, e.prompt, l.title as lesson
         from exercises e
         join lessons l on l.id = e.lesson_id
         join units u on u.id = l.unit_id
        where u.course_slug = 'chess' and e.type = 'board-move'
          and l.title = any($1) and e.fen is not null
        order by l.title, e.sort_order`,
      [Object.keys(LESSONS)]
    )
  ).rows;

  let healthy = 0;
  let changed = 0;
  const failed: string[] = [];

  for (const row of rows) {
    const specs = LESSONS[row.lesson];
    const word = Object.keys(TARGET_WORD).find((key) => row.prompt.includes(key));
    const target = word ? TARGET_WORD[word] : null;
    const spec = target ? specs.find((s) => s.target === target) : null;

    /*
     * ⚠ БИЧВЭРТ ДҮРС НЭРЛЭГДЭЭГҮЙ бол энэ дасгал ӨӨР үүсгэгчийн
     * (`safeCaptureTask`) — хӨНДӨХГҮЙ. Таамаагаар `specs[0]`-ыг авах
     * нь бүрэн эрүүл дасгалыг дарж бичнэ.
     */
    if (!spec) {
      healthy++;
      continue;
    }

    const move = moveOf(row);
    if (!move) {
      failed.push(`${row.id} — хадгалагдсан хариулт хууль бус`);
      continue;
    }

    /* ⚠ ГОЛ ШАЛГУУР: идэлтийг хичээлийн дүрс хийж байна уу. */
    if (spec.attackers.includes(move.piece) && move.captured === spec.target) {
      healthy++;
      continue;
    }

    const generator = captureTypeTask(spec.attackers, spec.target, spec.extras ?? 1);
    const task = regenerate(seedFromString(row.id), generator);
    if (!task || task.type !== "board-move") {
      failed.push(`${row.id} — байрлал үүсгэж чадсангүй («${row.lesson}»)`);
      continue;
    }

    console.log(
      `\n«${row.lesson}» — ${spec.attackers.join("/")} → ${spec.target}\n` +
        `  хуучин: ${row.fen}  ${row.correct_from}${row.correct_to}  (иддэг нь: ${move.piece})\n` +
        `  шинэ:   ${task.fen}  ${task.from}${task.to}\n  ${task.prompt[0]}`
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

  console.log(
    `\nнийт ${rows.length} — эрүүл ${healthy}, ${apply ? "зассан" : "засагдах"} ${changed}, чадаагүй ${failed.length}`
  );
  for (const line of failed) console.log(`  ✗ ${line}`);

  await client.end();
  return failed.length;
}

main().then((failed) => process.exit(failed ? 1 : 0));
