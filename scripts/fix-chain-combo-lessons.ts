/**
 * «ДАРААЛСАН» БА «ГИНЖИН» КОМБИНАЦИЙГ НЭРТЭЙГЭЭ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: хоёулаа «КОМБИНАЦИ» гэж нэрлэгдээд дасгал нь
 * НЭГ НҮҮДЛИЙН цуваа («Нэг нүүдлээр хоёроос дээш хүү ид») байв.
 * Комбинаци гэдэг нь золиос + албадмал хариу + цохилт — хэд хэдэн
 * нүүдэл. Түүнээс гадна тэр агуулга нь ЯГ ТЭР бүлгийн «Гурван хүүгийн
 * цуваа», «Дөрвөн хүүгийн цуваа» хичээлүүдтэй давхардаж байлаа.
 *
 * ⚠ ХОЁРЫГ ЯЛГАСАН НЬ:
 *   • ДАРААЛСАН — хоёр нүүдэлт комбинаци бөгөөд ЭЦСИЙН цохилт нь
 *     гурав ба түүнээс дээш дүрсийг ДАРААЛУУЛАН иднэ.
 *   • ГИНЖИН    — гурван нүүдэлт комбинаци: цагаан ХОЁР УДАА цохино,
 *     цохилт бүр нь дараагийнхаа холбоос болно (гинж).
 *
 * ⚠ Хоёулаа `puzzleProblem`-ийг давна, мөн «тусгай бодлого»-ын
 * жагсаалтад орсон тул `repair:draughts` ерөнхий комбинациар ДАРАХГҮЙ.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-chain-combo-lessons.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, seedFromString } from "../src/lib/draughts/generate";
import { deserializePosition, squareNumber } from "../src/lib/draughts/notation";
import { generateTask, puzzleProblem } from "./curriculum/draughtsGenerators";

import type { GenSpec } from "./curriculum/draughtsShared";

type LessonPlan = {
  title: string;
  prompt: string;
  promptEn: string;
  explain: string;
  explainEn: string;
  /** Дасгалын дугаараар өөр бүрэлдэхүүн — нэг хэвийн болохоос сэргийлнэ. */
  specs: GenSpec[];
  /** Заавал биелэх ЯГ утгууд (заагаагүй бол `specs` л шийднэ). */
  exact?: { given: number; chain: number };
  /**
   * Хар тал даам гарах бүсэд байхыг хориглох эсэх.
   *
   * ⚠ ЗӨВХӨН ЭНЭ ХИЧЭЭЛД. Эзэн «Дараалсан комбинаци»-г л зас гэсэн тул
   * нийтлэг баталгаажуулагчийг хөндөөгүй — бусад хичээл хэвээр.
   */
  cleanPromotionZone?: boolean;
};

const PLANS: LessonPlan[] = [
  {
    title: "Дараалсан комбинаци",
    prompt: "Цагаанаар тоглож байна. Нэг хүү өгөөд гурван удаа дараалан ид.",
    promptEn: "White to play. Give one piece, then capture three times in a row.",
    explain:
      "Тулгуураа өгмөгц өрсөлдөгч идэхээс өөр аргагүй болно. Дараа нь чиний хүү ГУРВАН удаа дараалан үсэрч, гурван дүрсийг нэг нүүдлээр иднэ. Цувааг эхлэхээсээ ӨМНӨ эцэс хүртэл нь тоол.",
    explainEn:
      "Once you give the setup piece the reply is forced. Your man then jumps THREE times in a row, taking three pieces in a single move. Count the whole chain before you start.",
    /*
     * ⚠ ЯГ 3 ИДЭЛТ, ЯГ 1 ӨГӨӨ. Урьд нь `minGain: 3` байсан тул цуваа нь
     * 3 ч, 4 ч байх бөгөөд өгөө нь 1 ч, 2 ч байв — зургаан дасгал дөрвөн
     * өөр хэлбэртэй болж, «дараалсан» гэдэг нь юу болох нь тодорхойгүй
     * байлаа. Хичээлийн жишгийг ГАНЦ хэлбэрт барина.
     */
    specs: [
      { type: "combo", pieces: { whites: 5, blacks: 5 }, minGain: 3 },
      { type: "combo", pieces: { whites: 5, blacks: 6 }, minGain: 3 },
      { type: "combo", pieces: { whites: 6, blacks: 6 }, minGain: 3 },
    ],
    exact: { given: 1, chain: 3 },
    cleanPromotionZone: true,
  },
  {
    title: "Гинжин комбинаци",
    prompt: "Цагаанаар тоглож байна. Гинжин цохилтоо эцэс хүртэл хий.",
    promptEn: "White to play. Play the chained strike to the end.",
    explain:
      "Гинжин комбинацид цагаан ХОЁР УДАА цохино: эхний цохилт нь хоёр дахийгаа бэлддэг холбоос. Хариу бүр албадмал тул эцэс хүртэл нь тооцож болно.",
    explainEn:
      "In a chained combination White strikes TWICE: the first strike is the link that sets up the second. Every reply is forced, so the whole line can be calculated.",
    specs: [
      { type: "combo3", pieces: { whites: 5, blacks: 5 }, minGain: 2 },
      { type: "combo3", pieces: { whites: 6, blacks: 6 }, minGain: 2 },
      { type: "combo3", pieces: { whites: 5, blacks: 6 }, minGain: 2 },
    ],
  },
];

