"use client";

import { useEffect, useState } from "react";
import { MailCheck, MailWarning } from "lucide-react";

import { auth } from "@/lib/firebase";
import { refreshEmailVerification, resendVerificationEmail } from "@/lib/users";
import { REFERRAL_BONUS_DAYS } from "@/lib/billing";

/**
 * "Имэйлээ баталгаажуулна уу" сануулга.
 *
 * ⚠ ХАНДАЛТЫГ ХААХГҮЙ. Баталгаажуулаагүй хэрэглэгч апп-аа бүрэн ашиглана —
 * энэ самбар нь зөвхөн найзын урамшуулал (`REFERRAL_BONUS_DAYS`) хүлээгдэж
 * байгааг сануулна. Хичээл сурахыг имэйлийн шуудангаар барьцаалах нь
 * хүүхдийн платформд зохисгүй бөгөөд орхилтыг л нэмэгдүүлнэ.
 *
 * ⚠ Төлөвийг `PublicUser`-ээс БИШ, Firebase-ээс шууд уншина: баталгаажуулалт
 * нь Firebase Auth дээр болдог, Postgres-д огт хадгалагддаггүй.
 */
export default function EmailVerifyBanner() {
  // `null` = хараахан мэдэхгүй (Firebase сессээ сэргээж байна) — тэр үед
  // ЮУ Ч харуулахгүй, эс бөгөөс баталгаажсан хүнд самбар анивчина.
  const [verified, setVerified] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void auth.authStateReady().then(() => {
      if (cancelled) return;
      const user = auth.currentUser;
      // Нэвтрээгүй бол самбар хамаагүй — "баталгаажсан" гэж үзэж нуулаа.
      setVerified(user ? user.emailVerified : true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (verified !== false) return null;

  const check = async () => {
    setBusy(true);
    setNotice(null);
    try {
      if (await refreshEmailVerification()) {
        setVerified(true);
      } else {
        setNotice("Хараахан баталгаажаагүй байна. Имэйл дэх холбоосоо дараарай.");
      }
    } catch {
      setNotice("Шалгаж чадсангүй. Дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await resendVerificationEmail();
      setNotice("Илгээлээ! Шуудангаа шалгаарай (спам хавтас ч байж болно).");
    } catch {
      // Firebase нь дараалан илгээхийг хязгаарладаг — хамгийн түгээмэл шалтгаан.
      setNotice("Илгээж чадсангүй. Хэсэг хүлээгээд дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <MailWarning
          className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Имэйлээ баталгаажуулаарай
          </p>
          <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/80">
            Найзын урилгын {REFERRAL_BONUS_DAYS} хоногийн урамшуулал зөвхөн
            баталгаажсаны дараа олгогдоно.
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void check()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-60"
            >
              <MailCheck className="size-3.5" aria-hidden />
              Баталгаажууллаа
            </button>
            <button
              type="button"
              onClick={() => void resend()}
              disabled={busy}
              className="rounded-xl border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-500/40 dark:text-amber-200 dark:hover:bg-amber-500/15"
            >
              Дахин илгээх
            </button>
          </div>

          {notice && (
            <p className="mt-2 text-xs text-amber-800 dark:text-amber-200/90">{notice}</p>
          )}
        </div>
      </div>
    </div>
  );
}
