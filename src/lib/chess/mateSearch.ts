import { Chess } from "chess.js";

import type { Move } from "chess.js";

/**
 * МАТЫН ШИЙДЭЛ ХАЙГЧ — олон нүүдэлт өрөг бодлого ЗӨВ эсэхийг машинаар
 * шалгахад.
 *
 * ⚠ ЭНЭ НЬ ХҮСЭЛТИЙН ҮЕД АЖИЛЛАХГҮЙ. Хайлт нь мянга мянган байрлал шалгадаг
 * тул API route дотор дуудвал нэг багшийн "Хадгалах" товшилт серверийн CPU-г
 * секундээр атгана (`DATABASE_POOL_MAX` тайлбарыг үзнэ үү — ижил зарчим).
 * Зөвхөн ОФФЛАЙН скриптэд (`scripts/seed-chess-puzzles.ts`,
 * `scripts/audit-puzzles.ts`) хэрэглэнэ.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: "2 нүүдэлд мад" бодлогод хар тал ОЛОН өөр хамгаалалт
 * сонгож болно. Тоглуулагч нь ГАНЦ шугам хадгалдаг тул хадгалсан шугам нь
 * бодлогын ЖИНХЭНЭ шийдэл мөн эсэхийг (мөн эхний нүүдэл нь ЦОРЫН ГАНЦ мөн
 * эсэхийг) гараар шалгах боломжгүй — эндхийн хайлт үүнийг хийнэ.
 */

/**
 * Хайлтын ДЭЭД гүн (тоглогчийн нүүдлээр).
 *
 * 2 = "2 нүүдэлд мад". Гурав дахь давхарга нь ойролцоогоор 30³ дахин илүү
 * байрлал шалгах шаардлагатай болж, нэг бодлого шалгахад хэдэн минут иднэ.
 * Түүнээс гүн бодлогыг машинаар БАТАЛГААЖУУЛАХГҮЙ — шугам нь хууль ёсны,
 * мадаар төгсдөг эсэхийг л шалгаад, "гараар хянана уу" гэж анхааруулна.
 */
export const MATE_SEARCH_MAX_DEPTH = 2;

/**
 * Нүүх ээлжтэй тал `depth` нүүдэлд АЛБАДМАЛ мад хийж чадах уу.
 *
 * "Албадмал" гэдэг нь: тоглогчид ЯДАЖ НЭГ нүүдэл байх ба өрсөлдөгчийн БҮХ
 * хариунд мад үргэлжлэх ёстой. Пат (stalemate) нь мад БИШ тул амжилтгүй
 * гэж тооцогдоно — энэ ялгааг алдвал "мад" гэж зарласан бодлого тэнцээгээр
 * дуусаж болно.
 */
function canForceMate(chess: Chess, depth: number): boolean {
  if (depth < 1) return false;

  for (const move of chess.moves({ verbose: true }) as Move[]) {
    chess.move(move);

    let works = false;
    if (chess.isCheckmate()) {
      works = true;
    } else if (depth > 1 && !chess.isGameOver()) {
      // Өрсөлдөгчийн БҮХ хариунд мад үргэлжлэх ёстой — нэг нь ч
      // мултарвал энэ нүүдэл шийдэл биш.
      works = (chess.moves({ verbose: true }) as Move[]).every((reply) => {
        chess.move(reply);
        const forced = canForceMate(chess, depth - 1);
        chess.undo();
        return forced;
      });
    }

    chess.undo();
    if (works) return true;
  }

  return false;
}

/**
 * `depth` нүүдэлд албадмал мад хийдэг БҮХ эхний нүүдлийг олно.
 *
 * Хоёр буюу түүнээс дээш нүүдэл буцвал бодлого нь ОЛОН ШИЙДЭЛТЭЙ — өрөг
 * бодлогын хувьд гологдол бөгөөд сурагч зөв шийдээд "буруу" гэж сонсох
 * эрсдэлтэй.
 */
export function findMateKeys(fen: string, depth: number): Move[] {
  const chess = new Chess(fen);
  const keys: Move[] = [];

  for (const move of chess.moves({ verbose: true }) as Move[]) {
    chess.move(move);

    let works = false;
    if (chess.isCheckmate()) {
      works = depth >= 1;
    } else if (depth > 1 && !chess.isGameOver()) {
      works = (chess.moves({ verbose: true }) as Move[]).every((reply) => {
        chess.move(reply);
        const forced = canForceMate(chess, depth - 1);
        chess.undo();
        return forced;
      });
    }

    chess.undo();
    if (works) keys.push(move);
  }

  return keys;
}

