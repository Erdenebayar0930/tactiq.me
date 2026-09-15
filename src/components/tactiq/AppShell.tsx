"use client";

import Link from "next/link";

// (доор нэмэгдэнэ)
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Award,
  Baby,
  BookOpen,
  ChevronRight,
  ChevronsUpDown,
  Crown,
  GraduationCap,
  Handshake,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  ScrollText,
  Swords,
  Settings,
  X,
  Trophy,
  User as UserIcon,
  Users,
} from "lucide-react";

import EmailVerifyBanner from "@/components/tactiq/EmailVerifyBanner";
import { useLocale } from "@/context/LocaleContext";
import { useUser } from "@/context/UserContext";
import { useApiData } from "@/hooks/useApiData";
import { hasRole, isAdminRole } from "@/lib/permissions";
import { signOutCompletely } from "@/lib/session";
import { updateMe } from "@/lib/users";
import { getAdSenseSlotId } from "@/lib/tactiq/ads";
import { coursePlay } from "@/lib/tactiq/courseNav";
import { colorStyles } from "@/lib/tactiq/theme";
import { tournamentEnabled } from "@/lib/tactiq/tournament";

import { AdSlot } from "./AdSlot";
import StreakCalendar from "./StreakCalendar";
import { Icon as CourseIcon } from "./Icon";
import { Logo } from "./Mascot";
import { ThemeToggle } from "./ThemeToggle";
import { StatPill } from "./ui";
import { backgroundClass } from "@/lib/tactiq/shop";

import type { Course } from "@/lib/tactiq/courses";
import type { ColorKey } from "@/lib/tactiq/theme";
import type { PublicUser } from "@/lib/api/publicUser";
import { t } from "@/lib/i18n/t";
import { localized } from "@/lib/i18n/content";

/**
 * Сурагчийн апп-ын хүрээ — толгой хэсэг ба навигац.
 *
 * Навигац ХОЁР хэлбэртэй: өргөн дэлгэц дээр зүүн талын багана, гар утсан
 * дээр доод тууз. Нэг жагсаалтаас хоёуланг зурснаар цэс нэмэхэд хоёр газар
 * засах шаардлагагүй.
 *
 * Реклам (`AdSlot`, `lib/tactiq/ads.ts` үзнэ үү) мөн ХОЁР хэлбэртэй, яг
 * ижил `xl` босгоор сольсон: өргөн (`xl+`, "вэбсайт") дэлгэц дээр баруун
 * талын хажуугийн багана, нарийн (`<xl`, гар утасны "апп") дэлгэц дээр
 * толгойн доорх хөндлөн банер. Хоёулаа НЭГ зэрэг харагдахгүй.
 */

/**
 * Цэс нь СОНГОСОН КУРСЭЭС хамаарна — "тоглох" зүйл нь курс тус бүрийн
 * зөв дэлгэц рүү заана (`lib/tactiq/courseNav.ts`).
 *
 * ⚠ `/courses` НЭМЭГДСЭН. Урьд нь курс солих цорын ганц зам нь толгой дахь
 * жижиг тугийг олж дарах байсан — тэр товч `sm` доош ХАРАГДДАГГҮЙ тул гар
 * утаснаас курсээ солих боломж бодитоор байхгүй байв.
 *
 * Доод туузан дээр 5 цэс багтана: `flex-1` тул 320px өргөнтэй хамгийн жижиг
 * дэлгэц дээр ч цэс тус бүр 64px — хүрэх талбайн 44px доод хязгаараас дээш.
 */
function buildNav(courseSlug: string | null | undefined): NavItem[] {
  const play = coursePlay(courseSlug);

  /*
   * ХОЁР ДАХЬ СУУДАЛ — ТЭМЦЭЭН, боломжтой бол.
   *
   * ⚠ `tournamentEnabled()` ХЭВЭЭР шалгана: хаяг тохируулаагүй үед
   * `/tournament` нь сесс үүсгэх хүсэлт илгээгээд УНАЖ, улаан алдаа
   * харуулдаг (тэр хуудсанд «тун удахгүй» гэсэн төлөв алга). Тиймээс
   * хаяггүй үед хуучин «Тоглох» цэс үлдэнэ — хоосон алдаа руу хөтлөхөөс
   * ажиллаж байгаа цэс нь дээр.
   */
  const second: NavItem = tournamentEnabled()
    ? { href: "/tournament", label: t("Тэмцээн"), Icon: Swords, color: "rose" }
    : { href: play.href, label: t(play.label), Icon: play.Icon, color: "rose" };

  return [
    { href: "/learn", label: t("Сурах"), Icon: BookOpen, color: "violet" },
    second,
    { href: "/courses", label: t("Курс"), Icon: GraduationCap, color: "sky" },
    { href: "/profile", label: t("Профайл"), Icon: UserIcon, color: "indigo" },
    { href: "/settings", label: t("Тохиргоо"), Icon: Settings, color: "teal" },
  ];
}

