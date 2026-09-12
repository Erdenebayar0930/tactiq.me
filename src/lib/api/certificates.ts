import "server-only";

import { createHash } from "node:crypto";

import { count, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { courses, lessonProgress, lessons, units, users } from "@/lib/db/schema";
import { isPremiumUser } from "@/lib/tactiq/xp";

/**
 * Курс дуусгасны ГЭРЧИЛГЭЭ.
 *
 * ⚠ ТУСДАА ХҮСНЭГТ БАЙХГҮЙ. Гэрчилгээ бол шинэ баримт биш, аль хэдийн
 * байгаа өгөгдлийн ХАРАГДАЦ: "энэ курсын бүх хичээл дуусгагдсан уу" гэдгийг
 * `lesson_progress`-ээс ХЭЗЭЭ Ч тооцож болно. Хадгалсан мөр нь ахицтайгаа
 * ЗӨРӨХ боломжтой — курст шинэ хичээл нэмэгдвэл хуучин "дууссан" мөр худал
 * болно. Тооцоолсон утга ХЭЗЭЭ Ч зөрөхгүй (`achievements.ts`-тэй ижил
 * зарчим).
 *
 * ⚠ Курст ХИЧЭЭЛ НЭМЭГДВЭЛ гэрчилгээ ТҮР ХААГДАНА. Энэ нь алдаа биш,
 * зориуд: "энэ курсыг дүүргэсэн" гэсэн батламж нь бүрэн бус байвал утгагүй.
 * Хэрэглэгч шинэ хичээлүүдийг дуусгамагц гэрчилгээ нь буцаж нээгдэнэ.
 */

export type Certificate = {
  courseSlug: string;
  title: string;
  icon: string;
  color: string;
  school: string;
  /** Курсын нийт хичээл — гэрчилгээн дээр хэвлэгдэнэ. */
  lessons: number;
  /** Тухайн курсээс цуглуулсан нийт оноо. */
  xp: number;
  /** ХАМГИЙН СҮҮЛД дуусгасан хичээлийн огноо = гэрчилгээ олгогдсон өдөр. */
  issuedAt: Date;
  /** Баталгаажуулах дугаар — `certificateCode()` үзнэ үү. */
  code: string;
};

export type CertificatesView = {
  /**
   * Premium эрхтэй эсэх.
   *
   * ⚠ Гэрчилгээний ЖАГСААЛТ нь эрхээс ҮЛ ХАМААРАН буцна — зөвхөн ТАТАХ,
   * ХЭВЛЭХ нь Premium-д нээлттэй. Дуусгасан курсаа огт харуулахгүй байх нь
   * хийсэн хөдөлмөрийг нь нуух бөгөөд юу авахаа мэдэхгүй хүн Premium
   * авахгүй.
   */
  premium: boolean;
  certificates: Certificate[];
  /** Гэрчилгээ эзэмшигчийн нэр — хэвлэх хуудсанд. */
  holderName: string;
};

/**
 * Гэрчилгээний баталгаажуулах дугаар.
 *
 * ⚠ ДАРААЛСАН ДУГААР ӨГӨХГҮЙ ("TQ-000042"). Дараалсан дугаар нь хэдэн
 * гэрчилгээ олгогдсоныг гадны хүнд хэлж өгөх бөгөөд өөр хүний дугаарыг
 * таамаглах боломж нээнэ. `uid` + `courseSlug`-аас hash авбал дугаар нь
 * ТОГТВОРТОЙ (ижил хүн, ижил курст үргэлж ижил) мөртөө таамаглах аргагүй.
 *
 * ⚠ `uid`-г ШУУД оруулахгүй, зөвхөн hash-ийн ОРЦ болгож ашиглана —
 * гэрчилгээн дээр хэвлэгдсэн дугаараас данс руу буцаж очих ёсгүй.
 */
function certificateCode(uid: string, courseSlug: string): string {
  const digest = createHash("sha256").update(`${uid}:${courseSlug}`).digest("hex");
  return `TQ-${digest.slice(0, 4).toUpperCase()}-${digest.slice(4, 8).toUpperCase()}`;
}

export async function certificatesView(uid: string): Promise<CertificatesView> {
  const [user] = await db
    .select({
      displayName: users.displayName,
      email: users.email,
      premiumUntil: users.premiumUntil,
    })
    .from(users)
    .where(eq(users.uid, uid))
    .limit(1);

  const empty: CertificatesView = {
    premium: false,
    certificates: [],
    holderName: "",
  };

  if (!user) return empty;

  /*
   * Курс бүрийн НИЙТ хичээл. `lessons` нь `units`-ээр дамжин курстэй
   * холбогддог тул JOIN зайлшгүй (`skills.ts`-тэй ижил).
   */
  const totals = await db
    .select({ courseSlug: units.courseSlug, total: count() })
    .from(lessons)
    .innerJoin(units, eq(units.id, lessons.unitId))
    .groupBy(units.courseSlug);

  const totalBySlug = new Map(totals.map((row) => [row.courseSlug, Number(row.total)]));

  const progress = await db
    .select({
      courseSlug: lessonProgress.courseSlug,
      completed: count(),
      xp: sql<number>`coalesce(sum(${lessonProgress.xpEarned}), 0)`,
      lastAt: sql<Date>`max(${lessonProgress.completedAt})`,
    })
    .from(lessonProgress)
    .where(eq(lessonProgress.uid, uid))
    .groupBy(lessonProgress.courseSlug);

  const meta = await db
    .select({
      slug: courses.slug,
      title: courses.title,
      icon: courses.icon,
      color: courses.color,
      school: courses.school,
    })
    .from(courses);

  const metaBySlug = new Map(meta.map((row) => [row.slug, row]));

  const certificates: Certificate[] = [];

  for (const row of progress) {
    const total = totalBySlug.get(row.courseSlug) ?? 0;

    /*
     * ⚠ `total > 0` шалгалт ЗААВАЛ. Хичээлгүй курст `completed` ба `total`
     * хоёул 0 болж "0 >= 0" үнэн гарна — өөрөөр хэлбэл ХООСОН курс бүрт
     * гэрчилгээ олгогдоно. Санд 39 курсын 36 нь хичээлгүй тул энэ шалгалт
     * байхгүй бол хэрэглэгч юу ч хийлгүй 36 гэрчилгээтэй болно.
     */
    if (total === 0 || Number(row.completed) < total) continue;

    const info = metaBySlug.get(row.courseSlug);
    if (!info) continue;

    certificates.push({
      courseSlug: row.courseSlug,
      title: info.title,
      icon: info.icon,
      color: info.color,
      school: info.school,
      lessons: total,
      xp: Number(row.xp),
      issuedAt: new Date(row.lastAt),
      code: certificateCode(uid, row.courseSlug),
    });
  }

  // Хамгийн сүүлд авсан нь эхэнд — шинэ амжилт нь хамгийн сонирхолтой.
  certificates.sort((x, y) => y.issuedAt.getTime() - x.issuedAt.getTime());

  return {
    premium: isPremiumUser(user.premiumUntil),
    certificates,
    /*
     * Нэргүй бол имэйлийн @-аас өмнөх хэсгийг авна. Гэрчилгээн дээр
     * БҮТЭН ИМЭЙЛ хэвлэгдэх ёсгүй — хүүхэд түүнийгээ ангидаа үзүүлдэг.
     */
    holderName: user.displayName?.trim() || user.email.split("@")[0],
  };
}
