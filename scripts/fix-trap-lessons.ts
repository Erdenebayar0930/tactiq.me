/**
 * «УРХИ» БА «УРХИНЫ ДАДЛАГА» ХИЧЭЭЛД ӨӨРИЙН ГЭСЭН ШИНЖ ӨГНӨ.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: 18 дасгал нь ерөнхий «Тулгуураа өгөөд цохи»
 * байв — «Тулгууртай цохилт», «Тулгуурын дадлага», «2 нүүдлийн
 * комбинаци» зэрэгтэй ЯГ ИЖИЛ. Цэвэр ашиг нь +1-ээс +3 хүртэл
 * холилдсон тул урхи гэдэг нь юугаараа өөр болох нь харагддаггүй.
 *
 * ⚠ ХИЧЭЭЛИЙН ӨӨРИЙН ОНОЛ (асуултад нь бичигдсэн): «Урхи бол мэхлэх
 * биш АЛБАДАХ арга: идэлт заавал тул өрсөлдөгч сонголтгүй болно.»
 *
 * ⚠ ЯЛГАХ ЗААГ — ӨГӨӨ БА ШИЙТГЭЛИЙН ХАРЬЦАА:
 *   • ТУЛГУУР — нэг өгөөд ХОЁР авна (+1). Ердийн солилцооны ашиг.
 *   • ЗОЛИОС  — ХОЁР өгнө, илүүг авна. Том хөрөнгө оруулалт.
 *   • УРХИ    — нэг л хүү өгнө (өгөө нь БАГА, «үнэгүй» мэт харагдана),
 *               гэтэл шийтгэл нь ГУРАВ ба түүнээс дээш (+2-оос багагүй).
 *
 * ⚠ КОДООР ШАЛГАХ БОЛЗОЛ:
 *   1. цагааны эхний нүүдэл ИДЭЛТГҮЙ — өгөө нь тавигдана,
 *   2. харын ЦОРЫН ГАНЦ хариу нь ЯГ НЭГ дүрс идэх (жижиг өгөө),
 *   3. цагааны цорын ганц цохилт нь ГУРАВ ба түүнээс дээш дүрс идэх,
 *   4. эхлэл ба төгсгөлд хар тал даам гарах босгон дээр байхгүй,
 *   5. цохилтын дараа цагаан +2-оос багагүй илүүтэй үлдэнэ,
 *   6. `puzzleProblem`-ийг давна.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-trap-lessons.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { netDraughtsMaterial } from "../src/lib/draughts/bot";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";
import { refuseLockedLesson } from "./curriculum/levelGuard";

import type { DraughtsMove } from "../src/lib/draughts/engine";

/*
 * ⚠ ТОО ХАТУУ БИЧИХГҮЙ. Урьд нь «гурвыг ав» гэж байсан ч үүсгэгч
 * ГУРАВ ба түүнээс ДЭЭШ идэх байрлал гаргадаг тул дөрвийг иддэг
 * дасгал дээр даалгавар нь худал болж байв.
 */
export const TRAP_PROMPT =
  "Цагаанаар тоглож байна. Урхиа тавь — нэг хүү өгөөд гурваас доошгүйг ав.";
const PROMPT_EN = "White to play. Set the trap — give one piece and take at least three.";
const EXPLAIN =
  "Урхи бол мэхлэх биш АЛБАДАХ арга: идэлт заавал тул өрсөлдөгч чиний өгсөн хүүг авахаас өөр аргагүй болж, цуваанд ордог. Өгөө нь ганц хүү атал шийтгэл нь гурав ба түүнээс дээш.";
const EXPLAIN_EN =
  "A trap is not a trick but a forcing device: capture is compulsory, so your opponent must take the bait and walk into the chain. The bait is a single man; the punishment is three or more.";

const SHAPES = [
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
  { whites: 6, blacks: 6 },
  { whites: 6, blacks: 7 },
  { whites: 4, blacks: 6 },
];

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;

type Task = { fen: string; solution: string; gained: number; balance: number };

function generateTrap(seed: number, usedSolutions: Set<string>): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 2500000; attempt += 1) {
    const board = randomBoard(rng, SHAPES[attempt % SHAPES.length]);
    if (!board) continue;

    // 4а) Эхлэлд хар даам гарах босгон дээр байхгүй.
    if (board.some((row, index) => index >= 7 && row.some((c) => c?.color === "b" && !c.king))) {
      continue;
    }

    const probe = new Draughts({ board, turn: "w" });
    const opening = probe.legalMoves();
    // 1) Эхний нүүдэл ИДЭЛТГҮЙ — өгөө тавигдана.
    if (opening.length === 0 || opening[0].captures.length > 0) continue;

    let found: Task | null = null;

    for (const bait of opening) {
      const game = new Draughts({ board, turn: "w" });
      game.applyMove(bait);

      // 2) ЖИЖИГ ӨГӨӨ — хар яг нэг дүрс иднэ.
      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length !== 1) continue;
      const [reply] = replies;

      game.applyMove(reply);

      /*
       * 3) ТОМ ШИЙТГЭЛ — гурав ба түүнээс дээш. Энэ нь урхийг
       *    тулгуураас (нэг өгөөд хоёр авах) ялгадаг цорын ганц шинж.
       */
      const finals = game.legalMoves();
      if (finals.length !== 1 || finals[0].captures.length < 3) continue;

      // 4б) Төгсгөлд хар даам гарах босгон дээр үлдэхгүй.
      const ending = new Draughts({ board, turn: "w" });
      ending.applyMove(bait);
      ending.applyMove(reply);
      ending.applyMove(finals[0]);
      if (
        ending.board().some((row, index) =>
          index >= 8 && row.some((c) => c?.color === "b" && !c.king)
        )
      ) {
        continue;
      }

      // 5) Цагаан ТОДОРХОЙ илүүд гарна.
      const balance = netDraughtsMaterial(ending, "w");
      if (balance < 2) continue;

      const candidate: Task = {
        fen: serializePosition(board, "w"),
        solution: [bait, reply, finals[0]].map(token).join(" "),
        gained: finals[0].captures.length,
        balance,
      };

      // 6) Курсийн нийтлэг шалгуур.
      if (puzzleProblem(candidate.fen, candidate.solution)) continue;

      // Хоёр өөр ажиллах өгөө байвал байрлалыг ХАЯНА.
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

const LESSONS = ["Урхи", "Урхины дадлага"];

async function main(): Promise<number> {
  // ⚠ Level 4-өөс өмнөх агуулга царцсан (`levelGuard.ts`).
  if (refuseLockedLesson(["Урхи", "Урхины дадлага"])) return 1;

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
      const task = generateTrap(seedFromString(row.id), usedSolutions);

      if (!task) {
        console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
        failed++;
        continue;
      }

      usedSolutions.add(task.solution);
      console.log(
        `  ${task.fen}  ${task.solution}  (нэг өгч ${task.gained} авав, эцэст +${task.balance})`
      );
      changed++;

      if (apply) {
        await client.query(
          `update exercises
              set type='draughts-puzzle', prompt=$2, prompt_en=$3,
                  explanation=$4, explanation_en=$5,
                  fen=$6, solution=$7, correct_from=null, correct_to=null
            where id=$1`,
          [row.id, TRAP_PROMPT, PROMPT_EN, EXPLAIN, EXPLAIN_EN, task.fen, task.solution]
        );
      }
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
