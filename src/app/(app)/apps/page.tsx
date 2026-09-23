"use client";

import { useState } from "react";
import { ExternalLink, LayoutGrid } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { useApiData } from "@/hooks/useApiData";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { colorStyles } from "@/lib/tactiq/theme";
import { t } from "@/lib/i18n/t";

/**
 * «АПП» — ПЛАТФОРМЫН БУСАД АПП РУУ ОРОХ ХӨӨРГҮҮР.
 *
 * ⚠ УРЬД НЬ ЭНЭ ЦЭС «ТЭМЦЭЭН» БАЙВ бөгөөд дөрвөн табтай (Тэмцээн,
 * Чансаа, Сургалтын төв, Дасгалжуулагч). Эзний шийдвэрээр тэр табууд
 * ХАСАГДАЖ, цэс нь ЦЭВЭР ХӨӨРГҮҮР болов: нэг л зүйл хийдэг дэлгэц нь
 * дөрвөн зүйлийг хагас хийдэг дэлгэцээс ойлгомжтой.
 *
 * ⚠ ЖАГСААЛТ НЬ САНГААС (`apps` хүснэгт, админ бүртгэнэ) — кодод
 * тогтмол БИШ. Шинэ апп нэмэхэд deploy хийх шаардлагагүй.
 *
 * ⚠ ХУУРАМЧ ӨГӨГДӨЛ ОРУУЛААГҮЙ: апп бүртгээгүй бол жагсаалт ХООСОН
 * бөгөөд түүнийгээ үнэнээр хэлнэ.
 */

type AppItem = {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  url: string;
  kind: string;
  color: string;
};

export default function AppsPage() {
  const { data, loading, error, reload } = useApiData<{ apps: AppItem[] }>("/api/apps");
  const [busy, setBusy] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  /**
   * Аппыг нээнэ.
   *
   * ⚠ ХОЁР ӨӨР ЗАМ (`kind`):
   *   • `tournament` — ТАСАЛБАРТАЙ дамжуулалт. `/api/tournament/session`
   *     нь 90 секундын тасалбартай хаяг буцаана; тэр аппын сервер нь
   *     нууц түлхүүрээрээ түүнийг Firebase токен болгож солино
   *     (`deploy/TOURNAMENT.md`). Сурагч дахин нэвтрэхгүй.
   *   • `link` — энгийн холбоос. Тэр апп өөрөө нэвтрүүлнэ.
   *
   * ⚠ `replace` — `assign` БИШ: хэрэглэгч нөгөө аппаас «буцах» дарахад
   * энэ хуудсанд буугаад дахин шидэгдэх нь гацсан мэт мэдрэгдэнэ.
   */
  async function open(item: AppItem) {
    if (item.kind !== "tournament") {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }

    setBusy(item.id);
    setOpenError(null);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/tournament/session", {
        method: "POST",
      });
      window.location.replace(url);
    } catch (cause) {
      setOpenError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15">
          <LayoutGrid className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{t("Апп")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Манай бусад апп руу эндээс орно.")}
          </p>
        </div>
      </header>

      {openError && <ErrorNote message={openError} />}
      {loading && <Skeleton className="h-32 w-full" />}
      {error && <ErrorNote message={error} onRetry={() => void reload()} />}

      {data && data.apps.length === 0 && (
        <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
          {t("Апп хараахан бүртгэгдээгүй байна.")}
        </p>
      )}

      {/*
        ⚠ ХОЁР БАГАНА `sm`-ЭЭС ДЭЭШ: утсан дээр нэг багана байх нь
        хүрэх талбайг том байлгана, том дэлгэц дээр нэг багана нь
        хоосон зай их үлдээнэ.
      */}
      <ul className="grid gap-3 sm:grid-cols-2">
        {data?.apps.map((item) => {
          const styles = colorStyles(item.color);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void open(item)}
                disabled={busy === item.id}
                className="surface flex w-full items-center gap-4 p-4 text-left transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {item.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.logoUrl}
                    alt=""
                    loading="lazy"
                    className="size-14 shrink-0 rounded-2xl bg-white object-contain dark:bg-white/10"
                  />
                ) : (
                  <span
                    className={`grid size-14 shrink-0 place-items-center rounded-2xl text-xl font-extrabold text-white ${styles.iconBg}`}
                  >
                    {item.name.charAt(0).toUpperCase()}
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                    {item.name}
                    {item.kind !== "tournament" && (
                      <ExternalLink className="size-3.5 shrink-0 text-gray-400" aria-hidden />
                    )}
                  </span>
                  {item.description && (
                    <span className="mt-0.5 block text-sm leading-snug text-gray-500 dark:text-gray-400">
                      {busy === item.id ? t("Нээж байна…") : item.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
