"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Icon } from "@/components/tactiq/Icon";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { colorStyles } from "@/lib/tactiq/theme";
import { findSchool } from "@/lib/tactiq/schools";

import type { Skill } from "@/lib/api/skills";

/**
 * "Ур чадвар" — сурагчийн ЭХЭЛСЭН курс тус бүрийн эзэмшилт.
 *
 * ⚠ Зөвхөн эхэлсэн курсууд харагдана (`lib/api/skills.ts` дээрх шалтгаан:
 * санд 39 курс байгаагийн 36 нь хичээлгүй "тун удахгүй" төлөвтэй). Хараахан
 * юу ч эхлээгүй бол хэсэг нь БАЙХГҮЙ болно — хоосон жагсаалт харуулахын
 * оронд курс сонгох урилга харуулна.
 */
export default function SkillsSection() {
  const { data, error, loading, reload } = useApiData<{ skills: Skill[] }>(
    "/api/users/me/skills"
  );

  if (loading) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (error) return <ErrorNote message={error} onRetry={() => void reload()} />;

  const skills = data?.skills ?? [];

  return (
    <section className="surface space-y-4 p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-gray-900 dark:text-white">Ур чадвар</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {skills.length > 0
              ? `${skills.length} курс эхэлсэн`
              : "Курс эхлүүлбэл ахиц энд харагдана"}
          </p>
        </div>
      </div>

      {skills.length === 0 ? (
        <Link
          href="/courses"
          className="btn-primary block w-full px-5 py-2.5 text-center text-sm"
        >
          Курс сонгох
        </Link>
      ) : (
        <ul className="space-y-3.5">
          {skills.map((skill) => (
            <li key={skill.courseSlug}>
              <SkillRow skill={skill} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Секундыг товч хэлбэрт. `courses/page.tsx`-тэй ижил дүрэм. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return "1 мин хүрэхгүй";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;

  return `${Math.round(minutes / 60)} цаг`;
}

function SkillRow({ skill }: { skill: Skill }) {
  const styles = colorStyles(skill.color);
  const school = findSchool(skill.school);

  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl text-white ${styles.iconBg}`}
      >
        <Icon name={skill.icon} className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {skill.title}
            {school && (
              <span className="ml-1.5 text-xs font-medium text-gray-400">
                {school.title}
              </span>
            )}
          </p>

          <span className="num shrink-0 text-xs font-bold text-gray-600 dark:text-gray-300">
            {/*
              Агуулга нэмэгдээгүй курст (`total === 0`) хувь харуулахгүй —
              "0%" гэдэг нь сурагчийг буруутгаж байгаа мэт болно.
            */}
            {skill.total > 0 ? `${skill.percent}%` : `${skill.completed} хичээл`}
          </span>
        </div>

        <div className="my-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${styles.iconBg}`}
            style={{ width: `${skill.percent}%` }}
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {skill.total > 0 && `${skill.completed}/${skill.total} хичээл · `}
          {skill.xp} XP
          {skill.seconds > 0 && ` · ${formatDuration(skill.seconds)}`}
        </p>
      </div>
    </div>
  );
}
