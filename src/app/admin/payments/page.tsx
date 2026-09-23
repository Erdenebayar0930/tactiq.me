"use client";

import { useState } from "react";
import { Download } from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { MEMBERSHIP_TIERS, PLANS } from "@/lib/billing";

type Payment = {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  kind: string;
  planId: string;
  amountMnt: number;
  status: string;
  provider: string;
  days: number;
  promoCode: string | null;
  ebarimtType: string;
  registerNo: string;
  senderInvoiceNo: string;
  paidAt: string | null;
  createdAt: string;
};

type Subscriber = {
  uid: string;
  email: string;
  displayName: string;
  premiumUntil: string | null;
  familyUntil: string | null;
  tournamentTier: string | null;
  tournamentTierUntil: string | null;
  paidTotalMnt: number;
  paidCount: number;
  lastPaidAt: string | null;
  until: string | null;
  active: boolean;
};

type Payload = {
  summary: {
    paidCount: number;
    pendingCount: number;
    revenueMnt: number;
    monthRevenueMnt: number;
    payerCount: number;
    activeCount: number;
    expiringSoonCount: number;
    monthRegisteredCount: number;
  };
  byPlan: { kind: string; planId: string; count: number; amountMnt: number }[];
  payments: Payment[];
  paymentLimit: number;
  subscribers: Subscriber[];
};

type Tab = "payments" | "subscribers";
type StatusFilter = "all" | "paid" | "pending" | "canceled";
type SubscriberFilter = "all" | "paid" | "free" | "expired";

const DAY_MS = 24 * 60 * 60 * 1000;

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

