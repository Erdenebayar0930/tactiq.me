import "server-only";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifySessionCookie } from "@/lib/firebaseAdmin";

import { SESSION_COOKIE_NAME } from "./sessionCookie";

import type { UserRow } from "@/lib/db/schema";

/**
 * Server component / layout дотроос нэвтэрсэн хэрэглэгчийг УНШИХ цэг.
 *
 * `getCaller` (route handler-т зориулсан) нь `NextRequest` шаарддаг тул
 * render-ийн үед хэрэглэгдэхгүй. Энэ нь `cookies()`-оос уншина.
 *
 * ⚠ ЗӨВХӨН session cookie дээр ажиллана — `Authorization` толгой render-ийн
 * үед байхгүй (хөтөч навигаци толгой нэмдэггүй). Тиймээс cookie тавигдаагүй
 * серверт (Firebase Admin тохируулаагүй) энэ нь ҮРГЭЛЖ "signed-out" буцаана.
 * Тэр тохиолдолд хуудсуудаа клиент талын `<Protected>`-оор л хамгаалсан
 * хэвээр үлдээх ёстой.
 */
export type ServerUser =
  /** Cookie байхгүй эсвэл хүчингүй */
  | { state: "signed-out" }
  /** Firebase дээр нэвтэрсэн ч Postgres дээр мөр үүсээгүй (бүртгэл дуусаагүй) */
  | { state: "no-profile"; uid: string; email: string }
  | { state: "ready"; user: UserRow }
  /**
   * Өгөгдлийн сан хандахгүй байна.
   *
   * "signed-out"-оос ЗААВАЛ ялгана: сан унасныг "та нэвтрээгүй" гэж
   * харуулбал хэрэглэгч дэмий дахин нэвтрэхийг оролдож, бас чадахгүй.
   * `lib/api/auth.ts`-ийн `ServiceUnavailableError`-тай ижил зарчим.
   */
  | { state: "unavailable" };

/**
 * `cache()` нь НЭГ render дотор дахин дуудагдахад дахин ажиллахгүй — layout,
 * хуудас, доторх компонентууд бүгд дуудсан ч Firebase шалгалт болон SQL нэг л
 * удаа явна.
 */
export const getServerUser = cache(async (): Promise<ServerUser> => {
  const cookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return { state: "signed-out" };

  const decoded = await verifySessionCookie(cookie);
  if (!decoded) return { state: "signed-out" };

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.uid, decoded.uid))
      .limit(1);

    if (!user) {
      return {
        state: "no-profile",
        uid: decoded.uid,
        email: decoded.email ?? "",
      };
    }

    return { state: "ready", user };
  } catch (error) {
    console.error("getServerUser: өгөгдлийн сан руу хандаж чадсангүй:", error);
    return { state: "unavailable" };
  }
});

/**
 * Зөвхөн "энэ хүн хэн бэ" гэдэг л хэрэгтэй, ялгаа нь хамаагүй үед.
 *
 * ⚠ `unavailable`-ыг ч `null` болгодог тул ЭРХ ШАЛГАХАД бүү ашигла —
 * зөвхөн харуулах (толгой дээрх нэр, аватар) зорилгоор.
 */
export async function getServerUserOrNull(): Promise<UserRow | null> {
  const result = await getServerUser();
  return result.state === "ready" ? result.user : null;
}
