import {
  BEST_EPSILON,
  buildReview,
  qualityFromLoss,
} from "@/lib/tactiq/moveQuality";

import { netDraughtsMaterial, rankDraughtsMoves } from "./bot";
import { Draughts } from "./engine";
import { squareNumber } from "./notation";
import { yieldToUi } from "@/lib/tactiq/yieldToUi";

import type { GameReview, ReviewedMove } from "@/lib/tactiq/moveQuality";
import type { Color, DraughtsMove } from "./engine";

/**
 * "Robo Coach" — ДААМЫН тоглоомын дараах шинжилгээ.
 *
 * `chess/analysis.ts`-тэй ЯГ ИЖИЛ бүтэц, ижил ангилал
 * (`lib/tactiq/moveQuality.ts`) — зөвхөн хөдөлгүүр, тэмдэглэгээ нь дамынх.
 *
 * ⚠ ЗОЛИОСЫН БОСГО ШАТРААС ӨӨР. Шатарт 1.5 пешк (морь/буудлын золиос) шаардсан
 * бол дамд НЭГ ДҮРС (1.0) хангалттай: дам дээр нэг дүрсээ өгөөд хэд хэдэн
 * дүрс буцааж иддэг хослол бол тоглоомын СОНГОДОГ гайхамшиг. Шатрын босгыг
 * тэр чигт нь хэрэглэвэл дамын хамгийн үзэсгэлэнтэй нүүдлүүд огт
 * тэмдэглэгдэхгүй өнгөрнө.
 */

/** Хоёрдугаар сайн нүүдэл хамгийн сайнаас хэдэн дүрсээр дор байвал "цорын ганц зам" вэ. */
const GREAT_GAP = 1.0;

/** Золиос гэж тооцох ЦЭВЭР материалын алдагдал — нэг энгийн дүрс. */
const SACRIFICE_MIN = 1.0;

/** Аль хэдийн ялж яваа үед золиос хийх нь гайхамшиг биш, хялбарчлал. */
const ALREADY_WINNING = 3.0;

/** Золиосны дараа ч байрлал үүнээс дор бол "гайхалтай" биш, цөхрөл. */
const STILL_SOUND = -0.5;

/**
 * Нүүдлийг хүн уншихуйц тэмдэглэгээ болгоно.
 *
 * Олон улсын дамын стандарт: энгийн нүүдэл "32-28", идэлт "32x23". Олон
 * дараалсан идэлтийг ч ЭХЛЭЛ ба ТӨГСГӨЛӨӨР нь бичнэ — дундын нүднүүдийг
 * жагсаах нь урт болох ба хөлөг дээр аль хэдийн харагдана.
 */
export function moveNotation(move: DraughtsMove): string {
  const from = squareNumber(move.from.row, move.from.col);
  const to = squareNumber(move.to.row, move.to.col);
  return `${from}${move.captures.length > 0 ? "x" : "-"}${to}`;
}

/**
 * Энэ нүүдэл ЖИНХЭНЭ материалын золиос мөн үү.
 *
 * ⚠ Дамд ИДЭЛТ ЗААВАЛ байдаг: идэх боломж байвал `legalMoves()` нь зөвхөн
 * идэлтүүдийг буцаана. Тиймээс "өрсөлдөгчийн хамгийн ашигтай идэлт"-ийг
 * тусад нь шүүх шаардлагагүй — бүх хууль ёсны хариултыг гүйлгэхэд л
 * хангалттай.
 */
function isSacrifice(game: Draughts, move: DraughtsMove): boolean {
  const mover = game.turn();
  const before = netDraughtsMaterial(game, mover);

  game.applyMove(move);

  let worst = netDraughtsMaterial(game, mover);
  for (const reply of game.legalMoves()) {
    game.applyMove(reply);
    worst = Math.min(worst, netDraughtsMaterial(game, mover));
    game.undo();
  }

  game.undo();

  return before - worst >= SACRIFICE_MIN;
}

/**
 * Дууссан тоглоомыг эхнээс нь дахин тоглуулж, `reviewColor` талын нүүдэл
 * бүрийг шинжилнэ.
 *
 * @param history тоглоомын БҮХ нүүдэл, тоглосон дарааллаар
 * @param reviewColor зөвхөн ЭНЭ талын нүүдлийг шинжилнэ
 * @param depth хайлтын гүн — ихсэх тусам нарийн, гэхдээ удаан
 */
export async function analyzeDraughtsGame(
  history: DraughtsMove[],
  reviewColor: Color = "w",
  depth = 3,
  onProgress?: (fraction: number) => void
): Promise<GameReview> {
  const replay = new Draughts();
  const moves: ReviewedMove[] = [];
  const sign = reviewColor === "w" ? 1 : -1;

  for (let ply = 0; ply < history.length; ply++) {
    const played = history[ply];

    if (replay.turn() !== reviewColor) {
      replay.applyMove(played);
      continue;
    }

    const ranked = rankDraughtsMoves(replay, depth);
    const bestRaw = ranked.length > 0 ? ranked[0].score : 0;
    const secondRaw = ranked.length > 1 ? ranked[1].score : null;
    // Тоглосон нүүдлийн оноо аль хэдийн `ranked` дотор байна — тэмдэглэгээгээр
    // хайна. `scoreAfterDraughtsMove`-оор дахин хайх нь яг ижил ажил.
    const playedNotationEarly = moveNotation(played);
    const playedEntry = ranked.find((entry) => moveNotation(entry.move) === playedNotationEarly);
    const actualRaw = playedEntry ? playedEntry.score : bestRaw;

    const bestForMover = sign * bestRaw;
    const actualForMover = sign * actualRaw;
    const loss = Math.max(0, bestForMover - actualForMover);

    let quality = qualityFromLoss(loss);

    if (loss <= BEST_EPSILON) {
      if (
        bestForMover <= ALREADY_WINNING &&
        actualForMover >= STILL_SOUND &&
        isSacrifice(replay, played)
      ) {
        quality = "brilliant";
      } else if (secondRaw !== null && bestForMover - sign * secondRaw >= GREAT_GAP) {
        quality = "great";
      }
    }

    const playedNotation = moveNotation(played);
    const bestNotation = ranked.length > 0 ? moveNotation(ranked[0].move) : null;

    moves.push({
      ply,
      moveNumber: Math.floor(ply / 2) + 1,
      notation: playedNotation,
      loss,
      quality,
      bestNotation: bestNotation !== playedNotation ? bestNotation : null,
    });

    replay.applyMove(played);
    onProgress?.((ply + 1) / history.length);
    await yieldToUi();
  }

  return buildReview(moves);
}
