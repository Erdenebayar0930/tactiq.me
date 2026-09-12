"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, Medal, Trophy, Users } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { InvoiceCard } from "@/components/tactiq/QpayInvoice";
import { ErrorNote } from "@/components/tactiq/ui";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { MEMBERSHIP_TIERS } from "@/lib/billing";
import {
  OTHER_TOURNAMENT_CATEGORY,
  TOURNAMENT_CATEGORIES,
  tournamentCategoryLabel,
} from "@/lib/tactiq/tournament";
import { t } from "@/lib/i18n/t";

import type { QpayCheckout } from "@/components/tactiq/QpayInvoice";
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
  seats: number | null;
  registered: number;
  entryFeeMnt: number;
  isRegistered: boolean;
};

type ListResponse = {
  enabled: boolean;
  available: boolean;
  tournaments: Tournament[];
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

export function TournamentSection() {
  const { apply } = useUser();
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [payment, setPayment] = useState<QpayCheckout | null>(null);
  /** Сонгосон ангиллын таб — "all" эсвэл `TOURNAMENT_CATEGORIES`-ийн түлхүүр. */
  const [category, setCategory] = useState<string>("all");

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
   * АНГИЛЛЫН ТАБ. Бүх ангиллыг тэмцээнгүй байсан ч харуулна — «Kids 7–10
   * гэж бий» гэдгийг мэдэх нь өөрөө мэдээлэл. «Бусад» нь зөвхөн танигдаагүй
   * ангилалтай тэмцээн байвал л гарна.
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

  return (
    <section className="w-full space-y-3 text-left">
      <div className="flex w-full items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        {t("Тэмцээн")}
        <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
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
        <ul className="space-y-2">
          {visible.map((tournament) => {
            const startsAt = new Date(tournament.startsAt);
            const canEnter = startsAt.getTime() - Date.now() <= ENTER_WINDOW_MS;
            const full = tournament.seats !== null && tournament.registered >= tournament.seats;
            const free = tournament.entryFeeMnt === 0 || hasFreeLeft;
            const busy = busyId === tournament.id;

            return (
              <li key={tournament.id} className="surface flex flex-wrap items-center gap-3 p-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
                  <Trophy className="size-5" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-900 dark:text-white">{tournament.name}</p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {/* «Бүгд» табд аль ангиллынх болохыг харуулна */}
                    {category === "all" && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        {tournamentCategoryLabel(tournament.category)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="size-3.5" aria-hidden />
                      {startsAt.toLocaleString("mn-MN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {tournament.timeControl && <span>{tournament.timeControl}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden />
                      {tournament.registered}
                      {tournament.seats !== null && `/${tournament.seats}`}
                    </span>
                  </p>
                </div>

                {tournament.isRegistered ? (
                  canEnter ? (
                    <button
                      type="button"
                      onClick={() => void enter(tournament.id)}
                      disabled={busy}
                      className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
                    >
                      {busy ? t("Түр хүлээнэ үү…") : t("Тэмцээнд орох")}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      <Check className="size-3.5" aria-hidden />
                      {t("Бүртгэгдсэн")}
                    </span>
                  )
                ) : full ? (
                  <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400">
                    {t("Дүүрсэн")}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void register(tournament)}
                    disabled={busyId !== null}
                    className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                  >
                    {busy
                      ? t("Түр хүлээнэ үү…")
                      : free
                        ? t("Үнэгүй бүртгүүлэх")
                        : `${t("Бүртгүүлэх")} · ${money(tournament.entryFeeMnt)}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
