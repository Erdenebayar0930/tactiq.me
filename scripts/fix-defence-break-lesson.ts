/**
 * «ХАМГААЛАЛТ ЗАДЛАХ» ХИЧЭЭЛИЙГ СЭДЭВТЭЙ НЬ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: зургаан дасгал нь бусад бүх комбинацийн
 * хичээлтэй ЯГ ИЖИЛ ерөнхий «Тулгуураа өгөөд цохи» байв. «Хамгаалалт
 * задлах» гэсэн санаа хөлөг дээр огт гарч ирдэггүй.
 *
 * ⚠ ТОДОРХОЙЛОЛТ: харын дүрснүүд бие биеэ хамгаалж байвал цагаан
 * шууд идэж чадахгүй. Хүүгээ өгөхөд ХАМГААЛАГЧ нь идэхээс өөр аргагүй
 * болж БАЙРНААСАА ХӨДӨЛНӨ — тэр мөчид хамгаалж байсан дүрс нь задгай
 * үлдэж, цагаан түүнийг иднэ.
 *
 * ⚠ КОДООР ШАЛГАХ ГУРВАН БОЛЗОЛ:
 *   1. ЭХЛЭЛ НЬ ТАЙВАН — цагаанд идэх боломж огт алга. Өөрөөр хэлбэл
 *      харын бүтэц бүрэн бөгөөд шууд орох гарц байхгүй.
 *   2. Золиосын дараа харын ЦОРЫН ГАНЦ хариу нь ЯГ НЭГ дүрс идэх —
 *      тэр идэгч нь ХАМГААЛАГЧ, байрнаасаа хөдөлж байна.
 *   3. Цагааны цохилт нь хамгаалагчийн ХАЖУУД (ташуу зэргэлдээ)
 *      байсан дүрсийг иднэ — яг тэр нь хамгаалагдаж байсан дүрс.
 *
 * ⚠ 3-Р БОЛЗОЛ НЬ ГОЛ: үүнгүйгээр аливаа комбинаци тохирч, хичээл
 * ерөнхий болж хувирна.
 *
 * ⚠ ТӨГСГӨЛД ХАР ДААМ ГАРАХ БОСГОН ДЭЭР ҮЛДЭХГҮЙ: идсэн хар хүү 8-р
 * мөрөнд буувал дараагийн нүүдэлдээ даам болно. Цагаан материал хожсон
 * ч даам нь тэр ашгийг давдаг тул ийм байрлалыг «зөв шийдэл» гэж
 * заахгүй.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-defence-break-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";
import { refuseLockedLesson } from "./curriculum/levelGuard";

import type { DraughtsMove, Square } from "../src/lib/draughts/engine";

const SIZE = 10;

export const BREAK_PROMPT = "Цагаанаар тоглож байна. Хамгаалагчийг нь татаад задал.";
const PROMPT_EN = "White to play. Lure the defender away and break the position open.";
const EXPLAIN =
  "Харын дүрснүүд бие биеэ хамгаалж байгаа тул шууд идэж болохгүй. Хүүгээ өгөхөд ХАМГААЛАГЧ нь идэхээс өөр аргагүй болж байрнаасаа хөдөлнө — тэр мөчид хамгаалж байсан дүрс нь задгай үлдэж, чи түүнийг иднэ.";
const EXPLAIN_EN =
  "Black's pieces defend each other, so nothing can be taken directly. Offer a piece and the DEFENDER is forced to capture, leaving its post — at that moment the piece it was guarding is loose and you take it.";

const SHAPES = [
  { whites: 4, blacks: 4 },
  { whites: 4, blacks: 5 },
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
  { whites: 6, blacks: 6 },
];

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;

/** Ташуу зэргэлдээ — даамд «хамгаалж байна» гэдэг нь яг энэ байрлал. */
const adjacent = (a: Square, b: Square) =>
  Math.abs(a.row - b.row) === 1 && Math.abs(a.col - b.col) === 1;

type Task = { fen: string; solution: string; guard: number; freed: string; captured: number };

