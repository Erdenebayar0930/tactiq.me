/**
 * «ЗОЛИОС» БА «ЗОЛИОСЫН ДАДЛАГА» ХИЧЭЭЛИЙГ ТУЛГУУРААС ЯЛГАНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: хоёр хичээлийн 19 дасгал бүгд ерөнхий
 * «Тулгуураа өгөөд цохи» байв — «Тулгууртай цохилт», «Тулгуурын дадлага
 * 1/2», «2 нүүдлийн комбинаци» хичээлүүдтэй ЯГ ИЖИЛ. Сурагч «золиос»
 * гэж юугаараа өөр болохыг хэзээ ч мэдэхгүй.
 *
 * ⚠ ЯЛГАА НЬ ХӨРӨНГӨ ОРУУЛАЛТЫН ХЭМЖЭЭ:
 *   • ТУЛГУУР — НЭГ дүрсээ өгөөд шууд буцааж авна (ердийн комбинаци).
 *   • ЗОЛИОС  — ХОЁР дүрсээ нэг дор өгнө. Хар тал нэг нүүдлээрээ
 *               хоёуланг нь иддэг тул хөрөнгө оруулалт хоёр дахин том;
 *               эргэж төлөгдөх нь ч илүү байх ёстой.
 *
 * ⚠ КОДООР ШАЛГАХ БОЛЗОЛ:
 *   1. цагааны эхний нүүдэл ИДЭЛТГҮЙ,
 *   2. харын ЦОРЫН ГАНЦ хариу нь ХОЁР ба түүнээс дээш дүрс идэх,
 *   3. цагааны цорын ганц цохилт нь өгснөөс ИЛҮҮГ иднэ,
 *   4. эхлэл ба төгсгөлд хар тал даам гарах босгон дээр байхгүй,
 *   5. `puzzleProblem`-ийг давна (шийдэл ганц, өрсөлдөгч даам болохгүй).
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-sacrifice-lessons.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";
import { refuseLockedLesson } from "./curriculum/levelGuard";

import type { DraughtsMove } from "../src/lib/draughts/engine";

export const SACRIFICE_PROMPT = "Цагаанаар тоглож байна. Хоёр хүү золиослоод илүүг нь ав.";
const PROMPT_EN = "White to play. Sacrifice two pieces and win more back.";
const EXPLAIN =
  "Золиос нь тулгуураас ТОМ хөрөнгө оруулалт: нэг биш ХОЁР дүрсээ нэг дор өгнө. Хар тал идэхээс өөр аргагүй бөгөөд эцэст нь чи өгснөөсөө илүүг эргүүлж авна. Цувааг эцэс хүртэл нь тоолоогүй бол золиослож болохгүй.";
const EXPLAIN_EN =
  "A sacrifice is a bigger investment than a simple setup: you give TWO pieces at once, not one. Black is forced to take, and in the end you win back more than you gave. Never sacrifice before you have counted the line to the end.";

const SHAPES = [
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
  { whites: 6, blacks: 6 },
  { whites: 6, blacks: 7 },
  { whites: 4, blacks: 6 },
];

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;

type Task = { fen: string; solution: string; given: number; gained: number };

function generateSacrifice(seed: number, usedSolutions: Set<string>): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 2500000; attempt += 1) {
    const board = randomBoard(rng, SHAPES[attempt % SHAPES.length]);
    if (!board) continue;

    /*
     * ⚠ ЭХЛЭЛД ХАР ДААМ ГАРАХ БОСГОН ДЭЭР БАЙХГҮЙ (7–8-р мөр). Байвал
     * сурагч «би хожиж байна уу, хожигдож байна уу?» гэж эргэлзэнэ.
     */
    if (board.some((row, index) => index >= 7 && row.some((c) => c?.color === "b" && !c.king))) {
      continue;
    }

    const probe = new Draughts({ board, turn: "w" });
    const opening = probe.legalMoves();
    // 1) Эхний нүүдэл ИДЭЛТГҮЙ — золиос.
    if (opening.length === 0 || opening[0].captures.length > 0) continue;

    let found: Task | null = null;

    for (const sacrifice of opening) {
      const game = new Draughts({ board, turn: "w" });
      game.applyMove(sacrifice);

      /*
       * 2) ХАР НЭГ НҮҮДЛЭЭРЭЭ ХОЁР ДҮРС ИДНЭ — энэ нь золиосыг тулгуураас
       *    ялгах ЦОРЫН ГАНЦ шинж. Нэг дүрс идвэл ердийн тулгуур болно.
       */
      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length < 2) continue;
      const [reply] = replies;

      game.applyMove(reply);

      // 3) Цагаан өгснөөсөө ИЛҮҮГ эргүүлж авна.
      const finals = game.legalMoves();
      if (finals.length !== 1) continue;
      if (finals[0].captures.length <= reply.captures.length) continue;

      // 4) Төгсгөлд хар даам гарах босгон дээр үлдэхгүй.
      const ending = new Draughts({ board, turn: "w" });
      ending.applyMove(sacrifice);
      ending.applyMove(reply);
      ending.applyMove(finals[0]);
      if (
        ending.board().some((row, index) =>
          index >= 8 && row.some((c) => c?.color === "b" && !c.king)
        )
      ) {
        continue;
      }

      const candidate: Task = {
        fen: serializePosition(board, "w"),
        solution: [sacrifice, reply, finals[0]].map(token).join(" "),
        given: reply.captures.length,
        gained: finals[0].captures.length,
      };

      // 5) Курсийн нийтлэг шалгуур.
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

const LESSONS = ["Золиос", "Золиосын дадлага"];

async function main(): Promise<number> {
  // ⚠ Level 4-өөс өмнөх агуулга царцсан (`levelGuard.ts`).
  if (refuseLockedLesson(["Золиос", "Золиосын дадлага"])) return 1;

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

    for (const row of boards) {
      const task = generateSacrifice(seedFromString(row.id), usedSolutions);

      if (!task) {
        console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
        failed++;
        continue;
      }

      usedSolutions.add(task.solution);
      console.log(
        `  ${task.fen}  ${task.solution}  (өгсөн ${task.given}, авсан ${task.gained})`
      );
      changed++;

      if (apply) {
        await client.query(
          `update exercises
              set type='draughts-puzzle', prompt=$2, prompt_en=$3,
                  explanation=$4, explanation_en=$5,
                  fen=$6, solution=$7, correct_from=null, correct_to=null
            where id=$1`,
          [row.id, SACRIFICE_PROMPT, PROMPT_EN, EXPLAIN, EXPLAIN_EN, task.fen, task.solution]
        );
      }
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
