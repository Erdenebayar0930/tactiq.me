"use client";

import Link from "next/link";
import { useState } from "react";
import { Bot, CalendarDays, ExternalLink, TrendingUp, Trophy, Users } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { GameRobot } from "@/components/tactiq/GameRobot";
import { RatingBoard } from "@/components/tactiq/RatingBoard";
import { TournamentSection } from "@/components/tactiq/TournamentSection";
import { ErrorNote } from "@/components/tactiq/ui";
import { ARENA_RULES, CHESS_RULES, DRAUGHTS_RULES } from "@/lib/tactiq/tournamentRules";
import { tournamentEnabled } from "@/lib/tactiq/tournament";
import { t } from "@/lib/i18n/t";

import type { LucideIcon } from "lucide-react";

/**
 * ТЭМЦЭЭНИЙ ХУУДАС — ДӨРВӨН ЦЭС.
 *
 *   Тэмцээнүүд    — хуваарь, бүртгэл, төлбөр (`TournamentSection`)
 *   Чансаа        — тоглолтын хүчний эрэмбэ (`RatingBoard`)
 *   Клубууд       — ХАРААХАН БАЙХГҮЙ (доорх тайлбарыг үзнэ үү)
 *   Дасгалжуулагч — дүрэм, бэлтгэл
 *
 * ⚠ ТАБ нь ХАЯГТ ХАДГАЛАГДАХГҮЙ (`useState`, query параметр БИШ):
 * `useSearchParams` нь хуудсыг статик рендерээс гаргаж Suspense хүрээ
 * шаарддаг (`learn/page.tsx`-ийн тайлбартай ижил шалтгаан). Таб нь
 * хуваалцах шаардлагатай хаяг БИШ — хэрэглэгч «чансаа» гэсэн холбоос
 * илгээх нь ховор.
 *
 * ⚠ Урьд нь энэ хуудас нь ЗӨВХӨН ГҮҮР байсан: нээгдмэгц тэмцээний сайт
 * руу АВТОМАТААР шиддэг байв. Тэр нь хоёр асуудалтай: (1) хэрэглэгч юу
 * болсныг ойлгохгүй, (2) ямар тэмцээн хэзээ болохыг аппаас харах арга
 * байхгүй. Одоо шилжилт нь зөвхөн ГАРААР.
 */

type TabKey = "tournaments" | "rating" | "clubs" | "coach";

const TABS: { key: TabKey; label: string; Icon: LucideIcon }[] = [
  { key: "tournaments", label: "Тэмцээнүүд", Icon: CalendarDays },
  { key: "rating", label: "Чансаа", Icon: TrendingUp },
  { key: "clubs", label: "Клубууд", Icon: Users },
  { key: "coach", label: "Дасгалжуулагч", Icon: Bot },
];

