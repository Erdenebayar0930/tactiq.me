/**
 * Долоо хоногийн лиг — Duolingo маягийн өрсөлдөөн.
 *
 * Клиент, сервер хоёулаа импортолдог тул `server-only` ЗААВАЛ ороогүй.
 *
 * ДҮРЭМ: хэрэглэгч бүр СУРГУУЛЬ ТУС БҮРД ~`COHORT_SIZE` хүнтэй БҮЛЭГТ
 * (cohort) хуваарилагдаж, долоо хоногийн турш тэр сургуулийн курсуудаар
 * цуглуулсан XP-ээр өрсөлдөнө. Долоо хоног дуусахад дээд `PROMOTE_COUNT`
 * нь дээд шатанд гарч, доод `DEMOTE_COUNT` нь доош бууна.
 *
 * ⚠ ЛИГ НЬ СУРГУУЛИАР (Mind · Оюун ухаан, Codely, ITkids …). Урьд нь курс
 * тус бүрд тусдаа байсан — 39 курст хуваагдсан бүлгүүд хэт жижиг, хоосон
 * байв. Сургуулиар нэгтгэхэд шатар, даам, математик сурч буй хүүхдүүд нэг
 * «Mind» лигт өрсөлдөнө, харин код сурч буй хүүхэдтэй хольдохгүй.
 *
 * ⚠ ЭНЭ НЬ `rating.ts`-ЭЭС ӨӨР ОЙЛГОЛТ: лиг нь ДОЛОО ХОНОГИЙН ХИЧЭЭЛИЙН
 * идэвхийг (XP), Elo нь ТОГЛОЛТЫН хүчийг хэмжинэ. Хичээлдээ шамдуу хүүхэд
 * тоглоомдоо сул байж болно — хоёуланг нь нэг тоо болгож хольбол аль аль нь
 * утгаа алдана.
 */

import { SCHOOLS } from "./schools";

/**
 * Шатлал — доогуураас дээш. Индекс нь сангийн `tier` багана.
 *
 * ⚠ Дараалал ХЭЗЭЭ Ч өөрчлөгдөхгүй, зөвхөн ТӨГСГӨЛД нэмэгдэнэ: индекс нь
 * сангийн мөрүүдэд хадгалагдсан тул дунд нь шат оруулбал бүх хэрэглэгчийн
 * шат чимээгүйхэн шилжинэ.
 */
export const LEAGUE_TIERS = [
  /*
   * ⚠ ЭХЛЭЛИЙН ШАТ — Хүрэл. Бүх шинэ сурагч, шинэ курс эндээс эхэлнэ.
   *
   * Урьд нь Хүрэлээс ДООР «Төмөр» шат байсныг ХАССАН.
   * `drizzle/0035_drop_iron_coral_tier.sql` нь Төмөр лигийнхнийг Хүрэлд
   * нэгтгэж, Маргад хүртэлх шатнуудын индексийг нэгээр бууруулсан.
   */
  { key: "bronze", label: "Хүрэл", color: "#a97142" },
  { key: "silver", label: "Мөнгө", color: "#9ca3af" },
  { key: "gold", label: "Алт", color: "#eab308" },
  /*
   * ⚠ ДУНД НЬ ОРУУЛСАН — `drizzle/0023_emerald_tier.sql` дээр өгөгдлийг
   * зөөсөн. Байрлалыг сонгохдоо ХӨРШ ШАТНЫ ӨНГИЙГ бодов: ногооныг Оюуны
   * (`#14b8a6`, номин ногоон) хажууд тавибал хоёр шат зэрэгцээд бараг
   * ялгагдахгүй. Энд Алт (шар) ба Шүр (улбар шар) хоёрын дунд байна.
   */
  { key: "emerald", label: "Маргад", color: "#059669" },
  /*
   * ⚠ ДУНД НЬ ОРУУЛСАН — Төмрийг хассантай НЭГ миграцаар
   * (`drizzle/0035_drop_iron_coral_tier.sql`). Нэг шат хасагдаж, нэг шат
   * нэмэгдсэн тул Бадмаараг ба түүнээс дээших шатны индекс ӨӨРЧЛӨГДӨӨГҮЙ.
   *
   * Өнгө: Маргад (ногоон) ба Бадмаараг (улаан) хоёрын дунд улбар шар —
   * хөрш шатнаас тод ялгарна. Сувд (цагаан) нь Мөнгөтэй, Хаш (ногоон) нь
   * Маргадтай хэт ойр байсан тул сонгоогүй.
   */
  { key: "coral", label: "Шүр", color: "#f97316" },
  /*
   * ⚠ ЭНЭ ШАТЫГ ДУНД НЬ ОРУУЛСАН — индекс шилжсэн тул сангийн өгөгдлийг
   * `drizzle/0021_ruby_tier.sql` дээр +1-ээр зөөсөн (`course_leagues`,
   * `league_cohorts`, `league_members`).
   *
   * Дахин ийм зүйл хийвэл ТЭР МИГРАЦИЙГ БИЧИХГҮЙ ОРХИЖ БОЛОХГҮЙ: индекс
   * нь сангийн мөрүүдэд хадгалагддаг тул зөвхөн кодыг өөрчилвөл Индранил
   * лигт байсан бүх сурагч чимээгүйхэн Бадмаараг болж "буурна".
   */
  { key: "ruby", label: "Бадмаараг", color: "#e11d48" },
  { key: "sapphire", label: "Индранил", color: "#3b82f6" },
  { key: "turquoise", label: "Оюу", color: "#14b8a6" },
  { key: "crystal", label: "Болор", color: "#a855f7" },
] as const;

