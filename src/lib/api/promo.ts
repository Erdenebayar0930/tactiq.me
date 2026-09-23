import "server-only";

import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { payments, promoCodes, promoPayouts, users } from "@/lib/db/schema";
import {
  commissionAmount,
  discountedAmount,
  normalizePromoCode,
  PROMO_CODE_RE,
} from "@/lib/billing";

import type { PromoCodeRow, PromoTier } from "@/lib/db/schema";

/**
 * СУРТАЛЧЛАГЧИЙН ХӨТӨЛБӨР — код шалгах, шимтгэл тооцох цорын ганц газар.
 *
 * ⚠ МӨНГӨНИЙ КОД. Гурван дүрмийг ХЭЗЭЭ Ч зөрчихгүй:
 *
 *   1. ХЯМДРАЛЫГ СЕРВЕР ТООЦНО. Клиент зөвхөн КОДЫГ илгээнэ — хямдруулсан
 *      дүнг илгээвэл хэрэглэгч өөрөө үнээ тогтооно.
 *   2. ӨӨРИЙН КОДЫГ ӨӨРӨӨ АШИГЛАХГҮЙ. Эс бөгөөс хүн бүр өөрийн кодоор
 *      10% хямдрал АВААД, дээрээс нь 10% шимтгэл өөртөө бичүүлнэ.
 *   3. ШИМТГЭЛ НЬ ТӨЛӨГДСӨН ДҮНГЭЭС. Жагсаалтын үнээс тооцвол бодит
 *      орлогоос илүү хувь тарааж, ашиг сөрөг болно.
 */

/**
 * ШАТАЛСАН ХУВЬ — «эхний 50 хүүхэд 50%, дараагийн 75 нь 25%».
 *
 * @param used Кодоор ТӨЛБӨРӨӨ БАТАЛГААЖУУЛСАН ӨӨР ӨӨР хүүхдийн тоо.
 * @returns Тухайн мөчид хэрэгжих хувь, эсвэл `null` (шат дүүрсэн →
 *   кодын үндсэн хувь хэрэгжинэ).
 *
 * ⚠ ЦЭВЭР ФУНКЦ, санд хандахгүй: ингэснээр дүрмийг туршилтаар шалгах,
 * мөн UI дээр «одоо ямар шат явж байна» гэдгийг ижил логикоор
 * харуулах боломжтой.
 */
export function pickPromoTier(
  tiers: PromoTier[] | null | undefined,
  used: number
): PromoTier | null {
  if (!Array.isArray(tiers) || tiers.length === 0) return null;

  /*
   * ⚠ ХУРИМТЛАЛААР шалгана: `limit` нь тухайн шатны ХЭМЖЭЭ тул
   * хоёрдугаар шат нь 50-125 хооронд хэрэгжинэ. Нийлбэрээр хадгалбал
   * админ 125 гэж бичих шаардлагатай болж, ямагт эндүүрнэ.
   */
  let ceiling = 0;
  for (const tier of tiers) {
    ceiling += Math.max(0, tier.limit);
    if (used < ceiling) return tier;
  }
  return null;
}

/**
 * Кодоор төлбөрөө БАТАЛГААЖУУЛСАН хүүхдийн тоо.
 *
 * ⚠ `count(distinct uid)`: нэг хүүхэд хоёр багц авбал «хоёр хүүхэд» гэж
 * тоологдох ёсгүй — нөхцөл нь ХҮҮХДИЙН тоогоор бичигдсэн.
 *
 * ⚠ ЗӨВХӨН "paid": хүлээгдэж буй нэхэмжлэл нь мөнгө БИШ. Түүнийг
 * тоолбол хэн нэгэн нэхэмжлэл үүсгээд төлөхгүй байх замаар шатыг
 * дүүргэж, бусдын хямдралыг хааж чадна.
 */
