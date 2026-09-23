/**
 * «ЗАВСРААР ӨГӨХ ЦОХИЛТ» ХИЧЭЭЛИЙГ ТОДОРХОЙЛОЛТООР НЬ БАРЬНА.
 *
 * ЭЗНИЙ ЖИШЭЭ (`w:W30,34,44,50:B18,31,33,43`, шийдэл `44-39 33-44 50-48`):
 * цагаан 39-д хүүгээ өгнө → хар 33 идээд 44-т БУУНА → цагааны 50 нь тэр
 * шинэ дүрсийг 43-тай хамт нэг цуваагаар иднэ.
 *
 * ⚠ «ЗАВСАР» нь ҮГЧЛЭН: хүүгээ ХОЁР дайсны ЗАВСАРТ тавьж өгнө. Эзний
 * жишээнд 39-р нүд нь хар 33, 43 хоёрын дунд байна. Нэг дайсны хажууд
 * тавьсан бол энэ нь ердийн тулгуур болохоос «завсраар өгөх» биш —
 * эхний хувилбарууд яг тэр алдаатай байсныг эзэн заав.
 *
 * ⚠ Золиос нь өрсөлдөгчийн дүрсийг ТУХАЙН нүд рүү татаж, тэр нүд
 * цувааны нэг холбоос болно. Золиосгүй бол цуваа тэнд тасарна.
 *
 * ⚠ ЭНЭ НЬ «ЗАМ ЧӨЛӨӨЛӨХ»-ИЙН ТОЛЬ ДҮРС: тэнд золиос нь өөрийн дүрсийг
 * замаас ЗАЙЛУУЛДАГ (нүд чөлөөлнө), энд харин өрсөлдөгчийн дүрсийг
 * замд нь ОРУУЛЖ ИРДЭГ (нүд дүүргэнэ).
 *
 * ⚠ ЭХЛЭЭД БУРУУ ТАЙЛСАН: «завсраар» гэдгийг таван хагас нүүдэлт, хоёр
 * золиост комбинаци гэж ойлгож байв. Эзэн жишээгээр залруулав — энэ нь
 * ГУРВАН хагас нүүдэлт, нэг золиост цохилт.
 *
 * ⚠ БОЛЗОЛУУД:
 *   1. цагааны эхний нүүдэл ИДЭЛТГҮЙ (золиос),
 *   2. харын хариу АЛБАДМАЛ идэлт бөгөөд тодорхой нүдэнд БУУНА,
 *   3. цагааны эцсийн цуваа ЯГ ТЭР нүдэн дэх дүрсийг иднэ,
 *   4. цуваа 2+ дүрс иднэ — «дүүргэсэн» нүд цувааг уртасгасан байна,
 *   5. цэвэр ашигтай, шийдэл нь цорын ганц (`puzzleProblem`).
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-intermediate-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";
import { refuseLockedLesson } from "./curriculum/levelGuard";

import type { DraughtsMove, Square } from "../src/lib/draughts/engine";

const PROMPT = "Цагаанаар тоглож байна. Завсраар өгөөд цувааг уртасга.";
const PROMPT_EN = "White to play. Give a piece in between to lengthen the strike.";
const EXPLAIN =
  "Хүүгээ өгөхөд өрсөлдөгчийн дүрс ТУХАЙН нүд рүү татагдаж ирнэ — тэр нүд чиний цувааны холбоос болно. Нэг хүү өгөөд цуваа хоёр, гурав дахин урт болвол золиос нь хамаагүй хямд.";
const EXPLAIN_EN =
  "Giving a piece pulls an enemy man onto the square you need — that square becomes a link in your chain. One piece for a strike two or three times longer is cheap.";

const SHAPES = [
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
  { whites: 6, blacks: 6 },
  { whites: 6, blacks: 7 },
  { whites: 4, blacks: 6 },
];

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;
const same = (a: Square, b: Square) => a.row === b.row && a.col === b.col;

/**
 * Тухайн нүдийг ташуу хүрээлсэн ХАР дүрсийн тоо.
 *
 * ⚠ «ЗАВСАР» гэдэг нь ҮГЧЛЭН: хүүгээ хоёр дайсны ЗАВСАРТ тавьж өгнө.
 * Эзний жишээнд золиос 39-р нүдэнд буудаг бөгөөд тэр нүд нь хар 33, 43
 * хоёрын дунд байна. Нэг л дайсны хажууд тавьсан бол энэ нь ердийн
 * тулгуур болохоос «завсраар өгөх» биш.
 */
function blackNeighbours(board: (import("../src/lib/draughts/engine").Piece | null)[][], square: Square): number {
  let count = 0;
  for (const [dr, dc] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    const row = square.row + dr;
    const col = square.col + dc;
    if (row < 0 || row > 9 || col < 0 || col > 9) continue;
    if (board[row][col]?.color === "b") count += 1;
  }
  return count;
}

type Task = { fen: string; solution: string; filled: number; chain: number };

