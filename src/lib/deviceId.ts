"use client";

/**
 * Энэ хөтөч/төхөөрөмжийг тодорхойлох тогтмол тэмдэглэгээ.
 *
 * `localStorage`-д хадгалагддаг тул хуудас шинэчлэх, апп дахин нээхэд
 * ХЭЗЭЭ Ч солигдохгүй — сервер үүгээр "энэ өмнө үзсэн төхөөрөмж үү, шинэ
 * үү" гэдгийг ялгана (`src/lib/api/devices.ts`).
 */
const STORAGE_KEY = "tactiq_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";

  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Хувийн (incognito) горим зэрэгт localStorage хориотой байж болно —
    // тэр үед төхөөрөмж бүр "шинэ" гэж тооцогдох ч апп унахгүй.
    return "";
  }
}
