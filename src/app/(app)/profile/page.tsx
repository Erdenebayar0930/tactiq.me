"use client";

import Link from "next/link";
import { PetArt } from "@/components/tactiq/PetArt";
import {
  ChevronRight,
  Coins,
  Crown,
  Flame,
  Gift,
  LogOut,
  Settings,
  Snowflake,
  Sprout,
  Swords,
  Target,
  Tag,
  Zap,
} from "lucide-react";

import { useState } from "react";

import { useCurrentUser } from "@/context/UserContext";
import AchievementsSection from "@/components/tactiq/AchievementsSection";
import MyCodeCard from "@/components/tactiq/MyCodeCard";
import PremiumCard from "@/components/tactiq/PremiumCard";
import SkillsSection from "@/components/tactiq/SkillsSection";
import StreakCalendar from "@/components/tactiq/StreakCalendar";
import { ProgressBar } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { bannerGradient, frameRing } from "@/lib/tactiq/shop";
import { findSpecies } from "@/lib/tactiq/pets";
import { signOutCompletely } from "@/lib/session";
import { asRole, isStudentRole, roleLabels } from "@/lib/permissions";
import { ratingTitle } from "@/lib/tactiq/rating";
import { useSchools } from "@/context/SchoolsContext";

/** Миний профайл (#9 дэлгэц) — угталт, ахиц, хөтөлбөрийн хурдан холбоос. */
export default function ProfilePage() {
  const user = useCurrentUser();

  /**
   * Сурталчлагч мөн үү — цэсний «Сурталчлагч» мөр харагдах эсэхийг шийднэ.
   *
   * ⚠ Кодгүй хэрэглэгчид энэ хүсэлт нь ХЯМД: сервер тал код олдоогүй бол
   * төлбөр, олголтын нийлбэрийг ОГТ тооцохгүй буцаадаг
   * (`lib/api/promo.ts`-ийн `getPromoStats`).
   *
   * ⚠ Алдаа гарвал мөр нь зүгээр л ХАРАГДАХГҮЙ — профайл хуудас бүхэлдээ
   * унах ёсгүй, учир нь энэ бол хоёрдогч мэдээлэл.
   */
  const promo = useApiData<{ codes: unknown[] }>("/api/promo/me");
  /**
   * Тэжээвэр — банер дээр чимэглэл болж харагдана.
   *
   * ⚠ Алдаа гарвал банер нь зүгээр л ЧИМЭГЛЭЛГҮЙ гарна: профайл хуудас
   * бүхэлдээ унах ёсгүй, учир нь энэ бол гоо зүйн нэмэлт.
   */
  const petsData = useApiData<{ pets: { id: string; species: string }[] }>("/api/pets");
  const isPromoter = (promo.data?.codes?.length ?? 0) > 0;

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();
  const firstName = (user.displayName || "").trim().split(/\s+/)[0];

  return (
    <div className="space-y-5">
      <WelcomeBanner
        initial={initial}
        greetingName={firstName || "найз аа"}
        photoUrl={user.photoUrl}
        frame={user.avatarFrame}
        banner={user.bannerTheme}
        pets={(petsData.data?.pets ?? []).map((pet) => pet.species)}
        level={user.level}
        percent={user.percent}
      />

      {/*
        ⚠ Premium нь угталтын ШУУД ДООР. Эрх нь ДУУСДАГ бөгөөд дуусахад
        зүрх хязгаарлагдаж, хичээл хаагдана — өөрөөр хэлбэл энэ бол
        профайл дээрх цорын ганц ЦАГ ХУГАЦААНААС ХАМААРСАН мэдээлэл.
        Өмнө нь хуудасны ёроолд, дүрсээрээ ч өнгөөрөө ч ялгарахгүй
        энгийн мөр байсан тул эрх дуусах хүртэл хэн ч анзаардаггүй байв.
      */}
      <PremiumCard />

      {/*
        ⚠ Код нь угталтаас доош ХОЁР ДАХЬ байрлалд. Premium-д эхний
        байрыг өгсөн нь код чухал биш гэсэн үг биш — код нь ХЭЗЭЭ Ч
        өөрчлөгддөггүй, хэрэглэгч нэг л удаа олж сурвал хангалттай. Эрх
        дуусах огноо харин өдөр бүр өөр. Хүүхэд ээждээ эсвэл найздаа
        кодоо хэлэх мөчид түүнийг ХАЙХ шаардлагагүй байх ёстой; өмнө нь
        хуудсын дунд, бүтэн холбоосын дотор жижгээр л байсан.
      */}
      {user.studentInviteCode && (
        <MyCodeCard
          code={user.studentInviteCode}
          isStudent={isStudentRole(user.role)}
        />
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <StreakCard days={user.streakDays} frozen={user.streakFrozen} />
        <XpCard
          xp={user.xp}
          level={user.level}
          percent={user.percent}
          xpIntoLevel={user.xpIntoLevel}
          levelSpan={user.nextLevelXp - user.levelStartXp}
          xpToNext={user.xpToNext}
        />
      </section>

      {/*
        ⚠ Ур чадвар ба Амжилтууд нь сургуулийн товчнуудын ӨМНӨ. Эдгээр нь
        "би юу хийсэн бэ" гэдгийг харуулдаг бол товчнууд нь "хаашаа явах вэ"
        — өөрийн ахицаа хараад дараа нь үргэлжлүүлэх нь байгалийн дараалал.
      */}
      <SkillsSection />

      {/*
        ⚠ ЗУРГАА, тав биш. Тэмдгүүд гурван баганат торонд байрладаг тул тав
        нь 3 + 2 болж сүүлийн мөр хагас хоосон үлдэнэ. Зургаа нь яг хоёр
        бүтэн мөр (`AchievementsSection`).
      */}
      <AchievementsSection limit={6} />

      <SchoolShortcuts />

      <section className="surface p-0">
        <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-white/10">
          <Stat label="Түвшин" value={user.level} />
          <Stat label="Зоос" value={user.gems} href="/shop" />
          {/*
            ⚠ «Зүрх» энд байсныг ХАСАВ — амь гэсэн механик бүхэлдээ
            устсан. Оронд нь ДАРААЛАЛ: сурагчийн бодит хичээл зүтгэлийг
            хэмждэг цорын ганц үлдсэн өдөр тутмын үзүүлэлт.
          */}
          <Stat label="Дараалал" value={user.streakDays} />
        </div>
      </section>

      <RatingCard rating={user.rating} games={user.ratingGames} />

      {(user.chessWins > 0 || user.chessLosses > 0 || user.chessDraws > 0) && (
        <section className="surface p-5">
          <div className="mb-3 flex items-center gap-2">
            <Swords className="size-4 text-gray-400" aria-hidden />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              Шатрын тоглолт
            </span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-white/10">
            <Stat label="Ялалт" value={user.chessWins} />
            <Stat label="Хожигдол" value={user.chessLosses} />
            <Stat label="Тэнцээ" value={user.chessDraws} />
          </div>
        </section>
      )}

      <nav className="surface divide-y divide-gray-200 overflow-hidden dark:divide-white/10">
        {/* Дүрс нь ШАРГАЛ — дээд талын карттай нэг өнгөөр "Premium"
            гэдгийг таниулна. Үлдсэн мөрүүд саарал хэвээр. */}
        <Row
          href="/premium"
          Icon={Crown}
          label="Premium"
          iconClassName="text-gold-500"
        />
        {/*
          ⚠ Сурталчлагчийн мөр нь ЗӨВХӨН код олгогдсон хүнд харагдана.
          Сурагч, эцэг эх зэрэг олонхид энэ нь хамааралгүй хэсэг бөгөөд
          «яаж код авах вэ» гэсэн асуулт нь дэмжлэгийн ачаалал болно.

          ⚠ Энэ нь ХАМГААЛАЛТ БИШ, зөвхөн цэсний цэгц: `/promo` нь ямар
          ч хэрэглэгчид нээлттэй боловч ЗӨВХӨН ӨӨРИЙНХӨӨ мэдээллийг
          харуулдаг (`api/promo/me`).
        */}
        {isPromoter && <Row href="/promo" Icon={Tag} label="Сурталчлагч" />}
        <Row href="/pets" Icon={Sprout} label="Миний тэжээвэр" />
        <Row href="/shop" Icon={Coins} label="Дэлгүүр" />
        <Row href="/settings" Icon={Settings} label="Тохиргоо" />
        <button
          type="button"
          onClick={() => void signOutCompletely()}
          className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
        >
          <LogOut className="size-5" aria-hidden />
          Гарах
        </button>
      </nav>

      <p className="text-center text-xs text-gray-400">
        Эрх: {roleLabels[asRole(user.role)]}
      </p>
    </div>
  );
}

/**
 * Угталтын банер — өдрийн эхний харц.
 *
 * Зөвхөн НЭРЭЭР (овоггүй) уриална: бүтэн нэр нь албан ёсны, хүйтэн
 * сонсогддог бөгөөд урт нэр банерийг хоёр мөр болгож эвдэнэ.
 */
function WelcomeBanner({
  initial,
  greetingName,
  photoUrl,
  frame,
  banner,
  pets,
  level,
  percent,
}: {
  initial: string;
  greetingName: string;
  photoUrl: string;
  /** Дэлгүүрээс авсан аватарын хүрээ (`lib/tactiq/shop.ts`) */
  frame: string;
  /** Дэлгүүрээс авсан банерийн загвар. */
  banner: string;
  /** Эзэмшиж буй тэжээврийн төрлүүд — банер дээр чимэглэл болно. */
  pets: string[];
  level: number;
  percent: number;
}) {
  return (
    /*
      ⚠ Банер нь хэрэглэгчийн ЦУГЛУУЛСАН зүйлсээр өөрчлөгдөнө: дэвсгэрийн
      загвар, аватарын хүрээ, тэжээврүүд. Эхлээд ердийн байгаад цаг
      хугацаанд өөрийн болж хувирдаг — «хөгжүүлдэг» мэдрэмж нь яг эндээс
      гарна.
    */
    <section className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-lg shadow-brand-500/20 ${bannerGradient(banner)}`}>
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-white/15 blur-3xl"
        aria-hidden
      />

      <div className="relative flex items-center gap-4">
        <span
          className={`grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white/20 text-xl font-bold ${
            frame ? frameRing(frame) : "ring-2 ring-white/30"
          }`}
        >
          {photoUrl ? (
            /* Firebase Storage-ийн URL нь next.config-ын remotePatterns-д
               бүртгэгдээгүй бөгөөд аватар нь 56px тул оновчлол шаардлагагүй. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="size-full object-cover" />
          ) : (
            initial
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-extrabold">
            Сайн байна уу, {greetingName}!
          </p>
          <p className="mt-0.5 text-sm text-white/75">
            Өнөөдөр шинэ зүйл сурч, өөрийгөө хөгжүүлээрэй
          </p>
        </div>

        <Link
          href="/settings"
          className="hidden shrink-0 items-center gap-1 rounded-full bg-white/15 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/25 sm:inline-flex"
        >
          Засах
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div className="relative mt-5 flex items-center gap-3">
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold">
          Lv. {level}
        </span>
        {/* `ProgressBar` нь цайвар дэвсгэрт зориулагдсан тул энд ХЭРЭГЛЭХГҮЙ —
            түүний саарал суурь энэ градиент дээр бохир толботой харагдана. */}
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-500"
            style={{ width: `${Math.max(0, Math.min(100, Math.round(percent)))}%` }}
          />
        </div>

        {/*
          ТЭЖЭЭВРҮҮД — прогресс мөрийн ХАЖУУД, урсгалын дотор.

          ⚠ Урьд нь `absolute bottom-2 right-3` байсан: тэжээвэр олшрох
          тусам прогресс мөрийн баруун үзүүр дээр ДАВХЦАЖ, явц хэдэн хувь
          болохыг харуулахгүй болдог байв. Урсгалын дотор байрлуулснаар
          мөр өөрөө богиносч, ХЭЗЭЭ Ч давхцахгүй.

          ⚠ `pointer-events-none`: эдгээр нь чимэглэл бөгөөд банер дээр
          «Засах» холбоос байдаг — товшилтыг таслах ёсгүй.

          ⚠ Дээд тал нь 5: түүнээс олон бол мөрийг хэт богиносгоно.
        */}
        {pets.length > 0 && (
          <span
            className="pointer-events-none flex shrink-0 items-center gap-1 text-xl opacity-90"
            aria-hidden
          >
            {pets.slice(0, 5).map((species, index) => {
              const found = findSpecies(species);
              return found ? (
                <PetArt key={species + index} species={found} size={28} className="drop-shadow" />
              ) : null;
            })}
          </span>
        )}
      </div>
    </section>
  );
}

/**
 * Дараалал (DayStreak).
 *
 * ⚠ 7 хоногийн ХУВААРЬ ЗУРААГҮЙ. Сервер зөвхөн дарааллын ТООГ (`streakDays`)
 * буцаадаг, аль өдөр нь хичээлсэн гэдэг түүх байхгүй. Долоо хоногийн цэгүүд
 * зурвал зурсан бүрд нь ХУУРАМЧ өгөгдөл харуулна — хэрэглэгч түүнийг бодит
 * түүх гэж уншина. Өдрийн түүхийн API нэмэгдмэгц энд буцаж ирнэ.
 */
/**
 * Дарааллын карт — ДАРВАЛ хуанли нээгдэнэ.
 *
 * ⚠ Товч болгосон нь зөвхөн хуанли үзүүлэхийн тулд биш: мөс худалдаж авах
 * цорын ганц зам ЭНД байна. Урьд нь `streakFreezes` багана, үнэ, хязгаар
 * бүгд байсан ч хэрэглэгч мөс АВАХ БОЛОМЖГҮЙ байв — зөвхөн бүртгэлийн
 * үед өгсөн нэгээр хязгаарлагдана.
 */
function StreakCard({ days, frozen }: { days: number; frozen: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <StreakCalendar onClose={() => setOpen(false)} />}

    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-haspopup="dialog"
      aria-expanded={open}
      className="surface flex w-full items-center gap-4 p-5 text-left transition-shadow hover:shadow-md">
      <span
        className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg ${
          frozen
            ? "from-sky-400 to-sky-600 shadow-sky-500/25"
            : "from-flame-400 to-flame-600 shadow-flame-500/25"
        }`}
      >
        {frozen ? (
          <Snowflake className="size-7" aria-hidden />
        ) : (
          <Flame className="size-7" fill="currentColor" aria-hidden />
        )}
      </span>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          DayStreak
        </p>
        <p className="num mt-0.5 text-2xl font-extrabold text-gray-900 dark:text-white">
          {days}
          <span className="ml-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
            өдөр
          </span>
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {frozen
            ? "Мөсөөр хамгаалагдсан"
            : days > 0
              ? "Тасалдуулалгүй үргэлжлүүл!"
              : "Өнөөдрөөс эхлүүлээрэй"}
        </p>
      </div>

      <ChevronRight className="size-5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden />
    </button>
    </>
  );
}

/** XP ба түвшний явц — банерийн доорх дэлгэрэнгүй хэлбэр. */
function XpCard({
  xp,
  level,
  percent,
  xpIntoLevel,
  levelSpan,
  xpToNext,
}: {
  xp: number;
  level: number;
  percent: number;
  xpIntoLevel: number;
  levelSpan: number;
  xpToNext: number;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-xp-400 to-xp-600 text-white shadow-lg shadow-xp-500/25">
          <Zap className="size-5" fill="currentColor" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Нийт XP
          </p>
          <p className="num text-2xl font-extrabold text-gray-900 dark:text-white">
            {xp.toLocaleString("mn-MN")}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-xp-50 px-2.5 py-1 text-xs font-bold text-xp-700 dark:bg-xp-500/15 dark:text-xp-300">
          Lv. {level}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {level}-р түвшин
        </span>
        <span className="num text-gray-500 dark:text-gray-400">
          {xpIntoLevel} / {levelSpan}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar percent={percent} tone="bg-xp-500" label="Түвшний явц" />
      </div>
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Дараагийн түвшинд <span className="num">{xpToNext}</span> оноо үлдлээ.
      </p>
    </div>
  );
}

/**
 * Сургуулиудын хурдан холбоос.
 *
 * ⚠ Бүгд `/courses` руу заана, сургууль тус бүрийн ТУСДАА дэлгэц рүү БИШ.
 * Шалтгаан: сургуулийн дэлгэц гэж байхгүй — `/courses` нь курсуудыг аль
 * хэдийн сургуулиар бүлэглэж харуулдаг. Байхгүй зам руу заасан "гоё" карт
 * нь 404 болж, ажиллаж буй холбоосоос дор.
 */
function SchoolShortcuts() {
  const schools = useSchools();

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">
        Курсууд
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {schools.map((school) => (
          <Link
            key={school.slug}
            href="/courses"
            className={`flex flex-col items-center gap-2 rounded-2xl bg-gradient-to-br p-4 text-center text-white shadow-md transition-transform hover:-translate-y-0.5 ${school.gradient} ${school.glow}`}
          >
            <school.Icon className="size-6" aria-hidden />
            <span className="text-xs font-bold leading-tight">{school.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Elo үнэлгээ — тоглолтын хүч.
 *
 * ⚠ Түвшин (XP) БОЛОН лигээс ӨӨР ойлголт: XP нь хэр их СУРСАН, Elo нь хэр
 * сайн ТОГЛОДОГ. Хажууд нь тайлбар бичсэн нь тийм учиртай — хоёр тоо
 * зэрэгцэн харагдвал хүүхэд аль нь юу болохыг андуурна.
 */
function RatingCard({ rating, games }: { rating: number; games: number }) {
  return (
    <section className="surface flex items-center gap-4 p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
        <Target className="size-6" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          Тоглолтын үнэлгээ
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {games > 0
            ? `${ratingTitle(rating)} · ${games} тоглолт`
            : "Эхний тоглолтоо хийвэл үнэлгээ тодорно"}
        </p>
      </div>

      <p className="num shrink-0 text-2xl font-extrabold text-gray-900 dark:text-white">
        {rating}
      </p>
    </section>
  );
}

/**
 * Нэг үзүүлэлт.
 *
 * ⚠ `href` өгвөл ХОЛБООС болно (жишээ нь «Зоос» → дэлгүүр). Хүүхэд
 * тоон дээр дарж үзэх нь байгалийн зөн — тэр дарлага юу ч хийхгүй бол
 * дэлгүүр нь профайлын цэсэнд нуугдсан хэвээр үлдэнэ.
 */
function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const body = (
    <>
      <p className="num text-2xl font-extrabold text-gray-900 dark:text-white">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block px-4 py-5 text-center transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
      >
        {body}
      </Link>
    );
  }

  return <div className="px-4 py-5 text-center">{body}</div>;
}

function Row({
  href,
  Icon,
  label,
  /** Дүрсний өнгийг ДАРЖ бичих (анхдагч нь саарал). */
  iconClassName = "text-gray-400",
}: {
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  iconClassName?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
    >
      <Icon className={`size-5 ${iconClassName}`} />
      <span className="flex-1">{label}</span>
      <ChevronRight className="size-4 text-gray-400" aria-hidden />
    </Link>
  );
}
