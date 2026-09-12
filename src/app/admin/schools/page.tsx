"use client";

import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import { TextArea, TextField } from "@/components/admin/fields";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { apiFetch } from "@/lib/apiClient";
import { SCHOOLS } from "@/lib/tactiq/schools";

import type { TopicGroup } from "@/lib/tactiq/schools";

type SchoolDefaults = {
  title: string;
  subtitle: string;
  tagline: string;
  description: string;
  groups: TopicGroup[];
};

type SchoolOverride = {
  slug: string;
  title: string | null;
  subtitle: string | null;
  tagline: string | null;
  description: string | null;
  groups: TopicGroup[] | null;
};

type Payload = {
  schools: { slug: string; defaults: SchoolDefaults; override: SchoolOverride | null }[];
};

/**
 * СУРГУУЛИЙН ТЕКСТИЙГ ЗАСАХ дэлгэц (зөвхөн админ).
 *
 * ⚠ Сургуулийг НЭМЭХ, УСТГАХ, ДАРААЛЛЫГ өөрчлөх боломж ЗОРИУД байхгүй.
 * Зургаан сургууль нь `lib/tactiq/schools.ts`-д кодод — дүрс нь React
 * компонент, өнгө нь Tailwind-ийн сканнерддаг класс текст тул өгөгдлийн
 * сангаас уншиж болохгүй. Мөн ингэснээр админ санамсаргүй сургууль
 * устгаад нүүр хуудсыг цоорхойтой болгох боломжгүй.
 *
 * ⚠ ХООСОН талбар = «анхдагчийг хэрэглэ», хоосон НЭР биш. Тиймээс талбарыг
 * цэвэрлээд хадгалахад сургуулийн нэр хоосон болохын оронд кодын утга
 * руугаа буцна — дэлгэц дээр placeholder-оор тэр утгыг харуулна.
 */
