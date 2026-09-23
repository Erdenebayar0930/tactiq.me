"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Coins, Gift } from "lucide-react";

import { CelebrationVideo } from "@/components/tactiq/CelebrationVideo";
import { Confetti } from "@/components/tactiq/Confetti";
import { t } from "@/lib/i18n/t";

/**
 * ШАГНАЛЫН POPUP — бэлгийн хайрцаг онгойлгоход гарах баяр хүргэлт.
 *
 * ⚠ ЯАГААД POPUP, ТООЛУУР ШИНЭЧЛЭХЭЭР ЗОГСОХГҮЙ ВЭ: зоос нь толгой
 * хэсгийн жижиг тоо тул +15 нэмэгдсэнийг хүүхэд бараг анзаардаггүй —
 * хайрцгаа дарсан ч «юу ч болоогүй» мэт санагддаг. Шагналыг ил гаргах нь
 * дараагийн хичээл хийх хамгийн хүчтэй дохио.
 *
 * ⚠ ӨӨРӨӨ ХААГДАХГҮЙ (toast биш): энэ нь баярлах мөч бөгөөд хүүхэд өөрөө
 * уншиж, товч дарж хаана. `PurchaseToast` нь таймертай — тэр нь зөвхөн
 * «болсон» гэсэн баталгаа, энэ нь шагнал.
 */
export default function RewardPopup({
  gems,
  onClose,
}: {
  /** Олгогдсон зоос. */
  gems: number;
  onClose: () => void;
}) {
  // Escape-ээр хаах — дэлгэцийг бүтэн халхалсан цонхны ердийн хүлээлт.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /**
   * Тарах зоосны хэсгүүд — ТОГТМОЛ чиглэлүүд.
   *
   * Санамсаргүй тоо (`Math.random`) рендерийн үед ашиглавал React-ийн
   * цэвэр байдлын дүрмийг зөрчиж, SSR/hydration хооронд зөрдөг. Тогтмол
   * найман чиглэл нь хүрээлэн тарсан байдлыг ялгаагүй сайн өгнө.
   */
  const sparks = [
    { dx: "-70px", dy: "-60px" },
    { dx: "70px", dy: "-60px" },
    { dx: "-90px", dy: "10px" },
    { dx: "90px", dy: "10px" },
    { dx: "-55px", dy: "70px" },
    { dx: "55px", dy: "70px" },
    { dx: "0px", dy: "-95px" },
    { dx: "0px", dy: "85px" },
  ];

  const overlay = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("Бэлэг")}
      // Гадуур товшиход хаагдана — модал цонхны ердийн зан төлөв.
      onClick={onClose}
    >
      <div
        className="reward-pop relative w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <Confetti />

        <div className="relative mx-auto grid size-24 place-items-center">
          {/* Тарах зоос — хайрцгийн цаанаас гарч хүрээлэн тарна */}
          {sparks.map((spark) => (
            <span
              key={`${spark.dx}${spark.dy}`}
              aria-hidden
              className="reward-burst absolute text-amber-400"
              style={{ "--dx": spark.dx, "--dy": spark.dy } as React.CSSProperties}
            >
              <Coins className="size-5" />
            </span>
          ))}

          <span className="relative grid size-24 place-items-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg">
            <Gift className="size-12" aria-hidden />
          </span>
        </div>

        <p className="reward-rise mt-4 text-xl font-extrabold text-gray-900 dark:text-white">
          {t("Бэлэг нээгдлээ!")}
        </p>

        <p className="reward-rise mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-base font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Coins className="size-4" aria-hidden />+{gems} {t("зоос")}
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          {/*
            ⚠ Титэмт `Mascot`-ыг ОРЛОВ: тэр нь ХӨДӨЛГӨӨНГҮЙ дүрс байсан.
            Бэлэг нээх нь баярлах мөч бөгөөд хичээл дуусгах дэлгэцэд
            хэрэглэгддэг ЯГ ТЭР баярлаж буй робот энд ч тохирно — апп
            даяар нэг дүр байх нь хүүхдэд танил мэдрэмж өгнө.

            ⚠ `object-cover` — видео нь дөрвөлжин (420×420) тул `size-16`
            хүрээнд гажилтгүй суух ёстой.
          */}
          <CelebrationVideo className="size-16 shrink-0 rounded-2xl object-cover" />
          <p className="max-w-36 text-left text-xs text-gray-500 dark:text-gray-400">
            {t("Зоосоороо дэлгүүрээс гоёл, гэрийн тэжээвэр авч болно.")}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-brand-500 px-5 py-3 font-bold text-white hover:bg-brand-600"
        >
          {t("Гоё!")}
        </button>
      </div>
    </div>
  );

  // SSR үед `document` байхгүй — `StreakCalendar`-ийн модалтай ижил хамгаалалт.
  if (typeof document === "undefined") return null;

  return createPortal(overlay, document.body);
}
