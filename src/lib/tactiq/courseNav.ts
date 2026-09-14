import { Bot, CircleDot, Swords } from "lucide-react";

import type { LucideIcon } from "lucide-react";

/**
 * КУРС ТУС БҮРИЙН тоглох горим — цэс, `/play` дэлгэц хоёулаа эндээс уншина.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: урьд нь цэс бүх хэрэглэгчид ИЖИЛ байсан ба `/play`
 * дэлгэц нь шатрын лобби, шатрын бот, дамын бот гурвыг ЗЭРЭГ харуулдаг байв.
 * Даам сурч буй хүүхэд эхлээд шатрын хоёр блокийг өнгөрөөж байж өөрийн
 * тоглоомдоо хүрдэг — сонгосон курс нь юуг ч өөрчилдөггүй тул "сонголт"
 * гэдэг нь утгагүй болсон байв.
 *
 * ⚠ ОНЛАЙН ТОГЛОЛТ ЗӨВХӨН ШАТАРТ БАЙНА. `/api/play/queue` ба `/play/[roomId]`
 * нь шатрын хөлөг дээр бүтсэн бөгөөд ялалт/хожигдол нь `users.chess*`
 * баганад бичигддэг. Дам нь одоогоор зөвхөн ботын эсрэг — `hasOnline` нь
 * үүнийг ил тэмдэглэж, дэлгэц дээр байхгүй товч харуулахаас сэргийлнэ.
 *
 * Танихгүй slug (админ шинэ курс нэмбэл) `DEFAULT_COURSE_PLAY` рүү унана:
 * тэр нь хэрэглэгчийг `/play` рүү аваачих тул шинэ курс нэмэхэд цэс
 * эвдрэхгүй, зүгээр л ерөнхий байдалтай үлдэнэ.
 */

export type CoursePlay = {
  /** Цэсэн дэх "тоглох" зүйлийн зам */
  href: string;
  /**
   * Цэсэн дэх нэр — курсээр өөрчлөгдөнө.
   *
   * ⚠ БОГИНО байх ёстой. Гар утасны доод тууз нь 5 цэсийг `flex-1`-ээр
   * хуваадаг тул 320px дэлгэц дээр нэг нүд ердөө 64px. 11px фонтоор энэ нь
   * ойролцоогоор 10 тэмдэгт — "Даам тоглох" (11) аль хэдийн хальж, хоёр мөр
   * болж туузыг эвддэг. Тиймээс тоглоомоо шууд нэрлэв ("Шатар", "Даам"):
   * богино бөгөөд курс солиход ялгаа нь шууд нүдэнд харагдана.
   */
  label: string;
  Icon: LucideIcon;
  /** Санамсаргүй өрсөлдөгчтэй хослуулах боломжтой эсэх */
  hasOnline: boolean;
};

const COURSE_PLAY: Record<string, CoursePlay> = {
  chess: {
    href: "/play",
    label: "Шатар",
    Icon: Swords,
    hasOnline: true,
  },
  checkers: {
    href: "/play/draughts",
    label: "Даам",
    Icon: CircleDot,
    hasOnline: false,
  },
};

/** Курс сонгоогүй / танихгүй slug — ерөнхий лобби руу */
const DEFAULT_COURSE_PLAY: CoursePlay = {
  href: "/play",
  label: "Тоглох",
  Icon: Bot,
  hasOnline: true,
};

export function coursePlay(slug: string | null | undefined): CoursePlay {
  return COURSE_PLAY[slug ?? ""] ?? DEFAULT_COURSE_PLAY;
}

/** Тухайн курс онлайн тоглолт дэмждэг эсэх — `/play` дэлгэц шалгана. */
export function courseHasOnline(slug: string | null | undefined): boolean {
  return coursePlay(slug).hasOnline;
}

