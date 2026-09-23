"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Medal, Trophy } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { InvoiceCard } from "@/components/tactiq/QpayInvoice";
import { ErrorNote } from "@/components/tactiq/ui";
import { apiFetch, ApiError } from "@/lib/apiClient";
import {
  activeMembershipTier,
  MEMBERSHIP_TIER_IDS,
  MEMBERSHIP_TIERS,
  tierRank,
} from "@/lib/billing";

import type { QpayCheckout } from "@/components/tactiq/QpayInvoice";
import type { MembershipTierId } from "@/lib/billing";
import { t } from "@/lib/i18n/t";

/**
 * ТЭМЦЭЭНИЙ ГИШҮҮНЧЛЭЛ — Bronze / Silver / Gold / Premium.
 *
 * ⚠ Хичээлийн Premium (`/premium`)-аас ТУСДАА худалдан авалт. Энэ нь зөвхөн
 * тэмцээнд үнэгүй оролцох сарын эрх өгнө.
 *
 * ⚠ Дүнг ЭНД тооцохгүй — нэхэмжлэлийн дүнг серверээс
 * (`/api/membership/checkout`) авч харуулна.
 */

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

const TIER_STYLES: Record<MembershipTierId, { badge: string; ring: string }> = {
  bronze: { badge: "from-orange-700 to-amber-500", ring: "ring-orange-300 dark:ring-orange-500/40" },
  silver: { badge: "from-slate-500 to-slate-300", ring: "ring-slate-300 dark:ring-slate-400/40" },
  gold: { badge: "from-amber-500 to-yellow-300", ring: "ring-amber-300 dark:ring-amber-400/40" },
  premium: { badge: "from-violet-600 to-fuchsia-400", ring: "ring-violet-400 dark:ring-violet-500/50" },
};

/**
 * ⚠ ЗӨВХӨН КОДОД ХЭРЭГЖСЭН эрхийг бичнэ — жагсаалт бол гэрээ
 * (`api/tournament/register`-ийн квотын шалгалт).
 */
function tierFeatures(tierId: MembershipTierId): string[] {
  const free = MEMBERSHIP_TIERS[tierId].freeEntriesPerMonth;
  return free === null
    ? ["Бүх тэмцээнд үнэгүй", "Оролцох төлбөргүй", `${MEMBERSHIP_TIERS[tierId].days} хоног`]
    : [
        `Сард ${free} тэмцээнд үнэгүй`,
        "Хэтэрвэл тэмцээн бүрт төлнө",
        `${MEMBERSHIP_TIERS[tierId].days} хоног`,
      ];
}

export default function MembershipPage() {
  const { user, apply } = useUser();
  const current = activeMembershipTier(user?.tournamentTier, user?.tournamentTierUntil);
  const until = current && user?.tournamentTierUntil ? new Date(user.tournamentTierUntil) : null;

  const [busyTier, setBusyTier] = useState<MembershipTierId | null>(null);
  const [checkout, setCheckout] = useState<QpayCheckout | null>(null);
  const [paid, setPaid] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = async (tierId: MembershipTierId) => {
    /*
     * ⚠ Ахиулахад доод түвшний үлдсэн хоног ШАТНА (`extendMembership`).
     * Мөнгө төлөхөөс ӨМНӨ ил хэлнэ — дараа нь мэдвэл маргаан болно.
     */
    if (
      current &&
      current !== tierId &&
      !window.confirm(
        `${MEMBERSHIP_TIERS[tierId].label} руу шилжвэл одоогийн ${MEMBERSHIP_TIERS[current].label} гишүүнчлэлийн үлдсэн хоног шатна. Үргэлжлүүлэх үү?`
      )
    ) {
      return;
    }

    setBusyTier(tierId);
    setError(null);
    setPaid(false);
    setFailed(null);
    try {
      setCheckout(
        await apiFetch<QpayCheckout>("/api/membership/checkout", {
          method: "POST",
          body: { tierId },
        })
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusyTier(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("Тэмцээний гишүүнчлэл")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("Гишүүн бол сар бүр тэмцээнд үнэгүй оролцоно. Гишүүнгүй бол тэмцээн бүрт төлнө.")}</p>
      </div>

      {current && until ? (
        <div className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${TIER_STYLES[current].badge}`}
          >
            <Medal className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold">
            Танд {MEMBERSHIP_TIERS[current].label} гишүүнчлэл идэвхтэй —{" "}
            {until.toLocaleDateString("mn-MN")} хүртэл. Ижил түвшнээ сунгавал үлдсэн хоног дээр
            нэмэгдэнэ.
          </p>
        </div>
      ) : null}

      {error && <ErrorNote message={error} />}

      {paid ? (
        <div className="surface flex flex-col items-center gap-3 p-8 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Check className="size-8" aria-hidden />
          </span>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("Гишүүнчлэл идэвхжлээ!")}</h2>
          <Link href="/play" className="btn-primary px-5 py-2.5 text-sm">{t("Тэмцээн үзэх")}</Link>
        </div>
      ) : failed ? (
        <div className="surface flex flex-col items-center gap-3 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("Төлбөр баталгаажсангүй")}</h2>
          <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{failed}</p>
          <button
            type="button"
            onClick={() => setFailed(null)}
            className="btn-primary px-5 py-2.5 text-sm"
          >{t("Дахин оролдох")}</button>
        </div>
      ) : checkout ? (
        <InvoiceCard
          checkout={checkout}
          onPaid={(updated) => {
            setCheckout(null);
            setPaid(true);
            if (updated) apply(updated);
          }}
          onCancel={() => setCheckout(null)}
          onFailed={(message) => {
            setCheckout(null);
            setFailed(message);
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MEMBERSHIP_TIER_IDS.map((tierId) => {
            const tier = MEMBERSHIP_TIERS[tierId];
            const isCurrent = current === tierId;
            const isDowngrade = !!current && tierRank(tierId) < tierRank(current);

            return (
              <div
                key={tierId}
                className={`surface flex h-full flex-col p-5 ${
                  isCurrent || tierId === "premium" ? `ring-2 ${TIER_STYLES[tierId].ring}` : ""
                }`}
              >
                <span
                  className={`grid size-11 place-items-center rounded-xl bg-gradient-to-br text-white ${TIER_STYLES[tierId].badge}`}
                >
                  {tierId === "premium" ? (
                    <Trophy className="size-5" aria-hidden />
                  ) : (
                    <Medal className="size-5" aria-hidden />
                  )}
                </span>

                <p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">{tier.label}</p>
                <p className="num mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  {money(tier.amountMnt)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t("сард")}</p>

                <ul className="mt-4 space-y-2 text-[13px] leading-snug text-gray-600 dark:text-gray-300">
                  {tierFeatures(tierId).map((line) => (
                    <li key={line} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => void buy(tierId)}
                  disabled={busyTier !== null || isDowngrade}
                  className="btn-primary mt-auto w-full px-4 py-2.5 text-sm disabled:opacity-50"
                  style={{ marginTop: "1.25rem" }}
                >
                  {busyTier === tierId
                    ? "Түр хүлээнэ үү…"
                    : isCurrent
                      ? "Сунгах"
                      : current
                        ? "Ахиулах"
                        : "Сонгох"}
                </button>
                {isDowngrade && (
                  <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">{t("Одоогийн гишүүнчлэл дууссаны дараа сонгоно.")}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
