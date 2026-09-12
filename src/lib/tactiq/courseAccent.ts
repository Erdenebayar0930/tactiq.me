import type { ColorKey } from "@/lib/tactiq/theme";

/**
 * `/courses` картын ҮНДСЭН ӨНГӨ (hex) — товч, явцын бар, дүрсний дэвсгэр.
 *
 * ⚠ HEX, Tailwind класс биш: өнгө нь курсаас хамаарч ДИНАМИК сонгогддог тул
 * `bg-[${color}]` гэж угсарвал Tailwind CSS-д үүсгэхгүй (`theme.ts`-ийн
 * тайлбар). Тиймээс `style`-аар хэрэглэнэ.
 *
 * Дизайны өнгө нь курсаар тогтсон; бусад курс `courses.color` түлхүүрээрээ.
 */
const BY_SLUG: Record<string, string> = {
  chess: "#2563eb",
  checkers: "#f97316",
  math: "#7c3aed",
  logic: "#10b981",
  puzzles: "#8b5cf6",
  "math-kids": "#06b6d4",
};

const BY_COLOR: Record<ColorKey, string> = {
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
  indigo: "#6366f1",
  teal: "#14b8a6",
  orange: "#f97316",
};

/** Идэвхтэй курсын «Үргэлжлүүлэх» товч — курсаас үл хамааран цэнхэр. */
export const CONTINUE_ACCENT = "#2563eb";

export function courseAccent(slug: string, color: string): string {
  return BY_SLUG[slug] ?? BY_COLOR[color as ColorKey] ?? BY_COLOR.violet;
}

/** Hex өнгийн тунгалаг хувилбар — дүрсний зөөлөн дэвсгэр, badge-д. */
export function withAlpha(hex: string, alpha: number): string {
  const value = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${value}`;
}