/**
 * КУРС ТУС БҮРИЙН ХӨЛӨГТ ТОГЛООМ — дасгалын төрөл зөв эсэхийг шийднэ.
 *
 * ⚠ ЯАГААД ХЭРЭГТЭЙ ВЭ: дасгалын төрөл (`board-move` / `draughts-move`) нь
 * хичээлийн тоглуулагч ЯМАР ХӨЛӨГ зурахыг ганцаараа шийддэг. Курстэй нь
 * тааруулж шалгадаггүй байсан тул ДААМЫН курсэд шатрын дасгал орж, хүүхэд
 * даамын хичээл дунд ШАТРЫН хөлөг харах эвдрэл бодитоор үүссэн (санд
 * илэрсэн).
 *
 * Мөн платформ одоо зөвхөн хөлөгт тоглоомын курстэй биш: Python, English,
 * Санхүү зэрэг курсэд хөлөг дээрх дасгал утгагүй. Тэдгээрт зөвхөн
 * сонголттой (`choice`) дасгал зөвшөөрөгдөнө.
 */
export type BoardGame = "chess" | "draughts" | null;

/*
 * ⚠ ШАТАР НЭГ Л КУРС ("chess"). Урьд нь "chess-kids" тусдаа курс байсныг
 * "chess" руу нэгтгэсэн — бүх шатрын хичээл нэг замд байна.
 */
const COURSE_BOARD: Record<string, Exclude<BoardGame, null>> = {
  chess: "chess",
  checkers: "draughts",
};

export function courseBoardGame(slug: string | null | undefined): BoardGame {
  return COURSE_BOARD[slug ?? ""] ?? null;
}

/**
 * ХӨГЖМИЙН ЗЭМСГИЙН курсууд — хөлөгт тоглоомтой ЯГ ИЖИЛ шалтгаанаар
 * тусад нь бүртгэнэ: "piano-play" дасгал нь товчлуурын гар зурдаг тул
 * шатрын курст орвол хүүхэд шатрын хичээл дунд төгөлдөр хуур харна.
 */
export type Instrument = "piano" | null;

const COURSE_INSTRUMENT: Record<string, Exclude<Instrument, null>> = {
  piano: "piano",
};

export function courseInstrument(slug: string | null | undefined): Instrument {
  return COURSE_INSTRUMENT[slug ?? ""] ?? null;
}

/**
 * СҮЛЖЭЭНИЙ ОНЬСОГО зөвшөөрөгдөх курсууд.
 *
 * Хөлөгт тоглоом, хөгжмийн зэмсэгтэй ЯГ ижил шалтгаан: оньсого нь
 * кабель, сервер зурдаг тул сэдэвт нь тохирохгүй курст (жишээ нь
 * Санхүү) орвол хичээл нь утгагүй харагдана.
 */
const NET_PUZZLE_COURSES = new Set(["networks", "computer-basics"]);

/**
 * ОНЬСОГЫН БАГЦ курс — гулсдаг оньсого, судоку, сүлжээ гурвуулаа.
 *
 * "puzzles" курс нь өөрөө «оньсого» гэсэн сэдэвтэй тул бүх төрлийг
 * зэрэг агуулна. Бусад курст (Сүлжээ, Компьютерийн үндэс) зөвхөн
 * сэдэвт нь тохирох `net-puzzle` л зөвшөөрөгдөнө — судоку тэнд орвол
 * хичээлийн зорилготой хамааралгүй болно.
 */
const PUZZLE_PACK_COURSES = new Set(["puzzles"]);

/**
 * БЛОК-КОД (тушаалын дараалал угсрах) зөвшөөрөгдөх курсууд.
 *
 * ⚠ Хөлөгт тоглоом, хөгжимтэй ижил шалтгаан: `code-maze` нь тушаалын
 * самбар, лабиринт зурдаг тул сэдэвт нь тохирохгүй курст (жишээ нь
 * Кибер аюулгүй байдал) орвол хичээл утгагүй харагдана.
 */