function generateIntermediate(
  seed: number,
  minChain: number,
  usedSolutions: Set<string>
): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 400000; attempt += 1) {
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
    // 1) Эхний нүүдэл идэлтгүй — золиос.
    if (opening.length === 0 || opening[0].captures.length > 0) continue;

    let found: Task | null = null;

    for (const sacrifice of opening) {
      /*
       * ⚠ ГОЛ БОЛЗОЛ: золиос нь ХОЁР дайсны ЗАВСАРТ буух ёстой.
       * Үүнгүйгээр дасгал нь ердийн «тулгуураа өгөөд цохи» болно.
       */
      if (blackNeighbours(board, sacrifice.to) < 2) continue;

      const game = new Draughts({ board, turn: "w" });
      game.applyMove(sacrifice);

      // 2) Харын хариу албадмал идэлт.
      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length === 0) continue;
      const landed = replies[0].to;
      game.applyMove(replies[0]);

      /*
       * 3) ХАР НЬ ЗОЛИОСЫН СУЛЛАСАН НҮДЭНД БУУНА.
       *
       * ⚠ Эзний жишээ (`44-39 33-44 50-48`) яг ийм: цагаан 44-өөс 39 рүү
       * өгөхөд хар 39-ийг идээд 44-т буудаг. Энэ нь «завсраар өгөх»-ийн
       * харагдах хэлбэр — өгсөн дүрсийн ОРОНД өрсөлдөгчийн дүрс ирж
       * суудаг.
       */
      if (!same(landed, sacrifice.from)) continue;

      const finals = game.legalMoves();
      if (finals.length !== 1) continue;
      const strike = finals[0];
      if (strike.captures.length < minChain) continue;

      /*
       * 4) ТЭР ДҮРСИЙГ ЭХЛЭЭД иднэ — «дүүргэсэн» нүд нь цувааны ҮҮД.
       *
       * ⚠ Зөвхөн «цуваанд багтсан» гэж шалгавал тэр дүрс СҮҮЛД идэгдэж
       * болох бөгөөд тэр нь ердийн буцаан идэлт болохоос цувааг уртасгах
       * санаа харагдахгүй.
       */
      if (!same(strike.captures[0], landed)) continue;
      if (strike.captures.length <= replies[0].captures.length) continue;

      /*
       * ⚠ ТӨГСГӨЛД ХАР ТАЛ ДААМ ГАРАХ БОСГОН ДЭЭР ҮЛДЭХГҮЙ.
       *
       * Хар хүү 8-р мөрөнд үлдвэл дараагийн нүүдэлдээ даам болно.
       * Цагаан материал хожсон ч даам нь тэр ашгийг дийлэнхдээ давдаг
       * тул ийм байрлалыг «зөв шийдэл» гэж заахгүй. ЭХЛЭЛ биш,
       * ТӨГСГӨЛИЙН байрлалыг шалгана — идсэн хар хүү тэр эгнээ рүү
       * ороод үлдэж болзошгүй.
       */
      const ending = new Draughts({ board, turn: "w" });
      ending.applyMove(sacrifice);
      ending.applyMove(replies[0]);
      ending.applyMove(strike);
      const blackNearPromotion = ending
        .board()
        .some((boardRow, rowIndex) =>
          rowIndex >= 8 && boardRow.some((cell) => cell?.color === "b" && !cell.king)
        );
      if (blackNearPromotion) continue;


      const candidate: Task = {
        fen: serializePosition(board, "w"),
        solution: [sacrifice, replies[0], strike].map(token).join(" "),
        filled: squareNumber(landed.row, landed.col),
        chain: strike.captures.length,
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
  // ⚠ Level 4-өөс өмнөх агуулга царцсан (`levelGuard.ts`).
  if (refuseLockedLesson(["Завсраар өгөх цохилт"])) return 1;

  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const lesson = (
    await client.query<{ id: string }>(`
      select l.id from lessons l join units u on u.id = l.unit_id
       where u.course_slug = 'checkers' and l.title = 'Завсраар өгөх цохилт'`)
  ).rows[0];

  if (!lesson) {
    console.error("«Завсраар өгөх цохилт» хичээл олдсонгүй.");
    return 1;
  }

  const rows = (
    await client.query<{ id: string; type: string }>(
      "select id, type from exercises where lesson_id = $1 order by sort_order",
      [lesson.id]
    )
  ).rows;

  const boards = rows.filter((row) => row.type !== "choice");
  console.log(`«Завсраар өгөх цохилт»: ${rows.length} дасгал (хөлөгт ${boards.length})`);

  let changed = 0;
  let failed = 0;
  const usedSolutions = new Set<string>();

  for (const [index, row] of boards.entries()) {
    // Сүүлийн хоёр нь илүү урт цуваатай — хүндрэл өснө.
    const minChain = index >= boards.length - 2 ? 3 : 2;
    const task = generateIntermediate(seedFromString(row.id), minChain, usedSolutions);

    if (!task) {
      console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй (цуваа ${minChain}+)`);
      failed++;
      continue;
    }

    usedSolutions.add(task.solution);
    console.log(
      `  ${task.fen}  ${task.solution}  (дүүргэсэн нүд ${task.filled}, цуваа ${task.chain})`
    );
    changed++;

    if (apply) {
      await client.query(
        `update exercises
            set type='draughts-puzzle', prompt=$2, prompt_en=$3,
                explanation=$4, explanation_en=$5,
                fen=$6, solution=$7, correct_from=null, correct_to=null
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
