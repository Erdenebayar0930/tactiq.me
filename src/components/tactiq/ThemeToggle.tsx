"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/context/ThemeContext";

/**
 * Толгойн хэсгийн өдөр/шөнийн товч.
 *
 * `ThemeContext`-ийн `toggleTheme` анхнаасаа "толгойн товчинд зориулав" гэж
 * тайлбарлагдсан ч хэрэгжсэн товч хаана ч байгаагүй — Тохиргоо хуудсан дээрх
 * гурван сонголт (`Гэрэлтэй/Харанхуй/Системийн`) л байсан. Энэ товч тэр
 * тайлбарлагдсан зорилгыг гүйцэтгэнэ: сонголт руу орохгүйгээр НЭГ товшилтоор
 * сольж, `preference`-ийг тодорхой (систем БИШ) утга руу бэхэлнэ.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`grid size-9 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 ${className}`}
      aria-label={theme === "dark" ? "Гэрэлтэй горим руу шилжих" : "Харанхуй горим руу шилжих"}
      title={theme === "dark" ? "Гэрэлтэй горим" : "Харанхуй горим"}
    >
      {theme === "dark" ? (
        <Sun className="size-4" aria-hidden />
      ) : (
        <Moon className="size-4" aria-hidden />
      )}
    </button>
  );
}
