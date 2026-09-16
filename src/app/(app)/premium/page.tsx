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
  monthlyEquivalent,
  PURCHASABLE_PLAN_IDS,
  PLANS,
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
  // ⚠ ХЭРЭГЖСЭН — `AdSlot` нь `user.isPremium` үед юу ч зурахгүй.
  "Реклам харагдахгүй",
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
            {PURCHASABLE_PLAN_IDS.map((planId) => (
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
          ⚠ ЗӨВХӨН БОДИТООР ХЭРЭГЖСЭН боломжийг бичнэ. Худал амлалт нь
          хамгийн үнэтэй алдаа — төлсөн хүн тэр даруй мэднэ.

          "Реклам харагдахгүй" нь ОДОО хэрэгжсэн (`AdSlot` нь
          `user.isPremium` үед `null` буцаана). Харин "Бүх хичээл
          нээлттэй" гэж БҮҮ бич: хичээл нь бүх хүнд дарааллаараа нээгддэг
          (`isLessonUnlocked`).
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

