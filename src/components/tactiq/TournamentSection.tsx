"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, Medal, ScrollText, Trophy, Users } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { InvoiceCard } from "@/components/tactiq/QpayInvoice";
import { TournamentCalendar } from "@/components/tactiq/TournamentCalendar";
import { gameTheme } from "@/lib/tactiq/gameTheme";
import { parseTournamentFormat, tournamentTypeLabel } from "@/lib/tactiq/tournamentFormat";
import { mnDay, mnTime } from "@/lib/tactiq/dateMn";
import { ErrorNote } from "@/components/tactiq/ui";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { MEMBERSHIP_TIERS } from "@/lib/billing";
import {
  OTHER_TOURNAMENT_CATEGORY,
  TOURNAMENT_CATEGORIES,
  tournamentAccessLabel,
  tournamentCategoryLabel,
  parseTournamentAccess,
} from "@/lib/tactiq/tournament";
import {
  ARENA_RULES,
  CHESS_RULES,
  DRAUGHTS_RULES,
} from "@/lib/tactiq/tournamentRules";
import { t } from "@/lib/i18n/t";

import type { QpayCheckout } from "@/components/tactiq/QpayInvoice";
import type { CalendarItem } from "@/components/tactiq/TournamentCalendar";
import type { MembershipTierId } from "@/lib/billing";

/**
 * ТОГЛОХ ЦЭСНИЙ «ТЭМЦЭЭН» ХЭСЭГ.
 *
 * Тэмцээн өөрөө ТУСДАА серверт явагдана (`lib/tactiq/tournament.ts`). Энд
 * зөвхөн жагсаалт, бүртгэл, төлбөр — бүгд МАНАЙ API-гаар дамжина
 * (`/api/tournament/list`, `/api/tournament/register`). Эхлэхэд ойртмогц
 * «Тэмцээнд орох» нь нэг удаагийн тасалбараар тэмцээний сайт руу шилжүүлнэ.
 *
 * ⚠ Тэмцээний систем идэвхгүй бол ЮУ Ч зурахгүй — хоосон карт нь
 * «эвдэрсэн» мэт харагдана.
 */

type Tournament = {
  id: string;
  name: string;
  /** `TOURNAMENT_CATEGORIES`-ийн түлхүүр эсвэл "other" */
  category: string;
  startsAt: string;
  timeControl: string;
  /** Үргэлжлэх хугацаа (минут) — цагийн хуваарийн туузны урт. */
  durationMin: number;
  /** "chess" | "checkers" — хуваарь дээрх дүрс, өнгө. */
  game: string;
  /** "open" | "members" | "mind" — оролцох эрх (`tournamentAccessLabel`). */
  access: string;
  /** "arena" | "swiss" | "knockout" | "team" — хурд нь цагийн хяналтаас. */
  format: string;
  /**
   * ДАВТАМЖТАЙ (өдөр бүр автоматаар) эсэх.
   *
   * ⚠ Давтамжтайг сервер нь ЗӨВХӨН ТУХАЙН ӨДРӨӨР шүүдэг
   * (`/api/tournament/list`) — энд зөвхөн ШОШГОНД хэрэглэгдэнэ.
   */
  recurring: boolean;
  seats: number | null;
  registered: number;
  entryFeeMnt: number;
  isRegistered: boolean;
};

type ListResponse = {
  enabled: boolean;
  available: boolean;
  tournaments: Tournament[];
  /**
   * ХУАНЛИД зориулсан БҮТЭН төлөвлөгөө (14 хоног).
   *
   * ⚠ `tournaments`-аас ТУСДАА: тэр нь «ОДОО бүртгүүлж болох»
   * тэмцээнүүд. Давтамжтай тэмцээн зөвхөн тухайн өдрөө нээгддэг тул
   * хуанли нь түүнээс бусад өдөр хоосон болж, «тэмцээн байхгүй» гэсэн
   * худал мессеж өгнө.
   */
  upcoming: CalendarItem[];
  membership: {
    tier: MembershipTierId | null;
    until: string | null;
    freeEntriesPerMonth: number | null;
    freeEntriesUsed: number;
  };
};

type RegisterResponse = { status: "registered" } | { status: "payment"; checkout: QpayCheckout };

/** Эхлэхээс хэдэн минутын өмнө «Тэмцээнд орох» гарах вэ. */
const ENTER_WINDOW_MS = 10 * 60 * 1000;

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

