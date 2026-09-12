import { Brain, Code, Globe, MessagesSquare, Palette, Rocket } from "lucide-react";

import type { LucideIcon } from "lucide-react";

/**
 * Daamal.org-ийн ЗУРГААН СУРГУУЛЬ — платформын дээд түвшний бүтэц.
 *
 * ⚠ Энэ нь `courses` ХҮСНЭГТЭЭС ӨӨР давхарга. Ялгаа нь:
 *
 *   • СУРГУУЛЬ (энэ файл) — брэндийн бүтэц. Тогтмол зургаа, кодод бичигдсэн.
 *     Нүүр хуудас, цэс, бүлэглэлт эндээс уншина.
 *
 *     ⚠ ЖАГСААЛТ нь админаас өөрчлөгддөггүй (нэмэх/устгах/дараалал байхгүй),
 *     харин ТЕКСТ нь өөрчлөгдөнө: `school_texts` хүснэгт нь нэр, тайлбар,
 *     сэдвүүдийг дарж бичнэ (`mergeSchoolTexts` доор). Энэ файл нь ҮРГЭЛЖ
 *     хүчинтэй анхдагч — засвар нь хоосон эсвэл байхгүй бол эндээс уншина.
 *   • КУРС (`courses` хүснэгт) — ЗААХ АГУУЛГА. Админ нэмж, засаж, устгана.
 *     Курс бүр `school` баганаар аль сургуульд харьяалагдахаа хэлнэ.
 *
 * Хоёуланг нэг хүснэгтэд нийлүүлбэл админ санамсаргүй "Codely"-г устгаад
 * нүүр хуудсыг цоорхойтой болгоно. Тусад нь байснаар агуулга нь хоосон ч
 * сургууль өөрөө зогсож байна — "тун удахгүй" гэж шударгаар харагдана.
 *
 * ЯАГААД GRADIENT КЛАСС ИЛ БИЧСЭН БЭ: Tailwind нь эх кодыг ТЕКСТЭЭР
 * сканнердана — `` `from-${color}-500` `` гэж угсарсан класс CSS-д огт
 * үүсэхгүй (`lib/tactiq/theme.ts`-ийн адил шалтгаан).
 */

/** Сургуулийн доторх сэдвийн бүлэг — "Codely → Coding → Python, Scratch…" */
export type TopicGroup = {
  /** Ганц бүлэгтэй сургуульд `null` — нэмэлт гарчиг нүдийг дэмий чимхэнэ */
  title: string | null;
  topics: string[];
};

export type School = {
  /** `courses.school` баганын утга. Өөрчилвөл MIGRATION хэрэгтэй. */
  slug: string;
  /** Богино нэр — цэс, карт, тэмдэг */
  title: string;
  /** Нэрийн доорх монгол тайлбар */
  subtitle: string;
  /** Картын дор гарах нэг мөр */
  tagline: string;
  description: string;
  Icon: LucideIcon;
  gradient: string;
  glow: string;
  /** Зөөлөн хувилбар — цайвар дэвсгэр дээрх тэмдэг, шошгонд */
  softBg: string;
  softText: string;
  groups: TopicGroup[];
};

