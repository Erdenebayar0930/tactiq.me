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
 * `exercises.grid` дотор «memory:6:img:animal-lion|…» гэж мөрөөр
 * хадгалагддаг тул шинэ багана шаардахгүй. Танигдаагүй түлхүүр нь
 * ТЕКСТЭЭРЭЭ харагдана — дасгал эвдрэхгүй, харин анзаарагдана.
 */

export const ITEM_ART_PREFIX = "img:";

/**
 * `img:<түлхүүр>` — түлхүүр нь зөвхөн жижиг үсэг, тоо, зураас.
 *
 * ⚠ 24 тэмдэгт: хамгийн урт нь `animal-chinchilla` (17). 16 байхад тэр
 * түлхүүр ТАТГАЛЗАГДАЖ, хөзөр дээр «img:animal-chinchilla» гэсэн текст
 * гарч байв.
 */
const KEY_RE = /^[a-z0-9-]{1,24}$/;

export type ItemArt = {
  src: string;
  /** Дэлгэц уншигчид, `alt`-д хэрэглэх нэр. */
  label: string;
  /**
   * Зураг нь ЦАГААН дэвсгэртэй эсэх. Тийм бол хөзрийн өнгөт дугуйн
   * оронд цагаан хавтан дээр тавина.
   *
   * ⚠ Одоогийн бүх зураг ТУНГАЛАГ дэвсгэртэй тул хэн ч тавьдаггүй.
   * Талбарыг үлдээсэн шалтгаан: цагаан дэвсгэртэй зураг (далбаа, лого)
   * дахин нэмэгдвэл хөзрийн код засах шаардлагагүй байх ёстой.
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
 * АМЬТАД — санах ойн хөзөр, таних дасгалд.
 *
 * ⚠ Урьд нь энд УЛС ОРНЫ ДАЛБАА байсныг ХАСАВ: далбаа нь цагаан
 * дэвсгэртэй, дөрвөлжин хэлбэртэй тул хөзөр дээр бүгд адилхан харагдаж,
 * зөвхөн өнгөөрөө ялгаатай байв. Амьтад нь хэлбэр, өнгө, дүрсээрээ
 * ялгаатай тул хос олоход хамаагүй хялбар, хүүхдэд бас илүү сонирхолтой.
 *
 * ⚠ ТҮЛХҮҮР нь `animal-` гэж эхэлнэ: дэлгүүрийн тэжээвэр амьтадтай
 * (`rabbit`, `cat`, `dog`) НЭР ДАВХЦАХГҮЙН тулд. Тэд өөр зурагтай —
 * дэлгүүрийнх нь хүүхэлдэйн, эдгээр нь бодит гэрэл зургийн хэв.
 */
const ANIMALS: Record<string, string> = {
  lion: "Арслан",
  tiger: "Бар",
  elephant: "Заан",
  giraffe: "Анааш",
  zebra: "Зебр",
  leopard: "Ирвэс",
  bear: "Бор баавгай",
  wolf: "Чоно",
  fox: "Үнэг",
  deer: "Буга",
  panda: "Панда",
  polarbear: "Цагаан баавгай",
  gorilla: "Горилла",
  chimp: "Шимпанзе",
  kangaroo: "Кенгуру",
  koala: "Коала",
  sloth: "Ялхуу",
  otter: "Халиу",
  raccoon: "Ракун",
  redpanda: "Улаан панда",
  camel: "Тэмээ",
  horse: "Морь",
  sheep: "Хонь",
  cow: "Үхэр",
  goat: "Ямаа",
  pig: "Гахай",
  yak: "Сарлаг",
  donkey: "Илжиг",
  llama: "Лама",
  alpaca: "Альпака",
  dog: "Нохой",
  cat: "Муур",
  rabbit: "Туулай",
  hamster: "Хомяк",
  guineapig: "Гвинейн гахай",
  chinchilla: "Чинчилла",
  ferret: "Хорь",
  macaw: "Тоть",
  cockatiel: "Корелла",
  budgie: "Жижиг тоть",
  pigeon: "Тагтаа",
  duck: "Нугас",
  chicken: "Тахиа",
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
    Object.entries(ANIMALS).map(([slug, label]) => [
      `animal-${slug}`,
      { src: `/images/animals/v1/${slug}.webp`, label },
    ])
  ),
};

/** Амьтны түлхүүрүүд — seed скриптүүд эндээс сонгоно. */
export const ANIMAL_KEYS = Object.keys(ANIMALS).map((slug) => `animal-${slug}`);

/** `img:animal-lion` → `"animal-lion"`, бусад бүх текст → `null`. */
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
