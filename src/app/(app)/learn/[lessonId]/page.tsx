"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PartyPopper, X } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { sfx } from "@/lib/audio/sfx";
import { useApiData } from "@/hooks/useApiData";
import { localized, localizedOptions } from "@/lib/i18n/content";
import { ProgressBar, Skeleton } from "@/components/tactiq/ui";
import { Confetti } from "@/components/tactiq/Confetti";
import { Mascot } from "@/components/tactiq/Mascot";

import type { Exercise, Lesson } from "@/lib/tactiq/courses";
import type { PublicUser } from "@/lib/api/publicUser";
import { t } from "@/lib/i18n/t";

/**
 * `chess.js` (дүрмийн хөдөлгүүр) болон custom `Draughts` хөдөлгүүр хоёулаа
 * ЗӨВХӨН тэдгээрийг АШИГЛАДАГ дасгал төрөл дээр л ачаалагдана — өмнө нь
 * ХИЧЭЭЛ БҮРИЙН эхний ачаалалтад (`choice`-той хичээл дээр ч гэсэн) статик
 * import-аар шигтгэгддэг байсныг эндээс олсон.
 */
const BoardMoveExercise = dynamic(
  () => import("@/components/lesson/BoardMoveExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const DraughtsMoveExercise = dynamic(
  () => import("@/components/lesson/DraughtsMoveExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const DraughtsPuzzleExercise = dynamic(
  () => import("@/components/lesson/DraughtsPuzzleExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const ChessPuzzleExercise = dynamic(
  () => import("@/components/lesson/ChessPuzzleExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const NetPuzzleExercise = dynamic(
  () => import("@/components/lesson/NetPuzzleExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const MemoryExercise = dynamic(
  () => import("@/components/lesson/MemoryExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const CodeMazeExercise = dynamic(
  () => import("@/components/lesson/CodeMazeExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const SlidePuzzleExercise = dynamic(
  () => import("@/components/lesson/SlidePuzzleExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const SudokuExercise = dynamic(
  () => import("@/components/lesson/SudokuExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const GoMoveExercise = dynamic(
  () => import("@/components/lesson/GoMoveExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const PianoExercise = dynamic(
  () => import("@/components/lesson/PianoExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const RhythmExercise = dynamic(
  () => import("@/components/lesson/RhythmExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);

function ExerciseBoardSkeleton() {
  return (
    <div className="surface space-y-4 p-5">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="aspect-square w-full" />
    </div>
  );
}

type Apply = (patch: Partial<PublicUser>) => void;

/**
 * Хичээл тоглуулагч — дасгал бүрийг НЭГ НЭГЭЭР харуулна.
 *
 * Дасгалын АГУУЛГА `/api/lessons/[lessonId]`-с татагдана — зөв хариултыг ил
 * илгээх нь эрсдэл багатай (сурах контент, нууц биш), гэвч оноо/зүрх бүгд
 * СЕРВЕР дээр л батлагдана (`/api/learn/lessons/[lessonId]/complete`,
 * дуусгасныг сервер шалгана) — клиент өөрөө хуурч чадахгүй.
 */
export default function LessonPlayerPage() {
  const params = useParams<{ lessonId: string }>();
  const { data, loading, error } = useApiData<{ lesson: Lesson }>(
    `/api/lessons/${encodeURIComponent(params.lessonId)}`
  );
  const { user, apply } = useUser();

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data?.lesson) return <NotFoundNotice />;
  if (!user) return null; // Protected-ийн доор үргэлж байдаг, зөвхөн төрлийн аюулгүй байдалд

  return <Player lesson={localizeLesson(data.lesson)} apply={apply} />;
}

/**
 * Агуулгыг сонгосон хэл рүү хөрвүүлнэ — ЭНД, НЭГ ГАЗАР.
 *
 * ⚠ Дасгалын компонентууд (10 ширхэг) `exercise.prompt`, `.explanation`,
 * `.options`-ыг ШУУД уншдаг. Тэд тус бүрд `localized()` нэмбэл нэгийг
 * мартах нь цаг хугацааны асуудал — тэр үед тухайн дасгал ганцаараа
 * монголоор үлдэнэ. Тиймээс хөрвүүлэлтийг өгөгдлийн ХИЛ дээр, тоглуулагч
 * руу дамжуулахаас өмнө хийнэ.
 */
function localizeLesson(lesson: Lesson): Lesson {
  return {
    ...lesson,
    title: localized(lesson.title, lesson.titleEn),
    exercises: lesson.exercises.map((exercise) => ({
      ...exercise,
      prompt: localized(exercise.prompt, exercise.promptEn),
      explanation: exercise.explanation
        ? localized(exercise.explanation, exercise.explanationEn)
        : exercise.explanation,
      options: localizedOptions(exercise.options, exercise.optionsEn),
    })),
  };
}

function NotFoundNotice() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <Mascot mood="think" className="size-28" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        {t("Хичээл олдсонгүй")}
      </h1>
      <Link
        href="/learn"
        className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
      >
        {t("Замд буцах")}
      </Link>
    </div>
  );
}


type LessonResult = {
  xpEarned: number;
  alreadyCompleted: boolean;
  /** Энэ хичээлээр найзтайгаа хамтын даалгавраа дуусгав уу. */
  questCompleted: boolean;
};

function Player({ lesson, apply }: { lesson: Lesson; apply: Apply }) {
  const router = useRouter();
  const { user } = useUser();
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  /**
   * Тухайн дасгалын оролдлогын дугаар — «Дахин оролдох» бүрд нэмэгдэнэ.
   *
   * `ExerciseCard`-ийн `key`-д орж дасгалыг ШИНЭЭР mount хийлгэнэ: хөлгийн
   * байрлал, сонголт, санах ойн хөзөр гэх мэт доторх төлөв гараар
   * цэвэрлэхгүйгээр анхны байдалдаа буцна.
   */
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LessonResult | null>(null);

  /*
   * Хичээл эхэлсэн мөч — зарцуулсан хугацаа хэмжихэд.
   *
   * ⚠ `useState` БИШ `useRef`: энэ утга рендерт огт нөлөөлөхгүй бөгөөд
   * өөрчлөгддөггүй. `useState`-ээр барьвал дэмий рендер үүсгэхгүй ч
   * "төлөв" гэсэн худал сэтгэгдэл төрүүлнэ.
   */
  const startedAt = useRef(Date.now());

  const exercise = lesson.exercises[index];

  /**
   * Хариултыг тэмдэглэнэ.
   *
   * ⚠ БУРУУ ХАРИУЛТ ЯМАР Ч ШИЙТГЭЛГҮЙ. Урьд нь алдах бүрд «зүрх»
   * хасагдаж, тэг болоход хичээл бүрмөсөн хаагддаг байв — сурагч 30
   * минут хүлээх эсвэл реклам үзэхээс өөр аргагүй болдог. Энэ нь
   * суралцахыг ШИЙТГЭДЭГ механик: хамгийн их алддаг (өөрөөр хэлбэл
   * хамгийн их сурах хэрэгтэй) хүүхэд хамгийн их хаагддаг.
   *
   * Одоо алдаа нь тайлбар харуулаад ИЖИЛ дасгалыг ДАХИН оролдуулна
   * (`retry`) — зөв хийх хүртэл дараагийн дасгал руу шилжихгүй. Алдаагаа
   * засаж байж цааш явах нь сурах гол зам: урьд нь буруу хариулсан ч
   * «Үргэлжлүүлэх» дарахад л алгасдаг байсан тул хүүхэд алдаагаа засахгүйгээр
   * хичээлээ «дуусгадаг» байв.
   */
  const choose = (correct: boolean) => {
    if (feedback || busy) return;
    setFeedback(correct ? "correct" : "wrong");

    /*
     * ⚠ Дууг товшилтын ДОТОР эхлүүлнэ (`sfx` нь `unlockAudio`-г өөрөө
     * дуудна): iOS Safari нь хэрэглэгчийн үйлдлээс ГАДУУР эхэлсэн дууг
     * блоклодог тул `setTimeout` дотор эсвэл effect-ээс дуудвал
     * чимээгүй өнгөрнө.
     */
    if (correct) sfx.correct();
    else sfx.wrong();
  };

  /**
   * АЛДАА ДАСГАЛ ДОТРОО шийдэгдэнэ — хөлөг, сонголт, хуур нь буруу алхмыг
   * буцааж, ЯГ ТЭР АЛХАМ дээр дахин оролдуулна (`onMistake`). Энд зөвхөн
   * дуу: товшилтын ДОТОР дуудагддаг тул iOS Safari дээр ч дуугарна.
   */
  const mistake = () => {
    if (!busy) sfx.wrong();
  };

  /**
   * Буруу хариулсан дасгалыг эхнээс нь дахин оролдуулна — зөвхөн өөрөө
   * «буруу» гэж дуусдаг тоглоомуудад (судоку, санах ой гэх мэт).
   */
  const retry = () => {
    setAttempt((value) => value + 1);
    setFeedback(null);
  };

  const next = async () => {
    // ⚠ Зөвхөн ЗӨВ хариулсны дараа урагшилна — буруу бол `retry`.
    if (feedback !== "correct") return;

    if (index + 1 < lesson.exercises.length) {
      setIndex((value) => value + 1);
      setAttempt(0);
      setFeedback(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      /*
       * Хичээлд зарцуулсан хугацаа.
       *
       * ⚠ `Date.now()` нь хэрэглэгчийн ЦАГ бөгөөд өөрчлөгдөж болно, мөн таб
       * ард нээлттэй хэвтвэл цаг үргэлжлүүлэн тоологдоно — тиймээс сервер
       * дээд хязгаар тавина (`lib/api/courseTime.ts`). Энэ тоо нь ЗӨВХӨН
       * статистик, оноонд ХЭЗЭЭ Ч нөлөөлөхгүй.
       */
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);

      const data = await apiFetch<{
        user: PublicUser;
        xpEarned: number;
        alreadyCompleted: boolean;
        questCompleted: boolean;
      }>(`/api/learn/lessons/${encodeURIComponent(lesson.id)}/complete`, {
        method: "POST",
        body: { seconds },
      });
      apply(data.user);
      // Хичээл дуусах нь дасгал бүрийн «зөв»-өөс ТОМ үйл явдал —
      // тиймээс өөр, урт баярын аялгуу.
      sfx.complete();
      setResult({
        xpEarned: data.xpEarned,
        alreadyCompleted: data.alreadyCompleted,
        questCompleted: data.questCompleted,
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
    } finally {
      setBusy(false);
    }
  };

  if (result) return <CompletionScreen lesson={lesson} result={result} />;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/learn")}
          className="grid size-9 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          aria-label={t("Гарах")}
        >
          <X className="size-5" aria-hidden />
        </button>
        <div className="flex-1">
          <ProgressBar
            percent={(index / lesson.exercises.length) * 100}
            label={t("Хичээлийн явц")}
          />
        </div>

      </div>

      <ExerciseCard
        // `key`-ээр дасгал бүрд (мөн ДАХИН ОРОЛДЛОГО бүрд) ШИНЭЭР mount
        // хийлгэнэ — доторх сонголт/хөлгийн төлөв (`ChoiceExercise`-ийн
        // `selected`, `BoardMoveExercise`-ийн `Chess` instance) гараар
        // цэвэрлэх шаардлагагүй болно.
        key={`${exercise.id}:${attempt}`}
        exercise={exercise}
        feedback={feedback}
        onAnswer={(correct) => choose(correct)}
        onMistake={mistake}
      />

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {feedback === "correct" && (
        <button
          type="button"
          onClick={() => void next()}
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? t("Түр хүлээнэ үү…") : t("Үргэлжлүүлэх")}
        </button>
      )}

      {/* Буруу — алдаагаа засаж байж урагшилна (дараагийн дасгал руу алгасах товчгүй). */}
      {feedback === "wrong" && (
        <button
          type="button"
          onClick={retry}
          className="w-full rounded-xl bg-rose-500 px-5 py-3 font-semibold text-white hover:bg-rose-600"
        >
          {t("Дахин оролдох")}
        </button>
      )}
    </div>
  );
}

/** Дасгалын ТӨРЛӨӨр (`choice` | `board-move` | `piano-play`) зохих дэд компонент руу дамжуулна. */
function ExerciseCard({
  exercise,
  feedback,
  onAnswer,
  onMistake,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
  /** Буруу алхам — дасгал ӨӨРӨӨ буцааж, тэр алхам дээр дахин оролдуулна. */
  onMistake: () => void;
}) {
  if (exercise.type === "board-move") {
    return (
      <BoardMoveExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} onMistake={onMistake} />
    );
  }
  if (exercise.type === "draughts-move") {
    return (
      <DraughtsMoveExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} onMistake={onMistake} />
    );
  }
  if (exercise.type === "draughts-puzzle") {
    return (
      <DraughtsPuzzleExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} onMistake={onMistake} />
    );
  }
  if (exercise.type === "chess-puzzle") {
    return (
      <ChessPuzzleExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} onMistake={onMistake} />
    );
  }
  if (exercise.type === "net-puzzle") {
    return <NetPuzzleExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "memory-game") {
    return <MemoryExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "code-maze") {
    return <CodeMazeExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "slide-puzzle") {
    return <SlidePuzzleExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "sudoku") {
    return <SudokuExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "go-move") {
    return <GoMoveExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} onMistake={onMistake} />;
  }
  if (exercise.type === "piano-play") {
    return <PianoExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} onMistake={onMistake} />;
  }
  if (exercise.type === "rhythm-tap") {
    return <RhythmExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  return <ChoiceExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} onMistake={onMistake} />;
}

function ChoiceExercise({
  exercise,
  feedback,
  onAnswer,
  onMistake,
}: {
  exercise: Exercise;
  feedback: "correct" | "wrong" | null;
  onAnswer: (correct: boolean) => void;
  onMistake: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  /**
   * Буруу сонгосон хувилбарууд — улаан, идэвхгүй болж ҮЛДЭНЭ.
   *
   * ⚠ Алдаа нь асуултыг дуусгахгүй: сурагч ИЖИЛ асуулт дээр үлдэж, бусад
   * хувилбараас дахин сонгоно. Зөв хариултыг ХЭЗЭЭ Ч урьдчилж тодруулахгүй.
   */
  const [ruledOut, setRuledOut] = useState<string[]>([]);

  const choose = (optionId: string) => {
    if (feedback || ruledOut.includes(optionId)) return;

    if (optionId !== exercise.correctOptionId) {
      setRuledOut((current) => [...current, optionId]);
      onMistake();
      return;
    }

    setSelected(optionId);
    onAnswer(true);
  };

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <div className="space-y-2">
        {(exercise.options ?? []).map((option) => {
          const isSelected = selected === option.id;
          const isRuledOut = ruledOut.includes(option.id);

          let tone =
            "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5";
          if (feedback === "correct" && isSelected) {
            tone = "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10";
          } else if (isRuledOut) {
            tone = "border-rose-300 bg-rose-50 text-rose-400 line-through dark:border-rose-500/40 dark:bg-rose-500/10";
          }

          return (
            <button
              key={option.id}
              type="button"
              disabled={feedback !== null || isRuledOut}
              onClick={() => choose(option.id)}
              className={`w-full rounded-xl border-2 px-4 py-3 text-left font-medium text-gray-800 transition-colors disabled:cursor-default dark:text-gray-100 ${tone}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Алдсаны дараа ИЖИЛ асуулт дээр үлдэнэ — сануулга, тайлбарыг харуулна. */}
      {ruledOut.length > 0 && feedback === null && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">
            {t("Энэ биш байна. Дахин сонгоод үзээрэй.")}
          </p>
          {exercise.explanation && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {exercise.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CompletionScreen({
  lesson,
  result,
}: {
  lesson: Lesson;
  result: LessonResult;
}) {
  return (
    <div className="relative mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      {/* Салют — хичээл дуусгасан мөчийг тэмдэглэнэ (`Confetti.tsx`) */}
      <Confetti />
      <Mascot mood="cheer" className="size-28" />
      <PartyPopper className="size-8 text-amber-500" aria-hidden />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("Хичээл дууслаа!")}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{lesson.title}</p>
      <p className="num text-3xl font-extrabold text-brand-600 dark:text-brand-400">
        +{result.xpEarned} оноо
      </p>
      {result.alreadyCompleted && (
        <p className="text-xs text-gray-400">
          {t("Энэ хичээлийг өмнө нь дуусгасан тул оноо дахин олгогдоогүй.")}
        </p>
      )}

      {result.questCompleted && (
        <p className="rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          🤝 Найзтайгаа хамтын даалгавраа биеллээ! Хоёуланд чинь зоос
          нэмэгдлээ.
        </p>
      )}
      <Link
        href="/learn"
        className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
      >
        {t("Замд буцах")}
      </Link>
    </div>
  );
}
