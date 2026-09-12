"use client";

import { useState } from "react";

import AdminShell from "@/components/admin/AdminShell";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { apiFetch, ApiError } from "@/lib/apiClient";

type PromoCode = {
  code: string;
  ownerUid: string;
  ownerEmail: string | null;
  discountPercent: number;
  commissionPercent: number;
  active: boolean;
  note: string;
};

type OwnerStats = {
  sales: number;
  revenueMnt: number;
  earnedMnt: number;
  paidOutMnt: number;
  balanceMnt: number;
};

type Payload = {
  codes: PromoCode[];
  stats: Record<string, OwnerStats>;
  defaults: { discountPercent: number; commissionPercent: number };
};

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

/**
 * СУРТАЛЧЛАГЧИЙН КОДЫГ УДИРДАХ дэлгэц (зөвхөн админ).
 *
 * ⚠ Код үүсгэх нь ЗААВАЛ админаар дамжина: хэрэглэгч өөртөө код үүсгэдэг
 * байвал хоёр данс нээгээд хоорондоо хямдрал/шимтгэлээ солилцох замаар
 * мөнхийн 20% алдагдал үүсгэнэ (`lib/api/promo.ts` тайлбарыг үзнэ үү).
 *
 * ⚠ Олгосон төлбөрийг ЭНД гараар бүртгэнэ. Автомат шилжүүлэг байхгүй —
 * банкны интеграц нь тусдаа, илүү өндөр эрсдэлтэй ажил бөгөөд эхний
 * шатанд хэдэн арван сурталчлагчид гар бүртгэл хангалттай.
 */
export default function AdminPromoPage() {
  const { data, error, loading, reload } = useApiData<Payload>("/api/admin/promo");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await apiFetch("/api/admin/promo", {
        method: "POST",
        body: { email, code, note },
      });
      setEmail("");
      setCode("");
      setNote("");
      reload();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (row: PromoCode) => {
    try {
      await apiFetch("/api/admin/promo", {
        method: "PATCH",
        body: { code: row.code, active: !row.active },
      });
      reload();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    }
  };

  const payout = async (row: PromoCode, balance: number) => {
    const raw = window.prompt(
      `${row.ownerEmail ?? row.ownerUid} — олгосон дүнг оруулна уу (үлдэгдэл ${money(balance)}):`,
      String(balance)
    );
    if (raw === null) return;

    try {
      await apiFetch("/api/admin/promo", {
        method: "POST",
        body: {
          action: "payout",
          promoterUid: row.ownerUid,
          amountMnt: Number(raw),
          note: `${row.code} кодын шимтгэл`,
        },
      });
      reload();
    } catch (cause) {
      setFormError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    }
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        {(error || formError) && <ErrorNote message={formError ?? error!} />}

        <section className="surface space-y-3 p-5">
          <h2 className="font-bold text-gray-900 dark:text-white">Шинэ код олгох</h2>

          <div className="grid gap-2 sm:grid-cols-3">
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Эзний имэйл"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="КОД (жишээ: BAYAR10)"
              maxLength={24}
              className="rounded-xl border border-gray-300 px-3 py-2 font-mono text-sm uppercase dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Тайлбар (суваг, гэрээ…)"
              maxLength={200}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void create()}
              disabled={busy || !email.trim() || !code.trim()}
              className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
            >
              {busy ? "Түр хүлээнэ үү…" : "Код үүсгэх"}
            </button>

            {data && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Анхдагч: {data.defaults.discountPercent}% хямдрал /{" "}
                {data.defaults.commissionPercent}% шимтгэл
              </p>
            )}
          </div>
        </section>

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          data && (
            <section className="space-y-3">
              {data.codes.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Одоогоор код байхгүй байна.
                </p>
              ) : (
                data.codes.map((row) => {
                  const stats = data.stats[row.ownerUid];

                  return (
                    <div key={row.code} className="surface space-y-3 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-brand-50 px-2.5 py-1 font-mono font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                          {row.code}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {row.ownerEmail ?? row.ownerUid}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          −{row.discountPercent}% / +{row.commissionPercent}%
                        </span>
                        {!row.active && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-white/10">
                            Идэвхгүй
                          </span>
                        )}
                      </div>

                      {stats && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="num">{stats.sales}</span> худалдан авалт ·{" "}
                          борлуулалт <span className="num">{money(stats.revenueMnt)}</span> ·{" "}
                          олсон <span className="num">{money(stats.earnedMnt)}</span> ·{" "}
                          олгосон <span className="num">{money(stats.paidOutMnt)}</span> ·{" "}
                          <span className="font-bold">
                            үлдэгдэл <span className="num">{money(stats.balanceMnt)}</span>
                          </span>
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void toggle(row)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
                        >
                          {row.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
                        </button>

                        {stats && stats.balanceMnt > 0 && (
                          <button
                            type="button"
                            onClick={() => void payout(row, stats.balanceMnt)}
                            className="rounded-lg border-2 border-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
                          >
                            Төлбөр олгосон гэж бүртгэх
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          )
        )}
      </div>
    </AdminShell>
  );
}
