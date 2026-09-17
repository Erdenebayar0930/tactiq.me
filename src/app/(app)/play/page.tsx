"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bot, Check, CircleDot, Copy, Share2, UserPlus } from "lucide-react";

import { useCurrentUser } from "@/context/UserContext";
import { courseHasOnline } from "@/lib/tactiq/courseNav";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { BOT_DIFFICULTIES } from "@/lib/chess/bot";
import { DRAUGHTS_BOT_DIFFICULTIES } from "@/lib/draughts/bot";
import { inviteUrl } from "@/lib/chess/invite";
import { playGameLabel, roomPath } from "@/lib/tactiq/playGame";

import type { PlayGame } from "@/lib/tactiq/playGame";
import { DIFFICULTY_LABELS } from "@/lib/tactiq/theme";
import { GameRobot } from "@/components/tactiq/GameRobot";
import { TournamentSection } from "@/components/tactiq/TournamentSection";
import { ErrorNote } from "@/components/tactiq/ui";
import { t } from "@/lib/i18n/t";

type QueueStatus = "idle" | "searching" | "error";

/**
 * Дарааллын polling — ЭХЭНД шуурхай, ДАРАА НЬ уужим (exponential backoff).
 *
 * ЯАГААД: тоглогч ихтэй үед хос ихэвчлэн эхний хэдэн секундэд таардаг тул
 * шуурхай эхлэх нь хэрэглэгчийн мэдрэмжийг сайжруулна. Харин хэн ч байхгүй
 * үед (жишээ нь шөнө, эсвэл цөөн хүүхэдтэй курс) 1.5 секунд тутмын хүсэлт
 * олон арван минут үргэлжилж, зөвхөн сервер, батарей иддэг.
 *
 * ⚠ Хамгийн эрсдэлтэй агшин нь "хичээл эхлэх цаг" — олон зуун хүүхэд ЗЭРЭГ
 * дараалалд ордог. Тэр үед бүгд 1.5 секундээр цохивол дарамт нь хэрэглэгчийн
 * тоотой ШУГАМАН өснө. Backoff нь удаан хүлээгчдийг автоматаар сийрэгжүүлж,
 * дарамтыг тогтворжуулна.
 */
const POLL_START_MS = 1500;
const POLL_MAX_MS = 6000;
/** Тик тутамд хэдэн хувиар уужим болох вэ (1.5 = 1.5с → 2.25с → 3.4с → …) */
const POLL_BACKOFF_FACTOR = 1.5;

/**
 * Онлайн тоглогчийн тоо — зөвхөн мэдээллийн зориулалттай туслах тоо тул
 * ойр ойрхон шинэчлэх шаардлагагүй. Сервер тал үүнийг 5 секунд кэшилдэг
 * (`/api/play/online`) тул түүнээс ойр асуух нь ямар ч шинэ мэдээлэл
 * авчрахгүй, зөвхөн хүсэлтийн тоог өсгөнө.
 */
const ONLINE_POLL_INTERVAL_MS = 15000;

/**
 * Найзын урилга хүлээгдэж буй эсэхийг шалгах давтамж. Дарааллын
 * backoff-той адил уужруулах шаардлагагүй — урилга нь ганц хүнийг хүлээдэг
 * тул нэг зэрэг polling хийж буй хүний тоо нь "хайж байгаа" бүх хүн БИШ,
 * зөвхөн холбоосоо илгээчхээд суусан цөөхөн хүн.
 */
const INVITE_POLL_INTERVAL_MS = 2500;

