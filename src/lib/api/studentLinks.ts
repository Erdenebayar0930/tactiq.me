import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { studentLinks, users } from "@/lib/db/schema";
import { canWatchAdForHeart } from "@/lib/tactiq/ads";
import { displayStreak } from "@/lib/tactiq/day";
import { isStudentRole } from "@/lib/permissions";
import { grantSeatOnLink } from "@/lib/api/family";
import { isPremiumUser, levelProgress, MAX_HEARTS, refillHearts } from "@/lib/tactiq/xp";

import type { UserRow } from "@/lib/db/schema";

/**
 * Эцэг эх / багш ↔ сурагчийн холбоос.
 *
 * ⚠ ХҮҮХДИЙН ӨГӨГДӨЛ. Хоёр дүрэм:
 *
 *   1. `toLinkedStudent` нь `toPublicUser`-ээс ЯЛГААТАЙ, ЗОРИУДААР НАРИЙН:
 *      имэйл, урилгын код, төхөөрөмж, эрхийн талбарууд ОРОХГҮЙ. Насанд
 *      хүрэгчид хэрэгтэй нь "хүүхэд маань суралцаж байна уу" гэдэг л —
 *      түүнээс илүүг өгөх нь код таамагласан хэн нэгэнд өгөх мэдээллийг
 *      нэмнэ.
 *   2. Жагсаалт ҮРГЭЛЖ `adultUid`-ээр шүүгдэнэ. "Сурагчийн uid-аар шууд
 *      унших" функц ЭНД БАЙХГҮЙ — байвал дуудагч холбоосоо шалгахаа мартах
 *      боломж нээгдэнэ.
 */

export type LinkRelation = "parent" | "teacher";

export function isLinkRelation(value: unknown): value is LinkRelation {
  return value === "parent" || value === "teacher";
}

/**
 * Сурагчийн мөрийг насанд хүрэгчид харуулах хэлбэрт буулгана.
 *
 * Зүрх, дараалал хоёрыг ЭНД тооцно (`toPublicUser`-тай ижил шалтгаан):
 * сандаа хадгалагдсан утга нь цаг өнгөрөхөд ХУДАЛ болдог — 5 хоног ирээгүй
 * хүүхэд "7 өдрийн дараалалтай" гэж харагдана.
 */
function toLinkedStudent(row: UserRow, linkedAt: Date, heartRefillMinutes = 30) {
  const premium = isPremiumUser(row.premiumUntil);
  const hearts = premium
    ? { hearts: MAX_HEARTS, msToNext: 0 }
    : refillHearts(row.hearts, row.heartsUpdatedAt, heartRefillMinutes);

  return {
    uid: row.uid,
    displayName: row.displayName,
    photoUrl: row.photoUrl,

    xp: row.xp,
    gems: row.gems,
    hearts: hearts.hearts,
    maxHearts: MAX_HEARTS,
    canWatchAdForHeart: canWatchAdForHeart(row.lastAdHeartAt).allowed,

    streakDays: displayStreak(row.lastActiveDay, row.streakDays, undefined, row.streakFreezes),
    longestStreak: row.longestStreak,
    /** `""` = хичээл огт эхлээгүй. Насанд хүрэгчид ЭНЭ нь хамгийн чухал дохио. */
    lastActiveDay: row.lastActiveDay,
    dailyGoal: row.dailyGoal,

    activeCourseSlug: row.activeCourseSlug,
    isPremium: premium,
    /** Холбоос хэзээ үүссэн — "саяхан нэмсэн" эсэхийг ялгахад. */
    linkedAt,

    ...levelProgress(row.xp),
  };
}

export type LinkedStudent = ReturnType<typeof toLinkedStudent>;

/** Тухайн насанд хүрэгчийн ЭНЭ үүргээр холбогдсон сурагчид — шинэ нь эхэнд. */
export async function listLinkedStudents(
  adultUid: string,
  relation: LinkRelation
): Promise<LinkedStudent[]> {
  const rows = await db
    .select({ student: users, linkedAt: studentLinks.createdAt })
    .from(studentLinks)
    .innerJoin(users, eq(users.uid, studentLinks.studentUid))
    .where(and(eq(studentLinks.adultUid, adultUid), eq(studentLinks.relation, relation)))
    .orderBy(desc(studentLinks.createdAt));

  return rows.map((row) => toLinkedStudent(row.student, row.linkedAt));
}

export type LinkOutcome =
  | { ok: true; student: LinkedStudent; alreadyLinked: boolean }
  | { ok: false; reason: "not-found" | "not-student" | "self" };

/**
 * Сурагчийн хувийн кодоор холбоно.
 *
 * ⚠ ИДЕМПОТЕНТ. Ижил кодыг хоёр удаа оруулбал алдаа ӨГӨХГҮЙ, `alreadyLinked`
 * тугтайгаар ижил үр дүн буцаана — `student_links_uq` индекс давхардлыг
 * барина. Алдаа өгвөл хэрэглэгч "ажиллахгүй байна" гэж ойлгоод дахин дахин
 * оролдоно.
 *
 * ⚠ "not-found" ба "not-student" хоёрыг дуудагч НЭГ ижил мессежээр
 * буцаах ёстой — эс бөгөөс энэ хариу нь код таамаглагчид "код зөв, гэхдээ
 * сурагч биш" гэсэн мэдээлэл алдана.
 */
