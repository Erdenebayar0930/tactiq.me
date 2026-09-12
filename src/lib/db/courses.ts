import "server-only";

import { randomUUID } from "node:crypto";

import { asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db";
import { courses, exercises, lessons, units } from "@/lib/db/schema";

/**
 * Хичээлийн агуулгын өгөгдлийн сангийн давхарга.
 *
 * ⚠ Урьд нь `lib/tactiq/courses.ts` дотор статик TypeScript массив байсныг
 * ЭНД шилжүүлэв (`admin/courses`-с шинэ курс/хичээл нэмэх боломжтой болгохын
 * тулд). `lib/tactiq/courses.ts`-д одоо ЗӨВХӨН клиент+сервер ХОЁУЛАНД
 * ХЭРЭГТЭЙ ТӨРЛҮҮД (Course/Unit/Lesson/Exercise) үлдсэн — энэ файл
 * server-only (DB-д хандах) бөгөөд тэдгээр төрлийг ашиглана.
 */

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
  | "memory-game"
  | "code-maze"
  | "go-move"
  | "piano-play"
  | "rhythm-tap";

export type ExerciseData = {
  id: string;
  type: ExerciseType;
  prompt: string;
  /** Англи хувилбар — хоосон бол монгол нь харагдана (`lib/i18n/content.ts`). */
  promptEn: string;
  /** "choice" төрөлд л бөглөгдөнэ */
  options: { id: string; label: string }[] | null;
  optionsEn: { id: string; label: string }[] | null;
  correctOptionId: string | null;
  /** "board-move"/"draughts-move" төрөлд л бөглөгдөнэ */
  fen: string | null;
  correctFrom: string | null;
  correctTo: string | null;
  correctPromotion: string | null;
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
  /** "piano-play"/"rhythm-tap" төрөлд л бөглөгдөнө — ая ("C4 D4:2 E4") */
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
  explanation: string;
  explanationEn: string;
};

export type LessonSummary = {
  id: string;
  title: string;
  titleEn: string;
  xpReward: number;
  exerciseCount: number;
};
export type LessonData = {
  id: string;
  title: string;
  titleEn: string;
  xpReward: number;
  exercises: ExerciseData[];
};

export type CourseMeta = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  icon: string;
  color: string;
  status: string;
  /** ҮНДСЭН сургууль — `lib/tactiq/schools.ts`. "" = бүлэглээгүй. */
  school: string;
  /** Харьяалагдах БҮХ сургууль (эхнийх нь үндсэн). Хоосон = бүлэглээгүй. */
  schools: string[];
};

export type CourseWithLessons = CourseMeta & {
  units: { id: string; title: string; titleEn: string; color: string; lessons: LessonSummary[] }[];
};

/**
 * Курсын сургуулиуд — `schools` хоосон бол `school`-оор орлуулна.
 *
 * ⚠ Seed script-ууд зөвхөн `school` бичдэг тул энэ орлуулалтгүй бол тэдгээр
 * курс «бүлэглээгүй» болж, лигт ч «Бусад»-д орно.
 */
export function courseSchools(row: { school: string; schools: string[] | null }): string[] {
  if (row.schools && row.schools.length > 0) return row.schools;
  return row.school ? [row.school] : [];
}

function toCourseMeta(row: typeof courses.$inferSelect): CourseMeta {
  return {
    slug: row.slug,
    title: row.title,
    titleEn: row.titleEn,
    description: row.description,
    descriptionEn: row.descriptionEn,
    icon: row.icon,
    color: row.color,
    status: row.status,
    school: row.school,
    schools: courseSchools(row),
  };
}

// ---------------------------------------------------------------------------
// Уншилт — тоглогчид зориулсан (`/courses`, `/learn`, хичээлийн тоглуулагч)
// ---------------------------------------------------------------------------

/** Бүх курсын мета мэдээлэл (нэгж/хичээлгүй) — `/courses` жагсаалтад хангалттай. */
export async function listCourseMetas(): Promise<CourseMeta[]> {
  const rows = await db.select().from(courses).orderBy(asc(courses.sortOrder), asc(courses.title));
  return rows.map(toCourseMeta);
}

