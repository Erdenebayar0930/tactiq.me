/**
 * Богино дуут эффект — Web Audio API-аар шууд синтезлэнэ, файл татахгүй.
 *
 * ЯАГААД АУДИО ФАЙЛ БИШ: нэг MP3/OGG ч гэсэн сүлжээний хүсэлт, бандлын
 * жин нэмнэ. Осцилляторын хэдхэн тэмдэглэгээ 1KB-аас бага код бөгөөд
 * офлайнд ч ажиллана.
 */

type ToneStep = { freq: number; start: number; duration: number; gain?: number };

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedContext) sharedContext = new AudioCtx();
  return sharedContext;
}

function playTones(steps: ToneStep[]) {
  const ctx = getContext();
  if (!ctx) return;
  // Хөтөч түгжсэн AudioContext-ийг зөвхөн хэрэглэгчийн үйлдлийн дараа
  // resume хийж болно — дуудагч бүр хэрэглэгчийн товшилтын дараах урсгал
  // дотор байдаг тул энд шууд оролдоод, амжилтгүй бол чимээгүй өнгөрнө.
  void ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  for (const { freq, start, duration, gain = 0.15 } of steps) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = freq;
    gainNode.gain.setValueAtTime(0, now + start);
    gainNode.gain.linearRampToValueAtTime(gain, now + start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
    oscillator.connect(gainNode).connect(ctx.destination);
    oscillator.start(now + start);
    oscillator.stop(now + start + duration + 0.02);
  }
}

/** Хичээл давсан үеийн баяр хүргэх аялгуу — гурван нот дээшлэх арпеджио. */
export function playSuccessChime() {
  playTones([
    { freq: 523.25, start: 0, duration: 0.16 },
    { freq: 659.25, start: 0.12, duration: 0.16 },
    { freq: 783.99, start: 0.24, duration: 0.3, gain: 0.18 },
  ]);
}

/** Тэнцээгүй үеийн зөөлөн дохио — сурагчийг бухимдуулахгүй, дарамтгүй өнгө. */
export function playRetryChime() {
  playTones([
    { freq: 392, start: 0, duration: 0.14, gain: 0.1 },
    { freq: 349.23, start: 0.13, duration: 0.22, gain: 0.1 },
  ]);
}
