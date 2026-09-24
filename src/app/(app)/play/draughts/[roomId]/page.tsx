"use client";

import {
  PLAY_BOARD_BLEED,
  PLAY_BOARD_RESERVE,
  PLAY_BOARD_RESERVE_ENDED,
} from "@/lib/tactiq/boardTheme";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Flag, WifiOff } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { ChessWebRTC } from "@/lib/chess/webrtc";
import { Draughts } from "@/lib/draughts/engine";
import { DraughtsBoard } from "@/components/draughts/DraughtsBoard";
import { MatchHeader } from "@/components/chess/MatchHeader";
import { useGameClock } from "@/lib/tactiq/gameClock";
import { GameOverAd } from "@/components/tactiq/GameOverAd";
import { GameRobot } from "@/components/tactiq/GameRobot";
import { CelebrationVideo } from "@/components/tactiq/CelebrationVideo";
import { EncourageGif } from "@/components/tactiq/LoopGif";
import { Mascot } from "@/components/tactiq/Mascot";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useCurrentUser, useUser } from "@/context/UserContext";
import { t } from "@/lib/i18n/t";

import type { PublicUser } from "@/lib/api/publicUser";
import type { Square } from "@/lib/draughts/engine";

type Color = "white" | "black";

type RoomInfo = {
  roomId: string;
  color: Color;
  status: "active" | "finished";
  opponent: { uid: string; displayName: string; photoUrl: string } | null;
};

type ConnState = "loading" | "connecting" | "playing" | "ended" | "error";

type EndInfo = {
  /** ⚠ `checkmate` нь ДААМД «нүүх боломжгүй болсон» гэсэн утгатай. */
  reason: "checkmate" | "resignation" | "draw" | "disconnect" | "timeout";
  didIWin: boolean | null; // null = тэнцээ
};

/**
 * ЦАГИЙН ХЯНАЛТ — онлайн даам (шатрын өрөөтэй ИЖИЛ тогтмол).
 *
 * ⚠ ХОЁР ТАЛ ижил тогтмолыг уншина тул тохиролцоо шаардлагагүй.
 */
const CLOCK = { baseMin: 10, incrementSec: 5 };

/**
 * ХОЁР ХҮНИЙ ДААМЫН ӨРӨӨ — WebRTC P2P.
 *
 * ⚠ Шатрын өрөөтэй (`play/[roomId]`) ИЖИЛ сүлжээний код хэрэглэнэ
 * (`ChessWebRTC`, `/api/play/rooms/*`): урилга, дараалал, сигналын
 * систем нь `game` баганаар хоёр тоглоомд үйлчилдэг
 * (`lib/tactiq/playGame.ts`). Зөвхөн ХӨЛӨГ ба ДҮРЭМ өөр.
 *
 * ⚠ НҮҮДЭЛ нь СЕРВЕРТ ХҮРДЭГГҮЙ: DataChannel-аар шууд P2P урсана. Сервер
 * нь зөвхөн хос хэн бэ, дууссан эсэхийг мэднэ.
 *
 * ⚠ Хууль бус нүүдэл нь ХОЁР ТАЛД зогсоно: ирсэн нүүдлийг `move()`
 * өөрийн байрлалаараа шалгаж, таарахгүй бол `null` буцаана. Өөрчилсөн
 * клиент хуурамч нүүдэл илгээж чадахгүй.
 */