export async function countPromoBuyers(code: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${payments.uid})::int` })
    .from(payments)
    .where(and(eq(payments.promoCode, code), eq(payments.status, "paid")));

  return row?.n ?? 0;
}

export type PromoResolution = {
  code: string;
  promoterUid: string;
  discountPercent: number;
  commissionPercent: number;
  /** Хямдруулсан ТӨЛӨХ дүн (₮). */
  amountMnt: number;
  /** Хэдэн төгрөг хэмнэсэн — UI-д харуулахад. */
  discountMnt: number;
  /**
   * Хэрэгжсэн шатны дугаар (1-ээс), эсвэл `null` — үндсэн хувь.
   *
   * UI дээр «эхний 50-д багтлаа» гэдгийг хэлэхэд хэрэгтэй.
   */
  tierIndex: number | null;
};

/**
 * Кодыг шалгаж, тухайн багцад ногдох хямдралыг тооцно.
 *
 * @param buyerUid Худалдан авах гэж буй хүн — ӨӨРИЙН кодыг таслахад.
 * @returns `null` = код байхгүй, идэвхгүй, эсвэл өөрийнх нь код.
 */
export async function resolvePromo(
  rawCode: string,
  buyerUid: string,
  listPriceMnt: number
): Promise<PromoResolution | null> {
  const code = normalizePromoCode(rawCode);
  if (!PROMO_CODE_RE.test(code)) return null;

  const [row] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, code))
    .limit(1);

  if (!row || !row.active) return null;

  /*
   * ⚠ ӨӨРИЙН КОД. Энэ шалгалт нь хөтөлбөрийн эдийн засгийг барьж байгаа
   * ГАНЦ мөр: үүнгүйгээр хэрэглэгч бүр өөрийн кодоор мөнхийн 20% (10%
   * хямдрал + 10% буцаан олголт) авах болно.
   */
  if (row.ownerUid === buyerUid) return null;

  /*
   * ШАТАЛСАН ХУВЬ.
   *
   * ⚠ ТООЛОЛТЫГ ЭНД хийнэ (кодыг шалгасны ДАРАА): кодгүй, эсвэл
   * идэвхгүй үед сангаас нэмэлт асуулга хийх нь дэмий.
   *
   * ⚠ ХЯЗГААРЫН ХАЖУУГААР нэг-хоёр хүн ОРОХ БОЛОМЖТОЙ: хоёр хүн ЯГ
   * ЗЭРЭГ төлөхөд хоёулаа `used = 49` гэж уншина. Түүнийг бүрэн
   * хаахын тулд кодын мөрийг төлбөр бүрд түгжих шаардлагатай болох
   * бөгөөд тэр нь борлуулалтыг дараалалд оруулна. 50 хүний нөхцөлд
   * 51 дэх хүн орох нь хүлээн зөвшөөрөгдөх, дараалал үүсэхээс дээр.
   */
  const used = Array.isArray(row.tiers) && row.tiers.length > 0
    ? await countPromoBuyers(row.code)
    : 0;
  const tier = pickPromoTier(row.tiers, used);
  const tierIndex = tier ? row.tiers!.indexOf(tier) + 1 : null;

  const discountPercent = tier?.discountPercent ?? row.discountPercent;
  const commissionPercent = tier?.commissionPercent ?? row.commissionPercent;
  const amountMnt = discountedAmount(listPriceMnt, discountPercent);

  return {
    code: row.code,
    promoterUid: row.ownerUid,
    discountPercent,
    commissionPercent,
    amountMnt,
    discountMnt: listPriceMnt - amountMnt,
    tierIndex,
  };
}

/**
 * Код нь ТУХАЙН ХҮНИЙ ӨӨРИЙНХ эсэх.
 *
 * ⚠ ЯАГААД ТУСДАА ФУНКЦ ВЭ: `resolvePromo` нь «болохгүй» бүх
 * тохиолдолд `null` буцаадаг (байхгүй, идэвхгүй, өөрийн код) бөгөөд тэр
 * нь ЗӨВ — кодын оршихуйг гадагш алдахгүй. Гэвч «өөрийн код» гэдэг нь
 * НУУЦ БИШ: хэрэглэгч тэр кодыг өөрөө эзэмшдэг тул түүнд шалтгааныг
 * хэлэх нь ямар ч мэдээлэл алдахгүй, харин «яагаад ажиллахгүй байна»
 * гэсэн мухардлаас гаргана.
 */
export async function isOwnPromoCode(rawCode: string, uid: string): Promise<boolean> {
  const code = normalizePromoCode(rawCode);
  if (!PROMO_CODE_RE.test(code)) return false;

  const [row] = await db
    .select({ ownerUid: promoCodes.ownerUid })
    .from(promoCodes)
    .where(eq(promoCodes.code, code))
    .limit(1);

  return row?.ownerUid === uid;
}

/** Тухайн шийдэлд ногдох шимтгэлийг тооцно (төлбөрийн мөрд хадгална). */
export function promoCommission(promo: PromoResolution): number {
  return commissionAmount(promo.amountMnt, promo.commissionPercent);
}

/* -------------------------------------------------------------------------
 * Сурталчлагчийн самбар
 * ---------------------------------------------------------------------- */

/**
 * Код бүрийн ОДООГИЙН нөхцөл — сурталчлагчид харуулна.
 *
 * ⚠ «Үлдсэн хүүхэд» нь ХАМГИЙН ХЭРЭГТЭЙ тоо: сурталчлагч «эхний 50»
 * гэсэн хязгаараа хэр дүүрснийг мэдэхгүй бол амлалт өгч чадахгүй.
 */
export type PromoCodeState = {
  code: string;
  /** Төлбөрөө баталгаажуулсан ӨӨР ӨӨР хүүхдийн тоо. */
  usedBuyers: number;
  /** Одоо хэрэгжиж байгаа хувь (шат, эсвэл үндсэн). */
  discountPercent: number;
  commissionPercent: number;
  /** Хэрэгжиж байгаа шатны дугаар (1-ээс), `null` = үндсэн хувь. */
  tierIndex: number | null;
  /** Тухайн шатанд үлдсэн хүүхдийн тоо, `null` = хязгааргүй. */
  remaining: number | null;
};

export type PromoStats = {
  codes: PromoCodeRow[];
  /** Код тус бүрийн одоогийн нөхцөл (`code` түлхүүрээр). */
  states: Record<string, PromoCodeState>;
  /** Кодоор хийгдсэн, ТӨЛӨГДСӨН худалдан авалтын тоо. */
  sales: number;
  /** Худалдан авагчдын нийт төлсөн дүн (₮). */
  revenueMnt: number;
  /** Нийт олсон шимтгэл (₮). */
  earnedMnt: number;
  /** Аль хэдийн олгосон (₮). */
  paidOutMnt: number;
  /** Одоогийн үлдэгдэл (₮). */
  balanceMnt: number;
};

/**
 * Сурталчлагчийн үзүүлэлт.
 *
 * ⚠ Үлдэгдлийг ХАДГАЛАХГҮЙ, ҮРГЭЛЖ ТООЦНО (`schema.ts`-ийн `promoPayouts`
 * тайлбарыг үзнэ үү). Тооцоо нь ЗӨВХӨН "paid" төлбөрүүдийг тооцно —
 * хүлээгдэж буй нэхэмжлэл нь мөнгө БИШ, тэднийг оруулбал сурталчлагч
 * олоогүй мөнгөө харна.
 */
export async function getPromoStats(promoterUid: string): Promise<PromoStats> {
  const codes = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.ownerUid, promoterUid))
    .orderBy(desc(promoCodes.createdAt));

  /*
   * ⚠ КОДГҮЙ хүнд ЦААШ АСУУХГҮЙ. Энэ функцийг профайлын цэс «Сурталчлагч»
   * мөрийг харуулах эсэхийг шийдэхэд ДУУДДАГ болсон — өөрөөр хэлбэл БҮХ
   * хэрэглэгч профайл нээх бүрдээ дуудна. Сурталчлагч нь хэдхэн хүн тул
   * үлдсэн олонхид (кодгүй) төлбөр, олголтын нийлбэрийг тооцох нь цэвэр
   * дэмий ачаалал.
   */
  if (codes.length === 0) {
    return {
      codes,
      states: {},
      sales: 0,
      revenueMnt: 0,
      earnedMnt: 0,
      paidOutMnt: 0,
      balanceMnt: 0,
    };
  }

  const [totals] = await db
    .select({
      sales: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${payments.amountMnt}), 0)::int`,
      earned: sql<number>`coalesce(sum(${payments.commissionMnt}), 0)::int`,
    })
    .from(payments)
    .where(and(eq(payments.promoterUid, promoterUid), eq(payments.status, "paid")));

  const [payouts] = await db
    .select({ total: sql<number>`coalesce(sum(${promoPayouts.amountMnt}), 0)::int` })
    .from(promoPayouts)
    .where(eq(promoPayouts.promoterUid, promoterUid));

  const earnedMnt = totals?.earned ?? 0;
  const paidOutMnt = payouts?.total ?? 0;

  /*
   * КОД ТУС БҮРИЙН НӨХЦӨЛ.
   *
   * ⚠ ЗӨВХӨН ШАТТАЙ кодод тоолол хийнэ: шатгүй код нь ямагт үндсэн
   * хувиар ажиллах тул нэмэлт асуулга дэмий.
   */
  const states: Record<string, PromoCodeState> = {};
  for (const row of codes) {
    const hasTiers = Array.isArray(row.tiers) && row.tiers.length > 0;
    const usedBuyers = hasTiers ? await countPromoBuyers(row.code) : 0;
    const tier = pickPromoTier(row.tiers, usedBuyers);

    /*
     * Тухайн шатанд үлдсэн хүүхэд: шатны ХУРИМТЛАЛААС хэрэглэсэн тоог
     * хасна. Шатгүй, эсвэл шат дүүрсэн бол хязгаар байхгүй (`null`).
     */
    let remaining: number | null = null;
    if (tier && row.tiers) {
      let ceiling = 0;
      for (const item of row.tiers) {
        ceiling += Math.max(0, item.limit);
        if (item === tier) break;
      }
      remaining = Math.max(0, ceiling - usedBuyers);
    }

    states[row.code] = {
      code: row.code,
      usedBuyers,
      discountPercent: tier?.discountPercent ?? row.discountPercent,
      commissionPercent: tier?.commissionPercent ?? row.commissionPercent,
      tierIndex: tier && row.tiers ? row.tiers.indexOf(tier) + 1 : null,
      remaining,
    };
  }

  return {
    codes,
    states,
    sales: totals?.sales ?? 0,
    revenueMnt: totals?.revenue ?? 0,
    earnedMnt,
    paidOutMnt,
    balanceMnt: earnedMnt - paidOutMnt,
  };
}

