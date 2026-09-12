/**
 * Premium багц ба ҮНЭГҮЙ хоногийн тохиргоо — клиент, сервер хоёулаа
 * импортолдог тул `server-only` ЗААВАЛ ороогүй.
 */

/**
 * Шинэ хэрэглэгч бүртгүүлмэгц авах үнэгүй хоног.
 *
 * ⚠ Тусдаа `isTrial` туг ХАДГАЛДАГГҮЙ — туршилтын хугацаа нь энгийн
 * `users.premiumUntil` дээр л суудаг (`lib/api/premium.ts`). Ингэснээр
 * "туршилт дуусахад юу болох вэ" гэсэн тусдаа cron/логик огт хэрэггүй:
 * хугацаа өнгөрөхөд хэрэглэгч аяндаа ердийн хэрэглэгч болно, харин
 * дараа нь багц худалдаж авбал ижил талбар л сунгагдана.
 */
export const TRIAL_DAYS = 3;

/**
 * Найзын урилгын холбоосоор бүртгүүлэхэд ХОЁУЛАА (урьсан ба урьгдсан)
 * авах нэмэлт үнэгүй хоног.
 *
 * ⚠ БҮРТГЭЛИЙН МӨЧИД ОЛГОГДОХГҮЙ. Хоёр нөхцөл ХАМТДАА биелэх ёстой:
 *   1. урьгдсан талын имэйл БАТАЛГААЖСАН байх,
 *   2. урьгдсан тал ЭХНИЙ хичээлээ жинхэнээсээ дуусгасан байх.
 *
 * Ингэсэн шалтгаан нь farming: бүртгэл дээр шууд олговол хуурамч имэйлээр
 * олон данс үүсгээд хоног цуглуулах боломж нээгддэг. Хоёр нөхцөл нь
 * "жинхэнэ хүн, жинхэнэ хэрэглээ" гэдгийн хамгийн хямд баталгаа
 * (`lib/api/referralReward.ts`).
 *
 * Олгогдмогц үлдсэн хугацаан ДЭЭР нэмэгдэнэ — хоёр талын аль алиных нь
 * үлдсэн хоног шатахгүй.
 */
export const REFERRAL_BONUS_DAYS = 3;

/**
 * УРАМШУУЛАЛ олгогдох найзын ДЭЭД тоо (насан туршид).
 *
 * ⚠ Энэ нь УРИХ ТООНЫ хязгаар БИШ. Найзаа хэдийг ч урьж болно —
 * `api/auth/register` дээр ямар ч тоолол байхгүй, урилга бүр `referrals`
 * хүснэгтэд бүртгэгдэнэ. Хязгаар нь ЗӨВХӨН урьсан талд нэмэгдэх ХОНОГТ
 * (`lib/api/referralReward.ts`). Урьгдсан шинэ хэрэглэгч нь өөрийн НЭГ
 * УДААГИЙН бонусоо ямар ч тохиолдолд авна — тэр хүн лимит дүүрснийг
 * харах ч, мэдэх ч аргагүй.
 *
 * ⚠ Нэрийг нь `REFERRAL_MAX_FRIENDS`-ээс СОЛЬСОН: хуучин нэр нь "дээд
 * тал нь 15 найз урьж болно" гэж уншигдаж, UI-д ч тэр утгаар бичигдсэн
 * байв.
 *
 * ⚠ САРААР БИШ, НАСАН ТУРШИД. Сараар тавибал 15 × 3 = 45 хоног/сар болох
 * бөгөөд энэ нь сарын хугацаанаас урт — өөрөөр хэлбэл хязгаар огт байхгүйтэй
 * адил болж, лимитийн утга учир алдагдана. Насан туршид 15 найз = дээд тал
 * нь 45 хоногийн үнэгүй Premium.
 *
 * Лимитэд хүрсэн ч урилга бүртгэгдсээр байна (`referrals` мөр үүснэ) —
 * зөвхөн УРЬСАН талд хоног нэмэгдэхээ болино. Урьгдсан шинэ хэрэглэгч нь
 * өөрийн НЭГ УДААГИЙН бонусоо ямар ч тохиолдолд авна: тэр хүн лимит
 * дүүрснийг харах ч, мэдэх ч аргагүй.
 */
