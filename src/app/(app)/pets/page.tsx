"use client";

import { useState } from "react";
import { PetArt } from "@/components/tactiq/PetArt";
import { Coins, Info } from "lucide-react";
import Link from "next/link";

import { useUser } from "@/context/UserContext";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { sfx } from "@/lib/audio/sfx";
import { findSpecies } from "@/lib/tactiq/pets";
import { t } from "@/lib/i18n/t";

type Pet = {
  id: string;
  species: string;
  name: string;
  careStreak: number;
  bestStreak: number;
  totalCare: number;
  mood: "happy" | "hungry" | "sad";
  msToNextCare: number;
};

const MOOD: Record<Pet["mood"], { label: string; tone: string }> = {
  happy: {
    label: "Баяртай",
    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  hungry: {
    label: "Асаргаа хүлээж байна",
    tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  sad: {
    label: "Гунигтай",
    tone: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  },
};

/** Үлдсэн хугацааг «5 цаг 20 мин» болгоно. */
function untilNext(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} цаг` : `${hours} цаг ${rest} мин`;
}

/**
 * МИНИЙ ТЭЖЭЭВЭР — хооллох, услах.
 *
 * ⚠ Тэжээвэр нь ХАРИУЦЛАГА заах хэрэгсэл, шийтгэл БИШ: асаргаагүй үлдсэн ч
 * үхэх/хатахгүй, зөвхөн гунигтай болж дараалал нь тэгээс эхэлнэ
 * (`lib/tactiq/pets.ts`).
 */
export default function PetsPage() {
  const { user, apply } = useUser();
  const { data, error, loading, reload } = useApiData<{ pets: Pet[] }>("/api/pets");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    setActionError(null);
    try {
      const res = await apiFetch<{ gems?: number }>("/api/pets", {
        method: "POST",
        body,
      });
      // Зоосны тоо толгойд харагддаг тул шууд шинэчилнэ — дахин татахгүй.
      if (user && typeof res.gems === "number") apply({ ...user, gems: res.gems });

      sfx.care();
      reload();
    } catch (cause) {
      setActionError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (error) return <ErrorNote message={error} />;

  const pets = data?.pets ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("Миний тэжээвэр")}</h1>
        </div>

        <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1.5 font-bold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
          <Coins className="size-4" aria-hidden />
          <span className="num">{(user?.gems ?? 0).toLocaleString("mn-MN")}</span>
        </span>
      </div>

      {actionError && <ErrorNote message={actionError} />}


      {pets.length === 0 ? (
        <div className="surface space-y-3 p-5 text-center">
          <p className="text-4xl" aria-hidden>
            🐰 🌸
          </p>
          <p className="font-bold text-gray-900 dark:text-white">{t("Танд тэжээвэр байхгүй байна")}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("Дэлгүүрээс амьтан эсвэл цэцэг аваарай.")}</p>
          <Link href="/shop" className="btn-primary inline-block px-5 py-2.5 text-sm">{t("Дэлгүүр рүү")}</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {pets.map((pet) => {
            const species = findSpecies(pet.species);
            if (!species) return null;

            const mood = MOOD[pet.mood];
            const canCareNow = pet.msToNextCare === 0;

            return (
              <div key={pet.id} className="surface space-y-4 p-5">
                <div className="flex items-start gap-4">
                  <PetArt species={species} size={72} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {pet.name || t(species.label)}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${mood.tone}`}>
                        {t(mood.label)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("Дараалал:")}{" "}<span className="num font-semibold">{pet.careStreak}</span>{" "}{t("хоног · нийт")}{" "}<span className="num">{pet.totalCare}</span> удаа асарсан</p>
                  </div>
                </div>

                {/* Асаргааны заавар — худалдаж авмагц юу хийхээ мэдэх ёстой. */}
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <Info className="size-3.5 shrink-0" aria-hidden />{t("Асаргааны заавар")}</p>
                  <ul className="mt-1.5 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    {species.instructions.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void act(pet.id, { action: "care", petId: pet.id })}
                    disabled={busy !== null || !canCareNow}
                    className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
                  >
                    {busy === pet.id
                      ? "…"
                      : canCareNow
                        ? `${t(species.careLabel)} — ${species.careCost} ${t("зоос")}`
                        : `${untilNext(pet.msToNextCare)} ${t("дараа")}`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