/* -------------------------------------------------------------------------
 * Админы үйлдлүүд
 * ---------------------------------------------------------------------- */

/**
 * Шинэ код үүсгэнэ.
 *
 * ⚠ ЗӨВХӨН АДМИН дуудна (`api/admin/promo`). Хэрэглэгч өөртөө код
 * үүсгэдэг байвал хоёр данс нээгээд хоорондоо хямдрал, шимтгэлээ солилцох
 * замаар 20% алдагдал үүсгэнэ.
 */
export async function createPromoCode(input: {
  code: string;
  ownerUid: string;
  discountPercent: number;
  commissionPercent: number;
  /** ШАТАЛСАН хувь — хоосон бол үндсэн хувь ямагт хэрэгжинэ. */
  tiers?: PromoTier[] | null;
  note: string;
  createdBy: string;
}): Promise<PromoCodeRow | null> {
  const code = normalizePromoCode(input.code);
  if (!PROMO_CODE_RE.test(code)) return null;

  // Хувь хэмжээний хүрээ: 0 нь утгагүй, 50-аас дээш нь ашгийг иднэ.
  if (
    input.discountPercent < 1 ||
    input.discountPercent > 50 ||
    input.commissionPercent < 1 ||
    input.commissionPercent > 50
  ) {
    return null;
  }

  /*
   * ⚠ ШАТУУДЫГ ШАЛГАНА: хязгаар нь 1-ээс дээш бүхэл, хувь нь үндсэн
   * хувьтай ижил хүрээнд (1-50). Шалгаагүй шат нь «0 хүүхэд 90%» гэсэн
   * хэрэгжихгүй нөхцөл, эсвэл ашгийг иддэг хямдрал болно.
   *
   * ⚠ БУРУУ шат бол кодыг ОГТ үүсгэхгүй (`null`): хагас зөв нөхцөлтэй
   * код нь дараа нь хэн ямар хямдрал авсныг тайлбарлах аргагүй болгоно.
   */
  const tiers = normalizeTiers(input.tiers);
  if (tiers === "invalid") return null;

  const [row] = await db
    .insert(promoCodes)
    .values({ ...input, code, tiers })
    // Код нь анхдагч түлхүүр — давхардвал ЧИМЭЭГҮЙ бүтэлгүйтэхийн оронд
    // `null` буцааж, админд "энэ код аль хэдийн байна" гэж хэлнэ.
    .onConflictDoNothing()
    .returning();

  return row ?? null;
}

