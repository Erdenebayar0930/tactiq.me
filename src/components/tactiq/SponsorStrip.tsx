import { Gift, HeartHandshake } from "lucide-react";

import { t } from "@/lib/i18n/t";

/**
 * ИВЭЭН ТЭТГЭГЧ ба ШАГНАЛЫН САН — ӨӨРИЙН ТЭМЦЭЭНИЙ ДООР.
 *
 * ⚠ ЯАГААД ТЭМЦЭЭНИЙ ДООР, тусдаа жагсаалтад БИШ: ивээн тэтгэгч нь
 * тухайн тэмцээнийг л дэмждэг. Бүх дэмжигчийг нэг жагсаалтад хуряавал
 * «хэн ЮУГ дэмжсэн» гэдэг холбоо алга болно — тэр нь ивээн тэтгэгчийн
 * хувьд ГОЛ үнэ цэнэ («бид ЭНЭ тэмцээнийг зохион байгуулж байна»).
 *
 * ⚠ ТУСДАА ХӨЛ (footer) БОЛГОВ, шошгын эгнээнд БИШ: ивээн тэтгэгчийн
 * нэр, шагналын сан нь урт бичвэр тул шошгуудын дунд орвол хугацаа,
 * оролцогчийн тоо шахагдаж, гар утсан дээр тэд дараагийн мөрөнд унана.
 * Хөл нь мөрийн бүтэн өргөнийг эзэлж, дээд зураасаар тусгаарлагдана.
 *
 * ⚠ ТУСДАА КОМПОНЕНТ: ивээн тэтгэгч жагсаалтын мөр ба хуанлийн өдөр
 * ХОЁУЛАНД гарна. Тус тусад нь бичвэл нэг газар лого гарч, нөгөөд
 * гарахгүй байх нь гарцаагүй.
 */

export type Sponsor = {
  sponsorName: string;
  sponsorLogo: string;
  sponsorUrl: string;
  /** Шагналын сан — чөлөөт текст («1-р шагнал: 100,000₮»). */
  prize: string;
};

/**
 * Ивээн тэтгэгч эсвэл шагнал БАЙГАА эсэх.
 *
 * ⚠ ТАЛБАР БАЙХГҮЙ БАЙЖ МЭДНЭ, хэдийгээр төрөл нь `string` гэж
 * бичигдсэн ч: энэ өгөгдөл API хил дамждаг. Хөтөч дээр КЭШЛЭГДСЭН
 * хуучин JS шинэ серверээс (эсвэл эсрэгээр) хариу авахад талбар дутуу
 * ирнэ. Урьд нь `item.sponsorName.length` нь яг тийм тохиолдолд
 * `undefined.length` болж ХУУДСЫГ БҮХЭЛДЭЭ унагасан.
 *
 * ⚠ Тиймээс `?? ""`: дутуу талбар нь «ивээн тэтгэгчгүй» гэсэн утгатай,
 * эвдрэл БИШ.
 */
export function hasSponsor(item: Partial<Sponsor>): boolean {
  return (item.sponsorName ?? "").length > 0 || (item.prize ?? "").length > 0;
}

export function SponsorStrip({
  item,
  compact = false,
}: {
  /** ⚠ `Partial` — дээрх `hasSponsor`-ийн тайлбарыг үзнэ үү. */
  item: Partial<Sponsor>;
  /** Хуанлийн мөрөнд — нэг мөр, жижиг лого. */
  compact?: boolean;
}) {
  if (!hasSponsor(item)) return null;

  const name = item.sponsorName ?? "";
  const prize = item.prize ?? "";

  /*
   * ⚠ ЛОГО нь `next/image` БИШ, ердийн `img`: `next/image` нь гадаад
   * домэйныг `next.config.ts`-ийн `images.remotePatterns`-д
   * бүртгүүлэхийг шаарддаг. Лого нь Firebase Storage дээр байх
   * (аватартай ижил) бөгөөд тэр хаяг нь ТОКЕНТОЙ, урт — шинэ ивээн
   * тэтгэгч нэмэх тутам тохиргоо засах нь зохион байгуулагчийг
   * хөгжүүлэгчээс хамааралтай болгоно.
   */
  const logo = item.sponsorLogo ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={item.sponsorLogo}
      alt=""
      aria-hidden
      className={`shrink-0 rounded bg-white object-contain ${compact ? "h-4 w-8" : "h-7 w-14"}`}
    />
  ) : null;

  /*
   * ⚠ ХОЛБООС нь `rel="noopener noreferrer sponsored"`:
   *   • `noopener` — шинэ табаас эх хуудсыг удирдахыг хориглоно
   *   • `sponsored` — Google-ийн шаардлага (төлбөртэй холбоос)
   *
   * ⚠ ХАЯГГҮЙ бол `<a>` ХЭРЭГЛЭХГҮЙ: хоосон `<a>` нь товшигдох мэт
   * харагдаад юу ч хийхгүй — хэрэглэгч эвдэрсэн гэж бодно.
   */
  const nameNode = item.sponsorUrl ? (
    <a
      href={item.sponsorUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="truncate font-bold underline decoration-amber-400 underline-offset-2 hover:decoration-2"
    >
      {name}
    </a>
  ) : (
    <span className="truncate font-bold">{name}</span>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 truncate text-[11px] text-amber-900 dark:text-amber-100">
        {logo}
        <Gift className="size-3 shrink-0" aria-hidden />
        <span className="truncate">
          {name && nameNode}
          {name && prize ? " · " : ""}
          {prize}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-amber-200/70 bg-amber-50/60 px-3 py-2 dark:border-amber-500/20 dark:bg-amber-500/10">
      {name && (
        <span className="flex min-w-0 items-center gap-2 text-xs text-amber-900 dark:text-amber-100">
          <HeartHandshake
            className="size-3.5 shrink-0 text-amber-600 dark:text-amber-300"
            aria-hidden
          />
          <span className="shrink-0 text-amber-700/80 dark:text-amber-200/80">
            {t("Ивээн тэтгэгч")}:
          </span>
          {logo}
          {nameNode}
        </span>
      )}

      {/*
        ⚠ ШАГНАЛЫН САН нь ТОДООР, баруун захад: тэмцээнд орох гол
        шалтгаан нь шагнал бөгөөд ивээн тэтгэгчийн нэрний дор живэх
        ёсгүй.
      */}
      {prize && (
        <span className="ml-auto flex min-w-0 items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-100">
          <Gift className="size-3.5 shrink-0 text-amber-600 dark:text-amber-300" aria-hidden />
          <span className="text-amber-700/80 dark:text-amber-200/80">{t("Шагналын сан")}:</span>
          <span className="truncate">{prize}</span>
        </span>
      )}
    </div>
  );
}
