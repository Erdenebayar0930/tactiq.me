"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Crown, Gift, Sparkles, Users, X } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { ErrorNote } from "@/components/tactiq/ui";
import PaymentOptions from "@/components/tactiq/PaymentOptions";
import type { PaymentChoices } from "@/components/tactiq/PaymentOptions";
import { apiFetch, ApiError } from "@/lib/apiClient";
import {
  FAMILY_SEATS,
  monthlyEquivalent,
  PLAN_IDS,
  PLANS,
  perSeatMonthly,
  REFERRAL_BONUS_DAYS,
  savingsPercent,
  TRIAL_DAYS,
} from "@/lib/billing";

import { InvoiceCard } from "@/components/tactiq/QpayInvoice";

import type { PlanId } from "@/lib/billing";
import type { QpayCheckout } from "@/components/tactiq/QpayInvoice";

/**
 * Premium худалдан авах дэлгэц — QPay нэхэмжлэл, QR ба банкны холбоос.
 *
 * ⚠ Нэхэмжлэлийн дүнг ЭНД тооцохгүй — серверээс (`/api/billing/checkout`)
 * ирсэн дүнг л харуулна. Багцын жагсаалт дээрх үнэ нь `PLANS`-аас ирдэг ч
 * тэр нь СЕРВЕРТЭЙ ИЖИЛ эх сурвалж (`lib/billing.ts`) тул зөрөх боломжгүй.
 */

type Checkout = QpayCheckout;

const money = (amount: number) => `${amount.toLocaleString("mn-MN")}₮`;

/**
 * Багц бүрт харуулах боломжууд.
 *
 * ⚠ Мөр нэмэхийн ӨМНӨ тэр боломж кодод ХЭРЭГЖСЭН эсэхийг шалгаарай.
 * Жагсаалт нь маркетингийн текст биш, ГЭРЭЭ — хэрэглэгч үүнийг уншиж
 * мөнгө төлдөг.
 *
 * ⚠ Мөр бүр НЭГ БОЛОМЖИЙН НЭР байх ёстой, тайлбар БИШ. Нэг боломжийг
 * гурван мөрөөр задалж бичвэл (нэр нь … дугаартай нь … хэвлэнэ нь …)
 * жагсаалт урт мөртөө хоосон болж, хэрэглэгч ЮУ АВЧ БАЙГААГАА тоолж
 * чадахгүй.
 *
 * Одоогийн байдлаар:
 *   • "Бүх хичээл хязгааргүй" — зүрх дуусдаггүй тул хичээл хаагдахгүй
 *     (`toPublicUser` нь Premium хэрэглэгчид `MAX_HEARTS` өгдөг).
 *   • "Курс дуусгасны гэрчилгээ" — `lib/api/certificates.ts`, хэвлэх нь
 *     ЗӨВХӨН Premium-д.
 *   • "Бүх курс, 6 сургууль" — `lib/tactiq/schools.ts` дэх сургуулийн тоо.
 */
const PREMIUM_FEATURES = [
  "Бүх хичээл хязгааргүй",
  "Курс дуусгасны гэрчилгээ",
  "Бүх курс, 6 сургууль",
];

