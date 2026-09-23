"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Crown, Flame, Trash2, UserPlus, Users, Zap } from "lucide-react";

import StudentCourses from "@/components/tactiq/StudentCourses";
import { useApiData } from "@/hooks/useApiData";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { EmptyState, ErrorNote, ProgressBar, Skeleton } from "@/components/tactiq/ui";

import type { LinkedStudent } from "@/lib/api/studentLinks";
import { t } from "@/lib/i18n/t";

/**
 * Эцэг эх (`/parent`) ба багшийн (`/teacher`) сурагчдын жагсаалт.
 *
 * ⚠ НЭГ компонент, `relation` пропоор ялгагдана. Хоёр хуудас нь ЯГ ижил
 * үйлдэлтэй (код оруулж холбох, ахиц харах, салгах) — тусад нь бичвэл
 * засвар бүр хоёр газар хийгдэх ба нэг нь мартагдана. Ялгаа нь зөвхөн
 * ҮГСИЙН СОНГОЛТ ("хүүхэд" ↔ "сурагч") тул текстийг доорх хүснэгтэд гаргав.
 */

type Relation = "parent" | "teacher";

type Copy = {
  /** "хүүхэд" | "сурагч" — өгүүлбэр дунд орох ганц тоо. */
  noun: string;
  addTitle: string;
  addHint: string;
  emptyTitle: string;
  emptyDescription: string;
};

const COPY: Record<Relation, Copy> = {
  parent: {
    noun: "хүүхэд",
    addTitle: "Хүүхдээ нэмэх",
    /*
     * ⚠ Замыг ТОЧНО заана. Эцэг эх өөрийн дансанд хүүхдийнхээ кодыг ХАРЖ
     * ЧАДАХГҮЙ (тэр нь хүүхдийн данс дээр байдаг) тул "хаанаас олох вэ"
     * гэдгийг ЭНД хэлэхгүй бол хүн код хайж төөрнө.
     */
    addHint:
      "Хүүхэд өөрөө өөрийн дансандаа нэвтэрч, Профайл хуудасны дээд талын «Миний код»-ыг харна. Тэр 6 тэмдэгтийг энд оруулна уу. Зөвхөн СУРАГЧ эрхтэй данс холбогдоно.",
    emptyTitle: "Хараахан хүүхэд нэмээгүй байна",
    emptyDescription:
      "Хүүхдийнхээ хувийн кодыг оруулбал түүний ахиц, дараалал, өдрийн зорилт энд харагдана.",
  },
  teacher: {
    noun: "сурагч",
    addTitle: "Сурагч нэмэх",
    addHint:
      "Сурагч өөрөө өөрийн дансандаа нэвтэрч, Профайл хуудасны дээд талын «Миний код»-ыг харна. Тэр 6 тэмдэгтийг энд оруулна уу. Зөвхөн СУРАГЧ эрхтэй данс холбогдоно.",
    emptyTitle: "Хараахан сурагч нэмээгүй байна",
    emptyDescription:
      "Сурагчийн хувийн кодыг оруулбал түүний ахиц, дараалал, өдрийн зорилт энд харагдана.",
  },
};

type RosterResponse = { students: LinkedStudent[]; today: string };

