/**
 * «ТЭНЦЭЭ» ХИЧЭЭЛД ДАСГАЛ НЭМНЭ.
 *
 * ⚠ ЮУ ДУТУУ БАЙСАН БЭ: хичээл нь ганц сонголтот асуулттай байв —
 * сурагч дүрмийг уншаад, хөлөг дээр нэг ч удаа хэрэглэхгүй өнгөрнө.
 * Хөрш «Хожил» хичээл 1 асуулт + 4 хөлөгт дасгалтай.
 *
 * ⚠ ХӨЛӨГТ ДАСГАЛЫН САНАА: сайтын дүрмээр нүүдэлгүй болох нь ТЭНЦЭЭ.
 * Тиймээс материалаар хоцорсон тал өрсөлдөгчөө нүүдэлгүй болгож
 * ТЭНЦЭЭ АВЧ чадна — энэ нь дүрмийн шууд, практик үр дагавар.
 *
 * ⚠ ЭНЭ ДАСГАЛД ХЭД ХЭДЭН НҮҮДЭЛ БАЙХ ЁСТОЙ, зөвхөн нэг нь тэнцээ
 * гаргана (`drawProblem`). Курсийн бусад дасгал «ганц хууль ёсны
 * нүүдэлтэй» байдаг ч энд тийм байвал сонгох зүйлгүй тул дасгал
 * утгагүй болно.
 *
 * ⚠ ДАХИН АЖИЛЛУУЛАХАД ДАВХАРДУУЛАХГҮЙ: аль хэдийн нэмэгдсэн дасгалыг
 * (даалгаврын текстээр нь таних) ШИНЭЧЛЭНЭ, шинээр оруулахгүй.
 *
 * Ажиллуулах:  npx tsx --env-file=.env.local scripts/add-draw-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { DRAW_PROMPT, DRAW_PROMPT_EN, drawProblem } from "./repair-draughts-moves";

const DRAW_EXPLAIN =
  "Өрсөлдөгч нүүх боломжгүй болбол ТЭНЦЭЭ. Хожигдох гэж байхад энэ нь аврал болно.";
const DRAW_EXPLAIN_EN =
  "If your opponent has no legal move it is a DRAW. When you are losing, that can save you.";

/** Нэмэх сонголтот асуултууд — дүрмийн хоёр нарийн зүйл. */
const QUIZ = [
  {
    prompt: "Өрсөлдөгч дүрстэй хэвээр атлаа нүүх боломжгүй боллоо. Үр дүн нь юу вэ?",
    promptEn: "Your opponent still has pieces but no legal move. What is the result?",
    options: [
      ["a", "Тэнцээ", "A draw"],
      ["b", "Та хожсон", "You win"],
      ["c", "Тэр хожсон", "They win"],
    ],
    correct: "a",
    explanation:
      "Хожихын тулд өрсөлдөгчийн БҮХ дүрсийг идэх ёстой. Нүүдэлгүй болгосон нь тэнцээ.",
    explanationEn:
      "To win you must capture ALL of the opponent pieces. Leaving them without a move is a draw.",
  },
  {
    prompt: "Зөвхөн даамууд хөдөлж, хэн ч идэхгүй удвал юу болох вэ?",
    promptEn: "Only kings keep moving and nobody captures. What happens?",
    options: [
      ["a", "25 нүүдлийн дараа тэнцээ болно", "After 25 moves it is a draw"],
      ["b", "Тоглолт үүрд үргэлжилнэ", "The game goes on forever"],
      ["c", "Илүү дүрстэй нь хожно", "Whoever has more pieces wins"],
    ],
    correct: "a",
    explanation:
      "Идэлт ч хийгдэхгүй, хүү ч хөдлөхгүй 25 нүүдэл өнгөрвөл тэнцээ — эс бөгөөс тоглолт эцэсгүй давтагдана.",
    explanationEn:
      "If 25 moves pass with no capture and no man moving, it is a draw — otherwise the game could repeat forever.",
  },
];

/**
 * Дүрсийн бүрэлдэхүүн — цагаан ХОЦОРСОН байна.
 *
 * ⚠ Цагаан илүү материалтай байрлалд «тэнцээ гарга» гэж заавал буруу
 * зөвлөгөө болно: тэр хожих ёстой. Тиймээс хар тал ямагт илүү.
 *
 * ⚠ ӨРГӨН ЖАГСААЛТ санаатай: нарийхан жагсаалттай үед үүсгэгч дөрвүүлэнд
 * нь ЯГ ИЖИЛ сэдэлтэй (булан руу орох) байрлал гаргаж байв. Хүүхэд
 * байрлалыг бодохын оронд «үргэлж булан руу» гэж цээжилнэ.
 */
const SHAPES = [
  { whites: 0, blacks: 2, whiteKings: 1 },
  { whites: 1, blacks: 2, whiteKings: 1 },
  { whites: 0, blacks: 3, whiteKings: 1 },
  { whites: 1, blacks: 3, whiteKings: 1 },
  { whites: 0, blacks: 3, whiteKings: 2 },
  { whites: 2, blacks: 3, whiteKings: 1 },
  { whites: 0, blacks: 2, whiteKings: 2 },
  { whites: 2, blacks: 3 },
  { whites: 2, blacks: 4 },
  { whites: 1, blacks: 4, whiteKings: 1 },
];

/**
 * @param usedTargets Өмнөх дасгалуудын төгсгөлийн нүд — ДАВХАРДУУЛАХГҮЙ.
 */
