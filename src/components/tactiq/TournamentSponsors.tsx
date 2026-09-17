import { HeartHandshake } from "lucide-react";

import { AdSlot } from "@/components/tactiq/AdSlot";
import { SponsorStrip } from "@/components/tactiq/SponsorStrip";
import { getAdSenseSlotId } from "@/lib/tactiq/ads";
import { t } from "@/lib/i18n/t";

import type { Sponsor } from "@/components/tactiq/SponsorStrip";

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
export function TournamentSponsors({ sponsors = [] }: { sponsors?: Sponsor[] }) {
  /*
   * БОДИТ ИВЭЭН ТЭТГЭГЧИД — давхардлыг нэрээр арилгана.
   *
   * ⚠ Нэг ивээн тэтгэгч ОЛОН тэмцээнийг дэмжиж болно (өдөр бүрийн блиц
   * = 14 биелэл). Шүүхгүй бол тэдний нэр 14 удаа дараалан гарч, блок
   * нь ивээн тэтгэгчийн жагсаалт биш тэмцээний жагсаалт болно.
   */
  const unique = new Map<string, Sponsor>();
  for (const item of sponsors) {
    if (!item.sponsorName) continue;
    if (!unique.has(item.sponsorName)) unique.set(item.sponsorName, item);
  }
  const list = [...unique.values()];

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 pb-2">
        <HeartHandshake className="size-4 shrink-0 text-amber-500" aria-hidden />
        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-200">
          {t("Тэмцээнийг ивээн тэтгэгчид")}
        </h2>
      </div>

      {/*
        БОДИТ ИВЭЭН ТЭТГЭГЧИД — зарын ӨМНӨ.

        ⚠ Тэднийг зарын ДООР тавьж болохгүй: шагналаа тавьсан бодит
        дэмжигчийг Google-ийн автомат зарын дор байрлуулах нь тэднийг
        хоёрдугаар зэрэглэлд оруулна. Мөн хэрэглэгч зар хүртэл гүйлгэж
        хүрдэггүй.
      */}
      {list.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {list.map((item) => (
            <li key={item.sponsorName}>
              <SponsorStrip item={item} />
            </li>
          ))}
        </ul>
      )}

      {/*
        ⚠ Зарын нэгж нь ТЭМЦЭЭНИЙ хуудсын өөрийн `slotId`-тай: AdSense-ийн
        статистик байршлаар салдаг тул лоббийн банертай нэг id хэрэглэвэл
        аль нь ажиллаж байгааг хэзээ ч мэдэхгүй.
      */}
      <AdSlot slotId={getAdSenseSlotId("tournament")} />
    </section>
  );
}
