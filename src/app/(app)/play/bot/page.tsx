"use client";

import {
  PLAY_BOARD_BLEED,
  PLAY_BOARD_RESERVE,
  PLAY_BOARD_RESERVE_ENDED,
} from "@/lib/tactiq/boardTheme";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Chess } from "chess.js";

import { apiFetch } from "@/lib/apiClient";
import { analyzeGame } from "@/lib/chess/analysis";
import { BOT_DIFFICULTIES, pickBotMove } from "@/lib/chess/bot";
import { findKingSquare, resolveMove } from "@/lib/chess/utils";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { CoachReview } from "@/components/tactiq/CoachReview";
import { CoachTip } from "@/components/tactiq/CoachTip";
import { MatchHeader } from "@/components/chess/MatchHeader";
import { useGameClock } from "@/lib/tactiq/gameClock";
import { GameOverAd } from "@/components/tactiq/GameOverAd";
import { CelebrationVideo } from "@/components/tactiq/CelebrationVideo";
import { EncourageGif } from "@/components/tactiq/LoopGif";
import { Mascot } from "@/components/tactiq/Mascot";
import { DIFFICULTY_LABELS } from "@/lib/tactiq/theme";
import { useUser } from "@/context/UserContext";
import { BotPremiumGate } from "@/components/tactiq/BotPremiumLock";
import { useCoachTip } from "@/hooks/useCoachTip";
import { chessTips } from "@/lib/tactiq/coachTips";

import type { GameReview } from "@/lib/tactiq/moveQuality";
import type { BotDifficulty } from "@/lib/chess/bot";
import type { PublicUser } from "@/lib/api/publicUser";
import type { Move, Square } from "chess.js";
import { t } from "@/lib/i18n/t";

/**
 * Ботын "бодох" ХАМГИЙН БОГИНО хугацаа (мс). Minimax маш хурдан тул
 * бодит тооцоолол ихэвчлэн 10–200мс — үүнийг шууд самбар дээр буулгахад
 * бот нүүдлийг ЗАГАСХИЙЛГЭН хийж, тоглогч юу болсныг анзаарч амждаггүй.
 * Түвшин ахих тусам "гүн бодож байна" мэдрэмж төрүүлэхээр уртсана.
 */