export const REFERRAL_REWARD_MAX_FRIENDS = 15;

/**
 * Гэр бүлийн багц хамрах ХҮНИЙ ТОО — худалдан авагч + холбогдсон хүүхдүүд.
 *
 * ⚠ Суудал нь ХОЛБООСООР тодорхойлогдоно (`student_links`), тусдаа "гэр
 * бүлийн бүлэг" хүснэгт БАЙХГҮЙ. Эцэг эх хүүхдээ аль хэдийн урилгын кодоор
 * холбодог болсон тул шинэ нэгдэх урсгал зохиох нь хэрэглэгчид хоёр дахь
 * ойлголт (гэр бүлийн код) сурах ачааг үүрүүлнэ.
 *
 * ⚠ Худалдан авагч ӨӨРӨӨ нэг суудал эзэлнэ — 5 суудал = эцэг эх + 4 хүүхэд.
 * Эс бөгөөс "5 хүн" гэдэг нь 6 хүн болж, зарласан үнэ худал болно.
 *
 * ⚠ Энэ тоог БУУРУУЛЖ болохгүй. Аль хэдийн олгогдсон суудлууд
 * `family_seats`-д мөрөөр үлддэг тул хязгаарыг багасгавал тэдгээр гэр бүл
 * хязгаараасаа хэтэрсэн төлөвт орж, шинэ хүүхэд нэмэх боломжгүй болно.
 * Нэмэгдүүлэх нь аюулгүй.
 */
export const FAMILY_SEATS = 5;

/**
 * Худалдан авах багцууд.
 *
 * `days` нь бодит нэмэгдэх хоног, `months` нь ЗӨВХӨН харагдац (сарын дундаж
 * үнэ, хэмнэлт тооцоход) — 30 хоног ≠ 1 хуанлийн сар тул хоёрыг ХОЛИХГҮЙ.
 *
 * ⚠ Үнэ ЗӨВХӨН ЭНД. Сервер төлөх дүнг үргэлж эндээс уншина, клиентээс
 * ХЭЗЭЭ Ч авахгүй (`lib/api/payments.ts`).
 */
export const PLANS = {
  monthly: { id: "monthly", label: "Сарын багц", months: 1, days: 30, amountMnt: 9_900, seats: 1 },
  quarterly: { id: "quarterly", label: "3 сарын багц", months: 3, days: 90, amountMnt: 26_900, seats: 1 },
  halfYear: { id: "halfYear", label: "6 сарын багц", months: 6, days: 180, amountMnt: 49_900, seats: 1 },
  yearly: { id: "yearly", label: "Жилийн багц", months: 12, days: 365, amountMnt: 89_000, seats: 1 },
  family: {
    id: "family",
    label: "Гэр бүлийн багц",
    months: 12,
    days: 365,
    amountMnt: 159_000,
    seats: FAMILY_SEATS,
  },
} as const;

/**
 * Дэлгэцэнд харуулах ДАРААЛАЛ. `Object.keys(PLANS)`-д найдвал дараалал нь
 * объектын түлхүүрийн дарааллаас хамаарах тул энд ил зарлав.
 */
