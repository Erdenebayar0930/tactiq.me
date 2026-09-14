"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Check, ChevronDown, Dumbbell, Lock, Star, Trophy } from "lucide-react";

import { useCurrentUser, useUser } from "@/context/UserContext";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { useApiData } from "@/hooks/useApiData";
import { localized } from "@/lib/i18n/content";
import { colorStyles } from "@/lib/tactiq/theme";
import { isLessonUnlocked } from "@/lib/tactiq/courses";
import {
  CHEST_GEMS,
  buildPath,
  chestKey,
  lessonsNeededForChest,
  pathOffset,
} from "@/lib/tactiq/path";
import { AdSlot } from "@/components/tactiq/AdSlot";
import { Icon } from "@/components/tactiq/Icon";
import { PathCharacter, characterSetForCourse } from "@/components/tactiq/PathCharacter";
import RewardPopup from "@/components/tactiq/RewardPopup";
import { EmptyState, ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { t } from "@/lib/i18n/t";

import type { PublicUser } from "@/lib/api/publicUser";
import type { CourseWithUnits, LessonSummary, Unit } from "@/lib/tactiq/courses";

/** Курсын дашборд — Duolingo маягийн долгионт зам (нэвтэрсэн үндсэн дэлгэц). */
export default function LearnPage() {
  const user = useCurrentUser();
  const { isGuest } = useUser();

  /*
   * ⚠ ЗОЧИН нь курс сонгоогүй (сонгох газар нь ч байхгүй) тул
   * `activeCourseSlug` нь үргэлж хоосон. Түүнд ТУРШИЛТЫН зам харагдана —
   * нийтийн `/api/trial` route нь нэг курсын эхний хичээлүүдийг л өгдөг.
   */
  if (isGuest) return <CoursePath courseSlug={null} />;

  if (!user.activeCourseSlug) return <NoCourseYet />;

  return <CoursePath courseSlug={user.activeCourseSlug} />;
}

function NoCourseYet() {
  return (
    <EmptyState
      title={t("Курс сонгоогүй байна")}
      description={t("Юу сурахаа сонгоод, хичээллэж эхэл.")}
      action={
        <Link
          href="/courses"
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          {t("Курс сонгох")}
        </Link>
      }
    />
  );
}

/**
 * @param courseSlug Курсын slug, эсвэл `null` — ЗОЧНЫ туршилтын зам
 *   (`/api/trial`). `null` нь «курс сонгоогүй» ГЭСЭН УТГАГҮЙ: тэр
 *   тохиолдлыг дуудагч нь `NoCourseYet`-ээр шийддэг.
 */
function CoursePath({ courseSlug }: { courseSlug: string | null }) {
  const {
    data: courseData,
    loading: courseLoading,
    error: courseError,
    code: courseErrorCode,
  } = useApiData<{ course: CourseWithUnits }>(
    courseSlug === null ? "/api/trial" : `/api/courses/${encodeURIComponent(courseSlug)}`
  );
  /*
   * ⚠ ЗОЧИНД ЯВЦ БАЙХГҮЙ тул ЭХЛЭЛДЭЭ Л хоосон олонлогоор эхэлнэ —
   * эффект дотор `setCompleted` дуудвал нэмэлт рендер үүсэх бөгөөд
   * `react-hooks/set-state-in-effect` дүрэм үүнийг зөвөөр хориглодог.
   */
  const [completed, setCompleted] = useState<Set<string> | null>(() =>
    courseSlug === null ? new Set() : null
  );
  const [claimed, setClaimed] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /*
     * ⚠ ЗОЧИНД ЯВЦ БАЙХГҮЙ: `/api/learn/progress` нь нэвтрэлт шаарддаг тул
     * дуудвал 401 болж, зам нь алдааны мэдэгдэлтэй гарна. Эхний утга нь
     * аль хэдийн хоосон олонлог — эхний хичээл нээлттэй, бусад нь
     * түгжээтэй харагдана, яг шинэ сурагчийнхтай адил.
     */
    if (courseSlug === null) return;

    let cancelled = false;

    apiFetch<{ completedLessonIds: string[]; claimedChests?: string[] }>("/api/learn/progress")
      .then((data) => {
        if (cancelled) return;
        setCompleted(new Set(data.completedLessonIds));
        setClaimed(new Set(data.claimedChests ?? []));
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [courseSlug]);

  /*
   * ХИЧЭЭЛЭЭ ДУУСГААД БУЦАЖ ИРЭХЭД тэр зангилаа руу гүйлгэнэ.
   *
   * ⚠ Урт зам дээр (судоку — 60 хичээл) буцаж ирэхэд дээрээсээ эхэлдэг
   * байсан: сурагч дөнгөж хийсэн газраа олохын тулд хэдэн зуун цэг
   * гүйлгэдэг байв.
   *
   * ⚠ `useSearchParams` БИШ, `window.location`: `useSearchParams` нь
   * хуудсыг статик рендерээс гаргаж, Suspense хүрээ шаарддаг. Энд
   * хайлтын мөрийг зөвхөн ЭФФЕКТ дотор л уншина — рендерт огт
   * оролцохгүй тул хуудсын горимд нөлөөлөхгүй.
   *
   * ⚠ `completed` ачаалагдсаны ДАРАА л ажиллана: түүнээс өмнө зам нь
   * ялгуургаар солигдож, зангилаанууд DOM-д хараахан байхгүй.
   */
  useEffect(() => {
    if (completed === null) return;

    const lessonId = new URLSearchParams(window.location.search).get("lesson");
    if (!lessonId) return;

    const node = document.getElementById(`lesson-node-${lessonId}`);
    // Өөр курсын хичээл байж мэднэ — тэр үед юу ч хийхгүй.
    if (!node) return;

    node.scrollIntoView({ block: "center", behavior: "smooth" });

    /*
     * Хаягийг цэвэрлэнэ: сурагч хуудсаа сэргээхэд (эсвэл дараа нь буцаж
     * ирэхэд) дахин тэр цэг рүү үсрэх нь гэнэтийн санагдана.
     */
    window.history.replaceState(null, "", window.location.pathname);
  }, [completed]);

  if (courseLoading || completed === null) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  /*
   * ⚠ Курс нь ОЛДОХГҮЙ байж болно: админ түүнийг устгасан (эсвэл slug-ийг
   * сольсон) ч хэрэглэгчийн `activeCourseSlug` тэр рүү зааж хоцордог.
   * Тэр үед хар улаан алдаа харуулбал сурагч МУХАРДАНА — дэлгэц дээр
   * гарах ямар ч зам байхгүй, курсээ солих товч ч үгүй.
   *
   * Тиймээс 404-ыг «курс сонгоогүй»-тэй ИЖИЛ гэж үзнэ: тэр төлөв нь
   * «Курс сонгох» товчтой бөгөөд сурагч өөрөө гарч чадна. Бусад алдаа
   * (сүлжээ, 500) нь ХЭВЭЭР харагдана — тэд дахин оролдоход зөв болдог
   * тул нуух нь зөв биш.
   */
  if (courseErrorCode === "not-found") return <NoCourseYet />;
  if (courseError) return <ErrorNote message={courseError} />;
  const course = courseData?.course;
  if (!course) return <NoCourseYet />;

  const styles = colorStyles(course.color);

  return (
    <div className="space-y-6">
      <div className={`surface flex items-center gap-4 p-5 ${styles.softBg}`}>
        <span
          className={`grid size-14 shrink-0 place-items-center rounded-2xl text-white ${styles.iconBg}`}
        >
          <Icon name={course.icon} className="size-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {localized(course.title, course.titleEn)}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {localized(course.description, course.descriptionEn)}
          </p>
        </div>
        <Link
          href="/courses"
          className={`shrink-0 rounded-xl px-3 py-2 text-sm font-semibold ${styles.softText} hover:underline`}
        >
          {t("Курс солих")}
        </Link>
      </div>

      {error && <ErrorNote message={error} />}

      <AdSlot />

      {course.units.map((unit, index) => (
        <UnitPath
          key={unit.id}
          unit={unit}
          index={index}
          // Өмнөх бүлгүүдийн хичээлийн нийт тоо — дүрүүд бүлэг бүрт дахин эхлэхгүй
          lessonOffset={course.units
            .slice(0, index)
            .reduce((sum, previous) => sum + previous.lessons.length, 0)}
          courseSlug={course.slug}
          completed={completed}
          claimed={claimed}
          onClaimed={(key) => setClaimed((current) => new Set(current).add(key))}
        />
      ))}
    </div>
  );
}


/**
 * НЭГ СЭДВИЙН ЗАМ — Duolingo маягийн долгионт зам.
 *
 * ⚠ Хэвтээ хазайлт (`pathOffset`) нь ЗӨВХӨН чимэглэл биш: зангилаанууд нэг
 * шугамаар доошилбол жагсаалтаас ялгарахгүй, «зам» гэсэн сэтгэгдэл
 * төрөхгүй. Долгионыг ТОГТМОЛ массиваас авдаг тул дахин ачаалахад зам
 * ижил хэлбэртэй үлдэнэ (`lib/tactiq/path.ts`).
 *
 * ⚠ Зангилаа хооронд ХОЛБОГЧ ЗУРААС ЗУРАХГҮЙ: зам нь зангилаануудын
 * БАЙРЛАЛААР л уншигдана. Урьд нь цэгүүд зурдаг байсныг хассан — тэдгээр
 * нь зөв координатыг мэдэхгүй тул хазайлт томрох тусам зангилаанаас
 * салж, зам нь тасархай мэт харагддаг байв.
 */
function UnitPath({
  unit,
  index,
  lessonOffset,
  courseSlug,
  completed,
  claimed,
  onClaimed,
}: {
  unit: Unit;
  /** Курс доторх дугаар — «SECTION n» гэсэн толгойд. */
  index: number;
  /** Курс даяарх хичээлийн дугаарлалтын эхлэл (дүрийг ээлжлүүлэхэд). */
  lessonOffset: number;
  /** Замын дүрийн багцыг сонгоно (даам → даамын дүрүүд). */
  courseSlug: string;
  completed: Set<string>;
  claimed: Set<string>;
  onClaimed: (key: string) => void;
}) {
  const styles = colorStyles(unit.color);

  /**
   * Бүлгийг хураах.
   *
   * ⚠ ЯАГААД ХЭРЭГТЭЙ: нэг бүлэг 60 хичээлтэй байж болно (судоку) тул
   * дараагийн бүлэг рүү хүрэхийн тулд сурагч хэдэн зуун цэгийг гүйлгэнэ.
   * Хураасан бүлгийн толгой тууз хэвээр үлдэж, явц (`2/60`) харагдсаар
   * байна — мэдээлэл алдагдахгүй, зөвхөн зам хумигдана.
   *
   * ⚠ Төлөв нь ЗӨВХӨН САНАХ ОЙД. `localStorage`-д хадгалбал SSR-ийн эхний
   * зурагт уншиж болохгүй (hydration зөрчил) тул `ThemeContext`-ийн адил
   * `useSyncExternalStore` загвар шаардана — ганц бүлэг хураах хэрэгцээнд
   * тэр нь хэт өндөр үнэ.
   */
  const [collapsed, setCollapsed] = useState(false);

  const unitLessonIds = unit.lessons.map((lesson) => lesson.id);
  const items = buildPath(unit.lessons.length);
  const doneCount = unit.lessons.filter((lesson) => completed.has(lesson.id)).length;

  /**
   * "ЭХЛЭХ" бөмбөлөг гарах зангилаа — нээлттэй БӨГӨӨД дуусгаагүй эхнийх.
   *
   * Зам дээр нэг л бөмбөлөг байна: сурагч дэлгэцээ нээмэгц хаанаас
   * үргэлжлүүлэхээ эрэлгүй хардаг.
   */
  const activeLessonId =
    unit.lessons.find(
      (lesson) =>
        !completed.has(lesson.id) && isLessonUnlocked(lesson.id, unitLessonIds, completed)
    )?.id ?? null;

  return (
    <section className="space-y-1">
      {/*
        СЭДВИЙН ТУУЗ — гүйлгэхэд ДЭЭР НААЛДАНА (`sticky`).

        ⚠ Зам урт (20+ хичээл) тул дундуур нь гүйлгэж байхад «би аль
        сэдэвт байна вэ?» гэдэг алга болдог. Наалдсан тууз үүнийг ямагт
        харуулна — Duolingo-гийн «SECTION / UNIT» толгойтой ижил үүрэг.
      */}
      <div
        className={`sticky top-2 z-10 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-md ${styles.iconBg}`}
      >
        {/*
          ⚠ Толгойг БҮХЭЛД нь товч болгов (зөвхөн жижиг дүрсийг БИШ) — гар
          утсан дээр хүрэх талбай том байх ёстой. «Курс солих» холбоос нь
          товчны ГАДНА үлдэнэ: интерактив элементийг нэг нэгэн дотор
          угсарвал дарахад хоёул хариу үзүүлнэ.
        */}
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-controls={`unit-path-${unit.id}`}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`size-5 shrink-0 text-white/80 transition-transform ${
              collapsed ? "-rotate-90" : ""
            }`}
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-white/75">
              {t("Бүлэг")} {index + 1} · {doneCount}/{unit.lessons.length}
            </span>
            <span className="block truncate text-lg font-extrabold text-white">
              {localized(unit.title, unit.titleEn)}
            </span>
          </span>
        </button>
        <Link
          href="/courses"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20 text-white hover:bg-white/30"
          aria-label={t("Курс солих")}
        >
          <BookOpen className="size-5" aria-hidden />
        </Link>
      </div>

      <ol
        id={`unit-path-${unit.id}`}
        hidden={collapsed}
        className="relative flex flex-col items-center gap-1 pb-4 pt-10"
      >
        {items.map((item, position) => {
          const offset = pathOffset(position);
          /*
           * ХОЛБООС ШУГАМ — зангилаа хооронд босоо зураас.
           *
           * ⚠ Өмнөх зангилаа дуусгагдсан бол НОГООН (зам нээгдсэн),
           * үгүй бол саарал. Ингэснээр сурагч хаана хүрсэн, хаанаас
           * цааш түгжээтэй болохыг ЗАМ ӨӨРӨӨ хэлнэ.
           */
          const previousDone =
            position === 0
              ? false
              : (() => {
                  const previous = items[position - 1];
                  if (previous.kind === "lesson") {
                    return completed.has(unit.lessons[previous.lessonIndex].id);
                  }
                  return claimed.has(chestKey(unit.id, previous.chestIndex));
                })();

          if (item.kind === "chest") {
            const needed = lessonsNeededForChest(item.chestIndex);
            const unlocked = unitLessonIds
              .slice(0, needed)
              .every((lessonId) => completed.has(lessonId));

            return (
              <ChestNode
                key={`chest-${item.chestIndex}`}
                connectorFilled={previousDone}
                showConnector={position > 0}
                unitId={unit.id}
                chestIndex={item.chestIndex}
                offset={offset}
                unlocked={unlocked}
                opened={claimed.has(chestKey(unit.id, item.chestIndex))}
                onClaimed={onClaimed}
              />
            );
          }

          const lesson = unit.lessons[item.lessonIndex];
          const isLast = item.lessonIndex === unit.lessons.length - 1;

          return (
            <LessonNode
              key={lesson.id}
              connectorFilled={previousDone}
              showConnector={position > 0}
              lesson={lesson}
              color={unit.color}
              offset={offset}
              lessonIndex={item.lessonIndex}
              courseLessonIndex={lessonOffset + item.lessonIndex}
              courseSlug={courseSlug}
              isLast={isLast}
              isCompleted={completed.has(lesson.id)}
              isUnlocked={isLessonUnlocked(lesson.id, unitLessonIds, completed)}
              isActive={lesson.id === activeLessonId}
            />
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Зангилаа хоорондын ХОЛБООС ШУГАМ.
 *
 * ⚠ Хазайлтын ДУНДАЖ байрлалд тавина: дээд, доод зангилаа өөр өөр
 * хазайлттай тул шугамыг аль нэгэнд нь нааж болохгүй — дунд нь байрлавал
 * хоёуланг холбосон мэт уншигдана.
 */
function PathLine(_props: { filled: boolean; offset: number }) {
  // Зураасыг хассан — зөвхөн зангилаа хоорондын ЗАЙГ хадгална (зам жигд үлдэнэ).
  return <span aria-hidden className="block h-8" />;
}

/**
 * Зангилааны дүрс — хичээлийн ТӨРЛИЙГ нүдээр ялгана.
 *
 * ⚠ Бүх зангилаа ижил дүрстэй байвал зам нь давтагдсан цэгүүд болно.
 * Duolingo од / дасгал / хайрцаг / цомыг ялгадаг нь зөвхөн гоо сайхан
 * биш: сурагч «дараа юу байна» гэдгийг харснаараа мэднэ.
 */
function nodeGlyph(lessonIndex: number, isLast: boolean) {
  // ⚠ Дүрсний КОМПОНЕНТЫГ буцаахгүй, БЭЛЭН ЭЛЕМЕНТ буцаана: рендерийн
  // үед компонент үүсгэвэл React түүнийг бүр болгонд ШИНЭ төрөл гэж
  // үзэж, зангилааны төлөв (анимац) дахин эхэлнэ.
  if (isLast) return <Trophy className="relative size-8" strokeWidth={2.5} aria-hidden />;
  // Гурав дахь хичээл бүр — давтлагын шинжтэй (дасгалын дүрс).
  if (lessonIndex % 3 === 2) {
    return <Dumbbell className="relative size-8" strokeWidth={2.5} aria-hidden />;
  }
  return <Star className="relative size-8" strokeWidth={2.5} aria-hidden />;
}

function LessonNode({
  lesson,
  color,
  offset,
  lessonIndex,
  courseLessonIndex,
  courseSlug,
  isLast,
  isCompleted,
  isUnlocked,
  isActive,
  showConnector,
  connectorFilled,
}: {
  lesson: LessonSummary;
  color: Unit["color"];
  offset: number;
  lessonIndex: number;
  /** Курс даяарх дугаар — бүлэг солигдоход тэглэгдэхгүй. */
  courseLessonIndex: number;
  courseSlug: string;
  isLast: boolean;
  isCompleted: boolean;
  isUnlocked: boolean;
  isActive: boolean;
  showConnector: boolean;
  connectorFilled: boolean;
}) {
  const styles = colorStyles(color);
  const isActionable = isCompleted || isUnlocked;
  const title = localized(lesson.title, lesson.titleEn);
  const glyph = nodeGlyph(lessonIndex, isLast);
  /**
   * Түгжээтэй зангилаа дээр дархад СЭГСРЭНЭ.
   *
   * ⚠ Идэвхгүй товч дуугүй байх нь хамгийн муу хариу: хүүхэд дарж
   * үзээд «эвдэрсэн» гэж боддог. Сэгсрэлт нь «энэ хараахан нээгдээгүй»
   * гэдгийг үггүйгээр хэлнэ.
   */
  const [shake, setShake] = useState(false);

  const circle = (
    <span
      className={`relative grid size-[72px] place-items-center rounded-full border-4 text-white transition-transform duration-150 active:translate-y-1 active:scale-95 ${
        isActionable
          ? `${styles.iconBg} border-white/40 shadow-[0_6px_0_rgba(0,0,0,0.22)] hover:-translate-y-0.5`
          : "border-gray-200 bg-gray-300 text-gray-500 shadow-[0_6px_0_rgba(0,0,0,0.12)] dark:border-white/10 dark:bg-white/10 dark:text-gray-400"
      }`}
    >
      {/* Идэвхтэй зангилааны ард лугшилт — нүд түүн рүү өөрөө татагдана */}
      {isActive && (
        <span
          aria-hidden
          className={`path-pulse absolute -inset-1 -z-10 rounded-full ${styles.iconBg}`}
        />
      )}
      {/* Дээд гэрэлтэлт — зангилааг «товч» шиг гүнтэй харагдуулна */}
      <span
        aria-hidden
        className="absolute inset-x-3 top-2 h-4 rounded-full bg-white/25 blur-[2px]"
      />
      {isCompleted ? (
        <Check className="relative size-8" strokeWidth={3} aria-hidden />
      ) : isUnlocked ? (
        glyph
      ) : (
        <Lock className="relative size-6" aria-hidden />
      )}
    </span>
  );

  const body = (
    <span className="relative flex flex-col items-center gap-1.5">
      {/*
        «ЭХЛЭХ» бөмбөлөг — зангилаандаа ABSOLUTE-аар наалдана.

        ⚠ Урьд нь ердийн урсгалд байсан: тэр үед бөмбөлөг зангилааг
        ДООШ түлхэж, өөрөө дээшээ гарч, наалдсан сэдвийн туузан дор
        оров (зөвхөн хошуу нь харагдана). Absolute байрлал нь зангилааны
        байрлалыг ОГТ өөрчлөхгүй тул зам жигд хэвээр үлдэнэ.
      */}
      {isActive && (
        <span className="path-nudge absolute bottom-full left-1/2 z-[1] mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600 shadow-sm dark:border-brand-500/40 dark:bg-brand-500/15 dark:text-brand-300">
          {t("Эхлэх")}
        </span>
      )}
      {circle}
      <span
        className={`max-w-40 truncate text-center text-xs font-bold ${
          isActionable ? "text-gray-700 dark:text-gray-200" : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {title}
      </span>
    </span>
  );

  return (
    /*
     * ⚠ ID нь ХИЧЭЭЛИЙН ID-аар: хичээлээ дуусгаад буцаж ирэхэд яг энэ
     * зангилаа руу гүйлгэнэ (`/learn?lesson=<id>`). Индексээр нэрлэвэл
     * бүлэг нэмэгдэхэд байрлал шилжинэ.
     */
    <li id={`lesson-node-${lesson.id}`} className="flex flex-col items-center">
      {showConnector && <PathLine filled={connectorFilled} offset={offset} />}

      {/*
        ДҮР — замын хажуугийн ХООСОН талбайд.

        ⚠ Хичээл БҮРД биш, ХААЯА (4 тутмын 1) гаргана: зангилаа бүрийн
        хажууд дүр байвал зам өөрөө сарниж, «энд дар» гэсэн гол мессеж
        живнэ. Хааяа гарах дүр нь чимэглэл хэвээр үлдэж, доош гүйлгэхэд
        шинэ дүр олдох жижиг баяр болно.

        ⚠ Байршил нь SEEDED — `Math.random()` биш. Рендер бүрт өөр гарвал
        гүйлгэх үед дүрүүд үсэрч, мөн server/client зөрж (hydration)
        анхааруулга өгнө.
      */}
      <span className="relative" style={{ transform: `translateX(${offset}px)` }}>
        {courseLessonIndex % 4 === 2 && (
          <PathCharacter
            // Дүр гарах N дахь байрлал → N дахь дүр: бүх дүр дарааллаар ээлжилнэ
            index={Math.floor(courseLessonIndex / 4)}
            set={characterSetForCourse(courseSlug)}
            // Замын хажуугийн хоосон талбайг дүүргэнэ; зангилааны ГОЛД тэгшилнэ
            height={150}
            muted={!isActionable}
            // ⚠ ДЭЭД ирмэгээр тэгшилнэ: голоор тэгшилбэл дүр дээшээ цухуйж,
            // наалдсан бүлгийн туузан дор орж тайрагдана. Доошоо хоосон зайд унжина.
            className={
              offset > 0
                ? "absolute right-full top-0 mr-12 sm:mr-20"
                : "absolute left-full top-0 ml-12 sm:ml-20"
            }
          />
        )}
        <span className={shake ? "path-shake" : ""}>
        {isActionable ? (
          <Link
            href={`/learn/${lesson.id}`}
            aria-label={`${title} — ${lesson.exerciseCount} ${t("дасгал")}, ${lesson.xpReward} XP`}
          >
            {body}
          </Link>
        ) : (
          <button
            type="button"
            // ⚠ Анимац ДУУСМАГЦ төлөвөө цэвэрлэнэ — эс бөгөөс класс
            // үлдэж, дараагийн товшилтод сэгсрэлт дахин эхлэхгүй.
            onClick={() => setShake(true)}
            onAnimationEnd={() => setShake(false)}
            aria-label={`${title} — ${t("Түгжээтэй")}`}
          >
            {body}
          </button>
        )}
        </span>
      </span>
    </li>
  );
}

/**
 * БЭЛГИЙН ХАЙРЦАГ — замын дундах шагнал.
 *
 * ⚠ Зоосыг СЕРВЕР олгоно (`/api/learn/chests`), клиент зөвхөн хүсэлт
 * илгээнэ. Давхардлыг `path_chests`-ийн UNIQUE хязгаарлалт хаадаг тул
 * давхар товшилт, дахин илгээлт зоосыг хоёр дахин олгохгүй.
 */
function ChestNode({
  unitId,
  chestIndex,
  offset,
  unlocked,
  opened,
  onClaimed,
  showConnector,
  connectorFilled,
}: {
  unitId: string;
  chestIndex: number;
  offset: number;
  unlocked: boolean;
  opened: boolean;
  onClaimed: (key: string) => void;
  showConnector: boolean;
  connectorFilled: boolean;
}) {
  const { apply } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Онгойлгосны дараах баяр хүргэлт. `null` = popup хаалттай.
   *
   * ⚠ Хайрцаг «нээгдсэн» төлөв (`opened`) -ээс ТУСДАА: хуудас дахин
   * ачаалахад нээгдсэн хайрцаг popup-гүйгээр нээлттэй харагдах ёстой —
   * popup нь ЗӨВХӨН тухайн мөчийн шагналыг харуулна.
   */
  const [reward, setReward] = useState<number | null>(null);

  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ gems: number; user: PublicUser }>("/api/learn/chests", {
        method: "POST",
        body: { unitId, chestIndex },
      });
      // Зоосны тоо толгой хэсэгт ШУУД шинэчлэгдэнэ — хуудас дахин
      // ачаалах шаардлагагүй (`UserContext`-ийн `apply`).
      apply(data.user);
      onClaimed(chestKey(unitId, chestIndex));
      setReward(data.gems);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
    } finally {
      setBusy(false);
    }
  };

  const label = opened
    ? t("Нээсэн")
    : unlocked
      ? `+${CHEST_GEMS} ${t("зоос")}`
      : t("Түгжээтэй");

  return (
    <li className="flex flex-col items-center">
      {showConnector && <PathLine filled={connectorFilled} offset={offset} />}

      <button
        type="button"
        style={{ transform: `translateX(${offset}px)` }}
        onClick={() => void claim()}
        disabled={!unlocked || opened || busy}
        className={`flex flex-col items-center gap-1.5 ${
          unlocked && !opened ? "" : "cursor-default"
        }`}
        aria-label={`${t("Бэлэг")} — ${label}`}
      >
        <TreasureChest state={opened ? "opened" : unlocked ? "ready" : "locked"} />
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
          {busy ? t("Түр хүлээнэ үү…") : label}
        </span>
      </button>

      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}

      {reward !== null && <RewardPopup gems={reward} onClose={() => setReward(null)} />}
    </li>
  );
}

/**
 * ЭРДЭНЭСИЙН ХАЙРЦАГ — замын шагналын зангилаа.
 *
 * ⚠ Дүрсийн сангийн `Gift` дүрс БИШ, өөрийн SVG: бэлэг нь замын хамгийн
 * тод, хамгийн хүсүүштэй зүйл байх ёстой бөгөөд ганц шугаман дүрс тэр
 * үүргийг гүйцэтгэхгүй. Гурван төлөв нь нүдээр шууд ялгарна:
 * түгжээтэй (саарал), бэлэн (алтан, үсэрнэ), нээсэн (тайван, тагтай).
 */
function TreasureChest({ state }: { state: "locked" | "ready" | "opened" }) {
  const locked = state === "locked";
  const opened = state === "opened";
  const box = locked ? "#9ca3af" : "#ef4444";
  const boxShade = locked ? "#6b7280" : "#b91c1c";
  const lid = locked ? "#d1d5db" : "#f87171";
  const ribbon = locked ? "#e5e7eb" : "#fbbf24";
  const ribbonShade = locked ? "#cbd5e1" : "#d97706";

  return (
    <span
      className={`grid size-[76px] place-items-center ${
        state === "ready" ? "animate-bounce" : ""
      }`}
    >
      <svg viewBox="0 0 76 76" className="size-full drop-shadow-lg" aria-hidden>
        {/* Нээсэн бэлгийн дотроос гялбаа цацарна */}
        {opened && (
          <g fill="#fbbf24">
            <path d="M38 22 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z" />
            <circle cx="22" cy="30" r="2" />
            <circle cx="55" cy="26" r="2.5" />
          </g>
        )}

        {/* Хайрцгийн бие */}
        <rect x="12" y="40" width="52" height="30" rx="4" fill={box} />
        <rect x="12" y="40" width="52" height="6" fill={boxShade} opacity="0.35" />
        {/* Босоо тууз */}
        <rect x="33" y="40" width="10" height="30" fill={ribbon} />
        <rect x="41" y="40" width="2" height="30" fill={ribbonShade} opacity="0.6" />

        {/* Таг + нум — «нээсэн» төлөвт дээш өргөгдөж хазайна */}
        <g transform={opened ? "translate(-6 -16) rotate(-18 10 40)" : undefined}>
          <rect x="8" y="30" width="60" height="12" rx="3" fill={lid} />
          <rect x="33" y="30" width="10" height="12" fill={ribbon} />
          <rect x="41" y="30" width="2" height="12" fill={ribbonShade} opacity="0.6" />
          {/* Нум */}
          <path
            d="M38 30 C 30 16, 16 18, 22 28 C 25 32, 32 31, 38 30 Z"
            fill={ribbon}
            stroke={ribbonShade}
            strokeWidth="1.5"
          />
          <path
            d="M38 30 C 46 16, 60 18, 54 28 C 51 32, 44 31, 38 30 Z"
            fill={ribbon}
            stroke={ribbonShade}
            strokeWidth="1.5"
          />
          <circle cx="38" cy="29" r="4" fill={ribbonShade} />
        </g>
      </svg>
    </span>
  );
}
