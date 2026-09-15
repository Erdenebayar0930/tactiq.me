"use client";

import AchievementsHero from "@/components/tactiq/AchievementsHero";
import AchievementsSection from "@/components/tactiq/AchievementsSection";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/tactiq/ui";

import type { AchievementRecord } from "@/lib/api/achievements";

/**
 * Амжилтын бүх тэмдэг.
 *
 * Профайл дээр эхний хэдийг л харуулдаг (`limit`) — энд бүгд, хязгааргүй.
 * Нэг л компонент ашигласнаар хоёр дэлгэцийн харагдац хэзээ ч зөрөхгүй.
 */
export default function AchievementsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Амжилтууд
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Тэмдэг бүр олон шаттай — суралцах тусам шат нь дээшилнэ.
        </p>
      </div>

      {/*
        ⚠ Профайл ба рекордууд НЭГ хүсэлтээс. `/api/users/me/achievements`
        нь хоёуланг нь буцаадаг тул тусад нь татвал ижил өгөгдлийн төлөө
        хоёр дахин сүлжээ хөдөлгөнө.
      */}
      <Overview />
      <AchievementsSection />
    </div>
  );
}

/** Профайлын тууз ба дээд амжилтууд — НЭГ хүсэлтээс тэжээгдэнэ. */
function Overview() {
  const { data, loading } = useApiData<{
    records: AchievementRecord[];
    unlocked: number;
    total: number;
  }>("/api/users/me/achievements");

  if (loading) return <Skeleton className="h-64 w-full rounded-3xl" />;
  if (!data?.records?.length) return null;

  return (
    <AchievementsHero
      records={data.records}
      unlocked={data.unlocked}
      total={data.total}
    />
  );
}
