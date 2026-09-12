"use client";

import { signOut } from "firebase/auth";

import { auth } from "./firebase";
import { clearSessionCookie } from "./sessionSync";

/**
 * Хандах эрх хаагдсан үед сессийг нэн даруй таслах нэгдсэн цэг.
 *
 * Хэрэглэгч нэвтэрсэн байсан ч админ түүнийг хаамагц дараагийн API хүсэлт,
 * таб идэвхжих, эсвэл давтан шалгалтын аль нэг дээр энэ дуудагдана.
 */
export type RevokeReason = "blocked" | "pending" | "no-profile" | "admin";

/** Серверийн `code` талбарыг /unauthorized хуудасны шалтгаан руу буулгана */
export function reasonFromCode(code?: string | null): RevokeReason | null {
  switch (code) {
    case "account-blocked":
      return "blocked";
    case "account-pending":
      return "pending";
    case "no-profile":
      return "no-profile";
    default:
      return null;
  }
}

/**
 * Давхар дуудагдахаас сэргийлнэ — нэг мөчид олон хүсэлт зэрэг 403 авч болно.
 * Гарах үйлдэл эхэлмэгц бусад нь чимээгүй буцна.
 */
let revoking = false;

/**
 * Гарах бүх замын НЭГДСЭН цэг.
 *
 * Апп дотор гарах товч хэд хэдэн газар байдаг (хэрэглэгчийн цэс, эрх
 * хаагдсан хуудас, эрх цуцлагдсан үеийн автомат гаралт). Тэдгээрийг нэг
 * функцээр дамжуулснаар цэвэрлэгээ мартагдахгүй.
 */
export async function signOutCompletely(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Гарахад алдаа гарлаа:", error);
  }

  /**
   * Firebase-ээс гарах нь ЗӨВХӨН хөтчийн IndexedDB дэх сессийг устгана —
   * сервер талын HttpOnly cookie хэвээр үлдэнэ. Устгахгүй бол SSR хуудас
   * гарсан хэрэглэгчийг нэвтэрсэн гэж үзсээр байх ба дэд домэйн дээр
   * "гарах" товч огт ажиллаагүй мэт харагдана.
   *
   * `signOut` унасан ч ЗААВАЛ дуудагдана (try-ийн ГАДНА): хоёрын аль нэг нь
   * бүтэлгүйтсэн ч нөгөө нь цэвэрлэгээгээ хийх ёстой.
   */
  await clearSessionCookie();
}

export async function forceSignOut(reason: RevokeReason): Promise<void> {
  if (revoking) return;
  revoking = true;

  await signOutCompletely();

  // Router биш window ашиглав: энэ функц React-ийн гаднаас (apiClient) ч
  // дуудагддаг бөгөөд бүрэн дахин ачаалалт нь хуучин төлөвийг цэвэрлэнэ.
  window.location.replace(`/unauthorized?reason=${reason}`);
}
