"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";

import type { CSSProperties } from "react";
import { PartyPopper, X } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { PathCharacter, characterSetForCourse } from "@/components/tactiq/PathCharacter";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { sfx } from "@/lib/audio/sfx";
import { useApiData } from "@/hooks/useApiData";
import { localized, localizedOptions } from "@/lib/i18n/content";
import { ProgressBar, Skeleton } from "@/components/tactiq/ui";
import { Confetti } from "@/components/tactiq/Confetti";
import { Mascot } from "@/components/tactiq/Mascot";
import { CelebrationVideo } from "@/components/tactiq/CelebrationVideo";
import { WelcomeRobotGif } from "@/components/tactiq/LoopGif";
import { GUEST_EXERCISE_LIMIT } from "@/lib/tactiq/trial";

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
const MatchstickExercise = dynamic(
  () => import("@/components/lesson/MatchstickExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const TangramExercise = dynamic(
  () => import("@/components/lesson/TangramExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const RecallExercise = dynamic(
  () => import("@/components/lesson/RecallExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const NonogramExercise = dynamic(
  () => import("@/components/lesson/NonogramExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const SeriesExercise = dynamic(
  () => import("@/components/lesson/SeriesExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const WordExercise = dynamic(
  () => import("@/components/lesson/WordExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const KidsExercise = dynamic(
  () => import("@/components/lesson/KidsExercise"),
  { loading: () => <ExerciseBoardSkeleton /> }
);
const ArrowsExercise = dynamic(
  () => import("@/components/lesson/ArrowsExercise"),
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
  const { user, apply, isGuest } = useUser();
  /*
   * ⚠ ЗОЧИН нь `/api/lessons/...`-д хүрэхгүй (401). Түүнд зориулсан
   * нийтийн route нь ЗӨВХӨН туршилтын хичээлүүдийг өгдөг — бусдыг нь
   * 404-өөр татгалзана, тиймээс энд хаяг солиход төлбөртэй агуулга
   * задрахгүй.
   */
  const { data, loading, error } = useApiData<{ lesson: Lesson }>(
    isGuest
      ? `/api/trial/lessons/${encodeURIComponent(params.lessonId)}`
      : `/api/lessons/${encodeURIComponent(params.lessonId)}`,
    /*
     * ⚠ `authOptional`: `apiFetch` нь токен байхгүй бол хүсэлтийг
     * сервер рүү ЯВУУЛАХГҮЙ, клиент дээрээ «Нэвтэрсэн байх
     * шаардлагатай» гэж шиднэ — зочин хичээл огт нээж чадахгүй байв.
     */
    { authOptional: true }
  );

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
  /** Өнөөдрийн давталтын оноог аль хэдийн авчихсан эсэх. */
  repeatLimited: boolean;
  /** Энэ хичээлээр найзтайгаа хамтын даалгавраа дуусгав уу. */
  questCompleted: boolean;
};

function Player({ lesson, apply }: { lesson: Lesson; apply: Apply }) {
  const router = useRouter();
  const { user, isGuest } = useUser();
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
  /** Зочин хичээлээ дуусгасан — бүртгэлийн дэлгэц гарна. */
  const [guestDone, setGuestDone] = useState(false);

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

    /*
     * ⚠ ЗОЧНЫ ХЯЗГААР — 3 дасгал (`GUEST_EXERCISE_LIMIT`). Хичээлийг
     * бүтнээр хийлгэвэл «бүртгүүлэх шаардлага юу?» гэсэн асуулт төрнө,
     * мөн оноо хадгалагдахгүй гэдгийг дуусахад л мэдэх нь бүр ч дор.
     *
     * ⚠ ХИЧЭЭЛ ДУУСАХААС ӨМНӨ шалгана: хязгаар нь хичээлийн уртаас
     * хамаарахгүй байх ёстой.
     */
    if (isGuest && index + 1 >= GUEST_EXERCISE_LIMIT) {
      sfx.complete();
      setGuestDone(true);
      return;
    }

    if (index + 1 < lesson.exercises.length) {
      setIndex((value) => value + 1);
      setAttempt(0);
      setFeedback(null);
      return;
    }

    /*
     * ⚠ ЗОЧИН нь хичээлээ дуусгахад САНД ЮУ Ч БИЧИХГҮЙ: оноо, дараалал,
     * бэлгийн хайрцаг бүгд хэрэглэгчид наалддаг. Оронд нь яг энэ мөчид —
     * дасгалаа дуусгаад ялсан мэдрэмжтэй байхад нь — бүртгүүлэхийг санал
     * болгоно.
     */
    if (isGuest) {
      sfx.complete();
      setGuestDone(true);
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
        repeatLimited?: boolean;
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
        repeatLimited: data.repeatLimited ?? false,
        questCompleted: data.questCompleted,
      });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
    } finally {
      setBusy(false);
    }
  };

  if (guestDone) return <GuestCompletionScreen lesson={lesson} />;
  if (result) return <CompletionScreen lesson={lesson} result={result} />;

  return (
    /*
     * ⚠ `--board-reserve`: шатар, даамын хөлөг өөрийн өндрийг
     * `100dvh` -ээс ЭНЭ нөөцийг хассанаар тооцно (`ChessBoard`).
     *
     * 24rem = 384px, ингэж бодов: наалдсан толгой 64 + явцын мөр 56 +
     * зай 20 + хайрцгийн доторх бичвэр, хүрээ 84 + зай 20 + товч 52 +
     * доод зай 24 ≈ 320, дээр нь ГАР УТСАН дээрх доод цэсний тууз 64.
     * Тэр тууз нь `fixed` тул `dvh`-д тооцогддоггүй — түүнийг мартвал
     * хөлгийн доод эгнээ цэсний дор орж, сурагч нүүдэл хийж чадахгүй.
     *
     * ⚠ Тоглох дэлгэцийн анхдагч (22rem) -аас ИХ: тэнд явцын мөр, дүр,
     * «Үргэлжлүүлэх» товч байхгүй.
     */
    /*
     * ⚠ `max-w-xl` (576px), `max-w-lg` (512) БИШ: хөлгийн ӨРГӨН нь энэ
     * баганаас хамаардаг тул `lg` үед хөлөг 512px-ээс том болж чадахгүй
     * байв — хөлгийн дээд хязгаар (680px) хэзээ ч хүрэхгүй. Тоглох
     * дэлгэц аль хэдийн `xl` (`play/draughts`).
     */
    <div className="mx-auto max-w-xl space-y-5" style={{ "--board-reserve": "24rem" } as CSSProperties}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          // Дундаас нь гарсан ч замын ТЭР цэг дээр буцаж ирнэ.
          onClick={() => router.push(`/learn?lesson=${encodeURIComponent(lesson.id)}`)}
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

        {/*
          ДҮР — явцын мөрний БАРУУН ЗАХАД, ТУСДАА МӨРГҮЙ.

          ⚠ Урьд нь өөрийн мөрөнд сууж ~80px өндөр эзэлдэг байв. Ноутбукийн
          дэлгэцэнд (≈660px) толгой + явц + дүр + хөлөг + товч нь багтахгүй
          болж, хуудас гүйж, дүрийн толгой наалдсан толгой мөрийн дор орж
          ТАСЛАГДАЖ байсан — «дүрс багтахгүй» гэдэг нь яг энэ.

          ⚠ Хайрцгийн ДОТОР ч биш: тэнд тавивал асуултын бичвэртэй мөрлөж,
          хөлөг, тор, хөзрийг доош түлхэнэ.

          ⚠ Дүр нь ДАСГАЛ БҮРД солигдоно (`index`). `PathCharacter` нь
          `aria-hidden` тул дэлгэц уншигчид давхар чимээ гарахгүй.
        */}
        <PathCharacter
          index={index}
          set={characterSetForCourse(user?.activeCourseSlug ?? "")}
          height={56}
          className="drop-shadow-md"
        />
      </div>

      <div>
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
      </div>

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
  if (exercise.type === "matchstick") {
    return <MatchstickExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "tangram") {
    return <TangramExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "recall") {
    return <RecallExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "nonogram") {
    return <NonogramExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "series") {
    return <SeriesExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "word") {
    return <WordExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "kids") {
    return <KidsExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
  }
  if (exercise.type === "arrows") {
    return <ArrowsExercise exercise={exercise} feedback={feedback} onAnswer={onAnswer} />;
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

  const options = exercise.options ?? [];

  /*
   * ТОМ ХАВТАН — сонголтууд нь БҮГД богино (эможи, үсэг, 1-2 тэмдэгт) үед.
   *
   * ⚠ Бага насны (4-6) дасгалууд нь зураг, үсгийг сонгуулдаг. Тэднийг
   * энгийн урт мөрөн товч дээр жижиг бичвэрээр үзүүлбэл юу ч харагдахгүй
   * — уншиж чаддаггүй хүүхэд тэмдгийг нь ТАНИХ ёстой. Тиймээс богино
   * шошготой үед хоёр баганат том хавтан болгоно.
   *
   * ⚠ Хэмжилт нь `length` БИШ, тэмдэгтийн тоогоор: эможи нь UTF-16-д
   * хоёр нэгж эзэлдэг тул `"🐶".length === 2` бөгөөд урт бичвэрээс
   * ялгагдахгүй болно.
   */
  const isGlyphGrid =
    options.length > 0 &&
    options.every((option) => [...option.label.replace(/️/g, "")].length <= 2);

  return (
    <div className="surface space-y-4 p-5">
      <p className="text-lg font-bold text-gray-900 dark:text-white">{exercise.prompt}</p>

      <div className={isGlyphGrid ? "grid grid-cols-2 gap-3" : "space-y-2"}>
        {options.map((option) => {
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
              className={`w-full rounded-xl border-2 transition-colors disabled:cursor-default text-gray-800 dark:text-gray-100 ${
                isGlyphGrid
                  ? "aspect-[3/2] text-5xl leading-none grid place-items-center"
                  : "px-4 py-3 text-left font-medium"
              } ${tone}`}
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

/**
 * ЗОЧИН хичээлээ дуусгасан мөч.
 *
 * ⚠ Оноо ХАРУУЛАХГҮЙ: зочны оноо хаана ч хадгалагдахгүй тул тоо үзүүлбэл
 * худал амлалт болно. Оронд нь «хадгалагдахгүй» гэдгийг шулуухан хэлээд
 * бүртгүүлэх нэг товч өгнө — яг энэ мөчид сонирхол нь оргил дээрээ байна.
 */
/**
 * БАЯРЫН ХҮРЭЭ — хоёр дэлгэц (зочин ба нэвтэрсэн) ИЖИЛ харагдана.
 *
 * ⚠ НЭГ Л ГАЗАР: урьд нь хоёр дэлгэц тус тусдаа `Mascot`, `Confetti`,
 * гарчиг бичдэг байсан тул нэгийг гоёход нөгөө нь хоцорч, зочин
 * «дутуу» хувилбар хардаг байв — тэр нь бүртгүүлэх шийдвэр гаргах
 * хамгийн чухал мөч.
 *
 * ⚠ Видео нь ДУГУЙ хүрээнд: дөрвөлжин видео нь картын дотор өөр нэг
 * карт шиг харагдаж, хоёр хүрээ мөргөлдөнө.
 */
function CelebrationShell({
  title,
  subtitle,
  children,
  /**
   * ЗОЧНЫ хувилбар — салют, баярын видеоны оронд мэндчилж буй робот.
   *
   * ⚠ ЗОЧИН ХИЧЭЭЛЭЭ ДУУСГААГҮЙ (3 дасгал хийсэн) тул баярын видео,
   * салют нь ХУДАЛ дохио болно: «дууслаа» гэж бодоод гарч явна.
   */
  guest = false,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  guest?: boolean;
}) {
  return (
    <div className="relative mx-auto max-w-md px-4 py-6">
      {/* Салют — хичээл дуусгасан мөчийг тэмдэглэнэ (`Confetti.tsx`) */}
      {!guest && <Confetti />}

      <div className="surface overflow-hidden text-center">
        {/*
          ⚠ ТОЛГОЙН ГРАДИЕНТ нь видеоны цайвар дэвсгэртэй НИЙЛНЭ: видео нь
          бараг цагаан дэвсгэртэй тул цагаан карт дээр «хөвж» байгаа юм
          шиг харагддаг байв. Өнгөт толгой нь түүнийг хүрээлж, баярын
          өнгө аяс өгнө.
        */}
        <div className="relative bg-gradient-to-b from-brand-500 to-brand-600 px-6 pb-6 pt-7">
          {/*
            ⚠ 160px (`size-40`): 144px дээр видеоны дотор бичигдсэн «Баяр
            хүргэе!» гэсэн текст уншигдахгүй жижиг болно. Тэр текст нь
            видеоны гол агуулга тул уншигдах ёстой.
          */}
          <div className="mx-auto size-40 overflow-hidden rounded-full ring-4 ring-white/70 sm:size-44 dark:ring-white/25">
            {guest ? (
              <WelcomeRobotGif className="size-full object-cover" />
            ) : (
              <CelebrationVideo className="size-full object-cover" />
            )}
          </div>

          <h1 className="mt-4 text-2xl font-extrabold text-white">{title}</h1>
          <p className="mt-1 text-sm text-white/85">{subtitle}</p>
        </div>

        <div className="flex flex-col items-center gap-4 p-6">{children}</div>
      </div>
    </div>
  );
}

function GuestCompletionScreen({ lesson }: { lesson: Lesson }) {
  return (
    <CelebrationShell title={t("Сайн байна!")} subtitle={lesson.title} guest>
      {/*
        ⚠ ЯАГААД ЗОГССОНЫГ ХЭЛНЭ: зочин `GUEST_EXERCISE_LIMIT` дасгал
        хийсний дараа энэ дэлгэц гарна. Шалтгааныг хэлэхгүй бол
        «хичээл эвдэрсэн юм уу» гэж бодно.
      */}
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
        {`Нэвтрээгүй үед ${GUEST_EXERCISE_LIMIT} дасгал үнэгүй. `}
        Бүртгүүлбэл хичээл бүтнээрээ нээгдэж, оноо, дараалал, бэлгийн
        хайрцаг, гэрчилгээ хуримтлагдана.
      </p>

      <Link
        href={`/register?next=${encodeURIComponent("/learn")}`}
        className="w-full rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600"
      >
        {t("Бүртгүүлэх")}
      </Link>
      <Link
        href={`/login?next=${encodeURIComponent("/learn")}`}
        className="text-sm font-semibold text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
      >
        {t("Бүртгэлтэй юу? Нэвтрэх")}
      </Link>
      <Link
        href="/learn"
        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {t("Замд буцах")}
      </Link>
    </CelebrationShell>
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
    <CelebrationShell title={t("Хичээл дууслаа!")} subtitle={lesson.title}>
      {/*
        ⚠ ОНОО нь МЕДАЛЬ хэлбэртэй: урьд нь зүгээр нэг том тоо байсан тул
        гарчиг, хичээлийн нэр, оноо гурав нь ижил жинтэй харагдаж, хамгийн
        чухал нь (шагнал) тодроогүй.
      */}
      <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-5 py-2 dark:bg-amber-500/20">
        <PartyPopper className="size-5 text-amber-600 dark:text-amber-300" aria-hidden />
        <span className="num text-2xl font-extrabold text-amber-700 dark:text-amber-200">
          +{result.xpEarned}
        </span>
        <span className="text-sm font-bold text-amber-700 dark:text-amber-200">{t("оноо")}</span>
      </p>

      {/*
        ⚠ ДАВТАЛТ ГУРВАН ТӨЛӨВТЭЙ, гурвуулан дээр ӨӨР ЗУЙЛ хэлнэ:
          • шинээр дуусгасан — энэ мөр огт гарахгүй;
          • давтаж оноо авсан — «бага оноо» гэдгийг ТАЙЛБАРЛАНА,
            эс бөгөөс «яагаад цөөн вэ?» гэсэн алдаа мэт бодогдоно;
          • өнөөдрийн хязгаарт хүрсэн — ХЭЗЭЭ дахин авахыг хэлнэ.
      */}
      {result.alreadyCompleted && result.xpEarned > 0 && (
        <p className="text-xs text-gray-400">
          {t("Давтаж хийсэн тул бага оноо нэмэгдлээ. Шинэ хичээл бүрэн оноотой.")}
        </p>
      )}

      {result.alreadyCompleted && result.xpEarned === 0 && (
        <p className="text-xs text-gray-400">
          {result.repeatLimited
            ? t("Энэ хичээлийн давталтын оноог өнөөдөр авсан байна. Маргааш дахин нэмэгднэ.")
            : t("Энэ хичээлийг өмнө нь дуусгасан байна.")}
        </p>
      )}

      {result.questCompleted && (
        <p className="rounded-xl bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          🤝 Найзтайгаа хамтын даалгавраа биеллээ! Хоёуланд чинь зоос
          нэмэгдлээ.
        </p>
      )}

      {/*
        ⚠ Замд БУЦААД дөнгөж хийсэн зангилаа дээрээ очно: `?lesson=` -ыг
        `learn/page.tsx` уншиж тэр цэг рүү гүйлгэнэ. Урт зам дээр
        (судоку — 60 хичээл) үүнгүйгээр сурагч дээрээсээ эхлэн хайдаг.
      */}
      <Link
        href={`/learn?lesson=${encodeURIComponent(lesson.id)}`}
        className="w-full rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600"
      >
        {t("Замд буцах")}
      </Link>
    </CelebrationShell>
  );
}