export default function PremiumPage() {
  const { user, apply } = useUser();
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Сонгогдсон багц — ТӨЛБӨРИЙН СОНГОЛТЫН алхамд орсон гэсэн үг.
   *
   * ⚠ Багц сонгомогц нэхэмжлэл ҮҮСГЭХГҮЙ: НӨАТ-ын баримт, бонус код нь
   * нэхэмжлэлийн агуулгыг өөрчилдөг бөгөөд QPay нэхэмжлэл үүссэний
   * дараа тэдгээрийг засах боломжгүй.
   */
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  /**
   * Төлбөр БАТАЛГААЖААГҮЙ гэсэн эцсийн төлөв.
   *
   * ⚠ Хугацаа дуусах эсвэл QPay тохируулаагүй үед хэрэглэгчийг дэмий
   * хүлээлгэхгүй, ИЛ «амжилтгүй» гэж хэлнэ. Хүлээлт нь өөрөө амжилт мэт
   * ойлгогдох ёсгүй.
   */
  const [failed, setFailed] = useState<string | null>(null);

  const premiumUntil = user?.premiumUntil ? new Date(user.premiumUntil) : null;
  const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();
  // Дээш бүхэлчилнэ (`ceil`): 0.4 хоног үлдсэн хүнд "0 хоног" гэж харуулах нь
  // эрх нь аль хэдийн дууссан мэт ХУДАЛ мэдээлэл болно.
  const daysLeft = premiumUntil
    ? Math.max(0, Math.ceil((premiumUntil.getTime() - Date.now()) / 86_400_000))
    : 0;

  const start = async (planId: PlanId, choices: PaymentChoices) => {
    setBusyPlan(planId);
    setError(null);
    setPaid(false);
    setFailed(null);
    try {
      setCheckout(
        await apiFetch<Checkout>("/api/billing/checkout", {
          method: "POST",
          body: { planId, promoCode: choices.promoCode },
        })
      );
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Premium</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Хязгааргүй зүрх, реклам байхгүй, бүх хичээл нээлттэй.
        </p>
      </div>

      {isPremium ? (
        /*
          ⚠ Цагаан бичгийг ханхайсан шаргал дээр тавихгүй — тодролын
          харьцаа ~2:1 болж наранд бараг уншигдахгүй. Дэвсгэрийг цайвар
          шаргал, бичгийг бараан шаргал болгов: өнгө нь ижил, уншигдац нь
          6:1 дээш. `components/tactiq/PremiumCard.tsx`-тэй нэг схем.
        */
        <div className="flex items-center gap-3 rounded-2xl bg-gold-50 p-4 text-gold-900 ring-1 ring-gold-300 dark:bg-gold-500/10 dark:text-gold-100 dark:ring-gold-500/30">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-amber-500 text-white">
            <Crown className="size-5" aria-hidden />
          </span>
          <p className="text-sm font-semibold">
            Танд Premium идэвхтэй байна — {premiumUntil?.toLocaleDateString("mn-MN")}{" "}
            хүртэл, {daysLeft} хоног үлдлээ. Сунгавал үлдсэн хоног дээр НЭМЭГДЭНЭ.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4 text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
          <Gift className="mt-0.5 size-6 shrink-0" aria-hidden />
          <p className="text-sm font-semibold">
            Үнэгүй {TRIAL_DAYS} хоног дууссан байна. Урьсан найз тань эхний
            хичээлээ дуусгах бүрд {REFERRAL_BONUS_DAYS} хоног үнэгүй нэмэгдэнэ —{" "}
            <Link href="/profile" className="underline">
              миний урилгын холбоос
            </Link>
            .
          </p>
        </div>
      )}

      {error && <ErrorNote message={error} />}

      {paid ? (
        <PaidCard />
      ) : failed ? (
        <FailedCard
          message={failed}
          onRetry={() => {
            setFailed(null);
            setCheckout(null);
          }}
        />
      ) : checkout ? (
        <InvoiceCard
          checkout={checkout}
          onPaid={(updated) => {
            setPaid(true);
            if (updated) apply(updated);
          }}
          onCancel={() => setCheckout(null)}
          onFailed={(message) => {
            setCheckout(null);
            setFailed(message);
          }}
        />
      ) : selectedPlan ? (
        <PaymentOptions
          planId={selectedPlan}
          busy={busyPlan !== null}
          onBack={() => setSelectedPlan(null)}
          onSubmit={(choices) => void start(selectedPlan, choices)}
        />
      ) : (
        <>

          {/*
            ⚠ ГЭР БҮЛИЙН БАГЦ ЭНД БАЙХГҮЙ — тэр нь `/parent` цэсэнд зөөгдсөн.
            Шалтгаан: суудлууд нь `student_links` холбоосоор тарааагддаг ба
            тэр холбоосыг ЗӨВХӨН эцэг эх үүсгэдэг. Сурагчийн данс энэ багцыг
            авбал 159,000₮ төлчихөөд суудлаа хэнд ч өгч чадахгүй байсан.
            Доорх жагсаалт нь ганц хүний багцууд (`seats === 1`) тул шүүлтүүр
            нь ХЭВЭЭР хэрэгтэй — шинэ олон суудалтай багц нэмэгдвэл энд
            санамсаргүй гарч ирэхгүй.
          */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PLAN_IDS.filter((planId) => PLANS[planId].seats === 1).map((planId) => (
              <PlanCard
                key={planId}
                planId={planId}
                busy={busyPlan === planId}
                disabled={busyPlan !== null}
                // Багц сонгох нь ТӨЛБӨРИЙН СОНГОЛТЫН алхам руу оруулна
                // (НӨАТ, бонус код) — нэхэмжлэл тэндээс үүснэ.
                onSelect={() => setSelectedPlan(planId)}
              />
            ))}
          </div>

          <FamilyCard />
        </>
      )}
    </div>
  );
}

/**
 * Ганц хүний багцын карт.
 *
 * ⚠ Хэмнэлтийн шошгыг ГАРЧГИЙН ХАЖУУД тавихгүй. Карт нь 4 багана болоход
 * ~150px өргөнтэй үлддэг бөгөөд шошго тэндээс зай авахад "3 сарын багц"
 * гэсэн гурван үг гурван МӨР болж тасарна. Шошго нь үнийн доорх мөрөнд —
 * тэнд эргэлзээгүй өргөн бий.
 *
 * ⚠ Онцлох тэмдгийг картын ГАДНА "хөвүүлэхгүй" (`-top-2.5`). Тийм тэмдэг
 * нь гарчигтай мөргөлдөж, `overflow-hidden`-той эцэг элементэд огт
 * харагдахгүй болдог. Оронд нь картын ДЭЭД ТУУЗ — хэзээ ч мөргөлдөхгүй.
 */
function PlanCard({
  planId,
  busy,
  disabled,
  onSelect,
}: {
  planId: PlanId;
  busy: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const plan = PLANS[planId];
  const savings = savingsPercent(planId);
  const isBest = planId === "yearly";

  return (
    /*
      `h-full` + `flex-col` + товч дээрх `mt-auto`: багцууд өөр өөр тооны
      мөртэй (хэмнэлтийн шошго зарим дээр байхгүй) тул үүнгүй бол "Сонгох"
      товчнууд өөр өөр өндөрт зогсоно.
    */
    <div
      className={`surface flex h-full flex-col overflow-hidden p-0 ${
        isBest ? "ring-2 ring-brand-400" : ""
      }`}
    >
      {isBest ? (
        <p className="flex items-center justify-center gap-1 bg-brand-500 py-1.5 text-[11px] font-bold text-white">
          <Sparkles className="size-3 shrink-0" aria-hidden />
          Хамгийн ашигтай
        </p>
      ) : (
        // Тууз байхгүй картуудыг ижил өндөрт эхлүүлэх зай — үгүй бол
        // онцлогдсон картын агуулга бусдаасаа доогуур эхэлнэ.
        <div className="h-[27px]" aria-hidden />
      )}

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {plan.label}
        </p>

        <p className="num mt-1 text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          {money(plan.amountMnt)}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="num text-xs text-gray-500 dark:text-gray-400">
            сард ~{money(monthlyEquivalent(planId))}
          </span>
          {savings > 0 && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              −{savings}%
            </span>
          )}
        </div>
        <p className="num mt-0.5 text-xs text-gray-400">{plan.days} хоног</p>

        {/*
          ⚠ ЗӨВХӨН БОДИТООР ХЭРЭГЖСЭН боломжийг бичнэ. Энд байсан "Реклам
          байхгүй" ба "Бүх хичээл нээлттэй" хоёр нь кодод ХЭЗЭЭ Ч
          хэрэгжээгүй байсан: `AdSlot` нь Premium эсэхийг огт шалгадаггүй,
          хичээл нь бүх хүнд дарааллаараа нээгддэг (`isLessonUnlocked`).
          Худал амлалт нь хамгийн үнэтэй алдаа — төлсөн хүн тэр даруй
          мэднэ.
        */}
        <ul className="mt-4 space-y-2 text-[13px] leading-snug text-gray-600 dark:text-gray-300">
          {PREMIUM_FEATURES.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className="btn-primary mt-auto w-full px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {busy ? "Түр хүлээнэ үү…" : "Сонгох"}
        </button>
      </div>
    </div>
  );
}

/**
 * ТӨЛБӨР БАТАЛГААЖААГҮЙ.
 *
 * ⚠ Энэ дэлгэц нь «алдаа» биш, УРСГАЛЫН ТӨГСГӨЛ: QR нь алга болж,
 * хэрэглэгч дахин эхлэх эсвэл холбогдох хоёр л сонголттой үлдэнэ.
 * Хагас төлөвт (QR хэвээр, дээр нь улаан бичиг) үлдээвэл хэрэглэгч
 * хүчингүй болсон нэхэмжлэлийг уншуулсаар байх эрсдэлтэй.
 */
function FailedCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="surface flex flex-col items-center gap-3 p-8 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        <X className="size-8" aria-hidden />
      </span>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        Төлбөр баталгаажсангүй
      </h2>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="btn-primary px-5 py-2.5 text-sm"
      >
        Дахин оролдох
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
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
        Төлбөр амжилттай!
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Premium идэвхжлээ. Сайхан суралцаарай!
      </p>
    </div>
  );
}