/**
 * Цэсний нэг зүйл.
 *
 * ⚠ `color` нь `lib/tactiq/theme.ts`-ийн `ColorKey`, ШУУД Tailwind класс
 * БИШ. Tailwind нь эх кодыг текстээр сканнердах тул `` `bg-${color}-500` ``
 * гэж угсарсан класс CSS-д ОГТ үүсэхгүй — өнгө чимээгүйхэн алга болно.
 * `colorStyles()` нь бүтэн класс мөрийг хүснэгтээс уншина.
 */
type NavItem = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: ColorKey;
};

/**
 * Цэсний дүрс — ӨНГӨТ хайрцагт.
 *
 * ⚠ Дөрвөн газар (хажуугийн багана, доод тууз, "Бусад" хуудас, хэрэглэгчийн
 * цэс) ИЖИЛ харагдах ёстой тул энд НЭГ л удаа бичив. Урьд нь дүрс бүр
 * `text-gray-400` байсан — бүх цэс ижилхэн саарал болж, хэрэглэгч дүрсээр
 * нь биш зөвхөн бичгээр нь ялгадаг байв.
 *
 * Идэвхтэй үед дүүрэн өнгө + цагаан дүрс, идэвхгүй үед зөөлөн дэвсгэр +
 * өнгөт дүрс: өнгө нь ҮРГЭЛЖ харагдана (таних тэмдэг), идэвхтэй эсэх нь
 * тодролоор ялгарна.
 */
