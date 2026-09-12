"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, QrCode } from "lucide-react";

import { apiFetch } from "@/lib/apiClient";

import type { PublicUser } from "@/lib/api/publicUser";

/**
 * QPay нэхэмжлэлийн карт — QR, банкны холбоос, төлбөрийн poll.
 *
 * Premium, тэмцээний гишүүнчлэл, тэмцээний оролцох төлбөр гурвуулаа ИЖИЛ
 * `payments` хүснэгт, ИЖИЛ `/api/billing/status` poll ашигладаг тул нэг
 * компонент болгов.
 */

const POLL_INTERVAL_MS = 3000;
/** Хэдэн минутын дараа poll зогсоох вэ — QPay нэхэмжлэл мөнхийн биш. */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

export type QpayCheckout = {
  senderInvoiceNo: string;
  amountMnt: number;
  planLabel: string;
  qrText: string;
  qrImageBase64: string | null;
  bankLinks: { name: string; link: string }[];
  mock: boolean;
};

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

/**
 * QR ба банкны холбоос. Төлбөр төлөгдсөнийг СЕРВЕРЭЭС асууж мэднэ —
 * `/api/billing/status` нь QPay-ээс өөрөөс нь баталгаажуулдаг.
 */
export function InvoiceCard({
  checkout,
  onPaid,
  onCancel,
  onFailed,
}: {
  checkout: QpayCheckout;
  onPaid: (user: PublicUser | null) => void;
  onCancel: () => void;
  /**
   * Төлбөр БАТАЛГААЖААГҮЙ гэж эцэслэх.
   *
   * ⚠ Урьд нь энэ нь `onError` байсан — өөрөөр хэлбэл хугацаа дуусахад
   * улаан мессеж гарч, QR нь ХЭВЭЭР үлддэг байв. Хэрэглэгч тэр QR-ыг
   * уншуулаад «яагаад ажиллахгүй байна» гэж эргэлзэх эрсдэлтэй.
   * Одоо урсгал ИЛ амжилтгүйгээр төгсөнө.
   */
  onFailed: (message: string) => void;
}) {
  const [waited, setWaited] = useState(0);
  const [checking, setChecking] = useState(false);
  // `onPaid`/`onFailed` нь эцэг компонент дахин зурагдах бүрд ШИНЭ функц
  // болдог. Тэднийг effect-ийн хамаарлаас хассан ч хуучин хувилбарыг
  // дуудахгүйн тулд ref-т хадгална.
  const callbacks = useRef({ onPaid, onFailed });
  // ⚠ Ref-ийг ЗУРАГДАХ ҮЕД БИШ, effect дотор шинэчилнэ. Зурагдах үед ref
  // бичих нь React-ийн дүрэм зөрчих ба concurrent рендэрт хагас зурагдсан
  // мод дээр хуучин утга үлдэж болзошгүй.
  useEffect(() => {
    callbacks.current = { onPaid, onFailed };
  });

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled) return;

      try {
        const data = await apiFetch<{
          status: string;
          user: PublicUser | null;
          qpayConfigured?: boolean;
        }>(`/api/billing/status?no=${encodeURIComponent(checkout.senderInvoiceNo)}`);
        if (cancelled) return;

        if (data.status === "paid") {
          callbacks.current.onPaid(data.user);
          return;
        }

        /*
         * ⚠ QPay ОГТ тохируулаагүй сервер дээр төлбөр ХЭЗЭЭ Ч
         * баталгаажихгүй. 10 минут хүлээлгэх нь хэрэглэгчийг хуурах —
         * шууд амжилтгүй гэж хэлнэ.
         */
        if (data.qpayConfigured === false && !checkout.mock) {
          callbacks.current.onFailed(
            "Төлбөрийн систем тохируулаагүй байна. Түр хүлээгээд дахин оролдоно уу."
          );
          return;
        }
      } catch {
        // Нэг удаагийн сүлжээний алдаа — poll-ыг зогсоохгүй, дараагийн
        // тик дахин оролдоно. Хэрэглэгч банкны апп руу шилжсэн байх үед
        // алдаа харуулах нь дэмий түгшүүр төрүүлнэ.
      }

      const elapsed = Date.now() - startedAt;
      setWaited(elapsed);
      if (elapsed > POLL_TIMEOUT_MS) {
        callbacks.current.onFailed(
          "Төлбөр баталгаажаагүй тул нэхэмжлэлийн хугацаа дууслаа. " +
            "Хэрэв мөнгө хасагдсан бол банкны гүйлгээний утгыг хавсаргаж бидэнтэй холбогдоно уу."
        );
        return;
      }

      timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };

    let timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `checkout.mock` нь нэхэмжлэл бүрд ТОГТМОЛ (шинэ нэхэмжлэл =
    // шинэ `senderInvoiceNo`) тул хамаарлын жагсаалтад нэмэх нь effect-ийг
    // дахин ажиллуулахгүй — зөвхөн уншихад төвөгтэй болгоно.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout.senderInvoiceNo]);

  return (
    <div className="surface space-y-4 p-5 text-center">
      <div>
        <p className="font-bold text-gray-900 dark:text-white">{checkout.planLabel}</p>
        <p className="num mt-1 text-2xl font-extrabold text-gray-900 dark:text-white">
          {money(checkout.amountMnt)}
        </p>
      </div>

      {checkout.qrImageBase64 ? (
        /* QPay-ийн QR нь base64 PNG — `next/image` нь энэ хэлбэрт оновчлол
           хийж чадахгүй бөгөөд нэхэмжлэл бүрд өөр байдаг. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`data:image/png;base64,${checkout.qrImageBase64}`}
          alt="Төлбөрийн QR код"
          className="mx-auto size-56 rounded-xl bg-white p-2"
        />
      ) : (
        <div className="mx-auto flex size-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 p-4 dark:border-white/15">
          <QrCode className="size-10 text-gray-300" aria-hidden />
          <p className="break-all text-[10px] text-gray-400">{checkout.qrText}</p>
        </div>
      )}

      {checkout.mock && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          Туршилтын горим: QPay тохируулаагүй тул энэ QR ЖИНХЭНЭ БИШ бөгөөд
          төлбөр баталгаажихгүй. Локал турших бол
          <span className="font-mono"> QPAY_SANDBOX_AUTOPAY=true</span> тохируулна.
        </p>
      )}

      {checkout.bankLinks.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {checkout.bankLinks.map((bank) => (
            <a
              key={bank.name}
              href={bank.link}
              className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
            >
              {bank.name}
            </a>
          ))}
        </div>
      )}

      <p className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Төлбөрийг хүлээж байна… ({Math.floor(waited / 1000)}с)
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={async () => {
            if (checking) return;
            setChecking(true);
            try {
              const data = await apiFetch<{ status: string; user: PublicUser | null }>(
                `/api/billing/status?no=${encodeURIComponent(checkout.senderInvoiceNo)}`
              );
              if (data.status === "paid") callbacks.current.onPaid(data.user);
            } catch {
              // Түр зуурын алдаа — доорх автомат шалгалт үргэлжилнэ.
            } finally {
              setChecking(false);
            }
          }}
          disabled={checking}
          className="rounded-xl border-2 border-brand-500 px-4 py-2 text-sm font-semibold text-brand-600 disabled:opacity-50 dark:text-brand-300"
        >
          {checking ? "Шалгаж байна…" : "Төлбөрөө шалгах"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
        >
          Цуцлах
        </button>
      </div>
    </div>
  );
}
