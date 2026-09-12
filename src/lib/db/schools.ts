import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { schoolTexts } from "@/lib/db/schema";

import type { SchoolText, TopicGroup } from "@/lib/tactiq/schools";

/**
 * Сургуулийн текстийн засварын сангийн давхарга.
 *
 * ⚠ Энэ модуль сургуулийн ЖАГСААЛТЫГ мэддэггүй — зөвхөн `school_texts`
 * мөрүүдийг л уншиж бичнэ. Кодын `SCHOOLS`-тай нийлүүлэх нь
 * `lib/tactiq/schools.ts`-ийн `mergeSchoolTexts`-ийн ажил. Ингэж хуваасан
 * нь клиент ч нийлүүлэлтийг ижил кодоор хийж чадахын тулд (дүрс нь React
 * компонент тул өгөгдлийн сангаар дамжуулах боломжгүй).
 */

/** Засвартай БҮХ мөр. Мөр байхгүй сургууль нь кодын анхдагчаараа хэвээр. */
export async function listSchoolTexts(): Promise<SchoolText[]> {
  const rows = await db
    .select({
      slug: schoolTexts.slug,
      title: schoolTexts.title,
      subtitle: schoolTexts.subtitle,
      tagline: schoolTexts.tagline,
      description: schoolTexts.description,
      groups: schoolTexts.groups,
    })
    .from(schoolTexts);

  return rows;
}

export type SchoolTextPatch = {
  title?: string | null;
  subtitle?: string | null;
  tagline?: string | null;
  description?: string | null;
  groups?: TopicGroup[] | null;
};

/**
 * Нэг сургуулийн текстийг бичнэ — мөр байхгүй бол үүсгэнэ.
 *
 * ⚠ `patch`-д ОРООГҮЙ багана хөндөгдөхгүй: админ зөвхөн нэрийг засахад
 * тайлбар нь `null` болж анхдагч руугаа буцаж УНАХГҮЙ. Тиймээс
 * `onConflictDoUpdate`-д бүх баганыг биш, зөвхөн ирсэн талбаруудыг өгнө.
 */
export async function saveSchoolText(slug: string, patch: SchoolTextPatch): Promise<void> {
  const now = new Date();

  await db
    .insert(schoolTexts)
    .values({ slug, ...patch, updatedAt: now })
    .onConflictDoUpdate({
      target: schoolTexts.slug,
      set: { ...patch, updatedAt: now },
    });
}

/** Засварыг бүрэн авч, сургуулийг кодын анхдагч руу нь буцаана. */
export async function resetSchoolText(slug: string): Promise<void> {
  await db.delete(schoolTexts).where(eq(schoolTexts.slug, slug));
}