export const SCHOOLS: School[] = [
  {
    slug: "mind",
    title: "Mind",
    subtitle: "Оюун ухаан",
    tagline: "Математик · Шатар · Даам · Го · Логик",
    description:
      "Асуудлыг задалж, дараалалтай бодох чадвар. Тоо, логик, стратегийн " +
      "тоглоом — бүгд нэг зорилгод: зөв бодох.",
    Icon: Brain,
    gradient: "from-indigo-500 to-violet-700",
    glow: "shadow-violet-600/25",
    softBg: "bg-indigo-50 dark:bg-indigo-500/15",
    softText: "text-indigo-700 dark:text-indigo-300",
    groups: [
      {
        title: null,
        topics: [
          "Математик",
          "Логик",
          "Шатар",
          "Даам",
          "Го",
          "Puzzle",
          "Асуудал шийдэх",
          "Шүүмжлэлт сэтгэлгээ",
          "Санах ой",
          "Стратеги",
        ],
      },
    ],
  },
  {
    slug: "codely",
    title: "Codely",
    subtitle: "Код ба технологи",
    tagline: "Програмчлал · Game · App · AI",
    description:
      "Компьютерийн үндсээс эхлээд өөрийн апп, тоглоом бүтээх хүртэл. " +
      "AI-г хэрэглэгч биш, бүтээгчийн нүдээр.",
    Icon: Code,
    gradient: "from-cyan-400 to-sky-600",
    glow: "shadow-sky-500/25",
    softBg: "bg-sky-50 dark:bg-sky-500/15",
    softText: "text-sky-700 dark:text-sky-300",
    groups: [
      {
        title: "Эхлэл",
        topics: [
          "Компьютер гэж юу вэ?",
          "Гар, хулгана",
          "Файл ба хавтас",
          "Интернэт",
          "Дижитал аюулгүй байдал",
        ],
      },
      {
        title: "Coding",
        topics: [
          "Scratch",
          "Python",
          "HTML/CSS",
          "JavaScript",
          "Git/GitHub",
          "App хөгжүүлэлт",
          "Game хөгжүүлэлт",
        ],
      },
      {
        title: "AI",
        topics: [
          "AI гэж юу вэ?",
          "Prompt бичих",
          "AI-тай зөв ажиллах",
          "AI-гаар бүтээл хийх",
          "AI ёс зүй",
        ],
      },
    ],
  },
  {
    slug: "itkids",
    title: "ITkids",
    subtitle: "Дижитал иргэн",
    tagline: "Компьютер · Интернэт · Кибер аюулгүй байдал",
    description:
      "Хүүхэд бүрийн заавал мэдэх зүйлс: аюулгүй нэвтрэх, залилан таних, " +
      "хувийн мэдээллээ хамгаалах, мэдээллийг шалгах.",
    Icon: Globe,
    gradient: "from-blue-500 to-indigo-700",
    glow: "shadow-indigo-600/25",
    softBg: "bg-blue-50 dark:bg-blue-500/15",
    softText: "text-blue-700 dark:text-blue-300",
    groups: [
      {
        title: null,
        topics: [
          "Интернэтийн аюулгүй байдал",
          "Кибер аюулгүй байдал",
          "Нууц үгийн хамгаалалт",
          "Хувийн мэдээлэл",
          "Залилан таних",
          "Сошиал ёс зүй",
          "Google Workspace",
          "Microsoft Office",
          "Cloud",
          "Дижитал иргэншил",
          "Мэдээлэл шалгах",
        ],
      },
    ],
  },
  {
    slug: "create",
    title: "Create",
    subtitle: "Бүтээлч чадвар",
    tagline: "Бичиг · Дизайн · Урлаг",
    description:
      "Монгол бичгээс эхлээд дизайн, гэрэл зураг, видео хүртэл — санаагаа " +
      "гараар, дэлгэцээр, дуугаар илэрхийлэх.",
    Icon: Palette,
    gradient: "from-pink-400 to-rose-500",
    glow: "shadow-pink-500/25",
    softBg: "bg-pink-50 dark:bg-pink-500/15",
    softText: "text-pink-700 dark:text-pink-300",
    groups: [
      {
        title: "Calligraphy",
        topics: [
          "Монгол бичиг",
          "Кирилл бичиг",
          "Англи бичиг",
          "Гар бичмэл",
          "Typography",
        ],
      },
      {
        title: "Урлаг ба медиа",
        topics: [
          "Зурах",
          "Дизайн",
          "Гэрэл зураг",
          "Видео засвар",
          "Хөгжим",
          "Storytelling",
        ],
      },
    ],
  },
  {
    slug: "life",
    title: "Life",
    subtitle: "Амьдралын ур чадвар",
    tagline: "Харилцаа · Дадал · Манлайлал",
    description:
      "Өөрийгөө таних, илэрхийлэх, багаар ажиллах. Цаг, зорилго, дадлаа " +
      "өөрөө удирдах чадвар.",
    Icon: MessagesSquare,
    gradient: "from-emerald-400 to-teal-600",
    glow: "shadow-emerald-500/25",
    softBg: "bg-emerald-50 dark:bg-emerald-500/15",
    softText: "text-emerald-700 dark:text-emerald-300",
    groups: [
      {
        title: "Харилцаа",
        topics: [
          "Өөрийгөө таних",
          "Өөртөө итгэх",
          "Илтгэх",
          "Сонсох",
          "Багаар ажиллах",
          "Зөрчил шийдвэрлэх",
        ],
      },
      {
        title: "Амьдрал",
        topics: [
          "Цагийн менежмент",
          "Зорилго тавих",
          "Дадал бий болгох",
          "Өдөр төлөвлөх",
          "Шийдвэр гаргах",
        ],
      },
    ],
  },
  {
    slug: "future",
    title: "Future",
    subtitle: "Ирээдүй ба карьер",
    tagline: "Санхүү · Бизнес · Карьер",
    description:
      "Өсвөр наснаас мөнгө, төсөв, бизнесийн үндэс. Өөрийн портфолио, " +
      "карьерийн замаа эрт эхлүүлэх.",
    Icon: Rocket,
    gradient: "from-amber-400 to-orange-600",
    glow: "shadow-orange-500/25",
    softBg: "bg-amber-50 dark:bg-amber-500/15",
    softText: "text-amber-700 dark:text-amber-300",
    groups: [
      {
        title: null,
        topics: [
          "Санхүүгийн боловсрол",
          "Орлого, зарлага",
          "Хадгаламж",
          "Төсөв",
          "Entrepreneurship",
          "Бизнесийн үндэс",
          "Marketing",
          "Personal branding",
          "Freelancing",
          "Карьер судлах",
        ],
      },
    ],
  },
];

