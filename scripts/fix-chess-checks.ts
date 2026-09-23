/**
 * ШАГИЙН ДАСГАЛУУДЫГ ХОЁР ТАЛААР ЗАСНА.
 *
 * ⚠ 1) ШАГ ӨГӨӨД ДҮРСЭЭ ҮНЭГҮЙ ИДҮҮЛЖ БАЙВ. Жишээ:
 * `8/k7/n7/8/8/8/2R5/1K6` — `c2c7+` гэсэн цорын ганц шаг, гэвч a6-ийн
 * морь тэргийг дараагийн нүүдлээр ҮНЭГҮЙ иднэ. Шатрын хувьд энэ бол
 * АЛДАА нүүдэл: хүүхэд «шаг бол сайн» гэж сурч, бодит тоглолтод дүрсээ
 * тараана. `giveCheckTask` нь шагийн АЮУЛГҮЙ байдлыг огт шалгадаггүй,
 * шалгуур (`goalHolds` → `check`) ч зөвхөн «шаг болсон уу» гэдгийг л
 * хардаг байв.
 *
 * ⚠ 2) ТЭМЭЭНИЙ ШАГИЙГ «ДУГ» ГЭНЭ. Монгол нэр томьёогоор тэмээгээр
 * ноёныг шалахыг «шаг» гэхгүй, «ДУГ» гэж нэрлэдэг (эзний заавар).
 * Даалгавар, тайлбар бүхэлдээ «шаг» гэж байсан.
 *
 * ⚠ ДАХИН ГАРАХГҮЙ БОЛГОСОН НЬ ЭНЭ СКРИПТ БИШ:
 *   • `chessShared.ts` → `movePresentsPiece()` нь «дүрсээ дараагийн
 *     нүүдэлд үнэгүй алдаж байна уу» гэдгийг хэмжинэ. `check` ба
 *     `block` зорилгын шалгуур одоо үүнийг шаардана;
 *   • `chessGenerators.ts` → `checkWord()` нь шалж байгаа ДҮРСЭЭР нь
 *     «шаг»/«дуг»-ийг сонгоно, `checkedPosition()` нь шалагчийг
 *     буцаадаг болов.
 * Энэ скрипт нь ЗӨВХӨН санд аль хэдийн байгаа мөрүүдийг засна.
 *
 * ⚠ БАЙРЛАЛЫГ НЬ ДАХИН ҮҮСГЭНЭ, БИЧВЭРИЙГ НЬ ЗАСААД ЗОГСОХГҮЙ:
 * даалгаврын бичвэр байрлалаас гардаг тул (тэмээ юу тэрэг юу) хоёрыг
 * салгавал дахин зөрнө. Үр нь дасгалын `id`-аас — дахин ажиллуулахад
 * ижил байрлал гарна.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-chess-checks.ts [--apply]
 */
import { Chess } from "chess.js";
import { Client } from "pg";

import {
  anyOf,
  blockTask,
  captureCheckerTask,
  checkWord,
  giveCheckTask,
  kingEscapeTask,
} from "./curriculum/chessGenerators";
import {
  makeRng,
  movePresentsPiece,
  seedFromString,
  validateTask,
} from "./curriculum/chessShared";

import type { Move, PieceSymbol, Square } from "chess.js";
import type { Generator, Task } from "./curriculum/chessShared";

/**
 * ХИЧЭЭЛ → ҮҮСГЭГЧ. `chessLevels4to6.ts`-д байгаатай ЯГ ИЖИЛ.
 *
 * ⚠ ХОЛИМОГ хичээлүүд `anyOf`-оор нийлдэг — тэр хичээлийн дасгал
 * дөрвөн өөр хэлбэрийн аль нэг байж болно.
 */
const LESSONS: Record<string, Generator> = {
  "Шаг гэж юу вэ?": giveCheckTask(["r"]),
  "Шаг өгөх": anyOf(giveCheckTask(["b"]), giveCheckTask(["n"]), giveCheckTask(["r", "n"], 2)),
  "Бэрсээр шаг өгөх": giveCheckTask(["q"], 2),
  "Шагаас гарах гурван арга": anyOf(kingEscapeTask(), captureCheckerTask()),
  "Ноёноо зайлуул": kingEscapeTask(),
  "Шагийг хаа": blockTask(),
  "Шаг өгсөн дүрсийг ид": captureCheckerTask(),
  "Шаг — Challenge": anyOf(
    kingEscapeTask(),
    blockTask(),
    captureCheckerTask(),
    giveCheckTask(["q"], 2)
  ),
};

type Row = {
  id: string;
  fen: string;
  correct_from: string;
  correct_to: string;
  prompt: string;
  lesson: string;
};

