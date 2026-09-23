"use client";

import { useLocale } from "@/context/LocaleContext";
import { updateMe } from "@/lib/users";

import type { Locale } from "@/lib/i18n/dictionary";

/**
 * ХЭЛ СОЛИХ — ТОЛГОЙН МӨРӨНД ИЛ, «MN / EN» товчлолоор.
 *
 * ⚠ ЦЭСИЙН ДООР БИШ, ИЛ: монгол хэл мэдэхгүй хүн «Тохиргоо» гэсэн
 * бичгийг олж чадахгүй тул хэл солих зам нь түүний ойлгохгүй бичвэрийн
 * цаана байж БОЛОХГҮЙ.
 *
 * ⚠ ДҮРС ХЭРЭГЛЭХГҮЙ (эзний шийдвэр): «MN», «EN» гэсэн товчлол нь өөрөө
 * хэлнээс хамаарахгүй, олон улсад танигдсан тэмдэглэгээ. Глобус, хэлний
 * дүрс нь зай эзэлж, нэмэлт мэдээлэл өгөхгүй.
 *
 * ⚠ ХОЁУЛАНГ ЗЭРЭГ харуулж, ИДЭВХТЭЙГ тодруулна (нэг товч болгож
 * «дарвал солигдоно» гэж хийвэл тэр товч нь ОДООГИЙН хэлийг үзүүлж
 * байна уу, ОРОХ хэлийг үзүүлж байна уу гэдэг нь эргэлзээтэй болно).
 *
 * ⚠ Сонголтыг СЕРВЕРТ ч хадгална (`users.language`): өөр төхөөрөмж дээр
 * нэвтрэхэд хэл дагаж ирнэ. Хадгалж чадаагүй ч ЭНЭ хөтөч дээр хэл аль
 * хэдийн солигдсон тул хэрэглэгчийн UI эвдэрдэггүй.
 */
const OPTIONS: { value: Locale; label: string }[] = [
  { value: "mn", label: "MN" },
  { value: "en", label: "EN" },
];

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={`flex shrink-0 items-center rounded-xl bg-gray-100 p-0.5 dark:bg-white/10 ${className}`}
      role="group"
      aria-label="Хэл · Language"
    >
      {OPTIONS.map((option) => {
        const active = locale === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (active) return;
              setLocale(option.value);
              void updateMe({ language: option.value }).catch(() => {
                // Сервэрт хадгалж чадаагүй ч энэ хөтөч дээр хэл солигдсон.
              });
            }}
            className={`rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
              active
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/15 dark:text-white"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
