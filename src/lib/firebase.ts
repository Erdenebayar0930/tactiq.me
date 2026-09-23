import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import { getFirebaseClientConfig } from "./config";

/**
 * Firebase-ийн клиент талын үйлчилгээнүүд.
 *
 * Аутентикац Firebase дээр үлдсэн — сурагчийн профайл, явц бүхэлдээ Postgres-д
 * байрлана. Firebase нь ЗӨВХӨН "энэ хүн хэн бэ" гэсэн асуултад хариулна.
 *
 * Messaging (FCM) эхлүүлэхээ больсон: Tactiq дээр push мэдэгдэл байхгүй тул
 * тэр SDK-г ачаалах нь клиент бандлыг дэмий тэлнэ. Тохиргоо дахь "Мэдэгдэл"
 * унтраалга нь одоогоор зөвхөн хадгалагдаж буй ХҮСЭЛТ бөгөөд сануулга илгээх
 * механизм нэмэгдэхэд хэрэглэгдэнэ.
 */
const app = initializeApp(getFirebaseClientConfig());

export { app };

export const auth = getAuth(app);
