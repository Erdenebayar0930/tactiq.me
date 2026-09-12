"use client";

import { useCallback, useState } from "react";

import type { CoachTip } from "@/lib/tactiq/coachTips";

/**
 * Тохирох дүрмийн тайлбараас ЗӨВХӨН НЭГИЙГ сонгож буцаана.
 *
 * ДҮРЭМ:
 *   • эрэмбэ хамгийн ӨНДӨР, мөн ХАРААГҮЙ тайлбар гарна (`coachTips.ts` нь
 *     жагсаалтыг эрэмбээрээ эрэмбэлж өгдөг),
 *   • хэрэглэгч хаасан тайлбар ДАХИН ГАРАХГҮЙ — «мад гэж юу вэ»-г нүүдэл
 *     бүрд дахин хэлэх нь зөвлөгөө биш, чимээ шуугиан,
 *   • нэг зэрэг зөвхөн нэг бөмбөлөг — хоёр тайлбар зэрэг гарвал хүүхэд
 *     хоёуланг нь уншихгүй.
 *
 * ⚠ «Харсан» тэмдэглэгээ нь ЗӨВХӨН тухайн дэлгэцийн сесст хамаарна
 * (серверт хадгалагдахгүй). Сурагч дараагийн тоглолтод тэр дүрмийг дахин
 * санахыг хүсэж магадгүй — мөн үүнийг санах нь `users` хүснэгтэд дасгалын
 * түүх хуримтлуулах шаардлага үүсгэнэ.
 */
export function useCoachTip(tips: CoachTip[]): {
  tip: CoachTip | null;
  dismiss: () => void;
} {
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set());

  const tip = tips.find((candidate) => !dismissed.has(candidate.id)) ?? null;

  const dismiss = useCallback(() => {
    if (!tip) return;
    setDismissed((current) => new Set(current).add(tip.id));
  }, [tip]);

  return { tip, dismiss };
}
