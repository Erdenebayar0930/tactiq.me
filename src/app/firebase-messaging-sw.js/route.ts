import { NextResponse } from "next/server";

import { getFirebaseClientConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * FCM-ийн SERVICE WORKER — статик файл БИШ, ROUTE.
 *
 * ⚠ ЯАГААД: service worker нь env хувьсагч уншиж чадахгүй (модулийн
 * систем, `process` алга). Firebase тохиргоог статик файлд бичвэл
 * түлхүүрүүд репозиторт орох бөгөөд орчин (dev/prod) солиход гараар
 * засах шаардлагатай болно. Route нь тохиргоог сервер талаас шингээнэ.
 *
 * ⚠ `Service-Worker-Allowed` толгой ШААРДЛАГАТАЙ: бид SW-г
 * `/firebase-cloud-messaging-push-scope` гэсэн scope дээр бүртгэдэг
 * (`lib/push.ts`) бөгөөд хөтөч анхдагчаар зөвхөн скриптийн ӨӨРИЙН
 * замын доорх scope-ыг зөвшөөрдөг.
 *
 * ⚠ КЭШЛҮҮЛЭХГҮЙ: SW шинэчлэгдэхгүй бол хуучин хувилбар дээрээ гацна
 * (next.config.ts дахь `publicExcludes`-ийн тайлбартай ижил шалтгаан).
 *
 * ⚠ FCM SDK-г `importScripts`-ээр, compat хувилбараар ачаална: service
 * worker дотор ES модуль ачаалах нь бүх хөтөч дээр ажиллахгүй.
 */
export function GET() {
  const config = getFirebaseClientConfig();

  const body = `
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId,
    appId: config.appId,
  })});

const messaging = firebase.messaging();

/*
 * Апп ХААЛТТАЙ үеийн мэдэгдэл.
 *
 * ⚠ Энд өөрсдөө \`showNotification\` дуудахгүй: сервер \`notification\`
 * талбартай илгээдэг тул хөтөч ӨӨРӨӨ мэдэгдлийг зурдаг. Хоёуланг нь
 * хийвэл нэг мэдэгдэл ХОЁР удаа гарна.
 */
messaging.onBackgroundMessage(() => {});

/*
 * Мэдэгдэл дээр дарахад — тэмцээний хуудас руу.
 *
 * ⚠ АЛЬ ХЭДИЙН НЭЭЛТТЭЙ цонхыг ЭРЭМБЭЛНЭ: шинэ таб нээвэл хэрэглэгчид
 * ижил аппын хоёр таб үлдэж, аль нь "жинхэнэ" вэ гэдэг нь ойлгомжгүй
 * болно.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/tournament";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
`.trim();

  return new NextResponse(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "service-worker-allowed": "/",
      "cache-control": "no-store, must-revalidate",
    },
  });
}
