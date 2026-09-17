import { CircleDot, Swords } from "lucide-react";

import type { LucideIcon } from "lucide-react";

/**
 * ШАТАР ба ДААМЫГ ХАРАГДАЦААР ЯЛГАХ.
 *
 * ⚠ ЗӨВХӨН ӨНГӨӨР ялгахгүй. Гар утасны дэлгэц дээр (ялангуяа гадаа,
 * нарны дор) хоёр өнгө нь бараг ижил харагдана; өнгө сохор хэрэглэгчид
 * бүр ялгахгүй. Тиймээс ГУРВАН дохио зэрэг:
 *
 *   1. ӨНГӨ — шатар СЭРҮҮН (индиго), даам ХАЛУУН (шар).
 *   2. ДҮРС — шатар өнцөгтэй (сэлэм), даам ДУГУЙ (`CircleDot`).
 *   3. БИЧВЭР — «Шатар» / «Даам» гэсэн шошго ямагт харагдана. Жижиг
 *      дэлгэц дээр бичвэр нь хамгийн найдвартай дохио.
 *
 * ⚠ Tailwind нь эх кодыг ТЕКСТЭЭР сканнердана: `` bg-${color}-500 ``
 * гэж үүсгэсэн класс CSS-д ОРОХГҮЙ. Тиймээс бүтэн класс мөрүүдийг энд
 * бичив.
 */

export type GameKey = "chess" | "checkers";

export type GameTheme = {
  label: string;
  Icon: LucideIcon;
  /** Цагийн хуваарийн тууз — цайвар бичвэртэй, ТОД дэвсгэр. */
  bar: string;
  /**
   * Жагсаалтын мөрний зүүн захын зурвас (`border-l-4`-тай хамт).
   *
   * ⚠ БҮТЭН класс байх ЁСТОЙ: `stripe.replace("bg-", "border-")` гэж
   * үүсгэвэл Tailwind тэр классыг эх кодоос ОЛОХГҮЙ тул CSS-д орохгүй —
   * зурвас нь чимээгүйхэн харагдахгүй болно.
   */
  border: string;
  /** Дүрсний хавтан. */
  tile: string;
  /** Шошго (chip) — зөөлөн дэвсгэр, тод бичвэр. */
  chip: string;
};

const THEMES: Record<GameKey, GameTheme> = {
  chess: {
    label: "Шатар",
    Icon: Swords,
    bar: "bg-indigo-600 hover:bg-indigo-500",
    border: "border-indigo-500",
    tile: "bg-indigo-600 text-white",
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200",
  },
  checkers: {
    label: "Даам",
    Icon: CircleDot,
    bar: "bg-amber-500 hover:bg-amber-400",
    border: "border-amber-500",
    tile: "bg-amber-500 text-white",
    chip: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200",
  },
};

/**
 * ⚠ Танихгүй утга — ШАТАР гэж үзнэ, хаяхгүй: тэмцээний сервер шинэ
 * тоглоом нэмбэл (го, судоку) тэр тэмцээн харагдахаа болих нь буруу
 * өнгөтэй харагдахаас дор.
 */
export function gameTheme(game: string): GameTheme {
  return THEMES[game === "checkers" || game === "draughts" ? "checkers" : "chess"];
}