/**
 * Гэр бүлийн багц — өөр ТӨРЛИЙН санал тул өөр хэлбэрээр.
 *
 * ⚠ Нэг хүнд ногдох үнийг ХАМГИЙН ТОМ тоогоор харуулна. Бүтэн үнэ
 * (159,000₮) нь жилийн багцаас (89,000₮) хоёр дахин их харагддаг тул
 * зөвхөн түүнийг харуулбал хамгийн ашигтай санал хамгийн үнэтэй нь мэт
 * ойлгогдоно. Бодит утга нь 5 хүнд хуваасны дараа гарна: сард ~2,650₮.
 *
 * ⚠ Тэмдгийг картын ГАДНА хөвүүлэхгүй (`-top-2.5`) — `overflow-hidden`
 * түүнийг ТАСАЛЖ хаядаг. Дээд тууз нь хэзээ ч тасрахгүй.
 *
 * ⚠ ХУДАЛДАН АВАЛТ ЭНД ХИЙГДЭХГҮЙ. Суудлууд нь `student_links`
 * холбоосоор тарааагддаг ба тэр холбоосыг ЗӨВХӨН эцэг эх үүсгэдэг —
 * сурагчийн данс энэ багцыг авбал 159,000₮ төлчихөөд суудлаа хэнд ч өгч
 * чадахгүй. Тиймээс:
 *   • эцэг эх   → товч нь `/parent` руу аваачна (тэнд хүүхдүүдээ хараад авна)
 *   • бусад     → товч ИДЭВХГҮЙ, шалтгааныг доор нь бичнэ
 *
 * Карт нь бүх хэрэглэгчид ХАРАГДАНА: «ийм багц байдаг» гэдгийг мэдэх нь
 * эцэг эхээрээ авахуулах шалтгаан болно. Нуувал санал өөрөө алга болно.
 *
 * ⚠ Клиент дэх энэ хаалт нь ХАМГААЛАЛТ БИШ — жинхэнэ нь
 * `api/billing/checkout` дээрх `isParentOnlyPlan` шалгалт.
 */
