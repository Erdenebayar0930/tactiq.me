"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";

import { apiFetch } from "@/lib/apiClient";
import { DRAUGHTS_BOT_DIFFICULTIES, pickBotMove } from "@/lib/draughts/bot";
import { Draughts } from "@/lib/draughts/engine";
import { DraughtsBoard } from "@/components/draughts/DraughtsBoard";
import { MatchHeader } from "@/components/chess/MatchHeader";
import { CoachReview } from "@/components/tactiq/CoachReview";
import { CoachTip } from "@/components/tactiq/CoachTip";
import { GameOverAd } from "@/components/tactiq/GameOverAd";
import { analyzeDraughtsGame } from "@/lib/draughts/analysis";
import { DAAMAL } from "@/lib/tactiq/coaches";

import type { GameReview } from "@/lib/tactiq/moveQuality";
import { Mascot } from "@/components/tactiq/Mascot";
import { DIFFICULTY_LABELS } from "@/lib/tactiq/theme";
import { useUser } from "@/context/UserContext";
import { useCoachTip } from "@/hooks/useCoachTip";
import { draughtsTips } from "@/lib/tactiq/coachTips";

import type { DraughtsBotDifficulty } from "@/lib/draughts/bot";
import type { Square } from "@/lib/draughts/engine";
import type { PublicUser } from "@/lib/api/publicUser";
import { t } from "@/lib/i18n/t";

/**
 * Бот нүүхийн ӨМНӨХ хамгийн бага завсарлага (мс).
 *
 * ⚠ Хиймэл хүлээлт нь ЗОРИУД: хайлт нь ихэвчлэн хэдхэн миллисекунд тул
 * бот хүний нүүдлийн яг ард нүүж, хоёр нүүдэл нэг зэрэг болсон мэт
 * харагддаг. Хүн «бодож байна» гэдгийг мэдрэх ёстой — тэр нь тоглоомыг
 * ойлгомжтой болгохоос гадна өрсөлдөгч амьд мэт мэдрүүлнэ.
 */
const BOT_PAUSE_MS = 550;

type EndInfo = {
  didIWin: boolean | null; // null = тэнцээ
};

/**
 * Ботоор дадлагажих "100 нүдэн шашки" (Олон улсын дам) — `/play/bot`-тэй
 * ИЖИЛ бүтэц (сервер, WebRTC шаардлагагүй, бүхэлдээ клиент дээр), зөвхөн
 * хөдөлгүүр нь `lib/draughts/*` (`chess.js`-тэй адил сан байхгүй тул
 * дүрмийг бид өөрсдөө бичсэн — `lib/draughts/engine.ts` үзнэ үү).
 *
 * ⚠ Энэ хуудас нь ЗӨВХӨН БОТЫН эсрэг. Хоёр хүний онлайн тоглолт ба
 * найзыг урих холбоос нь ЛОББИД (`/play`) — тэр систем нь `game`
 * баганаар шатар, даам хоёуланд үйлчилдэг (`lib/tactiq/playGame.ts`).
 * Дээрх «Буцах» холбоос нь тэр лобби руу хөтөлнө.
 */
