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
  /**
   * ШАТАЛСАН ХУВЬ — «эхний 50 хүүхэд 50%, дараагийн 75 нь 25%».
   *
   * ⚠ `limit` нь ТУХАЙН ШАТНЫ хэмжээ, нийлбэр БИШ.
   */
  tiers: PromoTier[] | null;
  /** Нийт хэдэн худалдан авагч — `null` бол хязгааргүй. */
  maxUses: number | null;
  /** Төлбөрөө баталгаажуулсан өөр өөр худалдан авагч. */
  usedCount: number;
  active: boolean;
  note: string;
};

type PromoTier = { limit: number; discountPercent: number; commissionPercent: number };

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
  /*
   * ҮНДСЭН ХУВЬ ба НИЙТ ХЯЗГААР. Хоосон хувь = анхдагч (`data.defaults`),
   * хоосон хязгаар = хязгааргүй.
   */
  const [discount, setDiscount] = useState("");
  const [commission, setCommission] = useState("");
  const [maxUses, setMaxUses] = useState("");
  /** Засварлаж буй кодын утгууд — нэг удаад нэг л код. */
  const [editing, setEditing] = useState<{
    code: string;
    discount: string;
    commission: string;
    maxUses: string;
  } | null>(null);
  /**
   * ШАТУУД — хоосон бол үндсэн хувь ямагт хэрэгжинэ.
   *
   * ⚠ ЖАГСААЛТААР барина, нийлбэрээр БИШ: админ «эхний 50», «дараагийн
   * 75» гэж бодох нь бодит нөхцөлтэй ижил дараалалтай.
   */
  const [tiers, setTiers] = useState<PromoTier[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await apiFetch("/api/admin/promo", {
        method: "POST",
        body: {
          email,
          code,
          note,
          tiers: tiers.length > 0 ? tiers : null,
          discountPercent: Number(discount || data?.defaults.discountPercent),
          commissionPercent: Number(commission || data?.defaults.commissionPercent),
          maxUses: maxUses ? Number(maxUses) : null,
        },
      });
      setEmail("");
      setCode("");
      setNote("");
      setDiscount("");
      setCommission("");
      setMaxUses("");
      setTiers([]);
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

  const saveEdit = async () => {
    if (!editing) return;
    setFormError(null);
    try {
      await apiFetch("/api/admin/promo", {
        method: "PATCH",
        body: {
          code: editing.code,
          discountPercent: Number(editing.discount),
          commissionPercent: Number(editing.commission),
          maxUses: editing.maxUses ? Number(editing.maxUses) : null,
        },
      });
      setEditing(null);
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

          {/*
            ҮНДСЭН ХУВЬ ба НИЙТ ХЯЗГААР.

            ⚠ Хувь нь шат дүүрсний ДАРАА (эсвэл шатгүй бол ямагт)
            хэрэгжинэ. Хязгаар дүүрвэл код ОГТ ажиллахгүй болно —
            шатны хязгаараас ялгаатай.
          */}
          <div className="grid gap-2 sm:grid-cols-3">
            <NumberField
              label="Хямдрал %"
              value={discount}
              onChange={setDiscount}
              placeholder={String(data?.defaults.discountPercent ?? 10)}
              min={1}
              max={90}
            />
            <NumberField
              label="Шимтгэл %"
              value={commission}
              onChange={setCommission}
              placeholder={String(data?.defaults.commissionPercent ?? 10)}
              min={0}
              max={50}
            />
            <NumberField
              label="Хязгаар (хүн)"
              value={maxUses}
              onChange={setMaxUses}
              placeholder="Хязгааргүй"
              min={1}
            />
          </div>

          {/*
            ШАТАЛСАН ХУВЬ — сонгомол.

            ⚠ Хоосон бол код нь урьдын адил ямагт үндсэн хувиар
            ажиллана. Шат нэмбэл ЗӨВХӨН тэр хязгаарт л хэрэгжинэ:
            «эхний 50 хүүхэд 50%», дараа нь «75 хүүхэд 25%», шат
            дүүрвэл үндсэн хувь.

            ⚠ ТООЛОЛТ нь ТӨЛБӨРӨӨ БАТАЛГААЖУУЛСАН, ӨӨР ӨӨР хүүхдээр
            (`lib/api/promo.ts`) — нэхэмжлэл үүсгээд төлөөгүй нь
            тоологдохгүй.
          */}
          <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Шаталсан хувь (сонгомол) — шат дүүрвэл үндсэн хувь хэрэгжинэ
            </p>

            {tiers.map((tier, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-500 text-[11px] font-extrabold text-white">
                  {index + 1}
                </span>
                <label className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">хүүхэд</span>
                  <input
                    type="number"
                    min={1}
                    value={tier.limit}
                    onChange={(event) =>
                      setTiers(
                        tiers.map((row, i) =>
                          i === index ? { ...row, limit: Number(event.target.value) } : row
                        )
                      )
                    }
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">хямдрал %</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={tier.discountPercent}
                    onChange={(event) =>
                      setTiers(
                        tiers.map((row, i) =>
                          i === index
                            ? { ...row, discountPercent: Number(event.target.value) }
                            : row
                        )
                      )
                    }
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">шимтгэл %</span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={tier.commissionPercent}
                    onChange={(event) =>
                      setTiers(
                        tiers.map((row, i) =>
                          i === index
                            ? { ...row, commissionPercent: Number(event.target.value) }
                            : row
                        )
                      )
                    }
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setTiers(tiers.filter((_, i) => i !== index))}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  Устгах
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setTiers([
                  ...tiers,
                  {
                    limit: 50,
                    discountPercent: 50,
                    commissionPercent: data?.defaults.commissionPercent ?? 10,
                  },
                ])
              }
              className="rounded-xl bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-300 dark:bg-white/10 dark:text-gray-200"
            >
              Шат нэмэх
            </button>
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
                        {/*
                          ⚠ ШАТУУДЫГ ИЛ ХАРУУЛНА: тэдгээр нь үндсэн хувийг
                          ДАРДАГ тул зөвхөн «−10% / +10%» гэж харуулбал
                          админ бодит хямдралыг мэдэхгүй.
                        */}
                        {row.tiers?.map((tier, index) => (
                          <span
                            key={index}
                            className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                          >
                            {tier.limit} хүүхэд · −{tier.discountPercent}% / +
                            {tier.commissionPercent}%
                          </span>
                        ))}
                        {!row.active && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500 dark:bg-white/10">
                            Идэвхгүй
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            row.maxUses != null && row.usedCount >= row.maxUses
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                              : "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200"
                          }`}
                        >
                          {row.maxUses != null
                            ? `${row.usedCount} / ${row.maxUses} хүн${row.usedCount >= row.maxUses ? " · дүүрсэн" : ""}`
                            : `${row.usedCount} хүн · хязгааргүй`}
                        </span>
                      </div>

                      {editing?.code === row.code && (
                        <div className="grid items-end gap-2 rounded-xl bg-gray-50 p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto] dark:bg-white/5">
                          <NumberField
                            label="Хямдрал %"
                            value={editing.discount}
                            onChange={(value) => setEditing({ ...editing, discount: value })}
                            min={1}
                            max={90}
                          />
                          <NumberField
                            label="Шимтгэл %"
                            value={editing.commission}
                            onChange={(value) => setEditing({ ...editing, commission: value })}
                            min={0}
                            max={50}
                          />
                          <NumberField
                            label="Хязгаар (хүн)"
                            value={editing.maxUses}
                            onChange={(value) => setEditing({ ...editing, maxUses: value })}
                            placeholder="Хязгааргүй"
                            min={1}
                          />
                          <button
                            type="button"
                            onClick={() => void saveEdit()}
                            className="btn-primary px-4 py-2 text-xs"
                          >
                            Хадгалах
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
                          >
                            Болих
                          </button>
                        </div>
                      )}

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

                        <button
                          type="button"
                          onClick={() =>
                            setEditing({
                              code: row.code,
                              discount: String(row.discountPercent),
                              commission: String(row.commissionPercent),
                              maxUses: row.maxUses != null ? String(row.maxUses) : "",
                            })
                          }
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
                        >
                          Хувь, хязгаар засах
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

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5 dark:text-white"
      />
    </label>
  );
}
