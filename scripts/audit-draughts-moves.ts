/**
 * ДААМЫН «draughts-move» ДАСГАЛУУДЫГ ХӨДӨЛГҮҮРЭЭР ТУЛГАНА.
 *
 * ⚠ ЮУГ ШАЛГАЖ БАЙНА ВЭ: дасгалын `correct_from` → `correct_to` нь
 * тухайн байрлалд ЖИНХЭНЭ хууль ёсны нүүдэл мөн үү. Хэрэв биш бол
 * сурагч ХЭЗЭЭ Ч зөв хариултыг өгч чадахгүй — хөлөг «идэхгүй» байна
 * гэж харагдана.
 *
 * ⚠ Хөдөлгүүрийг (`lib/draughts/engine.ts`) ШУУД дууддаг: UI-гаас
 * тусад нь давхар хэрэгжүүлбэл хоёр өөр дүрэм үүсэж, аудит худлаа
 * «зүгээр» гэж хэлнэ.
 *
 * Ажиллуулах:  npm run audit:draughts
 */
import { Client } from "pg";

import { Draughts } from "../src/lib/draughts/engine";
import { deserializePosition, squareNumber } from "../src/lib/draughts/notation";
import { parseDraughtsPuzzle } from "../src/lib/draughts/puzzle";
import { advanceChain, startChain } from "../src/lib/draughts/chain";
import {
  CENTRE_PROMPT,
  centreProblem,
  DEFENCE_PROMPT,
  DRAW_PROMPT,
  WIN_PROMPT,
  defenceProblem,
  drawProblem,
  mismatch,
  piecesOf,
  specFor,
  winProblem,
} from "./repair-draughts-moves";

import type { DraughtsMove, Square } from "../src/lib/draughts/engine";

/**
 * Дасгалыг СУРАГЧ ХИЙЖ ЧАДАХ эсэх — тоглуулагчийн урсгалыг дуурайна.
 *
 * ⚠ ЯАГААД ХАНГАЛТГҮЙ ВЭ «нүүдэл хууль ёсны» гэдэг: хөлөг дээр тодрох
 * буултууд болон `startChain`-ийн хүлээлт хоорондоо ЗӨРЖ болно. Яг тэр
 * зөрүүгээс болж олон идэлттэй 348 дасгал бүхэлдээ тоглогдохгүй байсан
 * атлаа аудит «бүгд зөв» гэж хэлж байв. Тиймээс энэ шалгуур нь
 * `DraughtsMoveExercise`-ийн дуудаж буй функцуудыг ЯГ ТЭР дарааллаар
 * дуудна.
 */
function isPlayable(game: Draughts, want: DraughtsMove): boolean {
  const from = want.from;
  // Хөлөг дээр ЭНЭ дүрснээс тодрох буултууд (компонент дахь `getLegalTargets`).
  const targets: Square[] = game.movesFrom(from).map((m) => m.landings[0] ?? m.to);
  const first = want.landings[0] ?? want.to;
  if (!targets.some((t) => t.row === first.row && t.col === first.col)) return false;

  let step = startChain(game.movesFrom(from), from, first);
  for (let index = 1; step.kind === "partial"; index += 1) {
    const next = want.landings[index];
    if (!next) return false;
    step = advanceChain(step.state, next);
  }
  return step.kind === "complete";
}

