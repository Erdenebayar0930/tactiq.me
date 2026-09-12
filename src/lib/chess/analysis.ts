import { Chess } from "chess.js";

import {
  BEST_EPSILON,
  buildReview,
  qualityFromLoss,
} from "@/lib/tactiq/moveQuality";

import { netMaterial, rankMoves, scoreAfterMove } from "./bot";
import { yieldToUi } from "@/lib/tactiq/yieldToUi";

import type { GameReview, MoveQuality, ReviewedMove } from "@/lib/tactiq/moveQuality";
import type { Color, Move } from "chess.js";

/**
 * "Robo Coach" — шатрын тоглоомын дараах шинжилгээ.
 *
 * Ангилал, босго, оноололт нь `lib/tactiq/moveQuality.ts`-д ХАМТ (даамтай)
 * тодорхойлогдсон. Энд зөвхөн ШАТРЫН хөдөлгүүрээс хамаарах хэсэг:
 * алдагдал тооцох, золиос илрүүлэх, "цорын ганц нүүдэл" таних.
 *
 * `bot.ts`-ийн ХАМТ minimax хайлтыг ДАХИН ашигладаг — тоглогчийг шүүх
 * "тархи" нь ботыг тоглуулдаг тэр л функц, тиймээс ботын хүчинтэй нийцтэй.
 */

export type { GameReview, MoveQuality, ReviewedMove };

/**
 * Хоёрдугаар сайн нүүдэл хамгийн сайнаас ХЭДЭН нэгжээр дор байвал тоглосон
 * нүүдлийг "цорын ганц зөв зам" (`great`) гэж үзэх вэ.
 *
 * 1.0 = бүтэн пешк. Үүнээс бага зөрүүтэй үед хоёр ч сайн сонголт байсан
 * гэсэн үг тул онцлох шалтгаангүй.
 */
const GREAT_GAP = 1.0;

/**
 * Золиосын нэр дэвшигчийг ХЭД дахин гүн шалгах вэ (`depth + DEEP_BONUS`).
 *
 * ⚠ ЯАГААД ТУСАД НЬ ГҮНЗГИЙРҮҮЛЭХ ШААРДЛАГАТАЙ ВЭ: жинхэнэ золиос нь
 * гүехэн хайлтад ЯМАГТ МУУ харагдана — материалаа өгсөн, харин нөхөн авах
 * хослол нь хайлтын давхрагаас цааш байдаг. Тиймээс үндсэн гүн (2) дээр
 * золиос хэзээ ч "хамгийн сайн" болж чадахгүй ба `brilliant` ОГТ
 * илрэхгүй — хэмжилтээр батлагдсан.
 *
 * ⚠ ЯАГААД БҮХ НҮҮДЛИЙГ ГҮНЗГИЙРҮҮЛЭХГҮЙ ВЭ: бүтэн тоглоомыг гүн 3-аар
 * шинжлэхэд 101 секунд, гүн 2-оор 4.4 секунд болсон (хэмжсэн). Гүнзгий
 * хайлтыг ЗӨВХӨН статик шалгуураар золиос гэж тогтоосон цөөн нүүдэлд
 * хэрэглэвэл зардал нь нэг тоглоомд хэдэн зуун миллисекундэд багтана.
 */
const DEEP_BONUS = 1;

/** Нэг тоглоомд хийх гүнзгий шалгалтын ДЭЭД тоо — цаг хугацааны таазыг барина. */
const MAX_DEEP_CHECKS = 4;

/** Золиос гэж тооцох ЦЭВЭР материалын алдагдлын доод хязгаар (пешкийн нэгжээр). */
const SACRIFICE_MIN = 1.5;

/**
 * Аль хэдийн ялж байгаа байрлалд золиос хийх нь "гайхалтай" биш — зүгээр л
 * хялбарчлал. Энэ босгоос дээш давуутай үед `brilliant` олгохгүй.
 */
