"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, QrCode, Users } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { ErrorNote } from "@/components/tactiq/ui";
import PaymentOptions from "@/components/tactiq/PaymentOptions";
import type { PaymentChoices } from "@/components/tactiq/PaymentOptions";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { FAMILY_SEATS, PLANS, perSeatMonthly, savingsPercent } from "@/lib/billing";

import type { PublicUser } from "@/lib/api/publicUser";

/**
 * ГЭР БҮЛИЙН БАГЦ — худалдан авалтын БҮРЭН урсгал (карт → QR → баталгаа).
 *
 * ⚠ ЯАГААД `/premium`-ээс ЗӨӨГДСӨН БЭ: гэр бүлийн багцын суудал нь
 * `student_links` холбоосоор тарааагддаг ба тэр холбоосыг ЗӨВХӨН эцэг эх
 * үүсгэдэг. Сурагчийн данс энэ багцыг авбал 159,000₮ төлчихөөд суудлаа
 * хэнд ч өгч чадахгүй байсан. Одоо худалдан авалт нь хүүхдүүдээ удирддаг
 * ЯГ ТЭР дэлгэц дээр (`/parent`) байна — суудал хэнд очихыг эцэг эх тэр
 * дороо харна.
 *
 * ⚠ Клиент дээрх байршил нь ХАМГААЛАЛТ БИШ. Жинхэнэ хаалт нь
 * `api/billing/checkout` дээрх `isParentOnlyPlan` шалгалт.
 *
 * ⚠ Нэхэмжлэлийн дүнг ЭНД тооцохгүй — серверээс ирсэн дүнг л харуулна.
 */

const POLL_INTERVAL_MS = 3000;
/** Хэдэн минутын дараа poll зогсоох вэ — QPay нэхэмжлэл мөнхийн биш. */
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

type Checkout = {
  senderInvoiceNo: string;
  amountMnt: number;
  planLabel: string;
  qrText: string;
  qrImageBase64: string | null;
  bankLinks: { name: string; link: string }[];
  mock: boolean;
};

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

