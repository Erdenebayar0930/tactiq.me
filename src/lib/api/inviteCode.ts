import "server-only";

/**
 * Урилгын код (багшийн бүлэг, эцэг эх-хүүхэд холбоос) шинээр үүсэхдээ
 * `schema.ts` доторх default функцээр л бичигддэг — энд зөвхөн хэрэглэгчийн
 * ГАРААР бичсэн кодыг харьцуулахаас өмнө цэвэрлэнэ.
 */
export function normalizeInviteCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}