const ALREADY_WINNING = 4.0;

/**
 * Золиослосны дараа ч байрлал ЭНЭ хэмжээнээс дор болбол `brilliant` биш —
 * ялагдаж яваа хүний цөхрөлийн золиосыг магтах нь хэрэглэгчийг төөрөгдүүлнэ.
 */
const STILL_SOUND = -0.5;

/**
 * Энэ нүүдэл ЖИНХЭНЭ материалын золиос мөн үү.
 *
 * ⚠ ЦЭВЭР материалын зөрүүг (`netMaterial`) хардаг нь чухал. Зөвхөн "өөрийн
 * материал" хэмжвэл ЭНГИЙН СОЛИЛЦОО ч золиос мэт харагдана: морио өгөөд
 * морь авахад өөрийн материал 3-аар буурсан ч зөрүү өөрчлөгдөөгүй байдаг.
 *
 * Аргачлал: нүүдлээ хийгээд, өрсөлдөгчийн ХАМГИЙН АШИГТАЙ идэлтийг
 * тоглуулж үзнэ. Түүний дараа ч зөрүү `SACRIFICE_MIN`-ээс их буурсан бол
 * бид үнэхээр материалаа өгсөн байна.
 */
function isSacrifice(chess: Chess, move: Move): boolean {
  const mover = chess.turn();
  const before = netMaterial(chess, mover);

  chess.move(move);

  // Идэлт байхгүй бол өрсөлдөгч материал авахгүй — нүүдлийн дараах зөрүү нь
  // эцсийн үр дүн.
  let worst = netMaterial(chess, mover);
  const captures = (chess.moves({ verbose: true }) as Move[]).filter((reply) => reply.captured);

  for (const capture of captures) {
    chess.move(capture);
    worst = Math.min(worst, netMaterial(chess, mover));
    chess.undo();
  }

  chess.undo();

  return before - worst >= SACRIFICE_MIN;
}

/**
 * Дууссан тоглоомыг эхнээс нь дахин тоглуулж, `reviewColor` талын нүүдэл
 * бүрийг тэр мөчийн хамгийн сайн боломжит нүүдэлтэй харьцуулна.
 *
 * ⚠ ASYNC бөгөөд нүүдэл тутамд удирдлагаа буцаадаг (`yieldToUi`). Урьд нь
 * синхрон байсан ба бүтэн тоглоомыг шинжлэхэд ~4.4 секунд ЗУРАГДАХ УРСГАЛЫГ
 * БҮРЭН БОГЛОДОГ байв — гар утсан дээр апп "гацсан" мэт харагдана. Одоо
 * дэлгэц хариу үзүүлсээр байх ба `onProgress` явцыг мэдээлнэ.
 *
 * @param history тоглоомын БҮХ нүүдэл (`chess.history({verbose:true})`)
 * @param reviewColor зөвхөн ЭНЭ талын нүүдлийг шинжилнэ (өрсөлдөгч/ботыг шүүхгүй)
 * @param depth хайлтын гүн — `bot.ts`-ийн SEARCH_DEPTH-тай ижил цар хүрээ
 * @param onProgress 0..1 — явцын мөр зурахад
 */