function NavIcon({
  Icon,
  color,
  active,
  className = "size-9",
  tone = "light",
}: {
  Icon: React.ComponentType<{ className?: string }>;
  color: ColorKey;
  active: boolean;
  className?: string;
  /**
   * ⚠ `dark` нь ХАРАНХУЙ САМБАР дээр. Тэнд өнгөт цайвар дэвсгэр
   * (`softBg` — жишээ нь `bg-indigo-50`) нь бараан дэвсгэртэй зөрчилдөж,
   * цэсийг цоохор болгодог. Мөн идэвхтэй мөрийн дэвсгэр нь аль хэдийн
   * `iconBg` тул дүрс нь түүн дээр ижил өнгөөр уусаж алга болно.
   */
  tone?: "light" | "dark";
}) {
  const styles = colorStyles(color);

  const toneClass =
    tone === "dark"
      ? active
        ? "bg-white/20 text-white"
        : "bg-white/10 text-white/80"
      : active
        ? `${styles.iconBg} text-white`
        : `${styles.softBg} ${styles.softText}`;

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl transition-colors ${className} ${toneClass}`}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

/**
 * Эрхээс хамаарах НЭМЭЛТ цэсүүд.
 *
 * ⚠ ЭДГЭЭР НЬ ДООД ТУУЗАНД ШУУД ОРОХГҮЙ, зориудаар. Тэр тууз нь ЯГ 5
 * зүйлд тохируулагдсан (`buildNav` дээрх тайлбар: 320px дэлгэц дээр 64px)
 * — зүйл нэмэх бүрд хүрэх талбай багасна. Оронд нь ГУРВАН газарт гарна:
 *   • ширээний хувилбарт — хажуугийн багана,
 *   • толгойн хэрэглэгчийн цэс,
 *   • гар утсанд — доод туузны "Бусад" хуудас (`MoreSheet`).
 *
 * ⚠ Гуравдугаарыг ОРХИЖ БОЛОХГҮЙ. Урьд нь зөвхөн эхний хоёр байсан тул
 * гар утаснаас эдгээр цэс БҮРЭН олдохгүй байв: хажуугийн багана `lg`-ээс
 * доош нуугддаг, аватар нь "миний данс" гэсэн утгатай тул хэн ч түүнээс
 * "Найзууд" хайхгүй.
 *
 * ⚠ `hasRole` нь `secondaryRole`-ыг ч хардаг тул эцэг эх БӨГӨӨД багш хүнд
 * ХОЁУЛАА харагдана — тэр хүн өөрийн хүүхэд, ангийнхаа сурагчдыг тусад нь
 * хөтөлнө (`lib/api/studentLinks.ts`-ийн `relation`).
 */
function buildRoleNav(user: PublicUser | null): NavItem[] {
  if (!user) return [];

  const parent: NavItem[] = hasRole(user, "parent")
    ? [{ href: "/parent", label: t("Миний хүүхдүүд"), Icon: Baby, color: "rose" }]
    : [];

  const teacher: NavItem[] = hasRole(user, "teacher")
    ? [{ href: "/teacher", label: t("Миний сурагчид"), Icon: Users, color: "sky" }]
    : [];

  const admin: NavItem[] = isAdminRole(user.role)
    ? [{ href: "/admin", label: t("Хяналт"), Icon: LayoutDashboard, color: "indigo" }]
    : [];

  return [
    /*
     * ⚠ Тэргүүлэгчид, Найзууд нь БҮХ хэрэглэгчид харагдана — эрхээс
     * хамаарахгүй ч доод туузанд багтахгүй тул энэ жагсаалтад орлоо
     * (тэр тууз яг 5 зүйлд тохируулагдсан, дээрх `buildNav` үзнэ үү).
     */
    /*
     * ⚠ ТЭМЦЭЭН ЭНД БАЙХГҮЙ: одоо үндсэн цэсний хоёр дахь суудалд
     * суусан (`buildNav`). Хоёуланд нь байвал нэг холбоос хоёр газар
     * давхардаж, «аль нь зөв бэ» гэсэн эргэлзээ төрүүлнэ.
     *
     * ⚠ Тэмцээн нь ТУСДАА серверт (`chess.daamal.org`) ажиллана
     * (`lib/tactiq/tournament.ts`). Холбоос нь тэр сайт руу ШУУД
     * заахгүй, `/tournament` гүүр рүү ордог — тасалбар зөвхөн
     * нэвтэрсэн хүсэлтээс төрөх ёстой.
     */
    { href: "/leaderboard", label: t("Тэргүүлэгчид"), Icon: Trophy, color: "amber" },
    { href: "/friends", label: t("Найзууд"), Icon: Handshake, color: "emerald" },
    { href: "/achievements", label: t("Амжилтууд"), Icon: Award, color: "orange" },
    { href: "/certificates", label: t("Гэрчилгээ"), Icon: ScrollText, color: "violet" },
    ...parent,
    ...teacher,
    ...admin,
  ];
}

/**
 * Аппын БҮХ мөрийн (толгой, реклам, үндсэн тор) хэвтээ хүрээ.
 *
 * ⚠ ГУРВАН газарт ИЖИЛ байх ЁСТОЙ — эс бөгөөс лого, цэс, агуулга нь өөр
 * өөр босоо шугам дээр зогсож, хуудас гажигтай харагдана. Тиймээс мөрөнд
 * нь тус тусад нь бичихгүй, ЭНД нэг л удаа зарлав.
 *
 * ⚠ Өргөнийг тохируулахдаа ҮНДСЭН БАГАНЫГ бодно, бүтэн хуудсыг биш:
 * хажуу талд 208px цэс, 256px рекламын багана СУУДАГ тул хэрэглэгчийн
 * үнэхээр хардаг талбай нь нийт өргөнөөс ~510px БАГА. `max-w-6xl` (1152px)
 * үед үндсэн багана ердөө ~610px үлдэж, дөрвөн багцын карт шахагдан
 * гарчиг бүр гурван мөр болж тасарч байв.
 *
 * `w-full` ЗААВАЛ: `flex` эцэг доторх энэ элемент агуулгаараа агшихгүй.
 */
const SHELL_WIDTH = "mx-auto w-full max-w-7xl px-4 2xl:max-w-[1440px]";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const NAV = buildNav(user?.activeCourseSlug);
  const ROLE_NAV = buildRoleNav(user);

  /*
   * ⚠ Гар утасны "Бусад" хуудас.
   *
   * Доод тууз ЯГ 5 зүйлд тохируулагдсан (`buildNav`) тул нэмэлт цэсүүд
   * (Тэргүүлэгчид, Найзууд, Амжилтууд, Гэрчилгээ, Миний хүүхдүүд…) тэнд
   * багтахгүй. Урьд нь тэдгээр нь ЗӨВХӨН толгой дахь ЖИЖИГ АВАТАР доторх
   * унждаг цэсэнд байсан — өөрөөр хэлбэл гар утаснаас олдохгүй байв.
   * Аватар нь "миний данс" гэсэн утгатай тул хэн ч түүнээс "Найзууд"
   * хайхгүй.
   */
  const [moreOpen, setMoreOpen] = useState(false);

  /**
   * Идэвхтэй цэсийг зам ЭХЛЭХ ХЭЛБЭРЭЭР тодорхойлно.
   *
   * ⚠ `/play/draughts` нь `/play`-ийн ДЭД зам тул дам сонгосон хэрэглэгчийн
   * цэс дээр `/play` угтвар шалгалт нь бас таарна. Гэхдээ түүний цэсэн дэх
   * ганц тоглох зүйл нь `/play/draughts` өөрөө тул давхцал үүсэхгүй —
   * `/play` цэсэн дээр огт байхгүй.
   */
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    /*
      Дэвсгэр өнгө нь дэлгүүрээс авсан сонголтоор солигдоно
      (`lib/tactiq/shop.ts`). Авахгүй бол аппын ердийн дэвсгэр.

      ⚠ Өнгө нь ЗӨӨЛӨН сүүдрүүд (50/950) л байдаг: дэвсгэр нь бүх бичвэрийн
      ард байдаг тул тод өнгө нь уншигдацыг сүйтгэнэ.
    */
    <div className={`min-h-dvh ${backgroundClass(user?.bgTheme)}`}>
      {/* ⚠ `print:hidden` — гэрчилгээ хэвлэхэд толгой, цэс, реклам цаасан
          дээр гарах ёсгүй (`app/(app)/certificates`). */}
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur print:hidden dark:border-white/10 dark:bg-gray-950/90">
        <div className={`flex h-16 items-center gap-3 ${SHELL_WIDTH}`}>
          {/*
            ⚠ Гар утсанд нэргүй, зөвхөн тэмдэг. 360px өргөнтэй дэлгэц дээр
            лого(нэртэй) + курс сонгогч + горим солигч + аватар дөрөв
            толгойд БАГТДАГГҮЙ — аватар баруун захаас хайчлагдаж байв.
            Хамгийн бага мэдээлэл алддаг нь брэндийн нэр: тэмдэг нь
            өөрөө таних тэмдэг бөгөөд нэр нь хуудасны гарчигт байдаг.
          */}
          <Link href="/profile" className="shrink-0">
            <Logo compactOnMobile />
          </Link>

          <CourseSwitcherLink />

          <div className="ml-auto flex items-center gap-2">
            {/* `sm`-ээс дээш — толгойн мөрөнд багтана. Доор нь тусдаа тууз. */}
            {user && (
              <div className="hidden items-center gap-1.5 sm:flex">
                <StatCounters user={user} />
              </div>
            )}
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/*
          Гар утасны тоолуурын тууз.
          ⚠ Урьд нь тоолуурууд `hidden … sm:flex` байсан тул ГАР УТСАН ДЭЭР
          ОГТ ХАРАГДАХГҮЙ байв — тэгэхдээ апп-ыг голчлон гар утаснаас
          хэрэглэдэг. Дараалал, зоос, XP бол хэрэглэгчийг эргэж ирүүлдэг гол
          дохио тул тэднийг нуух нь тоглоомжуулалтыг чимээгүйхэн унтраадаг.
          Толгойн мөрөнд шахахын оронд доор нь өөрийн туузыг өгөв: 4 тоолуур
          320px өргөнд ч эрээвэргүй багтана.
        */}
        {user && (
          <div className="no-scrollbar flex items-center justify-around gap-1 overflow-x-auto border-t border-gray-200 px-2 py-1.5 sm:hidden dark:border-white/10">
            <StatCounters user={user} />
          </div>
        )}
      </header>

      {/* Нарийн дэлгэц ("апп") — хөндлөн банер реклам. `xl:hidden` нь доорх
          хажуугийн баганын `xl:block`-той яг эсрэг тул хоёул зэрэг
          харагдахгүй. */}
      <div className={`pt-4 xl:hidden print:hidden ${SHELL_WIDTH}`}>
        <AdSlot slotId={getAdSenseSlotId("banner")} />
      </div>

      <div className={`flex gap-6 py-6 ${SHELL_WIDTH}`}>
        <nav className="hidden w-60 shrink-0 print:hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <ActiveCourseCard />

            {/*
              ⚠ ХАЖУУГИЙН ЦЭС ҮРГЭЛЖ ХАРАНХУЙ — гэрэлт сэдэвт ч.

              Энэ нь брэндийн дүр төрх (`(site)` бүлгийн толгойтой ижил
              шийдвэр): цэс нь агуулгын хажууд зогсох «хүрээ» бөгөөд
              хоёр өөр байдалтай байвал апп хагарсан мэт харагдана.
              Агуулгын талбар нь харин хоёр сэдвийг бүрэн дэмжсэн хэвээр —
              сурагч тэнд цагаар хэмжигдэх уншилт хийдэг.
            */}
            <div className="space-y-1 rounded-3xl border border-white/10 bg-ink-950 p-3">
            <ul className="space-y-1">
            {NAV.map(({ href, label, Icon, color }) => (
              <li key={href}>
                <SidebarLink
                  href={href}
                  label={label}
                  Icon={Icon}
                  color={color}
                  active={isActive(href)}
                />
              </li>
            ))}

            {/*
              ⚠ ТАСАРХАЙ ХҮРЭЭГ УСТГАВ. Тасархай хүрээ нь интерфейсэд
              ихэвчлэн "дутуу", "түр зуурын" гэсэн утга илэрхийлдэг тул
              жинхэнэ цэсүүдийг бүрэн бус мэт харуулж байв. Бүлгийг
              ГАРЧГААР ялгах нь тодорхой бөгөөд чимээ багатай.
            */}
            {ROLE_NAV.length > 0 && (
              <li
                className="px-3 pt-4 pb-1 text-[11px] font-bold uppercase tracking-wider text-white/35"
                aria-hidden
              >
                {t("Бусад")}
              </li>
            )}

            {ROLE_NAV.map(({ href, label, Icon, color }) => (
              <li key={href}>
                <SidebarLink
                  href={href}
                  label={label}
                  Icon={Icon}
                  color={color}
                  active={isActive(href)}
                />
              </li>
            ))}
            </ul>

            <FamilyPlanPromo />
            </div>
          </div>
        </nav>

        {/* `min-w-0` — эс бөгөөс өргөн хүснэгт / кодын блок flex хүүхдийг
            тэлж, бүх хуудсыг хажуу тийш гүйлгэдэг болно. */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-0">
          <EmailVerifyBanner />
          {children}
        </main>

        {/* Өргөн дэлгэц ("вэбсайт") — хажуугийн багана реклам. */}
        <aside className="hidden w-64 shrink-0 print:hidden xl:block">
          <AdSlot slotId={getAdSenseSlotId("sidebar")} className="sticky top-24" />
        </aside>
      </div>

      {moreOpen && (
        <MoreSheet items={ROLE_NAV} onClose={() => setMoreOpen(false)} />
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur print:hidden lg:hidden dark:border-white/10 dark:bg-gray-950/95">
        <ul className="mx-auto flex max-w-md">
          {/*
            ⚠ ЭХНИЙ 4-ийг л зурна. Тавдугаарт "Бусад" товч сууж, үлдсэн бүх
            цэсийг нээнэ — эс бөгөөс нэмэлт цэсүүд гар утаснаас БҮРЭН
            олдохгүй. `buildNav`-ийн 5 дахь зүйл (Тохиргоо) нь тэр хуудсанд
            орсон тул алдагдахгүй.
          */}
          {NAV.slice(0, 4).map(({ href, label, Icon, color }) => {
            const active = isActive(href);
            const styles = colorStyles(color);

            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                    active ? styles.softText : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {/*
                    ⚠ Туузан дээр хайрцаг нь ЗӨВХӨН идэвхтэй үед. Тав ч
                    хайрцаг зэрэг өнгөтэй байвал доод тууз эрээвэр болж,
                    аль нь сонгогдсоныг ялгах боломжгүй болно.
                  */}
                  <span
                    className={`grid size-8 place-items-center rounded-xl transition-colors ${
                      active ? styles.softBg : ""
                    }`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}

          <li className="flex-1">
            {/*
              ⚠ Бүтэц нь дээрх дөрвөн холбоостой ЯГ ИЖИЛ байх ЁСТОЙ: `py-2`
              ба дүрсний `size-8` хайрцаг. Хайрцаггүй үлдээвэл энэ багана
              32px намхан болж, дүрс, бичиг хоёр нь бусдаасаа дээгүүр
              зогсоод, дүрс нь өөрөө томорсон мэт харагдана.
            */}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={`flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                moreOpen
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <span
                className={`grid size-8 place-items-center rounded-xl transition-colors ${
                  moreOpen ? "bg-gray-100 dark:bg-white/10" : ""
                }`}
              >
                <MenuIcon className="size-5" aria-hidden />
              </span>
              {t("Бусад")}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}

