"use client";

import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";

import AchievementBadge from "@/components/tactiq/AchievementBadge";
import { useApiData } from "@/hooks/useApiData";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";

import type { AchievementProgress } from "@/lib/tactiq/achievements";

type AchievementsResponse = {
  achievements: AchievementProgress[];
  unlocked: number;
  total: number;
};

/**
 * Амжилтын тэмдгүүд — ТОР байдлаар.
 *
 * ⚠ Жагсаалт (мөр + явцын зураас) байсныг ТОР болгов. Тэмдэг бол ЦУГЛУУЛГА:
 * хэрэглэгч түүнийг нэг харцаар бүхэлд нь харах ёстой ("юу авсан, юу
 * дутуу вэ"). Мөрөөр жагсаавал арав нь бүтэн дэлгэц эзэлж, гүйлгэхгүйгээр
 * харьцуулах боломжгүй байв.
 *
 * ⚠ Явцын зураасыг ч АВСАН. Зураас нь "дараагийн шат хүртэл хэдэн хувь"
 * гэдгийг харуулдаг ба тэр нь шат бүрд тэгээс эхэлдэг тул тэмдэг хооронд
 * харьцуулах утгагүй тоо. Оронд нь шатны тоо ("3 / 8") — энэ нь тэмдэг
 * даяар нэг утгатай.
 */
export default function AchievementsSection({
  /** Профайл дээр эхний хэдийг л харуулна — бүгд нь `/achievements` дээр. */
  limit,
}: {
  limit?: number;
}) {
  const { data, error, loading, reload } = useApiData<AchievementsResponse>(
    "/api/users/me/achievements"
  );

  if (loading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (error) return <ErrorNote message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const shown = limit ? data.achievements.slice(0, limit) : data.achievements;
  const hasMore = limit !== undefined && data.achievements.length > limit;

  return (
    <section className="surface space-y-5 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
          <Award className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-gray-900 dark:text-white">Шагнал</h2>
          <p className="num text-xs text-gray-500 dark:text-gray-400">
            {data.unlocked} / {data.total} тэмдэг нээгдсэн
          </p>
        </div>

        {hasMore && (
          <Link
            href="/achievements"
            className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Бүгд
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>

      {/*
        Гар утсанд ГУРАВ. Хоёр байвал тэмдэг хэт том болж цуглуулгын
        мэдрэмж алдагдана, дөрөв байвал 320px дэлгэцэнд нэр нь тасарна.
      */}
      <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-5">
        {shown.map((item) => (
          <li key={item.id} className="flex justify-center">
            <AchievementBadge item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
