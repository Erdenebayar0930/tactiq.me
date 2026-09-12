"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import PromoCodeField from "@/components/tactiq/PromoCodeField";
import type { PromoPreview } from "@/components/tactiq/PromoCodeField";
import { PLANS } from "@/lib/billing";

import type { PlanId } from "@/lib/billing";

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

export type PaymentChoices = {
  promoCode: string | null;
};

/**
 * ТӨЛБӨРИЙН АЛХАМ — багц сонгосны ДАРАА, нэхэмжлэл үүсэхийн ӨМНӨ.
 *
 * Энд ЗӨВХӨН урамшууллын кодыг асууна.
 *
 * ⚠ ЯАГААД QR-ЫН ӨМНӨ ВЭ: код нь нэхэмжлэлийн ДҮНГ өөрчилдөг. QPay
 * нэхэмжлэл үүссэний дараа дүнг өөрчлөх боломжгүй — хэрэглэгч
 * нэхэмжлэлээ цуцалж эхнээс нь эхлэх шаардлагатай болно.
 *
 * ⚠ НӨАТ-ЫН БАРИМТЫГ ЭНД АСУУХГҮЙ. QPay нь e-barimt-ыг төлбөр хийсэн
 * хүнтэй нь ӨӨРӨӨ холбож олгодог тул нэмэлт асуулт нь худалдан авалтын
 * замд ямар ч ач холбогдолгүй саад л болж байв. (Сервер тал `ebarimtType`
 * талбарыг хүлээж авсаар байгаа — байгууллагын баримт хожим шаардлагатай
 * бол зөвхөн энэ дэлгэц рүү талбарыг буцааж нэмэхэд хангалттай.)
 *
 * ⚠ Энэ дэлгэц ямар ч дүн ТООЦОХГҮЙ: эцсийн дүнг сервер `checkout` дээр
 * тооцно. Энд харагдах хямдарсан дүн нь зөвхөн УРЬДЧИЛСАН харагдац.
 */
export default function PaymentOptions({
  planId,
  busy,
  onBack,
  onSubmit,
}: {
  planId: PlanId;
  busy: boolean;
  onBack: () => void;
  onSubmit: (choices: PaymentChoices) => void;
}) {
  const plan = PLANS[planId];

  const [promoCode, setPromoCode] = useState<string | null>(null);
  /**
   * Хямдралын УРЬДЧИЛСАН дүн — зөвхөн харуулахад.
   *
   * ⚠ Энэ дүнг `checkout` руу ИЛГЭЭХГҮЙ. Сервер өөрөө кодоос тооцно;
   * клиентээс дүн авбал хэрэглэгч үнээ өөрөө тогтоох цонх нээгдэнэ.
   */
  const [preview, setPreview] = useState<PromoPreview | null>(null);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Буцах
      </button>

      <div className="surface flex items-center justify-between gap-3 p-5">
        <div>
          <p className="font-bold text-gray-900 dark:text-white">{plan.label}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <span className="num">{plan.days}</span> хоног
          </p>
        </div>
        {/*
          Код хэрэглэсэн бол ХУУЧИН үнийг зурсан байдлаар үлдээж, шинэ
          дүнг тод харуулна. Хуучин үнийг бүрмөсөн нуувал хэрэглэгч
          хямдрал бодитоор ажилласан эсэхийг харж чадахгүй.
        */}
        <div className="text-right">
          {preview ? (
            <>
              <p className="num text-sm text-gray-400 line-through">
                {money(plan.amountMnt)}
              </p>
              <p className="num text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {money(preview.amountMnt)}
              </p>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                −{preview.discountPercent}% ({money(preview.discountMnt)} хэмнэлээ)
              </p>
            </>
          ) : (
            <p className="num text-2xl font-extrabold text-gray-900 dark:text-white">
              {money(plan.amountMnt)}
            </p>
          )}
        </div>
      </div>

      <PromoCodeField
        planId={planId}
        value={promoCode}
        onApply={(code, next) => {
          setPromoCode(code);
          setPreview(next);
        }}
        onClear={() => {
          setPromoCode(null);
          setPreview(null);
        }}
      />

      <button
        type="button"
        onClick={() => onSubmit({ promoCode })}
        disabled={busy}
        className="btn-primary w-full py-3 disabled:opacity-50"
      >
        {busy
          ? "Нэхэмжлэл үүсгэж байна…"
          : `Төлбөр үүсгэх — ${money(preview ? preview.amountMnt : plan.amountMnt)}`}
      </button>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Дараагийн алхамд QR код гарч ирнэ. Төлбөр нь QPay-ээс баталгаажсаны
        ДАРАА л эрх идэвхжинэ.
      </p>
    </div>
  );
}
