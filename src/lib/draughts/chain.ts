/**
 * ИДЭЛТИЙН ХЭЛХЭЭГ АЛХАМ АЛХМААР — хичээлийн дасгалд.
 *
 * ⚠ ЯАГААД: даамын хөдөлгүүр нь хэлхээт идэлтийг НЭГ нүүдэл гэж үздэг
 * (`from` → сүүлийн буулт). Тоглолтод энэ нь зөв — нүүдэл нь атомар.
 * Гэвч ХИЧЭЭЛД сурагч «Б2-аас Ж8 руу» гэсэн хоёр нүдийг хараад дундах
 * гурван идэлтийг ТӨСӨӨЛӨХ шаардлагатай болдог. Даам сурч байгаа
 * хүүхдэд яг тэр дундах алхмууд нь СУРАХ ЗҮЙЛ.
 *
 * Тиймээс дасгал дээр идэлт БҮРД зогсоно: сурагч дараагийн буултаа
 * дарж, хөлөг дээр идэгдсэн дүрс зэрэг арилна.
 *
 * ⚠ `server-only` БИШ, React ч БИШ: цэвэр функцууд. Ингэснээр хоёр
 * дасгалын компонент (`draughts-move`, `draughts-puzzle`) ижил логик
 * хуваалцана — хоёр газар бичвэл нэг нь хоцорно.
 *
 * ⚠ ХЭЛХЭЭГ ӨӨРӨӨ ХЭРЭГЖҮҮЛЭХГҮЙ: хөдөлгүүрийн байрлал ХӨНДӨГДӨХГҮЙ,
 * зөвхөн ХАРУУЛАХ хөлөг тооцоологдоно. Хэлхээ бүтэн дуусмагц дуудагч
 * `applyMove`-оор НЭГ УДАА хэрэгжүүлнэ — эс бөгөөс дундуур таслагдсан
 * хэлхээ нь хөдөлгүүрийг буцаах аргагүй эвдэрсэн байрлалд оруулна.
 */
import type { Board, DraughtsMove, Square } from "./engine";

/** Хэлхээний ЯВЦ — сурагч аль хэдийн дарсан буултууд. */
export type ChainState = {
  /**
   * Одоог хүртэлх даралтад тохирох БҮХ боломжит хэлхээ.
   *
   * ⚠ НЭГ БИШ: ижил эхний буулттай хоёр өөр хэлхээ байж болно (дараа нь
   * сална). Аль нэгийг эрт сонгоод хаявал сурагчийн зөв үргэлжлэл
   * «хууль бус» гэж татгалзагдана.
   */
  candidates: DraughtsMove[];
  /** Дараагийн дарах ёстой буултын индекс (`landings`-д). */
  step: number;
};

export type ChainStep =
  | { kind: "illegal" }
  /** Хэлхээ үргэлжилнэ — дүрс дундах буулт дээр зогсож байна. */
  | { kind: "partial"; state: ChainState }
  /** Хэлхээ дууслаа — дуудагч тал `applyMove(move)` хийнэ. */
  | { kind: "complete"; move: DraughtsMove };

const same = (a: Square, b: Square) => a.row === b.row && a.col === b.col;

/**
 * Дүрс ОДОО хаана байна.
 *
 * ⚠ `step - 1`: `step` нь ДАРААГИЙН буултын индекс тул одоогийн байрлал
 * нь түүний өмнөх буулт.
 */
export function chainPosition(state: ChainState): Square {
  const [first] = state.candidates;
  return state.step === 0 ? first.from : first.landings[state.step - 1];
}

/** Дүрсийг дараагийн буулт руу нь дарах — хэлхээний эхний даралт. */
export function startChain(moves: DraughtsMove[], from: Square, to: Square): ChainStep {
  const candidates = moves.filter(
    (move) => same(move.from, from) && move.landings.length > 0 && same(move.landings[0], to)
  );
  return narrow(candidates, 1);
}

/** Хэлхээний дараагийн даралт. */
export function advanceChain(state: ChainState, to: Square): ChainStep {
  const candidates = state.candidates.filter(
    (move) => move.landings.length > state.step && same(move.landings[state.step], to)
  );
  return narrow(candidates, state.step + 1);
}

/**
 * ⚠ «ДУУССАН» нь ЗӨВХӨН хэлхээ цааш үргэлжлэх БОЛОМЖГҮЙ болсон үед.
 *
 * Даамын «максималь идэлт» дүрмээр `legalMoves()` нь аль хэдийн хамгийн
 * урт хэлхээнүүдийг л буцаадаг тул «дундуур зогсох» хувилбар байхгүй —
 * тиймээс `landings.length === step` байх хэлхээ БАЙВАЛ тэр нь бүтэн
 * хэлхээ.
 */
function narrow(candidates: DraughtsMove[], step: number): ChainStep {
  if (candidates.length === 0) return { kind: "illegal" };

  const finished = candidates.find((move) => move.landings.length === step);
  if (finished) return { kind: "complete", move: finished };

  return { kind: "partial", state: { candidates, step } };
}

/**
 * ХАРУУЛАХ хөлөг — дундах байрлалыг зурна.
 *
 * ⚠ Хөдөлгүүрийн хөлгийг ХӨНДӨХГҮЙ (хуулбар дээр ажиллана): хэлхээ
 * дундуур сурагч буруу нүд дарж таслагдвал байрлал эргэж ирэх ёстой.
 *
 * ⚠ ХААН БОЛГОХГҮЙ: олон улсын дүрмээр бэр нь хааны эгнээг ДАМЖИН
 * гарвал хаан болохгүй (`engine.ts`-ийн тайлбар). Хаан болох нь зөвхөн
 * хэлхээ ТЭНД дуусвал — тэр үед `applyMove` өөрөө шийднэ.
 */
export function chainBoard(board: Board, state: ChainState): Board {
  const next = board.map((row) => row.slice());
  const [move] = state.candidates;

  const piece = next[move.from.row][move.from.col];
  if (!piece) return next;

  next[move.from.row][move.from.col] = null;

  // Одоог хүртэл идэгдсэн дүрсүүд — `captures[i]` нь `landings[i]`-тэй зэрэгцээ.
  for (let index = 0; index < state.step && index < move.captures.length; index += 1) {
    const victim = move.captures[index];
    next[victim.row][victim.col] = null;
  }

  const at = chainPosition(state);
  next[at.row][at.col] = piece;

  return next;
}

/** Хэлхээний дараагийн боломжит буултууд — хөлөг дээр тодотголд. */
export function chainTargets(state: ChainState): Square[] {
  const seen = new Set<string>();
  const targets: Square[] = [];

  for (const move of state.candidates) {
    const landing = move.landings[state.step];
    if (!landing) continue;
    const key = `${landing.row},${landing.col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push(landing);
  }

  return targets;
}