export async function analyzeGame(
  history: Move[],
  reviewColor: Color = "w",
  depth = 2,
  onProgress?: (fraction: number) => void,
  /**
   * Тоглоом ЭХЭЛСЭН байрлал. Аппын тоглолтууд стандарт эхлэлээс эхэлдэг тул
   * ихэвчлэн хэрэггүй — гэвч бодлого/сургалтын байрлалаас эхэлсэн тоглоомыг
   * шинжлэхэд ЗААВАЛ хэрэгтэй. Үүнгүйгээр нүүдлүүд стандарт эхлэлд таарахгүй
   * бөгөөд `chess.move` шидэж, шинжилгээ бүхэлдээ унана.
   */
  startFen?: string
): Promise<GameReview> {
  const replay = startFen ? new Chess(startFen) : new Chess();
  const moves: ReviewedMove[] = [];
  // Хоёр талын оноог НҮҮХ ТАЛЫН харц руу хөрвүүлэх тэмдэг. `minimax` нь
  // ямагт цагааны харцаар өгдөг тул хар талыг шинжлэхэд эргүүлнэ.
  const sign = reviewColor === "w" ? 1 : -1;
  let deepChecks = 0;

  for (let ply = 0; ply < history.length; ply++) {
    const played = history[ply];

    if (replay.turn() !== reviewColor) {
      replay.move(played);
      continue;
    }

    const ranked = rankMoves(replay, depth);
    const bestRaw = ranked.length > 0 ? ranked[0].score : 0;
    const secondRaw = ranked.length > 1 ? ranked[1].score : null;

    // Тоглосон нүүдлийн оноо аль хэдийн `ranked` дотор байна — SAN нь тухайн
    // байрлалд өвөрмөц тул түүгээр хайна. Урьд нь `scoreAfterMove`-оор
    // ДАХИН хайдаг байсан нь яг ижил ажлыг давхардуулж байв.
    const playedEntry = ranked.find((entry) => entry.move.san === played.san);
    const actualRaw = playedEntry ? playedEntry.score : bestRaw;

    const bestForMover = sign * bestRaw;
    const actualForMover = sign * actualRaw;
    let loss = Math.max(0, bestForMover - actualForMover);

    let quality = qualityFromLoss(loss);

    // ── "Цорын ганц зөв зам" — хоёрдугаар сонголт мэдэгдэхүйц дор байсан.
    if (loss <= BEST_EPSILON && secondRaw !== null) {
      if (bestForMover - sign * secondRaw >= GREAT_GAP) quality = "great";
    }

    // ── Золиос. Эхлээд ХЯМД статик шалгуур, дараа нь л гүнзгий баталгаа.
    if (
      deepChecks < MAX_DEEP_CHECKS &&
      bestForMover <= ALREADY_WINNING &&
      isSacrifice(replay, played)
    ) {
      deepChecks++;

      const deepDepth = depth + DEEP_BONUS;
      const deepActual = sign * scoreAfterMove(replay, played, deepDepth);

      // Харьцуулах "хамгийн сайн хувилбар" — гүехэн эрэмбийн тэргүүн
      // нүүдэл (тоглосноос өөр бол). Бүх нүүдлийг гүнзгий эрэмбэлэх нь
      // хэт үнэтэй тул ганц өрсөлдөгчтэй л жишнэ.
      const alternative = ranked.find((entry) => entry.move.san !== played.san);
      const deepAlternative = alternative
        ? sign * scoreAfterMove(replay, alternative.move, deepDepth)
        : -Infinity;

      if (deepActual >= deepAlternative - BEST_EPSILON && deepActual >= STILL_SOUND) {
        quality = "brilliant";
        /*
         * ⚠ Алдагдлыг ТЭГЛЭНЭ. Гүехэн хайлт энэ нүүдлийг "материалаа өгсөн"
         * гэж үзээд том алдагдал тооцсон байна — яг тэр учраас гүнзгий
         * шалгалт хийсэн. Гүнзгий хайлт нүүдлийг зөв гэж баталсан хойно
         * гүехэн тооцоог үлдээвэл тоглогч "Гайхалтай" тэмдэгтэй атлаа
         * нарийвчлал нь унасан, ойлгомжгүй дүнг харна.
         */
        loss = 0;
      }
    }

    moves.push({
      ply,
      moveNumber: Math.floor(ply / 2) + 1,
      notation: played.san,
      loss,
      quality,
      bestNotation:
        ranked.length > 0 && ranked[0].move.san !== played.san ? ranked[0].move.san : null,
    });

    replay.move(played);
    onProgress?.((ply + 1) / history.length);
    await yieldToUi();
  }

  return buildReview(moves);
}