const whiteKing = (chess: Chess): Square => {
  for (const row of chess.board())
    for (const cell of row) if (cell?.type === "k" && cell.color === "w") return cell.square;
  throw new Error("цагаан ноён алга");
};

/**
 * ЭНЭ ДАСГАЛ ДЭЭР ХЭН ШАЛЖ БАЙНА ВЭ.
 *
 * ⚠ ХОЁР ТӨРӨЛ: «шаг ӨГ» гэсэн даалгаварт шалагч нь САНАМСАРГҮЙ БИШ —
 * сурагчийн нүүлгэх дүрс. Бусад (ноёноо зайлуул, шагийг хаа, шаг өгсөн
 * дүрсийг ид) дээр шалагч нь цагаан ноёныг дайрч байгаа ХАР дүрс.
 */
function checkerOf(chess: Chess, move: Move, prompt: string): PieceSymbol | null {
  if (/өг\./.test(prompt)) return move.piece;
  const attackers = chess.attackers(whiteKing(chess), "b");
  if (attackers.length !== 1) return null;
  return chess.get(attackers[0])?.type ?? null;
}

function regenerate(seed: number, generator: Generator): Task | null {
  const rng = makeRng(seed);
  for (let attempt = 0; attempt < 400000; attempt += 1) {
    const task = generator(rng);
    if (!task || task.type !== "board-move") continue;
    if (validateTask(task)) continue;
    return task;
  }
  return null;
}

async function main(): Promise<number> {
  const apply = process.argv.includes("--apply");
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<Row>(
      `select e.id, e.fen, e.correct_from, e.correct_to, e.prompt, l.title as lesson
         from exercises e
         join lessons l on l.id = e.lesson_id
         join units u on u.id = l.unit_id
        where u.course_slug = 'chess' and e.type = 'board-move'
          and l.title = any($1) and e.fen is not null
        order by l.title, e.sort_order`,
      [Object.keys(LESSONS)]
    )
  ).rows;

  let healthy = 0;
  let changed = 0;
  const failed: string[] = [];
  const reasons = new Map<string, number>();

  for (const row of rows) {
    let chess: Chess;
    let move: Move | undefined;
    try {
      chess = new Chess(row.fen);
      move = (chess.moves({ square: row.correct_from as Square, verbose: true }) as Move[]).find(
        (m) => m.to === row.correct_to
      );
    } catch {
      failed.push(`${row.id} — FEN уншигдахгүй`);
      continue;
    }
    if (!move) {
      failed.push(`${row.id} — хадгалагдсан хариулт хууль бус`);
      continue;
    }

    const problems: string[] = [];

    // 1) Дүрсээ үнэгүй идүүлж байна уу.
    if (movePresentsPiece(chess, move)) problems.push("дүрсээ үнэгүй идүүлнэ");

    // 2) «шаг» / «дуг» нэр томьёо байрлалтайгаа таарч байна уу.
    const checker = checkerOf(chess, move, row.prompt);
    if (checker) {
      const word = checkWord(checker);
      if (!row.prompt.toLowerCase().includes(word)) problems.push(`«${word}» гэж нэрлэх ёстой`);
    }

    if (problems.length === 0) {
      healthy++;
      continue;
    }
    for (const reason of problems) reasons.set(reason, (reasons.get(reason) ?? 0) + 1);

    const task = regenerate(seedFromString(row.id), LESSONS[row.lesson]);
    if (!task || task.type !== "board-move") {
      failed.push(`${row.id} — байрлал үүсгэж чадсангүй («${row.lesson}»)`);
      continue;
    }

    console.log(
      `\n«${row.lesson}» — ${problems.join(", ")}\n` +
        `  хуучин: ${row.fen}  ${row.correct_from}${row.correct_to}\n` +
        `          ${row.prompt}\n` +
        `  шинэ:   ${task.fen}  ${task.from}${task.to}\n          ${task.prompt[0]}`
    );
    changed++;

    if (apply) {
      await client.query(
        `update exercises
            set fen=$2, correct_from=$3, correct_to=$4,
                prompt=$5, prompt_en=$6, explanation=$7, explanation_en=$8
          where id=$1`,
        [
          row.id,
          task.fen,
          task.from,
          task.to,
          task.prompt[0],
          task.prompt[1],
          task.explain[0],
          task.explain[1],
        ]
      );
    }
  }

  console.log(
    `\nнийт ${rows.length} — эрүүл ${healthy}, ${apply ? "зассан" : "засагдах"} ${changed}, чадаагүй ${failed.length}`
  );
  for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(3)}  ${reason}`);
  }
  for (const line of failed) console.log(`  ✗ ${line}`);

  await client.end();
  return failed.length;
}

main().then((failed) => process.exit(failed ? 1 : 0));
