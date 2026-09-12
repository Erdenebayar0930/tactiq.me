/**
 * Бүртгэлийн "Та шатрын ямар туршлагатай вэ?" алхам — chess.com-ийн
 * ижил төстэй асуултын Монгол хувилбар. Үнэ цэн нь зөвхөн ЭХЛЭХ санал
 * болгохад (жишээ нь аль хичээлээс эхлэхийг зөвлөх) ашиглагдана.
 *
 * ⚠ Дүрсийг (♟♞♜♛) ЗОРИУДААР сонгосон — жирийн шатрын тэмдэг, ямар нэг
 * компанийн загвар биш, туршлага ихсэх тусам хөлгийн үнэ цэн өсдөгтэй адил
 * зурган дараалал өгнө.
 */
export type ChessExperience = "new" | "basics" | "tactics" | "tournament";

export const CHESS_EXPERIENCE_LEVELS: {
  id: ChessExperience;
  label: string;
  glyph: string;
}[] = [
  { id: "new", label: "Тоглож мэдэхгүй", glyph: "♟" },
  { id: "basics", label: "Дүрэм, үндсийг мэднэ", glyph: "♞" },
  { id: "tactics", label: "Стратеги, тактик мэднэ", glyph: "♜" },
  { id: "tournament", label: "Тэмцээнд оролцдог", glyph: "♛" },
];

/**
 * "Дасгалжуулагч сонгох" алхам — chess.com-ийн Mittens/David/Sloane гэх мэт
 * зохиогчийн эрхтэй дүрсийг ХУУЛБАРЛАХГҮЙн тулд өөрсдийн шинэ нэр + lucide
 * дүрс + өнгөөр орлуулав. Цэвэр загварчлал — сонголт нь хичээлийн агуулга,
 * ботын хүчинд НӨЛӨӨЛӨХГҮЙ.
 */
export type Coach = {
  id: string;
  name: string;
  blurb: string;
  /** `components/tactiq/Icon.tsx`-ийн `IconName` — тусад нь lucide импортлохгүйн тулд нэрээр л дамжуулна. */
  icon: string;
  /** Аватарын дэвсгэр градиент — Tailwind классын БҮТЭН мөр (`theme.ts`-тэй адил шалтгаанаар). */
  gradient: string;
};

export const COACHES: Coach[] = [
  {
    id: "bataa",
    name: "Багш Батаа",
    blurb: "Анхан шатны дүрмийг тайван тайлбарлана.",
    icon: "graduation",
    gradient: "from-sky-400 to-blue-600",
  },
  {
    id: "saraa",
    name: "Дасгалжуулагч Сараа",
    blurb: "Тактик, хослолыг дадлагажуулна.",
    icon: "sparkles",
    gradient: "from-pink-400 to-rose-600",
  },
  {
    id: "erdene",
    name: "Мастер Эрдэнэ",
    blurb: "Тэмцээний бэлтгэлд анхаарна.",
    icon: "crown",
    gradient: "from-amber-400 to-orange-600",
  },
  {
    id: "oyu",
    name: "Профессор Оюу",
    blurb: "Байрлалын тооцоог гүнзгий тайлбарлана.",
    icon: "brain",
    gradient: "from-purple-400 to-violet-600",
  },
  {
    id: "tumen",
    name: "Дайчин Түмэн",
    blurb: "Довтолгоо, довтолгооны төлөвлөгөө.",
    icon: "shield",
    gradient: "from-red-400 to-rose-700",
  },
  {
    id: "naran",
    name: "Од Наран",
    blurb: "Өдөр бүр жижиг зорилтоор урамшуулна.",
    icon: "star",
    gradient: "from-yellow-400 to-amber-600",
  },
  {
    id: "gerel",
    name: "Түлхүүр Гэрэл",
    blurb: "Хурдан хослол, мэт хийхэд анхаарна.",
    icon: "zap",
    gradient: "from-lime-400 to-emerald-600",
  },
  {
    id: "munkh",
    name: "Далай Мөнх",
    blurb: "Тайван, тэвчээртэй тоглоомд дасгана.",
    icon: "compass",
    gradient: "from-teal-400 to-cyan-600",
  },
];

export function isChessExperience(value: unknown): value is ChessExperience {
  return CHESS_EXPERIENCE_LEVELS.some((level) => level.id === value);
}

export function isCoachId(value: unknown): value is string {
  return COACHES.some((coach) => coach.id === value);
}
