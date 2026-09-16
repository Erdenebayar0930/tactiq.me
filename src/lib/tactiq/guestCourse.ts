/**
 * ЗОЧНЫ СОНГОСОН КУРС — зөвхөн ХӨТӨЧИД.
 *
 * ⚠ Зочинд хэрэглэгчийн мөр байхгүй тул `activeCourseSlug` хадгалах газар
 * алга. Сонголтыг `localStorage`-д үлдээнэ: курс сонгоод `/learn` руу
 * орох хооронд л хэрэгтэй бөгөөд алдагдсан ч ноцтой биш — анхдагч
 * туршилтын курс рүү буцна.
 *
 * ⚠ ЭНЭ НЬ ЭРХ БИШ. Ямар хичээл НЭЭЛТТЭЙ болохыг сервер шийднэ
 * (`/api/trial/lessons/[lessonId]`) — энд дурын slug бичсэн ч тэр курсын
 * зөвхөн эхний хэдэн хичээл л агуулгаа өгнө.
 *
 * ⚠ `try/catch`: нууцлалын горим, кук хаасан хөтөч дээр `localStorage`
 * унших нь ӨӨРӨӨ алдаа шиднэ — зочны нүүр бүхэлдээ цагаан болох нь
 * сонголт мартагдахаас хамаагүй дор.
 */

import { useSyncExternalStore } from "react";

const KEY = "tactiq:guest-course";

export function readGuestCourse(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(KEY);
    return value && /^[a-z0-9-]{1,64}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeGuestCourse(slug: string): void {
  try {
    window.localStorage.setItem(KEY, slug);
    emit();
  } catch {
    // Хадгалагдахгүй бол анхдагч курс харагдана — алдаа гэж үзэхгүй.
  }
}

/*
 * ── Хөтөчийн утгыг React-д УНШУУЛАХ ──────────────────────────────────
 *
 * ⚠ `useEffect` + `setState` БИШ: тэр нь нэмэлт рендер үүсгэдэг бөгөөд
 * `react-hooks/set-state-in-effect` дүрэм үүнийг зөвөөр хориглодог.
 * `useSyncExternalStore` нь серверт `null`, хөтөчид бодит утгыг өгч,
 * hydration зөрөхгүйгээр нэг л алхамд шийднэ.
 *
 * ⚠ ЗУРАГЛАЛ (snapshot) нь ТОГТВОРТОЙ байх ёстой: `getSnapshot` дуудагдах
 * бүрт шинэ утга буцаавал React төгсгөлгүй давтана. Тиймээс уншсан утгаа
 * кэшлээд, зөвхөн бичих/`storage` үед л шинэчилнэ.
 */

let cached: string | null | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  cached = undefined;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Өөр таб дээр курс солиход энэ таб ч дагана.
  window.addEventListener("storage", emit);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", emit);
  };
}

function getSnapshot(): string | null {
  if (cached === undefined) cached = readGuestCourse();
  return cached;
}

/** Серверт болон эхний рендерт `null` — курс сонгоогүйтэй ижил зан. */
const getServerSnapshot = (): string | null => null;

export function useGuestCourse(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
