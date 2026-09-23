"use client";

import { useState } from "react";
import { Eye, EyeOff, LayoutGrid, Plus, Trash2 } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { useApiData } from "@/hooks/useApiData";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { COLOR_KEYS, COLOR_LABELS } from "@/lib/tactiq/theme";

import type { ColorKey } from "@/lib/tactiq/theme";

/**
 * «АПП» ЖАГСААЛТЫГ УДИРДАХ — зөвхөн админ.
 *
 * ⚠ ЯАГААД САНД ХАДГАЛДАГ ВЭ: шинэ апп нэмэх бүрд код засаж, дахин
 * deploy хийх шаардлагагүй байх (эзний сонголт).
 *
 * ⚠ ШИНЭ АПП НУУЦЛАГДСАН ТӨРНӨ. Админ мэдээллийг бүрэн бөглөж,
 * холбоосыг нь шалгасны дараа «Нийтэд харуулах» дарна. Ажиллахгүй
 * холбоос нь хүүхдийг хоосон хуудсанд аваачна.
 */

type AppItem = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  url: string;
  kind: string;
  color: string;
  visible: boolean;
  sortOrder: number;
};

const input =
  "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-amber-500 dark:border-white/10 dark:bg-white/5 dark:text-white";

function AppForm({ app, onSaved }: { app: AppItem; onSaved: () => void }) {
  const [draft, setDraft] = useState(app);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof AppItem>(key: K, value: AppItem[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/admin/apps", { method: "PATCH", body: draft });
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Хадгалахад алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">Нэр</span>
        <input className={input} value={draft.name} onChange={(e) => set("name", e.target.value)} />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">
          Товч тайлбар
          <span className="ml-1 font-normal text-gray-400">— нэрийн доор гарна</span>
        </span>
        <input
          className={input}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">
          Логоны хаяг (URL)
          <span className="ml-1 font-normal text-gray-400">— хоосон бол өнгөт үсэг гарна</span>
        </span>
        <input
          className={input}
          value={draft.logoUrl}
          onChange={(e) => set("logoUrl", e.target.value)}
        />
      </label>

      {/*
        ⚠ НЭВТРЭЛТИЙН ТӨРӨЛ — гоо сайхан биш, АЮУЛГҮЙ БАЙДЛЫН сонголт.
        «Тасалбартай» нь хоёр талын нууц түлхүүр ба тэр апп дээр
        `exchange` эцсийн цэг байхыг шаардана (`deploy/TOURNAMENT.md`).
        Дурын апп руу сонговол нэвтрэлт ажиллахгүй.
      */}
      <label className="block">
        <span className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">
          Нэвтрэлт
        </span>
        <select
          className={input}
          value={draft.kind}
          onChange={(e) => set("kind", e.target.value)}
        >
          <option value="link">Энгийн холбоос — апп өөрөө нэвтрүүлнэ</option>
          <option value="tournament">Тасалбартай — даамалын тэмцээний сервер</option>
        </select>
      </label>

      {draft.kind === "link" && (
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">
            Холбоос
            <span className="ml-1 font-normal text-gray-400">— заавал https://</span>
          </span>
          <input
            className={input}
            placeholder="https://..."
            value={draft.url}
            onChange={(e) => set("url", e.target.value)}
          />
        </label>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gray-600 dark:text-gray-300">Өнгө</span>
          <select
            className={input}
            value={draft.color}
            onChange={(e) => set("color", e.target.value)}
          >
            {COLOR_KEYS.map((key: ColorKey) => (
              <option key={key} value={key}>
                {COLOR_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
          Эрэмбэ
          <input
            type="number"
            className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-white/5"
            value={draft.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
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

export default function AppsAdminPage() {
  const { data, loading, error, reload } = useApiData<{ apps: AppItem[] }>("/api/admin/apps");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const result = await apiFetch<{ app: AppItem }>("/api/admin/apps", {
        method: "POST",
        body: { name: "Шинэ апп" },
      });
      await reload();
      setOpenId(result.app.id);
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(app: AppItem) {
    await apiFetch("/api/admin/apps", {
      method: "PATCH",
      body: { id: app.id, visible: !app.visible },
    });
    await reload();
  }

  async function remove(app: AppItem) {
    if (!window.confirm(`«${app.name}»-ийг устгах уу?`)) return;
    await apiFetch(`/api/admin/apps?id=${encodeURIComponent(app.id)}`, { method: "DELETE" });
    await reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-gray-900 dark:text-white">
          <LayoutGrid className="size-6 text-amber-500" aria-hidden />
          Аппууд
        </h1>
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          Шинэ апп
        </button>
      </div>

      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
        Шинэ апп <strong>нуусан</strong> байдлаар үүснэ. Холбоосыг нь нээж шалгасны дараа
        «Нийтэд харуулах» дарна.
      </p>

      {loading && <Skeleton className="h-32 w-full" />}
      {error && <ErrorNote message={error} onRetry={() => void reload()} />}

      {data && data.apps.length === 0 && (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
          Апп бүртгэгдээгүй байна.
        </p>
      )}

      {data?.apps.map((app) => (
        <section key={app.id} className="surface space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 dark:text-white">{app.name}</p>
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {app.kind === "tournament" ? "тасалбартай нэвтрэлт" : app.url || "холбоосгүй"}
                {app.visible ? " · нийтэд харагдана" : " · нуусан"}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => void toggleVisible(app)}
                className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
              >
                {app.visible ? (
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
                onClick={() => setOpenId(openId === app.id ? null : app.id)}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
              >
                {openId === app.id ? "Хаах" : "Засах"}
              </button>
              <button
                type="button"
                onClick={() => void remove(app)}
                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
              >
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>

          {openId === app.id && (
            <AppForm
              app={app}
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
