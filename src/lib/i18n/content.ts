import { activeLocale } from "./t";

/**
 * АГУУЛГЫН хоёр хэл — курс, хичээл, дасгалын бичвэр.
 *
 * `lib/i18n/dictionary.ts` нь КОД дахь бичвэрийг (товчны нэр, мессеж)
 * орчуулдаг. Харин курс, хичээлийн бичвэр нь өгөгдлийн санд БАГШИЙН
 * бичсэнээр хадгалагддаг тул тольд орох боломжгүй — хоёр хэлийг санд
 * хадгална (`schema.ts`-ийн `*En` баганууд) ба энэ функц аль нэгийг сонгоно.
 *
 * ⚠ ХООСОН ОРЧУУЛГА = МОНГОЛ ХУВИЛБАР. Багш англи хувилбараа хожим бичиж
 * болох ёстой; тэр хүртэл англи хэл дээрх сурагч хоосон гарчиг, хоосон
 * асуулт харахаас монгол бичвэр харах нь ХАМААГҮЙ дээр.
 */
export function localized(mn: string, en?: string | null): string {
  if (activeLocale() !== "en") return mn;
  const trimmed = en?.trim();
  return trimmed ? trimmed : mn;
}

/**
 * "choice" дасгалын сонголтууд.
 *
 * ⚠ `id`-аар ТААРУУЛНА, индексээр БИШ: зөв хариулт нь `correctOptionId`
 * (`id`) -аар шалгагддаг тул англи жагсаалтын дараалал зөрсөн ч зөв
 * хариулт хэвээр таарах ёстой. Англи сонголт байхгүй бол монгол шошго
 * хэвээр харагдана.
 */
export function localizedOptions<T extends { id: string; label: string }>(
  options: T[] | null,
  optionsEn?: T[] | null
): T[] | null {
  if (!options || activeLocale() !== "en" || !optionsEn) return options;

  return options.map((option) => {
    const match = optionsEn.find((entry) => entry.id === option.id);
    const label = match?.label.trim();
    return label ? { ...option, label } : option;
  });
}
