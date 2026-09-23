/**
 * LEVEL 6–8 «БАЙРЛАЛЫН СЭТГЭЛГЭЭ» — дасгалыг хичээлийн нэртэй нь тааруулна.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: «Сул тал», «Сул талыг ашиглах», «Довтолгоо»,
 * «Довтолгооны дадлага» дөрвүүлээ ерөнхий «Тулгуураа өгөөд цохи» байв —
 * Level 2–4-ийн тулгуурын хичээлүүдтэй ЯГ ИЖИЛ. Байрлалын сэтгэлгээ
 * гэдэг нь хөлөг дээр огт гарч ирдэггүй.
 *
 * ⚠ ТОДОРХОЙЛОЛТЫГ КУРС ӨӨРӨӨ ӨГЧ БАЙНА (хичээлийн асуултаас):
 *
 *   • СУЛ ТАЛ — «Хамгаалалтгүй хүү, хоосон нүд, албадмал нүүдлийг хай.
 *     Сул тал бол тактикийн ХАЯГ: цохилт ямагт хамгаалалтгүй зүйл дээр
 *     тогтдог.» → цохилт нь ТУСГААРЛАГДСАН (ташуу хөрш харгүй) хар
 *     дүрсийг иднэ. Тэр дүрс нь байрлалын сул тал юм.
 *
 *   • ДОВТОЛГОО — «Хүч илүү цуглуулсны дараа, тодорхой сул тал руу.»
 *     → цохилт нь ХАРЫН ТАЛД (0–4-р мөр) төгсөнө: цагаан урагшилж,
 *     өрсөлдөгчийн талбайд орж ирнэ.
 *
 * ⚠ «Хамгаалалт задлах»-ААС ЯЛГААТАЙ: тэнд хамгаалагчийг эхлээд ТАТАЖ
 * хөдөлгөх шаардлагатай байдаг бол энд бай нь АНХНААСАА хамгаалалтгүй.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-positional-lessons.ts [--apply]
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { netDraughtsMaterial } from "../src/lib/draughts/bot";
import { makeRng, randomBoard, seedFromString } from "../src/lib/draughts/generate";
import { serializePosition, squareNumber } from "../src/lib/draughts/notation";
import { puzzleProblem } from "./curriculum/draughtsGenerators";

import type { Board, DraughtsMove, Square } from "../src/lib/draughts/engine";

export const WEAK_PROMPT = "Цагаанаар тоглож байна. Сул талыг нь ол — хамгаалалтгүй хүүг ид.";
export const ATTACK_PROMPT = "Цагаанаар тоглож байна. Довтолж, өрсөлдөгчийн талд ор.";

type LessonText = { prompt: string; promptEn: string; explain: string; explainEn: string };

const WEAK_TEXT: LessonText = {
  prompt: WEAK_PROMPT,
  promptEn: "White to play. Find the weak square — take the undefended man.",
  explain:
    "Сул тал бол тактикийн ХАЯГ. Хамгаалалтгүй үлдсэн хүүг ол — түүний ташуу хөршид нөхөр нь байхгүй тул идэгдэхэд буцааж идэх хүн алга. Цохилт ямагт тийм зүйл дээр тогтоно.",
  explainEn:
    "A weak square is the address of every tactic. Find the man left undefended — no friend stands on its diagonal, so nothing recaptures when it falls.",
};

const ATTACK_TEXT: LessonText = {
  prompt: ATTACK_PROMPT,
  promptEn: "White to play. Attack — finish inside the opponent's half.",
  explain:
    "Довтолгоо гэдэг нь хүчээ цуглуулаад ӨРСӨЛДӨГЧИЙН ТАЛБАЙ руу орох явдал. Энд цохилт чинь харын хагаст төгсөж, чиний дүрс тэдний ар тал руу нэвтэрнэ.",
  explainEn:
    "An attack means gathering force and entering the opponent's half. Here your strike finishes on their side of the board, breaking into their territory.",
};

const LESSONS: { title: string; kind: "weak" | "attack"; text: LessonText }[] = [
  { title: "Сул тал", kind: "weak", text: WEAK_TEXT },
  { title: "Сул талыг ашиглах", kind: "weak", text: WEAK_TEXT },
  { title: "Довтолгоо", kind: "attack", text: ATTACK_TEXT },
  { title: "Довтолгооны дадлага", kind: "attack", text: ATTACK_TEXT },
];

const SHAPES = [
  { whites: 4, blacks: 5 },
  { whites: 5, blacks: 5 },
  { whites: 5, blacks: 6 },
  { whites: 6, blacks: 6 },
];

const token = (m: DraughtsMove) =>
  `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}`;

/** Ташуу хөршид нь НЭГ Ч хар дүрс байхгүй — тусгаарлагдсан, сул. */
function isolated(board: Board, square: Square): boolean {
  for (const [dr, dc] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    const row = square.row + dr;
    const col = square.col + dc;
    if (row < 0 || row > 9 || col < 0 || col > 9) continue;
    if (board[row][col]?.color === "b") return false;
  }
  return true;
}

