/**
 * КУРСЫН СЭДЭВЧИЛСЭН ЗУРАГ — ковер дээр зурагдах SVG чимэглэл.
 *
 * ⚠ ЯАГААД ХЭРЭГТЭЙ ВЭ: ковер дээр урьд нь ЗӨВХӨН lucide дүрс байсан ба
 * тэр нь `courses.icon` баганаас ирдэг. Админ дүрсээ сонгоогүй/буруу
 * сонгосон бол даам нь «өгөгдлийн сан» дүрстэй, го нь «цэгтэй тойрог»
 * дүрстэй гарч, карт нь агуулгаа ОГТ хэлэхгүй байв (жагсаалт дээр яг ийм
 * зөрүү илэрсэн). Энэ файл нь сэдвийг өөрөө зурна — тохиргооноос
 * хамаарахгүй.
 *
 * ⚠ Растр зураг БИШ, SVG: коверын бусад хэсэгтэй ижил шалтгаан
 * (`CourseCover.tsx`-ийн тайлбар) — файл нэмэхгүй, PWA-гийн precache
 * өсөхгүй, ямар ч хэмжээнд цэвэр.
 *
 * Зураг бүр 320×160 коверын ТӨВД (160, 80) төвлөрнө.
 */

/** Хөлөгт тоглоомын жижиг самбар — шатар, даамд хуваалцана. */
function MiniBoard({ dark = "#ffffff" }: { dark?: string }) {
  const cells = [];
  const size = 17;
  const startX = 160 - size * 2;
  const startY = 80 - size * 2;

  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      if ((row + col) % 2 === 0) continue;
      cells.push(
        <rect
          key={`${row}-${col}`}
          x={startX + col * size}
          y={startY + row * size}
          width={size}
          height={size}
          fill={dark}
          opacity="0.5"
        />
      );
    }
  }

  return (
    <g>
      <rect
        x={startX - 3}
        y={startY - 3}
        width={size * 4 + 6}
        height={size * 4 + 6}
        rx="6"
        fill="#ffffff"
        opacity="0.25"
      />
      {cells}
    </g>
  );
}

/** ШАТАР — самбар дээр хааны дүрс. */
const ChessArt = () => (
  <g>
    <MiniBoard />
    {/*
      Хааны бүдүүвч — самбарын ДЭЭГҮҮР, тод цагаанаар.

      ⚠ Хүрээ (`stroke`) нь зориуд: самбарын цайвар нүд дээр цэвэр цагаан
      дүрс уусдаг тул бараан контур нь хэлбэрийг тодруулна.
    */}
    <g transform="translate(160 80)" fill="#ffffff" stroke="#1f2937" strokeWidth="2" strokeLinejoin="round">
      <path d="M-16 20 h32 l-4 12 h-24 z" />
      <path d="M-11 -4 h22 l-4 24 h-14 z" />
      <path d="M-18 -20 l7 12 h22 l7 -12 l-5 16 h-26 z" />
      <circle cy="-26" r="5" />
    </g>
  </g>
);

/** ДААМ — самбар дээр гурван бөөрөнхий чулуу. */
const DraughtsArt = () => (
  <g>
    <MiniBoard />
    {/*
      ⚠ Чулуунууд ХОЁР ӨНГӨТЭЙ: цагаан самбар дээр цагаан чулуу уусдаг тул
      бараан өрсөлдөгчийн чулуу нь тоглоомыг «даам» гэж таниулна.
    */}
    <g transform="translate(160 82)" stroke="#1f2937" strokeWidth="1.5">
      <ellipse cx="-20" cy="8" rx="13" ry="6" fill="#1f2937" />
      <ellipse cx="-20" cy="3" rx="13" ry="6" fill="#374151" />
      <ellipse cx="18" cy="12" rx="13" ry="6" fill="#ffffff" />
      <ellipse cx="18" cy="7" rx="13" ry="6" fill="#f9fafb" />
      <ellipse cx="-2" cy="-6" rx="14" ry="6.5" fill="#ffffff" />
      <ellipse cx="-2" cy="-11" rx="14" ry="6.5" fill="#f9fafb" />
    </g>
  </g>
);

