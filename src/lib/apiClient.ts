"use client";

import { auth } from "./firebase";
import { getDeviceId } from "./deviceId";
import { forceSignOut, reasonFromCode } from "./session";

/**
 * Серверийн алдааны хариу — `code`, болон `/api/users/me`-ийн
 * "device-limit"-ийн хувьд `devices` жагсаалт зэрэг НЭМЭЛТ талбаруудыг
 * дуудагч тал уншиж чадахын тулд ердийн `Error`-оос өргөтгөнө.
 */
export class ApiError extends Error {
  code?: string;
  payload: Record<string, unknown>;

  constructor(message: string, payload: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.code = typeof payload.code === "string" ? payload.code : undefined;
    this.payload = payload;
  }
}

/**
 * Сервер талын API руу хандах нийтлэг туслах.
 *
 * Postgres-т browser-оос шууд холбогдох боломжгүй тул бүх өгөгдлийн үйлдэл
 * /api/... route-оор дамжина. Хэрэглэгчийг Firebase ID token-оор танина.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    auth?: boolean;
    /**
     * Нэвтэрсэн бол ID token хавсаргана, гэвч зочинд ЗААВАЛ ШААРДАХГҮЙ —
     * туршилтын хичээл шиг "нэвтэрсэн бол илүү сайн, гэхдээ зочин ч орж
     * болно" төрлийн route-д. `auth`-аас ДЭЭГҮҮР жинтэй: аль аль нь `true`
     * бол зочинд алдаа шидэхгүй.
     */
    authOptional?: boolean;
  } = {}
): Promise<T> {
  const { method = "GET", body, auth: needsAuth = true, authOptional = false } = options;

  const headers: Record<string, string> = {};

  if (needsAuth || authOptional) {
    /**
     * Firebase сессээ сэргээх хүртэл ХҮЛЭЭНЭ.
     *
     * ⚠ `auth.currentUser` нь хуудас ачаалагдмагц ХООСОН байдаг: Firebase нь
     * сессээ IndexedDB-ээс асинхроноор сэргээдэг. Шууд шалгавал бүтэн хуудас
     * ачаалагдах бүрд (жишээ нь гаднаас буцаж ирэх, F5 дарах) эхний хүсэлтүүд
     * "Нэвтэрсэн байх шаардлагатай" гэж ХУДАЛ унана — хэрэглэгч нэвтэрсэн
     * хэвээр байхад. Энэ нь Google-ийн зөвшөөрлөөс буцаж ирэхэд амжилтын
     * мессежтэй зэрэг алдаа гарч байсны шалтгаан байв.
     *
     * `authStateReady()` нь анхны төлөв тодрох хүртэл хүлээгээд шийднэ.
     */
    await auth.authStateReady();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      if (needsAuth && !authOptional) {
        throw new Error("Нэвтэрсэн байх шаардлагатай.");
      }
      // authOptional + нэвтрээгүй: толгойгүй, зочноор л явуулна.
    } else {
      headers.Authorization = `Bearer ${await currentUser.getIdToken()}`;

      // Сервер ЭНЭ толгойгоор "хэдэн төхөөрөмж" гэдгийг тоолно
      // (`/api/users/me`, `src/lib/api/devices.ts`). Хоосон бол зүгээр
      // толгойгүй явна — тухайн хүсэлт төхөөрөмж тоолохгүй.
      const deviceId = getDeviceId();
      if (deviceId) headers["X-Device-Id"] = deviceId;
    }
  }

  // FormData-г JSON болгож болохгүй: Content-Type-ыг хөтөч өөрөө boundary-тай
  // нь тавина, бид гараар тавьбал сервер хэсгүүдийг нь салгаж чадахгүй болно
  const isForm = body instanceof FormData;

  if (body !== undefined && !isForm) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(path, {
      method,
      headers,
      body:
        body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (error) {
    console.error("Сервертэй холбогдож чадсангүй:", error);
    throw new Error("Сервертэй холбогдож чадсангүй. Холболтоо шалгана уу.");
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const { error, code } = payload as { error?: string; code?: string };

    // Эрх хаагдсан / бүртгэл устсан бол хүлээхгүйгээр сессийг тасална.
    // Ямар ч хуудсан дээр байсан дараагийн хүсэлт дээр шууд гарна.
    // ⚠ "device-limit" энд ОРОХГҮЙ (`reasonFromCode` танихгүй) — хэрэглэгч
    // хүчинтэй хэвээр, зөвхөн төхөөрөмжийн хязгаарт хүрсэн тул гаргах
    // шаардлагагүй.
    const reason = reasonFromCode(code);
    if (response.status === 403 && reason) {
      await forceSignOut(reason);
    }

    throw new ApiError(
      error || `Хүсэлт амжилтгүй (${response.status})`,
      payload as Record<string, unknown>
    );
  }

  return payload as T;
}
