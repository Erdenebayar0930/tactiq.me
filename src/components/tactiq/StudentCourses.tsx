"use client";

import { Icon } from "@/components/tactiq/Icon";
import { ErrorNote, ProgressBar, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { colorStyles } from "@/lib/tactiq/theme";
import { findSchool } from "@/lib/tactiq/schools";

import type { Skill } from "@/lib/api/skills";

/**
 * Сурагчийн КУРС ТУС БҮРИЙН явц — эцэг эх, багшид.
 *
 * ⚠ Мэдээлэл нь `listSkills`-ээс, өөрөөр хэлбэл сурагч өөрөө профайл
 * дээрээ хардаг ЯГ ТЭР өгөгдөл. Эцэг эхэд НЭМЭЛТ юу ч өгөхгүй —
 * `toLinkedStudent`-ийн "нарийн харагдац" зарчмыг курс дээр ч барина
 * (`lib/api/studentLinks.ts`).
 *
 * ⚠ Өгөгдлийг ЗӨВХӨН нээх үед татна (`path` нь `null` бол `useApiData`
 * хүсэлт явуулахгүй). Эцэг эх 5 хүүхэдтэй бол бүгдийн курсыг урьдчилж
 * татах нь 5 нэмэлт хүсэлт — ихэнх нь хэзээ ч нээгдэхгүй.
 */
export default function StudentCourses({
  studentUid,
  open,
}: {
  studentUid: string;
  open: boolean;
}) {
  const { data, error, loading, reload } = useApiData<{ courses: Skill[] }>(
    open ? `/api/students/${encodeURIComponent(studentUid)}/courses` : null
  );

  if (!open) return null;
  if (loading) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (error) return <ErrorNote message={error} onRetry={() => void reload()} />;

  const courses = data?.courses ?? [];

  if (courses.length === 0) {
    return (
      <p className="rounded-xl bg-gray-50 px-3 py-3 text-center text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
        Хараахан курс эхлээгүй байна.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {courses.map((course) => (
        <li key={course.courseSlug}>
          <CourseRow course={course} />
        </li>
      ))}
    </ul>
  );
}

function CourseRow({ course }: { course: Skill }) {
  const styles = colorStyles(course.color);
  const school = findSchool(course.school);

  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${styles.iconBg}`}
      >
        <Icon name={course.icon} className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {course.title}
            {school && (
              <span className="ml-1.5 text-[11px] font-medium text-gray-400">
                {school.title}
              </span>
            )}
          </p>
          <span className="num shrink-0 text-xs font-bold text-gray-600 dark:text-gray-300">
            {/*
              Агуулга нэмэгдээгүй курст (`total === 0`) хувь харуулахгүй —
              "0%" гэдэг нь хүүхдийг буруутгаж байгаа мэт болно.
            */}
            {course.total > 0
              ? `${course.percent}%`
              : `${course.completed} хичээл`}
          </span>
        </div>

        <div className="my-1">
          <ProgressBar percent={course.percent} />
        </div>

        <p className="num text-[11px] text-gray-500 dark:text-gray-400">
          {course.total > 0 && `${course.completed}/${course.total} хичээл · `}
          {course.xp} XP
          {course.seconds > 0 && ` · ${formatDuration(course.seconds)}`}
        </p>
      </div>
    </div>
  );
}

/** Секундыг товч хэлбэрт. `SkillsSection`-тэй ижил дүрэм. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return "1 мин хүрэхгүй";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;

  return `${Math.round(minutes / 60)} цаг`;
}
