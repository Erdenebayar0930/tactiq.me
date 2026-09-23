/**
 * ХАМГААЛАЛТЫН ХИЧЭЭЛҮҮДИЙГ СЭДЭВТЭЙ НЬ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: «Хамгаалалт» (Level 2), «Хамгаалалт» (Level 6–8),
 * «Хамгаалалтын дадлага» гурвуулаа ерөнхий «Идэх боломжоо ол» дасгалтай
 * байв. Тэр нь ДОВТОЛГООНЫ дасгал — хамгаалалттай огт холбоогүй.
 * Хичээлийн өөрийнх нь онол «өрсөлдөгчийн боломжит цуваа бүрийг нүүдэл
 * хийхээсээ өмнө тоол» гэж хэлдэг атал сурагч тэр ажлыг нэг ч удаа
 * хийхгүй өнгөрнө.
 *
 * ⚠ ШИНЭ ДАСГАЛ яг тэр ажлыг хийлгэнэ: тайван байрлалд цагаан нүүх
 * ээлжтэй, нүүдэл бүрийн дараа хар талын цохилтыг тоолоход ЗӨВХӨН НЭГ
 * нүүдэл дүрс алдахгүй. Шалгуур нь `repair-draughts-moves.ts`-ийн
 * `defenceProblem` — аудит ч ижил функцийг дууддаг тул хоёр тодорхойлолт
 * үүсэхгүй.
 *
 * ⚠ ДАСГАЛЫН ID ХЭВЭЭР: сурагчийн ахиц ID-аар холбогддог тул устгаж
 * дахин үүсгэхгүй, байгаа мөрүүдийг шинэчилнэ.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-defence-lessons.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareFromNumber, squareNumber } from "../src/lib/draughts/notation";
import { DEFENCE_PROMPT, DEFENCE_PROMPT_EN, defenceProblem } from "./repair-draughts-moves";

const DEFENCE_EXPLAIN =
  "Нүүхийн ӨМНӨ өрсөлдөгчийн идэлт бүрийг тоол. Энд ганцхан нүүдэл цохилтод өртөхгүй.";
const DEFENCE_EXPLAIN_EN =
  "Count every capture your opponent has BEFORE you move. Only one move here stays safe.";

/**
 * Хичээл бүрийн дүрсийн тоо — түвшнийхээ дагуу.
 *
 * ⚠ Level 2 дээр цөөн дүрстэй: тэнд сурагч дөнгөж тооцож сурч байгаа.
 * Level 6–8 дээр олон дүрстэй — цуваа нь урт, тоолох ажил нь хүнд.
 */
const SHAPES: Record<string, { whites: number; blacks: number }[]> = {
  "Хамгаалалт-L2": [
    { whites: 3, blacks: 3 },
    { whites: 3, blacks: 4 },
    { whites: 4, blacks: 4 },
  ],
  "Хамгаалалт-L6": [
    { whites: 4, blacks: 5 },
    { whites: 5, blacks: 5 },
    { whites: 5, blacks: 6 },
  ],
  "Хамгаалалтын дадлага": [
    { whites: 4, blacks: 4 },
    { whites: 4, blacks: 5 },
    { whites: 5, blacks: 5 },
    { whites: 5, blacks: 6 },
  ],
};

/**
 * @param allowTopRows Хариулт нь ДЭЭД хоёр эгнээнд (дамкын бүс) буухыг
 *   зөвшөөрөх эсэх.
 *
 * ⚠ ЯАГААД ХЯЗГААРЛАВ: санамсаргүй байрлалд хамгийн аюулгүй нүүдэл нь
 * ихэвчлэн «гүн явсан дүрсээ дамка руу түлхэх» болдог тул 21 дасгалын
 * 15 нь ижил хэв маягтай гарсан. Хүүхэд байрлалыг тоолохын оронд
 * «үргэлж дээш» гэж цээжилнэ.
 */