const THINK_MS: Record<BotDifficulty, [min: number, max: number]> = {
  beginner: [500, 900],
  intermediate: [800, 1400],
  advanced: [1200, 2000],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type EndInfo = {
  reason: "checkmate" | "draw" | "timeout";
  didIWin: boolean | null; // null = тэнцээ
};

/**
 * ЦАГИЙН ХЯНАЛТ — ботын дадлага.
 *
 * ⚠ 10 минут + 5 секунд: дадлага нь БОДОХ газар байх ёстой. Блиц цаг нь
 * шинэ сурагчийг цагаар л хожигдуулж, дүрэм сурах боломжийг үгүй
 * болгоно. Нэмэлт нь урт тоглолтод цаг дуусахаас хамгаална.
 */
const CLOCK = { baseMin: 10, incrementSec: 5 };

/** Ботоор дадлагажих — сервер, WebRTC огт шаардлагагүй, бүхэлдээ клиент дээр. */
/** Ботын дадлага Premium — эрхгүй бол сануулга (`BotPremiumGate`). */
export default function BotPage() {
  return (
    <BotPremiumGate>
      <BotPageInner />
    </BotPremiumGate>
  );
}

function BotPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { apply, user } = useUser();

  const difficulty: BotDifficulty = BOT_DIFFICULTIES.includes(
    searchParams.get("difficulty") as BotDifficulty
  )
    ? (searchParams.get("difficulty") as BotDifficulty)
    : "beginner";

  const chessRef = useRef(new Chess());
  const lastMoveRef = useRef<{ from: Square; to: Square } | null>(null);
  const [version, forceUpdate] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [end, setEnd] = useState<EndInfo | null>(null);
  const [adDone, setAdDone] = useState(false);
  const [review, setReview] = useState<GameReview | null>(null);
  /** 0..1 — шинжилгээний явц, "Шинжилж байна…" мөрөнд харуулна */
  const [progress, setProgress] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);

  /*
   * ⚠ ЦАГ — `end` тавигдсаны дараа ЗОГСОНО (`running`). Дууссан
   * тоглолтын цаг үргэлжилбэл дүнгийн дэлгэц дээр тоо буусаар байх ба
   * «тоглолт дуусаагүй» гэсэн буруу мэдрэмж төрүүлнэ.
   */
  const clock = useGameClock({
    ...CLOCK,
    turn: chessRef.current.turn(),
    running: end === null,
    onFlag: (side) => flag(side),
  });

  /**
   * ЦАГ ДУУСЛАА.
   *
   * ⚠ Ботын цаг ч дуусаж БОЛНО: бот өөрөө хүлээдэггүй ч тоглогч
   * дэлгэцээ хааж, эргэж ирэхэд ботын ээлж байсан бол цаг нь
   * хасагдсан байна. Тэр үед тоглогч хожсон гэж үзэх нь зөв —
   * «хэн цаг хэтрүүлсэн, тэр хожигдоно» гэсэн дүрэм хоёр талд ижил.
   */
  const flag = useCallback(
    (side: "w" | "b") => {
      const didIWin = side === "b";
      setEnd({ reason: "timeout", didIWin });

      apiFetch<{ user: PublicUser }>("/api/play/bot/result", {
        method: "POST",
        body: { result: didIWin ? "win" : "loss", difficulty },
      })
        .then((data) => apply(data.user))
        .catch(() => {
          // Статистик бичихэд алдаа гарсан ч тоглогчийн UI-г эвдэхгүй.
        });
    },
    [apply, difficulty]
  );

  const checkGameOver = useCallback(() => {
    const chess = chessRef.current;
    if (!chess.isGameOver()) return false;

    // Мад хийгдэх үед нүүх ёстой байсан тал (`turn()`) ялагдсан. Тоглогч
    // ЯМАГТ цагаанаар тоглодог тул "ялагдсан = цагаан" гэсэн үг.
    const didIWin = chess.isCheckmate() ? chess.turn() !== "w" : null;
    setEnd({ reason: chess.isCheckmate() ? "checkmate" : "draw", didIWin });

    const outcome = didIWin === null ? "draw" : didIWin ? "win" : "loss";
    // `difficulty` нь Elo-д хэрэгтэй — сул ботыг ялах нь хүчтэйг ялахтай
    // ижил үнэлэгдэх ёсгүй (`lib/api/rating.ts`).
    apiFetch<{ user: PublicUser }>("/api/play/bot/result", {
      method: "POST",
      body: { result: outcome, difficulty },
    })
      .then((data) => apply(data.user))
      .catch(() => {
        // Тоглолт өөрөө үргэлжлүүлж чадах тул статистик бичихэд алдаа гарсан
        // ч тоглогчийн UI-г ЭВДЭХГҮЙ.
      });

    return true;
  }, [apply, difficulty]);

  const botTurn = useCallback(async () => {
    const chess = chessRef.current;
    if (chess.isGameOver() || chess.turn() !== "b") return;

    setThinking(true);
    // Дараагийн frame хүртэл хүлээнэ — "Бодож байна…" төлөв ЗААВАЛ нэг
    // удаа зурагдсаны дараа л хүнд тооцоолол эхэлнэ, эс бөгөөс гүнзгий
    // (advanced) түвшинд UI хэсэг зуур царцсан мэт санагдана.
    await new Promise(requestAnimationFrame);

    const [min, max] = THINK_MS[difficulty];
    const target = min + Math.random() * (max - min);
    const startedAt = performance.now();

    const move = pickBotMove(chess, difficulty);

    // Тооцооллын ДАРАА үлдсэн хугацааг л хүлээнэ — хүнд байрлалд бодолт
    // өөрөө удаан бол нэмж саатуулахгүй, хөнгөн байрлалд хиймэл завсар
    // өгч хэмнэлийг жигдэлнэ.
    const elapsed = performance.now() - startedAt;
    if (elapsed < target) await sleep(target - elapsed);

    if (move) {
      chess.move(move);
      lastMoveRef.current = { from: move.from as Square, to: move.to as Square };
      /* ⚠ Ботын нүүдэлд ч цаг зогсож, нэмэлт олгогдоно. */
      clock.onMove("b");
    }

    setThinking(false);
    forceUpdate((v) => v + 1);
    checkGameOver();
  }, [difficulty, checkGameOver, clock]);

  const handleMove = (from: Square, to: Square) => {
    if (thinking || end || chessRef.current.turn() !== "w") return;

    const chess = chessRef.current;
    const match = resolveMove(chess, from, to);
    if (!match) return;

    const applied = chess.move({ from, to, promotion: match.promotion });
    if (!applied) return;

    lastMoveRef.current = { from, to };
    clock.onMove("w");
    forceUpdate((v) => v + 1);

    if (!checkGameOver()) void botTurn();
  };

  const restart = () => {
    // `chessRef.current`-ыг ДАХИН ОНОХГҮЙ (`= new Chess()`) — зөвхөн ижил
    // instance-ийг эхний байрлал руу шинэчилнэ, `/play/[roomId]`-тэй адил.
    chessRef.current.reset();
    clock.reset();
    lastMoveRef.current = null;
    setEnd(null);
    setAdDone(false);
    setReview(null);
    forceUpdate((v) => v + 1);
  };

  /**
   * "Robo Coach" — дууссан тоглоомыг эхнээс нь дахин тоглуулж, миний
   * (цагаан) нүүдэл бүрийг тухайн мөчийн хамгийн сайн боломжтой харьцуулна.
   *
   * ⚠ Урьд нь "маш хурдан" гэж тайлбарлаад НЭГ frame л хүлээдэг байсан.
   * Хэмжилтээр 60 нүүдэлт тоглоомд ~4.4 секунд болсон бөгөөд тэр бүх
   * хугацаанд урсгал БОГЛОГДДОГ — нэг frame хүлээх нь эхлэлийг л хойшлуулна,
   * царцалтыг арилгахгүй. Одоо `analyzeGame` нүүдэл тутамд удирдлагаа
   * буцаадаг тул дэлгэц амьд үлдэж, явц нь харагдана.
   */
  const analyze = async () => {
    setAnalyzing(true);
    setProgress(0);
    const history = chessRef.current.history({ verbose: true }) as Move[];
    setReview(await analyzeGame(history, "w", 2, setProgress));
    setAnalyzing(false);
  };

  const snapshot = useMemo(() => {
    const chess = chessRef.current;
    return {
      board: chess.board(),
      turn: chess.turn(),
      checkedSquare: chess.inCheck() ? findKingSquare(chess) : null,
      lastMove: lastMoveRef.current,
    };
    // `version` зөвхөн "дахин тооцоол" гэсэн дохио — `chessRef`/`lastMoveRef`
    // мутацлагддаг тул бодит hook хамаарал биш.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
  const myTurn = !thinking && !end && snapshot.turn === "w";

  /**
   * Дүрмийн тайлбар — ЗӨВХӨН тоглогчийн ээлжид, хөлөг дээр бодитоор
   * тохиолдсон мөчид. Ботын бодож байх хооронд бөмбөлөг гаргавал хүүхэд
   * уншиж амжихгүй, мөн тайлбар нь «боолт» шиг өөрийнх нь байрлалд
   * хамаарахаа болино.
   *
   * `version` нь snapshot-той ижил дохио — нүүдэл хийгдэх бүрд дахин
   * тооцно (`chessRef` мутацлагддаг тул бодит hook хамаарал биш).
   */
  const tips = useMemo(
    () => (myTurn ? chessTips(chessRef.current) : []),
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
    <div
      className={`mx-auto flex max-w-xl flex-col gap-2 sm:gap-4 ${
        end ? PLAY_BOARD_RESERVE_ENDED : PLAY_BOARD_RESERVE
      }`}
    >
      <div className="surface flex items-center justify-between px-4 py-2 sm:p-4">
        <Link
          href="/play"
          className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("Буцах")}
        </Link>
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {t("Бот")} · {t(DIFFICULTY_LABELS[difficulty])}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {end
              ? t("Тоглоом дууссан")
              : thinking
                ? t("Бот бодож байна")
                : myTurn
                  ? t("Таны ээлж")
                  : t("Ботын ээлж")}
            {thinking && <ThinkingDots />}
          </p>
        </div>
      </div>

      {/* Цаг ХӨЛГИЙН ДЭЭР; утсан дээр дууссаны дараа нуугдаж, зай нь дүнгийн картад очно. */}
      <div className={end ? "max-lg:hidden" : undefined}>
        <MatchHeader
          leftName={user?.displayName || t("Та")}
          rightName={`${t("Бот")} · ${t(DIFFICULTY_LABELS[difficulty])}`}
          /* ⚠ Тоглогч ЯМАГТ цагаанаар тоглодог тул зүүн цаг нь цагааны цаг. */
          leftMs={clock.white}
          rightMs={clock.black}
          activeSide={chessRef.current.turn()}
          myColor="w"
        />
      </div>

      <div className={PLAY_BOARD_BLEED}>
        <ChessBoard
          coordinates={false}
          board={snapshot.board}
          orientation="white"
          interactive={myTurn}
          getLegalTargets={(square) =>
            (chessRef.current.moves({ square, verbose: true }) as Move[]).map(
              (move) => move.to as Square
            )
          }
          onMove={handleMove}
          lastMove={snapshot.lastMove}
          checkedSquare={snapshot.checkedSquare}
        />
      </div>

      {/* Тайлбарлагч дүр ХӨЛГИЙН ДООР. */}
      {tip && !end && <CoachTip coachId={user?.coachId} text={tip.text} onDismiss={dismiss} />}

      <div className="flex flex-col gap-2 empty:hidden sm:gap-4">
        {end && !adDone && <GameOverAd onDone={() => setAdDone(true)} />}

        {end && adDone && (
          <div className="surface flex flex-col items-center gap-2 p-4 text-center sm:gap-3 sm:p-6">
            {/*
              ⚠ ЯЛАЛТ үед БАЯР ХҮРГЭХ ВИДЕО — онлайн тоглолт, хичээл
              дуусгах дэлгэцтэй ИЖИЛ (`CelebrationVideo`). Ботыг ялах нь
              ч ялалт; өөр баяр хэрэглэвэл «бот ялах нь дутуу ялалт»
              гэсэн мессеж чимээгүй гарна.

              ⚠ ХОЖИГДОЛ, ТЭНЦЭЭ үед баяр ХЭРЭГЛЭХГҮЙ: хожигдсон
              хүүхдэд баяр хүргэх нь доромжлол шиг мэдрэгдэнэ.
            */}
            {end.didIWin ? (
              <div className="size-16 overflow-hidden rounded-full sm:size-28 ring-4 ring-brand-100 dark:ring-white/15">
                <CelebrationVideo className="size-full object-cover" />
              </div>
            ) : end.didIWin === false ? (
              /*
                ⚠ ХОЖИГДОЛ үед ЗОРИГЖУУЛАХ хөдөлгөөнт зураг
                (`EncourageGif`): урьд нь бодолтой дүрс гарч байсан тул
                «яагаад бодож байна?» гэсэн ойлгомжгүй мэдрэмж төрдөг
                байв. Хожигдол нь дасгалын нэг хэсэг — дүрс нь түүнийг
                шийтгэл БИШ гэдгийг хэлэх ёстой.
              */
              <div className="size-16 overflow-hidden rounded-full sm:size-28 ring-4 ring-gray-100 dark:ring-white/10">
                <EncourageGif className="size-full object-cover" />
              </div>
            ) : (
              <Mascot mood="think" className="size-16 sm:size-24" />
            )}
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl dark:text-white">{endMessage(end)}</h2>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={restart}
                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold sm:px-6 sm:py-2.5 sm:text-base text-white hover:bg-brand-600"
              >
                {t("Дахин тоглох")}
              </button>
              {!review && (
                <button
                  type="button"
                  onClick={() => void analyze()}
                  disabled={analyzing}
                  className="rounded-xl border border-brand-300 px-4 py-2 text-sm font-semibold sm:px-6 sm:py-2.5 sm:text-base text-brand-600 hover:bg-brand-50 disabled:opacity-60 dark:border-brand-500/40 dark:text-brand-400 dark:hover:bg-brand-500/10"
                >
                  {analyzing
                    ? `Шинжилж байна… ${Math.round(progress * 100)}%`
                    : t("Robo Coach-оос дүн авах")}
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push("/play")}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold sm:px-6 sm:py-2.5 sm:text-base text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
              >
                {t("Буцах")}
              </button>
            </div>
          </div>
        )}

        {review && <CoachReview coachId={user?.coachId} review={review} />}
      </div>
    </div>
  );
}

/** "Бодож байна" мөрний амьд цэгүүд — гурван цэг ээлжлэн үсэрнэ. */
function ThinkingDots() {
  return (
    <span className="ml-1 inline-flex gap-0.5 align-middle" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="size-1 animate-bounce rounded-full bg-brand-500"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

function endMessage(end: EndInfo): string {
  if (end.didIWin === null) return t("Тэнцээ");
  if (end.reason === "timeout") {
    return end.didIWin ? t("Ботын цаг дууслаа — Та яллаа!") : t("Таны цаг дууслаа");
  }
  return end.didIWin ? t("Мад! Та ботыг яллаа!") : t("Мад хийгдлээ — Бот яллаа");
}
