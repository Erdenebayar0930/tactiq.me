import { getAudioContext, unlockAudio } from "@/lib/audio/context";

/**
 * Web Audio дээрх ЖИЖИГ синтезатор — төгөлдөр хуурын дууг ФАЙЛГҮЙ гаргана.
 *
 * ЯАГААД дуу бичлэг ТАТААГҮЙ ВЭ: 88 товчлуурын sample нь хэдэн МБ болно.
 * Энэ апп нь PWA бөгөөд `public/` доторх бүхнийг precache хийдэг
 * (`next.config.ts`) тул тэр жин нь суулгах үед хэрэглэгчийн МОБАЙЛ
 * ТРАФИК болж хувирна — хөдөө орон нутгийн сурагчид хамгийн их өртөнө.
 * Осцилляторын синтез нь 0 байт татаж, офлайн ч ажиллана.
 *
 * ⚠ ЗӨВХӨН КЛИЕНТ. `AudioContext` нь браузерын API — сервер талд байхгүй.
 */

/**
 * ⚠ Аудио контекстыг ЭНД үүсгэхээ БОЛИВ — `lib/audio/context.ts`-ийн
 * хуваалцсан контекстыг ашиглана. Шалтгаан: Chrome нэг табад зөвшөөрөх
 * `AudioContext`-ын тоо хязгаартай (~6) бөгөөд хөгжим, эффект хоёр
 * тусдаа контексттэй байвал хэрэглэгч хэдэн хуудас тойрсны дараа дуу
 * бүрмөсөн гарахаа болино.
 */
const getContext = getAudioContext;

/**
 * Хэрэглэгчийн товшилтын дотор дуудна — хуваалцсан контекстыг сэрээнэ.
 * (Импортлогчид өөрчлөгдөхгүйн тулд энд дахин экспортлов.)
 */
export { unlockAudio };

/**
 * Нэг нот тоглуулна.
 *
 * @param frequency Гц
 * @param when      контекстийн цагаас хойш хэдэн секундын дараа (аяг дараалуулахад)
 * @param duration  сунгах хугацаа (сек)
 *
 * Дууны хэлбэр: `triangle` долгион + хурдан халих дугтуй (envelope).
 * Синус нь хэт "шуугиантай", дөрвөлжин нь хэт хатуу — гурвалжин нь
 * төгөлдөр хуурын зөөлөн аяыг хамгийн ойр дуурайдаг бөгөөд хямд.
 */
export function playTone(frequency: number, when = 0, duration = 0.7): void {
  const ctx = getContext();
  if (!ctx) return;

  const start = ctx.currentTime + when;

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.value = frequency;

  const gain = ctx.createGain();
  /**
   * ⚠ Дугтуйгүйгээр (шууд асаах/унтраах) долгион огцом тасарч "тас" гэсэн
   * шаржигнаан (click) сонсогдоно. Богино өсөлт + экспоненциал уналт нь
   * түүнийг арилгаад зэрэг төгөлдөр хуурын цохилтын мэдрэмж өгнө.
   *
   * `exponentialRampToValueAtTime` нь ТЭГ рүү бууж ЧАДАХГҮЙ (математикийн
   * хувьд) тул 0.0001 хүртэл буулгаад дараа нь зогсооно.
   */
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/**
 * Аяыг ХЭМНЭЛТЭЙГЭЭР тоглуулна ("Сонсох" товч).
 *
 * Нот бүр өөрийн урттай (`beats`) бөгөөд бодит хугацаа нь ТЕМПЭЭС хамаарна:
 * нэг цохилт = 60/BPM секунд. Тиймээс ижил ая 60 BPM дээр удаан, 140 дээр
 * хурдан сонсогдоно — сурагч "темп" гэж юу болохыг ЧИХЭЭРЭЭ мэдэрнэ.
 *
 * Хугацааг Web Audio-гийн ЦАГААР төлөвлөнө (`when`), `setTimeout`-оор БИШ:
 * `setTimeout` нь таб идэвхгүй үед хойшилдог тул аяны хэмнэл алдагдана.
 *
 * @param notes  `{ frequency, beats }` — задалсан ая
 * @param bpm    минутад ногдох цохилт
 * @param offset хэдэн секундын дараа эхлэх (тоолуурын дараа тоглуулахад)
 * @returns      нийт үргэлжлэх хугацаа (сек)
 */
export function playMelody(
  notes: { frequency: number; beats: number }[],
  bpm: number,
  offset = 0
): number {
  const beat = 60 / bpm;
  let cursor = offset;

  for (const note of notes) {
    const duration = note.beats * beat;
    // Нотуудын хооронд ӨЧҮҮХЭН завсар (10%) үлдээнэ — эс бөгөөс ижил
    // өндөртэй дараалсан хоёр нот (жишээ нь "До До") нэг урт нот шиг
    // сонсогдож, сурагч хэдэн удаа дарахаа мэдэхгүй болно.
    playTone(note.frequency, cursor, duration * 0.9);
    cursor += duration;
  }

  return cursor - offset;
}

/**
 * Метрономын НЭГ цохилт.
 *
 * Эхний цохилт (тактын эхлэл) нь ӨНДӨР, бусад нь нам — "хэмжээ" гэдгийг
 * сонсоод ялгах цорын ганц арга нь энэ өргөлт юм. 3/4 хэмжээ нь "НЭГ-хоёр-
 * гурав, НЭГ-хоёр-гурав" гэж сонсогддог; өргөлтгүй бол зүгээр л жигд
 * тогших чимээ болж, хичээл утгагүй болно.
 */
export function playClick(when: number, accent: boolean): void {
  playTone(accent ? 1600 : 900, when, 0.06);
}

/**
 * Тактын тоолуур ("НЭГ-хоёр-гурав-дөрөв") — дасгал эхлэхийн ӨМНӨ.
 *
 * ЯАГААД ЗААВАЛ ВЭ: тоолуургүйгээр сурагч анхны цохилтоо ХАА нэгтээ дарж,
 * түүнээс хойшхи бүх хэмнэл нь зөв байсан ч "эхлэл буруу" гэж үнэлэгдэнэ.
 * Тоолуур нь эхлэх мөчийг ХОЁУЛАНД тодорхой болгоно.
 *
 * @returns тоолуур дуусах агшин (сек, `offset`-оос хойш)
 */
export function playCountIn(beatsPerBar: number, bpm: number, offset = 0): number {
  const beat = 60 / bpm;
  for (let i = 0; i < beatsPerBar; i += 1) {
    playClick(offset + i * beat, i === 0);
  }
  return beatsPerBar * beat;
}

/** Секундыг мс болгоно — таймер тавихад (`setTimeout` мс-ээр ажилладаг). */
export function toMs(seconds: number): number {
  return Math.round(seconds * 1000);
}
