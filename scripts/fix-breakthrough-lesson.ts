/**
 * «ЦООЛОХ ЦОХИЛТ» ХИЧЭЭЛИЙГ ТОДОРХОЙЛОЛТООР НЬ БАРЬНА.
 *
 * ЭЗНИЙ ТОДОРХОЙЛОЛТ: «3 хар хүү ТАШУУ зэрэгцэж цуварсан байхад ДУНД
 * хүүд нь цагаан хүүгээ идүүлэхээр өгөөд ҮЛДСЭН ХҮҮНҮҮДИЙГ нь идэхийг
 * цоолох цохилт гэнэ.»
 *
 * ⚠ ГУРВАЛ НЬ ТАШУУ (диагональ) дээр байх ЁСТОЙ — нэг мөрөнд биш. Энэ
 * ялгаа нь техникийн хувьд шийдвэрлэх ач холбогдолтой:
 *
 *   • НЭГ МӨРӨНД L=(r,c-2), R=(r,c+2) байвал энгийн хүү хоёуланг нь нэг
 *     цуваагаар идэх нь БОЛОМЖГҮЙ. L-ийг идсэний дараах буулт нь
 *     (r±1,c-1)/(r±1,c-3); R-ийн ташуу хөршүүд (r±1,c+1)/(r±1,c+3) —
 *     огт давхцахгүй. 400 мянган байрлал шалгахад 0 олдсон.
 *
 *   • ТАШУУ L=(r,c), M=(r+1,c+1), R=(r+2,c+2) байвал хүү L-ийг идээд ЯГ
 *     M-ийн хоосорсон нүдэнд буугаад, тэндээсээ R-ийг үсэрнэ. Дунд нь
 *     идүүлж нүдийг нь хоослох гэдэг яг ЭНЭ ЗАМЫГ нээж өгдөг —
 *     «цоолох» гэдгийн утга нь тэр.
 *
 * ⚠ ХОЁР УДАА БУРУУ ТАЙЛСАН: эхлээд «2+ дүрс ид» гэж, дараа нь «нэг
 * мөрөнд гурав» гэж ойлгож байв. Эзэн ташуу зэрэгцэхийг заав.
 *
 * ⚠ ДААМ БОЛОХ нь ЗААВАЛ БИШ (эзний шийдвэр). Нэг үе шаардаж үзсэн
 * боловч тэр нөхцөл геометрийг эрс хумьж (122 тохирох байрлалын 6 нь л
 * даам болдог), үүссэн таван дасгал бараг ижил хэв маягтай болсон —
 * хүүхэд бодохын оронд цээжилнэ. Цоолох гэдэг нь эгнээг НЭВТЛЭХ явдал;
 * даам гарах нь түүний нэг үр дүн болохоос заавал биш.
 *
 * ⚠ ХАР ТАЛД СӨРӨГ ЗАНАЛ БАЙХГҮЙ: хар хүү 7–8-р мөрөнд зогсвол тэр ч
 * бас даам гарах гэж байгаа тул цагааны цоолох нь давуу тал байхаа
 * больж, хоёр талын уралдаан болно. Хар дүрсийг зөвхөн өөрийнх нь
 * талд (0–6-р мөр) тавина. Цагаан нь ДАВШИЖ, харын талд цохино.
 *
 * ⚠ ИДСЭН ХАР ХҮҮ ӨӨРИЙН ТАЛДАА ҮЛДЭНЭ: золиос нь дунд хүүгийн ДЭЭД
 * талд буух ёстой бөгөөд хар түүнийг ДЭЭШ үсэрч иднэ. Доош идвэл тэр
 * хүү цагааны хагас руу гарч ирж, шинэ аюул болно.
 *
 * ⚠ БОЛЗОЛУУД:
 *   1. цагааны эхний нүүдэл ИДЭЛТГҮЙ (хүүгээ өгнө),
 *   2. харын ЦОРЫН ГАНЦ хариу нь ДУНД хүүгээр ЯГ НЭГ дүрс идэх,
 *   3. цагааны цорын ганц цохилт нь гурвалын ҮЛДСЭН ХОЁУЛАНГ иднэ,
 *   4. цэвэр ашигтай, `puzzleProblem`-ийг давна.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-breakthrough-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareFromNumber, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";
import { refuseLockedLesson } from "./curriculum/levelGuard";

import type { Board, DraughtsMove, Piece, Square } from "../src/lib/draughts/engine";

const SIZE = 10;

const PROMPT = "Цагаанаар тоглож байна. Дунд хүүд нь өгөөд цоол.";
const PROMPT_EN = "White to play. Feed the middle man, then break through.";
const EXPLAIN =
  "Гурван хүү ТАШУУ зэрэгцэж байвал ДУНД хүүд нь хүүгээ идүүлэхээр өг. Тэр идэхээс өөр аргагүй болж дундах нүд хоосорно — чиний хүү тэр нүдэнд бууж, үлдсэн хоёрыг нь цуваагаар идэж ДААМ гарна. Цоолох нь материалын бус ЗАМЫН тооцоо.";
const EXPLAIN_EN =
  "When three men stand in a diagonal line, offer your man to the MIDDLE one. It is forced to capture, its square empties, and your man lands there mid-chain, sweeps up the two that are left and promotes. A breakthrough is about the lane, not material.";

/** Гурвалын дунд нь, мөн үлдэх хоёрын дугаар. */
type Triple = { mid: Square; rest: number[] };

