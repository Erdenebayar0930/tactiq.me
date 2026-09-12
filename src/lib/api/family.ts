import "server-only";

import { and, asc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { familySeats, studentLinks, users } from "@/lib/db/schema";
import { FAMILY_SEATS } from "@/lib/billing";
import { grantPremiumUntil } from "@/lib/api/premium";

/**
 * Гэр бүлийн багцын суудал тараах цорын ганц газар.
 *
 * ⚠ ЗАГВАР: суудал нь ХОЛБООСООР олгогдоно (`student_links`), тусдаа
 * "гэр бүлийн код" БАЙХГҮЙ. Эцэг эх хүүхдээ урилгын кодоор холбодог урсгал
 * аль хэдийн байгаа тул хоёр дахь нэгдэх механизм зохиох нь хэрэглэгчид
 * шинэ ойлголт сурах ачаа үүрүүлээд, ижил зүйлийг хоёр газар зөрүүтэй
 * хадгалах эрсдэл нэмнэ.
 *
 * ⚠ Худалдан авагч ӨӨРӨӨ нэг суудал эзэлнэ. Тиймээс гишүүдэд олгох суудал
 * нь `FAMILY_SEATS - 1`. Эс бөгөөс "5 хүн" гэж зарлаад 6 хүнд эрх өгнө.
 *
 * ⚠ Олгосон эрхийг БУЦААЖ АВАХГҮЙ (`grantPremiumUntil` нь зөвхөн уртасгана).
 * Холбоос салгах нь хүүхдийн эрхийг таслах ЁСГҮЙ — эцэг эхийн санамсаргүй
 * дарсан товч хүүхдийн эрхийг устгавал энэ нь сэргээх боломжгүй хохирол.
 * Харин суудал нь `family_seats` мөрөөр түгжигдсэн хэвээр үлдэнэ.
 */

/** Гишүүдэд олгох суудлын тоо (эзэн өөрөө нэгийг эзэлсэн). */
export const FAMILY_MEMBER_SEATS = FAMILY_SEATS - 1;

/**
 * Тухайн эзэн ОДООГООР хэдэн суудал эзлүүлснийг тоолно.
 *
 * Зөвхөн хугацаа нь ДУУСААГҮЙ мөрүүд — багц дуусахад суудлууд аяндаа
 * сулардаг тул хуучин мөрүүдийг цэвэрлэх cron хэрэггүй.
 */
async function usedSeats(ownerUid: string, now: Date): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(familySeats)
    .where(and(eq(familySeats.ownerUid, ownerUid), gt(familySeats.grantedUntil, now)));

  return row?.count ?? 0;
}

/**
 * Нэг гишүүнд суудал олгоно.
 *
 * @returns олгогдсон эсэх (`false` = суудал дүүрсэн)
 */
async function claimSeat(
  ownerUid: string,
  memberUid: string,
  until: Date,
  now: Date
): Promise<boolean> {
  /*
   * Байгаа суудлыг ШИНЭЧЛЭХ нь шинэ суудал эзлэхээс ӨМНӨ шалгагдана:
   * ижил хүүхдэд дахин олгоход (багц сунгасан, эсвэл салгаад дахин
   * холбосон) хязгаар зарцуулагдах ёсгүй.
   */
  const updated = await db
    .update(familySeats)
    .set({ grantedUntil: sql`GREATEST(${familySeats.grantedUntil}, ${until})`, updatedAt: now })
    .where(and(eq(familySeats.ownerUid, ownerUid), eq(familySeats.memberUid, memberUid)))
    .returning({ id: familySeats.id });

  if (updated.length === 0) {
    if ((await usedSeats(ownerUid, now)) >= FAMILY_MEMBER_SEATS) return false;

    /*
     * ⚠ `onConflictDoNothing` ЗААВАЛ — дээрх шалгалт ба энэ INSERT хоёрын
     * хооронд зэрэг гүйсэн хүсэлт ижил мөр оруулж чадна. Тэр тохиолдолд
     * мөр аль хэдийн байгаа тул эрхийг доор нь ямар ч байсан олгоно.
     */
    await db
      .insert(familySeats)
      .values({ ownerUid, memberUid, grantedUntil: until, updatedAt: now })
      .onConflictDoNothing();
  }

  await grantPremiumUntil(db, memberUid, until, now);
  return true;
}

