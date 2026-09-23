"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { useUser } from "@/context/UserContext";
import { translate, type Locale } from "@/lib/i18n/dictionary";
import { setActiveLocale } from "@/lib/i18n/t";
import { LanguageGate } from "@/components/tactiq/LanguageGate";

/**
 * Аппын хэл — Монгол (анхдагч) / Англи.
 *
 * ⚠ `ThemeContext`-ийн ЯГ ИЖИЛ загвар: сонголт нь `localStorage` дотор,
 * React-ийн ГАДНА байдаг төлөв тул `useState` БИШ `useSyncExternalStore`-оор
 * уншина. SSR үед сервер "mn" гэсэн snapshot өгч, клиент дээр бодит утга руу
 * hydration-ы зөрчилгүйгээр шилжинэ. Өөр таб дээр хэл солигдвол энэ таб ч
 * дагана.
 *
 * ЯАГААД URL-д хэл (`/en/...`) БАЙХГҮЙ ВЭ: апп нь нэвтрэлтийн цаана байдаг
 * хэрэглэгчийн апп бөгөөд хуудсууд нь индекслэгддэггүй. Хэлийг замд
 * оруулах нь бүх `router.push`, `Link` (100+ газар) -ыг дахин бичихийг
 * шаардах ба SEO-гийн хувьд ямар ч өгөөжгүй. Сонголт нь төхөөрөмжид
 * хадгалагдана.
 */
const STORAGE_KEY = "locale";

type LocaleContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Монгол бичвэрийг одоогийн хэл рүү хөрвүүлнэ (толь дээр байхгүй бол хэвээр). */
  t: (text: string) => string;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

let listeners: Array<() => void> = [];

const subscribe = (onChange: () => void) => {
  listeners.push(onChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
    window.removeEventListener("storage", onStorage);
  };
};

function readLocale(): Locale {
  try {
    return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "mn";
  } catch {
    return "mn";
  }
}

/**
 * Хэрэглэгч хэлээ СОНГОСОН эсэх («mn» гэсэн анхдагчаас ЯЛГААТАЙ).
 *
 * ⚠ `readLocale` нь сонгоогүй үед `"mn"` буцаадаг тул «сонгосон уу»
 * гэдгийг түүнээс мэдэх АРГАГҮЙ — тиймээс түлхүүр өөрөө байгаа эсэхийг
 * шалгана. Анхны хэлний дэлгэц (`LanguageGate`) зөвхөн ҮҮНЭЭС хамаарна.
 */