/** ГО — шугамын огтлолцол дээрх хар/цагаан чулуу. */
const GoArt = () => {
  const step = 16;
  const start = 160 - step * 2;
  const top = 80 - step * 2;
  const lines = [];

  for (let index = 0; index < 5; index += 1) {
    lines.push(
      <line
        key={`h${index}`}
        x1={start}
        y1={top + index * step}
        x2={start + step * 4}
        y2={top + index * step}
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.7"
      />,
      <line
        key={`v${index}`}
        x1={start + index * step}
        y1={top}
        x2={start + index * step}
        y2={top + step * 4}
        stroke="#ffffff"
        strokeWidth="1.5"
        opacity="0.7"
      />
    );
  }

  return (
    <g>
      <rect
        x={start - 12}
        y={top - 12}
        width={step * 4 + 24}
        height={step * 4 + 24}
        rx="8"
        fill="#ffffff"
        opacity="0.18"
      />
      {lines}
      <circle cx={start + step} cy={top + step} r="7" fill="#1f2937" />
      <circle cx={start + step * 2} cy={top + step * 2} r="7" fill="#ffffff" />
      <circle cx={start + step * 3} cy={top + step} r="7" fill="#1f2937" />
      <circle cx={start + step * 2} cy={top + step * 3} r="7" fill="#ffffff" />
    </g>
  );
};

/** МАТЕМАТИК — үйлдлийн тэмдгүүд. */
const MathArt = () => (
  <g fill="#ffffff">
    <g transform="translate(160 80)">
      <rect x="-46" y="-24" width="40" height="40" rx="10" opacity="0.25" />
      <rect x="6" y="-24" width="40" height="40" rx="10" opacity="0.25" />
      {/* + */}
      <rect x="-30" y="-12" width="8" height="24" rx="2" />
      <rect x="-38" y="-4" width="24" height="8" rx="2" />
      {/* × */}
      <rect x="22" y="-12" width="8" height="24" rx="2" transform="rotate(45 26 0)" />
      <rect x="14" y="-4" width="24" height="8" rx="2" transform="rotate(45 26 0)" />
    </g>
  </g>
);

/** ТӨГӨЛДӨР ХУУР — товчлуурын гар. */
const PianoArt = () => {
  const whiteKeys = [0, 1, 2, 3, 4, 5, 6];
  const blackKeys = [0, 1, 3, 4, 5];
  const width = 18;
  const startX = 160 - (whiteKeys.length * width) / 2;

  return (
    <g transform="translate(0 -6)">
      {whiteKeys.map((index) => (
        <rect
          key={`w${index}`}
          x={startX + index * width + 1}
          y={62}
          width={width - 2}
          height={46}
          rx="3"
          fill="#ffffff"
        />
      ))}
      {blackKeys.map((index) => (
        <rect
          key={`b${index}`}
          x={startX + index * width + width - 5}
          y={62}
          width={10}
          height={28}
          rx="2"
          fill="#1f2937"
        />
      ))}
    </g>
  );
};

/** СҮЛЖЭЭ — зангилаа, холбоос. */
const NetworkArt = () => (
  <g transform="translate(160 80)">
    <g stroke="#ffffff" strokeWidth="3" opacity="0.7">
      <line x1="0" y1="0" x2="-40" y2="-26" />
      <line x1="0" y1="0" x2="40" y2="-26" />
      <line x1="0" y1="0" x2="-40" y2="26" />
      <line x1="0" y1="0" x2="40" y2="26" />
    </g>
    <g fill="#ffffff">
      <circle cx="0" cy="0" r="14" />
      <circle cx="-40" cy="-26" r="8" />
      <circle cx="40" cy="-26" r="8" />
      <circle cx="-40" cy="26" r="8" />
      <circle cx="40" cy="26" r="8" />
    </g>
  </g>
);

/** ОНЬСОГО — эвлүүлдэг хэсэг. */
const PuzzleArt = () => (
  <g transform="translate(160 80)" fill="#ffffff">
    <path
      d="M-34 -34 h30 a10 10 0 0 1 20 0 h18 v18 a10 10 0 0 1 0 20 v18 h-18 a10 10 0 0 0 -20 0 h-30 v-30 a10 10 0 0 0 0 -20 z"
      opacity="0.95"
    />
  </g>
);

