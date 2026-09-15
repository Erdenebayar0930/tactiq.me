import Image from "next/image";

import { courseArt } from "@/components/tactiq/CourseArt";
import { Icon } from "@/components/tactiq/Icon";

import type { ColorKey } from "@/lib/tactiq/theme";

/**
 * КУРСЫН КОВЕР ЗУРАГ — өнгөт налуу дэвсгэр, чимэглэлийн хэлбэрүүд, том дүрс.
 *
 * ⚠ ЯАГААД ЗУРГИЙН ФАЙЛ БИШ, SVG ВЭ:
 *   • Курс бүрт зураг зурах эсвэл худалдаж авах шаардлагагүй — админ шинэ
 *     курс нэмэхэд ковер нь АВТОМАТААР гарна. Зурагтай байсан бол шинэ курс
 *     бүр "зураггүй" харагдана.
 *   • PWA нь `public/` доторх бүхнийг precache хийдэг (`next.config.ts`) тул
 *     40 курсын зураг нь суулгах үеийн трафикт шууд нэмэгдэнэ.
 *   • Хар/цагаан горимд өөрөө зохицно — растр зураг тэгэхгүй.
 *
 * ⚠ Налуу дэвсгэрийг Tailwind-ийн `from-${color}` гэж УГСАРЧ БОЛОХГҮЙ
 * (`lib/tactiq/theme.ts`-ийн тайлбарыг үзнэ үү) — Tailwind эх кодыг
 * текстээр сканнердах тул тийм класс CSS-д огт үүсэхгүй. Тиймээс өнгийг
 * ЯГ ЭНД, hex утгаар хүснэгтэд бичив.
 */

/**
 * ЗУРАГТ КОВЕР — курсын slug → `public/` доторх зам.
 *
 * ⚠ Дээрх тайлбар нь «яагаад зургийн файл БИШ, SVG вэ» гэдгийг
 * тайлбарладаг ба тэр үндэслэл ХЭВЭЭР: курс бүрт зураг ЗААВАЛ байх
 * шаардлагагүй, бүртгэлд байхгүй курс нь SVG ковероороо хэвийн
 * харагдана. Энэ бүртгэл нь зөвхөн ЗУРАГ БЭЛДСЭН курсуудад зориулагдсан
 * НЭМЭЛТ давхарга.
 *
 * ⚠ Зам нь `public/`-ээс эхэлсэн үнэмлэхүй зам байх ёстой, мөн файл нь
 * ҮНЭХЭЭР байх ёстой: Next.js-ийн `Image` нь байхгүй файлыг чимээгүй
 * алгасдаггүй, 404 зурна.
 *
 * ⚠ ЗУРГИЙГ СОЛИХ БОЛ ФАЙЛЫН НЭРИЙГ СОЛИНО (`chess-2.webp` → `chess-3.webp`).
 * Service worker нь `/images/**`-ийг CacheFirst-ээр 30 хоног барьдаг
 * (`next.config.ts`), тиймээс ижил нэрээр дарж бичвэл хэрэглэгчид хуучин
 * зургаа үзсээр байна.
 *
 * ⚠ ХЭМЖЭЭ: 400×160 (2.5:1). Коверын хайрцаг нь `h-32` бөгөөд картын
 * өргөнөөр сунадаг тул ойролцоогоор 2.5:1. Үүнээс НАРИЙН зураг өгвөл
 * `object-cover` нь хажуу талыг ТАЙРНА — баннер дээрх гарчиг, тайлбар
 * алдагдана.
 */
const COVER_IMAGES: Record<string, string> = {
  chess: "/images/covers/chess-2.webp",
  checkers: "/images/covers/checkers-2.webp",
  sudoku: "/images/covers/sudoku-2.webp",
  tangram: "/images/covers/tangram-2.webp",
  memory: "/images/covers/memory-2.webp",
  puzzle: "/images/covers/puzzle-2.webp",
  "kids-coding": "/images/covers/kids-coding-2.webp",
};

/** Ковер бүрийн налуу дэвсгэрийн хоёр өнгө (эхлэл → төгсгөл). */
const GRADIENTS: Record<ColorKey, [string, string]> = {
  violet: ["#8b5cf6", "#6366f1"],
  emerald: ["#10b981", "#059669"],
  amber: ["#f59e0b", "#f97316"],
  sky: ["#0ea5e9", "#2563eb"],
  rose: ["#f43f5e", "#e11d48"],
  indigo: ["#6366f1", "#4f46e5"],
  teal: ["#14b8a6", "#0d9488"],
  orange: ["#f97316", "#ea580c"],
};