export type LeagueTier = (typeof LEAGUE_TIERS)[number];

/**
 * ЛИГИЙН ТҮЛХҮҮР = сургуулийн `slug` (`lib/tactiq/schools.ts`).
 *
 * Курсийн XP нь тэр курсийн `courses.school`-ийн лигт орно. Сургууль
 * заагаагүй (эсвэл танигдаагүй) курс → «Бусад» (`OTHER_LEAGUE`) — XP нь
 * алга болохгүй.
 *
 * ⚠ Сангийн лигийн хүснэгтүүдийн `course_slug` баганад ЭНЭ түлхүүр
 * бичигдэнэ. Баганын нэрийг өөрчлөөгүй нь DDL-гүй шилжих, хуучин курсийн
 * долоо хоногуудын түүхийг хадгалах зорилготой
 * (`drizzle/0036_school_leagues.sql`).
 */
export const OTHER_LEAGUE = "other";

export function leagueKeyForSchool(school: string | null | undefined): string {
  const found = SCHOOLS.find((item) => item.slug === school);
  return found ? found.slug : OTHER_LEAGUE;
}

/**
 * Курсын XP орох БҮХ лиг — курс олон сургуульд байвал тус бүрийнх.
 *
 * Хоосон (сургуульгүй) бол «Бусад». Танигдаагүй slug-ууд «Бусад» болж
 * нэгтгэгдэнэ — нэг хичээлийн XP «Бусад»-д хоёр удаа орохгүй.
 */
export function leagueKeysForSchools(schools: readonly string[]): string[] {
  const keys = [...new Set(schools.map(leagueKeyForSchool))];
  return keys.length > 0 ? keys : [OTHER_LEAGUE];
}

/** Сонгогч дээрх нэр — «Mind · Оюун ухаан». */
export function leagueTitle(key: string): string {
  const school = SCHOOLS.find((item) => item.slug === key);
  return school ? `${school.title} · ${school.subtitle}` : "Бусад";
}

/** Сонгогчийн тогтмол дараалал — сургуулийн дараалал, «Бусад» хамгийн сүүлд. */
export function leagueOrder(key: string): number {
  const index = SCHOOLS.findIndex((item) => item.slug === key);
  return index === -1 ? SCHOOLS.length : index;
}

export const TOP_TIER = LEAGUE_TIERS.length - 1;

