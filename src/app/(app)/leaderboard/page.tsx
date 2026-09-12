"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, Minus, Trophy, Users } from "lucide-react";

import { useApiData } from "@/hooks/useApiData";
import { ErrorNote, EmptyState, Skeleton } from "@/components/tactiq/ui";
import {
  DEMOTE_COUNT,
  LEAGUE_TIERS,
  PROMOTE_COUNT,
  outcomeForRank,
  tierInfo,
} from "@/lib/tactiq/league";

import { readableBg, shade } from "@/lib/tactiq/theme";

import type { LeagueOutcome } from "@/lib/tactiq/league";

/**
 * Тэргүүлэгчид — долоо хоногийн лиг ба найзуудын жагсаалт.
 *
 * ⚠ Хоёр таб нь ХОЁР ӨӨР сэдэл: лиг нь танихгүй хүмүүстэй өрсөлдөх
 * (шатлал дээшлэх), найзууд нь танил хүнтэй харьцуулах. Нэг жагсаалт
 * болгож нийлүүлбэл аль аль нь суларна — Duolingo ч тусад нь барьдаг.
 */

type LeagueStanding = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  xp: number;
  rank: number;
  isMe: boolean;
};

type LeagueOption = {
  key: string;
  title: string;
  tier: number;
  joined: boolean;
};

type LeagueResponse = {
  leagues: LeagueOption[];
  leagueKey: string;
  tier: number;
  weekKey: string;
  size: number;
  standings: LeagueStanding[];
  lastOutcome: LeagueOutcome | null;
  joined: boolean;
  cohortSize: number;
  promoteCount: number;
  demoteCount: number;
};

type Friend = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  xp: number;
  level: number;
  streakDays: number;
  rating: number;
  weeklyXp: number;
};

type FriendsResponse = { friends: Friend[] };

type Tab = "league" | "friends";

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("league");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Тэргүүлэгчид</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Долоо хоног бүр Даваа гарагт шинэ тэмцээн эхэлнэ. Лиг нь сургууль
          тус бүрд тусдаа — Mind, Codely, ITkids…
        </p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "league"} onClick={() => setTab("league")} Icon={Trophy}>
          Лиг
        </TabButton>
        <TabButton active={tab === "friends"} onClick={() => setTab("friends")} Icon={Users}>
          Найзууд
        </TabButton>
      </div>

      {tab === "league" ? <LeagueTab /> : <FriendsTab />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
        active
          ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
      }`}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </button>
  );
}

function LeagueTab() {
  /*
   * `null` = "сервер шийдээгүй байна". Эхний ачаалалтад аль лиг нээхийг
   * СЕРВЕР сонгодог (хамгийн өндөр шаттай нь) тул клиент талд анхдагч
   * таамаглахгүй — таамаглавал сонголт хоёр удаа үсэрнэ.
   */
  const [league, setLeague] = useState<string | null>(null);

  const { data, error, loading, reload } = useApiData<LeagueResponse>(
    league ? `/api/league?league=${encodeURIComponent(league)}` : "/api/league"
  );

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorNote message={error} onRetry={() => void reload()} />;
  if (!data) return null;

  // Огт хичээл эхлээгүй — лиг байхгүй.
  if (data.leagues.length === 0) {
    return (
      <EmptyState
        title="Лиг хараахан байхгүй"
        description="Хичээл эхлүүлмэгц тэр курсийн сургуулийн (Mind, Codely…) лигт орно."
      />
    );
  }

  const tier = tierInfo(data.tier);

  return (
    <div className="space-y-4">
      {data.lastOutcome && <OutcomeBanner outcome={data.lastOutcome} tier={data.tier} />}

      {/*
        ⚠ СУРГУУЛЬ СОНГОГЧ. Лиг сургууль тус бүрд тусдаа тул сурагч Mind-д
        Алт, Codely-д Хүрэл лигт зэрэг байж болно.
      */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {data.leagues.map((option) => {
          const active = option.key === data.leagueKey;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setLeague(option.key)}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/25"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
              }`}
            >
              {/*
                Шатны өнгө — аль лигт хаана байгаагаа сонголтоос шууд харна.
                ⚠ Идэвхтэй товч дээр цагаан ХҮРЭЭ нэмнэ: брэндийн хөх дэвсгэр
                дээр хөх (Индранил) цэг бараг уусаж алга болно.
              */}
              <span
                className={`size-2.5 shrink-0 rounded-full ${active ? "ring-2 ring-white/70" : ""}`}
                style={{ backgroundColor: tierInfo(option.tier).color }}
                aria-hidden
              />
              {option.title}
            </button>
          );
        })}
      </div>

      <div className="surface p-5 text-center">
        {/*
          ⚠ Хавтгай дүүргэлт биш ГРАДИЕНТ + өнгөт сүүлдэр. Хавтгай тойрог
          нь ялангуяа саарал шатанд (Мөнгө) бүдэг, амьгүй харагддаг.
          Сүүдэр нь тухайн шатны өнгөтэй тул медаль гэрэлтэж буй мэдрэмж
          өгнө — `shade()`-ийг эндээс ч ашиглана.
        */}
        <span
          className="mx-auto grid size-20 place-items-center rounded-full text-white"
          style={{
            // Дүрс ҮРГЭЛЖ цагаан — дэвсгэрийг нь уншигдахуйц болгоно
            // (`readableBg`, `lib/tactiq/theme.ts`).
            background: `linear-gradient(160deg, ${readableBg(tier.color, 3)}, ${shade(readableBg(tier.color, 3), -40)})`,
            // Сүүлдэр нь ЖИНХЭНЭ өнгөөр — тэнд уншигдац хамаарахгүй тул
            // шатны өнгө бүрэн тодоор мэдрэгдэнэ.
            boxShadow: `0 8px 24px -6px ${tier.color}80`,
          }}
        >
          <Trophy className="size-9" aria-hidden />
        </span>
        <p className="mt-3 text-lg font-extrabold text-gray-900 dark:text-white">
          {tier.label} лиг
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {data.joined
            ? `${data.size} тоглогч · дээд ${data.promoteCount} дээшилнэ · доод ${data.demoteCount} буурна`
            : `Нэг бүлэгт ${data.cohortSize} хүртэл тоглогч`}
        </p>

        <TierLadder current={data.tier} />
      </div>

      {/*
        ⚠ Тэмцээнд ОРООГҮЙ үед өөр хэн нэгний бүлгийг үзүүлэхгүй. Сурагч
        хичээл эхлүүлэх хүртэл бүлэгт нэгддэггүй (`lib/api/league.ts`) —
        танихгүй хүмүүсийн жагсаалт харуулбал өөрийгөө хайж олохгүй,
        яагаад тэнд байхгүйгээ ойлгохгүй.
      */}
      {data.joined ? (
        <ul className="surface divide-y divide-gray-100 p-0 dark:divide-white/5">
          {data.standings.map((row) => (
            <StandingRow
              key={row.uid}
              row={row}
              zone={outcomeForRank(row.rank, data.size, data.tier)}
            />
          ))}
        </ul>
      ) : (
        <NotJoinedNote />
      )}
    </div>
  );
}

