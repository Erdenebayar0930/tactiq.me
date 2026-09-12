import { BRAND_SHORT, BRAND_TAGLINE } from "@/lib/brand";

/**
 * Daamal-ийн туслах дүр — хаан таг бүхий "пон" дүрст маскот.
 *
 * ЯАГААД SVG ВЭ: загварын 3D дүрс нь бидэнд өгөгдөөгүй. Байхгүй зураг руу
 * заасан `<Image>` нь эвдэрсэн зураг харуулж, апп дуусаагүй мэт сэтгэгдэл
 * төрүүлнэ. Инлайн SVG нь ямар ч файлаас хамаарахгүй, хэмжээ өөрчлөхөд
 * гажихгүй, харанхуй горимд өөрөө тохирно. Хожим жинхэнэ дүрс бэлэн болмогц
 * ЗӨВХӨН энэ файлыг солино — дуудагч талууд өөрчлөгдөхгүй.
 *
 * ЯАГААД CSS-ANIMATION, "use client" БИШ: энэ дүрийг (site) нүүр хуудас,
 * 404, unauthorized зэрэг ЗОРИУДААР серверийн компонент хэвээр үлдсэн
 * хуудсууд ашигладаг (тэдгээрийн коммент харна уу). `useEffect`/`useState`
 * нэмбэл "use client" шаардлагатай болж, тэдгээр хуудсыг клиент бандл руу
 * чирнэ. Харин CSS keyframe нь HTML-тэй хамт сервэрээс шууд ирж, JS-гүйгээр
 * ажилладаг тул амьд хөдөлгөөнийг үнэ төлбөргүй авч болно.
 */
