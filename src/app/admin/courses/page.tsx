"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, Plus } from "lucide-react";

import {
  Badge,
  ColorPicker,
  IconPicker,
  SelectField,
  TextArea,
  TextField,
} from "@/components/admin/fields";
import { SchoolPicker } from "@/components/admin/SchoolPicker";
import { Icon } from "@/components/tactiq/Icon";
import { EmptyState, ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useCurrentUser } from "@/context/UserContext";
import { useApiData } from "@/hooks/useApiData";
import { isAdminRole } from "@/lib/permissions";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { colorStyles } from "@/lib/tactiq/theme";
import { useSchools } from "@/context/SchoolsContext";

import type { School } from "@/lib/tactiq/schools";

type CourseRow = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  status: string;
  school: string;
  /** Харьяалагдах БҮХ сургууль — курс эдгээр бүлэг бүрт харагдана. */
  schools: string[];
  /** Жагсаалтын дараалал — админ дээш/доош товчоор өөрчилнө. */
  sortOrder?: number;
};

/** Курсын жагсаалт + шинэ курс үүсгэх (Хяналт → Сургалт). */
export default function AdminCoursesPage() {
  const { data, loading, error, reload } = useApiData<{ courses: CourseRow[] }>(
    "/api/admin/courses"
  );
  const [creating, setCreating] = useState(false);
  const user = useCurrentUser();
  const isAdmin = isAdminRole(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Сургалт</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isAdmin
              ? "Курс, нэгж, хичээл, дасгал энд удирдана."
              : "Нэгж, хичээл, дасгал нэмнэ. Зөвхөн өөрийн оруулсныг засна."}
          </p>
        </div>
        {/*
          ⚠ Курс ҮҮСГЭХ нь ЗӨВХӨН админд (`/api/admin/courses` дээрх
          `requireAdmin`). Багшид товч харуулбал дарахад л 403 авна —
          нуух нь тодорхой бөгөөд эелдэг.
        */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Plus className="size-4" aria-hidden />
            Шинэ курс
          </button>
        )}
      </div>

      {creating && (
        <CreateCourseForm
          onCreated={() => {
            setCreating(false);
            void reload();
          }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && <ErrorNote message={error} onRetry={reload} />}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : data && data.courses.length === 0 ? (
        <EmptyState title="Курс алга" description="Эхний курсоо үүсгэж эхэл." />
      ) : (
        <CourseList courses={data?.courses ?? []} canReorder={isAdmin} />
      )}
    </div>
  );
}

/**
 * Курсуудыг СУРГУУЛИАР бүлэглэнэ — сургуулийн дарааллаар, бүлэг дотроо
 * ирсэн (`sortOrder`) дарааллаар. Сургуульгүй курсууд төгсгөлд «Бүлэглээгүй».
 *
 * ⚠ Хэрэглэгчийн `/courses` дэлгэц ЯГ ИЖИЛ бүлэглэлтээр харуулдаг
 * (`groupBySchool`, `app/(app)/courses/page.tsx`) — тиймээс энд харагдаж
 * буй бүлэг доторх дараалал нь хэрэглэгчид харагдах дараалал.
 */
function groupCoursesBySchool(courses: CourseRow[], schools: readonly School[]) {
  // ⚠ Курс ОЛОН сургуульд байж болно — тэр үед бүлэг бүрт давхар харагдана.
  const groups = schools.map((school) => ({
    key: school.slug,
    title: `${school.title} · ${school.subtitle}`,
    items: courses.filter((course) => (course.schools ?? []).includes(school.slug)),
  }));

  const known = new Set(schools.map((school) => school.slug));
  groups.push({
    key: "",
    title: "Бүлэглээгүй",
    items: courses.filter((course) => !(course.schools ?? []).some((slug) => known.has(slug))),
  });

  return groups.filter((group) => group.items.length > 0);
}

/**
 * Курсын жагсаалт + ДАРААЛАЛ ЗАСАХ — СУРГУУЛЬ ТУС БҮРИЙН ДОТОР.
 *
 * ⚠ Дээш/доош нь ЗӨВХӨН тухайн сургуулийн курсуудын дунд хөдөлнө. Урьд нь
 * бүх курс нэг холимог жагсаалт байсан тул Mind-ийн хоёр курсыг солиход
 * Codely-ийн курс дундуур нь орж ирдэг, «Шатрыг Даамын өмнө» гэхийн тулд
 * олон алхам хийх шаардлагатай байв.
 *
 * ⚠ Сервер рүү БҮТЭН жагсаалтыг (бүлгүүдийг дараалуулж) илгээнэ —
 * `reorderCourses` 0,1,2… гэж дахин дугаарлана.
 *
 * ⚠ Дарааллыг ЗӨВХӨН админ өөрчилнө (сервер тал ч `requireAdmin`).
 *
 * ⚠ ДРАГ БИШ, ДЭЭШ/ДООШ ТОВЧ: гар утсан дээр драг нь хуудас гүйлгэхтэй
 * зөрчилддөг, товч нь гараас ажилладаг (хүртээмж).
 *
 * ⚠ Өөрчлөлт нь ШУУД хадгалагдана (тусдаа «Хадгалах» товчгүй).
 */
