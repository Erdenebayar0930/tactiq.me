"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { ChevronDown, ChevronLeft, Plus, RotateCcw, Trash2 } from "lucide-react";

import {
  ColorPicker,
  IconPicker,
  NumberField,
  SelectField,
  TextArea,
  TextField,
} from "@/components/admin/fields";
import { SchoolPicker } from "@/components/admin/SchoolPicker";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { DraughtsBoard } from "@/components/draughts/DraughtsBoard";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { apiFetch, ApiError } from "@/lib/apiClient";
import {
  formatSolution,
  parsePuzzle,
  parseUci,
  PUZZLE_MAX_MOVES,
  puzzleGoalLabel,
  puzzleOrientation,
  toUci,
} from "@/lib/chess/puzzle";
import { resolveMove } from "@/lib/chess/utils";
import {
  decodePuzzle,
  EAST,
  encodePuzzle,
  generatePuzzle,
  isEndpoint,
  makeRng,
  NORTH,
  SOUTH,
  WEST,
} from "@/lib/net/puzzle";
import type { NetPuzzle } from "@/lib/net/puzzle";
import { decodeSlide, encodeSlide } from "@/lib/puzzles/slide";
import {
  decodeMemory,
  encodeMemory,
  MEMORY_PRESETS,
} from "@/lib/puzzles/memory";
import {
  countSolutions,
  decodeMatchstick,
  encodeMatchstick,
  evaluate as evaluateMatchstick,
  fromText as matchstickFromText,
  toText as matchstickToText,
} from "@/lib/puzzles/matchstick";
import {
  decodeSudoku,
  encodeSudoku,
  generateSudoku,
  keepForDifficulty,
} from "@/lib/puzzles/sudoku";
import type { SudokuSize } from "@/lib/puzzles/sudoku";
import {
  decodeMaze,
  EMPTY,
  GOAL,
  shortestProgram,
  START,
  WALL,
} from "@/lib/code/maze";
import type { Direction } from "@/lib/code/maze";
import {
  formatMelody,
  MELODY_MAX_NOTES,
  METERS,
  parseMelody,
  parseTempo,
  TEMPO_DEFAULT,
  TEMPO_MAX,
  TEMPO_MIN,
} from "@/lib/music/notes";
import {
  decodeGo,
  encodeGo,
  formatPointList,
  parsePointList,
  play,
  pointLabel,
  type GoPosition,
  type Stone,
} from "@/lib/go/position";
import { GoBoard } from "@/components/go/GoBoard";
import {
  DRAUGHTS_PUZZLE_MAX_MOVES,
  draughtsPuzzleGoalLabel,
  parseDraughtsMoveToken,
  parseDraughtsPuzzle,
  squareToNumber,
  toMoveToken,
} from "@/lib/draughts/puzzle";
import { allowedExerciseTypes } from "@/lib/tactiq/courseNav";
import { Draughts } from "@/lib/draughts/engine";
import {
  deserializePosition,
  serializePosition,
  squareFromNumber,
  squareNumber,
} from "@/lib/draughts/notation";

import type { Move, Square } from "chess.js";
import type { Square as DraughtsSquare } from "@/lib/draughts/engine";

type ExerciseType =
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

type AdminExercise = {
  id: string;
  type: ExerciseType;
  prompt: string;
  /** Англи хувилбар — хоосон бол сурагч монгол бичвэрийг харна. */
  promptEn: string;
  options: { id: string; label: string }[] | null;
  optionsEn: { id: string; label: string }[] | null;
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
  explanationEn: string;
  sortOrder: number;
};
type AdminLesson = {
  id: string;
  title: string;
  titleEn: string;
  xpReward: number;
  sortOrder: number;
  exercises: AdminExercise[];
};
type AdminUnit = {
  id: string;
  title: string;
  titleEn: string;
  color: string;
  sortOrder: number;
  lessons: AdminLesson[];
};
type AdminCourse = {
  slug: string;
  titleEn: string;
  descriptionEn: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  status: string;
  /** Харьяалагдах БҮХ сургууль (эхнийх нь үндсэн). */
  schools: string[];
  sortOrder: number;
  units: AdminUnit[];
};

/** Курс засварлах — нэгж/хичээл/дасгал бүгд НЭГ дэлгэцэд (Хяналт → Сургалт → курс). */
export default function AdminCourseEditorPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const path = `/api/admin/courses/${encodeURIComponent(params.slug)}`;
  const { data, loading, error, reload } = useApiData<{ course: AdminCourse }>(path);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteCourse = async () => {
    if (!confirm("Энэ курс, түүний БҮХ нэгж/хичээл/дасгалыг устгах уу? Буцаах боломжгүй.")) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(path, { method: "DELETE" });
      router.push("/admin/courses");
    } catch (cause) {
      setDeleteError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data?.course) return <ErrorNote message={error ?? "Курс олдсонгүй."} />;

  const course = data.course;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/courses"
        className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Сургалт
      </Link>

      <CourseMetaForm course={course} path={path} onSaved={reload} />

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Нэгж, хичээл, дасгал
        </h2>
        {course.units.map((unit) => (
          <UnitCard key={unit.id} unit={unit} courseSlug={course.slug} onChanged={reload} />
        ))}
        <AddUnitForm courseSlug={course.slug} nextOrder={course.units.length} onAdded={reload} />
      </section>

      <section className="surface space-y-3 border border-rose-200 p-5 dark:border-rose-500/30">
        <h2 className="font-semibold text-rose-700 dark:text-rose-400">Аюултай бүс</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Курс устгавал доторх БҮХ нэгж/хичээл/дасгал мөн устана. Хэрэглэгчдийн авсан оноо
          (явцын түүх) хэвээр үлдэнэ.
        </p>
        {deleteError && <p className="text-sm text-rose-600 dark:text-rose-400">{deleteError}</p>}
        <button
          type="button"
          onClick={() => void deleteCourse()}
          disabled={deleting}
          className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          {deleting ? "Устгаж байна…" : "Курс устгах"}
        </button>
      </section>
    </div>
  );
}

function CourseMetaForm({
  course,
  path,
  onSaved,
}: {
  course: AdminCourse;
  path: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(course.title);
  /**
   * Англи хувилбарууд — ЗААВАЛ БИШ.
   *
   * ⚠ Хоосон орхивол англи хэл дээрх сурагч МОНГОЛ бичвэрийг харна
   * (`lib/i18n/content.ts`-ийн `localized`) — хоосон гарчиг үзүүлэхээс дээр.
   */
  const [titleEn, setTitleEn] = useState(course.titleEn ?? "");
  const [description, setDescription] = useState(course.description);
  const [descriptionEn, setDescriptionEn] = useState(course.descriptionEn ?? "");
  const [icon, setIcon] = useState(course.icon);
  const [color, setColor] = useState(course.color);
  const [status, setStatus] = useState<"active" | "coming-soon">(
    course.status === "active" ? "active" : "coming-soon"
  );
  const [schools, setSchools] = useState<string[]>(course.schools ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch(path, {
        method: "PATCH",
        body: { title, titleEn, description, descriptionEn, icon, color, status, schools },
      });
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="surface space-y-4 p-5">
      <h2 className="font-semibold text-gray-900 dark:text-white">Курсын мэдээлэл</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Гарчиг" value={title} onChange={setTitle} maxLength={120} />
        <TextField
          label="Title (English)"
          value={titleEn}
          onChange={setTitleEn}
          maxLength={120}
          hint="Заавал биш. Хоосон бол англи хэл дээр монгол гарчиг харагдана."
        />
        <SelectField
          label="Төлөв"
          value={status}
          onChange={setStatus}
          options={[
            { value: "coming-soon", label: "Тун удахгүй (сонгогдохгүй)" },
            { value: "active", label: "Идэвхтэй (сонгож болно)" },
          ]}
        />
      </div>

      {/* Курс аль сургуулиудад харагдах, XP нь аль лигүүдэд тоологдох вэ */}
      <SchoolPicker value={schools} onChange={setSchools} />

      <TextArea label="Тайлбар" value={description} onChange={setDescription} rows={2} />
      <TextArea
        label="Description (English)"
        value={descriptionEn}
        onChange={setDescriptionEn}
        rows={2}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <ColorPicker value={color} onChange={setColor} />
        <IconPicker value={icon} onChange={setIcon} />
      </div>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {saved && <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Хадгалагдлаа ✓</span>}
      </div>
    </section>
  );
}

function AddUnitForm({
  courseSlug,
  nextOrder,
  onAdded,
}: {
  courseSlug: string;
  nextOrder: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  // Англи нэр — заавал биш (`lib/i18n/content.ts`).
  const [titleEn, setTitleEn] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:border-white/15 dark:text-gray-400 dark:hover:bg-white/5"
      >
        <Plus className="size-4" aria-hidden />
        Нэгж нэмэх
      </button>
    );
  }

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/courses/${encodeURIComponent(courseSlug)}/units`, {
        method: "POST",
        body: { title, titleEn, color: "violet", sortOrder: nextOrder },
      });
      setTitle("");
      setOpen(false);
      onAdded();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface flex flex-wrap items-end gap-3 p-4">
      <div className="min-w-48 flex-1">
        <TextField label="Шинэ нэгжийн нэр" value={title} onChange={setTitle} maxLength={120} placeholder="Эхлэл" />
      </div>
      <div className="min-w-48 flex-1">
        <TextField
          label="Unit name (English)"
          value={titleEn}
          onChange={setTitleEn}
          maxLength={120}
          placeholder="Getting started"
        />
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || !title.trim()}
        className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        Нэмэх
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
      >
        Цуцлах
      </button>
    </div>
  );
}

function UnitCard({
  unit,
  courseSlug,
  onChanged,
}: {
  unit: AdminUnit;
  courseSlug: string;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [title, setTitle] = useState(unit.title);
  const [busy, setBusy] = useState(false);

  const rename = async (value: string) => {
    setTitle(value);
  };

  const saveTitle = async () => {
    if (title === unit.title || !title.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/units/${unit.id}`, { method: "PATCH", body: { title } });
      onChanged();
    } catch {
      // Талбар дээрээ л алдаа харагдана — жагсаалт эвдэхгүй.
    } finally {
      setBusy(false);
    }
  };

  const deleteUnit = async () => {
    if (!confirm(`"${unit.title}" нэгж, доторх бүх хичээл/дасгалыг устгах уу?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/units/${unit.id}`, { method: "DELETE" });
      onChanged();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="surface overflow-hidden p-0">
      <div className="flex items-center gap-2 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
        >
          <ChevronDown className={`size-4 transition-transform ${expanded ? "" : "-rotate-90"}`} aria-hidden />
        </button>
        <input
          value={title}
          onChange={(event) => void rename(event.target.value)}
          onBlur={() => void saveTitle()}
          disabled={busy}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-bold text-gray-900 hover:border-gray-200 focus:border-brand-400 focus:outline-none dark:text-white dark:hover:border-white/15"
        />
        <span className="shrink-0 text-xs text-gray-400">{unit.lessons.length} хичээл</span>
        <button
          type="button"
          onClick={() => void deleteUnit()}
          disabled={busy}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          aria-label="Нэгж устгах"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-gray-100 p-4 dark:border-white/10">
          {unit.lessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} onChanged={onChanged} />
          ))}
          <AddLessonForm unitId={unit.id} nextOrder={unit.lessons.length} onAdded={onChanged} />
        </div>
      )}
    </div>
  );
}

