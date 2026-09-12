/**
 * DAAMAL KIDS — үг, эможийн САН.
 *
 * ⚠ Агуулгыг ЭНД төвлөрүүлсэн шалтгаан: нэг эможи хэд хэдэн хичээлд
 * (тоолох, санах ой, үг таних) орно. Тарамдуулж бичвэл нэг үгийг засахад
 * бүх хичээлийг нэгжих шаардлагатай болно.
 *
 * ⚠ Эможи бүр 4–6 насны хүүхдэд ТАНИГДАХУЙЦ байх ёстой: хийсвэр тэмдэг
 * (⚗️, ⚙️) энэ насанд утгагүй. Амьтан, хоол, гэр бүл, өнгө — тэдний өдөр
 * тутмын ертөнц.
 */
import type { Bi } from "./kidsShared";

export type Word = { emoji: string; mn: string; en: string };

/** Амьтад — тоолох, үг таних, санах ойд хамгийн их хэрэглэгдэнэ. */
export const ANIMALS: Word[] = [
  { emoji: "🐱", mn: "муур", en: "cat" },
  { emoji: "🐶", mn: "нохой", en: "dog" },
  { emoji: "🐴", mn: "морь", en: "horse" },
  { emoji: "🐑", mn: "хонь", en: "sheep" },
  { emoji: "🐄", mn: "үхэр", en: "cow" },
  { emoji: "🐐", mn: "ямаа", en: "goat" },
  { emoji: "🐫", mn: "тэмээ", en: "camel" },
  { emoji: "🐟", mn: "загас", en: "fish" },
  { emoji: "🐦", mn: "шувуу", en: "bird" },
  { emoji: "🐰", mn: "туулай", en: "rabbit" },
  { emoji: "🐻", mn: "баавгай", en: "bear" },
  { emoji: "🦊", mn: "үнэг", en: "fox" },
];

/** Хоол, жимс. */
export const FOOD: Word[] = [
  { emoji: "🍎", mn: "алим", en: "apple" },
  { emoji: "🍌", mn: "гадил", en: "banana" },
  { emoji: "🍇", mn: "усан үзэм", en: "grapes" },
  { emoji: "🥕", mn: "лууван", en: "carrot" },
  { emoji: "🍞", mn: "талх", en: "bread" },
  { emoji: "🥛", mn: "сүү", en: "milk" },
  { emoji: "🧀", mn: "бяслаг", en: "cheese" },
  { emoji: "🥚", mn: "өндөг", en: "egg" },
  { emoji: "🍚", mn: "будаа", en: "rice" },
  { emoji: "🍪", mn: "жигнэмэг", en: "cookie" },
];

/** Гэр бүл. */
export const FAMILY: Word[] = [
  { emoji: "👩", mn: "ээж", en: "mother" },
  { emoji: "👨", mn: "аав", en: "father" },
  { emoji: "👵", mn: "эмээ", en: "grandmother" },
  { emoji: "👴", mn: "өвөө", en: "grandfather" },
  { emoji: "👦", mn: "хүү", en: "boy" },
  { emoji: "👧", mn: "охин", en: "girl" },
  { emoji: "👶", mn: "нялх хүүхэд", en: "baby" },
];

/** Биеийн эрхтэн. */
export const BODY: Word[] = [
  { emoji: "👁️", mn: "нүд", en: "eye" },
  { emoji: "👂", mn: "чих", en: "ear" },
  { emoji: "👃", mn: "хамар", en: "nose" },
  { emoji: "👄", mn: "ам", en: "mouth" },
  { emoji: "✋", mn: "гар", en: "hand" },
  { emoji: "🦶", mn: "хөл", en: "foot" },
  { emoji: "🦷", mn: "шүд", en: "tooth" },
];

/** Өдөр тутмын зүйлс. */
export const DAILY: Word[] = [
  { emoji: "🏠", mn: "гэр", en: "house" },
  { emoji: "🚗", mn: "машин", en: "car" },
  { emoji: "📕", mn: "ном", en: "book" },
  { emoji: "🪑", mn: "сандал", en: "chair" },
  { emoji: "🛏️", mn: "ор", en: "bed" },
  { emoji: "👟", mn: "гутал", en: "shoe" },
  { emoji: "🧢", mn: "малгай", en: "cap" },
  { emoji: "☂️", mn: "шүхэр", en: "umbrella" },
];

/** Өнгө — дугуй эможигоор (өнгө нь өөрөө «зураг» болно). */
export const COLORS: Word[] = [
  { emoji: "🔴", mn: "улаан", en: "red" },
  { emoji: "🔵", mn: "цэнхэр", en: "blue" },
  { emoji: "🟡", mn: "шар", en: "yellow" },
  { emoji: "🟢", mn: "ногоон", en: "green" },
  { emoji: "🟠", mn: "улбар шар", en: "orange" },
  { emoji: "🟣", mn: "ягаан", en: "purple" },
  { emoji: "⚫", mn: "хар", en: "black" },
  { emoji: "⚪", mn: "цагаан", en: "white" },
];

/** Хэлбэр. */
export const SHAPES: Word[] = [
  { emoji: "🔵", mn: "дугуй", en: "circle" },
  { emoji: "🟥", mn: "дөрвөлжин", en: "square" },
  { emoji: "🔺", mn: "гурвалжин", en: "triangle" },
  { emoji: "⭐", mn: "од", en: "star" },
  { emoji: "❤️", mn: "зүрх", en: "heart" },
  { emoji: "🟪", mn: "тэгш өнцөгт", en: "rectangle" },
];