function readChosen(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "mn" || value === "en";
  } catch {
    /*
     * ⚠ Хувийн горим / хориглосон санах ой: «сонгосон» гэж үзнэ. Эс
     * бөгөөс уншиж чадахгүй хэрэглэгчид хэлний дэлгэц ХУУДАС БҮРД
     * гарна — сонголт нь хадгалагдахгүй тул мөчлөг тасрахгүй.
     */
    return true;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => "mn" as Locale);
  /*
   * ⚠ СЕРВЕРИЙН ХУВИЛБАР нь ЯМАГТ `true` («сонгосон»): сервер дээр
   * `localStorage` байхгүй тул `false` гэж буцаавал БҮХ хуудас хэлний
   * дэлгэцтэйгээр рендерлэгдэж, дараа нь client дээр алга болно — эргэж
   * ирсэн хэрэглэгч бүр анивчилт харна, мөн hydration зөрнө.
   */
  const chosen = useSyncExternalStore(subscribe, readChosen, () => true);
  const { user, status } = useUser();

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Хувийн горимд бичиж чадахгүй байж болно — тэр үед энэ сесст л үлдэнэ.
    }
    for (const listener of listeners) listener();
  }, []);

  /**
   * Серверийн `users.language`-ыг ЗӨВХӨН ӨӨРӨӨ СОЛИГДОХОД хэрэгжүүлнэ —
   * шинэ төхөөрөмж дээр нэвтрэхэд хэл дагаж ирэхэд хангалттай.
   *
   * ⚠ «Серверийн утга локалаасаа зөрвөл локалыг дарах» гэж бичиж БОЛОХГҮЙ.
   * Тэгвэл хэл солих мөчид дараах гогцоо үүснэ: хэрэглэгч EN дарна →
   * `locale` = en → effect дахин ажиллана → профайл (`updateMe`) хараахан
   * шинэчлэгдээгүй тул серверийн утга MN хэвээр → MN руу ЭРГЭЭД татна.
   * Хэрэглэгчийн хувьд «хэл солигдохгүй байна» гэж харагдана. Тиймээс
   * өмнө хэрэгжүүлсэн серверийн утгыг санаж, ЗӨВХӨН шинэ утга ирэхэд
   * хөдөлнө.
   */
  const appliedFromServer = useRef<Locale | null>(null);
  useEffect(() => {
    const fromServer = user?.language === "en" ? "en" : user?.language === "mn" ? "mn" : null;
    if (!fromServer) return;
    if (appliedFromServer.current === fromServer) return;

    appliedFromServer.current = fromServer;
    setLocale(fromServer);
  }, [user?.language, setLocale]);

  // `<html lang>`-ыг дагуулна: дэлгэц уншигч, хөтчийн орчуулга, хэлний
  // хамааралтай фонт/зай тавих дүрэм бүгд үүнээс уншдаг.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // ⚠ РЕНДЭРИЙН ҮЕД тавина, effect дотор БИШ: доорх `children` нь ЭНЭ
  // рендэрт зурагдах тул effect хэтэрхий хоцорно (эхний зурагдалт хуучин
  // хэлээр гарч, дараа нь анивчина).
  setActiveLocale(locale);

  const value = useMemo<LocaleContextType>(
    () => ({ locale, setLocale, t: (text: string) => translate(locale, text) }),
    [locale, setLocale]
  );

  /**
   * `key={locale}` — хэл солиход БҮХ мод дахин монтлогдоно.
   *
   * `lib/i18n/t.ts`-ийн `t()` нь модулийн төлөвөөс уншдаг тул React өөрөө
   * "хэл солигдлоо" гэж мэдэхгүй. Дахин монтлолт нь хагас орчуулагдсан
   * дэлгэц гарахыг БҮРЭН хаана. Алдагдах зүйл нь зөвхөн түр зуурын төлөв
   * (бөглөж байсан маягт) — хэл солих нь ховор, зориудын үйлдэл тул
   * хүлээн зөвшөөрөгдөхүйц төлбөр.
   */
  /*
   * АНХНЫ ХЭЛНИЙ ДЭЛГЭЦ — ЗӨВХӨН нэвтрээгүй, хэлээ хараахан сонгоогүй
   * хүнд.
   *
   * ⚠ НЭВТЭРСЭН хүнд ХЭЗЭЭ Ч гарахгүй: түүний хэл профайлаас
   * (`users.language`) ирдэг бөгөөд шинэ төхөөрөмж дээр автоматаар
   * хэрэгжинэ (дээрх effect). Нэвтэрсэн хүнээс дахин асуух нь
   * тохиргоог хоёр удаа хийлгэх гэсэн үг.
   *
   * ⚠ `status === "loading"` үед ч гарахгүй: сесс сэргэх хооронд
   * (IndexedDB-ээс) хэлний дэлгэц харуулбал нэвтэрсэн хэрэглэгч ЯМАГТ
   * түүнийг хагас секунд харна.
   */
  const showGate = chosen === false && status === "signed-out";

  return (
    <LocaleContext.Provider value={value}>
      <div key={locale} className="contents">
        {/*
          ⚠ АГУУЛГА нь ЦААНА РЕНДЕРЛЭГДСЭЭР байна, попап нь түүнийг
          ОРЛОХГҮЙ: шинэ хүн хичээлийн зам, цэсийг хараад «энэ сайт юу
          хийдэг вэ» гэдгийг мэдсэн байж хэлээ сонгоно. Мөн хэл солигдоход
          цаана байгаа мод `key={locale}`-ээр дахин монтлогдох тул попап
          хаагдахад агуулга шинэ хэлээрээ бэлэн болно.
        */}
        {children}
        {showGate && <LanguageGate onPick={setLocale} />}
      </div>
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale-ыг LocaleProvider дотор дуудна.");
  return context;
}

/** Бичвэр хөрвүүлэгч — компонентуудад хамгийн их хэрэглэгдэх хэлбэр. */
export function useT(): (text: string) => string {
  return useLocale().t;
}