/**
 * ТАШУУ зэрэгцсэн гурван хар хүү.
 *
 * ⚠ ХОЁР ЧИГЛЭЛ: «\» ([1,1]) ба «/» ([1,-1]). Аль нэгийг нь мартвал
 * боломжит байрлалын тал нь алдагдана.
 */
function diagonalTriples(board: Board): Triple[] {
  const out: Triple[] = [];

  for (let row = 1; row < SIZE - 1; row += 1) {
    for (let col = 1; col < SIZE - 1; col += 1) {
      const middle = board[row][col];
      if (middle?.color !== "b" || middle.king) continue;

      for (const [dr, dc] of [
        [1, 1],
        [1, -1],
      ]) {
        const before = board[row - dr]?.[col - dc];
        const after = board[row + dr]?.[col + dc];
        if (before?.color === "b" && after?.color === "b" && !before.king && !after.king) {
          out.push({
            mid: { row, col },
            rest: [squareNumber(row - dr, col - dc), squareNumber(row + dr, col + dc)],
          });
        }
      }
    }
  }

  return out;
}

/** Ташуу гурвалыг ТАВИАД, үлдсэн дүрсийг санамсаргүй нөхнө. */
function boardWithDiagonalTriple(
  rng: () => number,
  extraBlacks: number,
  whites: number
): Board | null {
  const board: Board = Array.from({ length: SIZE }, () => Array<Piece | null>(SIZE).fill(null));

  /*
   * ⚠ ГУРВАЛ БҮХЭЛДЭЭ ХАРЫН ТАЛД (0–6-р мөр). Хоёр шалтгаан:
   *   • Цагаан ДАВШИЖ очиж цохино — доод хэсэгт тавибал ухарч идэх
   *     болж, «цоолох» гэдэг санаа алдагдана.
   *   • Хар хүү 7–8-р мөрөнд орвол өөрөө даам гарах гэж байгаа тул
   *     цагааны цохилт давуу тал байхаа болино.
   * Гурвал нь `row`-оос `row+2` хүртэл сунадаг тул дээд хязгаар нь 4.
   */
  const row = Math.floor(rng() * 5);
  const dc = rng() < 0.5 ? 1 : -1;
  const col = dc === 1 ? 1 + Math.floor(rng() * (SIZE - 3)) : 2 + Math.floor(rng() * (SIZE - 3));

  const cells: [number, number][] = [
    [row, col],
    [row + 1, col + dc],
    [row + 2, col + 2 * dc],
  ];

  for (const [r, c] of cells) {
    // ⚠ Зөвхөн БАРААН нүд; хүрээнээс гарвал энэ оролдлогыг хаяна.
    if (r < 0 || r >= SIZE || c < 0 || c >= SIZE || (r + c) % 2 === 0) return null;
    board[r][c] = { color: "b", king: false };
  }

  const place = (color: "w" | "b", count: number): boolean => {
    for (let placed = 0; placed < count; placed += 1) {
      let attempts = 0;
      for (;;) {
        if (attempts++ > 300) return false;
        const square = squareFromNumber(1 + Math.floor(rng() * 50));
        if (board[square.row][square.col]) continue;
        // Хүү даамын эгнээнд зогсож болохгүй — тэнд байвал даам байх ёстой.
        if (color === "w" && square.row === 0) continue;

        /*
         * ⚠ ХАР ТАЛ ДААМ ГАРАХ ДАВУУГҮЙ БАЙНА. Хар нь 9-р мөрөнд даам
         * болдог тул 7–8-р мөрөнд хар хүү зогсвол «би ч бас даам гаргах
         * гэж байна» гэсэн сөрөг заналхийлэл үүснэ. Тэр үед цагааны
         * цоолох нь давуу тал байхаа больж, харилцан уралдаан болно —
         * хичээлийн санаа бүдгэрнэ. Тиймээс хар дүрс ЗӨВХӨН өөрийн
         * талдаа (0–6-р мөр) байна.
         */
        if (color === "b" && square.row >= SIZE - 3) continue;

        board[square.row][square.col] = { color, king: false };
        break;
      }
    }
    return true;
  };

  return place("b", extraBlacks) && place("w", whites) ? board : null;
}