export const PLAN_IDS = ["monthly", "quarterly", "halfYear", "yearly", "family"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

/**
 * ЗӨВХӨН ЭЦЭГ ЭХИЙН эрхтэй хэрэглэгч авах багцууд.
 *
 * ЯАГААД: гэр бүлийн багц нь суудлаа ХОЛБООСООР (`student_links`) тараадаг
 * бөгөөд тэр холбоосыг зөвхөн эцэг эх үүсгэдэг (`lib/api/studentLinks.ts`).
 * Сурагчийн данс энэ багцыг авбал 159,000₮ төлчихөөд суудлаа хэнд ч өгч
 * чадахгүй — 5 суудлын 4 нь мөнхөд хоосон үлдэнэ. Тиймээс худалдан авалтыг
 * НЬ ЭХЛЭХЭЭС нь өмнө хаах нь мөнгө буцаах маргаанаас сэргийлнэ.
 *
 * ⚠ Энэ бол ЖИНХЭНЭ хаалт биш — жинхэнэ нь `api/billing/checkout` дээрх
 * серверийн шалгалт. Энд зөвхөн ЖАГСААЛТ байна (клиент ба сервер хоёулаа
 * уншина) — эс бөгөөс "аль багц хаалттай вэ" гэдэг хоёр газар зөрнө.
 */
export const PARENT_ONLY_PLANS = new Set<PlanId>(["family"]);

export function isParentOnlyPlan(planId: PlanId): boolean {
  return PARENT_ONLY_PLANS.has(planId);
}

/** Тухайн багцыг сард шилжүүлсэн үнэ (₮) — багц хооронд харьцуулахад. */
export function monthlyEquivalent(planId: PlanId): number {
  const plan = PLANS[planId];
  return Math.round(plan.amountMnt / plan.months);
}

/**
 * НЭГ ХҮНД ногдох сарын үнэ (₮).
 *
 * ⚠ Гэр бүлийн багцыг `monthlyEquivalent`-ээр харьцуулж БОЛОХГҮЙ: 159,000 /
 * 12 = 13,250₮ гэдэг нь жилийн багцын 7,417₮-с ҮНЭТЭЙ харагдаж, гэр бүлийн
 * багцыг утгагүй мэт үзүүлнэ. Бодит зүйрлэл нь нэг хүнд ногдох үнэ:
 * 159,000 / 5 / 12 ≈ 2,650₮.
 */
export function perSeatMonthly(planId: PlanId): number {
  const plan = PLANS[planId];
  return Math.round(plan.amountMnt / plan.seats / plan.months);
}

/**
 * Сарын багцтай харьцуулсан хэмнэлт (%). Урт багц нь "хэр ашигтай" гэдгийг
 * тоогоор харуулахгүй бол хэрэглэгч харьцуулж чаддаггүй.
 */
export function savingsPercent(planId: PlanId): number {
  const plan = PLANS[planId];

  /*
   * ⚠ Суудлын тоог ЗААВАЛ тооцно. Гэр бүлийн багц нь 4 хүнийг 12 сар
   * хамардаг тул зүйрлэх "сарын багцаар төлөх" хувилбар нь 12 сар БИШ,
   * 4 × 12 = 48 сарын төлбөр. Үүнийг орхивол 159,000 нь 118,800-аас үнэтэй
   * гарч, хэмнэлт ХАСАХ тоо болно.
   */
  const asMonthly = PLANS.monthly.amountMnt * plan.months * plan.seats;
  return Math.round((1 - plan.amountMnt / asMonthly) * 100);
}

/* -------------------------------------------------------------------------
 * Тэмцээний гишүүнчлэл
 * ---------------------------------------------------------------------- */

/**
 * ТЭМЦЭЭНИЙ ГИШҮҮНЧЛЭЛИЙН ТҮВШНҮҮД — хичээлийн Premium (`PLANS`)-аас ТУСДАА.
 *
 * `freeEntriesPerMonth` — сард ҮНЭГҮЙ бүртгүүлэх тэмцээний тоо, `null` =
 * хязгааргүй. Хэтэрвэл тэмцээн бүрийн оролцох төлбөрийг төлнө — тэр үнийг
 * ТЭМЦЭЭНИЙ СЕРВЕР тогтооно (`lib/api/tournamentServer.ts`).
 *
 * ⚠ "Сар" нь апп-ын цагийн бүсийн ХУАНЛИЙН сар (`tournament_entries.month_key`),
 * гишүүнчлэлийн 30 хоног БИШ. Хуанлийн сараар тоолбол «энэ сард хэд үлдсэн»
 * гэдэг нь бүх хүнд ижил өдөр шинэчлэгдэж, ойлгомжтой байна.
 *
 * ⚠ Үнэ ЗӨВХӨН ЭНД. Сервер төлөх дүнг эндээс уншина, клиентээс ХЭЗЭЭ Ч авахгүй.
 */
export const MEMBERSHIP_TIERS = {
  bronze: { id: "bronze", label: "Bronze", days: 30, amountMnt: 5_900, freeEntriesPerMonth: 2 },
  silver: { id: "silver", label: "Silver", days: 30, amountMnt: 9_900, freeEntriesPerMonth: 5 },
  gold: { id: "gold", label: "Gold", days: 30, amountMnt: 14_900, freeEntriesPerMonth: 10 },
  premium: {
    id: "premium",
    label: "Premium",
    days: 30,
    amountMnt: 19_900,
    freeEntriesPerMonth: null,
  },
} as const;

/** Дэлгэцийн дараалал БА зэрэглэл — индекс их байх тусам өндөр түвшин. */
export const MEMBERSHIP_TIER_IDS = ["bronze", "silver", "gold", "premium"] as const;

export type MembershipTierId = (typeof MEMBERSHIP_TIER_IDS)[number];

export function isMembershipTierId(value: unknown): value is MembershipTierId {
  return (
    typeof value === "string" && (MEMBERSHIP_TIER_IDS as readonly string[]).includes(value)
  );
}

export function tierRank(tierId: MembershipTierId): number {
  return MEMBERSHIP_TIER_IDS.indexOf(tierId);
}

/**
 * ОДОО идэвхтэй түвшин — хугацаа нь өнгөрсөн бол `null`.
 *
 * ⚠ `premiumUntil`-тай ижил зарчим: «идэвхтэй» гэсэн туг хадгалахгүй,
 * хугацаанаас нь тооцно — цуцлах cron хэрэггүй.
 */
export function activeMembershipTier(
  tier: string | null | undefined,
  until: Date | string | null | undefined,
  now = new Date()
): MembershipTierId | null {
  if (!isMembershipTierId(tier) || !until) return null;
  return new Date(until).getTime() > now.getTime() ? tier : null;
}

/** Сард үнэгүй бүртгүүлэх тоо: гишүүнгүй = 0, `null` = хязгааргүй. */
export function freeEntriesPerMonth(tier: MembershipTierId | null): number | null {
  if (!tier) return 0;
  return MEMBERSHIP_TIERS[tier].freeEntriesPerMonth;
}

/**
 * `payments.kind` — нэг хүснэгт гурван төрлийн худалдан авалтыг хадгална.
 *
 *   premium    — хичээлийн Premium (`PLANS`), `planId` = багц
 *   membership — тэмцээний гишүүнчлэл, `planId` = түвшин
 *   tournament — нэг тэмцээний оролцох төлбөр, `ref` = тэмцээний id
 */
export type PaymentKind = "premium" | "membership" | "tournament";

/** Тэмцээний төлбөрийн мөрийн `planId` — `payments.plan_id` NOT NULL тул. */
export const TOURNAMENT_ENTRY_PLAN_ID = "tournament";

/* -------------------------------------------------------------------------
 * Сурталчлагчийн хөтөлбөр
 * ---------------------------------------------------------------------- */

/**
 * Кодтой худалдан авагчид үзүүлэх ХЯМДРАЛ (%).
 *
 * ⚠ Энэ нь ЗӨВХӨН ШИНЭ код үүсгэх үеийн АНХДАГЧ утга. Хувь хэмжээ нь код
 * тус бүрд (`promo_codes.discount_percent`) хадгалагддаг тул энэ тоог
 * өөрчлөхөд аль хэдийн тараагдсан кодуудын нөхцөл ХЭВЭЭР үлдэнэ —
 * сурталчлагч "10% гэж амласан" зараа буцааж татах шаардлагагүй.
 */
export const PROMO_DISCOUNT_PERCENT = 10;

/**
 * Кодын эзэнд ногдох ШИМТГЭЛ (%).
 *
 * ⚠ ТӨЛӨГДСӨН (хямдруулсан) дүнгээс тооцно, багцын жагсаалтын үнээс БИШ.
 * Жишээ нь 9,900₮ багц: худалдан авагч 8,910₮ төлнө, сурталчлагч 891₮
 * авна. Жагсаалтын үнээс тооцвол бодит орлогоос ИЛҮҮ хувь өгч, хямдрал
 * гүнзгийрэх тусам ашиг сөрөг рүү явна.
 */
export const PROMO_COMMISSION_PERCENT = 10;

/** Код зөв хэлбэртэй эсэх — 4-24 тэмдэгт, зөвхөн үсэг, тоо, зураас. */
export const PROMO_CODE_RE = /^[A-Z0-9-]{4,24}$/;

/**
 * Оруулсан кодыг ХЭВШСЭН хэлбэрт буулгана.
 *
 * ⚠ ТОМ үсэг рүү хөрвүүлж, хоосон зайг арилгана: сурталчлагч кодоо
 * "bayar10" гэж зарладаг ч сан дотор "BAYAR10" байна. Хөрвүүлэлтгүй бол
 * хэрэглэгчийн 90% нь "код буруу" гэсэн мессеж хараад буцна.
 */
export function normalizePromoCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Хямдруулсан ТӨЛӨХ дүн (₮).
 *
 * ⚠ Дээш БИШ, ДООШ дугуйлна (`Math.floor`) — хэрэглэгчийн талд. Мөн
 * төгрөгийн бутархай байдаггүй тул бүхэл тоо руу заавал буулгана.
 */
export function discountedAmount(amountMnt: number, discountPercent: number): number {
  const discounted = Math.floor((amountMnt * (100 - discountPercent)) / 100);
  // Хэзээ ч 0 болгохгүй: 100% хямдрал нь QPay нэхэмжлэлийг утгагүй болгоно.
  return Math.max(1, discounted);
}

/** Сурталчлагчид ногдох шимтгэл (₮) — ТӨЛӨГДСӨН дүнгээс. */
export function commissionAmount(paidMnt: number, commissionPercent: number): number {
  return Math.floor((paidMnt * commissionPercent) / 100);
}

/* -------------------------------------------------------------------------
 * НӨАТ-ын баримт (e-barimt)
 * ---------------------------------------------------------------------- */

/**
 * Баримт хэнд бичигдэх вэ.
 *
 *   citizen      — хувь хүн (анхдагч). QPay нь иргэний баримтыг төлбөр
 *                  хийсэн дансны эзэнтэй нь өөрөө холбодог тул биднээс
 *                  нэмэлт мэдээлэл шаардахгүй.
 *   organization — байгууллага. Регистрийн дугаар ЗААВАЛ хэрэгтэй, эс
 *                  бөгөөс НӨАТ-ыг зардалдаа тооцуулж чадахгүй.
 */
export const EBARIMT_TYPES = ["citizen", "organization"] as const;
export type EbarimtType = (typeof EBARIMT_TYPES)[number];

export function isEbarimtType(value: unknown): value is EbarimtType {
  return typeof value === "string" && (EBARIMT_TYPES as readonly string[]).includes(value);
}

/**
 * Байгууллагын регистрийн дугаар — ЯГ 7 ОРОН.
 *
 * ⚠ Хувь хүний регистр (2 үсэг + 8 орон) ЭНД тохирохгүй, зориуд: иргэний
 * баримтад регистр шаардахгүй бөгөөд түүнийг хүлээж авбал бид хувийн
 * мэдээллийг шаардлагагүйгээр хадгалж эхэлнэ.
 */
export const ORG_REGISTER_RE = /^\d{7}$/;

export function isValidRegisterNo(value: string): boolean {
  return ORG_REGISTER_RE.test(value.trim());
}
