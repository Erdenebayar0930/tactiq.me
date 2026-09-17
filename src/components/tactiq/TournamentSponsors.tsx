import { HeartHandshake } from "lucide-react";

import { AdSlot } from "@/components/tactiq/AdSlot";
import { getAdSenseSlotId } from "@/lib/tactiq/ads";
import { t } from "@/lib/i18n/t";

/**
 * «ТЭМЦЭЭНИЙГ ИВЭЭН ТЭТГЭГЧИД» — зарын блок.
 *
 * ⚠ РЕКЛАМЫГ ШУУД «реклам» гэж бичихгүй, ИВЭЭН ТЭТГЭГЧ гэж нэрлэв: хүүхдийн
 * тэмцээний ивээн тэтгэгч нь тэмцээний ЧАНДАЛ хэсэг (шагнал, зохион
 * байгуулалт түүнээс гардаг) бөгөөд тэр нь зөвхөн зар зурахаас өөр
 * агуулга. Мөн хэрэглэгч «реклам» гэсэн бичгийг автоматаар өнгөрөөж
 * үздэг (banner blindness).
 *
 * ⚠ PREMIUM хэрэглэгчид ЮУ Ч ГАРАХГҮЙ: `AdSlot` нь `user.isPremium` үед
 * `null` буцаадаг тул зар байхгүй болно. Тэр үед «ивээн тэтгэгчид» гэсэн
 * ХООСОН гарчиг үлдэх нь эвгүй — тиймээс гарчгийг ч `AdSlot`-той НЭГ
 * хүрээнд тавьж, зар байхгүй бол блок бүхэлдээ зай эзлэхгүй болгов
 * (`AdSlot` нь `null` буцаахад доторх зай нь өөрөө хумигдана).
 */
export function TournamentSponsors() {
  return (
    <section className="w-full">
      <div className="flex items-center gap-2 pb-2">
        <HeartHandshake className="size-4 shrink-0 text-amber-500" aria-hidden />
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
          {t("Тэмцээнийг ивээн тэтгэгчид")}
        </h2>
      </div>

      {/*
        ⚠ Зарын нэгж нь ТЭМЦЭЭНИЙ хуудсын өөрийн `slotId`-тай: AdSense-ийн
        статистик байршлаар салдаг тул лоббийн банертай нэг id хэрэглэвэл
        аль нь ажиллаж байгааг хэзээ ч мэдэхгүй.
      */}
      <AdSlot slotId={getAdSenseSlotId("tournament")} />
    </section>
  );
}
