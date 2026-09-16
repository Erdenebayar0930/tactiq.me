"use client";

import { ArrowRight, CheckCircle2, Clock, Lock } from "lucide-react";

import { CourseCover } from "@/components/tactiq/CourseCover";
import { Icon } from "@/components/tactiq/Icon";
import { CourseProgress } from "@/components/courses/CourseProgress";
import { CourseStats } from "@/components/courses/CourseStats";
import { localized } from "@/lib/i18n/content";
import { CONTINUE_ACCENT, courseAccent } from "@/lib/tactiq/courseAccent";

import type { CourseStat } from "@/lib/api/courseStats";
import type { Course } from "@/lib/tactiq/courses";
import type { ColorKey } from "@/lib/tactiq/theme";

/**
 * Секундыг хүн уншихад ойлгомжтой болгоно.
 *
 * ⚠ Цаг гаруй бол минут ХАРУУЛАХГҮЙ ("2ц 13м" биш "2 цаг"): энэ тоо нь
 * ойролцоо статистик (клиент хэмждэг) тул нарийвчлал нь худал итгэл төрүүлнэ.
 */
function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} мин`;
  return `${Math.round(minutes / 60)} цаг`;
}

/**
 * Хугацааны badge.
 *   • Kids курс        → «4–6 нас» (насны ангилал нь хугацаанаас чухал)
 *   • Зарцуулсан цагтай → тэр хугацаа
 *   • Эс бөгөөс         → нэг хичээлийн ойролцоо урт (дасгал ≈ 45 секунд)
 */
function timeLabel(slug: string, spentSeconds: number, stat: CourseStat | undefined): string | null {
  if (slug.endsWith("-kids")) return "4–6 нас";
  if (spentSeconds > 0) return formatDuration(spentSeconds);
  if (stat && stat.exercisesPerLesson > 0) return `~${Math.max(1, Math.round(stat.exercisesPerLesson * 0.75))} мин`;
  return null;
}

/**
 * КУРСЫН КАРТ — нягт: намхан зураг, дүрс + гарчиг + badge нэг мөрөнд,
 * 2 мөр тайлбар, нэг мөр үзүүлэлт, явц, товч.
 *
 * ⚠ Картыг УРТ болгохгүй: тайлбар 2 мөрөөр хязгаарлагдана (`line-clamp-2`,
 * бүтэн бичвэр нь `title`-д), үзүүлэлтүүд хайрцаггүй нэг мөрөнд. Тоо
 * тайрагдахгүй — багтахгүй бол мөр шилжинэ (`CourseStats`).
 */
export function CourseCard({
  course,
  stat,
  spentSeconds,
  isActive,
  isBusy,
  onSelect,
}: {
  course: Course;
  stat: CourseStat | undefined;
  spentSeconds: number;
  isActive: boolean;
  isBusy: boolean;
  onSelect: () => void;
}) {
  const accent = courseAccent(course.slug, course.color);
  const isComingSoon = course.status === "coming-soon";
  const title = localized(course.title, course.titleEn);
  const description = localized(course.description, course.descriptionEn);
  const time = timeLabel(course.slug, spentSeconds, stat);
  const hasContent = !!stat && stat.lessons > 0;

  return (
    /*
      ⚠ КАРТ БҮТЭН ДАРАГДАНА — нэг `<button>`. Дотор нь өөр интерактив
      элемент БАЙХГҮЙ (товч нь зөвхөн харагдац `span`), тиймээс гарын
      навигаци нь картаас карт руу нэг Tab-аар шилжинэ.
    */
    <button
      type="button"
      onClick={onSelect}
      disabled={isComingSoon || isBusy}
      aria-label={`${title}${isActive ? " — идэвхтэй курс, үргэлжлүүлэх" : isComingSoon ? " — тун удахгүй" : " — сонгох"}`}
      className={`group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 dark:border-white/10 dark:bg-gray-900 ${
        isComingSoon ? "cursor-not-allowed opacity-70" : "hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      {/* Зураг — намхан, түвшний badge баруун дээд буланд */}
      <div className="relative overflow-hidden">
        <CourseCover
          icon={course.icon}
          color={course.color as ColorKey}
          seed={course.slug}
          slug={course.slug}
          /*
           * ⚠ ТОГТМОЛ ӨНДӨР БИШ, ХАРЬЦАА. Урьд нь `h-32` байсан: картын
           * өргөн нь баганын тооноос хамаарч өөрчлөгддөг тул коверын
           * харьцаа 1.9:1 ~ 3:1 хооронд хэлбэлзэж, `object-cover` нь
           * зургийн ХАЖУУ талыг тайрдаг байв — баннер дээрх гарчиг,
           * тайлбар таллаа алга болно.
           *
           * ⚠ `aspect-[2/1]` нь `public/images/covers/v3/*`-ийн харьцаатай
           * ЯГ тэнцүү (480×240). Шинэ ковер нэмэхдээ ижил харьцаагаар
           * тасдана — `CourseCover`-ийн тайлбарыг үзнэ үү.
           */
          className="aspect-[2/1] w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {/*
          ⚠ Хугацаа / төлөвийн badge ЗУРАГ ДЭЭР (зүүн дээд). Гарчгийн хажууд
          байхад нарийн картад «Идэвхтэй» + «10 мин» багтахгүй хоёр мөр болж,
          тайлбарыг доош түлхэж байсан.
        */}
        {isComingSoon ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-gray-600 shadow-sm dark:bg-gray-900/90 dark:text-gray-300">
            <Lock className="size-3 shrink-0" aria-hidden />
            Тун удахгүй
          </span>
        ) : (
          time && (
            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-gray-700 shadow-sm dark:bg-gray-900/90 dark:text-gray-200">
              <Clock className="size-3 shrink-0" aria-hidden />
              {time}
            </span>
          )
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Дүрс | гарчиг + badge, доор нь 2 мөр тайлбар */}
        <div className="flex items-start gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: accent }}
          >
            <Icon name={course.icon} className="size-6" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">{title}</h3>
              {isActive && (
                <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                  <CheckCircle2 className="size-3 shrink-0" aria-hidden />
                  Идэвхтэй
                </span>
              )}
            </div>
            <p
              className="mt-1 line-clamp-2 text-[13px] leading-snug text-gray-500 dark:text-gray-400"
              title={description}
            >
              {description}
            </p>
          </div>
        </div>

        {hasContent && (
          <>
            <CourseStats
              lessons={stat.lessons}
              exercises={stat.exercises}
              coins={stat.earnedCoins}
              maxCoins={stat.totalCoins}
            />
            <CourseProgress value={stat.progress} />
          </>
        )}

        {/* CTA — `mt-auto`: карт бүрийн товч нэг өндөрт зогсоно */}
        <span
          className="mt-auto flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-bold text-white transition-[filter] group-hover:brightness-110"
          style={{ backgroundColor: isComingSoon ? "#9ca3af" : isActive ? CONTINUE_ACCENT : accent }}
          aria-hidden
        >
          {isBusy ? "Түр хүлээнэ үү…" : isComingSoon ? "Тун удахгүй" : isActive ? "Үргэлжлүүлэх" : "Сонгох"}
          {!isBusy && !isComingSoon && <ArrowRight className="size-4" aria-hidden />}
        </span>
      </div>
    </button>
  );
}