function CourseList({ courses, canReorder }: { courses: CourseRow[]; canReorder: boolean }) {
  const schools = useSchools();
  const [order, setOrder] = useState(courses);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Сервер шинэ жагсаалт татахад (шинэ курс үүсгэсэн гэх мэт) дагана.
  useEffect(() => {
    setOrder(courses);
  }, [courses]);

  const groups = groupCoursesBySchool(order, schools);

  const move = async (groupKey: string, index: number, delta: number) => {
    const group = groups.find((entry) => entry.key === groupKey);
    if (!group) return;

    const target = index + delta;
    if (target < 0 || target >= group.items.length) return;

    /*
     * Хоёр курсын НИЙТ жагсаалт дахь байрыг СОЛЬНО.
     *
     * ⚠ Бүлгүүдийг дараалуулж нэг жагсаалт болгож БОЛОХГҮЙ: курс олон
     * сургуульд байж болох тул тэр нь давхардсан slug-тай жагсаалт үүсгэнэ.
     * Солилт нь дараалал нэг л (`sortOrder`) тул хоёр курс хоёулаа байгаа
     * БУСАД сургуульд ч харьцангуй байрaa солино — бусад курс хөдлөхгүй.
     */
    const first = group.items[index].slug;
    const second = group.items[target].slug;
    const next = [...order];
    const firstAt = next.findIndex((course) => course.slug === first);
    const secondAt = next.findIndex((course) => course.slug === second);
    [next[firstAt], next[secondAt]] = [next[secondAt], next[firstAt]];
    const previous = order;

    // Өөрчлөлтийг ШУУД харуулна — сервер хариу ирэхийг хүлээвэл товч
    // «гацсан» мэт мэдрэгдэнэ.
    setOrder(next);
    setSaving(true);
    setError(null);

    try {
      await apiFetch("/api/admin/courses/reorder", {
        method: "POST",
        body: { slugs: next.map((course) => course.slug) },
      });
    } catch (cause) {
      // Амжилтгүй бол хуучин дараалалдаа БУЦНА — эс бөгөөс дэлгэц дээрх
      // дараалал сангийнхаас зөрж, админ хадгалагдсан гэж эндүүрнэ.
      setOrder(previous);
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <ErrorNote message={error} />}

      {groups.map((group) => (
        <section key={group.key || "ungrouped"} className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{group.title}</h2>
            <span className="num text-xs text-gray-400">{group.items.length}</span>
            {canReorder && group.items.length > 1 && (
              <span className="ml-auto text-xs text-gray-400">
                Хэрэглэгчид энэ дарааллаар харагдана
              </span>
            )}
          </div>

          {group.items.map((course, index) => {
            const styles = colorStyles(course.color);

            return (
              <div key={course.slug} className="surface flex items-center gap-3 p-4">
                {canReorder && (
                  <div className="flex shrink-0 flex-col">
                    <button
                      type="button"
                      onClick={() => void move(group.key, index, -1)}
                      disabled={index === 0 || saving}
                      className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                      aria-label={`${course.title} — дээш`}
                    >
                      <ChevronUp className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(group.key, index, 1)}
                      disabled={index === group.items.length - 1 || saving}
                      className="grid size-7 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-white/5"
                      aria-label={`${course.title} — доош`}
                    >
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                  </div>
                )}

                {/* Бүлэг доторх байр — хэрэглэгчид хэддүгээрт харагдахыг хэлнэ */}
                <span className="num w-5 shrink-0 text-center text-sm font-extrabold text-gray-400">
                  {index + 1}
                </span>

                <Link
                  href={`/admin/courses/${encodeURIComponent(course.slug)}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-xl text-white ${styles.iconBg}`}
                  >
                    <Icon name={course.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {course.title}
                      </p>
                      <Badge tone={course.status === "active" ? "emerald" : "gray"}>
                        {course.status === "active" ? "Идэвхтэй" : "Тун удахгүй"}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                      {course.description || "—"}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-gray-400" aria-hidden />
                </Link>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function CreateCourseForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const allSchools = useSchools();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("book");
  const [color, setColor] = useState("violet");
  const [status, setStatus] = useState<"active" | "coming-soon">("coming-soon");
  const [schools, setSchools] = useState<string[]>([allSchools[0].slug]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/admin/courses", {
        method: "POST",
        body: { slug, title, description, icon, color, status, schools },
      });
      onCreated();
      router.push(`/admin/courses/${encodeURIComponent(slug)}`);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
      setBusy(false);
    }
  };

  return (
    <div className="surface space-y-4 p-5">
      <h2 className="font-semibold text-gray-900 dark:text-white">Шинэ курс</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Slug (URL)"
          hint="Зөвхөн жижиг үсэг, тоо, зураас — жишээ нь draughts"
          value={slug}
          onChange={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          maxLength={32}
          placeholder="draughts"
        />
        <TextField label="Гарчиг" value={title} onChange={setTitle} maxLength={120} placeholder="Даам" />
      </div>

      <TextArea
        label="Тайлбар"
        value={description}
        onChange={setDescription}
        rows={2}
      />

      {/* Сургуулиуд — курс `/courses` дэлгэц дээр аль бүлгүүдэд харагдахыг
          шийднэ (`lib/tactiq/schools.ts`). */}
      <SchoolPicker value={schools} onChange={setSchools} />

      <div className="grid gap-4 sm:grid-cols-2">
        <ColorPicker value={color} onChange={setColor} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Төлөв"
          value={status}
          onChange={setStatus}
          options={[
            { value: "coming-soon", label: "Тун удахгүй (сонгогдохгүй)" },
            { value: "active", label: "Идэвхтэй (сонгож болно)" },
          ]}
        />
      </div>

      <IconPicker value={icon} onChange={setIcon} />

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy || !slug || !title}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "Үүсгэж байна…" : "Үүсгэх"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Цуцлах
        </button>
      </div>
    </div>
  );
}
