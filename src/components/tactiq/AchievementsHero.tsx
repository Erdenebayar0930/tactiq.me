"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Crown, Flame, Target, Trophy, Zap } from "lucide-react";

import { useCurrentUser } from "@/context/UserContext";

import type { AchievementRecord } from "@/lib/api/achievements";

/**
 * Амжилтын хуудасны ДЭЭД ХЭСЭГ — профайлын тууз ба дөрвөн рекорд.
 *
 * ⚠ Тууз нь ГЭРЭЛТ/ХАРАНХУЙ хоёрт ИЖИЛ харагдана. Уулын чимэглэл нь
 * макетын ягаан налуу дэвсгэр дээр зурагдсан тул сэдэв солигдоход түүний
 * ард өөр өнгө гарвал зураас мэт заагтай болно.
 *
 * ⚠ Налуугийн өнгийг макетаас ХЭМЖИЖ авсан (#4e90fc → #a66efd): уулын
 * зурвасын дэвсгэртэй яг таарах ёстой, эс бөгөөс холбоос нь илэрнэ.
 */
const HERO_GRADIENT = "linear-gradient(135deg, #4e90fc 0%, #6a5cfb 45%, #a66efd 100%)";

export default function AchievementsHero({
  records,
  unlocked,
  total,
}: {
  records: AchievementRecord[];
  unlocked: number;
  total: number;
}) {
  const user = useCurrentUser();

  /*
   * ⚠ Дараагийн түвшин хүртэлх ЗӨРҮҮ — хувь БИШ. «2 оноо үлдлээ» гэдэг нь
   * «87%» -аас хамаагүй тодорхой зорилго: сурагч нэг дасгалаар түүнд
   * хүрэхээ шууд ойлгоно.
   */
  const toNextLevel = Math.max(0, user.nextLevelXp - user.xp);
  const span = Math.max(1, user.nextLevelXp - user.levelStartXp);
  const percent = Math.min(100, Math.round((user.xpIntoLevel / span) * 100));

  /* Лигийн нэр — `regal` рекордоос (`lib/api/achievements.ts`). */
  const league = records.find((record) => record.key === "league")?.value ?? null;

  return (
    <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-3xl px-5 py-5 text-white sm:px-7"
        style={{ background: HERO_GRADIENT }}
      >
        {/*
          ⚠ Чимэглэл нь ЗҮҮН ТАЛДАА УУСНА (`mask-image`): зурвасын дэвсгэр
          нь макетын налуугийн ТЭР ХЭСГИЙН өнгө тул бидний налуутай яг
          таарахгүй — зөөлөн уусгаснаар заагийг нь нуудаг.

          ⚠ `pointer-events-none`: чимэглэл дээгүүр нь «Хичээллэ» товч
          байрлана, дарагдвал болохгүй.
        */}
        <Image
          src="/images/achievements/v1/hero-mountains.png"
          alt=""
          aria-hidden
          width={306}
          height={88}
          className="pointer-events-none absolute bottom-0 right-0 hidden h-auto w-[280px] select-none opacity-90 [mask-image:linear-gradient(to_right,transparent,black_35%)] lg:block"
        />

        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4">
          {/*
            ⚠ `next/image` БИШ: зураг нь Firebase Storage-аас ирдэг бөгөөд
            тэр домэйн `remotePatterns`-д бүртгэлгүй (`ProfileShareCard`-тай
            ижил шалтгаан). Хэмжээ нь 80px тул оновчлол ч шаардлагагүй.
          */}
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white/20 text-2xl font-extrabold ring-4 ring-white/25 sm:size-20">
            {user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              (user.displayName || "?").trim().charAt(0).toUpperCase()
            )}
          </span>

          <div className="min-w-[13rem] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-extrabold">{user.displayName}</p>
              {league && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                  <Crown className="size-3.5" aria-hidden />
                  {league} түвшин
                </span>
              )}
            </div>

            <p className="mt-0.5 text-sm text-white/80">
              {user.level}-р түвшин · {unlocked}/{total} тэмдэг
            </p>

            <div className="mt-2 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-1 text-xs text-white/75">
              {toNextLevel > 0
                ? `Дараагийн түвшин: ${toNextLevel.toLocaleString("mn-MN")} оноо`
                : "Дараагийн түвшинд хүрлээ!"}
            </p>
          </div>

          {/*
            ⚠ Гурван үзүүлэлт нь ДООРХ дөрвөн карттай ДАВХАРДАНА (оноо,
            дараалал, лиг). Энэ нь санамсаргүй биш: тууз нь «би хэн бэ»
            гэсэн товч танилцуулга, доорх картууд нь тэдгээрийн ДЭЭД
            амжилт (хамгийн урт дараалал, хамгийн өндөр лиг) — утга нь өөр.
          */}
          <dl className="flex items-center gap-5 border-white/20 sm:border-l sm:pl-6">
            <HeroStat value={user.xp.toLocaleString("mn-MN")} label="Оноо" />
            <HeroStat value={String(user.streakDays)} label="Дараалал" />
            {league && <HeroStat value={league} label="Лиг" />}
          </dl>

          <Link
            href="/learn"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <ArrowRight className="size-4" aria-hidden />
            Хичээллэх
          </Link>
        </div>
      </div>

      <RecordCards records={records} />
    </div>
  );
}

/**
 * `AchievementRecord.icon` → компонент.
 *
 * ⚠ Газрын зургаар холбоно, `lucide-react`-аас ДИНАМИКААР авахгүй:
 * динамик хандалт нь bundler-т аль дүрс хэрэглэгдэхийг мэдэгдэхгүй тул
 * 1000+ дүрсийн сан клиент рүү орно (`AchievementBadge`-тай ижил дүрэм).
 */
const RECORD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Trophy,
  Flame,
  Target,
  Zap,
};

function RecordIcon({ name }: { name: string }) {
  const Icon = RECORD_ICONS[name] ?? Trophy;
  return <Icon className="size-5" />;
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <dd className="num text-xl font-extrabold leading-none">{value}</dd>
      <dt className="mt-1 text-[11px] text-white/75">{label}</dt>
    </div>
  );
}

/**
 * Дээд амжилтууд — дөрвөн карт.
 *
 * ⚠ Гүйдэг мөр (`overflow-x-auto`) байсныг ТОР болгов: дөрвөн карт нь
 * өргөн дэлгэцэнд бүрэн багтдаг бөгөөд гүйлгэх зурвас нь «цааш үргэлжилж
 * байна» гэсэн худал дохио өгдөг байв.
 */
function RecordCards({ records }: { records: AchievementRecord[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {records.map((record) => (
        <div
          key={record.key}
          className="surface flex items-center gap-3 p-3.5"
          style={{
            // Картын дэвсгэр нь рекордын өнгөний МАШ БҮДЭГ сүүдэр.
            backgroundColor: `${record.color}0f`,
          }}
        >
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-white"
            style={{ background: `linear-gradient(160deg, ${record.color}, ${record.color}cc)` }}
          >
            <RecordIcon name={record.icon} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="num truncate text-lg font-extrabold leading-tight text-gray-900 dark:text-white">
              {record.value}
            </p>
            <p className="truncate text-[11px] font-medium leading-tight text-gray-500 dark:text-gray-400">
              {record.label}
            </p>
          </div>

          <ChevronRight className="size-4 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
        </div>
      ))}
    </div>
  );
}
