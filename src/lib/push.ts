"use client";

import { apiFetch } from "@/lib/apiClient";
import { app } from "@/lib/firebase";

/**
 * PUSH МЭДЭГДЭЛ — тэмцээн эхлэхийн 10 минутын өмнөх сануулга.
 *
 * ⚠ FCM SDK-г ЗАЛХУУГААР (dynamic import) ачаална: `firebase/messaging`
 * нь ~40 КБ бөгөөд мэдэгдэл асаадаг хүн цөөн. Бүх хуудасны эхний багцад
 * оруулбал хичээл нээх хурд нь тэр хэмжээгээр удаашрана.
 *
 * ⚠ ЗӨВШӨӨРЛИЙГ ХЭРЭГЛЭГЧИЙН ҮЙЛДЛЭЭС асууна (товч дарах), хуудас
 * ачаалахад БИШ: хөтчүүд гэнэтийн зөвшөөрлийн цонхыг «спам» гэж үзэж
 * хориглодог, мөн хэрэглэгч ойлгохгүйгээр «Хориглох» дарвал тэр сонголт
 * УДААН хадгалагдана.
 */

/** Токеныг хөтөч дээр санана — унтраахад устгах хаяг хэрэгтэй. */
const TOKEN_KEY = "tactiq:push-token";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    /*
     * ⚠ `PushManager` шалгах нь ЗААВАЛ: iOS Safari нь `Notification`-ыг
     * тодорхойлсон ч апп «Нүүр дэлгэцэнд нэмсэн» биш бол push ажиллахгүй.
     */
    "PushManager" in window
  );
}

export function pushPermission(): NotificationPermission | null {
  return pushSupported() ? Notification.permission : null;
}

/**
 * Мэдэгдэл асаах — зөвшөөрөл асууж, токеныг серверт бүртгэнэ.
 *
 * @returns Амжилттай эсэх; `false` бол шалтгааныг `reason` хэлнэ.
 */
export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported()) {
    return { ok: false, reason: "Энэ хөтөч мэдэгдэл дэмжихгүй байна." };
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return { ok: false, reason: "Мэдэгдлийн тохиргоо дутуу байна." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Мэдэгдлийн зөвшөөрөл олгогдоогүй." };
  }

  try {
    const { getMessaging, getToken } = await import("firebase/messaging");

    /*
     * ⚠ ТУСДАА SERVICE WORKER (`/firebase-messaging-sw.js`): аппын
     * үндсэн SW нь next-pwa-гаар ҮҮСГЭГДДЭГ тул түүнд push боловсруулагч
     * нэмэх боломжгүй (дараагийн build дарж бичнэ). FCM өөрийн
     * scope дээр бүртгэгдэнэ.
     */
    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/firebase-cloud-messaging-push-scope" }
    );

    const token = await getToken(getMessaging(app), {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) return { ok: false, reason: "Токен авч чадсангүй." };

    await apiFetch("/api/push/token", {
      method: "POST",
      body: { token, label: deviceLabel() },
    });

    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // Хадгалагдахгүй бол унтраахад токеныг олохгүй — доор тайлбарласан.
    }

    return { ok: true };
  } catch (cause) {
    console.error("[push] асаахад алдаа", cause);
    return { ok: false, reason: "Мэдэгдэл асаахад алдаа гарлаа." };
  }
}

/**
 * Мэдэгдэл унтраах — ЭНЭ төхөөрөмжийн токеныг серверээс устгана.
 *
 * ⚠ Токеныг `localStorage`-оос олно. Олдохгүй бол (хөтчийн өгөгдөл
 * арчигдсан) сервер талд мөр үлдэнэ — тэр нь FCM-ээс
 * `registration-token-not-registered` авмагц өөрөө цэвэрлэгдэнэ
 * (`lib/api/tournamentReminders.ts`). Тиймээс энд алдаа шидэхгүй.
 */
export async function disablePush(): Promise<void> {
  let token: string | null = null;
  try {
    token = window.localStorage.getItem(TOKEN_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    token = null;
  }

  if (!token) return;

  await apiFetch(`/api/push/token?token=${encodeURIComponent(token)}`, {
    method: "DELETE",
  }).catch(() => {
    // Сүлжээний алдаа — токен нь хугацаагаараа цэвэрлэгдэнэ.
  });
}

/** Ямар төхөөрөмж вэ — «ком дээрх мэдэгдлийг унтраа» гэж хэлэхэд. */
function deviceLabel(): string {
  const agent = navigator.userAgent;
  if (/android/i.test(agent)) return "Android";
  if (/iphone|ipad|ipod/i.test(agent)) return "iPhone/iPad";
  if (/mac/i.test(agent)) return "Mac";
  if (/windows/i.test(agent)) return "Windows";
  return "Төхөөрөмж";
}
