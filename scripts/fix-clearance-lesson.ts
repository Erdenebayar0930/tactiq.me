/**
 * «ЗАМ ЧӨЛӨӨЛӨХ» ХИЧЭЭЛҮҮДИЙГ ТОДОРХОЙЛОЛТООР НЬ БАРЬНА.
 *
 * ХИЧЭЭЛИЙН ОНОЛ (асуултад нь бичигдсэн): «Цохилтын зам дээрх ӨӨРИЙН хүү
 * нь хамгийн их анзаарагддаггүй саад. Түүнийг зайлуулбал цуваа нээгдэнэ.»
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: дадлага нь бусад комбинацийн хичээлтэй ижил
 * ерөнхий «Тулгуураа өгөөд цохи» байв — өөрийн дүрс замд саад болох
 * санаа хөлөг дээр гарч ирдэггүй.
 *
 * ⚠ ШАЛГАЖ БОЛОХУЙЦ ТОДОРХОЙЛОЛТ: золиосын нүүдэл нь СУЛЛАСАН нүдээр
 * эцсийн цуваа дайран өнгөрнө. Өөрөөр хэлбэл тэр дүрс байрандаа үлдсэн
 * бол цуваа боогдох байсан — яг «зам чөлөөлөх».
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-clearance-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";
import { refuseLockedLesson } from "./curriculum/levelGuard";

import type { DraughtsMove, Square } from "../src/lib/draughts/engine";

export const CLEARANCE_PROMPT = "Цагаанаар тоглож байна. Замаа чөлөөлөөд цохи.";
const PROMPT_EN = "White to play. Clear your own piece out of the way, then strike.";
const EXPLAIN =
  "Цувааны зам дээр ӨӨРИЙН дүрс зогсож байна — хамгийн их анзаарагддаггүй саад. Түүнийг золиослон зайлуулмагц зам нээгдэж, цохилт гүйцэлдэнэ.";
const EXPLAIN_EN =
  "One of YOUR OWN pieces is standing in the path of the strike — the easiest blocker to miss. Sacrifice it out of the way and the line opens up.";

const SHAPES = [
  { whites: 4, blacks: 4 },
  { whites: 4, blacks: 5 },
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
  { whites: 6, blacks: 6 },
];

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;
const same = (a: Square, b: Square) => a.row === b.row && a.col === b.col;

type Task = { fen: string; solution: string; vacated: number; chain: number };

function generateClearance(
  seed: number,
  minChain: number,
  usedSolutions: Set<string>
): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 2500000; attempt += 1) {
    const board = randomBoard(rng, SHAPES[attempt % SHAPES.length]);
    if (!board) continue;


    /*
     * ⚠ ЭХЛЭЛД ХАР ДААМ ГАРАХ БОСГОН ДЭЭР БАЙХГҮЙ. Хар хүү 7–8-р
     * мөрөнд зогсвол нэг-хоёр нүүдлийн дараа даам болно — сурагч
     * «би хожиж байгаа юу, хожигдож байгаа юу?» гэж эргэлзэнэ.
     * Цагааны цохилт тэр дүрсийг идэх ч сурагч байрлалыг ЭХЛЭЭД
     * хардаг тул эхлэлийг нь цэвэр байлгана.
     */
    const blackDeep = board.some((boardRow, rowIndex) =>
      rowIndex >= 7 && boardRow.some((cell) => cell?.color === "b" && !cell.king)
    );
    if (blackDeep) continue;

    const probe = new Draughts({ board, turn: "w" });
    const opening = probe.legalMoves();
    // Эхний нүүдэл идэлтгүй — золиос.
    if (opening.length === 0 || opening[0].captures.length > 0) continue;

    let found: Task | null = null;

    for (const sacrifice of opening) {
      const game = new Draughts({ board, turn: "w" });
      game.applyMove(sacrifice);

      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length === 0) continue;
      game.applyMove(replies[0]);

      const finals = game.legalMoves();
      if (finals.length !== 1 || finals[0].captures.length < minChain) continue;
      if (finals[0].captures.length <= replies[0].captures.length) continue;

      /*
       * ⚠ ГОЛ БОЛЗОЛ: золиос СУЛЛАСАН нүдэнд эцсийн цуваа буух ёстой.
       * Тэр дүрс байрандаа үлдсэн бол цуваа тэнд боогдоно.
       */
      if (!finals[0].landings.some((landing) => same(landing, sacrifice.from))) continue;

      /*
       * ⚠ ТӨГСГӨЛД ХАР ТАЛ ДААМ ГАРАХ БОСГОН ДЭЭР ҮЛДЭХГҮЙ: 8-р мөрөнд
       * үлдсэн хар хүү дараагийн нүүдэлдээ даам болно. Цагаан материал
       * хожсон ч даам нь тэр ашгийг дийлэнхдээ давна.
       */
      const ending = new Draughts({ board, turn: "w" });
      ending.applyMove(sacrifice);
      ending.applyMove(replies[0]);
      ending.applyMove(finals[0]);
      const blackNearPromotion = ending
        .board()
        .some((boardRow, rowIndex) =>
          rowIndex >= 8 && boardRow.some((cell) => cell?.color === "b" && !cell.king)
        );
      if (blackNearPromotion) continue;


      const candidate: Task = {
        fen: serializePosition(board, "w"),
        solution: [sacrifice, replies[0], finals[0]].map(token).join(" "),
        vacated: squareNumber(sacrifice.from.row, sacrifice.from.col),
        chain: finals[0].captures.length,
      };

      // Курсийн нийтлэг шалгуур (шийдэл ганц, өрсөлдөгч даам болохгүй…).
      if (puzzleProblem(candidate.fen, candidate.solution)) continue;

      // Хоёр өөр ажиллах золиос байвал байрлалыг ХАЯНА.
      if (found) {
        found = null;
        break;
      }
      found = candidate;
    }

    if (found && !usedSolutions.has(found.solution)) return found;
  }
  return null;
}

