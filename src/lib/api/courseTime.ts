import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { courseTime } from "@/lib/db/schema";

/**
 * Курст зарцуулсан хугацаа.
 *
 * ⚠ ХУГАЦААГ КЛИЕНТ ХЭМЖИНЭ, тиймээс ИТГЭЛТЭЙ БИШ. Энэ тоо нь ЗӨВХӨН
 * статистик — оноо, эрх, шагнал ХЭЗЭЭ Ч үүнээс хамаарахгүй. Хэрэв хэзээ
 * нэгэн цагт шагнал өгөх бол ЭНЭ ТООГ БИШ, серверийн мэддэг үйлдлүүдийг
 * (хичээл дуусгасан тоо) үндэслэнэ.
 */

/**
 * Нэг хичээлээс хүлээн авах ДЭЭД хугацаа (секунд).
 *
 * Хүүхэд таб нээгээд орхиод явчихвал клиент цаг нь цагаар тоолсоор байна.
 * 2 цаг гэсэн хязгаар нь хамгийн урт хичээлээс ч хамаагүй өндөр тул
 * жинхэнэ өгөгдлийг хэзээ ч тайрахгүй, харин утгагүй утгыг барина.
 */
const MAX_SECONDS_PER_LESSON = 2 * 60 * 60;

/** Клиентээс ирсэн хугацааг эрүүл утга руу татна. */
export function sanitizeSeconds(value: unknown): number {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(MAX_SECONDS_PER_LESSON, Math.floor(seconds));
}

/**
 * Курсын нийт хугацаанд нэмнэ.
 *
 * Мөр байхгүй бол үүсгэнэ (`onConflictDoUpdate`) — нэг асуулгаар, уралдаанд
 * тэсвэртэй.
 */
export async function addCourseSeconds(
  uid: string,
  courseSlug: string,
  seconds: number
): Promise<void> {
  if (seconds <= 0) return;

  await db
    .insert(courseTime)
    .values({ uid, courseSlug, seconds })
    .onConflictDoUpdate({
      target: [courseTime.uid, courseTime.courseSlug],
      set: {
        seconds: sql`${courseTime.seconds} + ${seconds}`,
        updatedAt: new Date(),
      },
    });
}

export type CourseTimeEntry = {
  courseSlug: string;
  seconds: number;
  updatedAt: Date;
};

/** Хэрэглэгчийн курс бүрд зарцуулсан хугацаа — их нь эхэнд. */
export async function listCourseTime(uid: string): Promise<CourseTimeEntry[]> {
  return db
    .select({
      courseSlug: courseTime.courseSlug,
      seconds: courseTime.seconds,
      updatedAt: courseTime.updatedAt,
    })
    .from(courseTime)
    .where(eq(courseTime.uid, uid))
    .orderBy(desc(courseTime.seconds));
}
