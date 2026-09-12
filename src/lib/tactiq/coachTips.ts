import type { Chess } from "chess.js";
import type { Draughts } from "@/lib/draughts/engine";

/**
 * ДАСГАЛЖУУЛАГЧИЙН ДҮРМИЙН ТАЙЛБАР — хөлөг дээр БОДИТООР тохиолдсон
 * мөчид тохирох нэг өгүүлбэр.
 *
 * ЯАГААД ТУСДАА ФАЙЛ, ЯАГААД ЦЭВЭР ФУНКЦ ВЭ:
 *   • Нэг дүрмийг хоёр дэлгэцэд (ботын тоглолт, хичээл) өөр өөр үгээр
 *     тайлбарлавал хүүхэд хоёр өөр дүрэм сурсан гэж бодно. Бичвэр НЭГ
 *     ГАЗАР байх нь тайлбаруудыг нэг дуу хоолойтой байлгана.
 *   • `Chess`/`Draughts`-ыг л хүлээж авдаг цэвэр функц тул React-гүйгээр
 *     шалгаж, дуудаж болно.
 *
 * ⚠ ТАЙЛБАР НЭГ УДАА: дуудагч тал аль тайлбарыг аль хэдийн харуулсныг
 * санаж, давтахгүй байх ёстой (`CoachTip`-ийн `shownRef` загвар). «Мад»
 * гэдгийг нүүдэл бүрд дахин дахин хэлэх нь зөвлөгөө биш, чимээ шуугиан.
 */
export type CoachTip = {
  /** Давхардлыг хянах түлхүүр — дуудагч тал үүнийг санана. */
  id: string;
  /**
   * Эрэмбэ — нэг мөчид хэд хэдэн дүрэм тохирвол ИХ тоо нь дээгүүр гарна.
   * Жишээ нь «боож байна» гэдэг нь «төв нүдийг эзэл» гэсэн ерөнхий
   * зөвлөгөөнөөс ЯМАГТ чухал: сурагч эхлээд хаанаа аврах ёстой.
   */
  priority: number;
  text: string;
};

const tip = (id: string, priority: number, text: string): CoachTip => ({ id, priority, text });

/**
 * ШАТРЫН дүрмийн тайлбар — тоглогч (цагаан) нүүх ээлжтэй мөчид дуудагдана.
 *
 * Жагсаалт нь ДАРААЛЛААРАА биш, `priority`-гаар эрэмбэлэгдэнэ.
 */
export function chessTips(chess: Chess): CoachTip[] {
  const tips: CoachTip[] = [];
  const history = chess.history();
  const moves = chess.moves({ verbose: true });

  if (history.length === 0) {
    tips.push(
      tip(
        "chess:goal",
        10,
        "Шатрын зорилго нь өрсөлдөгчийн ноёныг МАД хийх — зугтах газаргүй болтол боох."
      )
    );
    tips.push(
      tip(
        "chess:center",
        5,
        "Эхлэлд төв нүдийг (d4, e4, d5, e5) эзлэхийг хичээ. Төвөөс дүрс бүр илүү олон нүд хамгаална."
      )
    );
  }

  if (chess.inCheck()) {
    tips.push(
      tip(
        "chess:check",
        100,
        "Ноён чинь БООЛТ дор байна. Гурван л зам бий: ноёныг зөөх, боож байгаа дүрсийг идэх, эсвэл хооронд дүрс тавих."
      )
    );
  }

  // Хувиргалт: хүү сүүлийн эгнээнд хүрэх нүүдэл байна уу.
  if (moves.some((move) => move.promotion)) {
    tips.push(
      tip(
        "chess:promotion",
        60,
        "Хүү чинь 8-р эгнээнд хүрэх гэж байна! Тэнд хүрмэгц бэрс, тэрэг, тэмээ, морь — аль ч дүрс болж хувирна."
      )
    );
  }

  if (moves.some((move) => move.isKingsideCastle() || move.isQueensideCastle())) {
    tips.push(
      tip(
        "chess:castle",
        40,
        "Одоо БҮТЭЭХ (рокировка) боломжтой: ноён хоёр нүд хөдөлж, тэрэг түүний хажууд бууна. Ноёноо хамгаалах хамгийн хурдан арга."
      )
    );
  }

  if (moves.some((move) => move.isEnPassant())) {
    tips.push(
      tip(
        "chess:en-passant",
        50,
        "«Зугтсан хүү» (en passant): хоёр нүд үсэрсэн хүүг яг тэр дор нэг нүд үсэрсэн мэт идэж болно."
      )
    );
  }

  return tips.sort((a, b) => b.priority - a.priority);
}

/**
 * ДААМЫН дүрмийн тайлбар.
 *
 * ⚠ Даамын ХАМГИЙН ТӨӨРӨГДҮҮЛДЭГ хоёр дүрэм нь «идэлт заавал» ба
 * «хамгийн урт цувааг сонгох» — сурагч идэхгүй нүүх гэж оролдоод хөлөг
 * зөвшөөрөхгүй үед шалтгааныг мэдэхгүй бол аппыг эвдэрсэн гэж бодно.
 * Тиймээс тэр хоёрыг идэлт БОЛОМЖТОЙ яг тэр мөчид тайлбарлана.
 */
export function draughtsTips(game: Draughts): CoachTip[] {
  const tips: CoachTip[] = [];
  const moves = game.legalMoves();
  const capture = moves.find((move) => move.captures.length > 0);

  if (game.moveHistory().length === 0) {
    tips.push(
      tip(
        "draughts:goal",
        10,
        "Даамын зорилго нь өрсөлдөгчийн бүх дүрсийг идэх, эсвэл нүүх боломжгүй болгох."
      )
    );
  }

  if (capture) {
    tips.push(
      tip(
        "draughts:must-capture",
        100,
        "Идэх боломж гарвал ЗААВАЛ идэх ёстой — даамд «идэхгүй өнгөрөх» гэж үгүй."
      )
    );

    if (moves.length === 1) {
      tips.push(
        tip(
          "draughts:longest",
          90,
          "Хэд хэдэн идэлт байвал ХАМГИЙН УРТ цувааг сонгох ёстой. Тиймээс заримдаа ганцхан нүүдэл хууль ёсны болдог."
        )
      );
    }

    if (capture.captures.length > 1) {
      tips.push(
        tip(
          "draughts:chain",
          80,
          "Нэг нүүдэлд хэд хэдэн дүрс идэж болно: идсэн газраа зогсохгүй, цааш идэх боломж байвал үргэлжлүүлэн үсэрнэ."
        )
      );
    }
  }

  if (moves.some((move) => move.promoted)) {
    tips.push(
      tip(
        "draughts:king",
        70,
        "Сүүлийн эгнээнд хүрсэн бэр ХААН болно: хаан урагш, хойш аль ч чигт, хэдэн ч нүд хөдөлнө."
      )
    );
  }

  return tips.sort((a, b) => b.priority - a.priority);
}
