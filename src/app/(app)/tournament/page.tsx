"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy } from "lucide-react";

import { apiFetch } from "@/lib/apiClient";
import { ErrorNote } from "@/components/tactiq/ui";
import { tournamentBaseUrl } from "@/lib/tactiq/tournament";
import { t } from "@/lib/i18n/t";

/**
 * ТЭМЦЭЭН РҮҮ ШИЛЖИХ ГҮҮР.
 *
 * Тэмцээний систем нь ТУСДАА серверт (`chess.daamal.org`) ажилладаг
 * (`lib/tactiq/tournament.ts`). Энэ хуудас нь нэг л зүйл хийнэ: богино
 * хугацааны тасалбар авч, хэрэглэгчийг тэр сайт руу аваачна — тэнд
 * дахин нэвтрэх шаардлагагүй.
 *
 * ⚠ Цэсний холбоос нь ШУУД `chess.daamal.org` руу заадаггүй, ЭНД ирдэг:
 * тасалбар нь зөвхөн нэвтэрсэн хүсэлтээс төрөх ёстой тул хөтчийг эхлээд
 * өөрийн серверээрээ дайруулна.
 *
 * ⚠ `replace` — `assign` биш: хэрэглэгч тэмцээнээс «буцах» товч дарахад
 * энэ завсрын хуудсанд буугаад ДАХИН тэмцээн рүү шидэгдэх нь дамжлагад
 * гацсан мэт мэдрэгдэнэ.
 */
export default function TournamentPage() {
  const [error, setError] = useState<string | null>(null);
  /** ⚠ React 18 dev дээр effect ХОЁР удаа ажилладаг — тасалбар дэмий үрэгдэнэ. */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const { url } = await apiFetch<{ url: string }>("/api/tournament/session", {
          method: "POST",
        });
        window.location.replace(url);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Тэмцээн рүү шилжиж чадсангүй."
        );
      }
    })();
  }, []);

  const base = tournamentBaseUrl();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-16 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15">
        <Trophy className="size-8" aria-hidden />
      </span>

      <h1 className="text-xl font-extrabold">{t("Тэмцээн")}</h1>

      {error ? (
        <>
          <ErrorNote message={error} />
          {/* Автомат шилжилт бүтэлгүйтсэн ч гараар үргэлжлүүлэх зам үлдээв */}
          {base && (
            <a
              className="text-sm font-bold text-brand-600 underline"
              href={base}
              rel="noreferrer"
            >
              {t("Тэмцээний сайт руу очих")}
            </a>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("Тэмцээний системд холбогдож байна…")}
        </p>
      )}
    </div>
  );
}
