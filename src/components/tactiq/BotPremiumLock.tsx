"use client";

import Link from "next/link";
import { Crown, Lock } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { canPracticeWithBot } from "@/lib/tactiq/botAccess";
import { t } from "@/lib/i18n/t";

/**
 * Ботын дадлага түгжээтэй үеийн САНУУЛГА — «төлбөр төлсний дараа
 * идэвхжинэ» + Premium руу орох товч.
 */
export function BotLockNotice({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex w-full flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center sm:flex-row sm:text-left dark:border-amber-500/30 dark:bg-amber-500/10 ${className}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300">
        <Lock className="size-5" aria-hidden />
      </span>
      <p className="flex-1 text-sm text-amber-900 dark:text-amber-100">
        {t("Ботоор дадлагажих нь Premium эрхтэй хэрэглэгчид нээлттэй. Төлбөр төлсний дараа идэвхжинэ. Найзтайгаа тоглох үнэгүй.")}
      </p>
      <Link
        href="/premium"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600"
      >
        <Crown className="size-4" aria-hidden />
        {t("Premium авах")}
      </Link>
    </div>
  );
}

/**
 * Бот хуудсын ХААЛТ — эрхгүй бол тоглоомын оронд сануулга харуулна.
 *
 * ⚠ `/play` дээрх товч түгжээтэй ч хаягаар ШУУД орох боломжтой тул
 * хуудас өөрөө шалгана. Үр дүнгийн API ч мөн шалгадаг — энэ нь зөвхөн
 * UI талын хаалт.
 */
export function BotPremiumGate({ children }: { children: React.ReactNode }) {
  const { user } = useUser();

  if (canPracticeWithBot(user)) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("Ботоор дадлагажих")}</h1>
      <BotLockNotice />
      <Link href="/play" className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
        {t("Буцах")}
      </Link>
    </div>
  );
}