/**
 * Түлхүүр нүүдлийн ХАРИУ ЖИШИХ (refutation) хамгаалалтуудыг олно.
 *
 * ⚠ Утга нь нэрнээсээ нарийн: ЗӨВ түлхүүр дээр хар талын БҮХ хариу мад
 * идэх ёстой тул энэ функц ХООСОН биш, БҮХ хууль ёсны хариуг буцаана
 * (тэдгээр нь бүгд ижил гүнтэй — аль нэгийг нь шугамд сонгож болно).
 * Харин БУРУУ түлхүүр дээр мадаас мултардаг хариунуудыг л буцаана —
 * өөрөөр хэлбэл яг ЯМАР хамгаалалт бодлогыг унагааж байгааг заана.
 *
 * Тиймээс дуудагч нь `findMateKeys`-ээр түлхүүр зөв эсэхийг ЭХЛЭЭД
 * шалгасан байх ёстой; энэ функц нь оношилгоо, шугам бүрдүүлэлтэд.
 */
export function findDefences(fen: string, depth: number): Move[] {
  const chess = new Chess(fen);
  const replies = chess.moves({ verbose: true }) as Move[];
  if (replies.length === 0) return [];

  const escapes = replies.filter((reply) => {
    chess.move(reply);
    const mated = canForceMate(chess, depth - 1);
    chess.undo();
    return !mated;
  });

  return escapes.length > 0 ? escapes : replies;
}

/**
 * ХАДГАЛСАН ШУГАМЫГ бүхэлд нь шалгана — сурагчийн НҮҮДЭЛ БҮР дээр.
 *
 * ⚠ ЯАГААД ЗӨВХӨН ТҮЛХҮҮРИЙГ ШАЛГАВАЛ ХАНГАЛТГҮЙ ВЭ: тоглуулагч нь
 * сурагчийн нүүдэл бүрийг хадгалсан шугамтай ЖИШДЭГ. Тиймээс хоёр дахь
 * нүүдэл дээр хоёр өөр мад байвал (жишээ нь "Ree7 Kb8" дараа Rd8# ба өөр
 * нэг мад) сурагч ЗӨВ мадаар дуусгаад "буруу" гэсэн хариу авна. Энэ нь
 * эхний нүүдлийн олон шийдэлтэй ЯГ ИЖИЛ хортой алдаа, зүгээр л нэг
 * давхарга гүнд нуугдсан — тиймээс шугамын алхам бүрийг шалгана.
 *
 * @param fen   эхлэх байрлал (хэвшсэн)
 * @param moves хадгалсан шугам (`parsePuzzle`-ийн гаралт)
 * @returns алдааны тайлбар, эсвэл зөв бол `null`
 */
export function auditMateLine(
  fen: string,
  moves: { from: string; to: string; san: string; isPlayer: boolean }[]
): string | null {
  const playerMoves = Math.ceil(moves.length / 2);
  if (playerMoves > MATE_SEARCH_MAX_DEPTH) {
    return `HETSUU_GUN:${playerMoves}`;
  }

  const chess = new Chess(fen);

  for (const [index, move] of moves.entries()) {
    if (move.isPlayer) {
      // Үлдсэн гүн: сурагч эндээс хэдэн нүүдэлд мад хийх ёстой вэ.
      const remaining = playerMoves - Math.floor(index / 2);
      const keys = findMateKeys(chess.fen(), remaining);

      if (keys.length === 0) {
        const defences = findDefences(chess.fen(), remaining);
        return (
          `${index + 1}-р нүүдэлд ${remaining} нүүдлийн албадмал мад алга` +
          (defences.length > 0
            ? ` (мултрах хариу: ${defences.slice(0, 4).map((m) => m.san).join(", ")})`
            : "")
        );
      }

      if (keys.length > 1) {
        return `${index + 1}-р нүүдэлд ${keys.length} өөр шийдэл бий (${keys
          .map((m) => m.san)
          .join(", ")}) — сурагч зөв шийдээд "буруу" гэсэн хариу авна`;
      }

      if (keys[0].from !== move.from || keys[0].to !== move.to) {
        return `${index + 1}-р нүүдэлд хадгалсан ${move.san} нь шийдэл биш — зөв нь ${keys[0].san}`;
      }
    }

    chess.move({ from: move.from, to: move.to });
  }

  return null;
}
