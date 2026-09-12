"use client";

import { X } from "lucide-react";

import { Icon } from "@/components/tactiq/Icon";
import { COACHES } from "@/lib/tactiq/coaches";
import { t } from "@/lib/i18n/t";

/**
 * ДАСГАЛЖУУЛАГЧИЙН ЯРИА — аватар + яриа бөмбөлөг.
 *
 * Бүртгэлийн үед сонгосон дүр (`users.coachId`) нь өмнө нь ЗӨВХӨН тоглоомын
 * дараах шинжилгээнд (`CoachReview`) харагддаг байсан — өөрөөр хэлбэл
 * хүүхэд сонгосон багшаа тоглолтын ТУРШ хэзээ ч хардаггүй байв. Энэ
 * компонент нь түүнийг хөлгийн хажууд, дүрэм тайлбарлах мөчид гаргана.
 *
 * ⚠ ХААХ ТОВЧ ЗААВАЛ: тайлбар нь дэлгэцийн хэсгийг эзэлдэг тул түүнийг
 * хаах боломжгүй бол давтан тоглогчид саад болно. Хаасныг дуудагч тал
 * санаж, тэр тайлбарыг дахин гаргахгүй (`shownRef` загвар).
 */
export function CoachTip({
  coachId,
  text,
  onDismiss,
}: {
  coachId?: string | null;
  /** Дүрмийн тайлбар — `lib/tactiq/coachTips.ts`-с ирнэ. */
  text: string;
  onDismiss: () => void;
}) {
  const coach = COACHES.find((entry) => entry.id === coachId) ?? COACHES[0];

  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow ${coach.gradient}`}
        aria-hidden
      >
        <Icon name={coach.icon} className="size-5" />
      </span>

      {/*
        Яриа бөмбөлгийн «хошуу» — зүүн тал дээрх 45°-аар эргүүлсэн дөрвөлжин.
        Зурагаар БИШ, эргүүлсэн div-ээр: дэвсгэр өнгө, харанхуй горим,
        хүрээ бүгд бөмбөлөгтэйгөө автоматаар таарна.
      */}
      <div className="relative flex-1 rounded-2xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-500/30 dark:bg-brand-500/10">
        <span
          aria-hidden
          className="absolute -left-1.5 top-4 size-3 rotate-45 border-b border-l border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10"
        />

        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold text-brand-700 dark:text-brand-300">
            {t(coach.name)}
          </p>
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-1 -mt-1 grid size-6 shrink-0 place-items-center rounded-lg text-brand-600/70 hover:bg-brand-100 dark:text-brand-300/70 dark:hover:bg-brand-500/20"
            aria-label={t("Хаах")}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>

        <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200">{t(text)}</p>
      </div>
    </div>
  );
}