/** Тоглогч хайх лобби — санамсаргүй өрсөлдөгчтэй хослуулна (#шатар тоглох). */
export default function PlayPage() {
  const router = useRouter();
  const user = useCurrentUser();
  /**
   * Энэ дэлгэц СОНГОСОН КУРСЭД тохирно.
   *
   * `hasOnline` нь тухайн курс санамсаргүй өрсөлдөгчтэй хослох боломжтой
   * эсэхийг хэлнэ (`lib/tactiq/courseNav.ts`). Дам одоогоор ЗӨВХӨН ботын
   * эсрэг тул даам сурч буй хүнд "Тоглогч хайх" товч, онлайн тоолуур,
   * шатрын ботууд огт харагдахгүй — тэдгээр нь түүнд ажиллахгүй зүйлс.
   *
   * Курс сонгоогүй хэрэглэгчид БҮГДИЙГ харуулна: түүнд аль нь ч хаалттай
   * байх шалтгаан алга, харин сонгох гэж буй зүйлээ туршиж үзэх нь зөв.
   */
  const noCourse = !user.activeCourseSlug;
  const isDraughtsCourse = user.activeCourseSlug === "checkers";
  const showChess = !isDraughtsCourse;
  const showDraughts = isDraughtsCourse || noCourse;
  const showOnline = courseHasOnline(user.activeCourseSlug);
  /**
   * ОНЛАЙН хос ямар тоглоомоор үүсэх вэ.
   *
   * ⚠ Курсээс шийднэ, хэрэглэгчээс асуухгүй: даам сурч байгаа хүнд
   * «шатар эсвэл даам?» гэсэн сонголт нэмэх нь нэг дарж болох зүйлийг
   * хоёр дарж болох зүйл болгоно. Курс сонгоогүй хүнд шатар — тэр нь
   * тоглогч хамгийн их байдаг тоглоом.
   */
  const onlineGame: PlayGame = isDraughtsCourse ? "draughts" : "chess";
  const [status, setStatus] = useState<QueueStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * "Polling-оо зогсоо" тэмдэг — унтарсан үед polling шинээр эхлэхгүй.
   * `search()` ЭХЭЛЖ БАЙХДАА эргээд `false` болгодог тул "Цуцлах" дараад
   * дахин "Тоглогч хайх" дарахад асуудалгүй үргэлжилнэ.
   *
   * ⚠ Component unmount-д ЗӨВХӨН `useEffect`-ийн cleanup-аар нэмэлтээр
   * `true` болгоно — React StrictMode dev горимд effect-ийг ХОЁР удаа
   * (mount→cleanup→mount) дуудах тул цэвэрлэгээнд ГАНЦААР найдвал жинхэнэ
   * mount дээр polling шууд "зогссон" төлөвтэй эхэлдэг байсан.
   */
  const stopped = useRef(false);

  useEffect(() => {
    return () => {
      stopped.current = true;
      if (pollTimer.current !== null) clearTimeout(pollTimer.current);
    };
  }, []);

  // Онлайн тоглогчийн тоо — хайж байгаа эсэхээс үл хамааран, хуудсан дээр
  // байх хугацаанд тогтмол шинэчлэгдэнэ. `cancelled` энд ГАДНАХ ref БИШ,
  // effect бүрийн дотор шинээр үүсдэг тул StrictMode-ийн давхар дуудлагад
  // (`/play/page.tsx`-ийн дараалал polling дээр тулгарсантай ижил асуудал)
  // өртөхгүй.
  useEffect(() => {
    // Онлайн тоглолтгүй курст (дам) энэ тоо хаана ч харагдахгүй тул 5
    // секунд тутмын хүсэлт нь зөвхөн батарей, трафик иддэг.
    if (!showOnline) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const data = await apiFetch<{ online: number }>("/api/play/online");
        if (!cancelled) setOnlineCount(data.online);
      } catch {
        // Туслах мэдээлэл тул алдаа гарсан ч лоббийг эвдэхгүй — дараагийн
        // тик дахин оролдоно.
      }
    };

    void tick();
    const interval = setInterval(tick, ONLINE_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [showOnline]);

  const pollStatus = () => {
    let delay = POLL_START_MS;

    const tick = async () => {
      if (stopped.current) return;
      try {
        const data = await apiFetch<{ matched: boolean; roomId?: string; game?: PlayGame }>(
          "/api/play/queue/status"
        );
        if (stopped.current) return;
        if (data.matched && data.roomId) {
          /*
           * ⚠ Хаягийг СЕРВЕРИЙН `game`-ээс тооцно, `onlineGame`-ээс БИШ:
           * хүлээж байх хооронд хэрэглэгч курсээ сольсон байж мэднэ.
           * Тэр үед өрөө нь хуучин тоглоомынх хэвээр байна.
           */
          router.push(roomPath(data.game ?? onlineGame, data.roomId));
          return;
        }
      } catch {
        // Түр зуурын алдаа — polling үргэлжилнэ, тоглогчийг цуцлахад хүргэхгүй.
      }
      if (!stopped.current) {
        pollTimer.current = setTimeout(tick, delay);
        delay = Math.min(Math.round(delay * POLL_BACKOFF_FACTOR), POLL_MAX_MS);
      }
    };
    void tick();
  };

  const search = async () => {
    stopped.current = false;
    setStatus("searching");
    setError(null);

    try {
      const data = await apiFetch<{
        matched: boolean;
        roomId?: string;
        game?: PlayGame;
        color?: string;
      }>("/api/play/queue/join", { method: "POST", body: { game: onlineGame } });

      if (data.matched && data.roomId) {
        router.push(roomPath(data.game ?? onlineGame, data.roomId));
        return;
      }

      pollStatus();
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
    }
  };

  const cancel = async () => {
    stopped.current = true;
    if (pollTimer.current !== null) clearTimeout(pollTimer.current);
    setStatus("idle");
    try {
      await apiFetch("/api/play/queue", { method: "DELETE" });
    } catch {
      // Цуцлах хүсэлт амжилтгүй ч UI аль хэдийн idle болсон тул дахин оролдох шаардлагагүй.
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
      {/*
        ⚠ РОБОТ, дүрс БИШ: урьд нь өнгөт хайрцаг дотор жижиг глиф
        (`CircleDot` / `Swords`) байсан тул шатар, даамын лобби хоёр
        бараг ижил харагддаг байв. Робот нь тоглоомынхоо хөлөгтэй
        (`playGameRobot`) тул нэг харцад л ялгагдана.

        ⚠ НЭГ ДЭЛГЭЦЭНД НЭГ Л РОБОТ. Тоглогч хайж байх үед доор ч робот
        гардаг байсан тул ижил дүрс хоёр удаа зэрэгцэн харагдаж байв.
        Одоо хайлт нь доор ШИНЭ дүрс нэмэхгүй, харин ЭНЭ роботыг зөөлөн
        цохилуулж (`animate-pulse`) «ажиллаж байна» гэдгийг хэлнэ.
      */}
      <GameRobot
        game={onlineGame}
        className={`h-28 w-auto ${status === "searching" ? "motion-safe:animate-pulse" : ""}`}
      />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {isDraughtsCourse ? t("Даам тоглох") : t("Шатар тоглох")}
      </h1>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("Санамсаргүй тоглогчтой шууд (P2P) холбогдоно, эсвэл найзаа урина.")}
      </p>

      {showOnline && onlineCount !== null && (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
          {onlineCount} тоглогч онлайн
        </p>
      )}

      {error && <ErrorNote message={error} onRetry={() => void search()} />}

      {status === "searching" ? (
        <div className="flex flex-col items-center gap-4">
          {/*
            ⚠ ЭНД ДҮРС БАЙХГҮЙ: дээрх робот аль хэдийн тоглоомыг хэлж
            байгаа тул дахин зурвал нэг дэлгэцэнд ижил дүрс давхцана.
            Хайлт явж байгааг эргэлдэх тойрог ба цохилох робот хэлнэ.
          */}
          <p className="inline-flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-200">
            <span
              className="size-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
              aria-hidden
            />
            {t("Тоглогч хайж байна…")}
          </p>
          <button
            type="button"
            onClick={() => void cancel()}
            className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
          >
            {t("Цуцлах")}
          </button>
        </div>
      ) : (
        <>
          {showOnline && (
            <button
              type="button"
              onClick={() => void search()}
              className="rounded-xl bg-brand-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-600"
            >
              {t("Тоглогч хайх")}
            </button>
          )}

          {showOnline && <FriendInvite game={onlineGame} />}

          {showChess && (
            <BotRow
              label={showOnline ? t("эсвэл ботоор дадлагажих") : t("ботоор дадлагажих")}
              levels={BOT_DIFFICULTIES}
              hrefFor={(level) => `/play/bot?difficulty=${level}`}
              Icon={Bot}
            />
          )}

          {/*
            Дамын блокийг ЗӨВХӨН даам сурч буй хүнд харуулна.
            ⚠ Урьд нь шатар, дамын блок хоёулаа ҮРГЭЛЖ зэрэг харагддаг байв —
            сонгосон курс нь энэ дэлгэцэд юуг ч өөрчлөхгүй тул даам сурч буй
            хүүхэд эхлээд шатрын хоёр блокийг өнгөрөөж байж өөрийн тоглоом
            дээрээ хүрдэг байсан.
          */}
          {showDraughts && (
            <BotRow
              label={showChess ? t("100 нүдэн шашки (дам)") : t("ботоор дадлагажих")}
              levels={DRAUGHTS_BOT_DIFFICULTIES}
              hrefFor={(level) => `/play/draughts?difficulty=${level}`}
              Icon={CircleDot}
            />
          )}
        </>
      )}

      {/* Тэмцээн тусдаа серверт — бүртгэл, төлбөр нь энд (`TournamentSection`) */}
      <TournamentSection />
    </div>
  );
}