export function Mascot({
  className = "size-24",
  mood = "happy",
  animated = true,
}: {
  className?: string;
  /** happy — ердийн, cheer — амжилт, think — асуулт бодож буй */
  mood?: "happy" | "cheer" | "think";
  /** false бол бүх хөдөлгөөнийг унтраана (жишээ нь: тогтмол зурган контекст) */
  animated?: boolean;
}) {
  const anim = animated ? mood : "none";

  return (
    <svg
      viewBox="0 0 120 140"
      className={className}
      role="img"
      aria-label={`${BRAND_SHORT} туслах`}
    >
      <defs>
        <linearGradient id="tactiq-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="tactiq-crown" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="tactiq-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8f5ee" />
          <stop offset="100%" stopColor="#ddd6c4" />
        </linearGradient>
        <radialGradient id="tactiq-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <filter id="tactiq-blur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>

      {/* Хөдөлгөөнгүй үед ч "газардсан" мэт харагдуулах сүүдэр — амьсгалж буй мэт бага зэрэг агшина */}
      <ellipse
        className="tactiq-mascot-shadow"
        data-anim={anim}
        cx="60"
        cy="134"
        rx="26"
        ry="5"
        fill="#000"
        opacity="0.16"
      />

      <g className="tactiq-mascot-body" data-anim={anim}>
        {/* Хаан таг — шатрын дүрийг илэрхийлнэ */}
        <circle
          className="tactiq-mascot-antenna-glow"
          data-anim={anim}
          cx="60"
          cy="10"
          r="13"
          fill="url(#tactiq-glow)"
          filter="url(#tactiq-blur)"
        />
        <path
          d="M40 22 L40 10 L50 18 L60 4 L70 18 L80 10 L80 22 Z"
          fill="url(#tactiq-crown)"
        />
        <rect x="38" y="20" width="44" height="6" rx="3" fill="url(#tactiq-crown)" />
        <circle cx="40" cy="10" r="2.6" fill="#fff7d6" />
        <circle cx="60" cy="4" r="3" fill="#fff7d6" />
        <circle cx="80" cy="10" r="2.6" fill="#fff7d6" />

        {/* Толгой */}
        <circle cx="60" cy="55" r="34" fill="url(#tactiq-head)" />
        {/* Гялбаа — гялгар гадаргуутай мэт харагдуулна */}
        <path
          d="M30 42 q12 -22 42 -20"
          fill="none"
          stroke="#fff"
          strokeOpacity="0.22"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Хацар */}
        <circle cx="35" cy="61" r="5" fill="#fb923c" opacity="0.35" />
        <circle cx="85" cy="61" r="5" fill="#fb923c" opacity="0.35" />

        {/* Нүд ба ам — mood-оор өөрчлөгдөнө */}
        <g className="tactiq-mascot-eyes" data-anim={anim}>
          {mood === "cheer" ? (
            <>
              <path
                d="M42 52 Q46 45 50 52"
                fill="none"
                stroke="#12306b"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path
                d="M70 52 Q74 45 78 52"
                fill="none"
                stroke="#12306b"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path d="M45 62 Q60 79 75 62 Q60 71 45 62 Z" fill="#12306b" />
            </>
          ) : mood === "think" ? (
            <>
              <circle cx="46" cy="51" r="4.2" fill="#12306b" />
              <path d="M70 51 h8" stroke="#12306b" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M68 42 L80 45" stroke="#12306b" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="60" cy="67" r="3.4" fill="none" stroke="#12306b" strokeWidth="2.6" />
            </>
          ) : (
            <>
              <circle cx="46" cy="51" r="4.2" fill="#12306b" />
              <circle cx="74" cy="51" r="4.2" fill="#12306b" />
              <path
                d="M47 63 Q60 72 73 63"
                fill="none"
                stroke="#12306b"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
            </>
          )}
        </g>

        {/* Гар — баярлах үед даллана, бодох үед хөдөлгөөнгүй */}
        <g
          className="tactiq-mascot-arm tactiq-mascot-arm-left"
          data-anim={anim}
          style={{ transformOrigin: "26px 96px" }}
        >
          <rect x="14" y="93" width="20" height="8" rx="4" fill="url(#tactiq-base)" />
          <circle cx="14" cy="97" r="6" fill="#f59e0b" />
        </g>
        <g
          className="tactiq-mascot-arm tactiq-mascot-arm-right"
          data-anim={anim}
          style={{ transformOrigin: "94px 96px" }}
        >
          <rect x="86" y="93" width="20" height="8" rx="4" fill="url(#tactiq-base)" />
          <circle cx="106" cy="97" r="6" fill="#f59e0b" />
        </g>

        {/* Бие — пон дүрсийн суурь мэт доош тэлнэ */}
        <path
          d="M32 90 h56 a6 6 0 0 1 6 6 l-6 34 a6 6 0 0 1 -6 5 H38 a6 6 0 0 1 -6 -5 l-6 -34 a6 6 0 0 1 6 -6 z"
          fill="url(#tactiq-base)"
        />
        <path
          d="M32 90 h56 a6 6 0 0 1 6 6 l-1 6 H27 l-1 -6 a6 6 0 0 1 6 -6 z"
          fill="#c9c0a8"
        />

        {/* Цээжин дэх бяцхан пон дүрс — брэндийн тэмдэг */}
        <circle cx="60" cy="110" r="5" fill="#1d4ed8" />
        <path d="M55 114 L65 114 L62 120 L58 120 Z" fill="#1d4ed8" />
        <rect x="52" y="119" width="16" height="4" rx="2" fill="#1d4ed8" />

        {/* Баярлах үед л гарч ирэх гялбаа од — эсрэгээрээ бусад mood-д огт зурагдахгүй */}
        {mood === "cheer" && (
          <g className="tactiq-mascot-sparkles" data-anim={anim} fill="#fbbf24">
            <Spark x={14} y={26} delay="0s" />
            <Spark x={104} y={30} delay="0.35s" />
            <Spark x={96} y={92} delay="0.6s" />
          </g>
        )}

        {/* Бодох үед л гарч ирэх "?" бөмбөлөг */}
        {mood === "think" && (
          <g className="tactiq-mascot-thought" data-anim={anim}>
            <circle cx="98" cy="14" r="9" fill="#fff" stroke="#bfdbfe" strokeWidth="1.5" />
            <text
              x="98"
              y="18"
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              fontWeight="700"
              fill="#1d4ed8"
            >
              ?
            </text>
          </g>
        )}
      </g>

      <style>{`
        .tactiq-mascot-body[data-anim="happy"],
        .tactiq-mascot-body[data-anim="cheer"],
        .tactiq-mascot-body[data-anim="think"] {
          transform-box: fill-box;
          transform-origin: center;
        }
        .tactiq-mascot-body[data-anim="happy"] { animation: tactiq-float 3.2s ease-in-out infinite; }
        .tactiq-mascot-body[data-anim="cheer"] { animation: tactiq-bounce 0.7s ease-in-out infinite; }
        .tactiq-mascot-body[data-anim="think"] { animation: tactiq-tilt 2.6s ease-in-out infinite; }

        .tactiq-mascot-shadow[data-anim="happy"],
        .tactiq-mascot-shadow[data-anim="cheer"],
        .tactiq-mascot-shadow[data-anim="think"] {
          transform-box: fill-box;
          transform-origin: center;
          animation: tactiq-shadow 3.2s ease-in-out infinite;
        }
        .tactiq-mascot-shadow[data-anim="cheer"] { animation-duration: 0.7s; }

        .tactiq-mascot-eyes[data-anim="happy"],
        .tactiq-mascot-eyes[data-anim="think"] {
          transform-box: fill-box;
          transform-origin: center;
          animation: tactiq-blink 4.5s ease-in-out infinite;
        }

        .tactiq-mascot-antenna-glow[data-anim="happy"],
        .tactiq-mascot-antenna-glow[data-anim="cheer"],
        .tactiq-mascot-antenna-glow[data-anim="think"] {
          animation: tactiq-glow 2s ease-in-out infinite;
        }
        .tactiq-mascot-antenna-glow[data-anim="cheer"] { animation-duration: 0.6s; }

        .tactiq-mascot-arm[data-anim="cheer"] {
          transform-box: fill-box;
          animation: tactiq-wave 0.6s ease-in-out infinite;
        }
        .tactiq-mascot-arm-right[data-anim="cheer"] { animation-direction: reverse; }

        .tactiq-mascot-sparkles:not([data-anim="none"]) circle {
          animation: tactiq-sparkle 1.2s ease-in-out infinite;
        }

        .tactiq-mascot-thought[data-anim="think"] {
          transform-box: fill-box;
          transform-origin: center;
          animation: tactiq-pop 2.6s ease-in-out infinite;
        }

        @keyframes tactiq-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes tactiq-bounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-9px) rotate(-2deg); }
        }
        @keyframes tactiq-tilt {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes tactiq-shadow {
          0%, 100% { transform: scaleX(1); opacity: 0.16; }
          50% { transform: scaleX(0.82); opacity: 0.1; }
        }
        @keyframes tactiq-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          96% { transform: scaleY(0.1); }
        }
        @keyframes tactiq-glow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }
        @keyframes tactiq-wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(20deg); }
        }
        @keyframes tactiq-pop {
          0%, 100% { transform: scale(1) translateY(0); opacity: 1; }
          50% { transform: scale(1.08) translateY(-2px); opacity: 0.85; }
        }
        @keyframes tactiq-sparkle {
          0%, 100% { transform: scale(0.6); opacity: 0.25; }
          50% { transform: scale(1); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .tactiq-mascot-body, .tactiq-mascot-shadow, .tactiq-mascot-eyes,
          .tactiq-mascot-antenna-glow, .tactiq-mascot-arm, .tactiq-mascot-thought,
          .tactiq-mascot-sparkles circle {
            animation: none !important;
          }
        }
      `}</style>
    </svg>
  );
}

