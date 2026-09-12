"use client";

import type { User } from "firebase/auth";

/**
 * Firebase-ийн клиент сессийг сервер талын HttpOnly cookie-той тааруулна.
 *
 * ЯАГААД: `apiClient` нь ID token-ыг толгойгоор явуулдаг ба энэ нь нэг origin
 * дээр хангалттай. Гэвч (1) дэд домэйн хооронд нэвтрэлт хуваалцах, (2) SSR-д
 * хэрэглэгчийг таних хоёрт cookie шаардлагатай. `lib/api/sessionCookie.ts`
 * дээрх тайлбарыг үзнэ үү.
 *
 * ⚠ Энэ бүхэн ЧИМЭЭГҮЙ БҮТЭЛГҮЙТЭХ ёстой. Cookie тавигдахгүй байх нь апп
 * ажиллахгүй гэсэн үг БИШ — Bearer токен хэвээрээ ажиллана. Тиймээс алдааг
 * хэрэглэгчид ХЭЗЭЭ Ч харуулахгүй, зөвхөн консолд бичнэ.
 */

/** Серверийн тавьсан маркер — `SESSION_MARKER_COOKIE_NAME`-тэй тааруулна. */
const MARKER = "__session_expires";

/**
 * Дуусахаас ЭНЭ хугацааны өмнө шинэчилнэ.
 *
 * Яг дуусах мөчийг хүлээвэл идэвхтэй хэрэглэгчийн cookie дундуур нь
 * хүчингүй болж, дараагийн SSR хуудас "нэвтрээгүй" болж харагдана. Нэг
 * хоногийн нөөц нь өдөр бүр нээдэг хэрэглэгчийг хэзээ ч тэр байдалд
 * оруулахгүй.
 */
const RENEW_BEFORE_MS = 24 * 60 * 60 * 1000;

function readMarker(): number | null {
  if (typeof document === "undefined") return null;

  // Cookie нэр нь тогтмол, тусгай тэмдэгтгүй тул энгийн задаргаа хангалттай
  const match = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${MARKER}=`));

  if (!match) return null;

  const value = Number(match.slice(MARKER.length + 1));
  return Number.isFinite(value) ? value : null;
}

/** Cookie шинэ хэвээр байна уу — байвал дахин үүсгэх шаардлагагүй. */
function isFresh(): boolean {
  const expiresAt = readMarker();
  return expiresAt !== null && expiresAt - Date.now() > RENEW_BEFORE_MS;
}

/**
 * Зэрэг дуудагдахаас сэргийлнэ: `onAuthStateChanged` болон `onIdTokenChanged`
 * нь нэвтрэх мөчид бараг зэрэг ажилладаг тул хамгаалалтгүй бол хоёр cookie
 * үүсгэх хүсэлт зэрэг явна.
 */
let syncing: Promise<void> | null = null;

export function syncSessionCookie(user: User, force = false): Promise<void> {
  if (syncing) return syncing;
  if (!force && isFresh()) return Promise.resolve();

  syncing = (async () => {
    try {
      const idToken = await user.getIdToken();

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      /**
       * 501 = сервер дээр Firebase Admin тохируулаагүй. Энэ нь АЛДАА БИШ,
       * зөвхөн "энэ орчинд cookie горим байхгүй" гэсэн үг — Bearer горимд
       * үлдэнэ. Консолыг дэмий бохирдуулахгүйн тулд чимээгүй өнгөрнө.
       */
      if (!response.ok && response.status !== 501) {
        console.warn("Session cookie тавигдсангүй:", response.status);
      }
    } catch (error) {
      console.warn("Session cookie тавигдсангүй:", error);
    } finally {
      syncing = null;
    }
  })();

  return syncing;
}

/**
 * Гарах үед cookie-г устгана.
 *
 * ⚠ Firebase-ээс гарахаас ӨМНӨ дуудагдах ёстой ч энэ route токен
 * шаарддаггүй тул дараалал хатуу биш. Гол нь ЗААВАЛ дуудагдах: cookie
 * үлдвэл SSR хуудас гарсан хэрэглэгчийг нэвтэрсэн гэж үзсээр байна.
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch (error) {
    console.warn("Session cookie устгагдсангүй:", error);
  }
}
