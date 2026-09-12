import { getAudioContext, unlockAudio } from "@/lib/audio/context";

/**
 * ДУУНЫ ЭФФЕКТҮҮД — зөв/буруу хариулт, худалдан авалт, шагнал гэх мэт.
 *
 * ⚠ ДУУНЫ ФАЙЛ ТАТАХГҮЙ, синтезээр гаргана. Шалтгаан нь хөгжмийн
 * хичээлтэй ижил (`lib/music/synth.ts`): энэ апп нь PWA бөгөөд `public/`
 * доторх бүхнийг precache хийдэг тул эффект бүрийн mp3 нь суулгах үеийн
 * МОБАЙЛ ТРАФИК болж хувирна. Синтез нь 0 байт татаж, офлайн ажиллана.
 *
 * ⚠ ЗӨВХӨН КЛИЕНТ.
 */

/* -------------------------------------------------------------------------
 * Хэрэглэгчийн тохиргоо
 * ---------------------------------------------------------------------- */

/**
 * Дуу асаалттай эсэх — `users.soundEnabled` тохиргооноос.
 *
 * ⚠ Модулийн хэмжээнд хадгалж байгаа шалтгаан: эффект нь гүн байрлах
 * компонентуудаас (дасгалын карт, дэлгүүрийн товч) дуудагддаг ба тэдгээрт
 * хэрэглэгчийн тохиргоог prop-оор дамжуулах нь бүх модыг бохирдуулна.
 * `SoundSettingSync` компонент энэ утгыг тохиргоотой синк байлгана.
 *
 * ⚠ Анхдагч нь `true`: тохиргоо ачаалагдахаас өмнөх эхний эффект (жишээ нь
 * нэвтэрсэн даруйд) чимээгүй өнгөрөх нь дуу хаалттай мэт сэтгэгдэл төрүүлнэ.
 */
let enabled = true;

export function setSfxEnabled(value: boolean): void {
  enabled = value;
}

export function isSfxEnabled(): boolean {
  return enabled;
}

/* -------------------------------------------------------------------------
 * Үндсэн блок
 * ---------------------------------------------------------------------- */

type ToneOptions = {
  /** Давтамж (Гц). */
  freq: number;
  /** Контекстийн цагаас хойш хэдэн секундын дараа. */
  at?: number;
  /** Үргэлжлэх хугацаа (сек). */
  duration?: number;
  type?: OscillatorType;
  /** Дууны хэмжээ (0-1). */
  gain?: number;
  /** Төгсгөлийн давтамж — өгвөл гулсана (glide). */
  toFreq?: number;
};

/**
 * Нэг ая.
 *
 * ⚠ Дугтуй (envelope) ЗААВАЛ: долгионыг огцом асаах/унтраахад "тас" гэсэн
 * шаржигнаан (click) сонсогддог. Богино өсөлт + экспоненциал уналт нь
 * түүнийг арилгана. `exponentialRamp` нь ТЭГ рүү бууж чадахгүй тул 0.0001
 * хүртэл буулгана.
 */
function tone({ freq, at = 0, duration = 0.12, type = "sine", gain = 0.2, toFreq }: ToneOptions) {
  const ctx = getAudioContext();
  if (!ctx || !enabled) return;

  const start = ctx.currentTime + at;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (toFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, toFreq), start + duration);
  }

  const amp = ctx.createGain();
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.008);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(amp).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

/** Дараалсан аянуудыг НЭГ дуудлагаар — эффект бүр богино мотив. */
function sequence(notes: ToneOptions[]) {
  if (!enabled) return;
  // ⚠ Эффектийг ХЭРЭГЛЭГЧИЙН товшилтын дотор дууддаг тул энд сэрээх нь
  // хамгийн найдвартай мөч (iOS Safari шаарддаг).
  unlockAudio();
  for (const note of notes) tone(note);
}

/* -------------------------------------------------------------------------
 * Эффектүүд
 * ---------------------------------------------------------------------- */

/** Нотын давтамж — тэгш темперацлагдсан хэмжүүрээс (A4 = 440). */
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;
const A3 = 220;
const F3 = 174.61;

export const sfx = {
  /**
   * ЗӨВ хариулт — өгсөх гурвал (до-ми-соль).
   *
   * ⚠ Богино (≈0.25с) байх ёстой: дасгал бүрд сонсогддог тул урт эффект нь
   * хичээлийн хэмнэлийг удаашруулж, хэдэн арав дахин давтагдахад ядаргаатай
   * болно.
   */
  correct() {
    sequence([
      { freq: C5, at: 0, duration: 0.09, type: "triangle", gain: 0.18 },
      { freq: E5, at: 0.07, duration: 0.09, type: "triangle", gain: 0.18 },
      { freq: G5, at: 0.14, duration: 0.16, type: "triangle", gain: 0.2 },
    ]);
  },

  /**
   * БУРУУ хариулт — нам, богино бүдүүн чимээ.
   *
   * ⚠ ЗӨӨЛӨН байлгав: хатуу "алдааны дуугаралт" нь хүүхдэд шийтгэл мэт
   * сонсогдоно. Энэ апп алдааг шийтгэдэггүй (зүрх хасагдсан) тул дуу нь ч
   * зэмлэх биш, зөвхөн "болсонгүй" гэдгийг мэдэгдэнэ.
   */
  wrong() {
    sequence([
      { freq: A3, toFreq: F3, at: 0, duration: 0.22, type: "sine", gain: 0.16 },
    ]);
  },

  /** ХИЧЭЭЛ ДУУСАВ — баяр хүргэсэн өгсөх дөрвөл. */
  complete() {
    sequence([
      { freq: C5, at: 0, duration: 0.1, type: "triangle", gain: 0.2 },
      { freq: E5, at: 0.09, duration: 0.1, type: "triangle", gain: 0.2 },
      { freq: G5, at: 0.18, duration: 0.1, type: "triangle", gain: 0.2 },
      { freq: C6, at: 0.27, duration: 0.3, type: "triangle", gain: 0.22 },
    ]);
  },

  /** ЗООС — худалдан авалт, зоос орох. Хоёр товч, тод дуу. */
  coin() {
    sequence([
      { freq: G5, at: 0, duration: 0.07, type: "square", gain: 0.12 },
      { freq: C6, at: 0.06, duration: 0.14, type: "square", gain: 0.12 },
    ]);
  },

  /** ШАГНАЛ — гялалзсан таван аялгуу. */
  reward() {
    sequence([
      { freq: C5, at: 0, duration: 0.08, type: "triangle", gain: 0.18 },
      { freq: E5, at: 0.07, duration: 0.08, type: "triangle", gain: 0.18 },
      { freq: G5, at: 0.14, duration: 0.08, type: "triangle", gain: 0.18 },
      { freq: C6, at: 0.21, duration: 0.08, type: "triangle", gain: 0.2 },
      { freq: C6 * 1.25, at: 0.28, duration: 0.32, type: "triangle", gain: 0.22 },
    ]);
  },

  /** ТЭЖЭЭВЭР асрах — зөөлөн, дулаан хоёр аялгуу. */
  care() {
    sequence([
      { freq: E5, at: 0, duration: 0.1, type: "sine", gain: 0.16 },
      { freq: G5, at: 0.08, duration: 0.18, type: "sine", gain: 0.16 },
    ]);
  },

  /** ТОВШИЛТ — маш богино, бараг мэдэгдэхгүй товшилтын хариу. */
  tap() {
    sequence([{ freq: G5, at: 0, duration: 0.04, type: "sine", gain: 0.08 }]);
  },
};