export default function DraughtsBotPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apply, user } = useUser();

  const difficulty: DraughtsBotDifficulty = DRAUGHTS_BOT_DIFFICULTIES.includes(
    searchParams.get("difficulty") as DraughtsBotDifficulty
  )
    ? (searchParams.get("difficulty") as DraughtsBotDifficulty)
    : "beginner";

  const gameRef = useRef(new Draughts());
  const lastMoveRef = useRef<{ from: Square; to: Square } | null>(null);
  const [version, forceUpdate] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [end, setEnd] = useState<EndInfo | null>(null);
  const [adDone, setAdDone] = useState(false);
  const [review, setReview] = useState<GameReview | null>(null);
  /**
   * Шинжилгээнд сонгосон нүүдэл — тоглоомыг ТЭР ЦЭГ ХҮРТЭЛ дахин
   * тоглуулж хөлөг дээр харуулна.
   *
   * ⚠ `null` = одоогийн (эцсийн) байрлал.
   */
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  /** Ботын нүүдлийн гулсах хөдөлгөөн — дуусмагц `null`. */
  const [botAnim, setBotAnim] = useState<{ from: Square; to: Square } | null>(null);

  const checkGameOver = useCallback(() => {
    const game = gameRef.current;
    if (!game.isGameOver()) return false;

    // Тоглогч ЯМАГТ цагаанаар тоглодог (`/play/bot`-той ижил конвенц).
    const winner = game.winner();
    const didIWin = winner === null ? null : winner === "w";
    setEnd({ didIWin });

    /*
     * Тоглоомын дараах шинжилгээ — тоглогч (цагаан) талын нүүдэл бүрийг
     * ангилна (`lib/draughts/analysis.ts`).
     *
     * ⚠ Гүн 3. Хоёр бол хямд ч дамын хослолыг (нэг дүрс өгөөд хоёр буцааж
     * идэх) ХАРАХГҮЙ өнгөрдөг тул яг тэр "Гайхалтай" нүүдлүүд нь
     * тэмдэглэгдэхгүй үлдэнэ — энэ шинжилгээний гол зорилго нь тэднийг олох
     * тул гүнийг хэмнэх нь утгагүй. Нэг удаагийн зардал, тоглоом дуусмагц.
     */
    void analyzeDraughtsGame(game.moveHistory(), "w", 3).then(setReview);

    const outcome = didIWin === null ? "draw" : didIWin ? "win" : "loss";
    apiFetch<{ user: PublicUser }>("/api/play/draughts/bot/result", {
      method: "POST",
      body: { result: outcome },
    })
      .then((data) => apply(data.user))
      .catch(() => {
        // Тоглолт өөрөө үргэлжлүүлж чадах тул статистик бичихэд алдаа гарсан
        // ч тоглогчийн UI-г ЭВДЭХГҮЙ.
      });

    return true;
  }, [apply]);

  const botTurn = useCallback(async () => {
    const game = gameRef.current;
    if (game.isGameOver() || game.turn() !== "b") return;

    const startedThinking = Date.now();

    setThinking(true);
    await new Promise(requestAnimationFrame);

    const move = pickBotMove(game, difficulty);

    /*
     * БОДОХ ЗАВСАРЛАГА.
     *
     * ⚠ Хайлт нь ихэвчлэн хэдхэн миллисекунд тул бот нь хүний нүүдлийн
     * ЯГ АРД нүүж, хоёр нүүдэл нэг зэрэг болсон мэт харагддаг байв.
     * Хүүхэд юу болсныг анзаарах зав гардаггүй.
     *
     * ⚠ Хайлтад зарцуулсан хугацааг ХАСНА: гүн 4 дээр бодолт өөрөө удаан
     * үргэлжилбэл дээр нь дахин хүлээлгэх нь утгагүй.
     */
    const thought = Date.now() - startedThinking;
    if (thought < BOT_PAUSE_MS) {
      await new Promise((resolve) => setTimeout(resolve, BOT_PAUSE_MS - thought));
    }

    if (move) {
      game.applyMove(move);
      lastMoveRef.current = { from: move.from, to: move.to };
      // ⚠ Хөдөлгөөнийг нүүдэл ХИЙГДСЭНИЙ ДАРАА эхлүүлнэ: хөлөг шинэ
      // байрлалаа зурсан байх ёстой, гулсах дүрс нь зөвхөн харагдац.
      setBotAnim({ from: move.from, to: move.to });
    }

    setThinking(false);
    forceUpdate((v) => v + 1);
    checkGameOver();
  }, [difficulty, checkGameOver]);

  const handleMove = (from: Square, to: Square) => {
    if (thinking || end || gameRef.current.turn() !== "w") return;

    const game = gameRef.current;
    const applied = game.move(from, to);
    if (!applied) return;

    lastMoveRef.current = { from, to };
    forceUpdate((v) => v + 1);

    if (!checkGameOver()) void botTurn();
  };

  const restart = () => {
    gameRef.current = new Draughts();
    lastMoveRef.current = null;
    setEnd(null);
    setReview(null);
    setAdDone(false);
    setReviewPly(null);
    setBotAnim(null);
    forceUpdate((v) => v + 1);
  };

  /*
   * СОНГОСОН НҮҮДЛИЙН БАЙРЛАЛ — эхнээс нь дахин тоглуулж гаргана.
   *
   * ⚠ `gameRef`-ийг БУЦААХГҮЙ (`undo`): тэр объект нь дууссан тоглоомын
   * эцсийн байдал бөгөөд шинжилгээ, статистик түүнээс уншина. Шинэ
   * `Draughts` дээр давтан тоглох нь хямд (100 нүд, хэдэн арван нүүдэл)
   * бөгөөд хажуугийн нөлөөгүй.
   *
   * ⚠ `ply` нь 1-ээс эхэлдэг (`moveQuality`) тул тэр нүүдлийг ОРУУЛААД
   * тоглуулна — сурагч «алдаа гарсны ДАРААХ» байрлалыг харах ёстой.
   */
  const reviewSnapshot = useMemo(() => {
    if (reviewPly === null) return null;

    const replay = new Draughts();
    const history = gameRef.current.moveHistory();
    let last: { from: Square; to: Square } | null = null;

    for (const move of history.slice(0, reviewPly)) {
      replay.applyMove(move);
      last = { from: move.from, to: move.to };
    }

    return { board: replay.board(), lastMove: last };
  }, [reviewPly]);

  const snapshot = useMemo(() => {
    const game = gameRef.current;
    return {
      board: game.board(),
      turn: game.turn(),
      lastMove: lastMoveRef.current,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  const myTurn = !thinking && !end && snapshot.turn === "w";

  // Шатрын `/play/bot`-той ИЖИЛ загвар — тайлбарыг тоглогчийн ээлжид л
  // гаргана (тэндэх тайлбарыг үзнэ үү).
  const tips = useMemo(
    () => (myTurn ? draughtsTips(gameRef.current) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version, myTurn]
  );
  const { tip, dismiss } = useCoachTip(tips);

  /*
   * ⚠ `max-w-lg` (512px) нь ХӨЛГИЙН дээд хязгаарыг тогтоодог: хөлөг нь
   * `w-full` тул багананаас өргөн болж чадахгүй. Хөлөг бол энэ дэлгэцийн
   * гол агуулга тул баганыг `max-w-xl` (576px) болгов.
   */
  return (
    <div className="mx-auto max-w-xl space-y-3">
      {/*
        ⚠ НЭГ МӨР. Урьд нь хоёр мөр (нэр / төлөв) байсан тул толгой нь
        ~66px эзэлж, хөлөг тэр хэмжээгээр багасдаг байв. Хөлөг бол энэ
        дэлгэцийн ГОЛ агуулга — дээр талын мэдээлэл түүнээс зай булаах
        ёсгүй.

        ⚠ Төлөв (`Таны ээлж`) нь ХАМГИЙН ЧУХАЛ тул төгсгөлд, тод үсгээр:
        нэр, хүндрэл нь тоглолтын туршид өөрчлөгддөггүй, төлөв нь нүүдэл
        бүрд солигдоно.
      */}
      <div className="surface flex items-center justify-between gap-3 px-4 py-2">
        <Link
          href="/play"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("Буцах")}
        </Link>
        <p className="min-w-0 truncate text-right text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {t("Дам")} · {t(DIFFICULTY_LABELS[difficulty])}
          </span>
          <span className="mx-1.5 text-gray-300 dark:text-white/20">·</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {end
              ? t("Тоглоом дууссан")
              : thinking
                ? t("Бот бодож байна…")
                : myTurn
                  ? t("Таны ээлж")
                  : t("Ботын ээлж")}
          </span>
        </p>
      </div>

      <MatchHeader
        leftName={user?.displayName || t("Та")}
        rightName={`${t("Бот")} · ${t(DIFFICULTY_LABELS[difficulty])}`}
      />

      <DraughtsBoard
        board={reviewSnapshot ? reviewSnapshot.board : snapshot.board}
        orientation="white"
        /* ⚠ Шинжилгээний байрлалд НҮҮХ БОЛОМЖГҮЙ: тэр бол өнгөрсөн
           байрлал бөгөөд тэндээс нүүвэл дууссан тоглоом «сэргэнэ». */
        interactive={myTurn && !reviewSnapshot}
        getLegalTargets={(square) => gameRef.current.movesFrom(square).map((m) => m.to)}
        onMove={handleMove}
        lastMove={reviewSnapshot ? reviewSnapshot.lastMove : snapshot.lastMove}
        /* ⚠ Шинжилгээний байрлалд хөдөлгөөн хэрэггүй — тэр бол өнгөрсөн. */
        animate={reviewSnapshot ? null : botAnim}
        onAnimationEnd={() => setBotAnim(null)}
      />

      {reviewSnapshot && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-2.5 text-sm dark:bg-amber-500/10">
          <span className="font-semibold text-amber-800 dark:text-amber-200">
            {reviewPly}-р нүүдлийн дараах байрлал
          </span>
          <button
            type="button"
            onClick={() => setReviewPly(null)}
            className="shrink-0 font-semibold text-amber-800 underline hover:text-amber-900 dark:text-amber-200"
          >
            {t("Эцсийн байрлал руу")}
          </button>
        </div>
      )}

      {tip && !end && (
        <CoachTip coachId={DAAMAL.id} text={tip.text} onDismiss={dismiss} />
      )}

      {end && !adDone && <GameOverAd onDone={() => setAdDone(true)} />}

      {end && adDone && (
        <div className="surface flex flex-col items-center gap-3 p-6 text-center">
          <Mascot mood={end.didIWin ? "cheer" : "think"} className="size-24" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{endMessage(end)}</h2>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={restart}
              className="rounded-xl bg-brand-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-600"
            >
              {t("Дахин тоглох")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/play")}
              className="rounded-xl border border-gray-300 px-6 py-2.5 font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
            >
              {t("Буцах")}
            </button>
          </div>
        </div>
      )}

      {end && adDone && review && (
        /* ⚠ Даамд ҮРГЭЛЖ «Даамал» — бүртгэлийн үед сонгосон багш нь
           шатрын дүр (`lib/tactiq/coaches.ts`-ийн тайлбарыг үзнэ үү). */
        <CoachReview
          coachId={DAAMAL.id}
          review={review}
          selectedPly={reviewPly}
          onSelectMove={(ply) => setReviewPly((current) => (current === ply ? null : ply))}
        />
      )}
    </div>
  );
}

function endMessage(end: EndInfo): string {
  if (end.didIWin === null) return t("Тэнцээ");
  return end.didIWin ? t("Та ялсан! Ботын бүх нүүдэл дуусав.") : t("Бот яллаа — дахин оролдоорой");
}