/**
 * Нэг бүлэгт байх ХАМГИЙН ИХ хүний тоо.
 *
 * ⚠ Зориуд БАГА. 30 хүнтэй жагсаалтад дунджийн сурагч 15-20 дугаар байранд
 * зогсох бөгөөд дээш ч, доош ч хөдлөхгүй — өрсөлдөөн нь түүнд ХАМААРАЛГҮЙ
 * болно. 20 хүнтэй бүлэгт дээд 5, доод 4 нь хөдөлдөг тул бараг хүн бүр
 * долоо хоног бүр аль нэг ирмэгт ойрхон байна.
 */
export const COHORT_SIZE = 20;

/**
 * Дээш гарах / доош буух байрны тоо.
 *
 * ⚠ `PROMOTE_COUNT + DEMOTE_COUNT` нь `COHORT_SIZE`-ээс МЭДЭГДЭХҮЙЦ бага
 * байх ёстой — эс бөгөөс дунд нь "аюулгүй" бүс үлдэхгүй бөгөөд лиг нь
 * шатлал биш, санамсаргүй хөдөлгөөн болно.
 */
export const PROMOTE_COUNT = 5;
export const DEMOTE_COUNT = 4;

/**
 * Хэдэн долоо хоног ХИЧЭЭЛГҮЙ өнгөрвөл нэг шат бууруулах вэ.
 *
 * ⚠ Долоо хоног өнжих нь ШИЙТГЭЛГҮЙ — тэр долоо хоногт хэрэглэгч бүлэгт
 * огт нэгддэггүй тул дүгнэгдэх мөр байхгүй. Зөвхөн УРТ (сар) завсарлага
 * шатыг бууруулна: эс бөгөөс нэг удаа Очир лигт хүрсэн хүн хэзээ ч буцаж
 * буухгүй бөгөөд дээд лиг нь идэвхгүй данснуудаар дүүрнэ.
 */
export const IDLE_WEEKS_TO_DEMOTE = 4;

/** Хүрээнээс гарсан шатыг эрүүл утга руу татна (сангийн хуучин мөрөнд ч найдвартай). */
export function clampTier(tier: number): number {
  if (!Number.isFinite(tier)) return 0;
  return Math.min(TOP_TIER, Math.max(0, Math.trunc(tier)));
}

export function tierInfo(tier: number): LeagueTier {
  return LEAGUE_TIERS[clampTier(tier)];
}

export type LeagueOutcome = "promoted" | "demoted" | "stayed";

/**
 * Байрнаас нь дараагийн шатыг тооцно.
 *
 * ⚠ `size` нь бүлгийн БОДИТ хүний тоо — `COHORT_SIZE` БИШ. Долоо хоногийн
 * турш бүлэг дүүрдэггүй байж болно: 8 хүнтэй бүлгээс 7-г нь дэвшүүлээд
 * 5-ыг нь бууруулбал бараг бүгд хоёуланд нь орох тул хил давхцана. Тиймээс
 * жинхэнэ тоогоор хязгаарлана.
 */
export function outcomeForRank(
  rank: number,
  size: number,
  tier: number
): LeagueOutcome {
  const current = clampTier(tier);

  // Хамгийн дээд шатанд дэвших газар байхгүй; хамгийн доод шатанд буух газар
  // байхгүй — тэр тохиолдолд "хэвээр" гэж үзнэ.
  if (rank <= PROMOTE_COUNT && current < TOP_TIER) return "promoted";

  /*
   * Дэвшихээр тэмдэглэгдсэн байрууд буухаас ХАМГААЛАГДСАН: жижиг бүлэгт
   * (жишээ нь 10 хүн) доод 5 нь 6-10 байр, дээд 7 нь 1-7 байр болж 6-7
   * байр ХОЁУЛАНД нь таарна. Дээшлэх нь давуу эрхтэй.
   */
  const demoteFrom = Math.max(PROMOTE_COUNT + 1, size - DEMOTE_COUNT + 1);
  if (rank >= demoteFrom && current > 0) return "demoted";

  return "stayed";
}

/** Дараагийн шат — үр дүнгээс. */
export function nextTier(tier: number, outcome: LeagueOutcome): number {
  const current = clampTier(tier);
  if (outcome === "promoted") return clampTier(current + 1);
  if (outcome === "demoted") return clampTier(current - 1);
  return current;
}