/**
 * Хажуугийн баганын нэг мөр.
 *
 * ⚠ Идэвхтэй мөрөнд БРЭНДИЙН градиент дэвсгэр байсныг АВСАН. Тэр нь бүх
 * идэвхтэй цэсийг ижил ягаан болгож, зүйл бүрийн өнгийг дардаг байв —
 * өөрөөр хэлбэл өнгө нэмсэн ч идэвхтэй үедээ алга болно. Одоо мөр нь
 * тухайн зүйлийн ЗӨӨЛӨН өнгөөр будагдаж, дүрс нь дүүрэн өнгө болно.
 */
/**
 * ГЭР БҮЛИЙН БАГЦЫН урилга — хажуугийн цэсний ёроолд.
 *
 * ⚠ Холбоос нь `/parent` руу: гэр бүлийн багцыг ЗӨВХӨН эцэг эхийн эрхтэй
 * данс авч чаддаг (`api/billing/checkout`-ийн `isParentOnlyPlan`) бөгөөд
 * худалдан авалтын урсгал тэр хуудсанд амьдардаг.
 */
function FamilyPlanPromo() {
  return (
    <Link
      href="/parent"
      className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-3 text-white transition-transform hover:-translate-y-0.5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/20">
        <Crown className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">Family Plan</span>
        <span className="block text-[11px] leading-tight text-white/75">
          Гэр бүлээрээ хамтдаа суралцъя
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-white/70" aria-hidden />
    </Link>
  );
}

