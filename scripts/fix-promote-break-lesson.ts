/**
 * «ЦООЛЖ ДААМ ГАРАХ» ХИЧЭЭЛИЙГ НЭРТЭЙГЭЭ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: 12 дасгал нь «Цагаанаар тоглож байна. Хүүгээ
 * даам болго.» — өөрөөр хэлбэл Level 1-ийн «Даам болох дадлага»-тай ЯГ
 * ИЖИЛ агуулга. Нэг нүүдлээр хүүгээ түлхэж даам болгоно; «ЦООЛЖ» гэдэг
 * санаа (золиосоор дайсны эгнээг нээх) огт гарч ирдэггүй.
 *
 * ⚠ ТОДОРХОЙЛОЛТ: хүүгээ өгч дайсны эгнээг сулруулна. Өрсөлдөгч идэхээс
 * өөр аргагүй болж зам чөлөөлөгдөх бөгөөд дараагийн ЦОХИЛТ нь сүүлийн
 * эгнээнд хүрч ДААМ болно. Энэ нь материалын бус ЗАМЫН тооцоо.
 *
 * ⚠ ЯЛГАА:
 *   • «Даам болох дадлага» (Level 1) — нэг НҮҮДЛЭЭР даам болно;
 *   • «Цохиод даам болох» (Level 4) — нэг ИДЭЛТЭЭР даам болно;
 *   • «Цоолж даам гарах»  — ЗОЛИОС + албадмал хариу + даам болох ЦОХИЛТ.
 *
 * ⚠ БОЛЗОЛУУД:
 *   1. цагааны эхний нүүдэл ИДЭЛТГҮЙ (золиос),
 *   2. харын ЦОРЫН ГАНЦ хариу нь идэлт,
 *   3. цагааны цорын ганц цохилт нь ДААМ болж төгсөнө,
 *   4. цэвэр ашигтай; эхлэл ба төгсгөлд хар даам гарах босгон дээр
 *      байхгүй; цагаан илүүд гарна,
 *   5. `puzzleProblem`-ийг давна.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-promote-break-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { netDraughtsMaterial } from "../src/lib/draughts/bot";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";

import type { DraughtsMove } from "../src/lib/draughts/engine";

export const PROMOTE_BREAK_PROMPT = "Цагаанаар тоглож байна. Цоолж орж даам гар.";
export const PROMOTE_COMBO_PROMPT = "Цагаанаар тоглож байна. Комбинациар даам руу гар.";

/**
 * ⚠ ХОЁР ХИЧЭЭЛ, НЭГ БҮТЭЦ, ӨӨР ӨРГӨЛТ:
 *   • «Цоолж даам гарах»   — дайсны ЭГНЭЭГ нэвтлэх нь гол санаа;
 *   • «Даам руу комбинаци» — комбинацийн ЗОРИЛГО нь даам гаргах.
 * Хоёулангийнх нь шийдэл нь золиос → албадмал хариу → даам болох цохилт.
 */
const LESSON_TEXT: Record<string, { prompt: string; promptEn: string; explain: string; explainEn: string }> = {
  "Цоолж даам гарах": {
    prompt: PROMOTE_BREAK_PROMPT,
    promptEn: "White to play. Break through and promote.",
    explain:
      "Хүүгээ өгч дайсны эгнээг сулруул: өрсөлдөгч идэхээс өөр аргагүй болж зам чөлөөлөгдөнө. Дараа нь чиний цохилт сүүлийн эгнээнд хүрч ДААМ болно. Цоолох нь материалын бус ЗАМЫН тооцоо.",
    explainEn:
      "Give a man to loosen the enemy line: the reply is forced and the lane opens. Your strike then reaches the last row and promotes. A breakthrough is about the lane, not material.",
  },
  "Даам руу комбинаци": {
    prompt: PROMOTE_COMBO_PROMPT,
    promptEn: "White to play. Use the combination to reach a king.",
    explain:
      "Комбинацийн зорилго нь ямагт материал биш. Энд тулгуураа өгөөд, цохилтынхоо төгсгөлд хүүгээ сүүлийн эгнээнд гаргаж ДААМ болгоно. Нүүдэл бүрийг эхлэхээсээ өмнө эцэс хүртэл нь тоол.",
    explainEn:
      "A combination does not always aim at material. Here you give the setup piece and finish the strike on the last row, promoting to a king. Calculate the whole line before you start.",
  },
};

const SHAPES = [
  { whites: 3, blacks: 4 },
  { whites: 4, blacks: 4 },
  { whites: 4, blacks: 5 },
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
];

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;

type Task = { fen: string; solution: string; captured: number; balance: number };

function generatePromoteBreak(seed: number, usedSolutions: Set<string>): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 2500000; attempt += 1) {
    const board = randomBoard(rng, SHAPES[attempt % SHAPES.length]);
    if (!board) continue;

    // Эхлэлд хар даам гарах босгон дээр байхгүй.
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

      // 2) Харын хариу АЛБАДМАЛ идэлт.
      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length === 0) continue;
      const [reply] = replies;

      game.applyMove(reply);

      const finals = game.legalMoves();
      if (finals.length !== 1 || finals[0].captures.length === 0) continue;

      /*
       * 3) ГОЛ БОЛЗОЛ: цохилт нь ДААМ болж төгсөнө. Үүнгүйгээр энэ нь
       *    ердийн тулгуурт цохилт болж, хичээлийн нэртэй зөрнө.
       */
      if (!finals[0].promoted) continue;

      // 4) Цэвэр ашигтай.
      if (finals[0].captures.length <= reply.captures.length) continue;

      const ending = new Draughts({ board, turn: "w" });
      ending.applyMove(sacrifice);
      ending.applyMove(reply);
      ending.applyMove(finals[0]);

      // Төгсгөлд хар даам гарах босгон дээр үлдэхгүй.
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
        solution: [sacrifice, reply, finals[0]].map(token).join(" "),
        captured: finals[0].captures.length,
        balance,
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

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let changed = 0;
  let failed = 0;
  const usedSolutions = new Set<string>();

  for (const [title, text] of Object.entries(LESSON_TEXT)) {
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

  /*
   * ⚠ ЗӨВХӨН БОДЛОГЫГ хөндөнө. «Даам руу комбинаци» дотор «Идээд даам
   * бол» гэсэн НЭГ НҮҮДЛИЙН дасгал ч бий — тэр нь өөр сэдэв тул хэвээр.
   */
  const boards = rows.filter((row) => row.type === "draughts-puzzle");
  console.log(`
«${title}»: ${rows.length} дасгал (бодлого ${boards.length})`);

  for (const row of boards) {
    const task = generatePromoteBreak(seedFromString(row.id), usedSolutions);

    if (!task) {
      console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
      failed++;
      continue;
    }

    usedSolutions.add(task.solution);
    console.log(
      `  ${task.fen}  ${task.solution}  (${task.captured} идэж даам, эцэст +${task.balance})`
    );
    changed++;

    if (apply) {
      /*
       * ⚠ ТӨРӨЛ СОЛИГДОНО: `draughts-move` → `draughts-puzzle`.
       * Хуучин нэг нүүдлийн талбаруудыг цэвэрлэнэ.
       */
      await client.query(
        `update exercises
            set type='draughts-puzzle', prompt=$2, prompt_en=$3,
                explanation=$4, explanation_en=$5,
                fen=$6, solution=$7, correct_from=null, correct_to=null
          where id=$1`,
        [row.id, text.prompt, text.promptEn, text.explain, text.explainEn, task.fen, task.solution]
      );
    }
  }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