/* ⚠ `main()`-д боов: tsx нь CJS руу хөрвүүлдэг тул ДЭЭД ТҮВШНИЙ `await` ажиллахгүй. */
async function main(): Promise<number> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = (
    await client.query<{
      id: string;
      prompt: string;
      fen: string | null;
      correct_from: string | null;
      correct_to: string | null;
    }>(
      `select id, prompt, fen, correct_from, correct_to
         from exercises where type = 'draughts-move' order by prompt, sort_order`
    )
  ).rows;

  type Bad = { id: string; prompt: string; fen: string; want: string; why: string; legal: string[] };
  const bad: Bad[] = [];
  let ok = 0;

  for (const row of rows) {
    const want = `${row.correct_from}-${row.correct_to}`;
    const position = row.fen ? deserializePosition(row.fen) : null;

    if (!position) {
      bad.push({ id: row.id, prompt: row.prompt, fen: row.fen ?? "", want, why: "FEN уншигдахгүй", legal: [] });
      continue;
    }

    const game = new Draughts(position);
    const moves = game.legalMoves();
    const legal = moves.map(
    (m) =>
      `${squareNumber(m.from.row, m.from.col)}-${squareNumber(m.to.row, m.to.col)}(${m.captures.length})`
  );

    const hit = moves.find(
      (m) =>
        String(squareNumber(m.from.row, m.from.col)) === row.correct_from &&
        String(squareNumber(m.to.row, m.to.col)) === row.correct_to
    );

    if (!hit) {
      bad.push({
        id: row.id,
        prompt: row.prompt,
        fen: row.fen!,
        want,
        why: legal.length ? "хууль ёсны нүүдэлд алга" : "ямар ч нүүдэл алга",
        legal: [...new Set(legal)],
      });
      continue;
    }

    /*
   * ⚠ ДААЛГАВАР ШИЙДЭЛТЭЙГЭЭ ТААРЧ БАЙНА УУ. «Даамаараа цохи» гэсэн
   * 6 дасгалын шийдэл нь ХҮҮГЭЭР цохидог байсныг сурагч олж мэдэв —
   * нүүдэл нь хууль ёсны тул өмнөх шалгуурууд бүгд «зөв» гэж хэлж байв.
   */
  const goalPrompt =
    row.prompt === WIN_PROMPT ||
    row.prompt === DRAW_PROMPT ||
    row.prompt === DEFENCE_PROMPT ||
    row.prompt === CENTRE_PROMPT;
  const spec = row.fen && !goalPrompt ? specFor(row.prompt, piecesOf(row.fen)) : null;
  const clash =
    row.prompt === WIN_PROMPT
      ? winProblem(position, hit)
      : row.prompt === DRAW_PROMPT
        ? drawProblem(position, hit)
        : row.prompt === DEFENCE_PROMPT
          ? defenceProblem(position, hit)
        : row.prompt === CENTRE_PROMPT
          ? centreProblem(position, hit)
        : spec
          ? mismatch(spec, position.board, hit)
          : null;
  if (clash) {
    bad.push({ id: row.id, prompt: row.prompt, fen: row.fen!, want, why: clash, legal: [...new Set(legal)] });
    continue;
  }

  if (!isPlayable(new Draughts(position), hit)) {
    bad.push({
      id: row.id,
      prompt: row.prompt,
      fen: row.fen!,
      want,
      why: "хууль ёсны ч ТОГЛУУЛАГЧААР хийгдэхгүй",
      legal: [...new Set(legal)],
    });
    continue;
  }

  /* Даалгавар «хоёроос дээш» гэсэн бол идэлтийн тоог ч шалгана. */
    const captured = hit.captures?.length ?? 0;
    if (/хоёроос дээш/.test(row.prompt) && captured < 2) {
      bad.push({
        id: row.id,
        prompt: row.prompt,
        fen: row.fen!,
        want,
        why: `зөвхөн ${captured} дүрс иддэг`,
        legal: [...new Set(legal)],
      });
      continue;
    }

    ok++;
  }

  console.log(`draughts-move дасгал: ${rows.length} — зөв ${ok}, эвдэрсэн ${bad.length}`);
  for (const b of bad) {
    console.log(`\n  ✗ ${b.id}  (${b.why})`);
    console.log(`    ${b.prompt}`);
    console.log(`    FEN:  ${b.fen}`);
    console.log(`    хүсэв: ${b.want}`);
    console.log(`    хууль ёсны: ${b.legal.join(" ") || "—"}`);
  }

  /*
   * ОЛОН НҮҮДЭЛТ БОДЛОГУУД (`draughts-puzzle`).
   *
   * ⚠ `parseDraughtsPuzzle` нь шугамыг хөдөлгүүрээр НЭГ НЭГЭЭР тоглож
   * үзэж, аль нэг нүүдэл хууль бус эсвэл өрсөлдөгчийн хариу АЛБАДМАЛ
   * биш бол `null` буцаана — тоглуулагч яг үүнийг ашигладаг тул энэ нь
   * дасгал ажиллах эсэхийн БҮРЭН шалгуур.
   */
  const puzzles = (
    await client.query<{ id: string; prompt: string; fen: string | null; solution: string | null }>(
      `select id, prompt, fen, solution from exercises where type = 'draughts-puzzle'`
    )
  ).rows;

  const brokenPuzzles = puzzles.filter((p) => !parseDraughtsPuzzle(p.fen, p.solution));
  console.log(`
draughts-puzzle бодлого: ${puzzles.length} — зөв ${puzzles.length - brokenPuzzles.length}, эвдэрсэн ${brokenPuzzles.length}`);
  for (const p of brokenPuzzles) {
    console.log(`
  ✗ ${p.id}
    ${p.prompt}
    FEN: ${p.fen}
    шугам: ${p.solution}`);
  }

  await client.end();
  return bad.length + brokenPuzzles.length;
}

main().then((failed) => process.exit(failed ? 1 : 0));