export default function TournamentPage() {
  const [tab, setTab] = useState<TabKey>("tournaments");

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15">
          <Trophy className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
            {t("Тэмцээн")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Хуваарь, чансаа, клуб, бэлтгэл.")}
          </p>
        </div>
      </div>

      {/*
        ⚠ ТАБ нь ХӨНДЛӨН ГҮЙДЭГ (`overflow-x-auto`): дөрвөн цэс нь
        «Дасгалжуулагч» гэсэн урт нэртэй бөгөөд 320px дэлгэцэнд
        багтахгүй. Шахаж жижигрүүлбэл хуруугаар онохоос хэцүү болно.
      */}
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label={t("Тэмцээний хэсгүүд")}
      >
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold ${
              tab === key
                ? "bg-amber-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {t(label)}
          </button>
        ))}
      </div>

      {/*
        ⚠ Таб бүр өөрийн агуулгыг ЗУРНА, нуухгүй (`hidden` БИШ): тэмцээний
        хэсэг нь API дуудлага хийдэг бөгөөд нуугдсан ч татагдсаар байвал
        дөрвөн таб нээгдэх бүрд дөрвөн хүсэлт явна.
      */}
      {tab === "tournaments" && <TournamentsTab />}
      {tab === "rating" && <RatingBoard />}
      {tab === "clubs" && <ClubsTab />}
      {tab === "coach" && <CoachTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ТЭМЦЭЭНҮҮД
// ---------------------------------------------------------------------------

function TournamentsTab() {
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
    <div className="space-y-4">
      {error && <ErrorNote message={error} />}

      {/*
        ⚠ `defaultOpen` — баннер хэлбэрээр БИШ, шууд дэлгэрэнгүйгээр:
        хэрэглэгч энэ табыг зориуд сонгосон. Баннер нь зөвхөн лоббид
        (`/play`) хэрэгтэй.
      */}
      {/*
        ⚠ `withRules={false}`: дүрэм нь «Дасгалжуулагч» табд байна. Хоёр
        газар зурвал ижил текст нэг хуудсанд хоёр удаа гарна.
      */}
      <TournamentSection defaultOpen withSponsors withRules={false} />

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

// ---------------------------------------------------------------------------
// КЛУБУУД
// ---------------------------------------------------------------------------

/**
 * ⚠ КЛУБЫН СИСТЕМ ХАРААХАН БАЙХГҮЙ. Энэ нь ЗОРИУДЫН цэвэр
 * танилцуулга — «тун удахгүй» гэсэн хоосон хуудас БИШ, харин юу
 * болохыг тодорхой хэлнэ.
 *
 * ⚠ ХУУРАМЧ ӨГӨГДӨЛ ХАРУУЛААГҮЙ (жишээ клуб, тоо): хүүхэд тэднийг
 * бодит гэж бодож дарах бөгөөд юу ч болохгүй. Хамгийн муу хувилбар нь
 * «ажиллаж байгаа мэт» харагдаад ажиллахгүй байх.
 *
 * Хэрэгжүүлэхэд шаардлагатай зүйлс (тооцоо):
 *   • `clubs`, `club_members` хүснэгт (эзэн, багш, сурагч)
 *   • Клубын тэмцээн — `tournaments.club_id` (одоогийн `access` шиг)
 *   • Клубын чансаа — гишүүдийн чансааны дундаж
 *   • Багшийн эрх: клуб үүсгэх, гишүүн хүлээн авах
 */
function ClubsTab() {
  const items = [
    { title: "Клуб үүсгэх", body: "Багш, сургууль өөрийн клубтай болж, сурагчдаа нэг дор харна." },
    { title: "Клубын тэмцээн", body: "Зөвхөн клубын гишүүдэд зориулсан хаалттай тэмцээн." },
    { title: "Клубын чансаа", body: "Клубууд хоорондоо гишүүдийн чансаагаар өрсөлдөнө." },
  ];

  return (
    <div className="space-y-3">
      <div className="surface flex items-center gap-4 p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-500/15">
          <Users className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">{t("Клубууд")}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Хараахан нээгдээгүй — бэлтгэж байна.")}
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.title} className="rounded-xl bg-gray-50 p-3 dark:bg-white/5">
            <p className="text-sm font-bold text-gray-900 dark:text-white">{t(item.title)}</p>
            <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">{t(item.body)}</p>
          </li>
        ))}
      </ul>

      {/*
        ⚠ ОДОО БАЙГАА зүйл рүү хөтөлнө: багш аль хэдийн сурагчдаа
        `/teacher` дээр харж чадна. «Тун удахгүй» гэж хэлээд хаях нь
        хэрэглэгчийг хоосон гараар үлдээнэ.
      */}
      <Link
        href="/teacher"
        className="block rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-100 dark:bg-sky-500/10 dark:text-sky-200"
      >
        {t("Багш бол «Миний сурагчид» хэсгээс одоо ч бүлгээ хөтөлж болно →")}
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ДАСГАЛЖУУЛАГЧ
// ---------------------------------------------------------------------------

/**
 * ⚠ ДҮРМИЙГ ЭНД ХАРУУЛНА, тэмцээний жагсаалтын доор БИШ: тэмцээнд
 * оролцохоос ӨМНӨ «арена гэж юу вэ, цуваа гэж юу вэ» гэдгийг мэдэх
 * ёстой. Урьд нь дүрэм нь жагсаалтын хамгийн доор эвхэгдсэн байсан тул
 * хэн ч уншдаггүй байв.
 */
function CoachTab() {
  return (
    <div className="space-y-4">
      <div className="surface flex items-center gap-4 p-4">
        <GameRobot game="chess" className="h-16 w-auto" />
        <div className="min-w-0">
          <p className="font-bold text-gray-900 dark:text-white">{t("Тэмцээний бэлтгэл")}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Дүрмийг уншиж, ботын эсрэг дадлагажаад тэмцээнд ор.")}
          </p>
        </div>
      </div>

      {/*
        ⚠ ДАДЛАГЫН холбоос нь ЛОББИ руу (`/play`), ботын хуудас руу БИШ:
        лобби нь курсээс хамаарч зөв тоглоомын ботыг санал болгодог
        (`lib/tactiq/courseNav.ts`).
      */}
      <Link
        href="/play"
        className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600"
      >
        <Bot className="size-4 shrink-0" aria-hidden />
        {t("Ботын эсрэг дадлагажих")}
      </Link>

      {[...ARENA_RULES, CHESS_RULES, DRAUGHTS_RULES].map((group) => (
        <details
          key={group.title}
          className="rounded-xl border border-gray-200 px-4 py-3 dark:border-white/10"
        >
          <summary className="cursor-pointer list-none text-sm font-bold text-gray-900 dark:text-white">
            {t(group.title)}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {group.items.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-xs leading-snug text-gray-600 dark:text-gray-300"
              >
                <span className="shrink-0 text-amber-500" aria-hidden>
                  •
                </span>
                {t(item)}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