/** Админаас ирсэн шатуудыг шалгана. `"invalid"` = татгалзана. */
function normalizeTiers(
  tiers: PromoTier[] | null | undefined
): PromoTier[] | null | "invalid" {
  if (!tiers || tiers.length === 0) return null;
  if (tiers.length > 10) return "invalid";

  const clean: PromoTier[] = [];
  for (const tier of tiers) {
    const limit = Number(tier?.limit);
    const discountPercent = Number(tier?.discountPercent);
    const commissionPercent = Number(tier?.commissionPercent);

    if (!Number.isInteger(limit) || limit < 1 || limit > 100_000) return "invalid";
    if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 90) {
      return "invalid";
    }
    if (!Number.isInteger(commissionPercent) || commissionPercent < 0 || commissionPercent > 50) {
      return "invalid";
    }
    clean.push({ limit, discountPercent, commissionPercent });
  }
  return clean;
}

/**
 * Одоо байгаа кодын шатуудыг засна.
 *
 * ⚠ Шатыг ЗАСВАРЛАХ нь аль хэдийн худалдан авсан хүмүүсийн дүнг
 * ХӨНДӨХГҮЙ: хямдрал нь төлбөрийн мөрөнд (`payments.discount_percent`)
 * тэр мөчид хөлдөж бичигддэг.
 */