export default function AdminSchoolsPage() {
  const { data, error, loading, reload } = useApiData<Payload>("/api/admin/schools");

  return (
    <AdminShell>
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Сургуулийн нэр, тайлбар, сэдвүүдийг засна. Хоосон орхисон талбар нь анхдагч
          утгаараа (доор бүдэг өнгөөр харагдана) хэвээр үлдэнэ. Сургууль нэмэх, устгах,
          дараалал солих боломжгүй — өнгө, дүрс нь кодод бичигдсэн.
        </p>

        {error && <ErrorNote message={error} />}

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {(data?.schools ?? []).map((entry) => (
              <SchoolCard key={entry.slug} entry={entry} onSaved={reload} />
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}

function SchoolCard({
  entry,
  onSaved,
}: {
  entry: { slug: string; defaults: SchoolDefaults; override: SchoolOverride | null };
  onSaved: () => void;
}) {
  const { slug, defaults, override } = entry;

  // Кодын дүрс, өнгө — DB-ээс БИШ, slug-аар кодоос олно.
  const brand = SCHOOLS.find((school) => school.slug === slug);

  const [title, setTitle] = useState(override?.title ?? "");
  const [subtitle, setSubtitle] = useState(override?.subtitle ?? "");
  const [tagline, setTagline] = useState(override?.tagline ?? "");
  const [description, setDescription] = useState(override?.description ?? "");
  const [groups, setGroups] = useState<TopicGroup[]>(override?.groups ?? defaults.groups);

  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setSaveError(null);
    setNotice(null);

    try {
      await apiFetch(`/api/admin/schools/${slug}`, {
        method: "PATCH",
        auth: true,
        body: { title, subtitle, tagline, description, groups },
      });
      setNotice("Хадгалагдлаа.");
      onSaved();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Хадгалахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setSaveError(null);
    setNotice(null);

    try {
      await apiFetch(`/api/admin/schools/${slug}`, { method: "DELETE", auth: true });
      // Дэлгэцийг кодын анхдагч руу нь буцаана — дахин татахыг хүлээхгүй.
      setTitle("");
      setSubtitle("");
      setTagline("");
      setDescription("");
      setGroups(defaults.groups);
      setNotice("Анхдагч руу буцлаа.");
      onSaved();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Буцаахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-gray-900">
      <header className="mb-4 flex items-center gap-3">
        {brand && (
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-sm ${brand.gradient}`}
          >
            <brand.Icon className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="font-bold leading-tight text-gray-900 dark:text-white">
            {title.trim() || defaults.title}
          </h2>
          <p className="font-num text-xs text-gray-400">{slug}</p>
        </div>
        {override && (
          <span className="ml-auto rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            засвартай
          </span>
        )}
      </header>

      <div className="space-y-3">
        <TextField
          label="Нэр"
          value={title}
          onChange={setTitle}
          placeholder={defaults.title}
          maxLength={40}
          hint="Хоосон бол анхдагч нэр хэрэглэгдэнэ."
        />
        <TextField
          label="Дэд нэр"
          value={subtitle}
          onChange={setSubtitle}
          placeholder={defaults.subtitle}
          maxLength={80}
        />
        <TextField
          label="Нэг мөр (tagline)"
          value={tagline}
          onChange={setTagline}
          placeholder={defaults.tagline}
          maxLength={200}
        />
        <TextArea
          label="Тайлбар"
          value={description}
          onChange={setDescription}
          rows={3}
          hint={description.trim() ? undefined : `Анхдагч: ${defaults.description}`}
        />

        <TopicGroupsEditor groups={groups} onChange={setGroups} />
      </div>

      {saveError && (
        <div className="mt-3">
          <ErrorNote message={saveError} />
        </div>
      )}
      {notice && (
        <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">{notice}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
        >
          {busy ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={busy || !override}
          title={override ? "Кодын анхдагч текст руу буцаана" : "Засвар байхгүй"}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
        >
          <RotateCcw className="size-4" aria-hidden />
          Анхдагч руу буцаах
        </button>
      </div>
    </section>
  );
}

/**
 * Сэдвийн бүлгүүдийг засна — бүлэг нэмэх/устгах, сэдвийг мөр мөрөөр.
 *
 * Сэдвүүдийг ОЛОН МӨРТ талбараар (мөр = нэг сэдэв) авна: 40 хүртэл сэдэв
 * тус бүрд өөр input тавибал дэлгэц уншигдахаа болино, харин мөр залгах нь
 * хуулж/буулгахад ч хамгийн хялбар.
 */
function TopicGroupsEditor({
  groups,
  onChange,
}: {
  groups: TopicGroup[];
  onChange: (next: TopicGroup[]) => void;
}) {
  const update = (index: number, patch: Partial<TopicGroup>) =>
    onChange(groups.map((group, position) => (position === index ? { ...group, ...patch } : group)));

  return (
    <fieldset className="space-y-3 rounded-xl border border-gray-200 p-3 dark:border-white/10">
      <legend className="px-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        Сэдвүүд
      </legend>

      {groups.length === 0 && (
        <p className="text-sm text-gray-400">Бүлэг байхгүй — доороос нэмнэ үү.</p>
      )}

      {groups.map((group, index) => (
        <div key={index} className="space-y-2 rounded-lg bg-gray-50 p-3 dark:bg-white/5">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                label={`${index + 1}-р бүлгийн гарчиг`}
                value={group.title ?? ""}
                onChange={(value) => update(index, { title: value.trim() ? value : null })}
                placeholder="(гарчиггүй)"
                maxLength={60}
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(groups.filter((_, position) => position !== index))}
              title="Бүлгийг устгах"
              className="mb-1 rounded-lg border border-gray-300 p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:border-white/15 dark:hover:bg-red-500/10"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>

          <TextArea
            label="Сэдвүүд — мөр тутамд нэг"
            value={group.topics.join("\n")}
            onChange={(value) => update(index, { topics: value.split("\n") })}
            rows={Math.min(12, Math.max(3, group.topics.length + 1))}
          />
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...groups, { title: null, topics: [] }])}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 dark:border-white/20 dark:text-gray-300 dark:hover:bg-white/5"
      >
        <Plus className="size-4" aria-hidden />
        Бүлэг нэмэх
      </button>
    </fieldset>
  );
}