/**
 * "Найзаа урих" — санамсаргүй өрсөлдөгчийн оронд ТОДОРХОЙ нэг хүнтэй
 * тоглох зам.
 *
 * Урилга үүсмэгц холбоос гарч ирнэ: гар утсан дээр төхөөрөмжийн өөрийн
 * "Хуваалцах" цэсээр (Messenger, WhatsApp гэх мэт) шууд илгээнэ,
 * компьютер дээр хуулж авна. Найз нь холбоосыг дармагц өрөө үүсч, энэ
 * дэлгэц polling-оороо мэдээд хоёуланг нь хөлөг рүү аваачна.
 */
function FriendInvite({ game }: { game: PlayGame }) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  /** `navigator.share` зөвхөн хөтөч дээр мэдэгдэх тул mount-ийн дараа шалгана. */
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  // Найз холбоосыг дармагц сервер дээр өрөө үүснэ — үүнийг ЗӨВХӨН polling-оор
  // л мэдэж болно (энэ тал нь ямар ч үйлдэл хийхгүй хүлээж байгаа).
  useEffect(() => {
    if (!code) return;

    let cancelled = false;

    const tick = async () => {
      try {
        const data = await apiFetch<{ roomId: string | null; game?: PlayGame }>(
          `/api/play/invite/${code}`
        );
        if (!cancelled && data.roomId) router.push(roomPath(data.game ?? game, data.roomId));
      } catch {
        // Түр зуурын алдаа — дараагийн тик дахин оролдоно.
      }
    };

    const interval = setInterval(tick, INVITE_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [code, router, game]);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ code: string }>("/api/play/invite", {
        method: "POST",
        body: { game },
      });
      setCode(data.code);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const current = code;
    setCode(null);
    setCopied(false);
    if (!current) return;
    try {
      await apiFetch(`/api/play/invite/${current}`, { method: "DELETE" });
    } catch {
      // UI аль хэдийн хаагдсан, урилга нь хугацаагаараа өөрөө устана.
    }
  };

  const share = async () => {
    const url = inviteUrl(code!);
    try {
      /*
       * ⚠ Бичвэр нь ТОГЛООМООР: «Надтай шатар тоглоё!» гэсэн урилга
       * даамын өрөө рүү хөтөлвөл найз нь буруу зүйл хүлээж нээнэ.
       */
      const name = playGameLabel(game);
      await navigator.share({
        title: `${name} ${t("тоглоцгооё")}`,
        text: `${t("Надтай")} ${name.toLowerCase()} ${t("тоглоё!")}`,
        url,
      });
    } catch {
      // Хэрэглэгч хуваалцахаас татгалзсан — алдаа биш.
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl(code!));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("Хуулж чадсангүй — холбоосыг гараар сонгож хуулна уу."));
    }
  };

  if (!code) {
    return (
      <>
        {error && <ErrorNote message={error} />}
        <button
          type="button"
          onClick={() => void create()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-300 px-6 py-2.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-60 dark:border-brand-500/40 dark:text-brand-400 dark:hover:bg-brand-500/10"
        >
          <UserPlus className="size-4" aria-hidden />
          {busy ? t("Холбоос үүсгэж байна…") : t("Найзаа урих")}
        </button>
      </>
    );
  }

  return (
    <div className="surface flex w-full flex-col items-center gap-3 p-4">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {t("Холбоосоо найздаа илгээнэ үү")}
      </p>
      <p className="w-full truncate rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600 dark:bg-white/5 dark:text-gray-300">
        {typeof window === "undefined" ? "" : inviteUrl(code)}
      </p>

      {error && <ErrorNote message={error} />}

      <div className="flex flex-wrap justify-center gap-2">
        {canShare && (
          <button
            type="button"
            onClick={() => void share()}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Share2 className="size-4" aria-hidden />
            {t("Хуваалцах")}
          </button>
        )}
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? t("Хуулагдлаа") : t("Холбоос хуулах")}
        </button>
      </div>

      <p className="animate-pulse text-xs text-gray-500 dark:text-gray-400">
        {t("Найзаа холбоос дарахыг хүлээж байна…")}
      </p>

      <button
        type="button"
        onClick={() => void cancel()}
        className="text-xs text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
      >
        {t("Цуцлах")}
      </button>
    </div>
  );
}

/**
 * "Ботоор дадлагажих" эгнээ — хуваагч зураас + хүндрэлийн 3 товч.
 *
 * Шатар, дам хоёр яг ижил бүтэцтэй байсан тул нэг компонент болгов: хүндрэл
 * нэмэгдвэл нэг л газар засна.
 */
function BotRow({
  label,
  levels,
  hrefFor,
  Icon,
}: {
  label: string;
  levels: readonly string[];
  hrefFor: (level: string) => string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <>
      <div className="flex w-full items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        {label}
        <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
      </div>

      <div className="grid w-full grid-cols-3 gap-2">
        {levels.map((level) => (
          <Link
            key={level}
            href={hrefFor(level)}
            className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
          >
            <Icon className="size-5" aria-hidden />
            {t(DIFFICULTY_LABELS[level])}
          </Link>
        ))}
      </div>
    </>
  );
}