export async function setPromoTiers(
  code: string,
  tiers: PromoTier[] | null
): Promise<boolean> {
  const clean = normalizeTiers(tiers);
  if (clean === "invalid") return false;

  const updated = await db
    .update(promoCodes)
    .set({ tiers: clean, updatedAt: new Date() })
    .where(eq(promoCodes.code, normalizePromoCode(code)))
    .returning({ code: promoCodes.code });

  return updated.length > 0;
}

export async function setPromoActive(code: string, active: boolean): Promise<boolean> {
  const updated = await db
    .update(promoCodes)
    .set({ active, updatedAt: new Date() })
    .where(eq(promoCodes.code, normalizePromoCode(code)))
    .returning({ code: promoCodes.code });

  return updated.length > 0;
}

/** Бүх код + эзний имэйл — админы жагсаалт. */
export async function listPromoCodes(): Promise<
  (PromoCodeRow & { ownerEmail: string | null })[]
> {
  const rows = await db
    .select({
      code: promoCodes.code,
      ownerUid: promoCodes.ownerUid,
      discountPercent: promoCodes.discountPercent,
      commissionPercent: promoCodes.commissionPercent,
      /* ШАТАЛСАН ХУВЬ — админы жагсаалтад харагдана. */
      tiers: promoCodes.tiers,
      active: promoCodes.active,
      note: promoCodes.note,
      createdBy: promoCodes.createdBy,
      createdAt: promoCodes.createdAt,
      updatedAt: promoCodes.updatedAt,
      ownerEmail: users.email,
    })
    .from(promoCodes)
    .leftJoin(users, eq(users.uid, promoCodes.ownerUid))
    .orderBy(desc(promoCodes.createdAt));

  return rows;
}

/** Олгосон төлбөрийг бүртгэнэ (админ гараар шилжүүлсний дараа). */
export async function recordPayout(input: {
  promoterUid: string;
  amountMnt: number;
  note: string;
  createdBy: string;
}): Promise<boolean> {
  if (!Number.isInteger(input.amountMnt) || input.amountMnt <= 0) return false;

  await db.insert(promoPayouts).values(input);
  return true;
}
