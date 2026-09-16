import { BookOpen, Coins, Pencil } from "lucide-react";

import type { LucideIcon } from "lucide-react";

const number = (value: number) => value.toLocaleString("mn-MN");

/**
 * Картын 3 үзүүлэлт — хичээл, дасгал, зоос — ҮРГЭЛЖ НЭГ МӨРӨНД.
 *
 * ⚠ XP-г ЗОРИУДААР ХАССАН: сурагчид зоос, XP хоёрыг хольж ойлгож байв.
 * Шагналын нэг л валют (зоос) харагдана. XP нь (`lessons.xp_reward`) санд
 * хэвээр бөгөөд лиг, ур чадварын тооцоонд ажилласаар байна.
 *
 * ⚠ ТОГТМОЛ 4 БАГАНА (`flex-wrap` биш). Урьд нь нарийн (~270px) картад
 * зоос нь дараагийн мөрөнд унаж, карт урт, эмх замбараагүй харагдаж байв.
 * Багтаахын тулд:
 *   • тоо нь `tabular-nums` энгийн фонтоор (`num` monospace нь хэт өргөн)
 *   • зоос нь «5/415» — зайгүй
 *   • зоосны багана арай өргөн (`1.4fr`) — хамгийн урт утга
 *   • дүрс + тоо нэг мөрөнд, нэр нь доор (босоо зай бага)
 */
export function CourseStats({
  lessons,
  exercises,
  coins,
  maxCoins,
}: {
  lessons: number;
  exercises: number;
  coins: number;
  maxCoins: number;
}) {
  const items: { Icon: LucideIcon; color: string; fill?: boolean; value: string; label: string }[] = [
    { Icon: BookOpen, color: "#3b82f6", value: number(lessons), label: "хичээл" },
    { Icon: Pencil, color: "#8b5cf6", value: number(exercises), label: "дасгал" },
    { Icon: Coins, color: "#f59e0b", value: `${number(coins)}/${number(maxCoins)}`, label: "зоос" },
  ];

  return (
    <dl className="grid grid-cols-[1fr_1fr_1.4fr] gap-1.5">
      {items.map(({ Icon, color, fill, value, label }) => (
        <div key={label} className="min-w-0">
          <div className="flex items-center gap-1">
            <Icon
              className="size-3.5 shrink-0"
              style={{ color }}
              fill={fill ? color : "none"}
              aria-hidden
            />
            <dd className="whitespace-nowrap text-[12px] font-bold tabular-nums leading-none text-gray-900 dark:text-white">
              {value}
            </dd>
          </div>
          <dt className="mt-1 pl-[18px] text-[10px] leading-none text-gray-500 dark:text-gray-400">
            {label}
          </dt>
        </div>
      ))}
    </dl>
  );
}