/**
 * Багц худалдаж авсны ДАРАА — холбогдсон хүүхдүүдэд суудал тараана.
 *
 * Холбоосын ХАМГИЙН ЭРТ огноогоор эрэмбэлнэ: хэн суудал авахыг санамсаргүй
 * дараалалд орхивол эцэг эх бүр дахин ачаалахад өөр хүүхэд эрхтэй болж
 * харагдана.
 *
 * ⚠ Зөвхөн "parent" холбоос. Багш нь сурагчидтайгаа `student_links`-ээр
 * ижил холбогддог тул шүүхгүй бол багшийн гэр бүлийн багц 4 сурагчид нь
 * очно — энэ нь гэр бүлийн багцыг ангийн хямдрал болгож хувиргана.
 *
 * @returns эрх олгогдсон гишүүдийн тоо
 */
export async function grantFamilySeats(
  ownerUid: string,
  until: Date,
  now = new Date()
): Promise<number> {
  const children = await db
    .select({ uid: studentLinks.studentUid })
    .from(studentLinks)
    .where(and(eq(studentLinks.adultUid, ownerUid), eq(studentLinks.relation, "parent")))
    .orderBy(asc(studentLinks.createdAt))
    .limit(FAMILY_MEMBER_SEATS);

  let granted = 0;
  for (const child of children) {
    if (await claimSeat(ownerUid, child.uid, until, now)) granted += 1;
  }

  return granted;
}

/**
 * ШИНЭЭР холбогдсон хүүхдэд суудал олгох оролдлого.
 *
 * ⚠ ЭНЭ ФУНКЦ БАЙХГҮЙ БОЛ ЧИМЭЭГҮЙ АЛДАА үүснэ: багц авчихаад дараа нь
 * хүүхдээ холбосон эцэг эх юу ч авахгүй бөгөөд яагаад гэдгийг ойлгох
 * боломжгүй. Гэр бүл бүрдэх дараалал (хэзээ төлсөн, хэзээ холбосон) нь
 * хэрэглэгчийн санааны зоргоор байдаг.
 *
 * Суудал дүүрсэн бол ЧИМЭЭГҮЙ өнгөрнө — холбоос өөрөө амжилттай хэвээр.
 * Хүүхдээ хянах эрх нь багцаас хамаарах ёсгүй.
 */
export async function grantSeatOnLink(
  adultUid: string,
  studentUid: string,
  now = new Date()
): Promise<void> {
  const [owner] = await db
    .select({ familyUntil: users.familyUntil })
    .from(users)
    .where(eq(users.uid, adultUid))
    .limit(1);

  const until = owner?.familyUntil;
  if (!until || until.getTime() <= now.getTime()) return;

  await claimSeat(adultUid, studentUid, until, now);
}

export type FamilyStatus = {
  active: boolean;
  until: Date | null;
  seatsTotal: number;
  /** Эзэн өөрөө + суудал авсан гишүүд. */
  seatsUsed: number;
};

/** Гэр бүлийн багцын төлөв — `/premium` дэлгэцэд. */
export async function familyStatus(
  uid: string,
  now = new Date()
): Promise<FamilyStatus> {
  const [row] = await db
    .select({ familyUntil: users.familyUntil })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  const until = row?.familyUntil ?? null;
  const active = !!until && until.getTime() > now.getTime();

  return {
    active,
    until,
    seatsTotal: FAMILY_SEATS,
    // Эзний суудлыг гараар нэмнэ — тэр `family_seats`-д мөргүй (schema.ts).
    seatsUsed: active ? 1 + (await usedSeats(uid, now)) : 0,
  };
}
