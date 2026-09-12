"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Flame, Snowflake, X } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { useApiData } from "@/hooks/useApiData";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { addDays, daysBetween, WEEKDAY_LABELS } from "@/lib/tactiq/day";

type CalendarData = {
  activeDays: string[];
  from: string;
  to: string;
  streakDays: number;
  longestStreak: number;
  freezes: number;
  maxFreezes: number;
  purchasesLeft: number;
  costGems: number;
  gems: number;
};

/**
 * Дарааллын хуанли — "Гал" дээр дарахад гарна.
 *
 * ⚠ Хуанли нь `lesson_progress`-ээс гардаг (`lib/api/streak.ts`), тусдаа
 * "идэвхтэй өдөр" хүснэгтээс биш. Хоёр эх сурвалж байвал хуанли нь
 * дараалалтайгаа зөрөх бөгөөд тэр нь хэрэглэгчийн итгэлийг шууд алдагдуулна.
 */
export default function StreakCalendar({ onClose }: { onClose: () => void }) {
  const { apply } = useUser();
  const { data, error, loading, reload, patch } =
    useApiData<CalendarData>("/api/learn/streak");

  const [busy, setBusy] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const buy = async () => {
    setBusy(true);
    setBuyError(null);
    try {
      const result = await apiFetch<{ gems: number; freezes: number }>(
        "/api/learn/streak",
        { method: "POST" }
      );

      /*
       * Хоёр газрыг зэрэг шинэчилнэ: энэ цонхны төлөв БА толгойн тоолуур
       * (`UserContext`). Зөвхөн эхнийхийг хийвэл дээрх зоосны тоо хуучин
       * утгаараа үлдэж, хэрэглэгч "төлбөр авсангүй" гэж бодно.
       */
      patch((current) => ({
        ...current,
        gems: result.gems,
        freezes: result.freezes,
        purchasesLeft: Math.max(0, current.purchasesLeft - 1),
      }));
      apply({ gems: result.gems, streakFreezes: result.freezes });
    } catch (cause) {
      setBuyError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  const overlay = (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        onClick={onClose}
        aria-label="Хаах"
        className="absolute inset-0 bg-black/50"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Дарааллын хуанли"
        className="relative max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl dark:bg-gray-950"
      >
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-flame-400 to-flame-600 text-white shadow-lg shadow-flame-500/25">
            <Flame className="size-6" fill="currentColor" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <p className="num text-2xl font-extrabold text-gray-900 dark:text-white">
              {data?.streakDays ?? 0}
              <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
                өдрийн дараалал
              </span>
            </p>
            <p className="num text-xs text-gray-500 dark:text-gray-400">
              Хамгийн урт: {data?.longestStreak ?? 0} өдөр
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="grid size-8 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {loading && <Skeleton className="h-56 w-full rounded-2xl" />}
        {error && <ErrorNote message={error} onRetry={() => void reload()} />}

        {data && (
          <>
            <Grid data={data} />

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-sky-50 p-4 dark:bg-sky-500/10">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-white">
                <Snowflake className="size-5" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <p className="num text-sm font-bold text-sky-900 dark:text-sky-100">
                  Мөс {data.freezes} / {data.maxFreezes}
                </p>
                {/*
                  ⚠ Мөс ЮУ ХИЙДЭГИЙГ энд бичнэ. "Мөс" гэдэг үг өөрөө юу ч
                  тайлбарлахгүй — худалдаж авахын өмнө хэрэглэгч юунд
                  зарцуулж байгаагаа мэдэх ёстой.
                */}
                <p className="text-xs text-sky-800/80 dark:text-sky-200/70">
                  Нэг мөс нэг өдөр хичээллэхгүй өнгөрөхөд дараалал тасрахаас
                  хамгаална. Автоматаар зарцуулагдана.
                </p>
              </div>
            </div>

            {buyError && (
              <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {buyError}
              </p>
            )}

            <BuyButton data={data} busy={busy} onBuy={() => void buy()} />
          </>
        )}
      </div>
    </div>
  );

  /*
   * ⚠ ЦОНХЫГ `document.body`-Д PORTAL-ААР ЗУРНА, байрандаа НЕ.
   *
   * Энэ компонентыг толгойн дарааллын тоолуураас дууддаг бөгөөд тэр толгой
   * нь `backdrop-blur`-тай. `backdrop-filter` (мөн `transform`, `filter`,
   * `will-change`) нь `position: fixed` үр элементэд ШИНЭ АГУУЛАХ БЛОК
   * үүсгэдэг — тиймээс `inset-0` нь дэлгэц БИШ, 64px өндөртэй толгойн
   * хайрцгийг заана. Үр дүнд нь цонхны дээд тал дэлгэцээс гарч тасарна.
   *
   * Portal нь цонхыг ямар ч эцгийн CSS контекстээс салгана — цаашид өөр
   * газраас дуудсан ч ажиллана.
   *
   * `typeof document` шалгалт нь сервер талд (SSR) `document` байхгүйгээс
   * унахаас сэргийлнэ.
   */
  if (typeof document === "undefined") return null;

  return createPortal(overlay, document.body);
}

/**
 * Худалдан авах товч ба яагаад боломжгүй байгаа шалтгаан.
 *
 * ⚠ Товчийг зүгээр "идэвхгүй" болгож орхихгүй — идэвхгүй товч нь ЯАГААД
 * гэдгийг хэлдэггүй тул хэрэглэгч эвдэрсэн гэж бодно. Шалтгаан бүрд
 * тодорхой мессеж.
 */
function BuyButton({
  data,
  busy,
  onBuy,
}: {
  data: CalendarData;
  busy: boolean;
  onBuy: () => void;
}) {
  if (data.purchasesLeft === 0) {
    return (
      <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
        Мөс худалдаж авах хязгаарт хүрсэн байна.
      </p>
    );
  }

  if (data.freezes >= data.maxFreezes) {
    return (
      <p className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
        Мөсний сав дүүрэн — эхлээд хэрэглээрэй.
      </p>
    );
  }

  const affordable = data.gems >= data.costGems;

  return (
    <>
      <button
        type="button"
        onClick={onBuy}
        disabled={busy || !affordable}
        className="btn-primary mt-3 w-full px-5 py-3 disabled:opacity-60"
      >
        {busy
          ? "Авч байна…"
          : `Мөс авах — ${data.costGems.toLocaleString("mn-MN")} зоос`}
      </button>

      <p className="num mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
        {affordable
          ? `Танд ${data.gems.toLocaleString("mn-MN")} зоос байна · дахин ${data.purchasesLeft} удаа авч болно`
          : `Танд ${data.gems.toLocaleString("mn-MN")} зоос байна — ${(data.costGems - data.gems).toLocaleString("mn-MN")} дутуу`}
      </p>
    </>
  );
}

/** Долоо хоногийн мөр бүхий хуанли. */
function Grid({ data }: { data: CalendarData }) {
  const active = new Set(data.activeDays);

  /*
   * Эхний нүдийг ДАВАА гарагт эгнүүлнэ.
   *
   * ⚠ Үүнгүй бол баганын гарчиг ("Да Мя Лх…") нүднүүдтэйгээ таарахгүй —
   * хуанли зөв харагдах ч өдрүүд нь БУРУУ гараг дээр зогсоно.
   */
  const firstWeekday = new Date(`${data.from}T00:00:00Z`).getUTCDay() || 7;
  const pad = firstWeekday - 1;
  const total = daysBetween(data.to, data.from) + 1;

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="text-center text-[11px] font-bold text-gray-400 dark:text-gray-500"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: pad }, (_, index) => (
          <span key={`pad-${index}`} aria-hidden />
        ))}

        {Array.from({ length: total }, (_, index) => {
          const day = addDays(data.from, index);
          const on = active.has(day);
          const isToday = day === data.to;

          return (
            <span
              key={day}
              title={day}
              className={`grid aspect-square place-items-center rounded-xl text-[11px] font-bold transition-colors ${
                on
                  ? "bg-gradient-to-br from-flame-400 to-flame-600 text-white"
                  : "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-600"
              } ${isToday ? "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-gray-950" : ""}`}
            >
              {on ? (
                <Flame className="size-3.5" fill="currentColor" aria-hidden />
              ) : (
                day.slice(-2)
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