export async function isSelectableCourseSlug(slug: string): Promise<boolean> {
  const [row] = await db
    .select({ status: courses.status })
    .from(courses)
    .where(eq(courses.slug, slug))
    .limit(1);
  return row?.status === "active";
}

/** Нэг курс, нэгж/хичээлийн бүтэцтэйгээр (дасгалын АГУУЛГА ороогүй — `/learn` замын дэлгэцэд хангалттай). */
export async function getCourseWithLessons(slug: string): Promise<CourseWithLessons | null> {
  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  if (!course) return null;

  const unitRows = await db
    .select()
    .from(units)
    .where(eq(units.courseSlug, slug))
    .orderBy(asc(units.sortOrder));
  if (unitRows.length === 0) return { ...toCourseMeta(course), units: [] };

  const unitIds = unitRows.map((u) => u.id);
  const lessonRows = await db
    .select()
    .from(lessons)
    .where(inArray(lessons.unitId, unitIds))
    .orderBy(asc(lessons.sortOrder));

  const lessonIds = lessonRows.map((l) => l.id);
  const exerciseRows = lessonIds.length
    ? await db
        .select({ lessonId: exercises.lessonId })
        .from(exercises)
        .where(inArray(exercises.lessonId, lessonIds))
    : [];
  const countByLesson = new Map<string, number>();
  for (const row of exerciseRows) {
    countByLesson.set(row.lessonId, (countByLesson.get(row.lessonId) ?? 0) + 1);
  }

  const lessonsByUnit = new Map<string, LessonSummary[]>();
  for (const lesson of lessonRows) {
    const list = lessonsByUnit.get(lesson.unitId) ?? [];
    list.push({
      id: lesson.id,
      title: lesson.title,
      titleEn: lesson.titleEn,
      xpReward: lesson.xpReward,
      exerciseCount: countByLesson.get(lesson.id) ?? 0,
    });
    lessonsByUnit.set(lesson.unitId, list);
  }

  return {
    ...toCourseMeta(course),
    units: unitRows.map((unit) => ({
      id: unit.id,
      title: unit.title,
      titleEn: unit.titleEn,
      color: unit.color,
      lessons: lessonsByUnit.get(unit.id) ?? [],
    })),
  };
}

/** Курсын БҮХ хичээлийн ID замын дараалалд — түгжээ/нээлттэй төлөв тооцоход. */
export async function getLessonOrder(courseSlug: string): Promise<string[]> {
  const unitRows = await db
    .select({ id: units.id })
    .from(units)
    .where(eq(units.courseSlug, courseSlug))
    .orderBy(asc(units.sortOrder));
  if (unitRows.length === 0) return [];

  const unitIds = unitRows.map((u) => u.id);
  const lessonRows = await db
    .select({ id: lessons.id, unitId: lessons.unitId })
    .from(lessons)
    .where(inArray(lessons.unitId, unitIds))
    .orderBy(asc(lessons.sortOrder));

  const byUnit = new Map<string, string[]>();
  for (const lesson of lessonRows) {
    const list = byUnit.get(lesson.unitId) ?? [];
    list.push(lesson.id);
    byUnit.set(lesson.unitId, list);
  }
  return unitIds.flatMap((id) => byUnit.get(id) ?? []);
}

/**
 * Сангийн мөрийг клиентийн дасгал болгоно.
 *
 * ⚠ `type` нь ЦАГААН ЖАГСААЛТААР шүүгддэг: жагсаалтад БАЙХГҮЙ төрөл
 * чимээгүйхэн "choice" болж хувирна. Энэ нь сангаас танихгүй мөр ирэхэд
 * дэлгэц эвдрэхээс сэргийлэх зорилготой — ГЭВЧ шинэ төрөл нэмэхэд ЭНД
 * нэмэхээ мартвал тэр дасгал сонголтгүй "choice" болж, сурагчид ХООСОН
 * харагдана (`matchstick` нэмэхэд яг тэр болсон). Шинэ төрөл нэмэх бол
 * `lib/tactiq/courses.ts`-ийн `ExerciseType`-тай ХАМТ энд нэмнэ.
 */