export default function DraughtsRoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const me = useCurrentUser();
  const { apply } = useUser();

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [state, setState] = useState<ConnState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState<EndInfo | null>(null);
  const [adDone, setAdDone] = useState(false);
  // Зөвхөн rerender өдөөхөд — `gameRef` mutable тул утгыг нь уншихгүй.
  const [, forceUpdate] = useState(0);

  /*
   * ⚠ `room`-ыг REF-д ч барина: цагийн `onFlag` нь интервал дотроос
   * дуудагдах тул төлөвийн хуучин хуулбар (stale closure) руу орох
   * эрсдэлтэй — тэр үед хожигдол буруу талд бичигдэнэ.
   */
  const roomRef = useRef<RoomInfo | null>(null);
  const gameRef = useRef(new Draughts());
  const rtcRef = useRef<ChessWebRTC | null>(null);
  const lastMoveRef = useRef<{ from: Square; to: Square } | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  /*
   * ⚠ Цагийг REF-ээр ч барина: WebRTC-ийн `onMessage` НЭГ УДАА
   * тавигддаг тул тэр closure дахь `clock` нь эхний render-ийн
   * хуулбар болно.
   */
  const clockRef = useRef<ReturnType<typeof useGameClock> | null>(null);

  const reportEnd = useCallback(
    async (reason: EndInfo["reason"], winnerUid: string | null) => {
      if (endedRef.current) return;
      endedRef.current = true;
      try {
        const data = await apiFetch<{ user: PublicUser }>(
          `/api/play/rooms/${params.roomId}/end`,
          { method: "POST", body: { reason, winnerUid } }
        );
        apply(data.user);
      } catch {
        // Аль нэг тал аль хэдийн мэдээлсэн байж болно — үл тоомсорлоно.
      }
    },
    [params.roomId, apply]
  );

  const finishLocally = useCallback((reason: EndInfo["reason"], didIWin: boolean | null) => {
    setEnd({ reason, didIWin });
    setState("ended");
  }, []);

  const myUid = me.uid;

  /**
   * ЦАГ ДУУСЛАА — ЗӨВХӨН ӨӨРИЙН цагийг зарлана (сүлжээний зөрүү тул
   * өрсөлдөгчийн цагийг дүгнэх эрхийг хэнд ч өгөхгүй).
   */
  const flag = useCallback(
    (side: "w" | "b") => {
      const room = roomRef.current;
      if (!room || endedRef.current) return;

      const iAmSide = room.color === "white" ? "w" : "b";
      if (side !== iAmSide) return;

      rtcRef.current?.send({ type: "timeout" });
      setEnd({ reason: "timeout", didIWin: false });
      setState("ended");
      void reportEnd("timeout", room.opponent?.uid ?? null);
    },
    [reportEnd]
  );

  const checkGameOver = useCallback(
    (myColor: Color, opponentUid: string | null) => {
      const game = gameRef.current;
      if (!game.isGameOver()) return;

      const winner = game.winner();
      if (winner === null) {
        finishLocally("draw", null);
        void reportEnd("draw", null);
        return;
      }

      const iWon = (winner === "w") === (myColor === "white");
      finishLocally("checkmate", iWon);
      void reportEnd("checkmate", iWon ? myUid : opponentUid);
    },
    [finishLocally, reportEnd, myUid]
  );

  /* ⚠ Цаг зөвхөн `playing` үед: холбогдох хугацаа нь бодсон хугацаа БИШ. */
  const clock = useGameClock({
    ...CLOCK,
    turn: gameRef.current.turn() === "b" ? "b" : "w",
    running: state === "playing",
    onFlag: flag,
  });

  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await apiFetch<RoomInfo>(`/api/play/rooms/${params.roomId}`);
        if (cancelled) return;

        if (data.status === "finished") {
          setRoom(data);
          setState("ended");
          setEnd({ reason: "disconnect", didIWin: null });
          return;
        }

        setRoom(data);
        setState("connecting");

        /*
         * ⚠ ЦАГААН нь ҮРГЭЛЖ `offerer`: урилга, дараалал хоёулаа урьсан
         * / эрт хүлээсэн талыг цагаан болгодог тул хоёр тал ямагт өөр
         * дүрд оногдоно. Хоёулаа offerer бол холболт ХЭЗЭЭ Ч үүсэхгүй.
         */
        const rtc = new ChessWebRTC(params.roomId, data.color === "white" ? "offerer" : "answerer");
        rtcRef.current = rtc;

        rtc.onOpen = () => {
          if (!cancelled) setState("playing");
        };

        rtc.onMessage = (raw) => {
          if (cancelled) return;
          const msg = raw as { type?: string; from?: Square; to?: Square };

          if (msg.type === "move" && msg.from && msg.to) {
            const applied = gameRef.current.move(msg.from, msg.to);
            if (!applied) return;
            lastMoveRef.current = { from: msg.from, to: msg.to };
            /* ⚠ Өрсөлдөгчийн нүүдэл — түүний цаг зогсож, нэмэлт олгогдоно. */
            clockRef.current?.onMove(data.color === "white" ? "b" : "w");
            forceUpdate((v) => v + 1);
            checkGameOver(data.color, data.opponent?.uid ?? null);
            return;
          }

          /* ⚠ Өрсөлдөгч өөрийн цаг дууссаныг мэдэгдсэн. */
          if (msg.type === "timeout") {
            finishLocally("timeout", true);
            void reportEnd("timeout", myUid);
            return;
          }

          if (msg.type === "resign") {
            finishLocally("resignation", true);
            void reportEnd("resignation", myUid);
          }
        };

        rtc.onClose = () => {
          if (cancelled || endedRef.current) return;
          finishLocally("disconnect", null);
          void reportEnd("disconnect", null);
        };

        await rtc.start();
      } catch (cause) {
        if (!cancelled) {
          setState("error");
          setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
        }
      }
    })();

    return () => {
      cancelled = true;
      rtcRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId]);

  const handleMove = (from: Square, to: Square) => {
    if (!room || state !== "playing") return;

    const applied = gameRef.current.move(from, to);
    if (!applied) return;

    lastMoveRef.current = { from, to };
    clock.onMove(room.color === "white" ? "w" : "b");
    forceUpdate((v) => v + 1);
    rtcRef.current?.send({ type: "move", from, to });
    checkGameOver(room.color, room.opponent?.uid ?? null);
  };

  const resign = () => {
    if (!room || state !== "playing") return;
    rtcRef.current?.send({ type: "resign" });
    finishLocally("resignation", false);
    void reportEnd("resignation", room.opponent?.uid ?? null);
  };

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-xl space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="aspect-square w-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="mx-auto max-w-md p-6">
        <ErrorNote message={error ?? t("Алдаа гарлаа.")} />
      </div>
    );
  }

  if (!room) return null;

  const game = gameRef.current;
  const myTurn = state === "playing" && (game.turn() === "w") === (room.color === "white");

  return (
    <div
      className={`mx-auto flex max-w-xl flex-col gap-2 sm:gap-4 ${
        state === "ended" ? PLAY_BOARD_RESERVE_ENDED : PLAY_BOARD_RESERVE
      }`}
    >
      <div className="surface flex items-center justify-between px-4 py-2 sm:p-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900 dark:text-white">
            {room.opponent?.displayName || t("Өрсөлдөгч")}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {state === "connecting" && t("Холбогдож байна…")}
            {state === "playing" && (myTurn ? t("Таны ээлж") : t("Өрсөлдөгчийн ээлж"))}
            {state === "ended" && t("Тоглоом дууссан")}
          </p>
        </div>
        {state === "playing" && (
          <button
            type="button"
            onClick={resign}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            <Flag className="size-3.5" aria-hidden />
            {t("Бууж өгөх")}
          </button>
        )}
      </div>

      {/* Цаг ХӨЛГИЙН ДЭЭР; утсан дээр дууссаны дараа нуугдаж, зай нь дүнгийн картад очно. */}
      <div className={state === "ended" ? "max-lg:hidden" : undefined}>
        <MatchHeader
          leftName={me.displayName || t("Та")}
          rightName={room.opponent?.displayName || t("Өрсөлдөгч")}
          /* ⚠ Зүүн цаг нь ЯМАГТ миний цаг. */
          leftMs={room.color === "white" ? clock.white : clock.black}
          rightMs={room.color === "white" ? clock.black : clock.white}
          activeSide={game.turn() === "b" ? "b" : "w"}
          myColor={room.color === "white" ? "w" : "b"}
        />
      </div>

      <div className={PLAY_BOARD_BLEED}>
        <DraughtsBoard
          framed={false}
          board={game.board()}
          orientation={room.color}
          interactive={myTurn}
          getLegalTargets={(square) => game.movesFrom(square).map((move) => move.to)}
          onMove={handleMove}
          lastMove={lastMoveRef.current}
        />
      </div>

      <div className="flex flex-col gap-2 empty:hidden sm:gap-4">
        {state === "connecting" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <GameRobot game="draughts" className="h-20 w-auto" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("Өрсөлдөгчтэй шууд холбогдож байна…")}
            </p>
          </div>
        )}

        {state === "ended" && end && !adDone && <GameOverAd onDone={() => setAdDone(true)} />}

        {state === "ended" && end && adDone && (
          <div className="surface flex flex-col items-center gap-2 p-4 text-center sm:gap-3 sm:p-6">
            {/*
              ⚠ ЯЛАЛТ үед БАЯР ХҮРГЭХ ВИДЕО (хичээл дуусгах дэлгэцтэй
              ижил `CelebrationVideo`): хөдөлгөөнтэй баяр нь ялалтыг
              «дараагийн дэлгэц» биш, ҮЙЛ ЯВДАЛ болгоно. Хоёр газарт
              ижил баяр хэрэглэх нь платформыг нэг хэлтэй болгоно.

              ⚠ ХОЖИГДОЛ, ТЭНЦЭЭ үед баяр ХЭРЭГЛЭХГҮЙ: хожигдсон
              хүүхдэд баяр хүргэх нь гутаан доромжлол шиг мэдрэгдэнэ.
              Тэр үед бодолтой дүрс (`think`) хэвээр.

              ⚠ `size-28` + дугуй хүрээ: видео нь дөрвөлжин тул хүрээгүй
              бол картын дэвсгэр дээр тэгш өнцөгт хэсэг болж харагдана.
            */}
            {end.didIWin ? (
              <div className="size-16 overflow-hidden rounded-full sm:size-28 ring-4 ring-brand-100 dark:ring-white/15">
                <CelebrationVideo className="size-full object-cover" />
              </div>
            ) : end.reason === "disconnect" ? (
              /*
                ⚠ ТАСАРСАН ҮЕД дүрс БИШ, ХОЛБООНЫ тэмдэг: өмнө нь
                бодолтой дүрс (титэмтэй) гарч байсан тул «би яллаа»
                эсвэл «би бодож байна» гэсэн ойлголт төрүүлдэг байв.
                Үнэндээ тоглолт нь ҮР ДҮНГҮЙ дууссан — тэр нь ялалт ч,
                хожигдол ч биш.

                ⚠ Дүрс сонголт: `WifiOff` нь хэлээс хамааралгүй бөгөөд
                шалтгааныг (сүлжээ) шууд хэлнэ. Өнгө нь БҮДЭГ (саарал) —
                баяр ч, сэрэмжлүүлэг ч биш, зүгээр л «болоогүй».
              */
              <span className="grid size-16 place-items-center rounded-full bg-gray-100 sm:size-24 text-gray-400 dark:bg-white/10 dark:text-gray-500">
                <WifiOff className="size-8 sm:size-10" aria-hidden />
              </span>
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
            <button
              type="button"
              onClick={() => router.push("/play/draughts")}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold sm:px-6 sm:py-2.5 sm:text-base text-white hover:bg-brand-600"
            >
              {t("Дахин тоглох")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ⚠ ДААМД «мад» гэж БАЙХГҮЙ — шатрын «Мад!» бичвэрийг хуулбарлахгүй.
 *
 * ⚠ НҮҮДЭЛГҮЙ БОЛОХ нь ХОЖИГДОЛ БИШ, ТЭНЦЭЭ (`engine.ts`-ийн `winner()`).
 * Тиймээс энд хожлын мөр гарч ирэх ЦОРЫН ГАНЦ шалтгаан нь өрсөлдөгчийн
 * БҮХ дүрс идэгдсэн явдал — бичвэр нь яг түүнийг хэлэх ёстой. Урьд нь
 * «Өрсөлдөгч нүүх боломжгүй — Та яллаа!» гэдэг байсан нь одоо худал.
 */
function endMessage(end: EndInfo): string {
  if (end.didIWin === null) {
    return end.reason === "disconnect" ? t("Өрсөлдөгч тасарлаа") : t("Тэнцээ");
  }
  if (end.didIWin) {
    if (end.reason === "timeout") return t("Өрсөлдөгчийн цаг дууслаа — Та яллаа!");
    return end.reason === "resignation"
      ? t("Өрсөлдөгч бууж өгсөн — Та яллаа!")
      : t("Өрсөлдөгчийн бүх дүрсийг идлээ — Та яллаа!");
  }
  if (end.reason === "timeout") return t("Таны цаг дууслаа");
  return end.reason === "resignation" ? t("Та бууж өглөө") : t("Бүх дүрсээ алдлаа — Та хожигдлоо");
}
