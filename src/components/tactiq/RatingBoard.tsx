"use client";

import { useState } from "react";
import Image from "next/image";

import { useApiData } from "@/hooks/useApiData";
import { useCurrentUser } from "@/context/UserContext";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { PROVISIONAL_GAMES } from "@/lib/tactiq/rating";
import { gameTheme } from "@/lib/tactiq/gameTheme";
import { t } from "@/lib/i18n/t";

import type { GameKey } from "@/lib/tactiq/gameTheme";

/**
 * ЧАНСААНЫ ЖАГСААЛТ — тоглолтын ХҮЧний эрэмбэ.
 *
 * ⚠ ШАТАР, ДААМ ТУСДАА: хоёр өөр эрдэм тул нэг тоо болгож нийлүүлэхгүй
 * (`docs/rating-system.md` §0.2). Хэрэглэгч таб сольж хоёуланг харна.
 *
 * ⚠ ЛИГЭЭС (долоо хоногийн XP) БҮРЭН ТУСДАА: лиг нь ИДЭВХИЙГ хэмждэг
 * (хичээл, дасгал), чансаа нь ХҮЧИЙГ (тоглолтын үр дүн). 600 хичээл
 * хийсэн хүүхэд 1400 чансаатай байж болно — тэр нь эвдрэл БИШ, харин
 * систем зөв ажиллаж байгаагийн шинж (§10).
 *
 * ⚠ ХОЖИГДОЛ ОНОО ХАСНА: чансаа нь дээш доош ХОЁУЛАА хөдөлдөг учраас
 * тоглогч яг өөрийн байран дээр тогтоно. Түүнийг UI нь тодорхой хэлэх
 * ёстой — «хожвол л нэмэгдэнэ» гэж ойлговол хожигдсон хүн системийг
 * эвдэрсэн гэж бодно.
 */

type Row = {
  uid: string;
  displayName: string;
  photoUrl: string;
  rating: number;
  games: number;
  wins: number;
  draws: number;
  losses: number;
};

type Response = {
  game: GameKey;
  top: Row[];
  me: {
    rating: number | null;
    games: number;
    peak: number | null;
    wins: number;
    draws: number;
    losses: number;
    provisional: boolean;
    rank: number | null;
  };
};

/**
 * ЗЭРЭГЛЭЛ — чансааны хүрээ.
 *
 * ⚠ Олон улсын цолыг (Grandmaster гэх мэт) ХУУЛБАРЛААГҮЙ: хүүхдэд
 * тэр нь худал амлалт болно (`docs/rating-system.md` §9).
 */
const RANKS = [
  { min: 2200, label: "Чансаат", color: "text-violet-600 dark:text-violet-300" },
  { min: 2000, label: "Их мастер", color: "text-indigo-600 dark:text-indigo-300" },
  { min: 1800, label: "Мастер", color: "text-sky-600 dark:text-sky-300" },
  { min: 1600, label: "Сайн тоглогч", color: "text-emerald-600 dark:text-emerald-300" },
  { min: 1400, label: "Тоглогч", color: "text-amber-600 dark:text-amber-300" },
  { min: 1200, label: "Дасгалжигч", color: "text-orange-600 dark:text-orange-300" },
  { min: 0, label: "Шинэхэн", color: "text-gray-500 dark:text-gray-400" },
];

const rankOf = (rating: number) =>
  RANKS.find((rank) => rating >= rank.min) ?? RANKS[RANKS.length - 1];

const GAMES: GameKey[] = ["chess", "checkers"];

