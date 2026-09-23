"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, Minus, Trophy, Users } from "lucide-react";

import { useCurrentUser } from "@/context/UserContext";
import { useApiData } from "@/hooks/useApiData";
import { ErrorNote, EmptyState, Skeleton } from "@/components/tactiq/ui";
import {
  DEMOTE_COUNT,
  LEAGUE_TIERS,
  PROMOTE_COUNT,
  outcomeForRank,
  tierInfo,
} from "@/lib/tactiq/league";


import type { LeagueOutcome } from "@/lib/tactiq/league";
import { t } from "@/lib/i18n/t";

/**
 * Тэргүүлэгчид — долоо хоногийн лиг ба найзуудын жагсаалт.
 *
 * ⚠ Хоёр таб нь ХОЁР ӨӨР сэдэл: лиг нь танихгүй хүмүүстэй өрсөлдөх
 * (шатлал дээшлэх), найзууд нь танил хүнтэй харьцуулах. Нэг жагсаалт
 * болгож нийлүүлбэл аль аль нь суларна — Duolingo ч тусад нь барьдаг.
 */

/**
 * ЛИГИЙН ДҮРСНҮҮДИЙН ХАВТАС.
 *
 * ⚠ ЗУРГИЙГ ЗАССАН БҮРД ЭНЭ ДУГААРЫГ ӨСГӨНӨ (`v2` → `v3`) БА файлуудыг
 * шинэ хавтас руу зөөнө. Service worker нь `/images/**`-ийг CacheFirst-ээр
 * 30 хоног барьдаг (`next.config.ts`) тул ИЖИЛ нэрээр дарж бичихэд
 * хэрэглэгч хуучин зургаа үзсээр байна — засвар нь хүрэхгүй.
 */