function generateDraw(
  seed: number,
  usedTargets: Set<string>
): { fen: string; from: string; to: string } | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 500000; attempt += 1) {
    for (const shape of SHAPES) {
      const board = randomBoard(rng, shape);
      if (!board) continue;

      const position = { board, turn: "w" as const };
      const moves = new Draughts(position).legalMoves();
      // Сонголт байх ёстой — эс бөгөөс бодох зүйлгүй.
      if (moves.length < 2) continue;

      const drawing = moves.filter((move) => !drawProblem(position, move));
      if (drawing.length !== 1) continue;

      const white = board.flat().filter((cell) => cell?.color === "w").length;
      const black = board.flat().filter((cell) => cell?.color === "b").length;
      if (black <= white) continue;

      const [move] = drawing;
      const to = String(squareNumber(move.to.row, move.to.col));
      if (usedTargets.has(to)) continue;

      return {
        fen: serializePosition(board, "w"),
        from: String(squareNumber(move.from.row, move.from.col)),
        to,
      };
    }
  }
  return null;
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const lesson = (
    await client.query<{ id: string; author: string | null }>(`
      select l.id,
             (select created_by from exercises e where e.lesson_id = l.id limit 1) author
        from lessons l join units u on u.id = l.unit_id
       where u.course_slug = 'checkers' and l.title = 'Тэнцээ'`)
  ).rows[0];

  if (!lesson) {
    console.error("«Тэнцээ» хичээл олдсонгүй.");
    return 1;
  }

  const existing = (
    await client.query<{ id: string; prompt: string; sort_order: number }>(
      "select id, prompt, sort_order from exercises where lesson_id = $1 order by sort_order",
      [lesson.id]
    )
  ).rows;

  console.log(`«Тэнцээ» хичээлд одоо ${existing.length} дасгал байна.`);

  let order = existing.length;
  let added = 0;
  let updated = 0;
  let failed = 0;

  /* --- Сонголтот асуултууд --- */
  for (const quiz of QUIZ) {
    const found = existing.find((row) => row.prompt === quiz.prompt);
    const options = quiz.options.map(([id, label]) => ({ id, label }));
    const optionsEn = quiz.options.map(([id, , label]) => ({ id, label }));

    if (found) {
      updated++;
      if (apply) {
        await client.query(
          `update exercises
              set options=$2::jsonb, options_en=$3::jsonb, correct_option_id=$4,
                  explanation=$5, explanation_en=$6, prompt_en=$7
            where id=$1`,
          [
            found.id,
            JSON.stringify(options),
            JSON.stringify(optionsEn),
            quiz.correct,
            quiz.explanation,
            quiz.explanationEn,
            quiz.promptEn,
          ]
        );
      }
      continue;
    }

    console.log(`  + асуулт: ${quiz.prompt}`);
    added++;
    if (apply) {
      await client.query(
        `insert into exercises
           (lesson_id, type, sort_order, prompt, prompt_en, options, options_en,
            correct_option_id, explanation, explanation_en, created_by)
         values ($1,'choice',$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9,$10)`,
        [
          lesson.id,
          order++,
          quiz.prompt,
          quiz.promptEn,
          JSON.stringify(options),
          JSON.stringify(optionsEn),
          quiz.correct,
          quiz.explanation,
          quiz.explanationEn,
          lesson.author,
        ]
      );
    }
  }

  /* --- Хөлөгт дасгалууд --- */
  const boards = existing.filter((row) => row.prompt === DRAW_PROMPT);
  const WANTED = 4;
  /** Шийдлийн төгсгөлийн нүднүүд — дасгал бүр ӨӨР байхын тулд. */
  const usedTargets = new Set<string>();

  for (let index = 0; index < WANTED; index += 1) {
    const row = boards[index];
    // ⚠ Үр нь ТОГТМОЛ: дахин ажиллуулахад ижил байрлал гарна.
    const task = generateDraw(seedFromString(row ? row.id : `тэнцээ-${index}`), usedTargets);

    if (!task) {
      console.log(`  ✗ ${index + 1}-р байрлал үүсгэж чадсангүй`);
      failed++;
      continue;
    }

    usedTargets.add(task.to);
    console.log(`  ${row ? "~" : "+"} хөлөг: ${task.fen}  ${task.from}-${task.to}`);
    if (row) updated++;
    else added++;

    if (apply) {
      if (row) {
        await client.query(
          `update exercises
              set fen=$2, correct_from=$3, correct_to=$4, explanation=$5, explanation_en=$6
            where id=$1`,
          [row.id, task.fen, task.from, task.to, DRAW_EXPLAIN, DRAW_EXPLAIN_EN]
        );
      } else {
        await client.query(
          `insert into exercises
             (lesson_id, type, sort_order, prompt, prompt_en, explanation, explanation_en,
              fen, correct_from, correct_to, created_by)
           values ($1,'draughts-move',$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            lesson.id,
            order++,
            DRAW_PROMPT,
            DRAW_PROMPT_EN,
            DRAW_EXPLAIN,
            DRAW_EXPLAIN_EN,
            task.fen,
            task.from,
            task.to,
            lesson.author,
          ]
        );
      }
    }
  }

  console.log(
    `\nнэмэх ${added}, шинэчлэх ${updated}, чадаагүй ${failed}${apply ? " → БИЧСЭН" : " (туршилт)"}`
  );
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
