/**
 * «ТӨВИЙН ХЯНАЛТ» ХИЧЭЭЛИЙГ НЭРТЭЙГЭЭ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: хичээлийн 4 хөлөгт дасгал нь «Цагаанаар тоглож
 * байна. Идэх боломжоо ол.» — Level 1-ийн «идэлт албадмал» дасгалтай ЯГ
 * ИЖИЛ. Тайлбар нь ч «Даамд идэх боломж гарвал ЗААВАЛ идэх ёстой» гэсэн
 * ерөнхий дүрэм. ТӨВ гэдэг үг хөлөг дээр огт гарч ирдэггүй.
 *
 * ⚠ ТОДОРХОЙЛОЛТЫГ ХИЧЭЭЛ ӨӨРӨӨ ӨГЧ БАЙНА (өөрийнх нь асуултаас):
 *   • «Захын хүү хоёр чигт, төвийн хүү дөрвөн чигт ажиллана.»
 *   • «Зах руу түрэгдсэн хүү — идэлтэд оролцох боломж, нүүдлийн эрх бага.»
 * → Дадлага нь ТЭР СОНГОЛТЫГ хийлгэх ёстой: төв рүү нүүх үү, зах руу
 *   гарах уу. Тиймээс энд ЗАХЫН нүүдэл бүр дүрс алдаж, ТӨВИЙН ганц
 *   нүүдэл л аврагдана.
 *
 * ⚠ БОЛЗОЛУУД (бүгд кодоор шалгагдана):
 *   1. тайван байрлал — цагаанд идэх боломж БАЙХГҮЙ (идэлт албадмал тул
 *      байвал сонгох эрх алга, байрлалын шийдвэр гарахгүй),
 *   2. гурав ба түүнээс дээш нүүдэлтэй — сонгох зүйлтэй,
 *   3. АЮУЛГҮЙ нүүдэл ЯГ НЭГ (гүн 3-ын тооцоогоор), бусад нь БҮГД дүрс
 *      алдана — `defenceProblem`-ийн шалгуурыг шууд ашиглав,
 *   4. тэр ганц нүүдэл нь ТӨВД буух ёстой: 2–7-р багана (захын хоёр
 *      багана биш) бөгөөд дөрвөн ташуу хөрш нь хөлөг дээр байна,
 *   5. ЗАХЫН багана (0 эсвэл 9) руу гарах нүүдэл ДООД ТАЛДАА НЭГ байх —
 *      сурагч «зах руу гарвал юу болохыг» бодитоор харна,
 *   6. эхлэлд хар тал даам гарах босгон дээр байхгүй (курсийн нийтлэг).
 *
 * ⚠ «ХАМГААЛАЛТ» ХИЧЭЭЛЭЭС ЯЛГААТАЙ: тэнд «аюулгүйг нь ол» гэдэг нь
 * тооцооны дасгал бөгөөд хариу нь хаана ч байж болно. Энд аюулгүй
 * нүүдэл нь ЗААВАЛ төв рүү чиглэх бөгөөд зах руу гарах нүүдэл нь
 * бодитоор шийтгэгдэнэ — хичээлийн санаа хөлөг дээр харагдана.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-centre-lesson.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import {
  CENTRE_PROMPT,
  CENTRE_PROMPT_EN,
  centreProblem,
  isEdgeCol,
} from "./repair-draughts-moves";

const EXPLAIN =
  "Төвийн хүү ДӨРВӨН ташуу чигт ажиллана, захын хүү ердөө ХОЁРТ. Тиймээс зах руу түрэгдсэн дүрс идэлтэд оролцож ч, өөрийгөө хамгаалж ч чадахгүй. Энд зах руу гарах нүүдэл бүр дүрс алдаж байгааг тоолж хар — төв нь хамгаалалт мөн.";
const EXPLAIN_EN =
  "A man in the centre works on four diagonals, a man on the edge on only two. Pushed to the edge it can neither join a capture nor defend itself. Count the lines here: every move to the edge drops a piece, so the centre is also defence.";

const SHAPES = [
  { whites: 4, blacks: 4 },
  { whites: 4, blacks: 5 },
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
];

type Task = { fen: string; from: string; to: string; edges: number };

function generateCentre(seed: number, usedAnswers: Set<string>): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 2500000; attempt += 1) {
    const board = randomBoard(rng, SHAPES[attempt % SHAPES.length]);
    if (!board) continue;

    // 6) Эхлэлд хар даам гарах босгон дээр байхгүй.
    if (board.some((row, index) => index >= 7 && row.some((c) => c?.color === "b" && !c.king))) {
      continue;
    }

    const position = { board, turn: "w" as const };
    const game = new Draughts(position);
    const moves = game.legalMoves();

    // 1) Тайван байрлал, 2) сонгох зүйлтэй.
    if (moves.length < 3) continue;
    if (moves.some((m) => m.captures.length > 0)) continue;

    /*
     * ⚠ Аюулгүй нүүдлийг ӨӨРӨӨ хайхгүй — `centreProblem` бүх болзлыг
     * шалгадаг тул нүүдэл бүрээр нь дамжуулаад цорын ганцыг нь авна.
     */
    const fits = moves.filter((m) => !centreProblem(position, m));
    if (fits.length !== 1) continue;

    const [answer] = fits;
    const from = String(squareNumber(answer.from.row, answer.from.col));
    const to = String(squareNumber(answer.to.row, answer.to.col));

    const fen = serializePosition(board, "w");
    const key = `${fen} ${from}-${to}`;
    if (usedAnswers.has(key)) continue;

    return {
      fen,
      from,
      to,
      edges: moves.filter((m) => isEdgeCol(m.to.col)).length,
    };
  }

  return null;
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<{ id: string; type: string }>(
      `select e.id, e.type
         from exercises e
         join lessons l on l.id = e.lesson_id
         join units u on u.id = l.unit_id
        where u.course_slug = 'checkers' and l.title = 'Төвийн хяналт'
        order by e.sort_order`
    )
  ).rows;

  // ⚠ Онолын асуултыг хөндөхгүй — тодорхойлолт тэндээс гардаг.
  const boards = rows.filter((row) => row.type !== "choice");
  console.log(`«Төвийн хяналт»: ${rows.length} дасгал (хөлөгт ${boards.length})`);

  let changed = 0;
  let failed = 0;
  const usedAnswers = new Set<string>();

  for (const row of boards) {
    const task = generateCentre(seedFromString(row.id), usedAnswers);

    if (!task) {
      console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
      failed++;
      continue;
    }

    usedAnswers.add(`${task.fen} ${task.from}-${task.to}`);
    console.log(`  ${task.fen}  ${task.from}-${task.to}  (зах руу ${task.edges} нүүдэл)`);
    changed++;

    if (apply) {
      /*
       * ⚠ ТӨРӨЛ `draughts-move` хэвээр: хариулт нь НЭГ нүүдэл тул
       * `correct_from`/`correct_to` ашиглана, `solution` хоосон.
       */
      await client.query(
        `update exercises
            set type='draughts-move', prompt=$2, prompt_en=$3,
                explanation=$4, explanation_en=$5,
                fen=$6, correct_from=$7, correct_to=$8, solution=null
          where id=$1`,
        [row.id, CENTRE_PROMPT, CENTRE_PROMPT_EN, EXPLAIN, EXPLAIN_EN, task.fen, task.from, task.to]
      );
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
