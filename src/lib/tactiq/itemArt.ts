/**
 * ДАСГАЛЫН ЗУРАГТ ЗҮЙЛС — `img:<түлхүүр>` тэмдэглэгээ.
 *
 * ⚠ ЯАГААД ЭможиГ ОРЛОВ: санах ойн тоглоомын хөзөр дээр эможи гардаг
 * байсан бөгөөд эможи нь iOS, Android, Windows гурван өөр зурагтай.
 * Хос олох тоглоомд энэ нь зүгээр ч нэг гоо зүйн асуудал биш:
 * «🐰» ба «🐇» хоёр нь зарим төхөөрөмж дээр БАРАГ ИЖИЛ харагддаг тул
 * сурагч буруу хос нээгээд яагаад болоогүйг ойлгохгүй.
 *
 * ⚠ `server-only` БИШ: хөзрийг клиент зурна, санд хадгалах мөрийг seed
 * скрипт бичнэ — хоёулаа энэ жагсаалтаас уншина.
 *
 * ⚠ ХАДГАЛАХ ХЭЛБЭР нь `img:mn` гэсэн ТЕКСТ: хөзрийн агуулга нь
 * `exercises.solution` дотор «memory:6:img:mn|img:us|…» гэж мөрөөр
 * хадгалагддаг тул шинэ багана шаардахгүй. Танигдаагүй түлхүүр нь
 * ТЕКСТЭЭРЭЭ харагдана — дасгал эвдрэхгүй, харин анзаарагдана.
 */

export const ITEM_ART_PREFIX = "img:";

/** `img:<түлхүүр>` — түлхүүр нь зөвхөн жижиг үсэг, тоо, зураас. */
const KEY_RE = /^[a-z0-9-]{1,16}$/;

export type ItemArt = {
  src: string;
  /** Дэлгэц уншигчид, `alt`-д хэрэглэх нэр. */
  label: string;
  /**
   * Зураг нь ЦАГААН дэвсгэртэй эсэх (далбаа). Тийм бол хөзрийн өнгөт
   * дугуйн оронд цагаан хавтан дээр тавина — эс бөгөөс далбааны цагаан
   * тал (Япон, Польш, Дани…) дугуйны өнгө дээр бохир харагдана.
   */
  boxed?: boolean;
};

/** Дэлгүүрийн тэжээвэр амьтан, ургамал (`lib/tactiq/pets.ts`-тэй ижил id). */
const PETS: Record<string, string> = {
  rabbit: "Туулай",
  cat: "Муур",
  dog: "Нохой",
  cactus: "Ортоз",
  flower: "Цэцэг",
  tree: "Мод",
};

/**
 * Улс орнуудын далбаа — ISO 3166-1 alpha-2 (жижиг үсгээр).
 *
 * ⚠ Нэр нь МОНГОЛООР, макет дээр бичигдсэн шигээ: сурагч далбааг нэртэй
 * нь холбож сурах нь тоглоомын сурган хүмүүжүүлэх ГОЛ ач холбогдол.
 */
const FLAGS: Record<string, string> = {
  mn: "Монгол",
  us: "АНУ",
  ca: "Канад",
  gb: "Их Британи",
  de: "Герман",
  fr: "Франц",
  jp: "Япон",
  cn: "БНХАУ",
  kr: "БНСУ",
  ru: "ОХУ",
  in: "Энэтхэг",
  au: "Австрали",
  br: "Бразил",
  za: "Өмнөд Африк",
  it: "Итали",
  es: "Испани",
  tr: "Турк",
  sa: "Саудын Араб",
  ir: "Иран",
  id: "Индонез",
  mx: "Мексик",
  ar: "Аргентин",
  se: "Швед",
  nl: "Нидерланд",
  ch: "Швейцарь",
  no: "Норвеги",
  fi: "Финланд",
  dk: "Дани",
  pl: "Польш",
  be: "Бельги",
  ua: "Украин",
  ie: "Ирланд",
  il: "Израиль",
  eg: "Египет",
  dz: "Алжир",
  ma: "Марокко",
  th: "Тайланд",
  vn: "Вьетнам",
  sg: "Сингапур",
  nz: "Шинэ Зеланд",
};

/**
 * Түлхүүр → зураг.
 *
 * ⚠ Хавтас нь ХУВИЛБАРТАЙ: service worker нь `/images/**`-ийг 30 хоног
 * CacheFirst-ээр барьдаг (`next.config.ts`) тул зургийг СОЛИХОД ижил
 * нэрээр дарж бичих нь хэрэглэгчид хүрэхгүй — тэд эвдэрсэн зургаа
 * үзсээр байна. Тэжээврийн зураг аль хэдийн `v2`-т байна (`v1` дээр
 * туулайн цагаан царай арилсан байсан).
 */
export const ITEM_ART: Record<string, ItemArt> = {
  ...Object.fromEntries(
    Object.entries(PETS).map(([id, label]) => [id, { src: `/images/pets/v2/${id}.webp`, label }])
  ),
  ...Object.fromEntries(
    Object.entries(FLAGS).map(([code, label]) => [
      `flag-${code}`,
      { src: `/images/flags/v1/${code}.webp`, label, boxed: true },
    ])
  ),
};

/** Далбааны түлхүүрүүд — seed скриптүүд эндээс сонгоно. */
export const FLAG_KEYS = Object.keys(FLAGS).map((code) => `flag-${code}`);

/** `img:mn` → `"mn"`, бусад бүх текст → `null`. */
export function itemArtKey(item: string): string | null {
  if (!item.startsWith(ITEM_ART_PREFIX)) return null;

  const key = item.slice(ITEM_ART_PREFIX.length);
  return KEY_RE.test(key) ? key : null;
}

/** Зүйлийн зураг — танихгүй бол `null` (дуудагч текстээр зурна). */
export function itemArt(item: string): ItemArt | null {
  const key = itemArtKey(item);
  return key ? (ITEM_ART[key] ?? null) : null;
}

/** Хадгалах хэлбэр: `"rabbit"` → `"img:rabbit"`. */
export function itemArtToken(key: string): string {
  return `${ITEM_ART_PREFIX}${key}`;
}