/** ПРОГРАМЧЛАЛ — код блокууд. */
const CodeArt = () => (
  <g transform="translate(160 80)" fill="#ffffff">
    <rect x="-58" y="-34" width="116" height="68" rx="10" opacity="0.22" />
    <g opacity="0.95">
      <rect x="-44" y="-20" width="34" height="7" rx="3.5" />
      <rect x="-44" y="-6" width="52" height="7" rx="3.5" opacity="0.8" />
      <rect x="-34" y="8" width="42" height="7" rx="3.5" opacity="0.65" />
      <path
        d="M22 -18 l14 12 l-14 12"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </g>
);

/** ЛОГИК — шатар шиг бус, «сэтгэх» дүрс: холбогдсон блокууд. */
const LogicArt = () => (
  <g transform="translate(160 80)" fill="#ffffff">
    <rect x="-52" y="-30" width="40" height="26" rx="8" opacity="0.9" />
    <rect x="12" y="-30" width="40" height="26" rx="8" opacity="0.55" />
    <rect x="-20" y="8" width="40" height="26" rx="8" opacity="0.75" />
    <g stroke="#ffffff" strokeWidth="3" opacity="0.7" fill="none">
      <path d="M-32 -4 v6 h32 v6" />
      <path d="M32 -4 v6 h-32 v6" />
    </g>
  </g>
);

/** ҮСЭГ / ХЭЛ — эхний үсгүүд. */
const LettersArt = ({ letters }: { letters: string[] }) => (
  <g transform="translate(160 80)">
    {letters.map((letter, index) => (
      <g key={letter} transform={`translate(${(index - (letters.length - 1) / 2) * 46} 0)`}>
        <rect x="-20" y="-24" width="40" height="48" rx="10" fill="#ffffff" opacity="0.92" />
        <text
          x="0"
          y="10"
          textAnchor="middle"
          fontSize="30"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          fill="#1f2937"
        >
          {letter}
        </text>
      </g>
    ))}
  </g>
);

/** БҮТЭЭЛ — будгийн хавтан. */
const PaletteArt = () => (
  <g transform="translate(160 80)">
    <path
      d="M0 -38 C 30 -38 52 -18 52 6 C 52 24 36 28 26 28 C 16 28 10 34 14 42 C 8 44 0 44 0 44 C -26 44 -48 24 -48 0 C -48 -22 -26 -38 0 -38 z"
      fill="#ffffff"
      opacity="0.95"
    />
    <circle cx="-22" cy="-6" r="7" fill="#ef4444" />
    <circle cx="-2" cy="-18" r="7" fill="#3b82f6" />
    <circle cx="20" cy="-8" r="7" fill="#22c55e" />
    <circle cx="-14" cy="18" r="7" fill="#eab308" />
  </g>
);

/**
 * Курсын slug → зураг.
 *
 * ⚠ Танихгүй slug-д `null` буцаана: тэр үед `CourseCover` нь хуучин
 * дүрст хувилбараа хэрэглэнэ. Ингэснээр админ ямар ч шинэ курс нэмэхэд
 * ковер нь ХООСОН харагдахгүй.
 */
export function courseArt(slug: string): React.ReactNode | null {
  switch (slug) {
    case "chess":
    case "chess-kids":
      return <ChessArt />;
    case "checkers":
      return <DraughtsArt />;
    case "go":
      return <GoArt />;
    case "math":
    case "math-kids":
      return <MathArt />;
    case "piano":
      return <PianoArt />;
    case "networks":
    case "computer-basics":
      return <NetworkArt />;
    case "puzzles":
      return <PuzzleArt />;
    case "logic-kids":
      return <LogicArt />;
    case "creative-kids":
      return <PaletteArt />;
    case "mongolian-kids":
      return <LettersArt letters={["А", "Б", "В"]} />;
    case "english-kids":
      return <LettersArt letters={["A", "B", "C"]} />;
    case "kids-coding":
    case "scratch":
    case "python":
    case "web":
    case "javascript":
    case "game-dev":
      return <CodeArt />;
    case "logic":
      return <LogicArt />;
    default:
      return null;
  }
}
