"use client";

import Link from "next/link";
import { Copy, Share2, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";

import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { BRAND_URL } from "@/lib/brand";
import { t } from "@/lib/i18n/t";

type PromoCode = {
  code: string;
  discountPercent: number;
  commissionPercent: number;
  active: boolean;
  note: string;
};

/**
 * Код тус бүрийн ОДООГИЙН нөхцөл (`lib/api/promo.ts`-ийн `PromoCodeState`).
 *
 * ⚠ Шаталсан кодод үндсэн хувь нь ХЭРЭГЖЭХГҮЙ байж болно — тиймээс
 * харагдацад ЭНЭ утгууд давамгайлна.
 */
type CodeState = {
  code: string;
  usedBuyers: number;
  discountPercent: number;
  commissionPercent: number;
  tierIndex: number | null;
  remaining: number | null;
};

type Stats = {
  codes: PromoCode[];
  states: Record<string, CodeState>;
  sales: number;
  revenueMnt: number;
  earnedMnt: number;
  paidOutMnt: number;
  balanceMnt: number;
};

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

/**
 * СУРТАЛЧЛАГЧИЙН САМБАР — өөрийн код, борлуулалт, олсон шимтгэл.
 *
 * ⚠ Цэсэнд нь ЗӨВХӨН код олгогдсон хүнд харагдана (профайлын жагсаалт).
 * Шууд хаягаар орсон кодгүй хүн «нээлттэй биш» гэсэн богино мессеж авна —
 * хөтөлбөрийг энд ЗАРЛАХГҮЙ, учир нь сурталчлагчдыг админ өөрөө сонгож
 * бүртгэдэг.
 *
 * ⚠ Тоонууд нь ЗӨВХӨН ТӨЛӨГДСӨН худалдан авалтаас (`api/promo/me`).
 * Хүлээгдэж буй нэхэмжлэл нь мөнгө биш — тэднийг оруулбал сурталчлагч
 * олоогүй мөнгөө хараад дараа нь тоо буурч, итгэл алдагдана.
 */
export default function PromoPage() {
  const { data, error, loading } = useApiData<Stats>("/api/promo/me");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (code: string) => {
    const link = `${BRAND_URL}/premium?code=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(code);
    } catch {
      // Хуучин хөтөч эсвэл зөвшөөрөлгүй — хэрэглэгч кодоо гараар хуулж
      // болно, тиймээс алдааг чимээгүй өнгөрөөнө.
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) return <ErrorNote message={error} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("Сурталчлагч")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("Таны кодоор худалдан авалт хийх бүрд танд шимтгэл ногдоно.")}</p>
      </div>

      {data.codes.length === 0 ? (
        /*
         * ⚠ ХӨТӨЛБӨРИЙГ ЭНД САНАЛ БОЛГОХГҮЙ. Урьд нь «сурталчлагч болохыг
         * хүсвэл админд хандаарай» гэсэн урилга байсан нь энэ хуудсыг
         * ХЭН Ч олж болох зар болгож байв. Сурталчлагчдыг админ ӨӨРӨӨ
         * сонгож бүртгэдэг тул хүсэлт цуглуулах суваг хэрэггүй.
         */
        <div className="surface space-y-3 p-5">
          <p className="font-bold text-gray-900 dark:text-white">{t("Энэ хэсэг танд нээлттэй биш байна")}</p>
          <Link href="/profile" className="btn-primary inline-block px-4 py-2 text-sm">{t("Профайл руу буцах")}</Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              Icon={TrendingUp}
              label={t("Худалдан авалт")}
              value={String(data.sales)}
              hint={`${money(data.revenueMnt)} борлуулалт`}
            />
            <StatCard Icon={Wallet} label={t("Нийт олсон")} value={money(data.earnedMnt)} />
            <StatCard
              Icon={Wallet}
              label={t("Үлдэгдэл")}
              value={money(data.balanceMnt)}
              hint={`${money(data.paidOutMnt)} олгогдсон`}
              accent
            />
          </div>

          <div className="space-y-3">
            {data.codes.map((code) => (
              <div key={code.code} className="surface space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-brand-50 px-3 py-1.5 font-mono text-lg font-extrabold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                    {code.code}
                  </span>

                  {code.active ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{t("Идэвхтэй")}</span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400">{t("Идэвхгүй")}</span>
                  )}
                </div>

                {/*
                  ⚠ ОДООГИЙН хувийг харуулна, кодын ҮНДСЭН хувийг БИШ:
                  шаталсан код дээр («эхний 50 хүүхэд 50%») тэр хоёр
                  ЗӨРНӨ. Сурталчлагч амлалт өгдөг хүн тул бодит,
                  тухайн мөчийн нөхцөлийг харах ёстой.
                */}
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t("Худалдан авагчид")}{" "}
                  <span className="font-bold">
                    {(data.states?.[code.code]?.discountPercent ?? code.discountPercent)}
                    {t("% хямдрал")}
                  </span>
                  , {t("танд")}{" "}
                  <span className="font-bold">
                    {(data.states?.[code.code]?.commissionPercent ?? code.commissionPercent)}
                    {t("% шимтгэл")}
                  </span>
                  .
                </p>

                {/*
                  ШАТНЫ ҮЛДЭГДЭЛ — «эхний 50» гэсэн нөхцөл хэр дүүрсэн.

                  ⚠ Шатгүй код дээр ОГТ гарахгүй: хязгааргүй нөхцөлийг
                  «үлдсэн …» гэж харуулбал худал болно.
                */}
                {data.states?.[code.code]?.tierIndex !== null &&
                  data.states?.[code.code] !== undefined && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                      {t("Шат")} {data.states[code.code].tierIndex} ·{" "}
                      {t("төлбөр баталгаажсан")} {data.states[code.code].usedBuyers}{" "}
                      {t("хүүхэд")}
                      {data.states[code.code].remaining !== null && (
                        <>
                          {" · "}
                          {t("энэ шатанд")} {data.states[code.code].remaining} {t("хүүхэд үлдсэн")}
                        </>
                      )}
                    </p>
                  )}

                <button
                  type="button"
                  onClick={() => void copy(code.code)}
                  className="flex items-center gap-2 rounded-xl border-2 border-brand-500 px-3 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
                >
                  {copied === code.code ? (
                    <>
                      <Copy className="size-4" aria-hidden />{t("Хуулагдлаа")}</>
                  ) : (
                    <>
                      <Share2 className="size-4" aria-hidden />{t("Холбоос хуулах")}</>
                  )}
                </button>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">{t("Шимтгэл нь ТӨЛӨГДСӨН худалдан авалтаас тооцогдоно. Үлдэгдлээ авахаар админд хандана уу.")}</p>
        </>
      )}
    </div>
  );
}

function StatCard({
  Icon,
  label,
  value,
  hint,
  accent,
}: {
  Icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`surface p-4 ${accent ? "ring-2 ring-brand-400 dark:ring-brand-500/50" : ""}`}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="num mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}