const ART = "/images/league/v2";

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
  /** Жагсаалт нь ХАРАХ төлөвт эсэх (би тэр бүлэгт байхгүй). */
  preview: boolean;
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("Тэргүүлэгчид")}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("Долоо хоног бүр Даваа гарагт шинэ тэмцээн эхэлнэ. Бүх сурагч НЭГ лигт өрсөлдөнө.")}</p>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "league"} onClick={() => setTab("league")} Icon={Trophy}>{t("Лиг")}</TabButton>
        <TabButton active={tab === "friends"} onClick={() => setTab("friends")} Icon={Users}>{t("Найзууд")}</TabButton>
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
  const user = useCurrentUser();
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

  /*
   * ⚠ Одоо сервер нь ХАРАХ лиг санал болгодог тул энд хүрэх нь ХОВОР
   * (систем дээр нэг ч бүлэг үүсээгүй үед л). Тиймээс текст нь
   * «лиг байхгүй» гэдгийг ҮНЭНЭЭР хэлнэ.
   */
  if (data.leagues.length === 0) {
    return (
      <EmptyState
        title={t("Лиг хараахан байхгүй")}
        description={t("Хичээл эхлүүлмэгц тэр курсийн сургуулийн (Mind, Codely…) лигт орно.")}
      />
    );
  }

  const tier = tierInfo(data.tier);
  /*
   * ⚠ Байрыг ЖАГСААЛТААС уншина, тусад нь тоолохгүй: сервер нь байрыг
   * аль хэдийн тооцоод илгээсэн бөгөөд клиент дээр дахин эрэмбэлбэл
   * тэнцсэн оноотой хүмүүс дээр хоёр тал зөрнө.
   */
  const myRank = data.standings.find((row) => row.isMe)?.rank ?? null;

  return (
    <div className="space-y-4">
      {data.lastOutcome && <OutcomeBanner outcome={data.lastOutcome} tier={data.tier} />}

      {/*
        ⚠ ЛИГ СОНГОГЧ — зөвхөн НЭГЭЭС ОЛОН лиг байвал.

        Лиг одоо БҮГДЭД НЭГ (`lib/tactiq/league.ts`-ийн `GLOBAL_LEAGUE`)
        тул энэ жагсаалтад ганц зүйл л ирнэ. Ганц сонголттой «сонгогч» нь
        юу ч сонгуулахгүй, зөвхөн зай эзэлж, дарж болох мэт харагдана.

        ⚠ Гэсэн ч кодыг нь ХАССАНГҮЙ: хожим лигийг дахин хуваах (насны
        бүлгээр гэх мэт) шаардлага гарвал сонгогч өөрөө эргэж ирнэ.
      */}
      {data.leagues.length > 1 && (
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
      )}

      {/*
        ЛИГИЙН HERO — ягаан налуу дэвсгэр дээр гурван хэсэг: ишлэл,
        медаль, статистик.

        ⚠ Дэвсгэр нь ГЭРЭЛТ/ХАРАНХУЙ хоёрт ИЖИЛ: медаль, лаврын мөчир нь
        алтан өнгөтэй бөгөөд цайвар дэвсгэр дээр уусдаг. Тиймээс энэ карт
        нь сэдвээс хамаарахгүй харанхуй хэвээр.
      */}
      <div className="surface overflow-hidden p-0">
        <div className="relative bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-5 py-7 text-white">
          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/*
              ⚠ Ишлэл нь ЖИЖИГ ДЭЛГЭЦЭНД НУУГДАНА: гурван баганыг нэг
              баганад хураахад ишлэл нь медалийг доош түлхэж, гол зүйл
              (аль лигт байгаа) нь эхний дэлгэцээс гарна.
            */}
            <figure className="hidden lg:block">
              <span className="block text-3xl leading-none text-white/40" aria-hidden>
                &ldquo;
              </span>
              <blockquote className="mt-1 max-w-[16rem] text-sm leading-relaxed text-white/85">{t("Өнөөдрийн жижиг амжилт, маргаашийн их боломж юм.")}</blockquote>
            </figure>

            <div className="text-center">
              {/*
                ⚠ ШАТ БҮРД ӨӨРИЙН өнгөтэй — макет дээр hero нь үргэлж
                алтан боловч сурагч «Мөнгө лиг» гэж уншаад АЛТАН медаль
                харвал аль нь үнэн бэ гэж эргэлзэнэ. Өнгө нь шатны
                хамгийн хүчтэй дохио тул түүнийг зөрүүлж болохгүй.

                ⚠ Эдгээр нь ШАТНЫ жижиг медалийг томсгосон зураг БИШ:
                тэр нь ердөө 68px өндөртэй тул 190px хүртэл томсгоход
                бүдгэрнэ. Лаврын мөчиртэй эх зургаас өнгийг нь хувиргаж
                үүсгэсэн (scratchpad/hero_tiers.py).

                ⚠ `priority`: хуудсын гол дүрс, хожимдвол хоосон байр үлдэнэ.
              */}
              <Image
                src={`${ART}/hero-${tier.key}.png`}
                alt=""
                aria-hidden
                width={269}
                height={189}
                priority
                className="mx-auto h-auto w-[190px] drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
              />
              <p className="mt-3 text-2xl font-extrabold">{tier.label} лиг</p>
              <p className="mt-1 text-xs text-white/75">
                {data.joined
                  ? `${data.size} тоглогч · дээд ${data.promoteCount} дээшилнэ · доод ${data.demoteCount} буурна`
                  : `Нэг бүлэгт ${data.cohortSize} хүртэл тоглогч`}
              </p>
            </div>

            <div className="lg:justify-self-end">
              <dl className="grid grid-cols-3 gap-1 rounded-2xl bg-white/10 p-3 text-center backdrop-blur-sm">
                <HeroStat icon="⭐" value={user.xp.toLocaleString("mn-MN")} label={t("Нийт оноо")} />
                <HeroStat icon="🔥" value={String(user.streakDays)} label={t("Дасгалын өдөр")} />
                <HeroStat
                  icon="🛡"
                  /* ⚠ Бүлэгт ороогүй бол байр ГЭЖ БАЙХГҮЙ — 0 гэж бичвэл
                     «сүүлийн байр» мэт худал уншигдана. */
                  value={myRank ? `${myRank}` : "—"}
                  label={t("Байр")}
                />
              </dl>
            </div>
          </div>
        </div>

        <TierLadder current={data.tier} />
      </div>

      {/*
        ⚠ ЛИГТ ОРООГҮЙ Ч ЭРЭМБЭ ХАРАГДАНА. Урьд нь ороогүй хүнд зөвхөн
        «хичээл эхлүүл» гэсэн карт гардаг тул лиг нь ХООСОН, эсвэл
        байхгүй зүйл шиг мэдрэгддэг байв. Одоо бодит бүлгийн эрэмбийг
        харуулна — «хэр XP шаардлагатай, хэн тэргүүлж байна» гэдгийг
        ОРОХООСОО ӨМНӨ харах нь өөрөө хөшүүрэг.

        ⚠ Гэхдээ «БИ ЭНД БАЙХГҮЙ» гэдгийг ИЛ ХЭЛНЭ (`NotJoinedNote`
        жагсаалтын ДЭЭР): эс бөгөөс хэрэглэгч өөрийгөө хайж олохгүй,
        яагаад байхгүйгээ ойлгохгүй.
      */}
      {!data.joined && <NotJoinedNote preview={data.standings.length > 0} />}

      {data.standings.length > 0 && (
        <ul className="surface divide-y divide-gray-100 p-0 dark:divide-white/5">
          {data.standings.map((row) => (
            <StandingRow
              key={row.uid}
              row={row}
              zone={outcomeForRank(row.rank, data.size, data.tier)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Hero дээрх нэг үзүүлэлт. */
function HeroStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="px-1">
      <span className="text-base leading-none" aria-hidden>
        {icon}
      </span>
      <dd className="num mt-1 text-lg font-extrabold leading-none">{value}</dd>
      <dt className="mt-1 text-[10px] leading-tight text-white/70">{label}</dt>
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
function NotJoinedNote({ preview }: { preview: boolean }) {
  return (
    <div className="surface flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
      <Image
        src={`${ART}/podium.png`}
        alt=""
        aria-hidden
        width={200}
        height={158}
        className="h-auto w-40 shrink-0"
      />
      <div className="flex flex-col items-center gap-2 sm:items-start">
        <p className="text-lg font-extrabold text-gray-900 dark:text-white">{t("Энэ долоо хоногт хараахан ороогүй")}</p>
        <p className="max-w-sm text-sm text-gray-500 dark:text-gray-400">
          {/*
            ⚠ ХАРАХ үед текст нь ӨӨР: доор жагсаалт байгаа тул
            «энэ бол бусдын эрэмбэ, та ороогүй» гэдгийг хэлэх ёстой.
          */}
          {preview
            ? "Доорх эрэмбэ бол энэ долоо хоногийн бүлэг. Хичээл эхлүүлмэгц та ч тэмцээнд орж, жагсаалтад гарна. Өнжсөн долоо хоног шатыг бууруулахгүй."
            : "Аль нэг курсээр хичээл эхлүүлмэгц шинэ тэмцээнд орно. Өнжсөн долоо хоног шатыг бууруулахгүй."}
        </p>
        <Link href="/learn" className="btn-primary mt-1 px-5 py-2.5 text-sm">{t("Хичээл эхлүүлэх")}</Link>
      </div>
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
      <ChevronUp className="size-4 shrink-0 text-emerald-500" aria-label={t("Дэвших бүс")} />
    );
  }
  if (zone === "demoted") {
    return <ChevronDown className="size-4 shrink-0 text-rose-500" aria-label={t("Буух бүс")} />;
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
        title={t("Хараахан найзгүй байна")}
        description={t("Найзаа нэмбэл түүнтэй долоо хоногийн оноогоо харьцуулж, хамтын даалгавар авах боломжтой.")}
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
    <div className="no-scrollbar flex justify-start gap-1 overflow-x-auto px-4 py-4 sm:justify-center">
      {LEAGUE_TIERS.map((step, index) => {
        const reached = index <= current;
        const isCurrent = index === current;

        return (
          <div
            key={step.key}
            className="flex w-[72px] shrink-0 flex-col items-center gap-1"
          >
            <span
              className={`relative grid place-items-center rounded-full p-1.5 transition-all ${
                isCurrent ? "bg-brand-50 ring-2 ring-brand-400 dark:bg-brand-500/15" : ""
              }`}
            >
              {/*
                ⚠ БҮХ ШАТ БҮТЭН ӨНГӨТЭЙ — саарал, түгжээтэй хувилбарыг
                хассан (макетын дагуу). Шатууд нь «түгжээтэй агуулга» БИШ,
                урагшлах ЗАМЫН ГАЗРЫН ЗУРАГ: есөн өнгө зэрэгцэн харагдвал
                дараагийн зорилго нь сонирхол татна.

                ⚠ «Би хаана байна» гэдгийг ЦАГИРАГ ба доорх СУМ хэлнэ —
                өнгө бүдгэрүүлэх шаардлагагүй.
              */}
              <Image
                src={`${ART}/${step.key}.png`}
                alt=""
                aria-hidden
                width={48}
                height={48}
                className={`h-auto w-11 transition-transform ${isCurrent ? "scale-110" : ""}`}
              />
            </span>

            <span
              className={`w-full truncate text-center text-[10px] leading-tight ${
                isCurrent
                  ? "font-extrabold text-gray-900 dark:text-white"
                  : reached
                    ? "font-semibold text-gray-500 dark:text-gray-400"
                    : "font-medium text-gray-400 dark:text-gray-500"
              }`}
            >
              {step.label}
            </span>

            {/* Макет дээрх заагч — «чи энд байна». */}
            {isCurrent && (
              <span
                className="-mt-0.5 size-0 border-x-4 border-t-[6px] border-x-transparent border-t-brand-400"
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
