"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { useUser } from "@/context/UserContext";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { t } from "@/lib/i18n/t";
import { useApiData } from "@/hooks/useApiData";
import { CourseCard } from "@/components/courses/CourseCard";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useSchools } from "@/context/SchoolsContext";
import { UNGROUPED_LABEL } from "@/lib/tactiq/schools";
import { writeGuestCourse } from "@/lib/tactiq/guestCourse";

import type { CourseStat } from "@/lib/api/courseStats";
import type { Course } from "@/lib/tactiq/courses";
import type { School } from "@/lib/tactiq/schools";

/**
 * Курс сонгох / солих (Duolingo-гийн "add a course" загвар).
 *
 * Хэрэглэгч ХҮССЭН ҮЕДЭЭ энд орж идэвхтэй курсаа сольж болно. Карт дарахад
 * курс идэвхжиж `/learn` руу шилжинэ; идэвхтэй курсын карт «Үргэлжлүүлэх».
 *
 * ⚠ Картын тоонууд (хичээл, дасгал, XP, зоос, явц) САНГААС тооцогдоно
 * (`/api/courses/stats`) — хатуу бичсэн тоо байхгүй.
 */
export default function CoursesPage() {
  const { user, apply, isGuest } = useUser();
  const router = useRouter();
  const schools = useSchools();
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /*
   * ⚠ ЗОЧИН нь нийтийн жагсаалтаас уншина: `/api/courses` нь нэвтрэлт
   * шаарддаг тул зочны нэрийн өмнөөс дуудвал «Нэвтэрсэн байх
   * шаардлагатай» гэсэн алдаа л гарна.
   */
  /*
   * ⚠ `authOptional` ЗААВАЛ: `apiFetch` нь анхдагчаар нэвтрэлт ШААРДдаг
   * бөгөөд токен байхгүй бол хүсэлтийг СЕРВЭР РҮҮ ЯВУУЛАХГҮЙ, клиент
   * дээрээ «Нэвтэрсэн байх шаардлагатай» гэж шиднэ. Тиймээс сервер
   * талын хаягийг нээлттэй болгосон нь ӨӨРӨӨ ХҮРЭЛЦЭХГҮЙ — зочны
   * дэлгэц дээр яг тэр алдаа гарч байв.
   */
  const { data, loading, error: loadError } = useApiData<{ courses: Course[] }>(
    isGuest ? "/api/trial/courses" : "/api/courses",
    { authOptional: true }
  );
  /*
   * Хувийн мэдээлэл — ТУСДАА хүсэлтүүд. `/api/courses` нь хувийн бус тул
   * кэшлэгддэг; хэрэглэгч тус бүрийн явц, хугацааг тэнд оруулбал кэш ашиггүй болно.
   *
   * ⚠ Зочинд хугацаа гэж БАЙХГҮЙ (401 л буцаана). Харин stats нь зочинд
   * ч ажиллана — агуулгын тоо гарч, явц нь 0 (`authOptional` заавал).
   */
  const statsData = useApiData<{ courses: CourseStat[] }>("/api/courses/stats", {
    authOptional: true,
  });
  const timeData = useApiData<{ courses: { courseSlug: string; seconds: number }[] }>(
    isGuest ? null : "/api/courses/time"
  );

  const statsBySlug = new Map((statsData.data?.courses ?? []).map((row) => [row.courseSlug, row]));
  const secondsBySlug = new Map(
    (timeData.data?.courses ?? []).map((row) => [row.courseSlug, row.seconds])
  );
  const courses = data?.courses ?? [];

  const select = async (slug: string) => {
    if (busySlug) return;

    /*
     * ⚠ ЗОЧНЫ сонголт нь ХӨТӨЧИД үлдэнэ: хэрэглэгчийн мөр байхгүй тул
     * `activeCourseSlug` бичих газар алга.
     *
     * ⚠ Урьд нь энд шууд бүртгэлийн хуудас руу шиддэг байв. Тэр нь эрт:
     * зочин юу сурахаа хараагүй байж «бүртгүүл» гэсэн хана мөргөнө. Одоо
     * сонгосон курсынхаа замыг хараад эхний хичээлүүдийг нь хийж үзнэ —
     * бүртгэлийн дэлгэц туршилтын хичээл дуусах мөчид гарна.
     */
    if (isGuest) {
      writeGuestCourse(slug);
      router.push("/learn");
      return;
    }

    // Идэвхтэй курс — сонголт өөрчлөхгүй, шууд үргэлжлүүлнэ.
    if (slug === user?.activeCourseSlug) {
      router.push("/learn");
      return;
    }

    setBusySlug(slug);
    setError(null);

    try {
      const response = await apiFetch<{ user: typeof user }>("/api/users/me", {
        method: "PATCH",
        body: { activeCourseSlug: slug },
      });
      if (response.user) apply(response.user);
      router.push("/learn");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
      setBusySlug(null);
    }
  };

  return (
    <div className="space-y-8">
      {/*
        ⚠ Зоос, дараалал, аватар ЭНД БАЙХГҮЙ — апп-ын дээд цэс (`AppShell`)
        тэдгээрийг аль хэдийн харуулдаг. Хуудсанд давтвал нэг мэдээлэл хоёр
        газар зэрэгцэж харагдана.
      */}
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
          {t("Курс сонгох")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 sm:text-base">
          {t("Юу сурахаа сонгоорой. Хүссэн үедээ энд буцаж ирээд сольж болно.")}
        </p>
      </header>

      {error && <ErrorNote message={error} />}
      {loadError && <ErrorNote message={loadError} />}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-[26rem] w-full rounded-[20px]" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {groupBySchool(courses, schools).map(({ school, label, items }) => (
            <section key={label} aria-labelledby={`school-${label}`}>
              <div className="mb-4 flex items-center gap-3">
                {school && (
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${school.gradient}`}
                  >
                    <school.Icon className="size-5" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <h2
                    id={`school-${label}`}
                    className="text-lg font-bold leading-tight text-gray-900 dark:text-white"
                  >
                    {label}
                  </h2>
                  {school && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{school.subtitle}</p>
                  )}
                </div>
                <span className="num ml-auto grid min-w-8 place-items-center rounded-full bg-white px-2.5 py-1 text-sm font-bold text-gray-600 shadow-sm ring-1 ring-slate-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-white/10">
                  {items.length}
                </span>
              </div>

              {/*
                3 БАГАНА. ⚠ Апп-ын хажуугийн цэстэй үед карт ~290px хүртэл
                нарийсдаг — картын ДОТОРХ байрлал нь дэлгэцийн биш КАРТЫН
                өргөнөөр (container query, `CourseCard`) зохицдог тул тоо,
                гарчиг тайрагдахгүй.
              */}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {items.map((course) => (
                  <CourseCard
                    key={course.slug}
                    course={course}
                    stat={statsBySlug.get(course.slug)}
                    spentSeconds={secondsBySlug.get(course.slug) ?? 0}
                    isActive={user?.activeCourseSlug === course.slug}
                    isBusy={busySlug === course.slug}
                    onSelect={() => void select(course.slug)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Курсуудыг СУРГУУЛИАР бүлэглэнэ — сургуулийн дарааллаар.
 *
 * ⚠ Курс ОЛОН сургуульд байж болно — тэр үед сургууль бүрийн бүлэгт гарна.
 * ⚠ Сургуульд харьяалагдаагүй курсыг ХАЯХГҮЙ — төгсгөлд "Бусад" бүлэгт.
 * Хоосон бүлэг (курсгүй сургууль) огт зурагдахгүй.
 *
 * `schools`-ыг ПАРАМЕТРЭЭР авна (`useSchools()`) — нэрийг админ засаж
 * болдог тул кодын жагсаалтыг шууд импортолж болохгүй.
 */
function groupBySchool(courses: Course[], schools: readonly School[]) {
  const groups: { school: School | null; label: string; items: Course[] }[] = [];

  for (const school of schools) {
    const items = courses.filter((course) => (course.schools ?? []).includes(school.slug));
    if (items.length > 0) groups.push({ school, label: school.title, items });
  }

  const known = new Set(schools.map((school) => school.slug));
  const rest = courses.filter((course) => !(course.schools ?? []).some((slug) => known.has(slug)));
  if (rest.length > 0) groups.push({ school: null, label: UNGROUPED_LABEL, items: rest });

  return groups;
}
