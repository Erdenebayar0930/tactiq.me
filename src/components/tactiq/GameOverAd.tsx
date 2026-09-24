"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";

/**
 * Тоглоом дууссаны дараа, дүнг харуулахаас ӨМНӨ харагдах видео реклам
 * (interstitial). `WatchAdForHeart`-тай АДИЛ шалтгаанаар (`lib/tactiq/ads.ts`
 * үзнэ үү) энэ бол ЖИНХЭНЭ видео зарын оронд түр placeholder: доор
 * `AD_DURATION_SECONDS`-ийн турш тоолуур ажиллаад автоматаар `onDone()`-г
 * дуудна. Бодит Google Ad Manager (rewarded/interstitial) эсвэл AdMob
 * холбогдмогц энэ тоолуурын оронд тэдгээрийн "зар үзэж дуусав /
 * хаагдсан" callback дээр `onDone()`-г дуудна.
 */
const AD_DURATION_SECONDS = 5;

export function GameOverAd({ onDone }: { onDone: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onDone();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  return (
    <div className="surface flex flex-col items-center gap-2 p-4 text-center sm:p-6">
      <span className="grid size-10 place-items-center sm:size-14 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
        <Megaphone className="size-5 sm:size-6" aria-hidden />
      </span>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        Реклам үзэж байна… (жишээ)
      </p>
      <p className="num text-2xl font-extrabold text-gray-900 dark:text-white">{secondsLeft}</p>
    </div>
  );
}