export async function linkStudentByCode(
  adultUid: string,
  code: string,
  relation: LinkRelation
): Promise<LinkOutcome> {
  const [student] = await db
    .select()
    .from(users)
    .where(eq(users.studentInviteCode, code))
    .limit(1);

  if (!student) return { ok: false, reason: "not-found" };
  if (student.uid === adultUid) return { ok: false, reason: "self" };

  /*
   * ЗӨВХӨН сурагчийн код хүчинтэй. Код нь эрх бүрд үүсдэг (`schema.ts`) тул
   * шалгахгүй бол багш, админ нар бие биенээ "сурагч" болгон нэмж чадна.
   *
   * ⚠ `role !== "student"` гэж ШУУД харьцуулж БОЛОХГҮЙ: хуучин мөрүүд
   * "user" гэсэн эрхтэй байдаг (`lib/permissions.ts`-ийн `isStudentRole`)
   * бөгөөд тэднийг чимээгүй гадуурхвал хуучин сурагчид эцэг эхтэйгээ
   * холбогдож чадахгүй болно. `api/auth/register` нь ижил шалгуур ашигладаг.
   */
  if (!isStudentRole(student.role)) return { ok: false, reason: "not-student" };

  const inserted = await db
    .insert(studentLinks)
    .values({ adultUid, studentUid: student.uid, relation })
    .onConflictDoNothing()
    .returning({ createdAt: studentLinks.createdAt });

  // Давхардсан бол `returning` хоосон — байгаа холбоосын огноог уншина.
  let linkedAt = inserted[0]?.createdAt;

  if (!linkedAt) {
    const [existing] = await db
      .select({ createdAt: studentLinks.createdAt })
      .from(studentLinks)
      .where(
        and(
          eq(studentLinks.adultUid, adultUid),
          eq(studentLinks.studentUid, student.uid),
          eq(studentLinks.relation, relation)
        )
      )
      .limit(1);

    linkedAt = existing?.createdAt ?? new Date();
  }

  /*
   * Холбогч нь идэвхтэй ГЭР БҮЛИЙН багцтай бол хүүхэд суудлаа энд авна —
   * багц авсны ДАРАА хүүхдээ нэмсэн тохиолдлыг барина (`lib/api/family.ts`).
   *
   * ⚠ try/catch ЗААВАЛ: суудал олгох нь холбоосыг үүсгэх гол ажлын НЭМЭЛТ
   * хэсэг. Энд алдаа гарвал холбоос амжилттай гэж хариулах ёстой — мөр аль
   * хэдийн орсон бөгөөд алдаа буцаавал эцэг эх дахин оролдож, "аль хэдийн
   * холбоотой" гэсэн будлиантай хариу авна.
   */
  try {
    if (relation === "parent") await grantSeatOnLink(adultUid, student.uid);
  } catch (cause) {
    console.error("[studentLinks] гэр бүлийн суудал олгоход алдаа гарлаа", cause);
  }

  return {
    ok: true,
    student: toLinkedStudent(student, linkedAt),
    alreadyLinked: inserted.length === 0,
  };
}

/**
 * Холбоосыг салгана.
 *
 * `relation`-ыг ЗААВАЛ шаардана: эцэг эх бөгөөд багш хүн нэг сурагчтай хоёр
 * холбоостой байж болох тул зөвхөн нэгийг нь салгах чадвартай байх ёстой.
 *
 * @returns үнэхээр устсан эсэх (`false` = ийм холбоос байгаагүй)
 */
export async function unlinkStudent(
  adultUid: string,
  studentUid: string,
  relation: LinkRelation
): Promise<boolean> {
  const removed = await db
    .delete(studentLinks)
    .where(
      and(
        eq(studentLinks.adultUid, adultUid),
        eq(studentLinks.studentUid, studentUid),
        eq(studentLinks.relation, relation)
      )
    )
    .returning({ id: studentLinks.id });

  return removed.length > 0;
}

/**
 * Тухайн насанд хүрэгч тэр сурагчтай ХОЛБООТОЙ эсэх.
 *
 * ⚠ Сурагчийн ДЭЛГЭРЭНГҮЙ өгөгдөл (курсын явц, зарцуулсан цаг) буцаадаг
 * ЯМАР Ч route энэ шалгалтыг ЗААВАЛ дуудна. `listLinkedStudents` нь
 * `adultUid`-ээр шүүдэг тул өөрөө хамгаалагдсан бол `uid`-аар шууд
 * уншдаг эндпойнтууд ӨӨРСДӨӨ хамгаалагдах ёстой — эс бөгөөс хэн ч дурын
 * сурагчийн uid таамаглаад явцыг нь харна.
 *
 * `relation` заагаагүй бол ХОЁУЛАНГ нь (эцэг эх эсвэл багш) хүлээн авна:
 * дэлгэрэнгүй харах эрх нь холбоосын ТӨРЛӨӨС хамаарахгүй.
 */
export async function isLinkedStudent(
  adultUid: string,
  studentUid: string,
  relation?: LinkRelation
): Promise<boolean> {
  const [row] = await db
    .select({ id: studentLinks.id })
    .from(studentLinks)
    .where(
      and(
        eq(studentLinks.adultUid, adultUid),
        eq(studentLinks.studentUid, studentUid),
        ...(relation ? [eq(studentLinks.relation, relation)] : [])
      )
    )
    .limit(1);

  return !!row;
}