function Spark({ x, y, delay }: { x: number; y: number; delay: string }) {
  return <circle cx={x} cy={y} r="2.5" style={{ animationDelay: delay }} />;
}

/**
 * Daamal.org-ийн тэмдэг — градиент хавтан дээрх "D" монограмм.
 *
 * Үсгийн нүхийг (counter) ЗУРААГҮЙ, харин `fillRule="evenodd"`-оор ХАЙЧИЛСАН
 * нь чухал: тэр нүхэнд ард байгаа градиент шууд харагдана. Нүхийг тодорхой
 * өнгөөр дүүргэсэн бол хавтангийн градиенттай яг тааруулах шаардлагатай
 * болж, лого хэмжээ өөрчлөгдөх бүрт зөрөх байв.
 */
export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 via-brand-500 to-xp-500 shadow-sm ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" aria-hidden>
        {/* "D" — гадна контур ба доторх нүх нэг зам дээр, evenodd-оор хайчилна */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M5.6 4.2h5.6a7.8 7.8 0 0 1 0 15.6H5.6V4.2Zm3.6 3.4v8.8h2a4.4 4.4 0 0 0 0-8.8h-2Z"
          fill="#fff"
        />
        {/* Ирээдүй рүү заасан жижиг хошуу — логоны ганц дулаан бус өргөлт */}
        <path d="M5.6 4.2h4.3L5.6 10.9V4.2Z" fill="#34d399" />
      </svg>
    </span>
  );
}