function generateBreak(
  seed: number,
  minCaptures: number,
  usedSolutions: Set<string>
): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 600000; attempt += 1) {
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
    // 1) ТАЙВАН эхлэл — хамгаалалт бүрэн, шууд орох гарцгүй.
    if (opening.length === 0 || opening[0].captures.length > 0) continue;

    let found: Task | null = null;

    for (const sacrifice of opening) {
      const game = new Draughts({ board, turn: "w" });
      game.applyMove(sacrifice);

      // 2) ХАМГААЛАГЧ идэхээс өөр аргагүй болж байрнаасаа хөдөлнө.
      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length !== 1) continue;
      const [reply] = replies;
      const guard = reply.from;

      game.applyMove(reply);

      const finals = game.legalMoves();
      if (finals.length !== 1 || finals[0].captures.length < minCaptures) continue;
      // Цэвэр ашигтай байх.
      if (finals[0].captures.length <= reply.captures.length) continue;

      /*
       * 3) ХАМГААЛАГЧИЙН ХАЖУУД байсан дүрс идэгдэнэ.
       *
       * ⚠ Энэ бол хичээлийн цөм: хамгаалагч байрандаа байсан бол тэр
       * дүрсийг идэхэд буцааж идэх байсан. Түүнийг татаж хөдөлгөснөөр
       * хамгаалалт задарна.
       */
      const freed = finals[0].captures.filter((sq) => adjacent(sq, guard));
      if (freed.length === 0) continue;

      /*
       * ⚠ ЦОХИЛТЫН ДАРАА ХАР ТАЛ ДААМ ГАРАХ БОСГОН ДЭЭР ҮЛДЭХ ЁСГҮЙ.
       *
       * Хар 8-р мөрөнд үлдвэл дараагийн нүүдэлдээ даам болно. Цагаан
       * материал хожсон ч даам нь тэр ашгийг дийлэнхдээ давдаг тул
       * «энэ бол зөв шийдэл» гэж заах нь буруу. Эхлэлийн байрлалыг
       * шалгаад зогсохгүй, ТӨГСГӨЛИЙН байрлалыг ч шалгана — идсэн хар
       * хүү тэр эгнээ рүү орж болзошгүй.
       */
      const after = new Draughts({ board, turn: "w" });
      after.applyMove(sacrifice);
      after.applyMove(reply);
      after.applyMove(finals[0]);
      const blackNearPromotion = after
        .board()
        .some((boardRow, rowIndex) =>
          rowIndex >= SIZE - 2 && boardRow.some((cell) => cell?.color === "b" && !cell.king)
        );
      if (blackNearPromotion) continue;

      const candidate: Task = {
        fen: serializePosition(board, "w"),
        solution: [sacrifice, reply, finals[0]].map(token).join(" "),
        guard: squareNumber(guard.row, guard.col),
        freed: freed.map((sq) => squareNumber(sq.row, sq.col)).join(","),
        captured: finals[0].captures.length,
      };

      // Курсийн нийтлэг шалгуур — эс бөгөөс `repair:draughts` дарж бичнэ.
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
  if (refuseLockedLesson(["Хамгаалалт задлах"])) return 1;

  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<{ id: string; type: string }>(`
      select e.id, e.type
        from exercises e
        join lessons l on l.id = e.lesson_id
        join units u on u.id = l.unit_id
       where u.course_slug = 'checkers' and l.title = 'Хамгаалалт задлах'
       order by e.sort_order`)
  ).rows;

  const boards = rows.filter((row) => row.type !== "choice");
  console.log(`«Хамгаалалт задлах»: ${rows.length} дасгал (хөлөгт ${boards.length})`);

  let changed = 0;
  let failed = 0;
  const usedSolutions = new Set<string>();

  for (const [index, row] of boards.entries()) {
    // Сүүлийн хоёрт нь илүү урт цуваа — хүндрэл өснө.
    const minCaptures = index >= boards.length - 2 ? 3 : 2;
    const task = generateBreak(seedFromString(row.id), minCaptures, usedSolutions);

    if (!task) {
      console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй (${minCaptures}+ идэлт)`);
      failed++;
      continue;
    }

    usedSolutions.add(task.solution);
    console.log(
      `  ${task.fen}  ${task.solution}  | хамгаалагч ${task.guard} → задгай ${task.freed}, ${task.captured} идэлт`
    );
    changed++;

    if (apply) {
      await client.query(
        `update exercises
            set type='draughts-puzzle', prompt=$2, prompt_en=$3,
                explanation=$4, explanation_en=$5,
                fen=$6, solution=$7, correct_from=null, correct_to=null
          where id=$1`,
        [row.id, BREAK_PROMPT, PROMPT_EN, EXPLAIN, EXPLAIN_EN, task.fen, task.solution]
      );
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