export default function FamilyPlanPurchase() {
  const { user, apply } = useUser();
  const params = useSearchParams();

  /**
   * Худалдан авалтын алхамд орсон эсэх (урамшууллын код + баталгаажуулалт).
   *
   * ⚠ `?buy=family` байвал ШУУД тэр алхмаас эхэлнэ. `/premium` дээрх
   * «Сонгох» товч энэ хаягаар аваачдаг: урьд нь тэнд НЭГ удаа сонгоод,
   * энд ЯГ ИЖИЛ картыг дахин хараад ДАХИН дарах шаардлагатай байсан —
   * нэг шийдвэрийг хоёр удаа хийлгэсэн давхардсан алхам.
   *
   * ⚠ Энэ нь НЭХЭМЖЛЭЛ автоматаар үүсгэдэггүй: хэрэглэгч кодоо оруулаад
   * «Төлбөр үүсгэх» дарж байж мөнгөний урсгал эхэлнэ. URL параметр нь
   * төлбөр эхлүүлдэг байвал холбоос дарсан хэн ч санамсаргүй нэхэмжлэл
   * үүсгэнэ.
   */
  const [choosing, setChoosing] = useState(params.get("buy") === "family");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (choices: PaymentChoices) => {
    setBusy(true);
    setError(null);

    try {
      const data = await apiFetch<Checkout>("/api/billing/checkout", {
        method: "POST",
        body: { planId: "family", promoCode: choices.promoCode },
      });
      setCheckout(data);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  if (paid) return <PaidCard />;

  if (checkout) {
    return (
      <InvoiceCard
        checkout={checkout}
        onPaid={(updated) => {
          setPaid(true);
          if (updated) apply(updated);
        }}
        onCancel={() => setCheckout(null)}
        onError={setError}
      />
    );
  }

  /*
   * Худалдан авалтын алхам — урамшууллын код энд орно. Гэр бүлийн багц
   * нь бусад багцтай ИЖИЛ урсгалыг ашиглана: код нь зөвхөн ганц хүний
   * багцад ажилладаг байх ямар ч шалтгаан алга.
   */
  if (choosing) {
    return (
      <div className="space-y-3">
        {error && <ErrorNote message={error} />}
        <PaymentOptions
          planId="family"
          busy={busy}
          onBack={() => setChoosing(false)}
          onSubmit={(choices) => void start(choices)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <ErrorNote message={error} />}

      <div className="surface overflow-hidden p-0 ring-2 ring-violet-400 dark:ring-violet-500/50">
        <p className="flex items-center justify-center gap-1.5 bg-violet-500 py-1.5 text-xs font-bold text-white">
          <Users className="size-3.5 shrink-0" aria-hidden />
          {FAMILY_SEATS} хүнд — гэр бүлээрээ
        </p>

        <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-base font-bold text-gray-900 dark:text-white">
                {PLANS.family.label}
              </p>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                −{savingsPercent("family")}%
              </span>
            </div>

            {/*
              Нэг хүнд ногдох үнэ нь ТОМ, нийт үнэ нь жижиг — гэхдээ нийт
              үнийг НУУХГҮЙ. Төлөх бодит дүнг харуулахгүй бол хэрэглэгч
              нэхэмжлэл дээр 159,000₮ хараад гэнэтийн мэдрэмж авна.
            */}
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
              <span className="num text-3xl font-extrabold tracking-tight text-violet-600 dark:text-violet-300">
                ~{money(perSeatMonthly("family"))}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                нэг хүнд / сард
              </span>
            </p>

            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Нийт <span className="num font-semibold">{money(PLANS.family.amountMnt)}</span> ·{" "}
              <span className="num">{PLANS.family.days}</span> хоног
            </p>

            <ul className="mt-4 space-y-2 text-[13px] leading-snug text-gray-600 dark:text-gray-300">
              {[
                `Та + ${FAMILY_SEATS - 1} хүүхэд`,
                "Суудал нь холбогдсон хүүхдүүдэд АВТОМАТААР олгогдоно",
                "Хүүхэд бүрт гэрчилгээ тус тусад нь",
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setChoosing(true)}
            disabled={busy}
            className="btn-primary w-full px-6 py-3 disabled:opacity-60 sm:w-auto"
          >
            Худалдаж авах
          </button>
        </div>
      </div>

      {/*
        Хүүхэд холбоогүй эцэг эхэд СЭРЭМЖЛҮҮЛНЭ. Багц авчихаад "яагаад
        хүүхэд минь Premium болохгүй байна вэ" гэсэн асуулт нь дэмжлэгийн
        хамгийн элбэг гомдол болох эрсдэлтэй — суудал нь ЗӨВХӨН холбогдсон
        хүүхдэд очдог.
      */}
      {user && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Суудал нь дээрх жагсаалт дахь хүүхдүүдэд олгогдоно. Хүүхдээ эхлээд
          урилгын кодоор холбоод, дараа нь багцаа авбал бүгдэд нь шууд идэвхжинэ.
        </p>
      )}
    </div>
  );
}

/**
 * QPay нэхэмжлэлийн карт — QR, банкны холбоос, төлбөрийн хүлээлт.
 *
 * ⚠ `/premium`-ийн ижил нэртэй компонентоос ХУУЛБАРЛАСАН БИШ, тусдаа
 * хэвээр байгаа: тэр нь тухайн хуудасны хэд хэдэн төлөвтэй (сонгосон багц,
 * онцлох тэмдэг) сүлжсэн. Хоёуланг нэгтгэх нь энэ өөрчлөлтийн хүрээнээс
 * гадуур — гол зорилго нь гэр бүлийн багцыг зөв цэс рүү зөөх явдал.
 */
function InvoiceCard({
  checkout,
  onPaid,
  onCancel,
  onError,
}: {
  checkout: Checkout;
  onPaid: (user: PublicUser | null) => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [waited, setWaited] = useState(0);
  // `onPaid`/`onError` нь эцэг компонент дахин зурагдах бүрд ШИНЭ функц
  // болдог. Тэднийг effect-ийн хамаарлаас хассан ч хуучин хувилбарыг
  // дуудахгүйн тулд ref-т хадгална.
  const callbacks = useRef({ onPaid, onError });
  // ⚠ Ref-ийг ЗУРАГДАХ ҮЕД БИШ, effect дотор шинэчилнэ.
  useEffect(() => {
    callbacks.current = { onPaid, onError };
  });

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled) return;

      try {
        const data = await apiFetch<{ status: string; user: PublicUser | null }>(
          `/api/billing/status?no=${encodeURIComponent(checkout.senderInvoiceNo)}`
        );
        if (cancelled) return;

        if (data.status === "paid") {
          callbacks.current.onPaid(data.user);
          return;
        }
      } catch {
        // Нэг удаагийн сүлжээний алдаа — poll-ыг зогсоохгүй. Хэрэглэгч
        // банкны апп руу шилжсэн үед алдаа харуулах нь дэмий түгшүүр.
      }

      const elapsed = Date.now() - startedAt;
      setWaited(elapsed);
      if (elapsed > POLL_TIMEOUT_MS) {
        callbacks.current.onError("Нэхэмжлэлийн хугацаа дууслаа. Дахин оролдоно уу.");
        return;
      }

      timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };

    let timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
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
          Туршилтын горим: QPay тохируулаагүй тул жинхэнэ төлбөр хийгдэхгүй.
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

      <button
        type="button"
        onClick={onCancel}
        className="text-sm text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
      >
        Цуцлах
      </button>
    </div>
  );
}

function PaidCard() {
  return (
    <div className="surface flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
        <Check className="size-8" aria-hidden />
      </span>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Төлбөр амжилттай!</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Гэр бүлийн багц идэвхжлээ. Холбогдсон хүүхдүүдэд суудал автоматаар олгогдлоо.
      </p>
    </div>
  );
}
