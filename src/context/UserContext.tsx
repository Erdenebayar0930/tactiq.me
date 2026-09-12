"use client";

import { onAuthStateChanged, onIdTokenChanged } from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ApiError, apiFetch } from "@/lib/apiClient";
import { setSfxEnabled } from "@/lib/audio/sfx";
import { auth } from "@/lib/firebase";
import { syncSessionCookie } from "@/lib/sessionSync";

import type { PublicUser } from "@/lib/api/publicUser";

/**
 * Нэвтэрсэн сурагчийн профайл — апп даяар нэг эх сурвалж.
 *
 * ЯАГААД CONTEXT ВЭ: толгой хэсэг (оноо, эрдэнэ, дараалал), хажуугийн цэс,
 * профайлын хуудас бүгд ижил тоог харуулдаг. Хуудас бүр өөрөө татвал нэг
 * дэлгэц дээр ялгаатай тоо харагдана — хичээл дуусгаад буцахад толгой нь
 * хуучин оноог үзүүлсээр байх жишээтэй. Тиймээс нэг л газар татаж, шинэчлэлт
 * бүрийг `apply` эсвэл `refresh`-ээр тараана.
 */

type Status = "loading" | "signed-out" | "ready" | "error" | "device-limit";

/** `/api/users/me`-ийн `DeviceInfo`-той адил, гэхдээ JSON дамжсаны дараах хэлбэр (Date → string). */
export type ClientDeviceInfo = {
  id: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  isCurrent: boolean;
};

type UserContextValue = {
  user: PublicUser | null;
  status: Status;
  error: string | null;
  /** Firebase дээр нэвтэрсэн боловч профайл нь үүсээгүй (бүртгэл дуусаагүй) */
  needsRegistration: boolean;
  /** `status === "device-limit"` үед л бөглөгдөнэ — одоогийн бүртгэлтэй төхөөрөмжүүд */
  deviceLimit: ClientDeviceInfo[] | null;
  /** Сангаас дахин уншина */
  refresh: () => Promise<void>;
  /**
   * Серверээс ирсэн шинэ утгуудыг НЭН ДАРУЙ тусгана (сүлжээ хүлээхгүй).
   *
   * Хичээл дуусгах хариу нь оноо, эрдэнэ, зүрхийг аль хэдийн буцаадаг —
   * дахин `/api/users/me` дуудах нь илүүц хүсэлт бөгөөд толгой хэсэг
   * хоцорч шинэчлэгдэнэ.
   */
  apply: (patch: Partial<PublicUser>) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState<ClientDeviceInfo[] | null>(null);

  /**
   * Сүүлийн хүсэлтийг тэмдэглэнэ. Хэрэглэгч хурдан нэвтрээд гарвал хуучин
   * хүсэлтийн хариу дараа нь ирж, гарсан хэрэглэгчийн профайлыг буцааж
   * тавих эрсдэлтэй — дугаараар нь таслана.
   */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;

    try {
      const data = await apiFetch<{ user: PublicUser | null }>("/api/users/me");
      if (id !== requestId.current) return;

      setUser(data.user);
      setNeedsRegistration(data.user === null);
      setDeviceLimit(null);
      setStatus("ready");
      setError(null);
    } catch (cause) {
      if (id !== requestId.current) return;

      if (cause instanceof ApiError && cause.code === "device-limit") {
        setUser(null);
        setDeviceLimit((cause.payload.devices as ClientDeviceInfo[] | undefined) ?? []);
        setStatus("device-limit");
        setError(null);
        return;
      }

      setUser(null);
      setDeviceLimit(null);
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Алдаа гарлаа.");
    }
  }, []);

  useEffect(() => {
    // `onAuthStateChanged` нь IndexedDB-ээс сесс сэргэсний дараа дуудагдана —
    // тиймээс энэ нь "нэвтэрсэн үү" гэдгийг мэдэх ЦОРЫН ГАНЦ найдвартай цэг.
    // `auth.currentUser`-ыг шууд шалгавал шинэчлэх бүрд хоромхон зуур
    // "нэвтрээгүй" төлөв харагдана.
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        requestId.current += 1;
        setUser(null);
        setNeedsRegistration(false);
        setDeviceLimit(null);
        setStatus("signed-out");
        setError(null);
        return;
      }

      setStatus("loading");
      void load();
    });
  }, [load]);

  /**
   * Сервер талын session cookie-г тааруулна — SSR болон дэд домэйн хоорондын
   * нэвтрэлт үүн дээр тогтоно (`lib/sessionSync.ts`).
   *
   * ЯАГААД `onIdTokenChanged` ВЭ (`onAuthStateChanged` БИШ): токен цагт нэг
   * удаа шинэчлэгддэг ба `getIdToken()` тэр мөчид шинэ утга өгнө. Дээрх
   * effect нь профайл ачаалахад зориулагдсан тул нэвтрэх/гарах мөчид л
   * ажилладаг — cookie-г шинэчлэх боломжийг алдана.
   *
   * ⚠ Хүсэлт бүрд явахгүй: `syncSessionCookie` нь маркер cookie-г хараад
   * ойрын хугацаанд дуусахгүй байвал ЮУ Ч ХИЙХГҮЙ буцна. Тиймээс энэ нь
   * практикт нэвтрэх мөчид болон 13 хоногт нэг л удаа сүлжээ хөдөлгөнө.
   *
   * ТУСДАА effect болгосон нь санаатай: cookie тавигдахгүй байх нь профайл
   * ачаалахад ОГТ нөлөөлөх ёсгүй.
   */
  useEffect(() => {
    return onIdTokenChanged(auth, (firebaseUser) => {
      if (!firebaseUser) return;
      void syncSessionCookie(firebaseUser);
    });
  }, []);

  /**
   * ДУУНЫ ЭФФЕКТИЙН тохиргоог синк байлгана.
   *
   * ⚠ ЯАГААД ЭНД ВЭ: эффект нь гүн байрлах компонентуудаас (дасгалын карт,
   * дэлгүүрийн товч) дуудагддаг ба тэдэнд тохиргоог prop-оор дамжуулах нь
   * бүх модыг бохирдуулна. Хэрэглэгчийн мэдээлэл ЭНД амьдардаг тул
   * синкийг мөн энд хийх нь хамгийн богино зам
   * (`lib/audio/sfx.ts`-ийн `enabled` тайлбарыг үзнэ үү).
   */
  useEffect(() => {
    setSfxEnabled(user?.soundEnabled ?? true);
  }, [user?.soundEnabled]);

  const apply = useCallback((patch: Partial<PublicUser>) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      needsRegistration,
      deviceLimit,
      refresh: load,
      apply,
    }),
    [user, status, error, needsRegistration, deviceLimit, load, apply]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser-ийг UserProvider дотор л ашиглана.");
  }
  return context;
}

/**
 * Профайл БЭЛЭН гэдгийг баталгаажуулсан хувилбар.
 *
 * Хамгаалагдсан хуудсууд `<Protected>` дотор байрладаг тул тэнд `user` нь
 * үргэлж байдаг — гэвч TypeScript үүнийг мэдэхгүй. Хуудас бүрт `user!`
 * бичихийн оронд энэ hook нь төрлийг нарийсгана.
 */
export function useCurrentUser(): PublicUser {
  const { user } = useUser();
  if (!user) {
    throw new Error("useCurrentUser-ийг зөвхөн хамгаалагдсан хуудсанд ашиглана.");
  }
  return user;
}
