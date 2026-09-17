/**
 * МОНГОЛ ОГНОО — `toLocaleString("mn-MN")`-ийг ОРЛОВ.
 *
 * ⚠ ЯАГААД ГАРААР: `Intl` нь монгол хэлний өгөгдөл (ICU data) БАЙХГҮЙ
 * орчинд чимээгүйхэн АНГЛИ руу буцдаг. Үр дүнд нь тэмцээний хуваарь дээр
 * «Wed, September 16», «Sep 16, 08:25 PM» гэж гарч байв — монгол хүүхдэд
 * зориулсан аппад англи огноо нь зүгээр нэг гажиг биш, УНШИГДАХГҮЙ.
 *
 * Хөтөч бүр өөр ICU-тай тул «ажиллаж байгаа юм шиг» санагдаад тодорхой
 * төхөөрөмж дээр л буцдаг — тиймээс `Intl`-д огт найдахгүй.
 *
 * ⚠ ЦАГИЙН БҮС: `Date`-ийн `getHours()` зэрэг нь ХӨТЧИЙН бүсээр
 * ажиллана — яг хүссэн зан. Сервер UTC дээр байдаг тул серверт
 * форматлавал бүх хүнд UTC гарна.
 */

const MONTHS = [
  "1 дүгээр сар",
  "2 дугаар сар",
  "3 дугаар сар",
  "4 дүгээр сар",
  "5 дугаар сар",
  "6 дугаар сар",
  "7 дугаар сар",
  "8 дугаар сар",
  "9 дүгээр сар",
  "10 дугаар сар",
  "11 дүгээр сар",
  "12 дугаар сар",
];

/** Гараг — `getDay()` нь Ням гарагаас (0) эхэлдэг. */
const WEEKDAYS = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];

const two = (value: number) => String(value).padStart(2, "0");

/** «14:30» — 24 цагийн хэлбэр (монголд AM/PM хэрэглэдэггүй). */
export function mnTime(date: Date): string {
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
}

/** «9 дүгээр сарын 17, Лха» */
export function mnDay(date: Date): string {
  return `${MONTHS[date.getMonth()].replace(" сар", " сарын")} ${date.getDate()}, ${WEEKDAYS[date.getDay()]}`;
}

/**
 * «9/17 14:30» — жагсаалтын мөрөнд.
 *
 * ⚠ БОГИНО хэлбэр: «9 дүгээр сарын 17» нь мөрийн хагасыг эзэлж, цагийн
 * хяналт, оролцогчийн тоог түлхэж гаргана.
 */
export function mnDateTime(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} ${mnTime(date)}`;
}

/** Өнөөдөр эсэхийг ХӨТЧИЙН бүсээр шалгана. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
