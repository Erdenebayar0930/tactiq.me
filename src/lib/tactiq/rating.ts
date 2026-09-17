/**
 * Elo үнэлгээ — шатар/даамын тоглолтын үр дүнгээр өсдөг, буурдаг тоо.
 *
 * Клиент, сервер хоёулаа импортолдог (клиент нь "энэ тоглолтод хэд авах вэ"
 * гэдгийг УРЬДЧИЛАН харуулна) тул `server-only` ЗААВАЛ ороогүй.
 *
 * ⚠ ЖИНХЭНЭ ТООЦОО ЗӨВХӨН СЕРВЕР ДЭЭР (`lib/api/rating.ts`). Энд байгаа нь
 * цэвэр функцууд — клиент тэдгээрийг ХАРАГДАЦАД ашиглана, харин сандаа
 * бичигдэх утга нь ҮРГЭЛЖ серверийн дуудлагаас гарна.
 */

/** Шинэ тоглогчийн эхлэлийн үнэлгээ — олон улсын жишгээр 1200. */
export const DEFAULT_RATING = 1200;

/** Үнэлгээ хэзээ ч энэ доогуур унахгүй — эхлэгчийг бүрэн урам хугалахгүйн тулд. */
export const MIN_RATING = 100;

/**
 * Ботын үнэлгээ — түвшин тус бүрд ТОГТМОЛ.
 *
 * ⚠ Эдгээр тоо нь ботын бодит хүчийг ЯГ хэмжсэн утга БИШ, харин "эхлэгчийг
 * яллаа = 800-ын эсрэг ялалт" гэсэн ТОХИРОЛЦОО. Хэрэв ботын хүч (`SEARCH_DEPTH`,
 * `lib/chess/bot.ts`) өөрчлөгдвөл ЭНД мөн засах ёстой — эс бөгөөс тоглогчид
 * хүчирхэгжсэн ботоос хэт олон оноо алдана.
 */
export const BOT_RATINGS = {
  beginner: 800,
  intermediate: 1200,
  advanced: 1600,
} as const;

export type GameOutcome = "win" | "loss" | "draw";

/** Үр дүнгийн тоон утга — Elo томьёоны `S`. */
const SCORE: Record<GameOutcome, number> = { win: 1, loss: 0, draw: 0.5 };

/**
 * Хүлээгдэж буй оноо — "энэ хоёрын хооронд хэдэн хувийн магадлалаар ялах вэ".
 *
 * 400 гэсэн тоо нь Elo-гийн тодорхойлолт: 400 оноогоор давуу тоглогч ~10
 * дахин их магадлалаар ялна.
 */
export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

/**
 * K коэффициент — нэг тоглолт үнэлгээг хэр их хөдөлгөх вэ.
 *
 * Шинэ тоглогчид ӨНДӨР K: тэдний жинхэнэ хүч хараахан тодорхойгүй тул
 * үнэлгээ нь хурдан "зөв газраа" очих ёстой. Туршлагатай, өндөр үнэлгээтэй
 * тоглогчид БАГА K: тэдний тоо аль хэдийн найдвартай тул нэг санамсаргүй
 * хожигдол түүнийг эргүүлж хаях ёсгүй.
 */
export function kFactor(gamesPlayed: number, rating: number): number {
  if (gamesPlayed < 20) return 40;
  return rating >= 2000 ? 10 : 20;
}

/**
 * Тоглолтын дараах шинэ үнэлгээ.
 *
 * ⚠ Бүхэл тоо руу бүхэлчилнэ (`round`) — бутархай үнэлгээ хадгалбал
 * харагдац бүрд өөр өөрөөр бүхэлчлэгдэж, хэрэглэгч "яагаад 1204 гэж
 * харагдаад 1203 болчихов" гэж эргэлзэнэ.
 */
export function nextRating(
  rating: number,
  opponentRating: number,
  outcome: GameOutcome,
  gamesPlayed: number
): number {
  const k = kFactor(gamesPlayed, rating);
  const delta = k * (SCORE[outcome] - expectedScore(rating, opponentRating));
  return Math.max(MIN_RATING, Math.round(rating + delta));
}

/** Тоглолтын өөрчлөлт (+12 / −8) — дүнгийн дэлгэцэнд харуулахад. */
export function ratingDelta(
  rating: number,
  opponentRating: number,
  outcome: GameOutcome,
  gamesPlayed: number
): number {
  return nextRating(rating, opponentRating, outcome, gamesPlayed) - rating;
}

/**
 * Үнэлгээний зэрэглэлийн нэр — цэвэр тоо нь эхлэгчид утга илэрхийлдэггүй.
 *
 * ⚠ League-ийн ШАТЛААС (`lib/tactiq/league.ts`) огт ӨӨР ойлголт: энэ нь
 * ТОГЛОЛТЫН хүчийг, тэр нь ДОЛОО ХОНОГИЙН ХИЧЭЭЛИЙН идэвхийг хэмжинэ.
 * Хоёрыг хольж болохгүй — нэг хүн хичээлдээ шамдуу ч тоглоомдоо сул байж
 * болно.
 */
export function ratingTitle(rating: number): string {
  if (rating < 800) return "Шинэхэн";
  if (rating < 1000) return "Эхлэгч";
  if (rating < 1200) return "Сонирхогч";
  if (rating < 1400) return "Дадлагатай";
  if (rating < 1600) return "Сайн тоглогч";
  if (rating < 1800) return "Хүчтэй тоглогч";
  if (rating < 2000) return "Мастер";
  return "Их мастер";
}

/**
 * PLACEMENT-ийн урт — хэдэн тоглолт хүртэл чансаа «тодорхойгүй» вэ.
 *
 * ⚠ Тусдаа `provisional` БАГАНА БАЙХГҮЙ, зориуд: тоо нь
 * `ratingGames`-ээс гарна. Хоёр эх сурвалж байвал тэд зөрөх бөгөөд
 * аль нь зөв гэдгийг хэн ч мэдэхгүй болно
 * (`docs/rating-system.md` §12.1).
 *
 * ⚠ ЖАГСААЛТАД ОРОХ хязгаар нь мөн энэ: 2 тоглолттой хүн санамсаргүй
 * 1900 болж тэргүүнд гарвал бүх жагсаалтын итгэл унана.
 */
export const PROVISIONAL_GAMES = 10;

/** Чансаа нь хараахан тодорхойгүй эсэх. */
export function isProvisional(gamesPlayed: number): boolean {
  return gamesPlayed < PROVISIONAL_GAMES;
}