function SidebarLink({
  href,
  label,
  Icon,
  color,
  active,
}: NavItem & { active: boolean }) {
  const styles = colorStyles(color);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      /*
       * ⚠ Идэвхтэй цэс нь ӨНГӨТ ДЭВСГЭРТЭЙ, зөвхөн бичвэрийн өнгө БИШ.
       * Харанхуй самбар дээр цайвар бичвэрийн өнгө ялгаа нь маш сул
       * дохио — хэрэглэгч аль хуудсанд байгаагаа хайх шаардлагатай болно.
       */
      className={`flex items-center gap-3 rounded-2xl px-2.5 py-2.5 text-sm transition-colors ${
        active
          ? `font-bold text-white ${styles.iconBg}`
          : "font-medium text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      <NavIcon Icon={Icon} color={color} active={active} tone="dark" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

/**
 * Гар утасны "Бусад" хуудас — доод туузанд багтаагүй БҮХ цэс.
 *
 * ⚠ Доороос гарах хуудас (bottom sheet), дээрээс биш: гар утсыг нэг гараар
 * барихад эрхий хуруу дэлгэцийн ДООД гуравны нэгд л хүрдэг. Цэсийг дээд
 * талд гаргавал хүрэхийн тулд гараа сольж барих шаардлагатай болно.
 *
 * ⚠ `lg:hidden` — ширээний хувилбарт эдгээр цэс хажуугийн баганад бүрэн
 * харагддаг тул энэ хуудас хэрэггүй.
 */
function MoreSheet({
  items,
  onClose,
}: {
  items: NavItem[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sheet = (
    <div className="fixed inset-0 z-40 print:hidden lg:hidden">
      {/* Бүрхэвч — гадуур товшиход хаана. */}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("Хаах")}
        className="absolute inset-0 bg-black/40"
      />

      <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-white/10 dark:bg-gray-950">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <p className="font-bold text-gray-900 dark:text-white">{t("Бусад")}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Хаах")}
            className="grid size-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <ul className="px-3 pb-4">
          {items.map(({ href, label, Icon, color }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
              >
                <NavIcon Icon={Icon} color={color} active={false} />
                {label}
              </Link>
            </li>
          ))}

          {/*
            ⚠ Тохиргоо ЗААВАЛ энд байх ёстой. Тэр нь `buildNav`-ийн 5 дахь
            зүйл байсан бөгөөд доод туузнаас "Бусад"-д байраа тавьсан —
            энд оруулахгүй бол гар утаснаас БҮРЭН алга болно.
          */}
          <li>
            <Link
              href="/settings"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
            >
              <NavIcon Icon={Settings} color="teal" active={false} />
              {t("Тохиргоо")}
            </Link>
          </li>

          <li>
            <button
              type="button"
              onClick={() => void signOutCompletely()}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
                <LogOut className="size-5" aria-hidden />
              </span>
              {t("Гарах")}
            </button>
          </li>
        </ul>
      </div>
    </div>
  );

  /*
   * ⚠ `document.body`-д PORTAL-ААР. Өнөөдөр энэ хуудас `backdrop-filter`-
   * гүй эцэг дотор байгаа тул шууд ч ажиллах байсан, ГЭХДЭЭ эцэг элементэд
   * `backdrop-blur`, `transform`, `filter`-ийн аль нэг нэмэгдмэгц
   * `position: fixed` нь ДЭЛГЭЦ биш ТЭР ЭЦГИЙГ заадаг болно — цонх
   * чимээгүйхэн тасарна. Ийм эвдрэл нь CSS-ийн алсын өөрчлөлтөөс үүсдэг
   * тул шалтгааныг нь олоход хэцүү (`StreakCalendar` дээр яг ингэж
   * тохиолдсон).
   */
  if (typeof document === "undefined") return null;

  return createPortal(sheet, document.body);
}

/**
 * Дараалал / XP / зоос / зүрх — толгой ба гар утасны тууз ХОЁУЛАА энэ нэг
 * жагсаалтыг зурна. Хоёр газарт салангид бичвэл нэгд нь тоолуур нэмээд
 * нөгөөд нь мартах нь цаг хугацааны асуудал.
 */
function StatCounters({ user }: { user: PublicUser }) {
  const [streakOpen, setStreakOpen] = useState(false);

  return (
    <>
      {streakOpen && <StreakCalendar onClose={() => setStreakOpen(false)} />}

      {/*
        ⚠ Дарааллын тоолуур нь ДАРАГДАНА, бусад нь үгүй. Хэрэглэгч галаа
        эхлээд ЭНД хардаг — хуанли, мөс хоёрыг зөвхөн профайлаас олдог
        байвал ихэнх нь тэдгээр байгааг ч мэдэхгүй өнгөрнө.
      */}
      <button
        type="button"
        onClick={() => setStreakOpen(true)}
        aria-haspopup="dialog"
        aria-label={t("Дарааллын хуанли")}
        className="rounded-full"
      >
        <StatPill kind="streak" value={user.streakDays} frozen={user.streakFrozen} />
      </button>
      <StatPill kind="xp" value={user.xp} />
      {/*
        Зоос дээр дарахад ДЭЛГҮҮР рүү. Зоос цуглуулах шалтгаан нь
        түүнийг зарцуулах зүйл байгаа эсэхээс хамаарна — тоо нь
        зөвхөн харагдаад дарагдахгүй бол хүүхэд дэлгүүрийг олохгүй
        байх магадлалтай (дэлгүүр нь профайлын цэсэнд нуугдмал).
      */}
      <Link
        href="/shop"
        aria-label={t("Дэлгүүр")}
        className="rounded-full transition-transform hover:scale-105"
      >
        <StatPill kind="gems" value={user.gems} />
      </Link>
    </>
  );
}

/**
 * Идэвхтэй курсыг УНШИХ нэгдсэн цэг.
 *
 * `AppShell` нь бүх хуудсанд НЭГ УДАА mount болдог тул энэ таталт нь бүх
 * session-д хангалттай — `useApiData` нь `/api/courses`-ийг кэшлэнэ.
 */
function useActiveCourse(): Course | null {
  const { user, isGuest } = useUser();
  /*
   * ⚠ ЗОЧИНД ТАТАХГҮЙ: `/api/courses` нь нэвтрэлт шаарддаг тул зочны
   * нэрийн өмнөөс дуудвал хуудас бүр дээр 401 үүснэ. Зочинд идэвхтэй
   * курс гэж байхгүй ч учраас хариу нь хэрэг ч болохгүй.
   */
  const { data } = useApiData<{ courses: Course[] }>(user && !isGuest ? "/api/courses" : null);

  if (!user?.activeCourseSlug) return null;
  return data?.courses.find((entry) => entry.slug === user.activeCourseSlug) ?? null;
}

/**
 * Толгой хэсгийн курсын туг — "би одоо ЮУ сурч байна" гэдгийг хэлнэ.
 *
 * ⚠ Урьд нь `hidden … sm:flex` байсан тул ГАР УТСАН ДЭЭР ХАРАГДДАГГҮЙ байв.
 * Тэр нь хоёр асуудал үүсгэсэн: (1) сонгосон курсээ хаанаас ч мэдэх аргагүй,
 * (2) курс солих цорын ганц товч алга болдог. Одоо бүх өргөнд харагдана —
 * нарийн дэлгэц дээр зөвхөн дүрс, `sm`-ээс дээш нэртэйгээ.
 */
function CourseSwitcherLink() {
  const course = useActiveCourse();

  if (!course) {
    return (
      <Link
        href="/courses"
        className="ml-1 flex min-w-0 items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:border-white/15 dark:text-gray-400 dark:hover:bg-white/5"
      >
        <GraduationCap className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{t("Курс сонгох")}</span>
      </Link>
    );
  }

  const styles = colorStyles(course.color);

  return (
    /*
      ⚠ `shrink-0` БАЙХГҮЙ, зориуд. Толгойн мөрөнд лого, сонгогч, горим
      солигч, аватар дөрөв зогсдог; сонгогч агшихгүй бол 320px дэлгэц дээр
      аватар баруун захаас хайчлагдана. Агшилтын зардал нь зөвхөн курсын
      нэр таслагдах — дүрс, сум хоёр `shrink-0` тул үлдэнэ.
    */
    <Link
      href="/courses"
      className={`ml-1 flex min-w-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${styles.softBg} ${styles.softText}`}
      title={`${localized(course.title, course.titleEn)} — ${t("Курс солих")}`}
    >
      <CourseIcon name={course.icon} className="size-3.5 shrink-0" />
      {/* Нэрийг гар утсан дээр ч ХАРУУЛНА — "аль курс дээр байна" гэдэг нь
          зөвхөн дүрсээр таамаглах зүйл байх учиргүй. Курсын нэр богино
          ("Шатар", "Даам") ч админ урт нэр өгч болзошгүй тул таслана. */}
      <span className="max-w-20 truncate sm:max-w-28">{localized(course.title, course.titleEn)}</span>
      <ChevronsUpDown className="size-3 shrink-0 opacity-60" aria-hidden />
    </Link>
  );
}

/**
 * Хажуугийн цэсний дээрх курсын карт.
 *
 * Толгойн туг нь ЖИЖИГ бөгөөд бусад товчны дунд алдагддаг. Өргөн дэлгэц дээр
 * зай байгаа тул идэвхтэй курсыг цэсний ЯГ ДЭЭР, өнгөт дүрстэйгээ томоор
 * харуулна — доорх цэсүүд яагаад ийм байгааг тайлбарлаж өгнө.
 */
function ActiveCourseCard() {
  const course = useActiveCourse();

  if (!course) {
    return (
      <Link
        href="/courses"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 p-3 text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:border-white/15 dark:text-gray-400 dark:hover:bg-white/5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gray-100 dark:bg-white/5">
          <GraduationCap className="size-4" aria-hidden />
        </span>
        {t("Курс сонгох")}
      </Link>
    );
  }

  const styles = colorStyles(course.color);

  return (
    <Link
      href="/courses"
      className="surface flex items-center gap-3 p-3 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.06]"
      title={t("Курс солих")}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${styles.iconBg}`}
      >
        <CourseIcon name={course.icon} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {t("Сурч буй курс")}
        </span>
        <span className="block truncate text-sm font-bold text-gray-900 dark:text-white">
          {localized(course.title, course.titleEn)}
        </span>
      </span>
      <ChevronsUpDown className="size-4 shrink-0 text-gray-400" aria-hidden />
    </Link>
  );
}

