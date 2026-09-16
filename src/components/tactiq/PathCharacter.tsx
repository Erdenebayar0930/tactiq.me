import Image from "next/image";

/**
 * ЗАМЫН ДҮРҮҮД — хичээлийн зангилааны хажууд зогсох сурагчид.
 *
 * ⚠ Зургууд нь ТУНГАЛАГ дэвсгэртэй (эх зургийн саарал дэвсгэрийг
 * тайрч авсан). Саарал дэвсгэртэй нь замын өнгөт дэвсгэр дээр
 * дөрвөлжин толбо шиг харагдана.
 *
 * ⚠ Өндөр нь тогтмол, өргөнийг эх харьцаагаар нь бичсэн — эс бөгөөс
 * зураг ачаалагдах агшинд мөр үсэрч (layout shift) сурагчийн нүд алдана.
 */
const CHARACTER_SETS = {
  default: [
    { src: "/images/characters/girl-books.webp", w: 337, h: 425 },
    /*
     * ⚠ `-2`: хуучин тасдалт нь дэвтрийн баруун талыг тасалж, дээд баруун
     * буланд хажуугийн дүрийн хормой оруулж ирсэн. Шинэ нэрээр тавьсан
     * шалтгаан нь service worker — `/images/**` 30 хоног CacheFirst.
     */
    { src: "/images/characters/boy-pen-2.webp", w: 287, h: 565 },
    { src: "/images/characters/girl-tablet.webp", w: 257, h: 324 },
    { src: "/images/characters/boy-glasses.webp", w: 233, h: 332 },
    { src: "/images/characters/boy-globe.webp", w: 274, h: 299 },
    { src: "/images/characters/robot.webp", w: 179, h: 305 },
  ],
  /** Даамын курс — даам тоглож буй сурагчид. */
  checkers: [
    { src: "/images/characters/checkers/girl-books.webp", w: 502, h: 372 },
    { src: "/images/characters/checkers/boy-board.webp", w: 292, h: 402 },
    { src: "/images/characters/checkers/girl-tablet.webp", w: 344, h: 396 },
    { src: "/images/characters/checkers/boy-glasses.webp", w: 384, h: 402 },
    { src: "/images/characters/checkers/boy-globe.webp", w: 404, h: 368 },
    { src: "/images/characters/checkers/robot.webp", w: 242, h: 400 },
    { src: "/images/characters/checkers/girl-telescope.webp", w: 576, h: 402 },
    { src: "/images/characters/checkers/boy-tablets.webp", w: 322, h: 398 },
    { src: "/images/characters/checkers/boy-compass.webp", w: 442, h: 400 },
  ],
  /** Шатрын курс — шатар тоглож буй сурагчид. */
  chess: [
    { src: "/images/characters/chess/girl-books.webp", w: 553, h: 400 },
    { src: "/images/characters/chess/boy-board.webp", w: 284, h: 400 },
    { src: "/images/characters/chess/girl-tablet.webp", w: 524, h: 400 },
    { src: "/images/characters/chess/boy-glasses.webp", w: 372, h: 400 },
    { src: "/images/characters/chess/boy-globe.webp", w: 523, h: 400 },
    { src: "/images/characters/chess/robot.webp", w: 256, h: 400 },
    { src: "/images/characters/chess/girl-telescope.webp", w: 557, h: 400 },
    { src: "/images/characters/chess/boy-tablets.webp", w: 412, h: 400 },
    { src: "/images/characters/chess/boy-compass.webp", w: 486, h: 400 },
  ],
} as const;

export type CharacterSet = keyof typeof CHARACTER_SETS;

/**
 * Курсын slug → дүрийн багц.
 *
 * ⚠ Багцын НЭР нь курсын SLUG-тай ижил байхаар зохиосон: шинэ курст
 * дүрийн багц нэмэхэд `CHARACTER_SETS`-д тэр slug-аар нэг мөр нэмэхэд л
 * хангалттай, хэрэглэх талд юу ч засахгүй. Урьд нь `/learn` дээр
 * `courseSlug === "checkers" ? "checkers" : "default"` гэсэн нөхцөл
 * байсан — багц нэмэх тутам түүнийг засах шаардлагатай байв, бөгөөд
 * мартвал шинэ зургууд чимээгүйхэн хэрэглэгдэхгүй үлдэнэ.
 */
export function characterSetForCourse(slug: string): CharacterSet {
  return slug in CHARACTER_SETS ? (slug as CharacterSet) : "default";
}

/**
 * @param index — хичээлийн дугаар. Дүрүүд ээлжлэн давтагдана.
 * @param height — харагдах өндөр (px).
 * @param set — курсын дүрийн багц.
 */
export function PathCharacter({
  index,
  height = 76,
  set = "default",
  muted = false,
  className = "",
}: {
  index: number;
  height?: number;
  set?: CharacterSet;
  /** Хичээл хийгдээгүй (түгжээтэй) бол саарал, бүдэг харагдана. */
  muted?: boolean;
  className?: string;
}) {
  const characters = CHARACTER_SETS[set];
  const character =
    characters[((index % characters.length) + characters.length) % characters.length];
  const width = Math.round((character.w / character.h) * height);

  return (
    <Image
      aria-hidden
      alt=""
      src={character.src}
      width={width}
      height={height}
      className={`pointer-events-none max-w-none select-none drop-shadow-sm transition-[filter,opacity] duration-300 ${
        muted ? "opacity-60 grayscale" : ""
      } ${className}`}
      style={{ width, height }}
    />
  );
}
