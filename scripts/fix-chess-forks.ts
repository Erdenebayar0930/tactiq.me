/**
 * «СЭРЭЭ» БОДЛОГУУДЫН ШИЙДЛИЙГ ДААЛГАВАРТАЙ НЬ ТААРУУЛНА.
 *
 * ⚠ ЮУ БУРУУ БАЙСАН БЭ: «Бэрсээрээ СЭРЭЭ хий» гэсэн бодлогын шийдэл нь
 * `f7g7 h8f8 g7h7` байв — цагааны хоёр нүүдлийг ХОЁУЛАНГ НЬ НОЁН хийж,
 * бэрс огт хөдлөхгүй. Сурагч даалгаврынхаа эсрэг тоглож байж «зөв»
 * хариулт авна. Морь, хүүгээр сэрээ хийх бодлогууд ч ижил эрсдэлтэй.
 *
 * ⚠ ЯАГААД ГАРСАН БЭ: `buildWinLine` нь ХАМГИЙН ИХ материал хожих
 * шугамыг хайдаг бөгөөд түүнийг ХЭН хийхийг үл хайхардаг. Шалгуур
 * (`auditWinLine`) ч зөвхөн материалыг хэмждэг.
 *
 * ⚠ ДАХИН ГАРАХГҮЙ БОЛГОСОН НЬ ЭНЭ СКРИПТ БИШ:
 *   • `chessGenerators.ts` → `winTask(..., by)` ба `lineIsBy()` нь
 *     цагааны нүүдэл бүрийг амласан дүрс хийж байгааг шалгана;
 *   • `chessShared.ts` → `win` зорилгод `by` нэмэгдэж, `validateTask`
 *     үүнийг шаарддаг болов.
 * Энэ скрипт нь ЗӨВХӨН санд аль хэдийн байгаа мөрүүдийг засна.
 *
 * ⚠ ҮР НЬ ДАСГАЛЫН `id`-ААС: дахин ажиллуулахад ижил бодлого гарна.
 *
 * Ажиллуулах:
 *   npx tsx --env-file=.env.local scripts/fix-chess-forks.ts [--apply]
 */
import { Chess } from "chess.js";
import { Client } from "pg";

import {
  knightForkTask,
  pawnForkTask,
  pinTask,
  queenForkTask,
  skewerTask,
} from "./curriculum/chessGenerators";
import { makeRng, seedFromString, validateTask } from "./curriculum/chessShared";

import type { PieceSymbol } from "chess.js";
import type { Generator, Task } from "./curriculum/chessShared";

/**
 * ДААЛГАВАР → (амласан дүрс, үүсгэгч).
 *
 * ⚠ Бичвэрээр нь таньна, хичээлийн нэрээр биш: «Сэрээ — Challenge»
 * мэтийн холимог хичээлд гурвуулаа хамт байж болно.
 */
const PROMISES: { match: RegExp; piece?: PieceSymbol; chain?: boolean; generator: () => Generator }[] = [
  { match: /Бэрсээрээ СЭРЭЭ/, piece: "q", generator: queenForkTask },
  { match: /Хүүгээр СЭРЭЭ/, piece: "p", generator: pawnForkTask },
  /*
   * ⚠ Морины сэрээ нь ТЭРЭГ ба БЭРС гэсэн хоёр хувилбартай. Аль нь
   * болохыг бодлогын хар дүрснээс тогтооно: бэрс байвал `q`.
   */
  {
    match: /Мориор СЭРЭЭ/,
    piece: "n",
    generator: () => knightForkTask("r"),
  },
  /*
   * ⚠ ХҮЛЭЭС ба РЕНТГЕН дээр ДҮРСНИЙ ТӨРӨЛ тогтмол биш (тэмээ ч,
   * тэрэг ч болно) — харин ШИЙДЭЛ НЭГ ДҮРСНИЙ ЦУВАА байх ёстой:
   * тайван бэлтгэл → тэр дүрс өөрөө идэнэ.
   */
  { match: /ХҮЛЭЭС ашигла/, chain: true, generator: pinTask },
  { match: /РЕНТГЕН хий/, chain: true, generator: skewerTask },
];

