/**
 * АУДИО КОНТЕКСТ — аппын БҮХ дуу (хөгжмийн хичээл, эффект) энэ НЭГ
 * контекстыг хуваалцана.
 *
 * ⚠ ЯАГААД ХУВААЛЦАХ ЁСТОЙ ВЭ: Chrome нэг табад зөвшөөрөх `AudioContext`-ын
 * тоог хязгаарладаг (ойролцоогоор 6). Модуль бүр өөрийнхөө контекст
 * үүсгэвэл хэрэглэгч хэдэн хуудас тойрсны дараа дуу БҮРМӨСӨН гарахаа
 * болино — оношлоход маш хэцүү эвдрэл.
 *
 * ⚠ ЗӨВХӨН КЛИЕНТ. `AudioContext` нь браузерын API — сервер талд байхгүй
 * тул бүх функц `null`-д тэсвэртэй.
 */

let context: AudioContext | null = null;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Хуваалцсан контекстыг авна (шаардлагатай бол үүсгэнэ).
 *
 * ⚠ Товшилт БОЛООГҮЙ байхад үүсгэвэл хөтөч "suspended" төлөвт тавьдаг тул
 * дуу гарахгүй. Тиймээс `unlockAudio`-г ЗААВАЛ хэрэглэгчийн үйлдлийн
 * ДОТОР дуудна.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!context) {
    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) return null; // Маш хуучин хөтөч — дуугүй ч апп ажиллана
    context = new Ctor();
  }

  return context;
}

/**
 * Хэрэглэгчийн товшилтын дотор дуудна — iOS Safari, Chrome нь
 * "хэрэглэгчийн үйлдэлгүйгээр дуу гаргахгүй" бодлоготой.
 */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}