/**
 * Хар тал даам гарах бүсэд байхгүй эсэх — ЭХЛЭЛД ба ТӨГСГӨЛД.
 *
 * ⚠ Эхлэлд 7–8-р мөр: тэнд зогссон хар хүү нэг-хоёр нүүдлээр даам
 * болох тул «би хожиж байна уу?» гэсэн эргэлзээ төрүүлнэ.
 * ⚠ Төгсгөлд 8-р мөр: идэгдсэн хар хүү тэр эгнээ рүү ороод үлдэж
 * болзошгүй тул эхлэлийг шалгаад зогсохгүй.
 */
function promotionZoneClean(fen: string, solution: string): boolean {
  const setup = deserializePosition(fen);
  if (!setup) return false;

  const deep = (board: (import("../src/lib/draughts/engine").Piece | null)[][], from: number) =>
    board.some((row, index) =>
      index >= from && row.some((cell) => cell?.color === "b" && !cell.king)
    );

  if (deep(setup.board, 7)) return false;

  const game = new Draughts(setup);
  for (const entry of solution.split(" ")) {
    const move = game
      .legalMoves()
      .find(
        (m) => `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}` === entry
      );
    if (!move) return false;
    game.applyMove(move);
  }

  return !deep(game.board(), 8);
}

/** Шийдлийн ЯГ хэлбэрийг шалгана: хэдэн дүрс өгч, хэдэн удаа идэв. */
function matchesExact(
  fen: string,
  solution: string,
  exact: { given: number; chain: number }
): boolean {
  const setup = deserializePosition(fen);
  if (!setup) return false;

  const game = new Draughts(setup);
  let given = 0;
  let chain = 0;

  for (const [index, entry] of solution.split(" ").entries()) {
    const move = game
      .legalMoves()
      .find(
        (m) => `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}` === entry
      );
    if (!move) return false;
    if (index % 2 === 0) chain = Math.max(chain, move.captures.length);
    else given += move.captures.length;
    game.applyMove(move);
  }

  return given === exact.given && chain === exact.chain;
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let changed = 0;
  let failed = 0;

  for (const plan of PLANS) {
    const rows = (
      await client.query<{ id: string }>(
        `select e.id
           from exercises e
           join lessons l on l.id = e.lesson_id
           join units u on u.id = l.unit_id
          where u.course_slug = 'checkers' and l.title = $1 and e.type <> 'choice'
          order by e.sort_order`,
        [plan.title]
      )
    ).rows;

    console.log(`\n${plan.title}: ${rows.length} дасгал`);
    const used = new Set<string>();

    for (const [index, row] of rows.entries()) {
      /*
       * ⚠ БҮХ БҮРЭЛДЭХҮҮНИЙГ ОРОЛДОНО. Дасгалд оногдсон нэг бүрэлдэхүүн
       * нь хэдэн зуун мянган оролдлогод ч тохирохгүй байж болно (гинжин
       * комбинаци ховор). Нэг нь бүтэхгүй бол бусдыг үзнэ — эс бөгөөс
       * хичээл дутуу үлдэнэ.
       */
      const rng = makeRng(seedFromString(row.id));
      let task: ReturnType<typeof generateTask> = null;

      for (let order = 0; order < plan.specs.length && !task; order += 1) {
        const spec = plan.specs[(index + order) % plan.specs.length];
        for (let attempt = 0; attempt < 1200000 && !task; attempt += 1) {
          const candidate = generateTask(rng, spec);
          if (!candidate || candidate.type !== "draughts-puzzle") continue;
          if (puzzleProblem(candidate.fen, candidate.solution)) continue;
          if (used.has(candidate.solution)) continue;
          // ⚠ Хичээлийн ЯГ хэлбэр (хэдэн өгч, хэдэн удаа идэх) заагдсан бол мөрдөнө.
          if (plan.exact && !matchesExact(candidate.fen, candidate.solution, plan.exact)) continue;
          if (plan.cleanPromotionZone && !promotionZoneClean(candidate.fen, candidate.solution)) {
            continue;
          }
          task = candidate;
        }
      }

      if (!task || task.type !== "draughts-puzzle") {
        console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
        failed++;
        continue;
      }

      used.add(task.solution);
      console.log(`  ${task.fen}  ${task.solution}`);
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
          [row.id, plan.prompt, plan.promptEn, plan.explain, plan.explainEn, task.fen, task.solution]
        );
      }
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
