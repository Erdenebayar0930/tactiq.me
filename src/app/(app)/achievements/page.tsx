"use client";

import { Flame, Target, Trophy, Zap } from "lucide-react";

import AchievementsSection from "@/components/tactiq/AchievementsSection";
import ProfileShareCard from "@/components/tactiq/ProfileShareCard";
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

/** `AchievementRecord.icon` → компонент. Динамик хандалт БИШ (bundle). */
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Flame,
  Target,
  Zap,
};

/** Профайл ба дээд амжилтууд — НЭГ хүсэлтээс тэжээгдэнэ. */
function Overview() {
  const { data, loading } = useApiData<{
    records: AchievementRecord[];
    unlocked: number;
    total: number;
  }>("/api/users/me/achievements");

  if (loading) return <Skeleton className="h-44 w-full rounded-2xl" />;
  if (!data?.records?.length) return null;

  return (
    <div className="space-y-4">
      <ProfileShareCard
        records={data.records}
        unlocked={data.unlocked}
        total={data.total}
      />
      <RecordStrip records={data.records} />
    </div>
  );
}

/**
 * Дээд амжилтууд — хөндлөн гүйдэг мөр.
 *
 * ⚠ ОГНОО ХАРУУЛАХГҮЙ. Рекорд ТАВИГДСАН мөчийг сан хадгалдаггүй, зөвхөн
 * одоогийн дээд утгыг. Огноо гаргах цорын ганц зам нь мөрийн `updated_at`
 * зэргээс ТААМАГЛАХ бөгөөд тэр нь худал огноо хэвлэнэ
 * (`lib/api/achievements.ts`).
 */
function RecordStrip({ records }: { records: AchievementRecord[] }) {
  return (
    <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
      {records.map((record) => {
        const Icon = ICONS[record.icon] ?? Trophy;

        return (
          <div
            key={record.key}
            className="surface flex w-36 shrink-0 flex-col items-center gap-1.5 p-4 text-center"
          >
            <span
              className="grid size-12 place-items-center rounded-2xl text-white"
              style={{
                background: `linear-gradient(160deg, ${record.color}, ${record.color}cc)`,
              }}
            >
              <Icon className="size-6" aria-hidden />
            </span>
            <p className="num text-lg font-extrabold text-gray-900 dark:text-white">
              {record.value}
            </p>
            <p className="text-[11px] leading-tight font-medium text-gray-500 dark:text-gray-400">
              {record.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
