/**
 * «ХОЖИЛ» ХИЧЭЭЛИЙН ДАДЛАГЫГ СЭДЭВТЭЙ НЬ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: хичээл нь «тоглолтыг хэрхэн хожих вэ» гэж
 * заагаад (зөв хариулт нь «өрсөлдөгчийг нүүх боломжгүй болгох»), дадлага
 * нь ерөнхий «идэх боломжоо ол» байв — хожилтой огт холбоогүй. Тайлбар нь
 * ч «идэх боломж гарвал ЗААВАЛ идэх» гэсэн ӨӨР сэдвийг давтаж байлаа.
 * Хүүхэд онолыг нь уншаад, түүнийгээ БАТЛАХ дадлага хийхгүй өнгөрнө.
 *
 * ⚠ ШИНЭ ДАДЛАГА нь хичээлийн тодорхойлолтыг ЯГ давтана: цагаан нэг
 * нүүдлээр хар талын БҮХ дүрсийг идэж дуусгана.
 *
 * ⚠ БООЖ ХААХ нь хожил БИШ. Энэ сайтын дүрмээр нүүдэлгүй болсон нь
 * ТЭНЦЭЭ (`engine.ts`-ийн `winner()`), тиймээс тийм байрлалыг «хож» гэж
 * заавал сурагч дүрмийг БУРУУ сурна.
 *
 * ⚠ ДАСГАЛЫН ID ХЭВЭЭР: сурагчийн ахиц хичээлийн ID-аар холбогддог тул
 * устгаж дахин үүсгэхгүй, БАЙГАА мөрүүдийг шинэчилнэ.
 *
 * Ажиллуулах:  npx tsx --env-file=.env.local scripts/fix-win-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { WIN_PROMPT, WIN_PROMPT_EN, winProblem } from "./repair-draughts-moves";

const WIN_EXPLAIN =
  "Хожихын тулд өрсөлдөгчийн БҮХ дүрсийг идэх ёстой. Нүүдэлгүй болгосон нь тэнцээ — хожил биш.";
const WIN_EXPLAIN_EN =
  "To win you must capture ALL of your opponent's pieces. Leaving them with no move is a draw, not a win.";

/** Дүрсийн бүрэлдэхүүн — хялбараас хүнд рүү. */
/*
 * ⚠ ХАР ДҮРС ЦӨӨН: нэг нүүдлээр БҮГДИЙГ нь идэх ёстой.
 *
 * ⚠ ДАСГАЛ БҮР ӨӨР ХҮНДРЭЛТЭЙ: эхнийх нь сүүлчийн НЭГ дүрсийг идэж
 * дуусгана, сүүлчийнх нь ХОЁР-ГУРВЫГ цувааг нь хийж дуусгана. Дөрвүүлээ
 * ижил бол хичээл дотор ахих шат үүсэхгүй.
 */
const SHAPES_BY_INDEX: { whites: number; blacks: number; whiteKings?: number }[][] = [
  [{ whites: 2, blacks: 1 }, { whites: 3, blacks: 1 }],
  [{ whites: 2, blacks: 2 }, { whites: 3, blacks: 2 }],
  [{ whites: 2, blacks: 2, whiteKings: 1 }, { whites: 1, blacks: 2, whiteKings: 1 }],
  [{ whites: 3, blacks: 3 }, { whites: 2, blacks: 3, whiteKings: 1 }, { whites: 2, blacks: 2 }],
];

function generateWin(
  seed: number,
  index: number
): { fen: string; from: string; to: string; captured: number } | null {
  const rng = makeRng(seed);
  const shapes = SHAPES_BY_INDEX[index] ?? SHAPES_BY_INDEX[0];

  for (let attempt = 0; attempt < 400000; attempt += 1) {
    for (const shape of shapes) {
      const board = randomBoard(rng, shape);
      if (!board) continue;

      const game = new Draughts({ board, turn: "w" });
      const moves = game.legalMoves();
      // ⚠ Ганц хууль ёсны нүүдэл — курсийн бүх дасгалын үндсэн зарчим.
      if (moves.length !== 1) continue;

      const position = { board, turn: "w" as const };
      if (winProblem(position, moves[0])) continue;

      return {
        fen: serializePosition(board, "w"),
        from: String(squareNumber(moves[0].from.row, moves[0].from.col)),
        to: String(squareNumber(moves[0].to.row, moves[0].to.col)),
        captured: moves[0].captures.length,
      };
    }
  }
  return null;
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<{ id: string; prompt: string; fen: string | null }>(`
      select e.id, e.prompt, e.fen
        from exercises e
        join lessons l on l.id = e.lesson_id
        join units u on u.id = l.unit_id
       where u.course_slug = 'checkers'
         and l.title = 'Хожил'
         and e.type = 'draughts-move'
       order by e.sort_order`)
  ).rows;

  console.log(`«Хожил» хичээлийн хөлөгт дасгал: ${rows.length}`);

  let changed = 0;
  let failed = 0;

  for (const [index, row] of rows.entries()) {
    const task = generateWin(seedFromString(row.id), index);
    if (!task) {
      console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
      failed++;
      continue;
    }

    console.log(`  ${row.id}`);
    console.log(`    хуучин: ${row.prompt}  |  ${row.fen}`);
    console.log(
      `    шинэ:   ${WIN_PROMPT}  |  ${task.fen}  ${task.from}-${task.to}  (${task.captured} идэлт)`
    );
    changed++;

    if (apply) {
      await client.query(
        `update exercises
            set prompt=$2, prompt_en=$3, explanation=$4, explanation_en=$5,
                fen=$6, correct_from=$7, correct_to=$8
          where id=$1`,
        [row.id, WIN_PROMPT, WIN_PROMPT_EN, WIN_EXPLAIN, WIN_EXPLAIN_EN, task.fen, task.from, task.to]
      );
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