function toExerciseData(row: typeof exercises.$inferSelect): ExerciseData {
  return {
    id: row.id,
    type:
      row.type === "board-move" ||
      row.type === "draughts-move" ||
      row.type === "draughts-puzzle" ||
      row.type === "piano-play" ||
      row.type === "rhythm-tap" ||
      row.type === "chess-puzzle" ||
      row.type === "net-puzzle" ||
      row.type === "slide-puzzle" ||
      row.type === "sudoku" ||
      row.type === "matchstick" ||
      row.type === "code-maze" ||
      row.type === "go-move" ||
      row.type === "memory-game"
        ? row.type
        : "choice",
    prompt: row.prompt,
    promptEn: row.promptEn,
    options: row.options,
    optionsEn: row.optionsEn,
    correctOptionId: row.correctOptionId,
    fen: row.fen,
    correctFrom: row.correctFrom,
    correctTo: row.correctTo,
    correctPromotion: row.correctPromotion,
    grid: row.grid,
    solution: row.solution,
    melody: row.melody,
    tempoBpm: row.tempoBpm,
    meter: row.meter,
    explanation: row.explanation,
    explanationEn: row.explanationEn,
  };
}

/** Нэг хичээл, дасгалын БҮРЭН агуулгатайгаар — хичээл тоглуулагч, дуусгах route-д. */
export async function getLessonWithExercises(lessonId: string): Promise<LessonData | null> {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
  if (!lesson) return null;

  const exerciseRows = await db
    .select()
    .from(exercises)
    .where(eq(exercises.lessonId, lessonId))
    .orderBy(asc(exercises.sortOrder));

  return {
    id: lesson.id,
    title: lesson.title,
    titleEn: lesson.titleEn,
    xpReward: lesson.xpReward,
    exercises: exerciseRows.map(toExerciseData),
  };
}

