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

/**
 * Профайлын зураг хадгалах Cloud Storage bucket — ЗАЛХУУ (lazy).
 *
 * ⚠ Модулийн түвшинд `getStorage(app)` гэж дуудаж БОЛОХГҮЙ. Энэ файлыг
 * АППЫН БҮХ хуудас импортолдог (`auth`-ийн төлөө) тул тэр дуудлага нь
 * Storage SDK-г БҮХ хуудасны эхний багцад оруулна. Бодит хэрэглээ нь
 * ганцхан газар — `/settings`-ийн аватар байршуулалт.
 *
 * `await getStorageLazy()` гэж дуудахад л SDK татагдана: тэр үед
 * хэрэглэгч аль хэдийн зураг сонгосон байгаа бөгөөд хэдэн зуун
 * миллисекунд хүлээх нь мэдрэгдэхгүй.
 */
export async function getStorageLazy() {
  const { getStorage } = await import("firebase/storage");
  return getStorage(app);
}