/**
 * Админ талаас засаж болох ТЕКСТ — `school_texts` хүснэгтийн мөр.
 *
 * `null`/`undefined` багана = «кодын анхдагчийг хэрэглэ». Зориуд: админ
 * талбарыг хоослоход сургуулийн нэр хоосон болж нүүр хуудас эвдрэхгүй,
 * харин анхдагч утга руугаа буцна.
 */
export type SchoolText = {
  slug: string;
  title?: string | null;
  subtitle?: string | null;
  tagline?: string | null;
  description?: string | null;
  groups?: TopicGroup[] | null;
};

/** Хоосон, зөвхөн зайнаас тогтсон утгыг «заагаагүй» гэж үзнэ. */
function pick(override: string | null | undefined, fallback: string): string {
  const trimmed = override?.trim();
  return trimmed ? trimmed : fallback;
}

/**
 * Кодын `SCHOOLS`-ийг админы засвартай нийлүүлнэ.
 *
 * ⚠ ЖАГСААЛТЫГ ӨӨРЧЛӨХГҮЙ — урт, дараалал, `slug`, дүрс, өнгө бүгд кодын
 * хэвээр. Зөвхөн текст дарж бичигдэнэ. Танихгүй `slug`-тай засвар
 * (сургуулийг кодоос хассан үед) чимээгүй алгасагдана.
 *
 * Клиент, сервер ХОЁУЛАНД дуудагдана: дүрс нь React компонент тул
 * өгөгдлийн сангаар дамжуулах боломжгүй — клиент өөрөө кодын жагсаалттай
 * нийлүүлдэг байх ёстой.
 */
export function mergeSchoolTexts(texts: readonly SchoolText[]): School[] {
  if (texts.length === 0) return SCHOOLS;

  const bySlug = new Map(texts.map((text) => [text.slug, text]));

  return SCHOOLS.map((school) => {
    const text = bySlug.get(school.slug);
    if (!text) return school;

    return {
      ...school,
      title: pick(text.title, school.title),
      subtitle: pick(text.subtitle, school.subtitle),
      tagline: pick(text.tagline, school.tagline),
      description: pick(text.description, school.description),
      // Хоосон массив нь ХҮЧИНТЭЙ засвар (сэдвээ бүгдийг авсан) тул
      // `length`-ээр биш `null` эсэхээр шалгана.
      groups: text.groups ?? school.groups,
    };
  });
}

/** Сургуулийн нийт сэдвийн тоо — картан дээр "24 сэдэв" гэж харуулна. */
export function topicCount(school: School): number {
  return school.groups.reduce((sum, group) => sum + group.topics.length, 0);
}

export function findSchool(slug: string | null | undefined): School | null {
  return SCHOOLS.find((school) => school.slug === slug) ?? null;
}

/**
 * Курс аль сургуульд ч харьяалагдаагүй үед (админ `school`-гүй курс үүсгэвэл)
 * түүнийг хаях биш, ЭНЭ бүлэгт цуглуулна — эс бөгөөс `/courses` дэлгэцээс
 * чимээгүйхэн алга болно.
 */
export const UNGROUPED_LABEL = "Бусад";
