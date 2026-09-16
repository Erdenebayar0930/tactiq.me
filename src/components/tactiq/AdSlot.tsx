"use client";

import Script from "next/script";
import { useEffect } from "react";
import { Megaphone } from "lucide-react";

import { getAdSenseClientId } from "@/lib/tactiq/ads";
import { useUser } from "@/context/UserContext";

/**
 * Реклам байршил — хичээлийн жагсаалт зэрэгт "хажууд нь" зар харуулахад.
 *
 * ⚠ `NEXT_PUBLIC_ADSENSE_CLIENT_ID` тохируулаагүй л бол ЗӨВХӨН зайны
 * placeholder харуулна (доор). Тохируулмагц ЯГ ЭНЭ газарт бодит AdSense
 * зар гарч ирнэ — өөр кодын өөрчлөлт ШААРДЛАГАГҮЙ.
 *
 * ⚠ PREMIUM ХЭРЭГЛЭГЧИД РЕКЛАМ ГАРАХГҮЙ. Шалгалтыг ЭНД, нэг л газарт
 * хийв: дуудагч бүрд `{!user.isPremium && <AdSlot/>}` гэж бичвэл шинэ
 * байршил нэмэх бүрд мартах бөгөөд төлбөр төлсөн хүн реклам хараад
 * «юуны төлөө төлөв?» гэж асуух болно.
 *
 * ⚠ Зөвхөн ЗАРЫГ нуух биш, БҮХЭЛДЭЭ юу ч зурахгүй (`null`): хоосон
 * хүрээ үлдээвэл premium хэрэглэгчийн дэлгэц дээр учиргүй цоорхой гарна.
 *
 * Тохируулах алхам:
 *   1. https://www.google.com/adsense дээр акаунт үүсгээд сайтаа баталгаажуулна
 *   2. Зар нэгж (ad unit) үүсгээд түүний "Slot ID"-г авна
 *   3. `.env.local`-д NEXT_PUBLIC_ADSENSE_CLIENT_ID (жишээ нь "ca-pub-1234567890123456") нэмнэ
 *   4. Энэ компонентийг дуудах газартаа `slotId` дамжуулна
 */
export function AdSlot({
  slotId,
  className = "",
}: {
  /** AdSense-ийн зар нэгжийн ID — зөвхөн бодит клиент ID тохируулагдсан үед хэрэглэгдэнэ. */
  slotId?: string;
  className?: string;
}) {
  const clientId = getAdSenseClientId();
  const { user } = useUser();
  /*
   * ⚠ `user` нь эхний рендерт `null` байж болно (профайл татагдаж
   * байхад). Тэр үед реклам зурагдаад дараа нь алга болох нь premium
   * хэрэглэгчийн нүдэнд «анивчилт» болно — тиймээс ТАТАГДТАЛ нь
   * хүлээнэ.
   */
  const hidden = !user || user.isPremium;

  useEffect(() => {
    if (!clientId || hidden) return;
    try {
      const adsbygoogle = (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ?? [];
      adsbygoogle.push({});
      (window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle = adsbygoogle;
    } catch {
      // Скрипт хараахан ачаалаагүй эсвэл сүлжээгээр хаагдсан бол чимээгүй алгасна.
    }
  }, [clientId, hidden]);

  if (hidden) return null;

  if (!clientId) {
    return (
      <div
        className={`flex h-20 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-xs font-medium text-gray-400 dark:border-white/10 dark:text-gray-500 ${className}`}
      >
        <Megaphone className="size-4" aria-hidden />
        Рекламын байршил
      </div>
    );
  }

  return (
    <div className={className}>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
