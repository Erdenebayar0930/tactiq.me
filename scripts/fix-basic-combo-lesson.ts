/**
 * «2 НҮҮДЛИЙН КОМБИНАЦИ» — ЕРӨНХИЙ хэлбэрийг цэврээр заана.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: найман дасгалын ГУРАВ нь «ЗАВСРААР ӨГӨХ» гэсэн
 * ТУСГАЙ хэв маягтай байв (золиос сулласан нүдэнд хар буугаад, цуваа
 * яг тэр дүрснээс эхэлнэ). Тэр сэдвийг Level 3-д тусад нь заадаг тул
 * энд орж ирвэл:
 *   • сурагч тусгай аргыг нэрийг нь мэдэхгүйгээр урьдчилж харна;
 *   • «2 нүүдлийн комбинаци» гэсэн ерөнхий ойлголт бүдгэрнэ.
 *
 * ⚠ ЭНЭ ХИЧЭЭЛИЙН ӨӨРИЙН ШИНЖ нь ТАКТИК биш, БҮТЭЦ: сурагч ХОЁР
 * нүүдэл хийнэ. Тиймээс агуулга нь хамгийн энгийн хэлбэр байх ёстой —
 * нэг хүү өгөөд хоёрыг авах, ямар ч тусгай сэдвийн хээгүй.
 *
 * ⚠ ТУСГАЙ ХЭВ МАЯГУУДЫГ ЯЛГАН ХАСНА:
 *   • ЗАВСРААР ӨГӨХ    — хар золиосын сулласан нүдэнд буугаад ЭХЛЭЭД
 *                        идэгдэнэ;
 *   • ЗАМ ЧӨЛӨӨЛӨХ     — цуваа золиосын сулласан нүдэнд буудаг;
 *   • ХАМГААЛАЛТ ЗАДЛАХ — идэгч хар дүрсийн ХАЖУУГИЙН дүрс идэгдэнэ.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-basic-combo-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { netDraughtsMaterial } from "../src/lib/draughts/bot";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";

import type { DraughtsMove, Square } from "../src/lib/draughts/engine";

export const BASIC_COMBO_PROMPT = "Цагаанаар тоглож байна. Хоёр нүүдлийн комбинацийг хий.";
const PROMPT_EN = "White to play. Play the two-move combination.";
const EXPLAIN =
  "Хамгийн энгийн комбинаци: нэг хүү өгөөд хоёрыг авна. Эхний нүүдэл дүрсээ зориуд өгнө, хар тал идэхээс өөр аргагүй болно, хоёр дахь нүүдэл нь эргүүлж авна. Хоёр нүүдлээ ЭХЛЭХЭЭСЭЭ ӨМНӨ бүтнээр нь тоол.";
const EXPLAIN_EN =
  "The simplest combination: give one piece, take two. The first move offers a piece, Black is forced to capture, and the second move wins it back with interest. Count both moves before you start.";

const SHAPES = [
  { whites: 4, blacks: 4 },
  { whites: 4, blacks: 5 },
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
];

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;
const same = (a: Square, b: Square) => a.row === b.row && a.col === b.col;
const adjacent = (a: Square, b: Square) =>
  Math.abs(a.row - b.row) === 1 && Math.abs(a.col - b.col) === 1;

type Task = { fen: string; solution: string; balance: number };

function generateBasicCombo(seed: number, usedSolutions: Set<string>): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 2500000; attempt += 1) {
    const board = randomBoard(rng, SHAPES[attempt % SHAPES.length]);
    if (!board) continue;

    if (board.some((row, index) => index >= 7 && row.some((c) => c?.color === "b" && !c.king))) {
      continue;
    }

    const probe = new Draughts({ board, turn: "w" });
    const opening = probe.legalMoves();
    if (opening.length === 0 || opening[0].captures.length > 0) continue;

    let found: Task | null = null;

    for (const sacrifice of opening) {
      const game = new Draughts({ board, turn: "w" });
      game.applyMove(sacrifice);

      // Хамгийн энгийн хэлбэр: НЭГ өгч ХОЁР авна.
      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length !== 1) continue;
      const [reply] = replies;

      game.applyMove(reply);

      const finals = game.legalMoves();
      if (finals.length !== 1 || finals[0].captures.length !== 2) continue;
      const strike = finals[0];

      /*
       * ⚠ ТУСГАЙ ХЭВ МАЯГТАЙГ ХАЯНА — тэдгээрийг өөр хичээл заадаг.
       * Энэ шалгуургүйгээр «завсраар өгөх» гэх мэт сэдэв энд урьдчилж
       * гарч ирнэ (найман дасгалын гурав яг ингэж байсан).
       */
      if (same(reply.to, sacrifice.from) && same(strike.captures[0], reply.to)) continue;
      if (strike.landings.some((landing) => same(landing, sacrifice.from))) continue;
      if (strike.captures.some((sq) => adjacent(sq, reply.from))) continue;

      const ending = new Draughts({ board, turn: "w" });
      ending.applyMove(sacrifice);
      ending.applyMove(reply);
      ending.applyMove(strike);

      if (
        ending.board().some((row, index) =>
          index >= 8 && row.some((c) => c?.color === "b" && !c.king)
        )
      ) {
        continue;
      }

      const balance = netDraughtsMaterial(ending, "w");
      if (balance < 1) continue;

      const candidate: Task = {
        fen: serializePosition(board, "w"),
        solution: [sacrifice, reply, strike].map(token).join(" "),
        balance,
      };

      if (puzzleProblem(candidate.fen, candidate.solution)) continue;

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

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<{ id: string; type: string }>(`
      select e.id, e.type
        from exercises e
        join lessons l on l.id = e.lesson_id
        join units u on u.id = l.unit_id
       where u.course_slug = 'checkers' and l.title = '2 нүүдлийн комбинаци'
       order by e.sort_order`)
  ).rows;

  const boards = rows.filter((row) => row.type !== "choice");
  console.log(`«2 нүүдлийн комбинаци»: ${rows.length} дасгал (хөлөгт ${boards.length})`);

  let changed = 0;
  let failed = 0;
  const usedSolutions = new Set<string>();

  for (const row of boards) {
    const task = generateBasicCombo(seedFromString(row.id), usedSolutions);

    if (!task) {
      console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
      failed++;
      continue;
    }

    usedSolutions.add(task.solution);
    console.log(`  ${task.fen}  ${task.solution}  (эцэст +${task.balance})`);
    changed++;

    if (apply) {
      await client.query(
        `update exercises
            set type='draughts-puzzle', prompt=$2, prompt_en=$3,
                explanation=$4, explanation_en=$5,
                fen=$6, solution=$7, correct_from=null, correct_to=null
          where id=$1`,
        [row.id, BASIC_COMBO_PROMPT, PROMPT_EN, EXPLAIN, EXPLAIN_EN, task.fen, task.solution]
      );
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
