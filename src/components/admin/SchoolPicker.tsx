"use client";

import { Check } from "lucide-react";

import { SCHOOLS } from "@/lib/tactiq/schools";

/**
 * Курсын СУРГУУЛИУДЫГ олноор сонгоно (Mind, Codely, …).
 *
 * ⚠ СОНГОСОН ДАРААЛАЛ ХАДГАЛАГДАНА — эхэнд сонгосон нь ҮНДСЭН сургууль
 * (`courses.school`: гэрчилгээ, ур чадвар). Тиймээс шинэ сонголтыг
 * жагсаалтын ТӨГСГӨЛД нэмнэ, `SCHOOLS`-ийн дарааллаар эрэмбэлэхгүй.
 *
 * Select биш чагт: сургууль зургаахан, бүгд нэг харцаар харагдах нь
 * олон сонголттой select-ээс (Ctrl+дарах) хамаагүй ойлгомжтой.
 */
export function SchoolPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (slug: string) =>
    onChange(value.includes(slug) ? value.filter((item) => item !== slug) : [...value, slug]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Сургууль <span className="font-normal text-gray-400">(олноор сонгож болно)</span>
      </legend>

      <div className="flex flex-wrap gap-2">
        {SCHOOLS.map((school) => {
          const index = value.indexOf(school.slug);
          const selected = index !== -1;

          return (
            <button
              key={school.slug}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(school.slug)}
              title={school.subtitle}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                selected
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
              }`}
            >
              {selected && <Check className="size-3.5 shrink-0" aria-hidden />}
              {school.title}
              {index === 0 && value.length > 1 && (
                <span className="rounded bg-white/25 px-1 text-[10px] font-bold">үндсэн</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Курс сонгосон сургууль бүрийн жагсаалтад харагдаж, XP нь тэдгээрийн лиг бүрт
        тоологдоно. Эхэнд сонгосон нь үндсэн (гэрчилгээ, ур чадвар). Юу ч сонгоогүй бол
        «Бусад»-д харагдана.
      </p>
    </fieldset>
  );
}