function UserMenu() {
  const { user } = useUser();
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    // Гадуур товшиход хаана. `mousedown` дээр сонсох нь чухал: `click` дээр
    // сонсвол цэсний доторх холбоос дарагдахаас ӨМНӨ хаагдаж, шилжилт
    // болохгүй үе гардаг.
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="grid size-9 place-items-center overflow-hidden rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("Хэрэглэгчийн цэс")}
      >
        {user.photoUrl ? (
          /* Firebase Storage-ийн URL нь next.config-ын remotePatterns-д
             бүртгэгдээгүй бөгөөд аватар нь 36px тул оновчлол шаардлагагүй. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 max-h-[70dvh] w-60 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-gray-900"
          role="menu"
        >
          <div className="mb-1 border-b border-gray-100 px-3 pt-2 pb-3 dark:border-white/10">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {user.displayName || t("Хэрэглэгч")}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {user.email}
            </p>
          </div>

          {/* Дүрсний өнгө нь хажуугийн багана, "Бусад" хуудастай ИЖИЛ —
              нэг цэс гурван газар өөр өнгөтэй байвал таних тэмдэг болохоо
              болино. */}
          {(
            [
              { href: "/profile", label: t("Профайл"), Icon: UserIcon, color: "indigo" },
              { href: "/settings", label: t("Тохиргоо"), Icon: Settings, color: "teal" },
              ...buildRoleNav(user),
            ] as NavItem[]
          ).map(({ href, label, Icon, color }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
              role="menuitem"
            >
              <NavIcon Icon={Icon} color={color} active={false} className="size-8" />
              {label}
            </Link>
          ))}
          {/*
            Хэлний шилжүүлэгч ЭНД БАС байна (Тохиргоо дотроос гадна):
            монгол хэл мэдэхгүй хүн "Тохиргоо" гэсэн бичгийг олж чадахгүй
            тул хэлээ солих зам нь түүний ойлгохгүй бичвэрийн цаана
            байж БОЛОХГҮЙ. MN/EN нь хэлнээс хамаарахгүй тэмдэглэгээ.
          */}
          <div className="mt-1 flex items-center gap-2 border-t border-gray-100 px-3 py-2 dark:border-white/10">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
              <Languages className="size-4" aria-hidden />
            </span>
            {(["mn", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  setLocale(option);
                  // Сонголтыг СЕРВЕРТ ч хадгална — `users.language` нь бусад
                  // төхөөрөмж дээр хэлийг сэргээнэ (Тохиргоо хуудастай ижил).
                  void updateMe({ language: option }).catch(() => {
                    // Хадгалж чадаагүй ч ЭНЭ хөтөч дээр хэл аль хэдийн
                    // солигдсон — хэрэглэгчийн UI-г эвдэхгүй.
                  });
                  setOpen(false);
                }}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                  locale === option
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                }`}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void signOutCompletely()}
            className="mt-1 flex w-full items-center gap-2.5 border-t border-gray-100 px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50 dark:border-white/10 dark:text-rose-400 dark:hover:bg-rose-500/10"
            role="menuitem"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400">
              <LogOut className="size-4" aria-hidden />
            </span>
            {t("Гарах")}
          </button>
        </div>
      )}
    </div>
  );
}
