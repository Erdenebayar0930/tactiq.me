import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { payments, users } from "@/lib/db/schema";
import { extendFamily, extendPremium } from "@/lib/api/premium";
import { grantFamilySeats } from "@/lib/api/family";
import { extendMembership } from "@/lib/api/membership";
import { recordPaidEntry, syncEntry } from "@/lib/api/tournamentEntries";
import { isMembershipTierId, isPlanId, PLANS } from "@/lib/billing";

import type { MembershipTierId, PaymentKind, PlanId } from "@/lib/billing";
import type { PaymentRow } from "@/lib/db/schema";

/**
 * Premium төлбөрийн үйлдлүүд.
 *
 * ⚠ МӨНГӨНИЙ КОД. Хоёр дүрмийг ХЭЗЭЭ Ч зөрчихгүй:
 *
 *   1. ТӨЛӨХ ДҮНГ СЕРВЕР ТООЦНО. Клиент зөвхөн `planId` илгээнэ. Дүнг
 *      клиентээс авбал хэрэглэгч DevTools-оор 100₮ гэж илгээгээд жилийн
 *      багц авна.
 *   2. ТӨЛӨГДСӨН ГЭДГИЙГ КЛИЕНТ ХЭЛЖ БОЛОХГҮЙ. Зөвхөн QPay-ээс ирсэн
 *      баталгаа (`checkPayment`) л мөрийг "paid" болгоно.
 *
 * ⚠ ХЯМДРАЛ ОДОО БАЙХГҮЙ: найзаа урьсны урамшуулал нь хувийн хямдрал биш,
 * ҮНЭГҮЙ ХОНОГ болсон (`lib/billing.ts`-ийн `REFERRAL_BONUS_DAYS`). Тиймээс
 * төлөх дүн нь ҮРГЭЛЖ багцын үнэ. `payments.discountPercent` багана нь
 * ХУУЧИН баримтуудын төлөө үлдсэн — шинэ мөрүүд 0-ээр бичигдэнэ.
 */

/**
 * БИДНИЙ талын нэхэмжлэлийн дугаар.
 *
 * QPay `sender_invoice_no`-г 45 тэмдэгтэд багтаахыг шаарддаг тул богино
 * байлгана. Санамсаргүй хэсэг нь таамаглахаас сэргийлнэ — энэ дугаараар
 * төлбөрийн төлөв асуух боломжтой тул дараалсан тоо байвал өөр хүний
 * төлбөрийг харах эрсдэлтэй.
 */
