"use client";

import { useState } from "react";
import { Building2, Eye, EyeOff, ImagePlus, Plus, Trash2 } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { useApiData } from "@/hooks/useApiData";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { getStorageLazy } from "@/lib/firebase";

/**
 * СУРГАЛТЫН ТӨВҮҮДИЙГ УДИРДАХ — зөвхөн админ.
 *
 * ⚠ ЯАГААД АДМИН ГАРААР ОРУУЛДАГ ВЭ: энэ жагсаалт нь хүүхэд, эцэг эхийг
 * бодит хаяг руу чиглүүлнэ. Хэн дуртай нь өөрийгөө «сургалтын төв» гэж
 * бүртгүүлдэг бол хяналтгүй зар болно (`api/admin/training-centers`-ийн
 * тайлбарыг үзнэ үү).
 *
 * ⚠ ШИНЭ ТӨВ НУУЦЛАГДСАН ТӨРНӨ. Админ мэдээллийг бүрэн бөглөж,
 * шалгасны дараа «Нийтэд харуулах» товчийг ЗОРИУД дарна. Дутуу
 * бөглөсөн төв жагсаалтад гарах нь харсан хүнд муу сэтгэгдэл үлдээнэ.
 */

type Center = {
  id: string;
  name: string;
  description: string;
  photoUrl: string;
  logoUrl: string;
  city: string;
  address: string;
  mapUrl: string;
  phone: string;
  email: string;
  link: string;
  teachesChess: boolean;
  teachesDraughts: boolean;
  visible: boolean;
  sortOrder: number;
};

/** Талбар бүрийн бичвэр — нэг дор, давтахгүйн тулд. */
const FIELDS: { key: keyof Center; label: string; hint?: string; area?: boolean }[] = [
  { key: "name", label: "Нэр" },
  { key: "description", label: "Танилцуулга", hint: "Юу заадаг, хэнд зориулсан", area: true },
  { key: "photoUrl", label: "Зургийн хаяг (URL)", hint: "Байр, анги танхимын өргөн зураг" },
  { key: "city", label: "Хот / дүүрэг" },
  { key: "address", label: "Дэлгэрэнгүй хаяг" },
  { key: "mapUrl", label: "Газрын зургийн холбоос", hint: "Дарахад зам заана" },
  { key: "phone", label: "Утас" },
  { key: "email", label: "И-мэйл" },
  { key: "link", label: "Вэб хуудас" },
];

const input =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-500 dark:border-white/10 dark:bg-white/5 dark:text-white";


/** Лого 2MB-ээс бага байх — `storage.rules` дээрх хязгаартай ИЖИЛ. */
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * ЛОГО БАЙРШУУЛАХ — файлыг Firebase Storage руу илгээж, URL-ыг буцаана.
 *
 * ⚠ ХАЯГ ГАРААР БИЧИХ БОЛОМЖ Ч ҮЛДЭНЭ: зарим төв логогоо өөрийн сайт
 * дээрээ аль хэдийн байршуулсан байдаг — тэр үед дахин хуулах нь дэмий.
 *
 * ⚠ Storage SDK-г ЭНД, хэрэгцээ гарсан үед татна (`settings/page.tsx`-тай
 * ижил зарчим): модулийн түвшинд импортлобол админы БҮХ хуудсын эхний
 * багцад орно, бодит хэрэглээ нь зөвхөн энэ товч.
 *
 * ⚠ ХУУЧИН ЛОГОГ УСТГАХГҮЙ. Нэр нь цагийн тэмдэгтэй тул дарж бичихгүй,
 * харин хуучин файл үлдэнэ. Устгах нь эрсдэлтэй: URL нь өөр төвийнх,
 * эсвэл гадны хаяг байж болно.
 */
function LogoPicker({
  centerId,
  value,
  onChange,
}: {
  centerId: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зургийн файл сонгоно уу.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Лого 2MB-ээс бага байх ёстой.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const [{ getDownloadURL, ref, uploadBytes }, storage] = await Promise.all([
        import("firebase/storage"),
        getStorageLazy(),
      ]);

      const ext = /\.[a-zA-Z0-9]+$/.exec(file.name)?.[0] ?? "";
      const fileRef = ref(storage, `training_centers/${centerId}/logo-${Date.now()}${ext}`);
      await uploadBytes(fileRef, file, { contentType: file.type });
      onChange(await getDownloadURL(fileRef));
    } catch {
      /*
       * ⚠ Ихэвчлэн Storage-ийн ДҮРЭМ унагаана: `storage.rules`-ийг
       * Firebase рүү deploy хийгээгүй бол админ ч бичиж чадахгүй.
       */
      setError("Байршуулахад алдаа гарлаа. Storage дүрмийг deploy хийсэн эсэхээ шалгана уу.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
      <span className="block text-xs font-bold text-gray-600 dark:text-gray-300">
        Лого
        <span className="ml-1 font-normal text-gray-400">— нэрийн хажууд гарах жижиг тэмдэг</span>
      </span>

      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="лого" className="size-14 rounded-xl object-contain" />
        ) : (
          <span className="grid size-14 place-items-center rounded-xl bg-white text-gray-300 dark:bg-white/10">
            <Building2 className="size-6" aria-hidden />
          </span>
        )}

        <label className="cursor-pointer rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:bg-white/10 dark:text-gray-200">
          <span className="flex items-center gap-1.5">
            <ImagePlus className="size-4" aria-hidden />
            {busy ? "Байршуулж байна…" : "Файл сонгох"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={upload} disabled={busy} />
        </label>

        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:underline"
          >
            Хасах
          </button>
        )}
      </div>

      <input
        className={input}
        placeholder="эсвэл логоны хаягийг (URL) энд буулгана"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />

      {error && <ErrorNote message={error} />}
    </div>
  );
}