export default function StudentRoster({
  relation,
  title,
  description,
}: {
  relation: Relation;
  title: string;
  description: string;
}) {
  const copy = COPY[relation];
  const path = `/api/students?relation=${relation}`;
  const { data, error, loading, reload } = useApiData<RosterResponse>(path);

  const students = data?.students ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>

      <AddStudentCard copy={copy} relation={relation} onAdded={() => void reload()} />

      {error && <ErrorNote message={error} onRetry={() => void reload()} />}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : students.length === 0 && !error ? (
        <EmptyState
          icon={<Users className="size-10" aria-hidden />}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
        />
      ) : (
        <ul className="space-y-3">
          {students.map((student) => (
            <li key={student.uid}>
              <StudentCard
                student={student}
                today={data?.today ?? ""}
                relation={relation}
                noun={copy.noun}
                onRemoved={() => void reload()}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddStudentCard({
  copy,
  relation,
  onAdded,
}: {
  copy: Copy;
  relation: Relation;
  onAdded: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await apiFetch<{
        student: LinkedStudent;
        alreadyLinked: boolean;
      }>("/api/students", { method: "POST", body: { code, relation } });

      setCode("");
      setNotice(
        result.alreadyLinked
          ? `${result.student.displayName} аль хэдийн нэмэгдсэн байна.`
          : `${result.student.displayName} нэмэгдлээ!`
      );
      onAdded();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="surface space-y-3 p-5">
      <div>
        <p className="font-bold text-gray-900 dark:text-white">{copy.addTitle}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{copy.addHint}</p>
      </div>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder={t("Жишээ нь ABC123")}
          maxLength={12}
          /* Код нь зөвхөн том үсэг, тоо тул гар утасны автомат
             томсголт/засварыг унтраана — эс бөгөөс "Abc123" болж бичигдэнэ. */
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          className="num w-full min-w-0 rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-semibold tracking-widest text-gray-900 outline-none focus:border-brand-500 dark:border-white/15 dark:bg-white/5 dark:text-white"
        />
        <button
          type="submit"
          disabled={busy || code.trim().length === 0}
          className="btn-primary flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-sm disabled:opacity-60"
        >
          <UserPlus className="size-4" aria-hidden />
          {busy ? "Нэмж байна…" : "Нэмэх"}
        </button>
      </div>

      {error && <ErrorNote message={error} />}
      {notice && (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          {notice}
        </p>
      )}
    </form>
  );
}

function StudentCard({
  student,
  today,
  relation,
  noun,
  onRemoved,
}: {
  student: LinkedStudent;
  today: string;
  relation: Relation;
  noun: string;
  onRemoved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCourses, setShowCourses] = useState(false);

  const initial = (student.displayName || "?").charAt(0).toUpperCase();
  // `today` нь серверээс (`APP_TIMEZONE`) ирнэ — хөтчийн цагийн бүсээр
  // бодвол өөр бүсэд байгаа хүүхэд буруу өдөр дээр унана.
  const activeToday = !!student.lastActiveDay && student.lastActiveDay === today;

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(
        `/api/students/${encodeURIComponent(student.uid)}?relation=${relation}`,
        { method: "DELETE" }
      );
      onRemoved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
      setBusy(false);
    }
  };

  return (
    <div className="surface space-y-3 p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
          {initial}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-bold text-gray-900 dark:text-white">
            {student.displayName}
            {student.isPremium && (
              <Crown className="size-4 shrink-0 text-gold-500" aria-hidden />
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {student.lastActiveDay
              ? activeToday
                ? "Өнөөдөр суралцсан 🎉"
                : `Сүүлд суралцсан: ${student.lastActiveDay}`
              : "Хараахан хичээл эхлээгүй"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50 dark:hover:bg-rose-500/10"
          aria-label={`${student.displayName} гэсэн ${noun}ийг жагсаалтаас хасах`}
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            Түвшин {student.level}
          </span>
          <span className="num text-gray-500 dark:text-gray-400">
            {student.xpToNext} XP үлдлээ
          </span>
        </div>
        <ProgressBar percent={student.percent} />
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 text-center dark:divide-white/10">
        <Metric Icon={Zap} className="text-brand-500" value={student.xp} label={t("Нийт XP")} />
        <Metric
          Icon={Flame}
          className="text-orange-500"
          value={student.streakDays}
          label={t("Дараалал")}
        />
        <Metric
          Icon={Crown}
          className="text-gold-500"
          value={student.dailyGoal}
          label={t("Өдрийн зорилт")}
        />
      </div>

      {/*
        ⚠ Курсын мэдээллийг ХААЛТТАЙ эхлүүлнэ. Эцэг эх 5 хүүхэдтэй бол
        бүгдийг нээлттэй харуулах нь 5 нэмэлт хүсэлт бөгөөд карт тус бүр
        дэлгэц дүүрэн болж, хүүхдүүдээ ХАРЬЦУУЛАХ боломж алдагдана.
      */}
      <button
        type="button"
        onClick={() => setShowCourses((value) => !value)}
        aria-expanded={showCourses}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-50 py-2 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
      >
        {showCourses ? (
          <ChevronUp className="size-4" aria-hidden />
        ) : (
          <ChevronDown className="size-4" aria-hidden />
        )}
        Хичээл тус бүрийн явц
      </button>

      <StudentCourses studentUid={student.uid} open={showCourses} />

      {error && <ErrorNote message={error} />}
    </div>
  );
}

function Metric({
  Icon,
  className,
  value,
  label,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  className: string;
  value: number;
  label: string;
}) {
  return (
    <div className="px-2">
      <p className="flex items-center justify-center gap-1.5">
        <Icon className={`size-4 ${className}`} aria-hidden />
        <span className="num text-lg font-extrabold text-gray-900 dark:text-white">
          {value}
        </span>
      </p>
      <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}