function newSenderInvoiceNo(): string {
  return `DA${Date.now().toString(36).toUpperCase()}${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

/** Хүлээгдэж буй төлбөрийн мөр үүсгэнэ (QPay нэхэмжлэл үүсгэхийн ӨМНӨ). */
export async function createPendingPayment(input: {
  uid: string;
  /** Анхдагч "premium". */
  kind?: PaymentKind;
  /** premium → багц, membership → түвшин, tournament → `TOURNAMENT_ENTRY_PLAN_ID` */
  planId: PlanId | MembershipTierId | "tournament";
  /** tournament → тэмцээний id */
  ref?: string | null;
  amountMnt: number;
  days: number;
  /**
   * Сурталчлагчийн кодын мэдээлэл (заавал биш).
   *
   * ⚠ Шимтгэлийг ЭНД, төлбөр ҮҮСЭХ мөчид тооцож ХАДГАЛНА — төлөгдөх
   * үед дахин тооцвол тэр хооронд код идэвхгүй болсон эсвэл хувь нь
   * өөрчлөгдсөн байж болзошгүй. Худалдан авагчид амласан нөхцөл нь
   * ХУДАЛДААНЫ мөчид тогтоно.
   */
  promoCode?: string | null;
  promoterUid?: string | null;
  commissionMnt?: number;
  discountPercent?: number;
  /** НӨАТ-ын баримтын төрөл ба байгууллагын регистр. */
  ebarimtType?: string;
  registerNo?: string;
}): Promise<{ id: string; senderInvoiceNo: string }> {
  const senderInvoiceNo = newSenderInvoiceNo();

  const [row] = await db
    .insert(payments)
    .values({ ...input, senderInvoiceNo })
    .returning({ id: payments.id });

  return { id: row.id, senderInvoiceNo };
}

/** QPay-ээс буцаж ирсэн `invoice_id`-г мөрдөө холбоно. */
export async function attachInvoiceId(id: string, invoiceId: string): Promise<void> {
  await db
    .update(payments)
    .set({ invoiceId, updatedAt: new Date() })
    .where(eq(payments.id, id));
}

export async function findBySenderInvoiceNo(no: string): Promise<PaymentRow | null> {
  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.senderInvoiceNo, no))
    .limit(1);
  return row ?? null;
}

/** Хэрэглэгчийн төлбөрийн түүх — шинэ нь эхэнд. */
export async function listPayments(uid: string, limit = 20): Promise<PaymentRow[]> {
  return db
    .select()
    .from(payments)
    .where(eq(payments.uid, uid))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

/**
 * Төлбөрийг "төлөгдсөн" болгож, Premium хугацааг СУНГАНА.
 *
 * ⚠ ИДЕМПОТЕНТ. QPay webhook нэг төлбөрийн талаар ОЛОН УДАА мэдэгдэж
 * чаддаг (давтан оролдлого, сүлжээний саатал) бөгөөд клиент нь мөн зэрэг
 * poll хийж байдаг. Тиймээс төлөв солих UPDATE нь `status = 'pending'`
 * нөхцөлтэй: хоёр дахь дуудлага НЭГ Ч мөр өөрчлөхгүй тул хугацаа давхар
 * нэмэгдэхгүй. `rowCount === 0` бол "аль хэдийн боловсруулагдсан" гэсэн үг,
 * алдаа БИШ.
 *
 * Сунгалтын дүрэм (`lib/api/premium.ts`) нь үнэгүй туршилт, найзын урилгатай
 * ИЖИЛ — үлдсэн хоног ХЭЗЭЭ Ч шатахгүй. Туршилтын 3 хоногтой хүн эхний
 * өдөртөө багц авбал 30 БИШ, 33 хоногтой болно.
 */
export async function markPaid(paymentId: string): Promise<boolean> {
  const now = new Date();

  const updated = await db
    .update(payments)
    .set({ status: "paid", paidAt: now, updatedAt: now })
    .where(and(eq(payments.id, paymentId), eq(payments.status, "pending")))
    .returning({
      uid: payments.uid,
      days: payments.days,
      planId: payments.planId,
      kind: payments.kind,
      ref: payments.ref,
    });

  // Аль хэдийн "paid" — давхар боловсруулалт. Чимээгүй өнгөрнө.
  if (updated.length === 0) return false;

  const { uid, days, planId, kind, ref } = updated[0];

  /*
   * ТЭМЦЭЭНИЙ ГИШҮҮНЧЛЭЛ — хичээлийн Premium-д ХҮРЭХГҮЙ.
   *
   * ⚠ Танихгүй түвшин бол алдаа ШИДЭХГҮЙ (доорх гэр бүлийн тайлбартай ижил
   * шалтгаан) — логлоод гараар шийднэ.
   */
  if (kind === "membership") {
    if (isMembershipTierId(planId)) {
      await extendMembership(db, uid, planId, days, now);
    } else {
      console.error("[payments] танихгүй гишүүнчлэлийн түвшин", { paymentId, planId });
    }
    return true;
  }

  /*
   * НЭГ ТЭМЦЭЭНИЙ ОРОЛЦОХ ТӨЛБӨР — бүртгэл үүсгээд тэмцээний сервер рүү
   * илгээнэ. `syncEntry` алдаа шиддэггүй: тэр сервер унасан ч төлбөр
   * «төлөгдсөн» хэвээр, илгээлтийг дараа дахин оролдоно.
   */
  if (kind === "tournament") {
    if (ref) {
      const entryId = await recordPaidEntry(uid, ref, paymentId, now);
      if (entryId) await syncEntry(entryId);
    } else {
      console.error("[payments] тэмцээний төлбөрт тэмцээний id алга", { paymentId });
    }
    return true;
  }

  /*
   * Олон суудалтай багц уу?
   *
   * ⚠ `planId` нь СААРАЛ мөр (`varchar`) — хуучин баримтууд, эсвэл дараа нь
   * устгасан багцын нэр агуулж болно. Танихгүй нэрийг ЭНГИЙН багц гэж үзнэ:
   * хамгийн муудаа төлсөн хүн өөрөө эрхээ авна, харин таних оролдлого
   * бүтэлгүйтэхэд алдаа шидвэл webhook давтагдаж, төлбөр "төлөгдөөгүй" мэт
   * үлдэнэ.
   */
  const seats = isPlanId(planId) ? PLANS[planId].seats : 1;

  if (seats <= 1) {
    await extendPremium(db, uid, days, now);
    return true;
  }

  await extendFamily(db, uid, days, now);

  /*
   * Суудал тараахад алдаа гарвал ТӨЛБӨРИЙГ бүтэлгүйтгэхгүй: мөнгө аль
   * хэдийн орсон, `status` нь "paid" болсон, худалдан авагчийн эрх нь
   * сунгагдсан. Энд шидсэн алдаа webhook-ыг давтуулж, харин дээрх алхмууд
   * идемпотент тул дахин ажиллахгүй — үр дүнд суудал МӨН тарахгүй.
   *
   * Хүүхдүүд эрхээ авахгүй үлдвэл эцэг эх дараа нь холбоосоо шинэчлэхэд
   * `grantSeatOnLink` олгоно.
   */
  try {
    const [owner] = await db
      .select({ familyUntil: users.familyUntil })
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (owner?.familyUntil) await grantFamilySeats(uid, owner.familyUntil, now);
  } catch (cause) {
    console.error("[payments] гэр бүлийн суудал тараахад алдаа гарлаа", cause);
  }

  return true;
}
