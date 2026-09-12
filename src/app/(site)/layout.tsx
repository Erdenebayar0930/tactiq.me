import Link from "next/link";
import { Apple, ArrowRight, Flame, Play, TrendingUp, User, Zap } from "lucide-react";

import { Logo, LogoMark } from "@/components/tactiq/Mascot";
import { getSchools } from "@/lib/api/schools";

import type { School } from "@/lib/tactiq/schools";
import { BRAND_NAME, BRAND_TAGLINE_PARTS } from "@/lib/brand";

/**
 * Нийтийн вэбсайтын хүрээ.
 *
 * Энэ бүлэг нь ЗӨВХӨН нэвтрээгүй зочдод зориулагдсан тул серверийн
 * компонент хэвээр үлдэнэ — Firebase, контекст ачаалахгүй. Ингэснээр нүүр
 * хуудас нь JavaScript бараг ачаалалгүйгээр шууд харагдана.
 *
 * ⚠ Толгой хэсэг нь STICKY бөгөөд ҮРГЭЛЖ ХАРАНХУЙ (`bg-ink-950/80`).
 * Урьд нь sticky БИШ байсан — учир нь бүрэн тунгалаг хар toolbar доорх
 * цайвар хэсгүүд дээр очвол уншигдахгүй болно гэж үзсэн. Одоо тунгалаг
 * бус, харин 80% харанхуй + blur болсон тул доорх агуулга ямар ч өнгөтэй
 * байсан толгой нь харанхуй хэвээр үлдэж, цагаан бичвэр нь уншигдана.
 * Тиймээс sticky байх нь аюулгүй — гүйлгэсэн ч "Эхлэх" товч гарт байна.
 */
/**
 * Сургуулийн текстийг санд уншдаг болсон тул хуудас нь цэвэр статик биш —
 * ISR-ээр 5 минут кэшлэнэ.
 *
 * ⚠ `force-dynamic` БИШ: маркетингийн нүүр хуудас нь хамгийн их ачаалалтай,
 * хамгийн бага өөрчлөгддөг хуудас. Хүсэлт бүрд сан цохих нь ямар ч
 * өгөөжгүй — админ нэрийг сольсны дараа 5 минутын дотор гарна.
 */
export const revalidate = 300;

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
   * Сургуулийн нэрийг админ засаж болдог тул кодын жагсаалтыг шууд БИШ,
   * нийлүүлсэн хувилбарыг уншина. `revalidate` (доор) нь энэ асуулгыг
   * хүсэлт бүрд ажиллуулахгүй — хуудас кэшлэгдсэн хэвээр.
   */
  const schools = await getSchools();

  return (
    /*
     * Нийтийн сайт нь ГЭРЭЛТ ГОРИМД Ч харанхуй. Энэ бол зориудын шийдвэр:
     * нүүр хуудас нь брэндийн дүр төрх тул хэрэглэгчийн системийн горимоос
     * хамааран хоёр өөр байдалтай байх нь брэндийг сулруулна. Нэвтэрсэн
     * ХОЙШХИ апп (`(app)` бүлэг) харин хоёр горимыг бүрэн дэмжсэн хэвээр —
     * тэнд хэрэглэгч цагаар хэмжигдэх уншилт хийдэг.
     */
    <div className="flex min-h-dvh flex-col bg-ink-950">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-6xl items-center gap-4 px-4 lg:gap-8">
          <Link href="/" className="min-w-0 shrink-0" aria-label={BRAND_NAME}>
            <Logo tagline tone="light" />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-white/70 md:flex">
            <a href="#schools" className="transition-colors hover:text-white">
              Курсууд
            </a>
            <a href="#progress" className="transition-colors hover:text-white">
              Ахиц
            </a>
            <a href="#tournaments" className="transition-colors hover:text-white">
              Тэмцээн
            </a>
            <a href="#parents" className="transition-colors hover:text-white">
              Эцэг эх
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <User className="size-4" aria-hidden />
              <span className="hidden sm:inline">Нэвтрэх</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500 to-xp-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-900/40 transition-transform hover:-translate-y-0.5"
            >
              Эхлэх
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter schools={schools} />
    </div>
  );
}

/**
 * Хөл хэсэг — hero-той ижил харанхуй өнгөөр хуудсыг "хаана".
 *
 * ⚠ Гар утасны аппын товчлуурууд ЗОРИУДААР идэвхгүй (`Тун удахгүй`).
 * App Store / Google Play дээр апп хараахан НИЙТЛЭГДЭЭГҮЙ тул жинхэнэ
 * дэлгүүрийн тэмдэг тавьж, хаашаа ч хүрэхгүй холбоос өгвөл хэрэглэгчийг
 * төөрөгдүүлнэ. Апп нийтлэгдмэгц эдгээрийг жинхэнэ холбоос болгоно.
 */
function SiteFooter({ schools }: { schools: School[] }) {
  return (
    <footer className="border-t border-white/10 bg-ink-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Logo tagline tone="light" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/50">
              Хүүхэд, өсвөр үеийнхэнд зориулсан оюун ухаан, ур чадварын
              хөтөлбөрүүд — нэг данс, нэг дараалал, нэг ахиц.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StoreButton Icon={Apple} label="App Store" />
              <StoreButton Icon={Play} label="Google Play" />
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <FooterColumn title="Курсууд">
              {schools.map((school) => (
                <li key={school.slug}>
                  <a
                    href="#schools"
                    className="text-white/55 transition-colors hover:text-white"
                  >
                    {school.title}
                    <span className="ml-1.5 text-white/30">{school.subtitle}</span>
                  </a>
                </li>
              ))}
            </FooterColumn>

            <FooterColumn title="Платформ">
              <li>
                <a href="#progress" className="text-white/55 transition-colors hover:text-white">
                  DayStreak ба XP
                </a>
              </li>
              <li>
                <a href="#tournaments" className="text-white/55 transition-colors hover:text-white">
                  Тэмцээн
                </a>
              </li>
              <li>
                <a href="#parents" className="text-white/55 transition-colors hover:text-white">
                  Эцэг эхэд
                </a>
              </li>
            </FooterColumn>

            <FooterColumn title="Данс">
              <li>
                <Link href="/login" className="text-white/55 transition-colors hover:text-white">
                  Нэвтрэх
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-white/55 transition-colors hover:text-white">
                  Бүртгүүлэх
                </Link>
              </li>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <LogoMark className="size-6" />
            <p>
              © {new Date().getFullYear()} {BRAND_NAME}. Бүх эрх хуулиар
              хамгаалагдсан.
            </p>
          </div>

          <ul className="flex flex-wrap items-center gap-4 sm:ml-auto">
            <FooterBadge Icon={Flame} label="DayStreak" className="text-flame-400" />
            <FooterBadge Icon={Zap} label="XP" className="text-xp-300" />
            <FooterBadge Icon={TrendingUp} label="Түвшин" className="text-brand-300" />
          </ul>
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          {BRAND_TAGLINE_PARTS.join(" · ")}
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

function FooterBadge({
  Icon,
  label,
  className,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  className: string;
}) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon className={`size-4 ${className}`} aria-hidden />
      {label}
    </li>
  );
}

function StoreButton({
  Icon,
  label,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
      <Icon className="size-5 shrink-0 text-white/70" aria-hidden />
      <span className="flex flex-col leading-none">
        <span className="text-[10px] text-white/40">Тун удахгүй</span>
        <span className="mt-1 text-sm font-semibold text-white/80">{label}</span>
      </span>
    </span>
  );
}