function generateDefence(
  seed: number,
  shapes: { whites: number; blacks: number }[],
  allowTopRows: boolean
): { fen: string; from: string; to: string; moves: number } | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 200000; attempt += 1) {
    for (const shape of shapes) {
      const board = randomBoard(rng, shape);
      if (!board) continue;

      const position = { board, turn: "w" as const };
      const moves = new Draughts(position).legalMoves();
      if (moves.length < 3) continue;

      /*
       * ⚠ Аюулгүй нүүдлийг ӨӨРСДӨӨ хайхгүй: `defenceProblem`-д нүүдэл
       * бүрийг өгч үзнэ. Тэр функц «энэ нь ГАНЦ аюулгүй нүүдэл мөн үү»
       * гэдгийг шалгадаг тул тохирох нь олдмогц бүх болзол хангагдсан.
       */
      const safe = moves.find((move) => !defenceProblem(position, move));
      if (!safe) continue;
      if (!allowTopRows && safe.to.row <= 1) continue;

      return {
        fen: serializePosition(board, "w"),
        from: String(squareNumber(safe.from.row, safe.from.col)),
        to: String(squareNumber(safe.to.row, safe.to.col)),
        moves: moves.length,
      };
    }
  }
  return null;
}

/** Хичээлийг нэр + бүлгийн нэрээр нь ялгана (нэр давхардсан). */
const LESSONS: { title: string; unitLike: string; shapeKey: string }[] = [
  { title: "Хамгаалалт", unitLike: "Level 2%", shapeKey: "Хамгаалалт-L2" },
  { title: "Хамгаалалт", unitLike: "Level 6%", shapeKey: "Хамгаалалт-L6" },
  { title: "Хамгаалалтын дадлага", unitLike: "%", shapeKey: "Хамгаалалтын дадлага" },
];

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  let changed = 0;
  let failed = 0;

  for (const lesson of LESSONS) {
    const rows = (
      await client.query<{ id: string; prompt: string; fen: string | null }>(
        `select e.id, e.prompt, e.fen
           from exercises e
           join lessons l on l.id = e.lesson_id
           join units u on u.id = l.unit_id
          where u.course_slug = 'checkers'
            and l.title = $1
            and u.title like $2
            and e.type = 'draughts-move'
          order by e.sort_order`,
        [lesson.title, lesson.unitLike]
      )
    ).rows;

    console.log(`\n${lesson.unitLike} / ${lesson.title}: ${rows.length} хөлөгт дасгал`);

    /** Нэг хичээлд дээд эгнээний хариулт ХАМГИЙН ИХ нэг удаа. */
    let topRowUsed = 0;

    for (const row of rows) {
      const task = generateDefence(
        seedFromString(row.id),
        SHAPES[lesson.shapeKey],
        topRowUsed < 1
      );

      if (!task) {
        console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
        failed++;
        continue;
      }

      if (squareFromNumber(Number(task.to)).row <= 1) topRowUsed++;

      console.log(`  ${task.fen}  ${task.from}-${task.to}  (${task.moves} нүүдлээс ганц нь аюулгүй)`);
      changed++;

      if (apply) {
        await client.query(
          `update exercises
              set prompt=$2, prompt_en=$3, explanation=$4, explanation_en=$5,
                  fen=$6, correct_from=$7, correct_to=$8
            where id=$1`,
          [
            row.id,
            DEFENCE_PROMPT,
            DEFENCE_PROMPT_EN,
            DEFENCE_EXPLAIN,
            DEFENCE_EXPLAIN_EN,
            task.fen,
            task.from,
            task.to,
          ]
        );
      }
    }
  }

  console.log(`\n${changed} дасгал${apply ? " → БИЧСЭН" : " (туршилт)"}, чадаагүй ${failed}`);
  await client.end();
  return failed;
}

main().then((failed) => process.exit(failed ? 1 : 0));