type Row = { id: string; fen: string; solution: string; prompt: string; lesson: string };

/** Шийдэл даалгаврын амлалтыг биелүүлж байна уу. */
function lineProblem(row: Row, piece?: PieceSymbol, chain?: boolean): string | null {
  let chess: Chess;
  try {
    chess = new Chess(row.fen);
  } catch {
    return "FEN уншигдахгүй";
  }

  const plies = row.solution.trim().split(/\s+/);
  let origin: string | null = null;
  for (let index = 0; index < plies.length; index += 1) {
    const uci = plies[index];
    const move = chess
      .moves({ verbose: true })
      .find((m) => m.from === uci.slice(0, 2) && m.to === uci.slice(2, 4));
    if (!move) return `${index + 1}-р нүүдэл (${uci}) хууль бус`;

    if (index % 2 === 0) {
      if (piece && move.piece !== piece) {
        return `${index + 1}-р нүүдлийг «${move.piece}» хийж байна — «${piece}» байх ёстой`;
      }
      if (chain) {
        if (index === 0) {
          if (move.captured) return "эхний нүүдэл идэлт — хүлээс тавьсан биш";
          origin = move.to;
        } else {
          if (move.from !== origin) return `${index + 1}-р нүүдлийг ӨӨР дүрс хийж байна`;
          if (index === plies.length - 1 && !move.captured) return "цуваа идэлтээр төгсөхгүй";
          origin = move.to;
        }
      }
    }
    chess.move(move);
  }
  return null;
}

function regenerate(seed: number, generator: Generator): Task | null {
  const rng = makeRng(seed);
  for (let attempt = 0; attempt < 400000; attempt += 1) {
    const task = generator(rng);
    if (!task || task.type !== "chess-puzzle") continue;
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
      `select e.id, e.fen, e.solution, e.prompt, l.title as lesson
         from exercises e
         join lessons l on l.id = e.lesson_id
         join units u on u.id = l.unit_id
        where u.course_slug = 'chess' and e.type = 'chess-puzzle'
          and (e.prompt ilike '%СЭРЭЭ%' or e.prompt ilike '%ХҮЛЭЭС%'
               or e.prompt ilike '%РЕНТГЕН%')
          and e.fen is not null and e.solution is not null
        order by l.title, e.sort_order`
    )
  ).rows;

  let healthy = 0;
  let changed = 0;
  const failed: string[] = [];

  for (const row of rows) {
    const promise = PROMISES.find((p) => p.match.test(row.prompt));
    if (!promise) {
      failed.push(`${row.id} — даалгаврын амлалт танигдсангүй: ${row.prompt}`);
      continue;
    }

    const problem = lineProblem(row, promise.piece, promise.chain);
    if (!problem) {
      healthy++;
      continue;
    }

    /*
     * ⚠ Морины сэрээ: байрлалд ХАР БЭРС байвал `knightForkTask("q")`,
     * эс бөгөөс `("r")`. Хичээлийн хүндрэлийг хадгална.
     */
    const generator =
      promise.piece === "n" && /q/.test(row.fen.split(" ")[0])
        ? knightForkTask("q")
        : promise.generator();

    const task = regenerate(seedFromString(row.id), generator);
    if (!task || task.type !== "chess-puzzle") {
      failed.push(`${row.id} — бодлого үүсгэж чадсангүй («${row.lesson}»)`);
      continue;
    }

    console.log(
      `\n«${row.lesson}» — ${problem}\n` +
        `  хуучин: ${row.fen}\n          ${row.solution}\n` +
        `  шинэ:   ${task.fen}\n          ${task.solution}`
    );
    changed++;

    if (apply) {
      await client.query(
        `update exercises
            set fen=$2, solution=$3, prompt=$4, prompt_en=$5,
                explanation=$6, explanation_en=$7
          where id=$1`,
        [
          row.id,
          task.fen,
          task.solution,
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
  for (const line of failed) console.log(`  ✗ ${line}`);

  await client.end();
  return failed.length;
}

main().then((failed) => process.exit(failed ? 1 : 0));