/**
 * Курсын нэрээс ТОГТВОРТОЙ хэлбэрийн хувилбар сонгоно.
 *
 * ⚠ `Math.random()` ХЭРЭГЛЭХГҮЙ: дахин зурагдах бүрд чимэглэл нь үсрэх ба
 * server/client рендэрийн үр дүн зөрж, React-ийн hydration алдаа өгнө.
 */
function variantFor(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash % 3;
}

export function CourseCover({
  icon,
  color,
  seed,
  slug,
  className = "",
}: {
  icon: string;
  color: ColorKey;
  /** Хэлбэрийн хувилбар сонгох үр — ихэвчлэн курсын slug. */
  seed: string;
  /**
   * Курсын slug — СЭДЭВЧИЛСЭН зураг сонгоход (`CourseArt.tsx`). Заагаагүй
   * бол `seed`-ийг хэрэглэнэ (дуудагчид ихэвчлэн slug-ийг өгдөг).
   */
  slug?: string;
  className?: string;
}) {
  const [from, to] = GRADIENTS[color] ?? GRADIENTS.violet;
  const variant = variantFor(seed);
  const gradientId = `cover-${seed}`;
  /**
   * Сэдвийн зураг байвал ТҮҮНИЙГ, эс бөгөөс хуучин дүрст хувилбарыг.
   *
   * ⚠ Дүрс нь `courses.icon` баганаас ирдэг тул админы сонголтоос
   * хамаардаг — даам «өгөгдлийн сан» дүрстэй харагдах эвдрэл бодитоор
   * гарсан. Сэдвийн зураг нь тохиргооноос хамаарахгүй.
   */
  const art = courseArt(slug ?? seed);
  const photo = COVER_IMAGES[slug ?? seed];

  /*
   * ⚠ ЗУРАГ БАЙВАЛ ТЭР Л ХАНГАЛТТАЙ: налуу дэвсгэр, чимэглэл, SVG зураг
   * бүгд зурагны ард нуугдах тул тэднийг огт зурахгүй — нэмэлт DOM,
   * нэмэлт зурах ажил үүсгэхийн хэрэггүй.
   */
  if (photo) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image
          src={photo}
          alt=""
          fill
          aria-hidden
          /*
           * ⚠ Картын өргөн: гар утсан дээр бүтэн дэлгэц, `md`-ээс хоёр
           * багана, `lg`-ээс гурав (`courses/page.tsx`-ийн тор). Буруу
           * `sizes` нь хэт том файл татуулж, гар утсан дээр дэмий
           * трафик үүсгэнэ.
           */
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 320 160"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>

        <rect width="320" height="160" fill={`url(#${gradientId})`} />

        {/*
          Чимэглэл — цагаан тунгалаг хэлбэрүүд. Курс бүр өөр байрлалтай
          болсноор жагсаалт нь "нэг загвараар давтагдсан" мэдрэмж төрүүлэхгүй.
        */}
        {variant === 0 && (
          <g fill="#ffffff" opacity="0.14">
            <circle cx="270" cy="30" r="60" />
            <circle cx="40" cy="140" r="45" />
          </g>
        )}
        {variant === 1 && (
          <g fill="#ffffff" opacity="0.13">
            <rect x="210" y="-30" width="90" height="90" rx="18" transform="rotate(25 255 15)" />
            <rect x="-20" y="110" width="80" height="80" rx="16" transform="rotate(-15 20 150)" />
          </g>
        )}
        {variant === 2 && (
          <g stroke="#ffffff" strokeWidth="14" opacity="0.12" fill="none">
            <path d="M-20 130 Q 80 40 180 120 T 360 90" />
            <path d="M-20 170 Q 80 80 180 160 T 360 130" />
          </g>
        )}

        {/* Сэдвийн зураг — чимэглэлийн ДЭЭР, коверын төвд */}
        {art}
      </svg>

      {/*
        Сэдвийн зурагГҮЙ курст — дүрс нь дунд. Ковер нь картын "зураг" учир
        агуулга нь ганц, тод дохио байх ёстой. Цагаан дүрсний ард зөөлөн
        бөмбөлөг тавьснаар цайвар налуу дэвсгэр дээр ч ялгарна.
      */}
      {!art && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-white/20 backdrop-blur-[2px]">
            <Icon name={icon} className="size-9 text-white drop-shadow" />
          </span>
        </span>
      )}
    </div>
  );
}