export function TournamentSection({ defaultOpen = false }: { defaultOpen?: boolean } = {}) {
  const { apply } = useUser();
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payment, setPayment] = useState<QpayCheckout | null>(null);
  /** Сонгосон ангиллын таб — "all" эсвэл `TOURNAMENT_CATEGORIES`-ийн түлхүүр. */
  const [category, setCategory] = useState<string>("all");
  /**
   * Дэлгэрэнгүй нээгдсэн эсэх.
   *
   * ⚠ ХААЛТТАЙГААР эхэлнэ. Урьд нь бүтэн жагсаалт (гишүүнчлэлийн тууз,
   * ангиллын табууд, тэмцээн бүрийн карт) ҮРГЭЛЖ дэлгэгдсэн байсан тул
   * лоббийн доод хагасыг эзэлж, ботын түвшингүүд дэлгэцнээс гардаг байв.
   * Тэмцээн нь ХААЯА болох үйл явдал — өдөр тутам дардаг зүйл биш.
   */
  const [open, setOpen] = useState(defaultOpen);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<ListResponse>("/api/tournament/list"));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return error ? <ErrorNote message={error} onRetry={() => void load()} /> : null;
  if (!data.enabled) return null;

  const { membership } = data;
  const quota = membership.freeEntriesPerMonth;
  const hasFreeLeft = quota === null || membership.freeEntriesUsed < quota;

  /*
   * ТОГЛООМЫН ТӨРЛИЙН ТАБ (Шатар / Даам). Төрөл бүрийг тэмцээнгүй байсан ч
   * харуулна — «даамын тэмцээн ч болдог юм байна» гэдгийг мэдэх нь өөрөө
   * мэдээлэл. «Бусад» нь зөвхөн танигдаагүй төрөлтэй тэмцээн байвал л гарна.
   */
  const hasOther = data.tournaments.some(
    (tournament) => tournament.category === OTHER_TOURNAMENT_CATEGORY
  );
  const tabs = [
    { key: "all", label: t("Бүгд") },
    ...TOURNAMENT_CATEGORIES.map((item) => ({ key: item.key as string, label: item.label })),
    ...(hasOther ? [{ key: OTHER_TOURNAMENT_CATEGORY, label: t("Бусад") }] : []),
  ];
  const visible =
    category === "all"
      ? data.tournaments
      : data.tournaments.filter((tournament) => tournament.category === category);

  /*
   * ӨДРӨӨР БҮЛЭГЛЭНЭ — цаг цагаараа ДООШОО.
   *
   * ⚠ Урьд нь хөндлөн цагийн тэнхлэг (тууз) байсныг ХАСАВ: гар утсан
   * дээр тэр нь хажуу тийш гүйлгэх шаардлагатай байсан тул нэг зэрэг
   * ганц тэмцээн харагдаж, «маргааш юу байна» гэдгийг харахын тулд
   * хэдэн дэлгэц гүйлгэх хэрэгтэй болдог байв. Босоо жагсаалт нь
   * утасны байгалийн чиглэл.
   *
   * ⚠ Сервер аль хэдийн `startsAt`-аар эрэмбэлж өгдөг
   * (`/api/tournaments`) ч ЭНД ДАХИН эрэмбэлнэ: эрэмбэ алдагдвал нэг
   * өдөр хоёр тусдаа бүлэг болж хуваагдана.
   */
  const byDay = new Map<string, Tournament[]>();
  for (const tournament of [...visible].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  )) {
    const at = new Date(tournament.startsAt);
    const key = `${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`;
    const bucket = byDay.get(key);
    if (bucket) bucket.push(tournament);
    else byDay.set(key, [tournament]);
  }

  const register = async (tournament: Tournament) => {
    setBusyId(tournament.id);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch<RegisterResponse>("/api/tournament/register", {
        method: "POST",
        body: { tournamentId: tournament.id },
      });
      if (response.status === "payment") {
        setPayment(response.checkout);
      } else {
        setNotice(t("Тэмцээнд бүртгэгдлээ!"));
        await load();
      }
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
    } finally {
      setBusyId(null);
    }
  };

  const enter = async (tournamentId: string) => {
    setBusyId(tournamentId);
    setError(null);
    try {
      const { url } = await apiFetch<{ url: string }>("/api/tournament/session", {
        method: "POST",
      });
      window.location.href = url;
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
      setBusyId(null);
    }
  };

  /** Удахгүй болох тэмцээний тоо — баннер дээр харуулна. */
  const upcoming = data.tournaments.length;

  /*
   * ⚠ Тэмцээний ХУУДАС дээр баннер хэрэггүй: хэрэглэгч аль хэдийн тэр
   * хуудсыг зориуд нээсэн. Баннер нь зөвхөн ЛОББИД (`/play`) хэрэгтэй.
   */
  if (!open) {
    return (
      /*
       * БАННЕР — нэг мөр: дүрс, мессеж, товч.
       *
       * ⚠ ЭНЭ НЬ ЗӨВХӨН ХАРАГДАЦЫН ХУРААНГУЙ: дарахад ижил компонент
       * дэлгэрэнгүйгээ нээнэ (шинэ хуудас БИШ). Тусдаа хуудас болговол
       * бүртгэл, төлбөрийн урсгал (`InvoiceCard`) хоёр газар бичигдэнэ.
       */
      <section className="w-full text-left">
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-3 shadow-sm">
          <Trophy className="size-7 shrink-0 text-white" aria-hidden />

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight text-white">
              {t("Чансаа тогтоох тэмцээн зохион байгуулж байна")}
            </p>
            {/*
              ⚠ Тоо нь ХООСОН байж болно (сервер холбогдоогүй, эсвэл
              товлогдоогүй) — тэр үед мөрийг огт гаргахгүй, «0 тэмцээн»
              гэж бичих нь урилгыг үгүйсгэнэ.
            */}
            {upcoming > 0 && (
              <p className="text-xs text-white/85">
                {upcoming} {t("тэмцээн товлогдсон")}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50"
          >
            {t("Тэмцээнд оролцох")}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full space-y-3 text-left">
      <div className="flex w-full items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        {t("Тэмцээн")}
        <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        {/* ⚠ Хаах товч: нээсэн хүн буцаад нягт харагдацдаа орж чадах ёстой. */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 font-semibold text-gray-400 underline hover:text-gray-600 dark:hover:text-gray-200"
        >
          {t("Хаах")}
        </button>
      </div>

      {/* Гишүүнчлэлийн төлөв — квот хэд үлдсэнийг бүртгүүлэхээс ӨМНӨ харуулна */}
      <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
        <Medal className="size-5 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          {membership.tier ? (
            <>
              <span className="font-bold">{MEMBERSHIP_TIERS[membership.tier].label}</span>
              {" · "}
              {quota === null
                ? t("бүх тэмцээнд үнэгүй")
                : `${t("энэ сард үнэгүй")} ${Math.max(0, quota - membership.freeEntriesUsed)}/${quota}`}
            </>
          ) : (
            t("Гишүүн бол сар бүр тэмцээнд үнэгүй оролцоно.")
          )}
        </p>
        <Link
          href="/membership"
          className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
        >
          {membership.tier ? t("Ахиулах") : t("Гишүүн болох")}
        </Link>
      </div>

      {error && <ErrorNote message={error} />}
      {notice && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {notice}
        </p>
      )}

      {/*
        САРЫН ХУАНЛИ — жагсаалтын ӨМНӨ.
        ⚠ Жагсаалт нь «ОДОО юу байна», хуанли нь «ЭНЭ САРД ямар өдрүүдэд
        байна» гэдгийг хэлнэ. Хоёр өөр асуулт тул хоёр өөр харагдац.
      */}
      {!payment && data.available && (data.upcoming?.length ?? 0) > 0 && (
        <TournamentCalendar items={data.upcoming} />
      )}

      {!payment && data.available && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={category === tab.key}
              onClick={() => setCategory(tab.key)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold ${
                category === tab.key
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {payment ? (
        <InvoiceCard
          checkout={payment}
          onPaid={(updated) => {
            setPayment(null);
            if (updated) apply(updated);
            setNotice(t("Төлбөр төлөгдөж, тэмцээнд бүртгэгдлээ!"));
            void load();
          }}
          onCancel={() => setPayment(null)}
          onFailed={(message) => {
            setPayment(null);
            setError(message);
          }}
        />
      ) : !data.available ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {t("Тэмцээний сервертэй түр холбогдож чадсангүй.")}
        </p>
      ) : visible.length === 0 ? (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          {category === "all"
            ? t("Удахгүй болох тэмцээн алга.")
            : t("Энэ ангилалд удахгүй болох тэмцээн алга.")}
        </p>
      ) : (
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, rows]) => (
            <div key={day} className="space-y-2">
              {/*
                ⚠ ӨДРИЙН ТОЛГОЙ наалдамхай (`sticky`): урт жагсаалт
                гүйлгэхэд «энэ мөрүүд аль өдрийнх вэ» гэдэг нь дэлгэцнээс
                гарч алга болдог байв.
              */}
              <p className="sticky top-0 z-10 bg-white py-1 text-xs font-bold text-gray-500 dark:bg-gray-950 dark:text-gray-400">
                {mnDay(new Date(rows[0].startsAt))}
              </p>

              <ul className="space-y-2">
                {rows.map((tournament) => {
                const startsAt = new Date(tournament.startsAt);
                const canEnter = startsAt.getTime() - Date.now() <= ENTER_WINDOW_MS;
                const full = tournament.seats !== null && tournament.registered >= tournament.seats;
                const access = parseTournamentAccess(tournament.access);
                const accessLabel = tournamentAccessLabel(access);
                /*
                 * ⚠ ГИШҮҮДИЙН тэмцээн нь гишүүнд ҮРГЭЛЖ үнэгүй (сарын квот
                 * зарцуулахгүй) — `lib/api/tournamentAccess.ts`. Тиймээс
                 * товчны бичвэр нь квотаас хамаарахгүй.
                 */
                const free =
                  tournament.entryFeeMnt === 0 ||
                  ((access === "members" || access === "mind-members") &&
                    membership.tier !== null) ||
                  hasFreeLeft;
                const busy = busyId === tournament.id;

                return (
                  <li
                    key={tournament.id}
                    /*
                      ⚠ ГАР УТСАН ДЭЭР БАГАНА, ширээн дээр МӨР
                      (`flex-col sm:flex-row`).

                      Урьд нь бүх зүйл (цаг, дүрс, нэр, шошгууд, товч) НЭГ
                      мөрөнд `flex-wrap`-аар байсан. 390px дэлгэцэнд тэр нь
                      нэрийг «Оюун…» болтол хумьж, шошгуудыг дараалуулан
                      доош унагаж, товч нь мөрийн хагасыг эзэлж байв.

                      ⚠ ЗҮҮН ЗАХЫН ӨНГӨТ ЗУРВАС: мөрүүд нягт байдаг тул
                      хаанаас хаа хүртэл нэг тэмцээн болохыг өнгө тусгаарлана.
                    */
                    className={`surface flex flex-col gap-2 border-l-4 p-3 sm:flex-row sm:items-center sm:gap-3 ${
                      gameTheme(tournament.game).border
                    }`}
                  >
                    {/*
                      ДЭЭД ХЭСЭГ — цаг, дүрс, нэр. Гар утсан дээр ч энэ гурав
                      НЭГ мөрөнд зэрэгцэнэ: цаг нь хамгийн чухал бөгөөд нэртэй
                      нь хамт уншигдах ёстой.
                    */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/*
                        ⚠ ЦАГ нь ТОГТМОЛ ӨРГӨНТЭЙ (`w-12`): мөрүүд цагийн
                        БАГАНА үүсгэж, «цаг цагаараа доошоо» уншигдана.
                      */}
                      <span className="num w-12 shrink-0 text-base font-extrabold tabular-nums text-gray-900 dark:text-white">
                        {mnTime(startsAt)}
                      </span>

                      <span
                        className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                          gameTheme(tournament.game).tile
                        }`}
                      >
                        {/* ⚠ Тоглоомын дүрс — цомын дүрс БИШ: цом нь бүх
                            тэмцээнд ижил тул юу ч ялгадаггүй. */}
                        {(() => {
                          const Icon = gameTheme(tournament.game).Icon;
                          return <Icon className="size-5" aria-hidden />;
                        })()}
                      </span>

                      <div className="min-w-0 flex-1">
                        {/*
                          ⚠ `truncate` ХЭВЭЭР ч одоо нэрэнд БҮТЭН мөр
                          хүрэлцэнэ — шошгууд доош гарсан тул «Оюун…» болж
                          хумигдахаа больсон.
                        */}
                        <p className="truncate font-bold text-gray-900 dark:text-white">
                          {tournament.name}
                        </p>

                        {/*
                          ХЭЛБЭР ба ХУРД — нэрийн доор, НЭГ мөрөнд.

                          ⚠ Хурд нь ЦАГИЙН ХЯНАЛТААС тооцогдоно
                          (`lib/tactiq/tournamentFormat.ts`): хадгалбал админ
                          «Bullet» гэж сонгоод «30+0» бичих боломжтой болж,
                          хоёр нь үүрд зөрнө.
                        */}
                        <p className="truncate text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {tournamentTypeLabel(
                            parseTournamentFormat(tournament.format),
                            tournament.timeControl
                          )}
                        </p>
                      </div>
                    </div>

                    {/*
                      ШОШГО ба ТООНУУД — гар утсан дээр өөрийн мөрөнд, цагийн
                      баганатай тэгшилж (`pl-15`).

                      ⚠ Цагийн багана нь 48px + 12px зай = 60px; шошгуудыг
                      тэр хэмжээгээр шахах нь тэднийг «нэрийн доорх мэдээлэл»
                      болгож харуулна — зүүн захаас эхлүүлбэл тусдаа блок шиг
                      харагдана.
                    */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pl-15 sm:pl-0">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          gameTheme(tournament.game).chip
                        }`}
                      >
                        {gameTheme(tournament.game).label}
                      </span>

                      {/*
                        ⚠ «Өдөр бүр» ШОШГО: давтамжтай тэмцээн зөвхөн
                        тухайн өдрөө харагддаг тул сурагч «яагаад
                        маргаашийнх нь харагдахгүй байна» гэж бодох
                        эрсдэлтэй. Шошго нь «энэ нь маргааш ч байна»
                        гэдгийг хэлнэ.
                      */}
                      {tournament.recurring && (
                        <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-500/20 dark:text-sky-200">
                          {t("Өдөр бүр")}
                        </span>
                      )}

                      {accessLabel && (
                        <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                          {accessLabel}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                        {tournament.durationMin} {t("мин")}
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Users className="size-3.5 shrink-0" aria-hidden />
                        {tournament.registered}
                        {tournament.seats !== null && `/${tournament.seats}`}
                      </span>
                    </div>

                    {/*
                      ТОВЧ — гар утсан дээр БҮТЭН ӨРГӨН, ширээн дээр өөрийн
                      хэмжээгээр. Нарийн дэлгэцэнд жижиг товч нь хуруугаар
                      онохоос хэцүү бөгөөд нэрний зайг булаадаг.
                    */}
                    <div className="shrink-0 sm:ml-auto">
                      {tournament.isRegistered ? (
                        canEnter ? (
                          <button
                            type="button"
                            onClick={() => void enter(tournament.id)}
                            disabled={busy}
                            className="w-full rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 sm:w-auto"
                          >
                            {busy ? t("Түр хүлээнэ үү…") : t("Тэмцээнд орох")}
                          </button>
                        ) : (
                          <span className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:w-auto dark:bg-emerald-500/15 dark:text-emerald-300">
                            <Check className="size-3.5" aria-hidden />
                            {t("Бүртгэгдсэн")}
                          </span>
                        )
                      ) : full ? (
                        <span className="inline-flex w-full justify-center rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500 sm:w-auto dark:bg-white/10 dark:text-gray-400">
                          {t("Дүүрсэн")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void register(tournament)}
                          disabled={busyId !== null}
                          className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60 sm:w-auto"
                        >
                          {busy
                            ? t("Түр хүлээнэ үү…")
                            : free
                              ? t("Үнэгүй бүртгүүлэх")
                              : `${t("Бүртгүүлэх")} · ${money(tournament.entryFeeMnt)}`}
                        </button>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <TournamentRules />
    </section>
  );
}

/**
 * ТЭМЦЭЭНИЙ ДҮРЭМ — эвхэгддэг хэсэг.
 *
 * ⚠ ЭВХЭЭСТЭЙ (`<details>`), зориуд: дүрэм нь урт бөгөөд давтан
 * оролцогчид үүнийг мэднэ. Задгай харуулбал тэмцээний ЖАГСААЛТ (гол
 * зүйл) доош түлхэгдэнэ.
 *
 * ⚠ `<details>` нь JavaScript-гүй ажилладаг уугуул элемент —
 * товшилт, гар, дэлгэц уншигч бүгд автоматаар ажиллана. Өөрсдөө
 * `useState`-ээр хийвэл `aria-expanded`, товчлуурын дүрмийг гараар
 * зөв бичих шаардлагатай болно.
 *
 * ⚠ БҮХ дүрэм нэг дор: тоглогч шатар, даам хоёуланд оролцож болно.
 * Ангиллаар нь нуувал «нөгөө тоглоомын дүрэм хаана байна?» гэсэн
 * асуулт үүснэ.
 */
function TournamentRules() {
  return (
    <details className="rounded-xl border border-gray-200 px-4 py-3 dark:border-white/10">
      <summary className="cursor-pointer list-none text-sm font-bold text-gray-900 dark:text-white">
        <span className="inline-flex items-center gap-2">
          <ScrollText className="size-4 shrink-0 text-amber-500" aria-hidden />
          {t("Тэмцээний дүрэм")}
        </span>
      </summary>

      <div className="mt-3 space-y-4">
        {[...ARENA_RULES, CHESS_RULES, DRAUGHTS_RULES].map((group) => (
          <div key={group.title}>
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              {group.title}
            </p>
            <ul className="mt-1 space-y-1">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300"
                >
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-gray-300 dark:bg-white/25" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