/**
 * Энэ долоо хоногт хичээл эхлүүлээгүй.
 *
 * ⚠ Энэ нь ШИЙТГЭЛ БИШ гэдгийг тодорхой хэлнэ. Долоо хоног өнжих нь шат
 * бууруулдаггүй — сурагч бүлэгт огт нэгддэггүй тул дүгнэгдэх мөр байхгүй.
 * Үүнийг хэлэхгүй бол сурагч "хоцорлоо, буучихлаа" гэж айна.
 */
function NotJoinedNote() {
  return (
    <div className="surface flex flex-col items-center gap-2 p-6 text-center">
      <p className="font-bold text-gray-900 dark:text-white">
        Энэ долоо хоногт хараахан ороогүй
      </p>
      <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
        Энэ сургуулийн аль нэг курсээр хичээл эхлүүлмэгц шинэ тэмцээнд орно.
        Өнжсөн долоо хоног шатыг бууруулахгүй.
      </p>
      <Link href="/learn" className="btn-primary mt-1 px-5 py-2.5 text-sm">
        Хичээл эхлүүлэх
      </Link>
    </div>
  );
}

function OutcomeBanner({ outcome, tier }: { outcome: LeagueOutcome; tier: number }) {
  const copy: Record<LeagueOutcome, { text: string; className: string }> = {
    promoted: {
      text: `Баяр хүргэе! Та ${tierInfo(tier).label} лигт дэвшлээ 🎉`,
      className:
        "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200",
    },
    demoted: {
      text: `Өнгөрсөн долоо хоногт ${tierInfo(tier).label} лиг рүү буулаа. Энэ долоо хоногт эргэж дэвшье!`,
      className: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200",
    },
    stayed: {
      text: "Өнгөрсөн долоо хоногт лигээ хадгаллаа. Энэ долоо хоногт дээшилье!",
      className: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300",
    },
  };

  const { text, className } = copy[outcome];

  return <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${className}`}>{text}</div>;
}

function StandingRow({ row, zone }: { row: LeagueStanding; zone: LeagueOutcome }) {
  const initial = (row.displayName || "?").charAt(0).toUpperCase();

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${
        row.isMe ? "bg-brand-50/70 dark:bg-brand-500/10" : ""
      }`}
    >
      <span className="num w-7 shrink-0 text-center text-sm font-extrabold text-gray-400">
        {row.rank}
      </span>

      <ZoneMark zone={zone} />

      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
        {initial}
      </span>

      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          row.isMe
            ? "font-extrabold text-brand-700 dark:text-brand-300"
            : "font-medium text-gray-900 dark:text-white"
        }`}
      >
        {row.displayName}
        {row.isMe && " (та)"}
      </span>

      <span className="num shrink-0 text-sm font-bold text-gray-700 dark:text-gray-300">
        {row.xp} XP
      </span>
    </li>
  );
}

/** Дэвших / буух бүсийн сум — өнгө ганцаараа хангалтгүй (өнгө ялгах бэрхшээл). */
function ZoneMark({ zone }: { zone: LeagueOutcome }) {
  if (zone === "promoted") {
    return (
      <ChevronUp className="size-4 shrink-0 text-emerald-500" aria-label="Дэвших бүс" />
    );
  }
  if (zone === "demoted") {
    return <ChevronDown className="size-4 shrink-0 text-rose-500" aria-label="Буух бүс" />;
  }
  return <Minus className="size-4 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />;
}

function FriendsTab() {
  const { data, error, loading, reload } = useApiData<FriendsResponse>("/api/friends");

  if (loading) return <ListSkeleton />;
  if (error) return <ErrorNote message={error} onRetry={() => void reload()} />;

  const friends = data?.friends ?? [];

  if (friends.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-10" aria-hidden />}
        title="Хараахан найзгүй байна"
        description="Найзаа нэмбэл түүнтэй долоо хоногийн оноогоо харьцуулж, хамтын даалгавар авах боломжтой."
      />
    );
  }

  return (
    <ul className="surface divide-y divide-gray-100 p-0 dark:divide-white/5">
      {friends.map((friend, index) => (
        <li key={friend.uid} className="flex items-center gap-3 px-4 py-3">
          <span className="num w-7 shrink-0 text-center text-sm font-extrabold text-gray-400">
            {index + 1}
          </span>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {(friend.displayName || "?").charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
              {friend.displayName}
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Түвшин {friend.level} · {friend.rating} үнэлгээ
            </span>
          </span>
          <span className="num shrink-0 text-sm font-bold text-gray-700 dark:text-gray-300">
            {friend.weeklyXp} XP
          </span>
        </li>
      ))}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

/**
 * Лигийн ШАТЛАЛ — өнгө, нэр, тэмдгээр.
 *
 * ⚠ Урьд нь энэ нь ӨНГӨГҮЙ ЦЭГИЙН эгнээ байсан: авaaгүй шатуудыг саарлаар
 * зурдаг байсан тул доод шатанд байгаа хүн НАЙМАН ижил
 * саарал цэг хардаг — эгнээ нь ямар ч мэдээлэл дамжуулахгүй байв.
 *
 * Одоо шат бүрийн ӨНГӨ ҮРГЭЛЖ харагдана: хүрсэн нь дүүрэн, хүрээгүй нь
 * ХООСОН боловч тухайн өнгийн хүрээтэй. Нэр нь доор нь бичигдэнэ — өнгө
 * дангаараа хангалттай дохио БИШ (өнгө ялгахад бэрхшээлтэй хэрэглэгч).
 */
function TierLadder({ current }: { current: number }) {
  return (
    <div className="no-scrollbar mt-4 flex justify-start gap-2 overflow-x-auto pb-1 sm:justify-center">
      {LEAGUE_TIERS.map((step, index) => {
        const reached = index <= current;
        const isCurrent = index === current;
        const color = readableBg(step.color, 3);

        return (
          <div
            key={step.key}
            className="flex w-14 shrink-0 flex-col items-center gap-1"
          >
            <span
              className={`grid place-items-center rounded-full transition-all ${
                isCurrent ? "size-11" : "size-9"
              }`}
              style={
                reached
                  ? {
                      background: `linear-gradient(160deg, ${color}, ${shade(color, -35)})`,
                      color: "#ffffff",
                      boxShadow: isCurrent ? `0 0 0 4px ${step.color}40` : undefined,
                    }
                  : {
                      // Хоосон боловч ӨНГӨТ хүрээтэй — "энэ бол Алт лиг,
                      // хараахан аваагүй" гэдэг нэг харцаар ойлгогдоно.
                      border: `2px dashed ${step.color}`,
                      color: step.color,
                    }
              }
            >
              {reached ? (
                <Trophy className={isCurrent ? "size-5" : "size-4"} aria-hidden />
              ) : (
                <Lock className="size-3.5" aria-hidden />
              )}
            </span>

            <span
              className={`w-full truncate text-center text-[10px] leading-tight ${
                isCurrent
                  ? "font-extrabold text-gray-900 dark:text-white"
                  : reached
                    ? "font-semibold text-gray-500 dark:text-gray-400"
                    : "font-medium text-gray-400 dark:text-gray-500"
              }`}
              title={step.label}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