type Task = { fen: string; solution: string; triple: string; captured: number };

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;

function generateBreakthrough(
  seed: number,
  minCaptures: number,
  usedSolutions: Set<string>
): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 2000000; attempt += 1) {
    const board = boardWithDiagonalTriple(rng, Math.floor(rng() * 3), 2 + Math.floor(rng() * 3));
    if (!board) continue;

    const triples = diagonalTriples(board);
    if (triples.length === 0) continue;

    const probe = new Draughts({ board, turn: "w" });
    const opening = probe.legalMoves();
    // 1) Эхний нүүдэл ИДЭЛТГҮЙ — хүүгээ өгнө.
    if (opening.length === 0 || opening[0].captures.length > 0) continue;

    let found: Task | null = null;

    for (const sacrifice of opening) {
      const game = new Draughts({ board, turn: "w" });
      game.applyMove(sacrifice);

      /*
       * 2) Харын хариу АЛБАДМАЛ, ДУНД хүүгээр, ЯГ НЭГ дүрс идэх.
       *    Хоёрыг идвэл золиос хоёр дахин үнэтэй болж ашиг алга болно.
       */
      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length !== 1) continue;
      const [reply] = replies;
      const triple = triples.find(
        (t) => t.mid.row === reply.from.row && t.mid.col === reply.from.col
      );
      if (!triple) continue;

      /*
       * ⚠ ИДСЭН ХАР ХҮҮ ӨӨРИЙН ТАЛДАА ҮЛДЭНЭ (эзний шаардлага).
       *
       * Цагаан нь ДАВШИЖ очиж хүүгээ өгдөг тул золиос нь дунд хүүгийн
       * ДЭЭД талд буух ёстой — тэгвэл хар түүнийг дээш үсэрч идээд
       * өөрийн хагаст (0–4-р мөр) үлдэнэ. Доош идвэл хар нь цагааны
       * хагас руу гарч ирэх бөгөөд тэр нь цагааны хувьд шинэ аюул
       * болж, цоолох цохилтын давуу тал бүдгэрнэ.
       */
      if (reply.to.row >= reply.from.row) continue;

      game.applyMove(reply);

      // 3) Цагааны цорын ганц цохилт нь ҮЛДСЭН ХОЁУЛАНГ иднэ.
      const finals = game.legalMoves();
      if (finals.length !== 1 || finals[0].captures.length < minCaptures) continue;

      const taken = finals[0].captures.map((sq) => squareNumber(sq.row, sq.col));
      if (!triple.rest.every((n) => taken.includes(n))) continue;

      // 4) Цэвэр ашигтай.
      if (finals[0].captures.length <= reply.captures.length) continue;

      const candidate: Task = {
        fen: serializePosition(board, "w"),
        solution: [sacrifice, reply, finals[0]].map(token).join(" "),
        triple: `${triple.rest[0]}·${squareNumber(triple.mid.row, triple.mid.col)}·${triple.rest[1]}`,
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
  if (refuseLockedLesson(["Цоолох цохилт"])) return 1;

  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const lesson = (
    await client.query<{ id: string }>(`
      select l.id from lessons l join units u on u.id = l.unit_id
       where u.course_slug = 'checkers' and l.title in ('Цоолох', 'Цоолох цохилт')`)
  ).rows[0];

  if (!lesson) {
    console.error("«Цоолох цохилт» хичээл олдсонгүй.");
    return 1;
  }

  const rows = (
    await client.query<{ id: string; type: string }>(
      "select id, type from exercises where lesson_id = $1 order by sort_order",
      [lesson.id]
    )
  ).rows;

  const boards = rows.filter((row) => row.type !== "choice");
  console.log(`«Цоолох цохилт»: ${rows.length} дасгал (хөлөгт ${boards.length})`);

  let changed = 0;
  let failed = 0;
  const usedSolutions = new Set<string>();

  for (const [index, row] of boards.entries()) {
    /*
     * ⚠ Бүгд 2 идэлт. «Идсэн хар хүү өөрийн талдаа үлдэх» нөхцөл нь
     * харыг ХОЙШ (дээш) идэхийг шаарддаг тул байрлал ховордов —
     * дээрээс нь урт цуваа шаардвал огт олдохгүй.
     */
    const minCaptures = 2;
    const task = generateBreakthrough(seedFromString(row.id), minCaptures, usedSolutions);

    if (!task) {
      console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй (${minCaptures}+ идэлт)`);
      failed++;
      continue;
    }

    usedSolutions.add(task.solution);
    console.log(`  ${task.fen}  ${task.solution}  | гурвал ${task.triple}, ${task.captured} идэлт`);
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
