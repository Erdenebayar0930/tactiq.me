"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { apiFetch } from "@/lib/apiClient";
import { mergeSchoolTexts, SCHOOLS } from "@/lib/tactiq/schools";

import type { School, SchoolText } from "@/lib/tactiq/schools";

/**
 * Сургуулийн текстийн засварыг клиент рүү зөөнө.
 *
 * ⚠ ЯАГААД КОНТЕКСТ, СЕРВЕРЭЭС PROP БИШ ВЭ: сургуулийг уншдаг дэлгэцүүдийн
 * дийлэнх нь клиент компонент (`/courses`, `/profile`, `SchoolPicker`,
 * `SkillsSection`…). Тэднийг тус бүр сервер компонентоор бүрхэх нь арав
 * гаруй файлыг дахин бичихийг шаардана.
 *
 * ⚠ ЯАГААД ROOT LAYOUT-Д СЕРВЕРЭЭС УНШААГҮЙ ВЭ: root layout-д сангийн
 * асуулга нэмбэл (`getSchools()`) МАРКЕТИНГИЙН хуудсууд статикаас динамик
 * болж, prerender-ийн ашиг алдагдана. Тиймээс эхлээд кодын анхдагчаар
 * (ШУУД, ямар ч хүлээлтгүй) зурж, дараа нь `/api/schools`-ээс засварыг
 * авчирна.
 *
 * Эхний хэсэг хугацаанд анхдагч НЭР харагдах магадлалтай. Текст л зурагдаж,
 * бүтэц хөдөлдөггүй тул энэ нь дэлгэц үсрэхэд хүргэхгүй. Сервер
 * компонентууд (`(site)/layout.tsx`, `(site)/page.tsx`) нь `getSchools()`-ийг
 * ШУУД дуудаж, зөв текстийг эхний зурагтаа гаргана.
 */
const SchoolsContext = createContext<School[]>(SCHOOLS);

export function SchoolsProvider({
  children,
  initialTexts,
}: {
  children: React.ReactNode;
  /**
   * Сервер аль хэдийн уншсан бол дамжуулж, нэмэлт хүсэлтийг өнгөрүүлж
   * болно. Статик хуудсууд үүнийг өгөхгүй тул заавал биш.
   */
  initialTexts?: SchoolText[];
}) {
  const [texts, setTexts] = useState<SchoolText[] | null>(initialTexts ?? null);

  useEffect(() => {
    if (initialTexts) return;

    let cancelled = false;

    apiFetch<{ texts: SchoolText[] }>("/api/schools")
      .then((result) => {
        if (!cancelled) setTexts(result.texts);
      })
      .catch((error) => {
        // Засвар татаж чадаагүй нь эвдрэл БИШ — анхдагч текст хүчинтэй хэвээр.
        console.warn("[schools] засвар татаж чадсангүй, анхдагч текст хэвээр:", error);
      });

    return () => {
      cancelled = true;
    };
  }, [initialTexts]);

  const schools = useMemo(() => (texts ? mergeSchoolTexts(texts) : SCHOOLS), [texts]);

  return <SchoolsContext.Provider value={schools}>{children}</SchoolsContext.Provider>;
}

/**
 * Нийлүүлсэн сургуулиуд.
 *
 * Провайдергүй ч ажиллана — контекстийн анхдагч нь кодын `SCHOOLS`. Ингэж
 * зохиосон нь провайдер мартагдсан дэлгэц хоосон биш, засваргүй текстээр
 * зурагдахын тулд.
 */
export function useSchools(): School[] {
  return useContext(SchoolsContext);
}

/** Нэг сургууль slug-аар — `findSchool`-ийн контекст-мэдэгч хувилбар. */
export function useSchool(slug: string | null | undefined): School | null {
  const schools = useSchools();
  return useMemo(
    () => schools.find((school) => school.slug === slug) ?? null,
    [schools, slug]
  );
}