/**
 * МОНГОЛ ЦАГААН ТОЛГОЙ — үсэг бүр ТАНИЛ үгээр.
 *
 * ⚠ Үг нь ЗААВАЛ тэр үсгээр эхэлж, эможигоор харагдах ёстой: хүүхэд
 * үсгийг өөрөө биш, «ЮУНЫ эхний авиа» гэдгээр нь сурдаг.
 */
export const MN_LETTERS: { letter: string; word: Word }[] = [
  { letter: "А", word: { emoji: "🍎", mn: "алим", en: "apple" } },
  { letter: "Б", word: { emoji: "🐻", mn: "баавгай", en: "bear" } },
  { letter: "В", word: { emoji: "🚐", mn: "вагон", en: "van" } },
  { letter: "Г", word: { emoji: "👟", mn: "гутал", en: "shoe" } },
  { letter: "Д", word: { emoji: "🎽", mn: "дээл", en: "deel" } },
  { letter: "Е", word: { emoji: "👩", mn: "ээж", en: "mother" } },
  { letter: "Ж", word: { emoji: "🍪", mn: "жигнэмэг", en: "cookie" } },
  { letter: "З", word: { emoji: "🐟", mn: "загас", en: "fish" } },
  { letter: "И", word: { emoji: "🐎", mn: "их морь", en: "big horse" } },
  { letter: "К", word: { emoji: "🥔", mn: "картофель", en: "potato" } },
  { letter: "Л", word: { emoji: "🥕", mn: "лууван", en: "carrot" } },
  { letter: "М", word: { emoji: "🐱", mn: "муур", en: "cat" } },
  { letter: "Н", word: { emoji: "🐶", mn: "нохой", en: "dog" } },
  { letter: "О", word: { emoji: "🛏️", mn: "ор", en: "bed" } },
  { letter: "Ө", word: { emoji: "🥚", mn: "өндөг", en: "egg" } },
  { letter: "П", word: { emoji: "🍕", mn: "пицца", en: "pizza" } },
  { letter: "Р", word: { emoji: "📻", mn: "радио", en: "radio" } },
  { letter: "С", word: { emoji: "🪑", mn: "сандал", en: "chair" } },
  { letter: "Т", word: { emoji: "🐫", mn: "тэмээ", en: "camel" } },
  { letter: "У", word: { emoji: "💧", mn: "ус", en: "water" } },
  { letter: "Ү", word: { emoji: "🐄", mn: "үхэр", en: "cow" } },
  { letter: "Х", word: { emoji: "🐑", mn: "хонь", en: "sheep" } },
  { letter: "Ц", word: { emoji: "🌸", mn: "цэцэг", en: "flower" } },
  { letter: "Ч", word: { emoji: "🐺", mn: "чоно", en: "wolf" } },
  { letter: "Ш", word: { emoji: "🐦", mn: "шувуу", en: "bird" } },
  { letter: "Э", word: { emoji: "👵", mn: "эмээ", en: "grandmother" } },
  { letter: "Я", word: { emoji: "🐐", mn: "ямаа", en: "goat" } },
];

/** Монгол үе — «ма», «мэ» гэх мэт нээлттэй үеүд. */
export const MN_SYLLABLES: { syllable: string; word: Word }[] = [
  { syllable: "ма", word: { emoji: "🐱", mn: "мал", en: "livestock" } },
  { syllable: "мо", word: { emoji: "🐴", mn: "морь", en: "horse" } },
  { syllable: "на", word: { emoji: "🌞", mn: "нар", en: "sun" } },
  { syllable: "но", word: { emoji: "🐶", mn: "нохой", en: "dog" } },
  { syllable: "са", word: { emoji: "🌙", mn: "сар", en: "moon" } },
  { syllable: "ту", word: { emoji: "🐰", mn: "туулай", en: "rabbit" } },
  { syllable: "ха", word: { emoji: "🚪", mn: "хаалга", en: "door" } },
  { syllable: "цэ", word: { emoji: "🌸", mn: "цэцэг", en: "flower" } },
];

/** Тоо — хоёр хэлээр бичигдсэн нэр (тоолох, англи тоо хоёуланд). */
export const NUMBER_WORDS: { value: number; mn: string; en: string }[] = [
  { value: 1, mn: "нэг", en: "one" },
  { value: 2, mn: "хоёр", en: "two" },
  { value: 3, mn: "гурав", en: "three" },
  { value: 4, mn: "дөрөв", en: "four" },
  { value: 5, mn: "тав", en: "five" },
  { value: 6, mn: "зургаа", en: "six" },
  { value: 7, mn: "долоо", en: "seven" },
  { value: 8, mn: "найм", en: "eight" },
  { value: 9, mn: "ес", en: "nine" },
  { value: 10, mn: "арав", en: "ten" },
];

/** Хос хэлээр бичсэн үг — сонголтын шошго болгоно. */
export const wordLabel = (word: Word): Bi => [
  `${word.emoji} ${word.mn}`,
  `${word.emoji} ${word.en}`,
];

/** Зөвхөн эможи — «аль зураг вэ?» асуултад (уншихгүйгээр сонгоно). */
export const emojiLabel = (word: Word): Bi => [word.emoji, word.emoji];