function CenterForm({ center, onSaved }: { center: Center; onSaved: () => void }) {
  const [draft, setDraft] = useState(center);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Center>(key: K, value: Center[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/admin/training-centers", { method: "PATCH", body: draft });
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Хадгалахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {FIELDS.map((field) => (
        <label key={field.key} className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">
            {field.label}
            {field.hint && (
              <span className="ml-1 font-normal text-gray-400"> — {field.hint}</span>
            )}
          </span>
          {field.area ? (
            <textarea
              rows={3}
              className={input}
              value={String(draft[field.key] ?? "")}
              onChange={(event) => set(field.key, event.target.value as never)}
            />
          ) : (
            <input
              className={input}
              value={String(draft[field.key] ?? "")}
              onChange={(event) => set(field.key, event.target.value as never)}
            />
          )}
        </label>
      ))}

      <LogoPicker
        centerId={center.id}
        value={draft.logoUrl}
        onChange={(url) => set("logoUrl", url)}
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={draft.teachesChess}
            onChange={(event) => set("teachesChess", event.target.checked)}
          />
          Шатар
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={draft.teachesDraughts}
            onChange={(event) => set("teachesDraughts", event.target.checked)}
          />
          Даам
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Эрэмбэ
          <input
            type="number"
            className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5"
            value={draft.sortOrder}
            onChange={(event) => set("sortOrder", Number(event.target.value) || 0)}
          />
        </label>
      </div>

      {error && <ErrorNote message={error} />}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {busy ? "Хадгалж байна…" : "Хадгалах"}
      </button>
    </div>
  );
}

export default function TrainingCentersAdminPage() {
  const { data, loading, error, reload } = useApiData<{ centers: Center[] }>(
    "/api/admin/training-centers"
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const result = await apiFetch<{ center: Center }>("/api/admin/training-centers", {
        method: "POST",
        body: { name: "Шинэ сургалтын төв" },
      });
      await reload();
      // Шинээр үүсгэсний дараа ШУУД засварлах хэлбэрийг нээнэ — эс бөгөөс
      // админ «Шинэ сургалтын төв» гэсэн хоосон мөрийг олж дарах хэрэгтэй.
      setOpenId(result.center.id);
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(center: Center) {
    await apiFetch("/api/admin/training-centers", {
      method: "PATCH",
      body: { id: center.id, visible: !center.visible },
    });
    await reload();
  }

  async function remove(center: Center) {
    /*
     * ⚠ БАТАЛГААЖУУЛАЛТ ЗААВАЛ: устгал нь буцаагдахгүй бөгөөд хаяг,
     * утас, танилцуулга бүхэлдээ алга болно.
     */
    if (!window.confirm(`«${center.name}»-ийг бүрмөсөн устгах уу?`)) return;
    await apiFetch(`/api/admin/training-centers?id=${encodeURIComponent(center.id)}`, {
      method: "DELETE",
    });
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-gray-900 dark:text-white">
          <Building2 className="size-6 text-amber-500" aria-hidden />
          Сургалтын төвүүд
        </h1>
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          Шинэ төв
        </button>
      </div>

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        Шинэ төв <strong>нуусан</strong> байдлаар үүснэ. Мэдээллийг бүрэн бөглөж,
        шалгасны дараа «Нийтэд харуулах» товчийг дарна.
      </p>

      {loading && <Skeleton className="h-32 w-full" />}
      {error && <ErrorNote message={error} onRetry={() => void reload()} />}

      {data && data.centers.length === 0 && (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
          Сургалтын төв бүртгэгдээгүй байна.
        </p>
      )}

      {data?.centers.map((center) => (
        <section key={center.id} className="surface space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white">{center.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {[center.city, center.address].filter(Boolean).join(", ") || "хаяг оруулаагүй"}
                {center.visible ? " · нийтэд харагдана" : " · нуусан"}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void toggleVisible(center)}
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
              >
                {center.visible ? (
                  <>
                    <EyeOff className="size-3.5" aria-hidden /> Нуух
                  </>
                ) : (
                  <>
                    <Eye className="size-3.5" aria-hidden /> Нийтэд харуулах
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpenId(openId === center.id ? null : center.id)}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
              >
                {openId === center.id ? "Хаах" : "Засах"}
              </button>
              <button
                type="button"
                onClick={() => void remove(center)}
                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>

          {openId === center.id && (
            <CenterForm
              center={center}
              onSaved={() => {
                setOpenId(null);
                void reload();
              }}
            />
          )}
        </section>
      ))}
    </div>
  );
}
