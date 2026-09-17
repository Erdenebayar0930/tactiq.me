import { Gift } from "lucide-react";

import { t } from "@/lib/i18n/t";

/**
 * ИВЭЭН ТЭТГЭГЧИЙН ТУУЗ — тэмцээний мөр дээр.
 *
 * ⚠ ЯАГААД ТУСДАА КОМПОНЕНТ: ивээн тэтгэгч нь жагсаалтын мөр, хуанлийн
 * өдөр, ивээн тэтгэгчдийн блок гэсэн ГУРВАН газарт гарна. Тус тусад нь
 * бичвэл нэг газар лого гарч, нөгөөд гарахгүй байх нь гарцаагүй.
 *
 * ⚠ ЛОГО нь `next/image` БИШ, ердийн `img`: `next/image` нь гадаад
 * домэйныг `next.config.ts`-ийн `images.remotePatterns`-д бүртгүүлэхийг
 * шаарддаг. Ивээн тэтгэгчийн лого нь Firebase Storage дээр байх
 * (хэрэглэгчийн аватартай ижил) бөгөөд тэр хаяг нь ТОКЕНТОЙ, урт —
 * шинэ ивээн тэтгэгч нэмэх тутам тохиргоо засах нь зохион байгуулагчийг
 * хөгжүүлэгчээс хамааралтай болгоно.
 *
 * ⚠ ХОЛБООС нь `rel="noopener noreferrer sponsored"`:
 *   • `noopener` — шинэ табаас эх хуудсыг удирдахыг хориглоно
 *   • `sponsored` — Google-ийн шаардлага (төлбөртэй холбоос)
 */
export type Sponsor = {
  sponsorName: string;
  sponsorLogo: string;
  sponsorUrl: string;
  prize: string;
};

/** Ивээн тэтгэгч эсвэл шагнал БАЙГАА эсэх. */
export function hasSponsor(item: Sponsor): boolean {
  return item.sponsorName.length > 0 || item.prize.length > 0;
}

export function SponsorStrip({
  item,
  compact = false,
}: {
  item: Sponsor;
  /** Хуанлийн мөрөнд — зөвхөн нэг мөр, лого жижиг. */
  compact?: boolean;
}) {
  if (!hasSponsor(item)) return null;

  const logo = item.sponsorLogo ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={item.sponsorLogo}
      alt=""
      aria-hidden
      className={`shrink-0 rounded bg-white object-contain ${compact ? "h-4 w-8" : "h-6 w-12"}`}
    />
  ) : null;

  const body = (
    <>
      {logo}
      <Gift
        className={`shrink-0 text-amber-600 dark:text-amber-300 ${compact ? "size-3" : "size-3.5"}`}
        aria-hidden
      />
      <span className="min-w-0 truncate">
        {item.sponsorName && <span className="font-bold">{item.sponsorName}</span>}
        {item.sponsorName && item.prize ? " · " : ""}
        {item.prize}
      </span>
    </>
  );

  const className = `flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 text-[11px] text-amber-900 dark:bg-amber-500/10 dark:text-amber-100 ${
    compact ? "" : "w-full"
  }`;

  /*
   * ⚠ ХОЛБООСГҮЙ бол `<a>` ХЭРЭГЛЭХГҮЙ: хаяггүй `<a>` нь товшигдох мэт
   * харагдаад юу ч хийхгүй — хэрэглэгч эвдэрсэн гэж бодно.
   */
  if (!item.sponsorUrl) {
    return <div className={className}>{body}</div>;
  }

  return (
    <a
      href={item.sponsorUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className={`${className} hover:bg-amber-100 dark:hover:bg-amber-500/20`}
    >
      {body}
    </a>
  );
}