function FamilyCard() {
  const { user } = useUser();
  const isParent = user?.role === "parent" || user?.secondaryRole === "parent";
  const plan = PLANS.family;

  return (
    <div className="surface overflow-hidden p-0 ring-2 ring-violet-400 dark:ring-violet-500/50">
      <p className="flex items-center justify-center gap-1.5 bg-violet-500 py-1.5 text-xs font-bold text-white">
        <Users className="size-3.5 shrink-0" aria-hidden />
        {FAMILY_SEATS} хүнд — гэр бүлээрээ
      </p>

      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-base font-bold text-gray-900 dark:text-white">
              {plan.label}
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
            Нийт <span className="num font-semibold">{money(plan.amountMnt)}</span> ·{" "}
            <span className="num">{plan.days}</span> хоног · нэг хүнд жилдээ{" "}
            <span className="num">{money(Math.round(plan.amountMnt / plan.seats))}</span>
          </p>

          <ul className="mt-4 space-y-2 text-[13px] leading-snug text-gray-600 dark:text-gray-300">
            {[
              `Эцэг эх + ${FAMILY_SEATS - 1} хүүхэд`,
              "Хүүхэд бүрт гэрчилгээ тус тусад нь",
              "Хүүхдийн явцыг нэг дороос хянана",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:text-right">
          {isParent ? (
            /*
             * ⚠ `?buy=family` — ШУУД худалдан авалтын алхам руу.
             *
             * Урьд нь энэ товч зүгээр `/parent` руу аваачдаг байсан ба
             * тэнд ЯГ ИЖИЛ гэр бүлийн карт дахин гарч, хэрэглэгч
             * «Худалдаж авах»-ыг ДАХИН дарах шаардлагатай болдог байв —
             * нэг сонголтыг хоёр удаа хийлгэж байсан утгагүй алхам.
             */
            <Link
              href="/parent?buy=family"
              className="btn-primary block w-full px-6 py-3 text-center sm:w-auto"
            >
              Сонгох
            </Link>
          ) : (
            <>
              <button
                type="button"
                disabled
                className="btn-primary w-full cursor-not-allowed px-6 py-3 opacity-50 sm:w-auto"
              >
                Сонгох
              </button>
              <p className="mt-2 max-w-[15rem] text-xs text-gray-500 dark:text-gray-400">
                Зөвхөн эцэг эхийн эрхтэй хэрэглэгч авна.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
