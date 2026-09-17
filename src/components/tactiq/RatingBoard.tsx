"use client";

import Image from "next/image";
import { TrendingUp } from "lucide-react";

import { useApiData } from "@/hooks/useApiData";
import { useCurrentUser } from "@/context/UserContext";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { PROVISIONAL_GAMES } from "@/lib/tactiq/rating";
import { t } from "@/lib/i18n/t";

/**
 * ЧАНСААНЫ ЖАГСААЛТ — тоглолтын ХҮЧний эрэмбэ.
 *
 * ⚠ ЛИГЭЭС (долоо хоногийн XP) БҮРЭН ТУСДАА: лиг нь ИДЭВХИЙГ хэмждэг
 * (хичээл, дасгал), чансаа нь ХҮЧИЙГ (тоглолтын үр дүн). 600 хичээл
 * хийсэн хүүхэд 1400 чансаатай байж болно — тэр нь эвдрэл БИШ, харин
 * систем зөв ажиллаж байгаагийн шинж (`docs/rating-system.md` §10).
 *
 * ⚠ PROVISIONAL тоглогч ЖАГСААЛТАД БАЙХГҮЙ (10 тоглолтоос доош). Тэр
 * хүнд өөрийн тоог «1520?» гэж асуултын тэмдэгтэй харуулна — тоо нь
 * баримт биш, ТААМАГ гэдгийг хэлэх ёстой.
 */

type Row = {
  uid: string;
  displayName: string;
  photoUrl: string;
  rating: number;
  ratingGames: number;
  chessWins: number;
  chessLosses: number;
  chessDraws: number;
  draughtsWins: number;
  draughtsLosses: number;
  draughtsDraws: number;
};

type Response = {
  top: Row[];
  me: { rating: number | null; games: number; provisional: boolean; rank: number | null };
  /** Шатар, даам хамтдаа эсэх — тусгаарлалт хийгдэх хүртэл `true`. */
  combined: boolean;
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

const rankOf = (rating: number) => RANKS.find((rank) => rating >= rank.min) ?? RANKS[RANKS.length - 1];

export function RatingBoard() {
  const me = useCurrentUser();
  const { data, loading, error, reload } = useApiData<Response>("/api/ratings/leaderboard");

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (error) return <ErrorNote message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  const myRank = data.me.rating === null ? null : rankOf(data.me.rating);

  return (
    <div className="space-y-3">
      {/* ӨӨРИЙН ЧАНСАА — жагсаалтаас ӨМНӨ, хамгийн чухал тоо */}
      <div className="surface flex items-center gap-4 p-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-500 text-white">
          <TrendingUp className="size-6" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {t("Таны чансаа")}
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
              : `${data.me.games} ${t("тоглолт")}${data.me.rank ? ` · ${data.me.rank}-рт` : ""}`}
          </p>
        </div>
      </div>

      {/*
        ⚠ ХАМТДАА гэдгийг ХЭЛНЭ: `users.rating` нь шатар, даамын
        тоглолтын хольцоос бүрддэг. «Шатрын чансаа» гэж харуулбал
        хэрэглэгч буруу дүгнэлт хийнэ (`docs/rating-system.md` §0.2).
      */}
      {data.combined && (
        <p className="text-[11px] leading-snug text-gray-400">
          {t("Одоогоор шатар, даамын чансаа хамтдаа тооцогдож байна. Тусгаарлалт хийгдэж байна.")}
        </p>
      )}

      {data.top.length === 0 ? (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
          {t("Чансаа тогтоосон тоглогч хараахан алга.")}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {data.top.map((row, index) => {
            const rank = rankOf(row.rating);
            const wins = row.chessWins + row.draughtsWins;
            const losses = row.chessLosses + row.draughtsLosses;
            const draws = row.chessDraws + row.draughtsDraws;
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
                    {wins}
                    {t("Я")}/{draws}
                    {t("Т")}/{losses}
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