function AddLessonForm({
  unitId,
  nextOrder,
  onAdded,
}: {
  unitId: string;
  nextOrder: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  // Англи нэр — заавал биш (`lib/i18n/content.ts`).
  const [titleEn, setTitleEn] = useState("");
  const [xpReward, setXpReward] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-white/15 dark:text-gray-400 dark:hover:bg-white/5"
      >
        <Plus className="size-3.5" aria-hidden />
        Хичээл нэмэх
      </button>
    );
  }

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/units/${unitId}/lessons`, {
        method: "POST",
        body: { title, titleEn, xpReward, sortOrder: nextOrder },
      });
      setTitle("");
      setOpen(false);
      onAdded();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
      <div className="min-w-40 flex-1">
        <TextField label="Хичээлийн нэр" value={title} onChange={setTitle} maxLength={160} />
      </div>
      <div className="min-w-40 flex-1">
        <TextField
          label="Lesson name (English)"
          value={titleEn}
          onChange={setTitleEn}
          maxLength={160}
        />
      </div>
      <div className="w-28">
        <NumberField label="Оноо" value={xpReward} onChange={setXpReward} min={0} max={100} />
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={busy || !title.trim()}
        className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        Нэмэх
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
      >
        Цуцлах
      </button>
    </div>
  );
}

function LessonCard({ lesson, onChanged }: { lesson: AdminLesson; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [xpReward, setXpReward] = useState(lesson.xpReward);
  const [busy, setBusy] = useState(false);

  const saveMeta = async (patch: Partial<{ title: string; xpReward: number }>) => {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/lessons/${lesson.id}`, { method: "PATCH", body: patch });
      onChanged();
    } catch {
      // алдаа гарвал дараагийн `reload`-оор сервэрийн жинхэнэ утга буцна
    } finally {
      setBusy(false);
    }
  };

  const deleteLesson = async () => {
    if (!confirm(`"${lesson.title}" хичээл, доторх бүх дасгалыг устгах уу?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/lessons/${lesson.id}`, { method: "DELETE" });
      onChanged();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10">
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
        >
          <ChevronDown className={`size-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} aria-hidden />
        </button>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => title !== lesson.title && title.trim() && void saveMeta({ title })}
          disabled={busy}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-gray-900 hover:border-gray-200 focus:border-brand-400 focus:outline-none dark:text-white dark:hover:border-white/15"
        />
        <input
          type="number"
          value={xpReward}
          min={0}
          onChange={(event) => setXpReward(Number(event.target.value))}
          onBlur={() => xpReward !== lesson.xpReward && void saveMeta({ xpReward })}
          disabled={busy}
          className="num w-16 shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs dark:border-white/15 dark:bg-white/5 dark:text-white"
        />
        <span className="shrink-0 text-xs text-gray-400">{lesson.exercises.length} дасгал</span>
        <button
          type="button"
          onClick={() => void deleteLesson()}
          disabled={busy}
          className="grid size-7 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          aria-label="Хичээл устгах"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-gray-100 p-3 dark:border-white/10">
          {lesson.exercises.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} onChanged={onChanged} />
          ))}
          <AddExerciseForm
            lessonId={lesson.id}
            nextOrder={lesson.exercises.length}
            onAdded={onChanged}
          />
        </div>
      )}
    </div>
  );
}

function ExerciseRow({
  exercise,
  onChanged,
}: {
  exercise: AdminExercise;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const deleteExercise = async () => {
    if (!confirm("Энэ дасгалыг устгах уу?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/exercises/${exercise.id}`, { method: "DELETE" });
      onChanged();
    } catch {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <ExerciseForm
        initial={exercise}
        submitLabel="Хадгалах"
        onCancel={() => setEditing(false)}
        onSubmit={async (payload) => {
          await apiFetch(`/api/admin/exercises/${exercise.id}`, { method: "PATCH", body: payload });
          setEditing(false);
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-2.5 text-sm dark:bg-white/5">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-800 dark:text-gray-100">{exercise.prompt}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {exercise.type === "board-move" ? (
            <>
              Хөлөг дээрх нүүдэл · зөв: {exercise.correctFrom} → {exercise.correctTo}
            </>
          ) : exercise.type === "draughts-move" ? (
            <>
              Дамын нүүдэл · зөв: {exercise.correctFrom} → {exercise.correctTo}
            </>
          ) : (
            <>
              {exercise.options?.length ?? 0} сонголт · зөв:{" "}
              {exercise.options?.find((o) => o.id === exercise.correctOptionId)?.label ?? "—"}
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
      >
        Засах
      </button>
      <button
        type="button"
        onClick={() => void deleteExercise()}
        disabled={busy}
        className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
        aria-label="Дасгал устгах"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function AddExerciseForm({
  lessonId,
  nextOrder,
  onAdded,
}: {
  lessonId: string;
  nextOrder: number;
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:border-white/15 dark:text-gray-400 dark:hover:bg-white/5"
      >
        <Plus className="size-3.5" aria-hidden />
        Дасгал нэмэх
      </button>
    );
  }

  return (
    <ExerciseForm
      submitLabel="Нэмэх"
      onCancel={() => setOpen(false)}
      onSubmit={async (payload) => {
        await apiFetch(`/api/admin/lessons/${lessonId}/exercises`, {
          method: "POST",
          body: { ...payload, sortOrder: nextOrder },
        });
        setOpen(false);
        onAdded();
      }}
    />
  );
}

type ExercisePayload = {
  type: ExerciseType;
  prompt: string;
  /** Англи хувилбарууд — ЗААВАЛ БИШ (`lib/i18n/content.ts`). */
  promptEn?: string;
  explanationEn?: string;
  options?: { id: string; label: string }[];
  optionsEn?: { id: string; label: string }[];
  correctOptionId?: string;
  fen?: string;
  correctFrom?: string;
  correctTo?: string;
  correctPromotion?: string | null;
  grid?: string;
  solution?: string;
  melody?: string;
  tempoBpm?: number;
  meter?: string;
  explanation: string;
};

const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  choice: "Сонголттой",
  "board-move": "Хөлөг дээр нүүдэл",
  "draughts-move": "Дам дээр нүүдэл",
  "draughts-puzzle": "Дамын цохилт (олон нүүдэлт)",
  "chess-puzzle": "Өрөг бодлого",
  "net-puzzle": "Сүлжээний оньсого",
  "slide-puzzle": "Гулсдаг оньсого",
  sudoku: "Судоку",
  matchstick: "Таягны оньсого",
  "memory-game": "Санах ойн тоглоом",
  "code-maze": "Код угсрах (лабиринт)",
  "go-move": "Го — чулуу тавих",
  "piano-play": "Төгөлдөр хуур дээр ая",
  "rhythm-tap": "Хэмнэл тогших",
};

const OPTION_IDS = ["a", "b", "c", "d"];
const START_FEN = new Chess().fen();
const DRAUGHTS_START_FEN = serializePosition(new Draughts().board(), new Draughts().turn());

function ExerciseForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: AdminExercise;
  submitLabel: string;
  onSubmit: (payload: ExercisePayload) => Promise<void>;
  onCancel: () => void;
}) {
  /*
   * Дасгалын төрлийг КУРС хязгаарлана (`lib/tactiq/courseNav.ts`): шатрын
   * курст шатрын хөлөг, даамын курст даамын хөлөг, хөлөггүй курст (Python,
   * English…) зөвхөн сонголттой дасгал.
   *
   * Сервер тал ч мөн адил шалгадаг — энэ нь ЗӨВХӨН тав тухын давхарга:
   * админ тохирохгүй товч дараад 400 авахаас өмнө түүнийг харахгүй байх нь
   * дээр.
   */
  const routeParams = useParams<{ slug: string }>();
  const allowedTypes = allowedExerciseTypes(routeParams.slug);

  const [type, setType] = useState<ExerciseType>(
    initial?.type && allowedTypes.includes(initial.type) ? initial.type : "choice"
  );
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  /** Англи хувилбарууд — заавал биш (`lib/i18n/content.ts`). */
  const [promptEn, setPromptEn] = useState(initial?.promptEn ?? "");
  const [labels, setLabels] = useState<string[]>(
    OPTION_IDS.map((id) => initial?.options?.find((o) => o.id === id)?.label ?? "")
  );
  /**
   * Англи шошгууд — ЯГ ИЖИЛ дарааллаар (`OPTION_IDS`).
   *
   * ⚠ `id` нь монгол хувилбартай таарсан байх ёстой: зөв хариулт
   * (`correctOptionId`) `id`-аар шалгагддаг тул `id` зөрвөл англи хэл
   * дээр зөв хариулт хэзээ ч таарахгүй.
   */
  const [labelsEn, setLabelsEn] = useState<string[]>(
    OPTION_IDS.map((id) => initial?.optionsEn?.find((o) => o.id === id)?.label ?? "")
  );
  const [correctIndex, setCorrectIndex] = useState(
    Math.max(0, OPTION_IDS.indexOf(initial?.correctOptionId ?? "a"))
  );
  const [fen, setFen] = useState(initial?.fen || START_FEN);
  const [move, setMove] = useState<{ from: string; to: string; promotion: string | null } | null>(
    initial?.correctFrom && initial?.correctTo
      ? { from: initial.correctFrom, to: initial.correctTo, promotion: initial.correctPromotion }
      : null
  );
  const [draughtsFen, setDraughtsFen] = useState(initial?.fen || DRAUGHTS_START_FEN);
  const [draughtsMove, setDraughtsMove] = useState<{ from: string; to: string } | null>(
    initial?.correctFrom && initial?.correctTo
      ? { from: initial.correctFrom, to: initial.correctTo }
      : null
  );
  /**
   * Өрөг бодлогын шийдэл нь ГАНЦ мөр (UCI) — хөлөг дээр тоглосон
   * нүүдлүүдээс бүрдэнэ. Доорх `PuzzleLineEditor` үүнийг бөглөнө.
   */
  const [solution, setSolution] = useState(initial?.solution ?? "");
  /**
   * Сүлжээний оньсогыг багш ГАРААР зурахгүй — доорх `NetPuzzleEditor`
   * санамсаргүй, ЗААВАЛ шийдэгдэх бүтэц үүсгэж өгнө.
   */
  const [grid, setGrid] = useState(initial?.grid ?? "");
  const [melody, setMelody] = useState(initial?.melody ?? "");
  const [tempo, setTempo] = useState(String(initial?.tempoBpm ?? TEMPO_DEFAULT));
  const [meter, setMeter] = useState(initial?.meter ?? "4/4");
  const [explanation, setExplanation] = useState(initial?.explanation ?? "");
  const [explanationEn, setExplanationEn] = useState(initial?.explanationEn ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!prompt.trim()) {
      setError("Асуулт заавал бөглөнө үү.");
      return;
    }

    let payload: ExercisePayload;
    if (type === "board-move") {
      if (!move) {
        setError("Хөлөг дээр зөв нүүдлийг хийж үзүүлнэ үү.");
        return;
      }
      payload = {
        type,
        prompt: prompt.trim(),
        fen,
        correctFrom: move.from,
        correctTo: move.to,
        correctPromotion: move.promotion,
        explanation: explanation.trim(),
      };
    } else if (type === "memory-game") {
      if (!decodeMemory(grid)) {
        setError("Тавцан бэлдээгүй байна — багц ба хосын тоог сонгоно уу.");
        return;
      }
      payload = { type, prompt: prompt.trim(), grid, explanation: explanation.trim() };
    } else if (type === "code-maze") {
      if (!decodeMaze(grid)) {
        setError(
          "Лабиринт буруу байна: эхлэл, зорилго тус бүр НЭГ байх, зам нь нээлттэй байх ёстой (хязгаар өгсөн бол хамгийн богино программ түүнд багтана)."
        );
        return;
      }
      payload = { type, prompt: prompt.trim(), grid, explanation: explanation.trim() };
    } else if (type === "slide-puzzle") {
      if (!decodeSlide(grid)) {
        setError("Оньсогын хэмжээг сонгоно уу.");
        return;
      }
      payload = { type, prompt: prompt.trim(), grid, explanation: explanation.trim() };
    } else if (type === "sudoku") {
      /*
       * `decodeSudoku` нь ганц шийдэлтэй эсэхийг ч шалгана — үүсгэгчээр
       * гаргасан судоку үргэлж тэнцэх ёстой. Тэнцэхгүй бол код дотор
       * алдаа байна гэсэн үг тул багшид ойлгомжтой мессеж өгнө.
       */
      if (!decodeSudoku(grid)) {
        setError("Судоку үүсгээгүй эсвэл буруу байна — «Шинэ судоку» дарна уу.");
        return;
      }
      payload = { type, prompt: prompt.trim(), grid, explanation: explanation.trim() };
    } else if (type === "matchstick") {
      /*
       * `decodeMatchstick` нь тэгшитгэл БУРУУ байх, БӨГӨӨД нэг таягаар
       * шийдэгдэх хоёуланг шалгана. Аль нэг нь зөрвөл сурагч гацах тул
       * багшид ЯГ юу нь болоогүйг хэлнэ.
       */
      if (!decodeMatchstick(grid)) {
        setError("Тэгшитгэл буруу — доорх шалгалтыг уншина уу.");
        return;
      }
      payload = { type, prompt: prompt.trim(), grid, explanation: explanation.trim() };
    } else if (type === "net-puzzle") {
      if (!decodePuzzle(grid)) {
        setError("Оньсого үүсгээгүй байна — «Шинэ оньсого» товчийг дарна уу.");
        return;
      }
      payload = {
        type,
        prompt: prompt.trim(),
        grid,
        explanation: explanation.trim(),
      };
    } else if (type === "chess-puzzle") {
      /*
       * Клиент талд ЭНД шалгах шалтгаан: сервер буруу шугамыг бүхэлд нь
       * татгалздаг ба ЯМАР нүүдэл хууль бус болохыг хэлж чаддаггүй. Энд
       * задалснаар багш алдаагаа шууд харна.
       */
      const parsed = parsePuzzle(fen, solution);
      if (!parsed) {
        setError(
          "Шийдэл буруу байна: нүүдэл бүр хууль ёсны, тоо нь СОНДГОЙ байх ёстой " +
            "(сурагчийн нүүдлээр эхэлж, түүгээрээ дуусна)."
        );
        return;
      }
      payload = {
        type,
        prompt: prompt.trim(),
        fen: parsed.fen,
        solution: formatSolution(parsed.moves),
        explanation: explanation.trim(),
      };
    } else if (type === "go-move") {
      /*
       * Серверийнхтэй ИЖИЛ шалгалт (`validateGoMove`) — гэхдээ энд ЯМАР
       * зүйл буруу байгааг багшид нэрлэж хэлнэ. Сервер зөвхөн бүхэлд нь
       * татгалздаг.
       */
      const position = decodeGo(grid);
      if (!position) {
        setError("Го-гийн байрлал буруу байна — доорх хөлөг дээр чулуугаа тавина уу.");
        return;
      }
      const points = parsePointList(position.size, solution);
      if (!points || points.some((point) => play(position, point) === null)) {
        setError("Зөв хариулт нь хоосон, хууль ёсны огтлолцол байх ёстой (жишээ нь «E5» эсвэл «E5 F5»).");
        return;
      }
      payload = {
        type,
        prompt: prompt.trim(),
        grid: encodeGo(position),
        solution: formatPointList(position.size, points),
        explanation: explanation.trim(),
      };
    } else if (type === "draughts-puzzle") {
      /*
       * Серверийнхтэй ижил шалгалт (`validateDraughtsPuzzle`) — гэхдээ энд
       * ЯМАР зүйл буруу байгааг багшид нэрлэж хэлнэ.
       */
      const parsed = parseDraughtsPuzzle(draughtsFen, solution);
      if (!parsed) {
        setError(
          "Шугам буруу байна: нүүдэл бүр хууль ёсны, тоо нь СОНДГОЙ, өрсөлдөгчийн " +
            "хариу бүр АЛБАДМАЛ (ганц хувилбартай) байх ёстой."
        );
        return;
      }
      payload = {
        type,
        prompt: prompt.trim(),
        fen: parsed.fen,
        solution: solution.trim(),
        explanation: explanation.trim(),
      };
    } else if (type === "draughts-move") {
      if (!draughtsMove) {
        setError("Хөлөг дээр зөв нүүдлийг хийж үзүүлнэ үү.");
        return;
      }
      payload = {
        type,
        prompt: prompt.trim(),
        fen: draughtsFen,
        correctFrom: draughtsMove.from,
        correctTo: draughtsMove.to,
        explanation: explanation.trim(),
      };
    } else if (type === "piano-play" || type === "rhythm-tap") {
      /*
       * Клиент талд ЧУХАМ ЭНД шалгах шалтгаан: сервер буруу аяыг бүхэлд нь
       * татгалздаг (`lib/api/courseAdmin.ts`) ба тэр татгалзал нь ЯМАР нот
       * буруу байсныг хэлж чаддаггүй. Энд шалгавал багш алдаагаа шууд харна.
       */
      const parsed = parseMelody(melody);
      if (!parsed) {
        setError("Ая буруу байна. Жишээ: C4 D4 E4 C4 (нот бүрийг зайгаар).");
        return;
      }
      if (parsed.length > MELODY_MAX_NOTES) {
        setError(`Ая хэт урт байна — хамгийн ихдээ ${MELODY_MAX_NOTES} нот.`);
        return;
      }
      const bpm = parseTempo(tempo);
      if (bpm === null) {
        setError(`Темп ${TEMPO_MIN}-${TEMPO_MAX} хооронд байх ёстой.`);
        return;
      }
      payload = {
        type,
        prompt: prompt.trim(),
        melody: formatMelody(parsed),
        tempoBpm: bpm,
        meter,
        explanation: explanation.trim(),
      };
    } else {
      const options = OPTION_IDS.map((id, index) => ({ id, label: labels[index].trim() })).filter(
        (option) => option.label
      );
      if (options.length < 2) {
        setError("Хамгийн багадаа 2 сонголт бөглөнө үү.");
        return;
      }
      const correctOptionId = OPTION_IDS[correctIndex];
      if (!options.some((option) => option.id === correctOptionId)) {
        setError("Зөв хариултаар сонгосон сонголт хоосон байна.");
        return;
      }
      const optionsEn = OPTION_IDS.map((id, index) => ({ id, label: labelsEn[index].trim() }))
        .filter((option) => option.label)
        // Зөвхөн монгол хувилбартай ТААРСАН сонголтыг илгээнэ — сервер ч
        // ижил шалгалт хийдэг (`validateOptionsEn`), гэхдээ энд шүүвэл
        // хоосон бичлэг дэмий дамжихгүй.
        .filter((option) => options.some((entry) => entry.id === option.id));
      payload = {
        type,
        prompt: prompt.trim(),
        options,
        optionsEn,
        correctOptionId,
        explanation: explanation.trim(),
      };
    }

    setBusy(true);
    setError(null);
    try {
      // Англи хувилбарууд нь дасгалын ТӨРЛӨӨС үл хамаарна тул салбар бүрд
      // давтахгүй, ЭНД нэг дор нэмнэ.
      await onSubmit({
        ...payload,
        promptEn: promptEn.trim(),
        explanationEn: explanationEn.trim(),
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Алдаа гарлаа.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/30 dark:bg-brand-500/5">
      <div className="flex flex-wrap gap-2">
        {allowedTypes.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              type === option
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            {EXERCISE_TYPE_LABELS[option]}
          </button>
        ))}
      </div>

      {/* Хуучин, курстэйгээ үл нийцэх дасгал — чимээгүй солихын оронд ил
          хэлнэ. Ийм мөр санд бодитоор олдсон (даамын курс дэх шатрын дасгал). */}
      {initial?.type && !allowedTypes.includes(initial.type) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          Энэ дасгал урьд нь &quot;{EXERCISE_TYPE_LABELS[initial.type]}&quot; төрөлтэй байсан
          нь энэ курст тохирохгүй. Хадгалахад дээрх зөвшөөрөгдсөн төрлөөр солигдоно.
        </p>
      )}

      <TextArea label="Асуулт" value={prompt} onChange={setPrompt} rows={2} />
      <TextArea
        label="Question (English)"
        value={promptEn}
        onChange={setPromptEn}
        rows={2}
      />

      {type === "board-move" ? (
        <div className="space-y-2">
          <TextField
            label="Эхлэх байрлал (FEN)"
            value={fen}
            onChange={setFen}
            maxLength={100}
            hint="Хоосон бол ердийн эхлэх байрлал. Өөрчлөхөд доорх хөлөг шинэчлэгдэнэ."
          />
          <BoardMoveEditor key={fen} fen={fen} initialMove={move} onCapture={setMove} />
        </div>
      ) : type === "memory-game" ? (
        <MemoryEditor grid={grid} onChange={setGrid} />
      ) : type === "code-maze" ? (
        <CodeMazeEditor grid={grid} onChange={setGrid} />
      ) : type === "slide-puzzle" ? (
        <SlidePuzzleEditor grid={grid} onChange={setGrid} />
      ) : type === "sudoku" ? (
        <SudokuEditor grid={grid} onChange={setGrid} />
      ) : type === "matchstick" ? (
        <MatchstickEditor grid={grid} onChange={setGrid} />
      ) : type === "go-move" ? (
        <GoMoveEditor grid={grid} solution={solution} onChange={setGrid} onSolution={setSolution} />
      ) : type === "net-puzzle" ? (
        <NetPuzzleEditor grid={grid} onChange={setGrid} />
      ) : type === "chess-puzzle" ? (
        <div className="space-y-2">
          <TextField
            label="Эхлэх байрлал (FEN)"
            value={fen}
            onChange={setFen}
            maxLength={200}
            hint="Бодлогын байрлал. Нүүх ээлж (FEN дэх «w»/«b») нь сурагчийн тал байна."
          />
          <PuzzleLineEditor key={fen} fen={fen} solution={solution} onChange={setSolution} />
        </div>
      ) : type === "draughts-puzzle" ? (
        <DraughtsPuzzleEditor
          key={initial?.id ?? "new"}
          initialFen={draughtsFen}
          initialSolution={solution}
          onChange={(nextFen, nextSolution) => {
            setDraughtsFen(nextFen);
            setSolution(nextSolution);
          }}
        />
      ) : type === "draughts-move" ? (
        <DraughtsMoveEditor
          key={initial?.id ?? "new"}
          initialFen={draughtsFen}
          initialMove={draughtsMove}
          onChange={(nextFen, nextMove) => {
            setDraughtsFen(nextFen);
            setDraughtsMove(nextMove);
          }}
        />
      ) : type === "piano-play" || type === "rhythm-tap" ? (
        <div className="space-y-2">
          <TextField
            label={type === "rhythm-tap" ? "Хэмнэл (нотууд ба урт)" : "Ая (нотууд)"}
            value={melody}
            onChange={setMelody}
            maxLength={200}
            hint={
              type === "rhythm-tap"
                ? "Урт нь хоёр цэгээр: C4:1 C4:0.5 C4:0.5 C4:2. Хэмнэлийн дасгалд өндөр нь хамаагүй — зөвхөн урт үнэлэгдэнэ."
                : "Нот бүрийг зайгаар: C4 D4 E4 C4. Урт өгөх бол C4:2 (2 цохилт). Диез бол C#4. До=C, Ре=D, Ми=E, Фа=F, Соль=G, Ля=A, Си=B."
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <TextField
              label="Темп (BPM)"
              value={tempo}
              onChange={setTempo}
              maxLength={3}
              hint={`${TEMPO_MIN}-${TEMPO_MAX}. Хоосон бол ${TEMPO_DEFAULT}.`}
            />
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Хэмжээ
              </span>
              <div className="mt-1 flex gap-1.5">
                {METERS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setMeter(option)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      meter === option
                        ? "bg-brand-500 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Сонголтууд (зөв хариултын дэргэдэх товгорыг сонгоно)
          </span>
          {OPTION_IDS.map((id, index) => (
            <div key={id} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${initial?.id ?? "new"}`}
                checked={correctIndex === index}
                onChange={() => setCorrectIndex(index)}
                className="size-4 shrink-0"
                aria-label={`${id} сонголт зөв`}
              />
              <input
                value={labels[index]}
                onChange={(event) =>
                  setLabels((current) => current.map((v, i) => (i === index ? event.target.value : v)))
                }
                placeholder={`Сонголт ${id.toUpperCase()}`}
                maxLength={200}
                className="w-full min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-white/15 dark:bg-white/5 dark:text-white"
              />
              {/* Англи шошго — заавал биш. Хоосон бол англи хэл дээр
                  монгол шошго харагдана (`lib/i18n/content.ts`). */}
              <input
                value={labelsEn[index]}
                onChange={(event) =>
                  setLabelsEn((current) =>
                    current.map((v, i) => (i === index ? event.target.value : v))
                  )
                }
                placeholder={`Option ${id.toUpperCase()} (English)`}
                maxLength={200}
                className="w-full min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
              />
            </div>
          ))}
        </div>
      )}

      <TextArea
        label="Тайлбар (заавал биш — буруу хариулсны дараа харагдана)"
        value={explanation}
        onChange={setExplanation}
        rows={2}
      />
      <TextArea
        label="Explanation (English)"
        value={explanationEn}
        onChange={setExplanationEn}
        rows={2}
      />

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={busy}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? "Хадгалж байна…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Цуцлах
        </button>
      </div>
    </div>
  );
}

/**
 * Админ ЖИНХЭНЭ хөлөг дээр зөв нүүдлийг "тоглож" зааж өгнө — гараар
 * координат бичихийн оронд. `key={fen}`-ээр эцэг компонент FEN-ийг
 * шинэчлэхэд бүрэн шинээр mount хийгддэг тул дотоод төлөв (`Chess`
 * instance) гараар цэвэрлэх шаардлагагүй.
 */
/**
 * ӨРӨГ БОДЛОГЫН шийдлийг хөлөг дээр ТОГЛОЖ оруулах засварлагч.
 *
 * Багш нүүдлүүдийг ЭЭЛЖЛЭН хийнэ: 1-р (сурагчийн), 2-р (өрсөлдөгчийн),
 * 3-р (сурагчийн)… Шугам нь ЗААВАЛ сурагчийн нүүдлээр дуусна — эс бөгөөс
 * бодлого нь «одоо юу болох вэ?» гэсэн хариултгүй асуулт болно.
 *
 * ⚠ `BoardMoveEditor`-ыг өргөтгөөгүй, ТУСДАА бичсэн: тэр нь ГАНЦ нүүдэл
 * барьж, дараа нь хөлгөө түгждэг. Эндхийн гол ажил бол ДАРААЛАЛ бөгөөд
 * буцаах (undo) шаардлагатай — хоёуланг нэг компонентод шахвал аль аль нь
 * ойлгоход хэцүү болно.
 */
/**
 * СҮЛЖЭЭНИЙ ОНЬСОГО үүсгэгч.
 *
 * ⚠ Багшид кабель ЗУРУУЛАХГҮЙ, харин хэмжээгээ сонгуулаад САНАМСАРГҮЙ
 * бүтэц үүсгэнэ. Шалтгаан: гараар зурсан сүлжээ нь амархан гогцоотой
 * эсвэл тасархай болдог ба тэр нь сурагчид ШИЙДЭГДЭХГҮЙ оньсого болж
 * хүрнэ. Үүсгэгч нь модон бүтэц (`lib/net/puzzle.ts`) гаргадаг тул
 * шийдэгдэх нь баталгаатай.
 *
 * Багш таалагдтал нь «Шинэ оньсого» дарж сонгоно — урьдчилсан харагдац
 * нь ШИЙДСЭН байдлыг харуулна (сурагчид холисон хувилбар очно).
 */
/**
 * ГУЛСДАГ ОНЬСОГЫН тохиргоо — зөвхөн ХЭМЖЭЭ.
 *
 * ⚠ Эхлэл байрлалыг ЭНД тогтоохгүй: холилтыг сурагчийн талд дасгалын
 * ID-гаар үрлэж хийдэг (`SlidePuzzleExercise`). Ингэснээр багш «шийдэгдэх
 * үү» гэж санаа зовох шаардлагагүй — холилт нь ЗӨВХӨН хууль ёсны
 * нүүдлээр хийгддэг тул үргэлж шийдэгдэнэ.
 */
/**
 * КОД УГСРАХ ЛАБИРИНТЫН засварлагч — багш нүд бүрийг ЗУРНА.
 *
 * ⚠ Санамсаргүй үүсгэгч ХЭРЭГЛЭХГҮЙ (сүлжээ, судокугаас ялгаатай):
 * лабиринтын сурган зүйн утга нь ЗОРИУДААС гардаг — эхний хичээлд шулуун
 * зам, дараа нь нэг эргэлт, дараа нь давталт шаардсан урт коридор. Санамсаргүй
 * гаргавал энэ дараалал алдагдана.
 *
 * ⚠ Хадгалахын өмнө `decodeMaze` шалгана: зам нээлттэй эсэх, хязгаарт
 * багтах эсэх. Засварлагч нь ХАМГИЙН БОГИНО программын уртыг тэр дор нь
 * харуулдаг тул багш хязгаараа мэдээлэлтэйгээр тавина.
 */
/**
 * САНАХ ОЙН ТАВЦАНГИЙН засварлагч — багц ба хосын тоог сонгоно.
 *
 * ⚠ Багш эможи бичихийг ШААРДАХГҮЙ: бэлэн багцаас сонгоно. Гараар
 * бичүүлбэл давхардсан эсвэл ялгаагүй харагдах тэмдэгт (жишээ нь ✔ ба ✅)
 * амархан орж, тоглоом нь шийдэгдэхгүй эсвэл шударга бус болно.
 *
 * ⚠ ХОЛИЛТЫГ ЭНД ХИЙХГҮЙ. Тавцан нь зөвхөн ЗҮЙЛСИЙН ЖАГСААЛТ; байрлалыг
 * сурагч бүрд дасгалын ID-гаар үрлэж холино (`MemoryExercise`).
 */
function MemoryEditor({
  grid,
  onChange,
}: {
  grid: string;
  onChange: (next: string) => void;
}) {
  const current = decodeMemory(grid);
  const [preset, setPreset] = useState(0);
  const [pairs, setPairs] = useState(current?.pairs ?? 6);

  const build = (nextPreset: number, nextPairs: number) => {
    setPreset(nextPreset);
    setPairs(nextPairs);
    const items = MEMORY_PRESETS[nextPreset].items.slice(0, nextPairs);
    onChange(encodeMemory({ pairs: items.length, items }));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Багц</span>
        {MEMORY_PRESETS.map((item, index) => (
          <button
            key={item.label}
            type="button"
            onClick={() => build(index, pairs)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              preset === index
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Хос</span>
        {[3, 4, 6, 8, 10].map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => build(preset, count)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              pairs === count
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {count} ({count * 2} хөзөр)
          </button>
        ))}
      </div>

      {current ? (
        <>
          <div className="flex flex-wrap gap-1.5">
            {current.items.map((item) => (
              <span
                key={item}
                className="grid size-10 place-items-center rounded-lg bg-gray-100 text-xl dark:bg-white/10"
              >
                {item}
              </span>
            ))}
          </div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Бэлэн: {current.pairs} хос ({current.pairs * 2} хөзөр).
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Багц ба хосын тоог сонгоно уу.
        </p>
      )}
    </div>
  );
}

function CodeMazeEditor({
  grid,
  onChange,
}: {
  grid: string;
  onChange: (next: string) => void;
}) {
  /*
   * ⚠ Төлөвийг ХАДГАЛСАН МӨРӨӨС уншина (`decodeMaze`) — гэхдээ тэр нь
   * зөвхөн ЗӨВ лабиринтыг задалдаг. Зурж байх явцад лабиринт түр зуур
   * буруу (зам хаагдсан) байх нь ЭНГИЙН зүйл тул зурах төлөвийг тусад нь
   * барина; `onChange` рүү зөвхөн бүтэн мөрийг өгнө.
   */
  const parsed = decodeMaze(grid);

  const [cols, setCols] = useState(parsed?.cols ?? 5);
  const [rows, setRows] = useState(parsed?.rows ?? 5);
  const [cells, setCells] = useState<string[]>(() => {
    if (!parsed) return new Array(25).fill(EMPTY);
    const next = [...parsed.cells];
    next[parsed.start] = START;
    next[parsed.goal] = GOAL;
    return next;
  });
  const [facing, setFacing] = useState<Direction>(parsed?.facing ?? "E");
  const [limit, setLimit] = useState(parsed?.limit ? String(parsed.limit) : "");
  const [brush, setBrush] = useState<"wall" | "start" | "goal" | "empty">("wall");

  /** Одоогийн зургийг мөр болгож эцэг рүү дамжуулна. */
  const push = (
    nextCells: string[],
    nextCols: number,
    nextRows: number,
    nextFacing: Direction,
    nextLimit: string
  ) => {
    const body = nextCells.join("");
    const suffix = nextLimit.trim() === "" ? "" : `:${nextLimit.trim()}`;
    onChange(`maze:${nextCols}x${nextRows}:${nextFacing}:${body}${suffix}`);
  };

  const resize = (nextCols: number, nextRows: number) => {
    const next = new Array(nextCols * nextRows).fill(EMPTY);
    // Хуучин зургийг давхцах хэсэгт нь ХАДГАЛНА — хэмжээ өөрчлөх бүрд
    // эхнээс зурах нь багшийн ажлыг дэмий устгана.
    for (let row = 0; row < Math.min(rows, nextRows); row += 1) {
      for (let col = 0; col < Math.min(cols, nextCols); col += 1) {
        next[row * nextCols + col] = cells[row * cols + col];
      }
    }
    setCols(nextCols);
    setRows(nextRows);
    setCells(next);
    push(next, nextCols, nextRows, facing, limit);
  };

  const paint = (index: number) => {
    const next = [...cells];

    if (brush === "start" || brush === "goal") {
      // Эхлэл, зорилго тус бүр ГАНЦ — хуучныг нь автоматаар арилгана.
      const mark = brush === "start" ? START : GOAL;
      for (let i = 0; i < next.length; i += 1) {
        if (next[i] === mark) next[i] = EMPTY;
      }
      next[index] = mark;
    } else {
      next[index] = brush === "wall" ? WALL : EMPTY;
    }

    setCells(next);
    push(next, cols, rows, facing, limit);
  };

  const shortest = parsed ? shortestProgram(parsed) : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Хэмжээ</span>
        {[3, 4, 5, 6, 7, 8].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => resize(size, size)}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
              cols === size && rows === size
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {size}×{size}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Багс</span>
        {(
          [
            ["wall", "Хана"],
            ["empty", "Хоосон"],
            ["start", "Эхлэл"],
            ["goal", "Зорилго"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setBrush(value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              brush === value
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        className="mx-auto grid w-full max-w-[260px] overflow-hidden rounded-lg border-2 border-gray-300"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {cells.map((cell, index) => (
          <button
            key={index}
            type="button"
            onClick={() => paint(index)}
            className={`flex aspect-square items-center justify-center border border-gray-200 text-sm ${
              cell === WALL
                ? "bg-gray-700"
                : "bg-emerald-50 hover:bg-emerald-100"
            }`}
          >
            {cell === START ? "🐰" : cell === GOAL ? "🥕" : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Эхний чиглэл</span>
        {(["N", "E", "S", "W"] as Direction[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setFacing(option);
              push(cells, cols, rows, option, limit);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              facing === option
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {option === "N" ? "↑" : option === "E" ? "→" : option === "S" ? "↓" : "←"}
          </button>
        ))}
      </div>

      <TextField
        label="Блокийн хязгаар (заавал биш)"
        value={limit}
        onChange={(value) => {
          setLimit(value);
          push(cells, cols, rows, facing, value);
        }}
        maxLength={2}
        hint="Хоосон бол хязгааргүй. Хязгаар өгвөл сурагчид «Давтах» блок гарч ирнэ — давталт заахад ашиглана."
      />

      {parsed ? (
        <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
          Бэлэн: {parsed.cols}×{parsed.rows}, хамгийн богино программ {shortest} блок
          {parsed.limit !== null ? `, хязгаар ${parsed.limit}` : ", хязгааргүй"}.
        </p>
      ) : (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Эхлэл (🐰) ба зорилго (🥕) тус бүр нэгийг тавьж, хооронд нь зам нээнэ үү.
        </p>
      )}
    </div>
  );
}

function SlidePuzzleEditor({
  grid,
  onChange,
}: {
  grid: string;
  onChange: (next: string) => void;
}) {
  const current = decodeSlide(grid);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Хэмжээ</span>
        {[3, 4, 5].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => onChange(encodeSlide(size))}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              current?.size === size
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {size}×{size} ({size * size - 1} тоо)
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {current
          ? `Бэлэн: ${current.size}×${current.size}. Сурагч бүрд өөр холилт очно.`
          : "Хэмжээгээ сонгоно уу."}
      </p>
    </div>
  );
}

/**
 * СУДОКУ үүсгэгч.
 *
 * ⚠ Багшид гараар тоо бөглүүлэхгүй: гараар зохиосон судоку амархан ОЛОН
 * ШИЙДЭЛТЭЙ болдог ба тэр нь логикоор биш ТААЖ бодох тоглоом болно.
 * Үүсгэгч нь нүд хасах бүрдээ «ганц шийдэлтэй хэвээр юу» гэдгийг шалгадаг
 * (`lib/puzzles/sudoku.ts`).
 */
/** Редакторын шалгалтын нэг мөр. ⚠ Компонент дотор БИШ, гадна — рендэр
 * тутамд шинэ компонент үүсгэвэл төлөв тань эргэж тавигдана. */
function MatchstickCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-gray-500"}>
      {ok ? "✓" : "•"} {label}
    </li>
  );
}

/**
 * «Таягны оньсого» редактор — багш ТЭГШИТГЭЛИЙГ текстээр бичнэ («6+4=4»).
 *
 * ⚠ ЯАГААД ТАЯГ ЗУРААД БАЙХГҮЙ ВЭ: таяг нэг бүрийг дарж асаах/унтраах
 * редактор нь багшид 7 сегмент × нүд бүрээр цохих ажил болно. Харин
 * тэгшитгэлийг бичих нь хормын зуур, бөгөөд ҮР ДҮН нь ижил — дүрс нь
 * тооноос автоматаар гарна.
 *
 * ⚠ Шалгалтыг ШУУД харуулна: оньсого нь (1) уншигдах, (2) БУРУУ,
 * (3) ЯГ НЭГ таягаар шийдэгдэх гурван нөхцлийг зэрэг хангах ёстой.
 * Эдгээрийг хадгалахаас өмнө харуулахгүй бол багш яагаад хадгалагдахгүй
 * байгааг таах шаардлагатай болно.
 */
function MatchstickEditor({
  grid,
  onChange,
}: {
  grid: string;
  onChange: (next: string) => void;
}) {
  const current = decodeMatchstick(grid);
  const [text, setText] = useState(() => {
    if (current) return matchstickToText(current) ?? "";
    const loose = grid.startsWith("matchstick:") ? null : grid;
    return loose ?? "";
  });

  const parsed = matchstickFromText(text.trim());
  const readable = parsed !== null;
  const isFalse = parsed ? evaluateMatchstick(parsed) === false : false;
  const solutions = parsed && isFalse ? countSolutions(parsed) : 0;

  const apply = (next: string) => {
    setText(next);
    const puzzle = matchstickFromText(next.trim());
    onChange(puzzle ? encodeMatchstick(puzzle) : "");
  };

  return (
    <div className="space-y-2">
      <TextField
        label="Тэгшитгэл"
        value={text}
        onChange={apply}
        maxLength={9}
        placeholder="6+4=4"
        hint="Зөвхөн 0-9 тоо ба + − = тэмдэг. Дүрс нь эндээс автоматаар гарна."
      />
      <ul className="space-y-0.5 text-xs">
        <MatchstickCheck ok={readable} label="Тэмдэгтүүд зөв (0-9, +, −, =)" />
        <MatchstickCheck ok={isFalse} label="Тэгшитгэл БУРУУ (зөв бол шийдэх юм үлдэхгүй)" />
        <MatchstickCheck ok={solutions === 1} label={`Нэг таягаар шийдэгдэх арга: ${solutions}`} />
      </ul>
      {solutions > 1 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Хоёр ба олон шийдэлтэй бол сурагч зөв бодсон ч буруу гэж хэлэгдэж магадгүй.
        </p>
      )}
    </div>
  );
}

function SudokuEditor({
  grid,
  onChange,
}: {
  grid: string;
  onChange: (next: string) => void;
}) {
  const current = decodeSudoku(grid);
  const [size, setSize] = useState<SudokuSize>(current?.size ?? 4);
  const [level, setLevel] = useState<"easy" | "medium" | "hard">("easy");
  const [busy, setBusy] = useState(false);

  /**
   * @param seed Товшилтын мөч (`event.timeStamp`) — товч дарах бүрд өөр
   *   судоку. Рендэрийн дотор цаг уншихыг React-ийн цэвэр байдлын дүрэм
   *   хориглодог тул үйл явдлаас авна.
   */
  const generate = (
    nextSize: SudokuSize,
    nextLevel: "easy" | "medium" | "hard",
    seed: number
  ) => {
    setSize(nextSize);
    setLevel(nextLevel);
    setBusy(true);
    const puzzle = generateSudoku(
      nextSize,
      keepForDifficulty(nextSize, nextLevel),
      makeRng(Math.floor(seed * 1000))
    );
    onChange(encodeSudoku(puzzle));
    setBusy(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Хэмжээ</span>
        {([4, 6, 9] as SudokuSize[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={(event) => generate(option, level, event.timeStamp)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              size === option
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {option}×{option}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Хүндрэл</span>
        {([["easy", "Хялбар"], ["medium", "Дунд"], ["hard", "Хүнд"]] as const).map(
          ([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={(event) => generate(size, value, event.timeStamp)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                level === value
                  ? "bg-brand-500 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
              }`}
            >
              {label}
            </button>
          )
        )}
        <button
          type="button"
          onClick={(event) => generate(size, level, event.timeStamp)}
          disabled={busy}
          className="ml-auto rounded-lg border-2 border-brand-500 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
        >
          Шинэ судоку
        </button>
      </div>

      {current ? (
        <>
          <div
            className="mx-auto grid w-full max-w-[220px] overflow-hidden rounded border-2 border-gray-800"
            style={{ gridTemplateColumns: `repeat(${current.size}, minmax(0, 1fr))` }}
          >
            {current.givens.map((value, index) => (
              <div
                key={index}
                className="flex aspect-square items-center justify-center border border-gray-300 bg-white text-xs font-bold text-gray-900"
              >
                {value === 0 ? "" : value}
              </div>
            ))}
          </div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Бэлэн: {current.size}×{current.size},{" "}
            {current.givens.filter((value) => value !== 0).length} өгөгдсөн тоо (ганц шийдэлтэй).
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          «Шинэ судоку» дарж үүсгэнэ үү.
        </p>
      )}
    </div>
  );
}

/** Хоосон го-гийн хөлөг — шинэ дасгалын эхлэл. */
const emptyGo = (size: number): GoPosition => ({
  size,
  cells: Array.from({ length: size * size }, () => null),
  turn: "b",
});

/**
 * "go-move" дасгалын засварлагч.
 *
 * ⚠ Байрлалыг багш ГАРААР өрнө: го-гийн дасгал бүр ТОДОРХОЙ хэлбэр
 * (атари, нүд, шат) заадаг тул санамсаргүй үүсгэгч энд утгагүй —
 * сүлжээний оньсогоос үндсэн ялгаа нь энэ.
 *
 * Хөлөг ХОЁР ГОРИМТОЙ: «Чулуу өрөх» горимд огтлолцол дээр дарахад
 * хоосон → хар → цагаан → хоосон гэж эргэлдэнэ, «Зөв хариулт» горимд
 * дарсан хоосон цэг зөв хариултын жагсаалтад нэмэгдэнэ/хасагдана.
 */
function GoMoveEditor({
  grid,
  solution,
  onChange,
  onSolution,
}: {
  grid: string;
  solution: string;
  onChange: (next: string) => void;
  onSolution: (next: string) => void;
}) {
  const position = decodeGo(grid) ?? emptyGo(9);
  const answers = parsePointList(position.size, solution) ?? [];
  const [mode, setMode] = useState<"stones" | "answer">("stones");
  const [turn, setTurn] = useState<Stone>(position.turn);

  const update = (next: GoPosition) => onChange(encodeGo(next));

  const resize = (size: number) => {
    onChange(encodeGo({ ...emptyGo(size), turn }));
    onSolution("");
  };

  const click = (index: number) => {
    if (mode === "answer") {
      if (position.cells[index] !== null) return;
      const next = answers.includes(index)
        ? answers.filter((point) => point !== index)
        : [...answers, index];
      onSolution(formatPointList(position.size, next));
      return;
    }

    const cells = [...position.cells];
    cells[index] = cells[index] === null ? "b" : cells[index] === "b" ? "w" : null;
    update({ ...position, cells });
    // Чулуу арилсан/нэмэгдсэн цэг зөв хариулт байсан бол тэр нь одоо
    // хүчингүй — эс бөгөөс сурагч дүүрсэн цэг дээр тавих ёстой болно.
    if (cells[index] !== null && answers.includes(index)) {
      onSolution(formatPointList(position.size, answers.filter((point) => point !== index)));
    }
  };

  const setSideToMove = (next: Stone) => {
    setTurn(next);
    update({ ...position, turn: next });
  };

  const illegal = answers.filter((point) => play(position, point) === null);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Хэмжээ</span>
        {[9, 13, 19].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => resize(option)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              position.size === option
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {option}×{option}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Сурагчийн тал</span>
        {(["b", "w"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSideToMove(option)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              position.turn === option
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {option === "b" ? "Хар" : "Цагаан"}
          </button>
        ))}

        <span className="ml-auto flex gap-2">
          {(["stones", "answer"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                mode === option
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
              }`}
            >
              {option === "stones" ? "Чулуу өрөх" : "Зөв хариулт"}
            </button>
          ))}
        </span>
      </div>

      <GoBoard position={position} interactive onPlay={click} hints={answers} />

      <p className="text-sm text-gray-600 dark:text-gray-300">
        {answers.length === 0
          ? "«Зөв хариулт» горимд шилжиж, сурагчийн тавих ёстой огтлолцлыг сонгоно уу."
          : `Зөв хариулт: ${answers.map((point) => pointLabel(position.size, point)).join(", ")}`}
      </p>

      {illegal.length > 0 && (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          Хууль бус зөв хариулт: {illegal.map((point) => pointLabel(position.size, point)).join(", ")}
          {" "}— тэр цэг дээр чулуу амьсгалгүй үлдэнэ.
        </p>
      )}
    </div>
  );
}

function NetPuzzleEditor({
  grid,
  onChange,
}: {
  grid: string;
  onChange: (next: string) => void;
}) {
  const puzzle = decodePuzzle(grid);
  const [size, setSize] = useState(puzzle ? puzzle.cols : 5);

  /**
   * @param seed Товшилтын мөч (`event.timeStamp`) — товч дарах бүрд өөр
   *   оньсого гаргах ҮР. Цагийг компонентын дотроос уншихгүй байгаа нь
   *   зориуд: React-ийн цэвэр байдлын дүрэм (`react-hooks/purity`) рендэрийн
   *   мөчид гадаад төлөв уншихыг хориглодог ба үйл явдлын мөч нь ямар ч
   *   тохиолдолд илүү нарийн (мс-ийн бутархайтай).
   */
  const generate = (nextSize: number, seed: number) => {
    setSize(nextSize);
    const next = generatePuzzle(nextSize, nextSize, makeRng(Math.floor(seed * 1000)));
    onChange(encodePuzzle(next));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Хэмжээ</span>
        {[3, 4, 5, 6, 7].map((option) => (
          <button
            key={option}
            type="button"
            onClick={(event) => generate(option, event.timeStamp)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              size === option
                ? "bg-brand-500 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            {option}×{option}
          </button>
        ))}
        <button
          type="button"
          onClick={(event) => generate(size, event.timeStamp)}
          className="ml-auto rounded-lg border-2 border-brand-500 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-500/10"
        >
          Шинэ оньсого
        </button>
      </div>

      {puzzle ? (
        <>
          <NetPreview puzzle={puzzle} />
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Бэлэн: {puzzle.cols}×{puzzle.rows}, {countEndpoints(puzzle)} компьютер.
            <span className="ml-1 font-normal text-gray-500 dark:text-gray-400">
              Сурагчид холисон хувилбар очно.
            </span>
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Хэмжээгээ сонгож «Шинэ оньсого» дарна уу.
        </p>
      )}
    </div>
  );
}

/** Хэдэн төгсгөлийн зангилаа (компьютер) байгааг тоолно. */
function countEndpoints(puzzle: NetPuzzle): number {
  return puzzle.tiles.filter((tile) => isEndpoint(tile)).length;
}

/**
 * ШИЙДСЭН байрлалын урьдчилсан харагдац — зөвхөн харах, товшихгүй.
 *
 * Сурагчийн компонентыг (`NetPuzzleExercise`) дахин ашиглаагүй шалтгаан:
 * тэр нь холих, товшилт, ялалтын логиктой бөгөөд админд эдгээр нь
 * шаардлагагүй, бүр төөрөгдүүлнэ (багш тоглож эхэлбэл юу хадгалагдахыг
 * эргэлзэнэ). Энд зөвхөн бүтцийг үзүүлнэ.
 */
function NetPreview({ puzzle }: { puzzle: NetPuzzle }) {
  return (
    <div
      className="mx-auto grid w-full max-w-xs gap-0.5 rounded-xl bg-gray-200 p-1 dark:bg-white/10"
      style={{ gridTemplateColumns: `repeat(${puzzle.cols}, minmax(0, 1fr))` }}
    >
      {puzzle.tiles.map((tile, index) => (
        <div
          key={index}
          className="relative aspect-square rounded bg-white dark:bg-gray-100"
        >
          <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full">
            {[
              { dir: NORTH, x2: 20, y2: 0 },
              { dir: EAST, x2: 40, y2: 20 },
              { dir: SOUTH, x2: 20, y2: 40 },
              { dir: WEST, x2: 0, y2: 20 },
            ].map(
              ({ dir, x2, y2 }) =>
                (tile & dir) !== 0 && (
                  <line
                    key={dir}
                    x1={20}
                    y1={20}
                    x2={x2}
                    y2={y2}
                    stroke="#22d3ee"
                    strokeWidth={7}
                    strokeLinecap="round"
                  />
                )
            )}
            {index === puzzle.server ? (
              <rect x={12} y={10} width={16} height={20} rx={2} fill="#94a3b8" />
            ) : isEndpoint(tile) ? (
              <rect x={11} y={12} width={18} height={13} rx={2} fill="#67e8f9" stroke="#475569" strokeWidth={1.5} />
            ) : null}
          </svg>
        </div>
      ))}
    </div>
  );
}

function PuzzleLineEditor({
  fen,
  solution,
  onChange,
}: {
  fen: string;
  solution: string;
  onChange: (next: string) => void;
}) {
  const gameRef = useRef<Chess | null>(null);
  if (gameRef.current === null) {
    let game: Chess;
    try {
      game = new Chess(fen || undefined);
    } catch {
      game = new Chess();
    }
    // Хадгалсан шугамыг эргүүлж тоглуулснаар ҮРГЭЛЖЛҮҮЛЭН засах боломжтой.
    for (const token of solution.trim().split(/[\s,]+/).filter(Boolean)) {
      const parsed = parseUci(token);
      if (!parsed) break;
      try {
        game.move({
          from: parsed.from,
          to: parsed.to,
          promotion: parsed.promotion ?? undefined,
        });
      } catch {
        // FEN засагдсан бол хуучин шугам хууль бус болно — тэр хүртэлх
        // хэсгийг үлдээгээд зогсоно.
        break;
      }
    }
    gameRef.current = game;
  }

  const [version, forceUpdate] = useState(0);

  const board = useMemo(
    () => gameRef.current!.board(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  const history = gameRef.current!.history({ verbose: true }) as Move[];

  const sync = () => {
    const moves = gameRef.current!.history({ verbose: true }) as Move[];
    onChange(moves.map((move) => toUci(move)).join(" "));
    forceUpdate((v) => v + 1);
  };

  const handleMove = (from: Square, to: Square) => {
    const chess = gameRef.current!;
    if (chess.history().length >= PUZZLE_MAX_MOVES) return;

    const match = resolveMove(chess, from, to);
    if (!match) return;
    if (!chess.move({ from, to, promotion: match.promotion })) return;

    sync();
  };

  const undo = () => {
    gameRef.current!.undo();
    sync();
  };

  const reset = () => {
    let game: Chess;
    try {
      game = new Chess(fen || undefined);
    } catch {
      game = new Chess();
    }
    gameRef.current = game;
    sync();
  };

  const parsed = parsePuzzle(fen, solution);
  const nextIsPlayer = history.length % 2 === 0;

  return (
    <div className="space-y-2">
      <ChessBoard
        board={board}
        orientation={puzzleOrientation(fen)}
        interactive={history.length < PUZZLE_MAX_MOVES}
        getLegalTargets={(square) =>
          (gameRef.current!.moves({ square, verbose: true }) as Move[]).map(
            (move) => move.to as Square
          )
        }
        onMove={handleMove}
        lastMove={
          history.length > 0
            ? {
                from: history[history.length - 1].from as Square,
                to: history[history.length - 1].to as Square,
              }
            : null
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {history.map((move, index) => (
          <span
            key={index}
            className={`rounded-lg px-2 py-1 text-xs font-semibold ${
              index % 2 === 0
                ? "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
                : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
            }`}
          >
            {index % 2 === 0 ? "Сурагч" : "Хариу"}: {move.san}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p
          className={`text-sm font-medium ${
            parsed
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {parsed
            ? `Бэлэн: ${puzzleGoalLabel(parsed)}`
            : nextIsPlayer
              ? "Сурагчийн нүүдлийг хийнэ үү (шугам үүгээр дуусна)."
              : "Одоо ӨРСӨЛДӨГЧИЙН хариуг хийнэ үү."}
        </p>

        {history.length > 0 && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={undo}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            >
              Буцаах
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Дахин
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardMoveEditor({
  fen,
  initialMove,
  onCapture,
}: {
  fen: string;
  initialMove: { from: string; to: string; promotion: string | null } | null;
  onCapture: (move: { from: string; to: string; promotion: string | null } | null) => void;
}) {
  const gameRef = useRef<Chess | null>(null);
  if (gameRef.current === null) {
    let game: Chess;
    try {
      game = new Chess(fen || undefined);
    } catch {
      game = new Chess();
    }
    if (initialMove) {
      try {
        game.move({
          from: initialMove.from as Square,
          to: initialMove.to as Square,
          promotion: initialMove.promotion ?? undefined,
        });
      } catch {
        // Хуучин нүүдэл ЭНЭ FEN-д хууль бус болсон (жишээ нь FEN-ийг
        // засварласан) — хоосон эхлэлээс шинээр сонгуулна.
      }
    }
    gameRef.current = game;
  }

  const [version, forceUpdate] = useState(0);
  const [captured, setCaptured] = useState(initialMove);

  const board = useMemo(
    () => gameRef.current!.board(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  const handleMove = (from: Square, to: Square) => {
    if (captured) return;

    const chess = gameRef.current!;
    const match = resolveMove(chess, from, to);
    if (!match) return;

    const applied = chess.move({ from, to, promotion: match.promotion });
    if (!applied) return;

    forceUpdate((v) => v + 1);
    const next = { from, to, promotion: applied.promotion ?? null };
    setCaptured(next);
    onCapture(next);
  };

  const reset = () => {
    let game: Chess;
    try {
      game = new Chess(fen || undefined);
    } catch {
      game = new Chess();
    }
    gameRef.current = game;
    forceUpdate((v) => v + 1);
    setCaptured(null);
    onCapture(null);
  };

  return (
    <div className="space-y-2">
      <ChessBoard
        board={board}
        orientation="white"
        interactive={!captured}
        getLegalTargets={(square) =>
          (gameRef.current!.moves({ square, verbose: true }) as Move[]).map(
            (move) => move.to as Square
          )
        }
        onMove={handleMove}
        lastMove={captured ? { from: captured.from as Square, to: captured.to as Square } : null}
      />
      <div className="flex items-center justify-between gap-2">
        {captured ? (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Зөв нүүдэл: {captured.from} → {captured.to}
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Хөлөг дээр зөв нүүдлийг хийж үзүүлнэ үү.
          </p>
        )}
        {captured && (
          <button
            type="button"
            onClick={reset}
            className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Дахин
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * "draughts-move" дасгал засварлагч. Шатрын `BoardMoveEditor`-оос ЯЛГААТАЙ
 * нь: дамд FEN шиг гараар бичдэг стандарт тэмдэглэгээ өргөн хэрэглээгүй тул
 * ХОЁР үе шаттай — эхлээд БАЙРЛАЛАА хөлөг дээр (ямар ч тал, ээлжлэн)
 * нүүлгэж тохируулаад "Эндээс эхэл" дараад ТҮГЖИНЭ, дараа нь ТҮГЖСЭН
 * байрлалаас яг НЭГ (зөв) нүүдлийг хийж үзүүлнэ.
 *
 * ⚠ Зөвхөн ХУУЛЬ ЁСНЫ нүүдлээр л байрлал тохируулж болно (дурын дүрс чөлөөтэй
 * тавих засварлагч БИШ) — зорилготойгоор энгийн: бодит тоглолтоос гарсан
 * байрлалыг л дахин бүтээж болно, гэхдээ шаардлагатай ихэнх сургалтын
 * жишээнд хангалттай.
 */
/**
 * "draughts-puzzle" дасгалын засварлагч — эхлээд БАЙРЛАЛ, дараа нь ШУГАМ.
 *
 * ⚠ `DraughtsMoveEditor`-той ижил хоёр үе шаттай (нүүдэл хийж байрлал өрөх
 * → «Эндээс эхэл» → хариулт бичих), гэхдээ энд хариулт нь НЭГ нүүдэл БИШ,
 * бүтэн цуваа: сурагч, өрсөлдөгч ээлжлэн.
 */
function DraughtsPuzzleEditor({
  initialFen,
  initialSolution,
  onChange,
}: {
  initialFen: string;
  initialSolution: string;
  onChange: (fen: string, solution: string) => void;
}) {
  const gameRef = useRef<Draughts | null>(null);
  const [locked, setLocked] = useState(!!initialSolution.trim());
  const [lockedFen, setLockedFen] = useState(initialFen);
  const [line, setLine] = useState<string[]>(
    initialSolution.trim() ? initialSolution.trim().split(/[\s,]+/) : []
  );

  if (gameRef.current === null) {
    const position = deserializePosition(initialFen);
    const game = new Draughts(position ?? undefined);
    // Хадгалсан шугамыг эргүүлж тоглуулснаар ҮРГЭЛЖЛҮҮЛЭН засах боломжтой.
    for (const token of initialSolution.trim().split(/[\s,]+/).filter(Boolean)) {
      const parsedToken = parseDraughtsMoveToken(token);
      if (!parsedToken) break;
      const applied = game.move(
        squareFromNumber(parsedToken.from),
        squareFromNumber(parsedToken.to)
      );
      if (!applied) break;
    }
    gameRef.current = game;
  }

  const [version, forceUpdate] = useState(0);
  const [boardLastMove, setBoardLastMove] = useState<{
    from: DraughtsSquare;
    to: DraughtsSquare;
  } | null>(null);

  const board = useMemo(
    () => gameRef.current!.board(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  const handleMove = (from: DraughtsSquare, to: DraughtsSquare) => {
    const game = gameRef.current!;
    if (locked && line.length >= DRAUGHTS_PUZZLE_MAX_MOVES) return;

    const applied = game.move(from, to);
    if (!applied) return;

    forceUpdate((v) => v + 1);
    setBoardLastMove({ from, to });

    if (!locked) return; // байрлал өрж байгаа мөч — хариулт биш

    const next = [...line, toMoveToken({ from: squareToNumber(from), to: squareToNumber(to) })];
    setLine(next);
    onChange(lockedFen, next.join(" "));
  };

  const lockPosition = () => {
    const fen = serializePosition(gameRef.current!.board(), gameRef.current!.turn());
    setLockedFen(fen);
    setLocked(true);
    setLine([]);
    onChange(fen, "");
  };

  const undo = () => {
    if (line.length === 0) return;
    gameRef.current!.undo();
    const next = line.slice(0, -1);
    setLine(next);
    setBoardLastMove(null);
    forceUpdate((v) => v + 1);
    onChange(lockedFen, next.join(" "));
  };

  const resetAll = () => {
    const position = deserializePosition(initialFen);
    gameRef.current = new Draughts(position ?? undefined);
    setLocked(false);
    setLine([]);
    setBoardLastMove(null);
    forceUpdate((v) => v + 1);
    onChange(initialFen, "");
  };

  const parsed = parseDraughtsPuzzle(lockedFen, line.join(" "));
  const nextIsPlayer = line.length % 2 === 0;

  return (
    <div className="space-y-2">
      <DraughtsBoard
        board={board}
        orientation="white"
        interactive={!locked || line.length < DRAUGHTS_PUZZLE_MAX_MOVES}
        getLegalTargets={(square) => gameRef.current!.movesFrom(square).map((m) => m.to)}
        onMove={handleMove}
        lastMove={boardLastMove}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!locked ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Хүссэн байрлал хүртэл нүүдэл хийгээд &ldquo;Эндээс эхэл&rdquo; дарна уу.
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {nextIsPlayer ? "Сурагчийн" : "Өрсөлдөгчийн (албадмал)"} нүүдлийг хийнэ үү.
            {line.length > 0 && (
              <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                {line.join(" ")}
              </span>
            )}
          </p>
        )}

        <div className="flex gap-2">
          {!locked && (
            <button
              type="button"
              onClick={lockPosition}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              Эндээс эхэл
            </button>
          )}
          {locked && line.length > 0 && (
            <button
              type="button"
              onClick={undo}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Сүүлийн нүүдлийг буцаах
            </button>
          )}
          <button
            type="button"
            onClick={resetAll}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Эхнээс
          </button>
        </div>
      </div>

      {locked && line.length > 0 && (
        <p
          className={`text-sm font-semibold ${
            parsed
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {parsed
            ? `Бэлэн: ${draughtsPuzzleGoalLabel(parsed)} — сурагч ${parsed.playerCaptures} дүрс идэж, ${parsed.opponentCaptures}-ыг өгнө.`
            : "Шугам бүрэн биш: нүүдлийн тоо СОНДГОЙ бөгөөд өрсөлдөгчийн хариу бүр албадмал байх ёстой."}
        </p>
      )}
    </div>
  );
}

function DraughtsMoveEditor({
  initialFen,
  initialMove,
  onChange,
}: {
  initialFen: string;
  initialMove: { from: string; to: string } | null;
  onChange: (fen: string, move: { from: string; to: string } | null) => void;
}) {
  const gameRef = useRef<Draughts | null>(null);
  const appliedInitialMove = useRef(false);
  if (gameRef.current === null) {
    const position = deserializePosition(initialFen);
    gameRef.current = new Draughts(position ?? undefined);
  }
  if (initialMove && !appliedInitialMove.current) {
    appliedInitialMove.current = true;
    const from = squareFromNumber(Number(initialMove.from));
    const to = squareFromNumber(Number(initialMove.to));
    gameRef.current.move(from, to);
  }

  const [version, forceUpdate] = useState(0);
  const [locked, setLocked] = useState(!!initialMove);
  const [lockedFen, setLockedFen] = useState(initialFen);
  const [move, setMove] = useState(initialMove);
  const [boardLastMove, setBoardLastMove] = useState<{ from: DraughtsSquare; to: DraughtsSquare } | null>(
    initialMove
      ? { from: squareFromNumber(Number(initialMove.from)), to: squareFromNumber(Number(initialMove.to)) }
      : null
  );

  const board = useMemo(
    () => gameRef.current!.board(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  const handleMove = (from: DraughtsSquare, to: DraughtsSquare) => {
    if (move) return;

    const game = gameRef.current!;
    const applied = game.move(from, to);
    if (!applied) return;

    forceUpdate((v) => v + 1);
    setBoardLastMove({ from, to });

    if (!locked) return; // байрлал тохируулж байгаа мөч л байсан — хариулт биш

    const nextMove = {
      from: String(squareNumber(from.row, from.col)),
      to: String(squareNumber(to.row, to.col)),
    };
    setMove(nextMove);
    onChange(lockedFen, nextMove);
  };

  const lockPosition = () => {
    const fen = serializePosition(gameRef.current!.board(), gameRef.current!.turn());
    setLockedFen(fen);
    setLocked(true);
    onChange(fen, null);
  };

  const resetAnswer = () => {
    const position = deserializePosition(lockedFen);
    gameRef.current = new Draughts(position ?? undefined);
    forceUpdate((v) => v + 1);
    setMove(null);
    setBoardLastMove(null);
    onChange(lockedFen, null);
  };

  const resetAll = () => {
    const position = deserializePosition(initialFen);
    gameRef.current = new Draughts(position ?? undefined);
    appliedInitialMove.current = true;
    forceUpdate((v) => v + 1);
    setLocked(false);
    setMove(null);
    setBoardLastMove(null);
    onChange(initialFen, null);
  };

  return (
    <div className="space-y-2">
      <DraughtsBoard
        board={board}
        orientation="white"
        interactive={!move}
        getLegalTargets={(square) => gameRef.current!.movesFrom(square).map((m) => m.to)}
        onMove={handleMove}
        lastMove={boardLastMove}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        {!locked && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Хүссэн байрлал хүртэл нүүдэл хийгээд &ldquo;Эндээс эхэл&rdquo; дарна уу (юу ч
            өөрчлөхгүй бол ердийн эхлэх байрлал хэвээр).
          </p>
        )}
        {locked && !move && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Хөлөг дээр зөв нүүдлийг хийж үзүүлнэ үү.
          </p>
        )}
        {locked && move && (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Зөв нүүдэл: {move.from} → {move.to}
          </p>
        )}

        <div className="flex gap-2">
          {!locked && (
            <button
              type="button"
              onClick={lockPosition}
              className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              Эндээс эхэл
            </button>
          )}
          {locked && move && (
            <button
              type="button"
              onClick={resetAnswer}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Дахин
            </button>
          )}
          {locked && (
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Байрлал дахин тохируулах
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
