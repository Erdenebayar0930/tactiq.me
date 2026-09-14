/**
 * Хичээлийн агуулгын ТӨРЛҮҮД — клиент, сервер ХОЁУЛАНД хэрэгтэй тул энд.
 *
 * ⚠ Бодит агуулга (өмнө нь энд статик TypeScript массив байсан) одоо
 * `lib/db/courses.ts`-д DB-ээс уншигдана (`admin/courses`-с шинэ курс/
 * хичээл нэмэх боломжтой болгохын тулд). Клиент компонентууд `/api/courses`,
 * `/api/courses/[slug]`, `/api/lessons/[lessonId]` route-уудаар л агуулга
 * татна — энэ файл ЗӨВХӨН хэлбэрийг тодорхойлно, өгөгдөл биш.
 */

export type ExerciseOption = {
  id: string;
  label: string;
};

export type ExerciseType =
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
  | "nonogram"
  | "series"
  | "word"
  | "kids"
  | "arrows"
  | "memory-game"
  | "code-maze"
  | "go-move"
  | "piano-play"
  | "rhythm-tap";

export type Exercise = {
  id: string;
  type: ExerciseType;
  prompt: string;
  /** Англи хувилбар — хоосон бол монгол нь харагдана (`lib/i18n/content.ts`). */
  promptEn?: string;
  /** "choice" төрөлд л бөглөгдөнэ */
  options: ExerciseOption[] | null;
  optionsEn?: ExerciseOption[] | null;
  correctOptionId: string | null;
  /**
   * "board-move"/"draughts-move" төрөлд л бөглөгдөнэ — хэрэглэгч жинхэнэ
   * хөлөг дээр зөв нүүдлийг гараараа хийнэ. `fen` нь шатарт FEN, дамд
   * `lib/draughts/notation.ts`-ийн PDN-төстэй мөр. `correctFrom`/`correctTo`
   * нь шатарт алгебрын нүд ("e2"), дамд 1-50 дугаар ("31").
   */
  fen: string | null;
  correctFrom: string | null;
  correctTo: string | null;
  correctPromotion: string | null;
  /**
   * "piano-play" төрөлд л бөглөгдөнө — сурагчийн товчлуур дээр тоглох ая.
   * Хоосон зайгаар тусгаарласан нотууд ("C4 D4 E4"); задлахдаа
   * `lib/music/notes.ts`-ийн `parseMelody` ашиглана.
   */
  /**
   * "chess-puzzle" төрөлд л бөглөгдөнө — шийдлийн шугам UCI-гаар
   * ("d1h5 e8e7 h5e5"). Эхлэх байрлал нь `fen`. Задлахдаа
   * `lib/chess/puzzle.ts`-ийн `parsePuzzle` ашиглана.
   */
  /**
   * "net-puzzle" төрөлд л бөглөгдөнө — сүлжээний оньсогын шийдсэн байрлал
   * ("5x5:12:3a05…"). Задлахдаа `lib/net/puzzle.ts`-ийн `decodePuzzle`.
   */
  grid: string | null;
  solution: string | null;
  melody: string | null;
  /**
   * "piano-play"/"rhythm-tap" төрөлд л бөглөгдөнө — темп (BPM). Хоосон бол
   * `TEMPO_DEFAULT`.
   */
  tempoBpm: number | null;
  /**
   * "rhythm-tap" төрөлд л бөглөгдөнө — хэмжээ ("2/4", "3/4", "4/4").
   */
  meter: string | null;
  /** Буруу хариулсны дараа харагдах тайлбар */
  explanation?: string;
  explanationEn?: string;
};

export type Lesson = {
  /** БҮХ курст даяар өвөрмөц — `lessonProgress.lessonId`, route параметр */
  id: string;
  title: string;
  titleEn?: string;
  xpReward: number;
  exercises: Exercise[];
};

/** `/learn` замын дэлгэцэд хэрэглэгддэг хөнгөн хувилбар — дасгалын АГУУЛГА ороогүй, зөвхөн тоо. */
export type LessonSummary = {
  id: string;
  title: string;
  titleEn?: string;
  xpReward: number;
  exerciseCount: number;
};

export type Unit = {
  id: string;
  title: string;
  titleEn?: string;
  color: string;
  lessons: LessonSummary[];
};

export type Course = {
  /** URL болон `users.activeCourseSlug`-д хэрэглэгдэнэ */
  slug: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  icon: string;
  color: string;
  /** "coming-soon" курс сонгогдохгүй, зөвхөн жагсаалтад "Тун удахгүй" гэж харагдана */
  status: "active" | "coming-soon";
  /** ҮНДСЭН сургуулийн slug (`lib/tactiq/schools.ts`). "" = бүлэглээгүй. */
  school: string;
  /** Харьяалагдах БҮХ сургууль — курс эдгээр бүлэг бүрт харагдана. */
  schools: string[];
};

export type CourseWithUnits = Course & { units: Unit[] };

/**
 * Хичээл НЭЭЛТТЭЙ эсэх.
 *
 * ДҮРЭМ: түгжээ нь ЗӨВХӨН СЭДЭВ (нэгж) дотор ажиллана —
 *   • сэдэв бүрийн ЭХНИЙ хичээл ҮРГЭЛЖ нээлттэй,
 *   • дараагийнх нь өмнөх хичээлүүд дуусмагц нээгдэнэ.
 *
 * ⚠ Урьд нь түгжээ КУРС даяар байсан: сурагч 4 дэх сэдвийн эхний хичээлийг
 * үзэхийн тулд өмнөх гурван сэдвийг БҮТНЭЭР дуусгах шаардлагатай байв.
 * Энэ нь "Хэмнэл, хэмжээ, темп", "Санах ой" гэх мэт ТУСДАА сэдвүүдийг
 * утгагүй хаадаг — тэдгээр нь бие даасан ур чадвар бөгөөд өмнөх сэдвээс
 * хамаардаггүй. Мөн шинэ сэдэв нэмэх бүрд тэр нь бүх сурагчид түгжээтэй
 * гарч ирдэг байв.
 *
 * @param unitLessonIds ТУХАЙН СЭДВИЙН хичээлүүд, дарааллаараа
 *   (курсын бүх хичээл БИШ).
 */
export function isLessonUnlocked(
  lessonId: string,
  unitLessonIds: readonly string[],
  completed: ReadonlySet<string>
): boolean {
  const index = unitLessonIds.indexOf(lessonId);
  if (index === -1) return false;
  // Сэдвийн эхний хичээл (index 0) — `slice(0, 0)` хоосон тул ҮРГЭЛЖ үнэн.
  return unitLessonIds.slice(0, index).every((id) => completed.has(id));
}