const CODE_MAZE_COURSES = new Set(["kids-coding", "scratch", "game-dev"]);

/**
 * ГО (囲碁 / баду) курсууд.
 *
 * ⚠ Хөлөгт тоглоомтой ижил шалтгаанаар ТУСДАА: `go-move` нь го-гийн
 * хөлөг зурдаг тул шатрын курст орвол хүүхэд шатрын хичээл дунд го-гийн
 * хөлөг харна. Го нь `courseBoardGame`-д ОРООГҮЙ: тэр функц нь
 * `/play` дэлгэцийн ШАТАР/ДААМ-ын ботуудыг сонгодог бөгөөд го-д одоогоор
 * бот байхгүй — зөвхөн хичээл байна.
 */
const GO_COURSES = new Set(["go"]);

/**
 * DAAMAL KIDS (4–6 нас) курсууд — тэдгээрт зурган сонголт, санах ойн
 * тоглоом, гулсдаг оньсого зөвшөөрөгдөнө.
 *
 * ⚠ Энэ насны хүүхэд УНШИЖ ЧАДАХГҮЙ тул дасгал нь зурган (эможи) байх
 * ёстой — тиймээс `choice` дангаараа хангалтгүй, тоглоомын төрлүүд
 * заавал хэрэгтэй.
 */
const KIDS_COURSES = new Set([
  "math-kids",
  "mongolian-kids",
  "english-kids",
  "logic-kids",
  "creative-kids",
]);

/** Дасгалын бүх боломжит төрөл — `lib/api/courseAdmin.ts`-ийн `ExerciseType`-тай нийцнэ. */
export type ExerciseTypeName =
  | "choice"
  | "board-move"
  | "draughts-move"
  | "draughts-puzzle"
  | "chess-puzzle"
  | "net-puzzle"
  | "slide-puzzle"
  | "sudoku"
  | "matchstick"
  | "tangram"
  | "recall"
  | "memory-game"
  | "code-maze"
  | "go-move"
  | "piano-play"
  | "rhythm-tap";

/**
 * Тухайн курст зөвшөөрөгдөх дасгалын төрлүүд.
 *
 * `choice` нь ҮРГЭЛЖ зөвшөөрөгдөнө — ямар ч сэдэвт асуулт тавьж болно.
 */
export function allowedExerciseTypes(slug: string | null | undefined): ExerciseTypeName[] {
  // Таягны оньсогын курс — тэгшитгэл засах + тоолох асуултууд.
  if (slug === "matchstick") return ["choice", "matchstick"];
  if (slug === "tangram") return ["choice", "tangram"];
  // Санах ойн курс — хөзрийн хос БА санаж сэргээх дасгалууд.
  if (slug === "memory") return ["choice", "memory-game", "recall"];

  if (KIDS_COURSES.has(slug ?? "")) {
    return ["choice", "memory-game", "slide-puzzle", "code-maze"];
  }

  const board = courseBoardGame(slug);
  // `memory-game` — нэгтгэсэн "Шатар Kids"-ийн хүүхдэд зориулсан дүрс санах тоглоом.
  if (board === "chess") return ["choice", "board-move", "chess-puzzle", "memory-game"];
  if (board === "draughts") return ["choice", "draughts-move", "draughts-puzzle"];
  if (courseInstrument(slug) === "piano") return ["choice", "piano-play", "rhythm-tap"];
  if (CODE_MAZE_COURSES.has(slug ?? "")) return ["choice", "code-maze"];
  if (GO_COURSES.has(slug ?? "")) return ["choice", "go-move"];
  if (PUZZLE_PACK_COURSES.has(slug ?? "")) {
    return ["choice", "net-puzzle", "slide-puzzle", "sudoku", "memory-game"];
  }
  if (NET_PUZZLE_COURSES.has(slug ?? "")) return ["choice", "net-puzzle"];
  return ["choice"];
}
