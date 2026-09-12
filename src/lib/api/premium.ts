import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Premium хугацаа СУНГАХ цорын ганц газар.
 *
 * Хугацаа нэмэгддэг гурван шалтгаан бий — үнэгүй туршилт, найзын урилга,
 * төлбөр — гурвуулаа ИЖИЛ дүрмээр ажиллах ёстой тул логикийг энд нэгтгэв.
 */

/** Хоногийг миллисекунд болгоно (шинэ мөрийн `premiumUntil`-д). */
export const daysInMs = (days: number) => days * 24 * 60 * 60 * 1000;

/**
 * Шинэ хэрэглэгчийн эхлэлийн `premiumUntil` — одооноос `days` хоногийн дараа.
 *
 * ⚠ Зөвхөн БҮРТГЭЛИЙН мөчид (мөр ХАРААХАН байхгүй үед). Байгаа мөрийг
 * `extendPremium`-ээр сунгана — эс бөгөөс идэвхтэй гишүүнчлэл ДАРАГДАНА.
 */
export function trialUntil(days: number, now = new Date()): Date {
  return new Date(now.getTime() + daysInMs(days));
}

/**
 * Drizzle-ийн `db` БОЛОН гүйлгээний `tx` хоёуланг хүлээж авахын тулд зөвхөн
 * хэрэглэх метод(ууд)-аар нь тодорхойлов — бүтцээр (structurally) хоёулаа
 * тохирно. Бүтэн `NodePgDatabase` гэж бичвэл `tx` дамжуулах боломжгүй болно.
 */
type Executor = Pick<typeof db, "update">;

/**
 * Хэрэглэгчийн Premium-ыг `days` хоногоор СУНГАНА.
 *
 * Хугацааг `max(одоо, одоогийн premiumUntil)`-с эхлүүлнэ — идэвхтэй
 * гишүүнчлэлтэй (эсвэл туршилтын хугацаа дуусаагүй) хүн сунгахад үлдсэн
 * хоног нь ШАТАХГҮЙ. Хугацаа нь өнгөрсөн бол одооноос эхэлнэ.
 *
 * ⚠ Тооцоо SQL дотор (`GREATEST`) хийгдэж байгаа нь санамсаргүй биш:
 * JS талд уншаад-бодоод-бичвэл хоёр зэрэг гүйсэн хүсэлт (webhook + poll)
 * ижил хуучин утгыг уншиж, нэг сунгалт АЛГА БОЛНО.
 */
export async function extendPremium(
  executor: Executor,
  uid: string,
  days: number,
  now = new Date()
): Promise<void> {
  /*
   * ⚠ `sql.raw` нь утгыг параметржүүлэхгүй, ШУУД SQL-д наана. `days` нь
   * өнөөдөр зөвхөн тогтмол ба сангаас уншсан бүхэл тоо ч гэсэн энэ хамгаалалт
   * ЭНД байх ёстой: дуудагч нэмэгдэх бүрд эх үүсвэрийг нь дахин шалгах
   * найдвар бол хамгийн эмзэг найдвар.
   */
  const safeDays = Math.max(0, Math.floor(days));

  await executor
    .update(users)
    .set({
      premiumUntil: sql`GREATEST(COALESCE(${users.premiumUntil}, ${now}), ${now}) + ${sql.raw(
        `INTERVAL '${safeDays} days'`
      )}`,
      updatedAt: now,
    })
    .where(eq(users.uid, uid));
}

/**
 * ГЭР БҮЛИЙН багцын сунгалт — эрх БОЛОН тараах эрхийг зэрэг сунгана.
 *
 * ⚠ `premiumUntil`-ыг ЭНД мөн сунгаж байгаа нь давхардал биш: худалдан
 * авагч өөрөө нэг суудал эзэлдэг (`FAMILY_SEATS`). Зөвхөн `familyUntil`
 * тавибал төлсөн эцэг эх ӨӨРӨӨ эрхгүй үлдэнэ.
 *
 * Хоёр багана НЭГ UPDATE дотор — тусад нь бичвэл хоёрын дунд алдаа гарахад
 * "тараах эрхтэй ч өөрөө эрхгүй" гэсэн боломжгүй төлөв үүснэ.
 */
export async function extendFamily(
  executor: Executor,
  uid: string,
  days: number,
  now = new Date()
): Promise<void> {
  const safeDays = Math.max(0, Math.floor(days));
  const interval = sql.raw(`INTERVAL '${safeDays} days'`);

  await executor
    .update(users)
    .set({
      premiumUntil: sql`GREATEST(COALESCE(${users.premiumUntil}, ${now}), ${now}) + ${interval}`,
      familyUntil: sql`GREATEST(COALESCE(${users.familyUntil}, ${now}), ${now}) + ${interval}`,
      updatedAt: now,
    })
    .where(eq(users.uid, uid));
}

/**
 * Гишүүнд ТОДОРХОЙ ОГНОО хүртэл эрх олгоно (гэр бүлийн суудал).
 *
 * ⚠ `extendPremium`-ээс ЯЛГААТАЙ — хоног НЭМЭХГҮЙ, огноог ӨГӨӨД зогсоно.
 * Хоног нэмдэг байсан бол эцэг эх хүүхдээ салгаад дахин холбох бүрд шинэ
 * жил нэмэгдэх байв. Огноо тавихад хэдэн ч удаа давтсан үр дүн ижил
 * (идемпотент).
 *
 * Хүүхдийн ӨӨРИЙН эрх нь илүү урт бол (тусад нь багц авсан, урилгын хоног
 * цуглуулсан) `GREATEST` түүнийг хамгаална — гэр бүлд нэгдэх нь хэн нэгний
 * эрхийг ХЭЗЭЭ Ч БОГИНОСГОХГҮЙ.
 */
export async function grantPremiumUntil(
  executor: Executor,
  uid: string,
  until: Date,
  now = new Date()
): Promise<void> {
  await executor
    .update(users)
    .set({
      premiumUntil: sql`GREATEST(COALESCE(${users.premiumUntil}, ${until}), ${until})`,
      updatedAt: now,
    })
    .where(eq(users.uid, uid));
}