type Task = { fen: string; solution: string; note: string };

function generate(
  seed: number,
  kind: "weak" | "attack",
  usedSolutions: Set<string>
): Task | null {
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 2500000; attempt += 1) {
    const board = randomBoard(rng, SHAPES[attempt % SHAPES.length]);
    if (!board) continue;

    // Хар тал даам гарах босгон дээр байхгүй (эзний дүрэм).
    if (board.some((row, index) => index >= 7 && row.some((c) => c?.color === "b" && !c.king))) {
      continue;
    }

    const probe = new Draughts({ board, turn: "w" });
    const opening = probe.legalMoves();
    if (opening.length === 0 || opening[0].captures.length > 0) continue;

    let found: Task | null = null;

    for (const sacrifice of opening) {
      const game = new Draughts({ board, turn: "w" });
      game.applyMove(sacrifice);

      const replies = game.legalMoves();
      if (replies.length !== 1 || replies[0].captures.length === 0) continue;
      const [reply] = replies;

      game.applyMove(reply);

      const finals = game.legalMoves();
      if (finals.length !== 1) continue;
      const strike = finals[0];
      if (strike.captures.length <= reply.captures.length) continue;

      let note = "";

      if (kind === "weak") {
        /*
         * ⚠ БАЙ НЬ АНХНААСАА ХАМГААЛАЛТГҮЙ. Эхлэлийн хөлөг дээр шалгана —
         * комбинацийн дараах байдал биш. «Хамгаалалт задлах» хичээл нь
         * хамгаалагчийг ТАТАЖ хөдөлгөдөг; энд бай нь аль хэдийн сул.
         */
        const weakTargets = strike.captures.filter((sq) => isolated(board, sq));
        if (weakTargets.length === 0) continue;
        note = `сул дүрс ${weakTargets.map((sq) => squareNumber(sq.row, sq.col)).join(",")}`;
      } else {
        // ⚠ ЦОХИЛТ ХАРЫН ХАГАСТ (0–4-р мөр) ТӨГСӨНӨ — довтолгооны шинж.
        if (strike.to.row > 4) continue;
        note = `${squareNumber(strike.to.row, strike.to.col)}-д төгсөв`;
      }

      const ending = new Draughts({ board, turn: "w" });
      ending.applyMove(sacrifice);
      ending.applyMove(reply);
      ending.applyMove(strike);

      if (
        ending.board().some((row, index) =>
          index >= 8 && row.some((c) => c?.color === "b" && !c.king)
        )
      ) {
        continue;
      }
      if (netDraughtsMaterial(ending, "w") < 1) continue;

      const candidate: Task = {
        fen: serializePosition(board, "w"),
        solution: [sacrifice, reply, strike].map(token).join(" "),
        note,
      };

      if (puzzleProblem(candidate.fen, candidate.solution)) continue;

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

  for (const lesson of LESSONS) {
    const rows = (
      await client.query<{ id: string; type: string }>(
        `select e.id, e.type
           from exercises e
           join lessons l on l.id = e.lesson_id
           join units u on u.id = l.unit_id
          where u.course_slug = 'checkers' and l.title = $1 and u.title like 'Level 6%'
          order by e.sort_order`,
        [lesson.title]
      )
    ).rows;

    const boards = rows.filter((row) => row.type !== "choice");
    console.log(`\n${lesson.title}: ${rows.length} дасгал (хөлөгт ${boards.length})`);

    for (const row of boards) {
      const task = generate(seedFromString(row.id), lesson.kind, usedSolutions);

      if (!task) {
        console.log(`  ✗ ${row.id} — байрлал үүсгэж чадсангүй`);
        failed++;
        continue;
      }

      usedSolutions.add(task.solution);
      console.log(`  ${task.fen}  ${task.solution}  (${task.note})`);
      changed++;

      if (apply) {
        await client.query(
          `update exercises
              set type='draughts-puzzle', prompt=$2, prompt_en=$3,
                  explanation=$4, explanation_en=$5,
                  fen=$6, solution=$7, correct_from=null, correct_to=null
            where id=$1`,
          [
            row.id,
            lesson.text.prompt,
            lesson.text.promptEn,
            lesson.text.explain,
            lesson.text.explainEn,
            task.fen,
            task.solution,
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