export function RatingBoard() {
  const me = useCurrentUser();
  const [game, setGame] = useState<GameKey>("chess");
  const { data, loading, error, reload } = useApiData<Response>(
    `/api/ratings/leaderboard?game=${game}`
  );

  const theme = gameTheme(game);
  const { Icon } = theme;

  const tabs = (
    <div className="flex gap-2">
      {GAMES.map((key) => {
        const other = gameTheme(key);
        const OtherIcon = other.Icon;
        const active = key === game;

        return (
          <button
            key={key}
            type="button"
            onClick={() => setGame(key)}
            aria-pressed={active}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition ${
              active
                ? `${other.tile} shadow-sm`
                : "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            <OtherIcon className="size-4" aria-hidden />
            {t(other.label)}
          </button>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {tabs}
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        {tabs}
        <ErrorNote message={error} onRetry={() => void reload()} />
      </div>
    );
  }

  if (!data) return null;

  const myRank = data.me.rating === null ? null : rankOf(data.me.rating);

  return (
    <div className="space-y-3">
      {tabs}

      {/* ӨӨРИЙН ЧАНСАА — жагсаалтаас ӨМНӨ, хамгийн чухал тоо */}
      <div className={`surface flex items-center gap-4 border-l-4 p-4 ${theme.border}`}>
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${theme.tile}`}>
          <Icon className="size-6" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {`${t(theme.label)} — ${t("таны чансаа")}`}
          </p>
          <p className="flex items-baseline gap-2">
            <span className="num text-2xl font-extrabold text-gray-900 dark:text-white">
              {data.me.rating ?? "—"}
              {/*
                ⚠ АСУУЛТЫН ТЭМДЭГ нь provisional-ийг хэлнэ: тоо нь
                баримт биш, таамаг гэдгийг хэрэглэгч мэдэх ёстой.
              */}
              {data.me.provisional && data.me.rating !== null && (
                <span className="text-lg text-gray-400">?</span>
              )}
            </span>
            {myRank && !data.me.provisional && (
              <span className={`text-sm font-bold ${myRank.color}`}>{myRank.label}</span>
            )}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {data.me.provisional
              ? `${t("Тодорхойлох тоглолт")}: ${data.me.games}/${PROVISIONAL_GAMES}`
              : `${data.me.wins}${t("Я")}/${data.me.draws}${t("Т")}/${data.me.losses}${t("Х")}${
                  data.me.rank ? ` · ${data.me.rank}-рт` : ""
                }`}
          </p>
        </div>
      </div>

      {/*
        ⚠ ХОЁР ЗҮЙЛИЙГ ИЛ ХЭЛНЭ: (1) чансаа ЗӨВХӨН чансаа тогтоох
        тэмцээнээр өрнөнө, (2) хожигдвол оноо ХАСАГДАНА. Хэлэхгүй бол
        «найзтайгаа тоглоод чансаа өсөхгүй байна» гэсэн гомдол, «оноо
        хасагдсан нь алдаа» гэсэн дүгнэлт хоёулаа гарна.
      */}
      <p className="text-[11px] leading-snug text-gray-400">
        {t(
          "Чансаа зөвхөн «Чансаа тогтоох» тэмцээнээр өрнөнө. Хожвол нэмэгдэж, хожигдвол хасагдана — ингэж тоглогч бүр өөрийн байран дээр тогтоно. Ердийн тоглолт, ботын дадлага чансааг хөндөхгүй."
        )}
      </p>

      {data.top.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
          {`${t(theme.label)} — ${t("чансаа тогтоосон тоглогч хараахан алга.")}`}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {data.top.map((row, index) => {
            const rank = rankOf(row.rating);
            const isMe = row.uid === me.uid;

            return (
              <li
                key={row.uid}
                className={`flex items-center gap-3 rounded-xl p-2.5 ${
                  isMe
                    ? "bg-brand-50 ring-1 ring-brand-300 dark:bg-brand-500/15 dark:ring-brand-500/40"
                    : "bg-gray-50 dark:bg-white/5"
                }`}
              >
                <span className="num w-7 shrink-0 text-center text-sm font-extrabold tabular-nums text-gray-500 dark:text-gray-400">
                  {index + 1}
                </span>

                {row.photoUrl ? (
                  <Image
                    src={row.photoUrl}
                    alt=""
                    aria-hidden
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gray-200 text-xs font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                    {(row.displayName || "?").charAt(0).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {row.displayName || t("Тоглогч")}
                  </p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    <span className={`font-bold ${rank.color}`}>{rank.label}</span>
                    {" · "}
                    {row.wins}
                    {t("Я")}/{row.draws}
                    {t("Т")}/{row.losses}
                    {t("Х")}
                  </p>
                </div>

                <span className="num shrink-0 text-base font-extrabold tabular-nums text-gray-900 dark:text-white">
                  {row.rating}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
