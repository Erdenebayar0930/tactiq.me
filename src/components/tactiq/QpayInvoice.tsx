"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Landmark, Loader2, QrCode } from "lucide-react";

import { apiFetch } from "@/lib/apiClient";
import { BANK_ACCOUNTS } from "@/lib/tactiq/bankAccounts";

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
  bankLinks: { name: string; link: string; logo?: string | null; description?: string | null }[];
  mock: boolean;
};

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

/**
 * Хуулах товч.
 *
 * ⚠ Дансны дугаар, гүйлгээний утгыг ГАРААР бичүүлэх нь алдааны эх
 * үүсвэр: нэг цифр зөрвөл мөнгө хаашаа ч явж болно, утга буруу бол
 * гүйлгээг хэний болохыг тогтоох аргагүй.
 *
 * ⚠ `navigator.clipboard` нь HTTPS (эсвэл localhost) дээр л ажилладаг
 * бөгөөд хэрэглэгч зөвшөөрөл өгөөгүй бол уначина — тиймээс алдааг нь
 * залгиж, бичвэрийг нь дэлгэц дээр ИЛ үлдээнэ (гараар сонгож болно).
 */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Хуулж чадсангүй — утга нь дэлгэц дээр харагдсаар байна.
        }
      }}
      aria-label={`${label} хуулах`}
      className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
    >
      {copied ? (
        <Check className="size-4 text-emerald-500" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
    </button>
  );
}

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

      {checkout.mock && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          Туршилтын горим: QPay тохируулаагүй тул энэ QR ЖИНХЭНЭ БИШ бөгөөд
          төлбөр баталгаажихгүй. Локал турших бол
          <span className="font-mono"> QPAY_SANDBOX_AUTOPAY=true</span> тохируулна.
        </p>
      )}

      {/*
        ХОЁР БАГАНА — зүүнд QR, баруунд банкны аппууд.

        ⚠ Гар утсан дээр QR-ыг УНШИХ БОЛОМЖГҮЙ (өөрийн дэлгэцээ зураг авч
        чадахгүй) тул тэнд банкны аппын холбоос нь ЦОРЫН ГАНЦ зам. Харин
        компьютер дээр эсрэгээрээ: QR л ажиллана. Тиймээс хоёуланг нь
        зэрэг үзүүлж, нарийн дэлгэцэн дээр QR нь дээр, банкууд доор нь
        давхарлана.
      */}
      <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
        <div className="space-y-2">
          {checkout.qrImageBase64 ? (
            /* QPay-ийн QR нь base64 PNG — `next/image` нь энэ хэлбэрт оновчлол
               хийж чадахгүй бөгөөд нэхэмжлэл бүрд өөр байдаг. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`data:image/png;base64,${checkout.qrImageBase64}`}
              alt="Төлбөрийн QR код"
              className="mx-auto size-52 rounded-xl bg-white p-2"
            />
          ) : (
            <div className="mx-auto flex size-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 p-4 dark:border-white/15">
              <QrCode className="size-10 text-gray-300" aria-hidden />
              <p className="break-all text-[10px] text-gray-400">{checkout.qrText}</p>
            </div>
          )}
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">QPay төлөх</p>
        </div>

        <div className="text-left">
          <p className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Банкаар төлөх</p>

          {/*
            ⚠ Жагсаалт ХООСОН байхыг ЧИМЭЭГҮЙ нуухгүй. QPay тохируулаагүй
            (`mock`) үед банкны холбоос ОГТ ирдэггүй тул баганыг нь бүрмөсөн
            алга болгочихвол «төлбөрийн хэсэг харагдахгүй байна» гэсэн
            ойлгомжгүй байдал үүснэ. Оронд нь шалтгааныг нь хэлнэ.
          */}
          {checkout.bankLinks.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-300 p-3 text-xs text-gray-500 dark:border-white/15 dark:text-gray-400">
              {checkout.mock
                ? "QPay тохируулаагүй тул банкны жагсаалт ирэхгүй. `QPAY_CLIENT_ID`, `QPAY_CLIENT_SECRET`, `QPAY_INVOICE_CODE`-ыг тохируулна уу."
                : "Банкны жагсаалт ирсэнгүй. QR кодыг банкныхаа аппаар уншуулна уу."}
            </p>
          )}

          {/*
            ⚠ Жагсаалт нь 15-20 банктай тул ӨНДРИЙГ ХЯЗГААРЛАНА: эс бөгөөс
            «Төлбөр шалгах» товч дэлгэцээс доош гарч, хэрэглэгч төлсний
            дараа юу дарахаа олохгүй болно.
          */}
          {checkout.bankLinks.length > 0 && (
            <ul className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto pr-1">
              {checkout.bankLinks.map((bank) => (
                <li key={bank.name}>
                  {/*
                    ⚠ ЭНГИЙН `<a>` байх ЁСТОЙ, `next/link` БИШ: холбоос нь
                    `qpaywallet://`, `khanbank://` гэх мэт АППЫН схем тул
                    router түүнийг замаар нь тайлбарлаж чадахгүй.

                    ⚠ `target="_blank"` ч тавихгүй: шинэ таб нээгээд тэр нь
                    хоосон үлдэж, хэрэглэгч буцах товчоо хайна. Апп руу
                    үсрэхэд одоогийн таб байрандаа үлдэх нь зөв.

                    ⚠ Эдгээр холбоос нь ГАР УТСАН дээр, тухайн банкны апп
                    суусан үед л ажиллана. Компьютер дээр юу ч болохгүй —
                    тэнд QR нь зориулалтын зам.
                  */}
                  <a
                    href={bank.link}
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 rounded-xl p-2 text-center hover:bg-gray-100 dark:hover:bg-white/5"
                  >
                    {bank.logo ? (
                      /* Тэмдгийг МАНАЙ домэйнөөр дамжуулна (`/api/qpay-logo`):
                         гуравдагч домэйн нь CSP, service worker хоёуланд нь
                         саад болдог. `next/image` БИШ — хаяг нь нэхэмжлэл
                         бүрд өөр тул оновчлох боломжгүй. */
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/qpay-logo?url=${encodeURIComponent(bank.logo)}`}
                        alt=""
                        aria-hidden
                        className="size-10 rounded-lg"
                      />
                    ) : (
                      <span className="grid size-10 place-items-center rounded-lg bg-gray-100 text-gray-400 dark:bg-white/10">
                        <Landmark className="size-5" aria-hidden />
                      </span>
                    )}
                    {/*
                      ⚠ `description` нь МОНГОЛ нэр («qPay хэтэвч»), `name` нь
                      англи («qPay wallet»). Хэрэглэгч өөрийн банкаа монгол
                      нэрээр нь хайдаг тул байвал түүнийг харуулна.
                    */}
                    <span className="text-[10px] font-semibold leading-tight text-gray-700 dark:text-gray-200">
                      {bank.description || bank.name}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/*
        ДАНСААР ШИЛЖҮҮЛЭХ — QPay ашиглахгүй хүнд зориулсан нөөц зам.

        ⚠ Данс бүртгээгүй бол хэсэг нь ОГТ гарахгүй (`bankAccounts.ts`).

        ⚠ Энэ зам АВТОМАТААР баталгаажихгүй: QPay нь webhook-оор
        мэдэгддэг тул шууд идэвхждэг, гар шилжүүлгийг харин хүн хянах
        ёстой. Үүнийг ил хэлэхгүй бол хэрэглэгч төлчихөөд хүлээнэ.
      */}
      {BANK_ACCOUNTS.length > 0 && (
        <div className="rounded-xl border border-gray-200 p-4 text-left dark:border-white/10">
          <p className="text-sm font-bold text-gray-900 dark:text-white">Дансаар шилжүүлэх</p>

          <ul className="mt-2 space-y-2">
            {BANK_ACCOUNTS.map((account) => (
              <li
                key={`${account.bank}:${account.accountNo}`}
                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {account.bank} · {account.holder}
                  </span>
                  <span className="num block font-semibold text-gray-900 dark:text-white">
                    {account.accountNo}
                  </span>
                </span>
                <CopyButton value={account.accountNo} label="Дансны дугаар" />
              </li>
            ))}
          </ul>

          {/*
            ⚠ ГҮЙЛГЭЭНИЙ УТГА нь нэхэмжлэлийн дугаар. Үүнгүйгээр банкны
            хуулга дээрх гүйлгээ хэний болохыг тогтоох БОЛОМЖГҮЙ.
          */}
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-amber-800 dark:text-amber-200">
                Гүйлгээний утга (заавал)
              </span>
              <span className="num block truncate font-semibold text-amber-900 dark:text-amber-100">
                {checkout.senderInvoiceNo}
              </span>
            </span>
            <CopyButton value={checkout.senderInvoiceNo} label="Гүйлгээний утга" />
          </div>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Дансаар шилжүүлсэн бол багц ШУУД идэвхжихгүй — ажлын цагт
            шалгаад идэвхжүүлнэ. Шууд идэвхжүүлэх бол дээрх QR эсвэл банкны
            аппаар төлнө үү.
          </p>
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
          /*
           * ⚠ ГОЛ ҮЙЛДЭЛ: банкны аппаас буцаж ирсэн хүн юу дарахаа
           * эргэлзэлгүй олох ёстой. Урьд нь хүрээтэй, жижиг байсан тул
           * «Цуцлах»-тай ижил жинтэй харагддаг байв.
           */
          className="w-full rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-50 sm:w-auto"
        >
          {checking ? "Шалгаж байна…" : "Төлбөр шалгах"}
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