/** Огноог Улаанбаатарын цагаар — админ хаанаас ч харсан ижил цаг гарна. */
const dateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("mn-MN", {
        timeZone: "Asia/Ulaanbaatar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const dateOnly = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("mn-MN", {
        timeZone: "Asia/Ulaanbaatar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "—";

/** Багцын нэр — `planId` нь төрлөөс хамаарч өөр жагсаалтаас уншигдана. */
function planLabel(kind: string, planId: string): string {
  if (kind === "tournament") return "Тэмцээний оролцоо";
  if (kind === "membership") {
    const tier = MEMBERSHIP_TIERS[planId as keyof typeof MEMBERSHIP_TIERS];
    return tier ? `Гишүүнчлэл · ${tier.label}` : planId;
  }
  return PLANS[planId as keyof typeof PLANS]?.label ?? planId;
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  paid: {
    text: "Төлсөн",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  pending: {
    text: "Хүлээгдэж буй",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  },
  canceled: {
    text: "Цуцлагдсан",
    className: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  },
};

/**
 * CSV татах — Excel-д кирилл зөв нээгдэхийн тулд BOM-той.
 *
 * ⚠ Утга бүрийг хашилтад авна: нэр, имэйлд таслал орж болно.
 */
function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const text = [header, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * ТӨЛБӨРИЙН ТАЙЛАН (зөвхөн админ) — QPay-ээр орсон төлбөрүүд, төлсөн
 * хэрэглэгчид, эрх хэзээ дуусах.
 *
 * ⚠ ЗӨВХӨН УНШИХ дэлгэц: төлбөрийн мөрийг энд засахгүй. Баримт нь
 * маргаан, тулгалтад хэрэгтэй тул өөрчлөгдөх ёсгүй (`payments` хүснэгтийн
 * тайлбарыг үзнэ үү).
 */
export default function AdminPaymentsPage() {
  const { data, error, loading, reload } = useApiData<Payload>("/api/admin/payments");
  const [tab, setTab] = useState<Tab>("payments");
  const [status, setStatus] = useState<StatusFilter>("paid");
  const [subscriberFilter, setSubscriberFilter] = useState<SubscriberFilter>("paid");
  const [query, setQuery] = useState("");

  const needle = query.trim().toLowerCase();
  const matches = (...values: (string | null)[]) =>
    !needle || values.some((value) => value?.toLowerCase().includes(needle));

  /* Жагсаалт нь хэдэн зуу л мөр тул render бүрд шүүхэд хангалттай хурдан. */
  const payments = (data?.payments ?? []).filter(
    (row) =>
      (status === "all" || row.status === status) &&
      matches(row.email, row.displayName, row.senderInvoiceNo, row.promoCode)
  );

  const subscribers = (data?.subscribers ?? []).filter((row) => {
    const kindOk =
      subscriberFilter === "all" ||
      (subscriberFilter === "paid" && row.active && row.paidCount > 0) ||
      (subscriberFilter === "free" && row.active && row.paidCount === 0) ||
      (subscriberFilter === "expired" && !row.active);
    return kindOk && matches(row.email, row.displayName);
  });

  const exportPayments = () =>
    downloadCsv(
      "tolbor.csv",
      ["Огноо", "Төлсөн", "Имэйл", "Нэр", "Багц", "Дүн (₮)", "Хоног", "Төлөв", "Суваг", "Код", "Баримт", "Регистр", "Дугаар"],
      payments.map((row) => [
        dateTime(row.createdAt),
        dateTime(row.paidAt),
        row.email ?? row.uid,
        row.displayName ?? "",
        planLabel(row.kind, row.planId),
        row.amountMnt,
        row.days,
        STATUS_LABEL[row.status]?.text ?? row.status,
        row.provider,
        row.promoCode ?? "",
        row.ebarimtType === "organization" ? "Байгууллага" : "Хувь хүн",
        row.registerNo,
        row.senderInvoiceNo,
      ])
    );

  const exportSubscribers = () =>
    downloadCsv(
      "gishuud.csv",
      ["Имэйл", "Нэр", "Дуусах", "Үлдсэн хоног", "Premium", "Гэр бүл", "Гишүүнчлэл", "Нийт төлсөн (₮)", "Төлбөрийн тоо", "Сүүлд төлсөн"],
      subscribers.map((row) => [
        row.email,
        row.displayName,
        dateOnly(row.until),
        daysLeft(row.until),
        dateOnly(row.premiumUntil),
        dateOnly(row.familyUntil),
        row.tournamentTier ? `${row.tournamentTier} · ${dateOnly(row.tournamentTierUntil)}` : "",
        row.paidTotalMnt,
        row.paidCount,
        dateTime(row.lastPaidAt),
      ])
    );

  return (
    <AdminShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Төлбөрийн тайлан</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            QPay-ээр орсон төлбөрүүд, төлсөн хэрэглэгчид ба эрх дуусах хугацаа.
          </p>
        </div>

        {error && <ErrorNote message={error} onRetry={() => void reload()} />}

        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          data && (
            <>
              <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Нийт орлого" value={money(data.summary.revenueMnt)} hint={`${data.summary.paidCount} төлбөр`} />
                <Stat label="Энэ сарын орлого" value={money(data.summary.monthRevenueMnt)} />
                <Stat
                  label="Идэвхтэй эрхтэй"
                  value={String(data.summary.activeCount)}
                  hint={`${data.summary.payerCount} хүн төлбөр төлсөн`}
                />
                <Stat
                  label="7 хоногт дуусна"
                  value={String(data.summary.expiringSoonCount)}
                  hint={`${data.summary.pendingCount} нэхэмжлэл хүлээгдэж буй`}
                  tone={data.summary.expiringSoonCount > 0 ? "warn" : undefined}
                />
              </section>

              {data.byPlan.length > 0 && (
                <section className="surface p-4">
                  <h2 className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Багцаар</h2>
                  <ul className="flex flex-wrap gap-2">
                    {data.byPlan.map((row) => (
                      <li
                        key={`${row.kind}:${row.planId}`}
                        className="rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-white/5"
                      >
                        <span className="font-semibold text-gray-800 dark:text-gray-100">
                          {planLabel(row.kind, row.planId)}
                        </span>{" "}
                        <span className="text-gray-500 dark:text-gray-400">
                          · <span className="num">{row.count}</span> · <span className="num">{money(row.amountMnt)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <TabButton active={tab === "payments"} onClick={() => setTab("payments")}>
                  Төлбөрүүд
                </TabButton>
                <TabButton active={tab === "subscribers"} onClick={() => setTab("subscribers")}>
                  Гишүүд ба хугацаа
                </TabButton>

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Имэйл, нэрээр хайх"
                  className="ml-auto w-full rounded-xl border border-gray-300 px-3 py-2 text-sm sm:w-64 dark:border-white/15 dark:bg-white/5 dark:text-white"
                />
              </div>

              {tab === "payments" ? (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {(["paid", "pending", "canceled", "all"] as const).map((value) => (
                      <Chip key={value} active={status === value} onClick={() => setStatus(value)}>
                        {value === "all" ? "Бүгд" : STATUS_LABEL[value].text}
                      </Chip>
                    ))}
                    <ExportButton onClick={exportPayments} disabled={payments.length === 0} />
                  </div>

                  {payments.length === 0 ? (
                    <Empty>Төлбөр олдсонгүй.</Empty>
                  ) : (
                    <div className="surface overflow-x-auto p-0">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
                          <tr>
                            <Th>Огноо</Th>
                            <Th>Хэрэглэгч</Th>
                            <Th>Багц</Th>
                            <Th className="text-right">Дүн</Th>
                            <Th>Төлөв</Th>
                            <Th>Суваг</Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {payments.map((row) => {
                            const label = STATUS_LABEL[row.status];
                            return (
                              <tr key={row.id}>
                                <Td>
                                  <span className="num whitespace-nowrap">{dateTime(row.paidAt ?? row.createdAt)}</span>
                                </Td>
                                <Td>
                                  <span className="block font-medium text-gray-900 dark:text-white">
                                    {row.displayName || "—"}
                                  </span>
                                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                                    {row.email ?? row.uid}
                                  </span>
                                </Td>
                                <Td>
                                  {planLabel(row.kind, row.planId)}
                                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                                    {row.days} хоног
                                    {row.promoCode ? ` · ${row.promoCode}` : ""}
                                  </span>
                                </Td>
                                <Td className="num whitespace-nowrap text-right font-bold">{money(row.amountMnt)}</Td>
                                <Td>
                                  <span
                                    className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${label?.className ?? ""}`}
                                  >
                                    {label?.text ?? row.status}
                                  </span>
                                </Td>
                                <Td className="text-xs uppercase text-gray-500 dark:text-gray-400">{row.provider}</Td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {data.payments.length >= data.paymentLimit && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Сүүлийн {data.paymentLimit} нэхэмжлэл харагдаж байна.
                    </p>
                  )}
                </section>
              ) : (
                <section className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip active={subscriberFilter === "paid"} onClick={() => setSubscriberFilter("paid")}>
                      Төлсөн, идэвхтэй
                    </Chip>
                    <Chip active={subscriberFilter === "free"} onClick={() => setSubscriberFilter("free")}>
                      Туршилт · урамшуулал
                    </Chip>
                    <Chip active={subscriberFilter === "expired"} onClick={() => setSubscriberFilter("expired")}>
                      Хугацаа дууссан
                    </Chip>
                    <Chip active={subscriberFilter === "all"} onClick={() => setSubscriberFilter("all")}>
                      Бүгд
                    </Chip>
                    <ExportButton onClick={exportSubscribers} disabled={subscribers.length === 0} />
                  </div>

                  {subscribers.length === 0 ? (
                    <Empty>Хэрэглэгч олдсонгүй.</Empty>
                  ) : (
                    <div className="surface overflow-x-auto p-0">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-white/5 dark:text-gray-400">
                          <tr>
                            <Th>Хэрэглэгч</Th>
                            <Th>Дуусах</Th>
                            <Th>Эрх</Th>
                            <Th className="text-right">Нийт төлсөн</Th>
                            <Th>Сүүлд төлсөн</Th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                          {subscribers.map((row) => (
                            <tr key={row.uid}>
                              <Td>
                                <span className="block font-medium text-gray-900 dark:text-white">
                                  {row.displayName || "—"}
                                </span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">{row.email}</span>
                              </Td>
                              <Td>
                                <span className="num block whitespace-nowrap">{dateOnly(row.until)}</span>
                                <DaysLeft until={row.until} />
                              </Td>
                              <Td className="text-xs text-gray-600 dark:text-gray-300">
                                {row.premiumUntil && <span className="block">Premium · {dateOnly(row.premiumUntil)}</span>}
                                {row.familyUntil && <span className="block">Гэр бүл · {dateOnly(row.familyUntil)}</span>}
                                {row.tournamentTier && (
                                  <span className="block">
                                    Гишүүнчлэл {MEMBERSHIP_TIERS[row.tournamentTier as keyof typeof MEMBERSHIP_TIERS]?.label ?? row.tournamentTier}{" "}
                                    · {dateOnly(row.tournamentTierUntil)}
                                  </span>
                                )}
                              </Td>
                              <Td className="num whitespace-nowrap text-right">
                                <span className="font-bold">{money(row.paidTotalMnt)}</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400">
                                  {row.paidCount > 0 ? `${row.paidCount} төлбөр` : "төлөөгүй"}
                                </span>
                              </Td>
                              <Td className="num whitespace-nowrap">{dateTime(row.lastPaidAt)}</Td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )
        )}
      </div>
    </AdminShell>
  );
}

/** Үлдсэн бүтэн хоног; дууссан бол сөрөг. */
function daysLeft(until: string | null): number | "" {
  if (!until) return "";
  return Math.ceil((new Date(until).getTime() - Date.now()) / DAY_MS);
}

function DaysLeft({ until }: { until: string | null }) {
  const days = daysLeft(until);
  if (days === "") return null;

  if (days <= 0) {
    return <span className="text-xs font-semibold text-rose-600 dark:text-rose-300">Дууссан</span>;
  }
  return (
    <span
      className={`text-xs font-semibold ${
        days <= 7 ? "text-amber-600 dark:text-amber-300" : "text-emerald-600 dark:text-emerald-300"
      }`}
    >
      {days} хоног үлдсэн
    </span>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn";
}) {
  return (
    <div className="surface p-4">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`num mt-1 text-2xl font-extrabold ${
          tone === "warn" ? "text-amber-600 dark:text-amber-300" : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
        active
          ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function ExportButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
    >
      <Download className="size-3.5" aria-hidden />
      Excel (CSV)
    </button>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-4 py-2.5 font-semibold ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="surface px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">{children}</p>;
}