/** Хичээлийг агуулж буй курсын slug — `/api/learn/lessons/[lessonId]/complete`-д хэрэгтэй. */
export async function getCourseSlugForLesson(lessonId: string): Promise<string | null> {
  const [row] = await db
    .select({ courseSlug: units.courseSlug })
    .from(lessons)
    .innerJoin(units, eq(lessons.unitId, units.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return row?.courseSlug ?? null;
}

/**
 * Дасгалыг агуулж буй курсын slug — админы дасгал ЗАСАХ route-д, төрөл нь
 * курстэйгээ тохирч байгаа эсэхийг шалгахад хэрэгтэй.
 */
export async function getCourseSlugForExercise(exerciseId: string): Promise<string | null> {
  const [row] = await db
    .select({ courseSlug: units.courseSlug })
    .from(exercises)
    .innerJoin(lessons, eq(exercises.lessonId, lessons.id))
    .innerJoin(units, eq(lessons.unitId, units.id))
    .where(eq(exercises.id, exerciseId))
    .limit(1);
  return row?.courseSlug ?? null;
}

/** `xpReward` + курсын slug НЭГ дор — хичээл дуусгах route-д (`findLessonWithCourse`-ийн орлуулга). */
export async function getLessonForCompletion(
  lessonId: string
): Promise<{ xpReward: number; courseSlug: string } | null> {
  const [row] = await db
    .select({ xpReward: lessons.xpReward, courseSlug: units.courseSlug })
    .from(lessons)
    .innerJoin(units, eq(lessons.unitId, units.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Уншилт/бичилт — админд зориулсан (`/admin/courses`)
// ---------------------------------------------------------------------------

export type AdminExercise = ExerciseData & { sortOrder: number };
export type AdminLesson = {
  id: string;
  title: string;
  titleEn: string;
  xpReward: number;
  sortOrder: number;
  exercises: AdminExercise[];
};
export type AdminUnit = {
  id: string;
  title: string;
  titleEn: string;
  color: string;
  sortOrder: number;
  lessons: AdminLesson[];
};
export type AdminCourse = CourseMeta & { sortOrder: number; units: AdminUnit[] };

export async function listAdminCourses(): Promise<(CourseMeta & { sortOrder: number })[]> {
  // ⚠ Админд `sortOrder` ХЭРЭГТЭЙ: жагсаалт нь эрэмбийг ӨӨРЧИЛДӨГ
  // (`reorderCourses`) тул одоогийн дарааллыг мэдэхгүйгээр зөв илгээж чадахгүй.
  const rows = await db
    .select()
    .from(courses)
    .orderBy(asc(courses.sortOrder), asc(courses.title));
  return rows.map((row) => ({ ...toCourseMeta(row), sortOrder: row.sortOrder }));
}

/**
 * Курсуудын дарааллыг ЦОГЦООР нь дахин бичнэ.
 *
 * ⚠ ХОЁР МӨРИЙН `sortOrder`-ыг СОЛИХ (swap) биш, БҮХ жагсаалтыг
 * 0,1,2… гэж дахин дугаарлана. Шалтгаан: одоо байгаа мөрүүд бүгд
 * `sortOrder = 0` (анхдагч) байж болох ба тэр үед хоёрыг сольсон ч
 * дараалал огт өөрчлөгдөхгүй — хэрэглэгчийн хувьд «товч ажиллахгүй»
 * гэж харагдана. Дахин дугаарлалт нь давхардлыг ч цэвэрлэнэ.
 *
 * ⚠ Нэг transaction: дундуур тасарвал зарим курс шинэ, зарим нь хуучин
 * дугаартай үлдэж, дараалал холилдоно.
 */
export async function reorderCourses(slugs: string[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, slug] of slugs.entries()) {
      await tx
        .update(courses)
        .set({ sortOrder: index, updatedAt: new Date() })
        .where(eq(courses.slug, slug));
    }
  });
}

/** Нэг курс, БҮХ давхаргаараа (дасгал хүртэл) — админы засварлах дэлгэцэд. */
export async function getAdminCourse(slug: string): Promise<AdminCourse | null> {
  const [course] = await db.select().from(courses).where(eq(courses.slug, slug)).limit(1);
  if (!course) return null;

  const unitRows = await db
    .select()
    .from(units)
    .where(eq(units.courseSlug, slug))
    .orderBy(asc(units.sortOrder));
  const unitIds = unitRows.map((u) => u.id);

  const lessonRows = unitIds.length
    ? await db.select().from(lessons).where(inArray(lessons.unitId, unitIds)).orderBy(asc(lessons.sortOrder))
    : [];
  const lessonIds = lessonRows.map((l) => l.id);

  const exerciseRows = lessonIds.length
    ? await db.select().from(exercises).where(inArray(exercises.lessonId, lessonIds)).orderBy(asc(exercises.sortOrder))
    : [];

  const exercisesByLesson = new Map<string, AdminExercise[]>();
  for (const e of exerciseRows) {
    const list = exercisesByLesson.get(e.lessonId) ?? [];
    list.push({ ...toExerciseData(e), sortOrder: e.sortOrder });
    exercisesByLesson.set(e.lessonId, list);
  }

  const lessonsByUnit = new Map<string, AdminLesson[]>();
  for (const l of lessonRows) {
    const list = lessonsByUnit.get(l.unitId) ?? [];
    list.push({
      id: l.id,
      title: l.title,
      titleEn: l.titleEn,
      xpReward: l.xpReward,
      sortOrder: l.sortOrder,
      exercises: exercisesByLesson.get(l.id) ?? [],
    });
    lessonsByUnit.set(l.unitId, list);
  }

  return {
    ...toCourseMeta(course),
    sortOrder: course.sortOrder,
    units: unitRows.map((u) => ({
      id: u.id,
      title: u.title,
      titleEn: u.titleEn,
      color: u.color,
      sortOrder: u.sortOrder,
      lessons: lessonsByUnit.get(u.id) ?? [],
    })),
  };
}

export async function courseExists(slug: string): Promise<boolean> {
  const [row] = await db.select({ slug: courses.slug }).from(courses).where(eq(courses.slug, slug)).limit(1);
  return !!row;
}

export async function createCourse(input: {
  slug: string;
  title: string;
  /** Англи гарчиг — хоосон бол монгол нь харагдана (`lib/i18n/content.ts`). */
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  icon: string;
  color: string;
  status: string;
  school: string;
  schools: string[];
}): Promise<void> {
  await db.insert(courses).values(input);
}

export async function updateCourse(
  slug: string,
  patch: Partial<{
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    icon: string;
    color: string;
    status: string;
    sortOrder: number;
    school: string;
    schools: string[];
  }>
): Promise<void> {
  await db.update(courses).set({ ...patch, updatedAt: new Date() }).where(eq(courses.slug, slug));
}

/** Курс + доторх бүх нэгж/хичээл/дасгал (DB-ийн CASCADE-аар автоматаар). */
export async function deleteCourse(slug: string): Promise<void> {
  await db.delete(courses).where(eq(courses.slug, slug));
}

export async function createUnit(input: {
  courseSlug: string;
  title: string;
  titleEn?: string;
  color: string;
  sortOrder: number;
  /** Хэн нэмсэн — эрхийн шалгалтын үндэс (`lib/api/contentAccess.ts`). */
  createdBy: string;
}): Promise<string> {
  const [row] = await db.insert(units).values(input).returning({ id: units.id });
  return row.id;
}

export async function updateUnit(
  id: string,
  patch: Partial<{ title: string; titleEn: string; color: string; sortOrder: number }>
): Promise<void> {
  await db.update(units).set(patch).where(eq(units.id, id));
}

export async function deleteUnit(id: string): Promise<void> {
  await db.delete(units).where(eq(units.id, id));
}

export async function createLesson(input: {
  unitId: string;
  title: string;
  titleEn?: string;
  xpReward: number;
  sortOrder: number;
  /** Хэн нэмсэн — эрхийн шалгалтын үндэс (`lib/api/contentAccess.ts`). */
  createdBy: string;
}): Promise<string> {
  // Хичээлийн ID нь `lessonProgress.lessonId`-ээр БҮХ курст даяар өвөрмөц байх
  // ёстой тул (лекц устсан ч хэрэглэгчийн явц тодорхой хэвээр байхын тулд)
  // танигдахуйц slug-ийн оронд санамсаргүй ID үүсгэнэ — гараар бичсэн
  // slug мөргөлдөх эрсдэлгүй.
  const id = randomUUID();
  await db.insert(lessons).values({ id, ...input });
  return id;
}

export async function updateLesson(
  id: string,
  patch: Partial<{ title: string; titleEn: string; xpReward: number; sortOrder: number }>
): Promise<void> {
  await db.update(lessons).set(patch).where(eq(lessons.id, id));
}

export async function deleteLesson(id: string): Promise<void> {
  await db.delete(lessons).where(eq(lessons.id, id));
}

export type ExerciseInput = {
  lessonId: string;
  type: ExerciseType;
  prompt: string;
  /** Англи хувилбар — хоосон бол монгол нь харагдана. */
  promptEn?: string;
  options: { id: string; label: string }[] | null;
  optionsEn?: { id: string; label: string }[] | null;
  correctOptionId: string | null;
  fen: string | null;
  correctFrom: string | null;
  correctTo: string | null;
  correctPromotion: string | null;
  grid: string | null;
  solution: string | null;
  melody: string | null;
  tempoBpm: number | null;
  meter: string | null;
  explanation: string;
  explanationEn?: string;
  sortOrder: number;
};

export async function createExercise(
  input: ExerciseInput & { createdBy: string }
): Promise<string> {
  const [row] = await db.insert(exercises).values(input).returning({ id: exercises.id });
  return row.id;
}

export async function updateExercise(
  id: string,
  patch: Partial<Omit<ExerciseInput, "lessonId">>
): Promise<void> {
  await db.update(exercises).set(patch).where(eq(exercises.id, id));
}

export async function deleteExercise(id: string): Promise<void> {
  await db.delete(exercises).where(eq(exercises.id, id));
}
