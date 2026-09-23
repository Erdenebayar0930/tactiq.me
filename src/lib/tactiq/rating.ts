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

// ---------------------------------------------------------------------------
// ЧАНСААНЫ ЦӨМ — `docs/rating-system.md` §2
// ---------------------------------------------------------------------------

/** Шинэ тоглогчийн эхлэлийн чансаа (`docs/rating-system.md` §1). */
export const START_RATING = 1500;

/**
 * ДООД ХЯЗГААР.
 *
 * ⚠ Урьдын `MIN_RATING = 100` нь хэт доогуур: тэр тоо ямар ч утга
 * агуулахгүй. 800 нь «дүрмээ сурч байна» гэсэн доод цэг — үүнээс доош
 * унасан хүүхэд «би чадахгүй» гэж бууна.
 */
export const RATING_FLOOR = 800;

/**
 * НЭГ ТОГЛОЛТЫН дээд өөрчлөлт.
 *
 * ⚠ 2400 vs 800 гэсэн хачирхалтай хос үүсвэл (эсвэл манипуляци) нэг
 * тоглолт 200 оноо хөдөлгөх боломжтой. Хязгаар нь тэр цоорхойг барина.
 */
export const MAX_CHANGE = 80;

/**
 * K коэффициент — `docs/rating-system.md` §2.2.
 *
 * ⚠ Хуучин `kFactor(gamesPlayed, rating)` -аас ЯЛГААТАЙ: placement нь 40
 * биш 50 (40 бол 10 тоглолтод ±250 л хүрнэ — жинхэнэ хүч 1900 байсан
 * хүүхэд placement-ээс 1750 гарч, дараа нь 30 тоглолт зарцуулна).
 *
 * ⚠ ДООД ХЭСЭГТ K ӨНДӨР (24): тэнд тоглогч хурдан хөгждөг (хүүхэд сурч
 * байна) — K бага байвал чансаа нь хөгжлөөс хоцорно.
 */
export function ratingK(gamesPlayed: number, rating: number): number {
  if (gamesPlayed < PROVISIONAL_GAMES) return 50;
  if (gamesPlayed < 30) return 32;
  if (rating >= 2200) return 16;
  if (rating < 1100) return 24;
  return 20;
}

/**
 * ДАВТАН тоглолтын жин — `docs/rating-system.md` §5.4.
 *
 * ⚠ ЯАГААД: 60 минутын арена-д хоёр хүн 15 удаа тоглож болно. Бүрэн
 * жинтэй бол тэр арена нь тэдний хоёрын «дуэль» болж, чансаа нь бусад
 * тоглогчдын талаар юу ч хэлэхгүй болно. Мөн хоёр найз бие биенээсээ
 * оноо цуглуулах схемийг таслана.
 */
export function rematchWeight(index: number): number {
  if (index <= 0) return 1;
  if (index === 1) return 0.5;
  if (index === 2) return 0.25;
  return 0.1;
}

/**
 * ХЭТ ЗӨРҮҮТЭЙ хосыг үнэлэхгүй — `docs/rating-system.md` §6.4.
 *
 * ⚠ 600+ зөрүүтэй үед хүчтэй талын ялалт ~0.6 оноо л өгнө, харин СУЛ
 * талын хожил 19 оноо авна. Энэ тэнцвэргүй байдал нь «сул хаягтай
 * тоглож оноо цуглуулах» схемийн үндэс болдог.
 */
export const UNRATED_GAP = 600;

export type RatedSide = {
  rating: number;
  gamesPlayed: number;
};

export type RatingChangeResult = {
  expected: number;
  k: number;
  weight: number;
  change: number;
  next: number;
};

/**
 * НЭГ ТАЛЫН чансааны өөрчлөлт.
 *
 * ⚠ ХОЖИГДОЛ нь ОНОО ХАСНА — тэмцээн, ердийн тоглолт хоёрт ИЖИЛ. Elo нь
 * тэг нийлбэртэй: ялсан талын авсан оноо нь хожигдсон талаас гардаг.
 * Зөвхөн нэг тал авдаг систем нь чансааг «тоглосон тоо» болгож, хүчийг
 * хэмжихээ болино.
 *
 * ⚠ БӨӨРӨНХИЙЛӨЛТ зөвхөн ЭНД (хадгалахын өмнө): дундын тооцоонд
 * бөөрөнхийлвөл олон тоглолтын турш алдаа хуримтлагдана.
 */
export function computeRatingChange(
  self: RatedSide,
  opponent: RatedSide,
  score: 0 | 0.5 | 1,
  weight = 1
): RatingChangeResult {
  const expected = expectedScore(self.rating, opponent.rating);

  let k = ratingK(self.gamesPlayed, self.rating);
  /*
   * ⚠ PROVISIONAL ӨРСӨЛДӨГЧТЭЙ тоглоход K ХАГАСЛАНА: түүний 1500 гэсэн
   * тоо нь БАРИМТ БИШ, ТААМАГ. Түүний эсрэг ялалтаас тогтворжсон
   * тоглогч бүтэн оноо авбал шинэ хүнийг «шүүх» болно. Provisional тал
   * нь өөрийн бүтэн K-гаараа хөдөлсөөр байна — тэр хөдлөх ЁСТОЙ.
   */
  if (isProvisional(opponent.gamesPlayed)) k *= 0.5;

  const raw = k * weight * (score - expected);
  const change = Math.round(Math.max(-MAX_CHANGE, Math.min(MAX_CHANGE, raw)));

  return {
    expected,
    k,
    weight,
    change,
    next: Math.max(RATING_FLOOR, self.rating + change),
  };
}