const LESSONS = ["Зам чөлөөлөх", "Зам чөлөөлөх дадлага"];

async function main(): Promise<number> {
  // ⚠ Level 4-өөс өмнөх агуулга царцсан (`levelGuard.ts`).
  if (refuseLockedLesson(["Зам чөлөөлөх", "Зам чөлөөлөх дадлага"])) return 1;

  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let changed = 0;
  let failed = 0;
  const usedSolutions = new Set<string>();

  for (const title of LESSONS) {
    const rows = (
      await client.query<{ id: string; type: string }>(
        `select e.id, e.type
           from exercises e
           join lessons l on l.id = e.lesson_id
           join units u on u.id = l.unit_id
          where u.course_slug = 'checkers' and l.title = $1
          order by e.sort_order`,
        [title]
      )
    ).rows;

    const boards = rows.filter((row) => row.type !== "choice");
    console.log(`\n${title}: ${rows.length} дасгал (хөлөгт ${boards.length})`);

    for (const [index, row] of boards.entries()) {
      /*
       * ⚠ Бүгд 2+ идэлт. «Эхлэлд хар даам гарах босгон дээр байхгүй»
       * гэсэн шалгуур нэмэгдсэнээр 3+ идэлттэй цуваа хэт ховор болж,
       * 17 дасгалын 6 нь үүсэхгүй байв. Хүндрэлийг цувааны уртаар биш,
       * хөлөг дээрх дүрсийн тоогоор ялгана.
       */
      const minChain = 2;
      const task = generateClearance(seedFromString(row.id), minChain, usedSolutions);

      if (!task) {
        console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй (цуваа ${minChain}+)`);
        failed++;
        continue;
      }

      usedSolutions.add(task.solution);
      console.log(`  ${task.fen}  ${task.solution}  (сулласан нүд ${task.vacated}, ${task.chain} идэлт)`);
      changed++;

      if (apply) {
        await client.query(
          `update exercises
              set type='draughts-puzzle', prompt=$2, prompt_en=$3,
                  explanation=$4, explanation_en=$5,
                  fen=$6, solution=$7, correct_from=null, correct_to=null
            where id=$1`,
          [row.id, CLEARANCE_PROMPT, PROMPT_EN, EXPLAIN, EXPLAIN_EN, task.fen, task.solution]
        );
      }
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