/**
 * Брэндийн лого — тэмдэг ба нэр.
 *
 * `compact` горимд зөвхөн тэмдгийг зурна (хажуугийн цэс хумигдсан, хөл
 * хэсэг зэрэг зайгүй байрлал).
 *
 * ⚠ `tone` нь бичвэрийн өнгийг л шийднэ. `light` нь ХАРАНХУЙ дэвсгэрт
 * (hero, хөл хэсэг) — тэнд `dark:` хувилбар ажиллахгүй, учир нь тэр
 * гадаргуу нь гэрэлт горимд ч харанхуй хэвээр байдаг.
 */
export function Logo({
  className = "",
  compact = false,
  compactOnMobile = false,
  tagline = false,
  tone = "auto",
}: {
  className?: string;
  compact?: boolean;
  /**
   * Гар утсанд ЗӨВХӨН тэмдэг, `sm`-ээс дээш нэртэйгээ.
   *
   * ⚠ `compact`-аас ЯЛГААТАЙ: тэр нь нэрийг БҮРЭН хасдаг (JS), энэ нь
   * CSS-ээр нууна. Хоёр `<Logo>`-г `hidden sm:inline-flex` /`sm:hidden`-
   * ээр сольж БОЛОХГҮЙ — доорх уриан дээрх тайлбарт бичсэн шалтгаанаар
   * гаднаас өгсөн `hidden` нь энэ компонентын `inline-flex`-д дарагдана.
   * Тиймээс нуулт нь ЗААВАЛ энд, нэрийн блок дээр хийгдэнэ.
   */
  compactOnMobile?: boolean;
  /** Нэрийн доор брэндийн уриа — зөвхөн өргөн байрлалд (толгой, хөл) */
  tagline?: boolean;
  tone?: "auto" | "light";
}) {
  const nameColor =
    tone === "light" ? "text-white" : "text-gray-900 dark:text-white";
  const taglineColor =
    tone === "light" ? "text-white/60" : "text-gray-500 dark:text-gray-400";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={tagline ? "size-10" : "size-9"} />
      {!compact && (
        <span
          className={`flex-col leading-none ${
            compactOnMobile ? "hidden sm:flex" : "flex"
          }`}
        >
          <span className={`text-lg font-bold tracking-tight ${nameColor}`}>
            {BRAND_SHORT}
            <span className="text-brand-400">.org</span>
          </span>
          {/* ⚠ Уриа нь `sm` доош НУУГДАНА. 500px өргөнтэй дэлгэц дээр
              лого(уриатай) + "Нэвтрэх" + "Эхлэх" гурав толгойд багтахгүй.
              Нуултыг ЭНД, уриан дээр нь хийсэн нь чухал: гаднаас хоёр
              `<Logo>`-г `hidden sm:inline-flex` / `sm:hidden`-ээр сольж
              болохгүй — энэ компонентын үндсэн `inline-flex` нь Tailwind-ийн
              CSS дараалалд `hidden`-ээс ХОЙНО гарч ирдэг тул `hidden`-ийг
              дарж, хоёулаа зэрэг харагдана. */}
          {tagline && (
            <span className={`mt-1 hidden text-[10px] font-medium sm:block ${taglineColor}`}>
              {BRAND_TAGLINE}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
