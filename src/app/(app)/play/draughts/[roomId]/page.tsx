"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Flag } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { ChessWebRTC } from "@/lib/chess/webrtc";
import { Draughts } from "@/lib/draughts/engine";
import { DraughtsBoard } from "@/components/draughts/DraughtsBoard";
import { MatchHeader } from "@/components/chess/MatchHeader";
import { GameOverAd } from "@/components/tactiq/GameOverAd";
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
  reason: "checkmate" | "resignation" | "draw" | "disconnect";
  didIWin: boolean | null; // null = тэнцээ
};

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

  const gameRef = useRef(new Draughts());
  const rtcRef = useRef<ChessWebRTC | null>(null);
  const lastMoveRef = useRef<{ from: Square; to: Square } | null>(null);
  const endedRef = useRef(false);

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
            forceUpdate((v) => v + 1);
            checkGameOver(data.color, data.opponent?.uid ?? null);
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
    <div className="mx-auto max-w-xl space-y-3">
      <div className="surface flex items-center justify-between p-4">
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

      <MatchHeader
        leftName={me.displayName || t("Та")}
        rightName={room.opponent?.displayName || t("Өрсөлдөгч")}
      />

      <DraughtsBoard
        board={game.board()}
        orientation={room.color}
        interactive={myTurn}
        getLegalTargets={(square) => game.movesFrom(square).map((move) => move.to)}
        onMove={handleMove}
        lastMove={lastMoveRef.current}
      />

      {state === "connecting" && (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <Mascot mood="think" className="size-20" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("Өрсөлдөгчтэй шууд холбогдож байна…")}
          </p>
        </div>
      )}

      {state === "ended" && end && !adDone && <GameOverAd onDone={() => setAdDone(true)} />}

      {state === "ended" && end && adDone && (
        <div className="surface flex flex-col items-center gap-3 p-6 text-center">
          <Mascot mood={end.didIWin ? "cheer" : "think"} className="size-24" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{endMessage(end)}</h2>
          <button
            type="button"
            onClick={() => router.push("/play/draughts")}
            className="rounded-xl bg-brand-500 px-6 py-2.5 font-semibold text-white hover:bg-brand-600"
          >
            {t("Дахин тоглох")}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * ⚠ ДААМД «мад» гэж БАЙХГҮЙ: нүүх боломжгүй болсон тал хожигдоно.
 * Тиймээс шатрын «Мад!» гэсэн бичвэрийг хуулбарлахгүй.
 */
function endMessage(end: EndInfo): string {
  if (end.didIWin === null) {
    return end.reason === "disconnect" ? t("Өрсөлдөгч тасарлаа") : t("Тэнцээ");
  }
  if (end.didIWin) {
    return end.reason === "resignation"
      ? t("Өрсөлдөгч бууж өгсөн — Та яллаа!")
      : t("Өрсөлдөгч нүүх боломжгүй — Та яллаа!");
  }
  return end.reason === "resignation" ? t("Та бууж өглөө") : t("Нүүх боломж дууслаа — Та хожигдлоо");
}
