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

import type { PromoCodeRow } from "@/lib/db/schema";

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

export type PromoResolution = {
  code: string;
  promoterUid: string;
  discountPercent: number;
  commissionPercent: number;
  /** Хямдруулсан ТӨЛӨХ дүн (₮). */
  amountMnt: number;
  /** Хэдэн төгрөг хэмнэсэн — UI-д харуулахад. */
  discountMnt: number;
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

  const amountMnt = discountedAmount(listPriceMnt, row.discountPercent);

  return {
    code: row.code,
    promoterUid: row.ownerUid,
    discountPercent: row.discountPercent,
    commissionPercent: row.commissionPercent,
    amountMnt,
    discountMnt: listPriceMnt - amountMnt,
  };
}

/** Тухайн шийдэлд ногдох шимтгэлийг тооцно (төлбөрийн мөрд хадгална). */
export function promoCommission(promo: PromoResolution): number {
  return commissionAmount(promo.amountMnt, promo.commissionPercent);
}

/* -------------------------------------------------------------------------
 * Сурталчлагчийн самбар
 * ---------------------------------------------------------------------- */

export type PromoStats = {
  codes: PromoCodeRow[];
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

  return {
    codes,
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

  const [row] = await db
    .insert(promoCodes)
    .values({ ...input, code })
    // Код нь анхдагч түлхүүр — давхардвал ЧИМЭЭГҮЙ бүтэлгүйтэхийн оронд
    // `null` буцааж, админд "энэ код аль хэдийн байна" гэж хэлнэ.
    .onConflictDoNothing()
    .returning();

  return row ?? null;
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
