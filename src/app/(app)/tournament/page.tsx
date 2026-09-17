"use client";

import { useState } from "react";
import { ExternalLink, Trophy } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { TournamentSection } from "@/components/tactiq/TournamentSection";
import { ErrorNote } from "@/components/tactiq/ui";
import { tournamentEnabled } from "@/lib/tactiq/tournament";
import { t } from "@/lib/i18n/t";

/**
 * ТЭМЦЭЭНИЙ ХУУДАС — цагийн хуваарь, бүртгэл, ивээн тэтгэгчид.
 *
 * ⚠ Урьд нь энэ хуудас нь ЗӨВХӨН ГҮҮР байсан: нээгдмэгц тасалбар авч
 * тэмцээний сайт руу АВТОМАТААР шиддэг байв. Тэр нь хоёр асуудалтай:
 *
 *   1. Хэрэглэгч «Тэмцээн» цэсийг дарахад юу болсныг ойлгохгүй — өөр
 *      домэйн дээр өөр дүр төрхтэй сайт нээгдэнэ.
 *   2. Ямар тэмцээн хэзээ болохыг АППААС харах арга байхгүй. Хуваарь,
 *      бүртгэл, төлбөр бүгд манай талд байдаг тул тэднийг нуух шалтгаан
 *      алга (`TournamentSection`).
 *
 * Одоо шилжилт нь ЗӨВХӨН ГАРААР: тэмцээн эхлэхэд ойртмогц жагсаалт дээрх
 * «Тэмцээнд орох» товч, эсвэл доорх холбоос нь тасалбар авч аваачна.
 */
export default function TournamentPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openTournamentSite = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/tournament/session", {
        method: "POST",
      });
      /*
       * ⚠ `replace` — `assign` БИШ: хэрэглэгч тэмцээний сайтаас «буцах»
       * дарахад энэ хуудсанд буугаад дахин шидэгдэх нь дамжлагад гацсан
       * мэт мэдрэгдэнэ.
       */
      window.location.replace(url);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15">
          <Trophy className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
            {t("Тэмцээний цаг")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Чансаа тогтоох тэмцээнүүдийн хуваарь ба бүртгэл.")}
          </p>
        </div>
      </div>

      {error && <ErrorNote message={error} />}

      {/*
        ⚠ `defaultOpen` — баннер хэлбэрээр БИШ, шууд дэлгэрэнгүйгээр:
        хэрэглэгч энэ хуудсыг зориуд нээсэн. Баннер нь зөвхөн лоббид
        (`/play`) хэрэгтэй.
      */}
      {/*
        ⚠ ИВЭЭН ТЭТГЭГЧДИЙГ `TournamentSection` дотроос гаргана: жагсаалт
        нь аль хэдийн `/api/tournament/list`-ийг татдаг тул энд ДАХИН
        татвал ижил өгөгдлийн төлөө хоёр хүсэлт явна.
      */}
      <TournamentSection defaultOpen withSponsors />

      {/*
        ⚠ Тэмцээний сайт руу ГАРААР орох зам: тоглолт нь тэнд явагддаг
        тул тасалбараа гартаа авах шаардлага гарч мэднэ (жишээ нь
        жагсаалт татагдахгүй байхад).
      */}
      {tournamentEnabled() && (
        <button
          type="button"
          onClick={() => void openTournamentSite()}
          disabled={busy}
          className="mx-auto flex items-center gap-2 text-sm font-semibold text-gray-500 underline hover:text-gray-700 disabled:opacity-60 dark:hover:text-gray-300"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          {busy ? t("Шилжиж байна…") : t("Тэмцээний сайт руу очих")}
        </button>
      )}
    </div>
  );
}
