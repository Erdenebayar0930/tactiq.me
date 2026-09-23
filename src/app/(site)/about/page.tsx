import Link from "next/link";
import {
  ArrowRight,
  Flame,
  Link2,
  Medal,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";

import { BRAND_NAME, BRAND_PROMISE, BRAND_SHORT } from "@/lib/brand";
import { getSchools } from "@/lib/api/schools";
import { topicCount } from "@/lib/tactiq/schools";

import type { School } from "@/lib/tactiq/schools";

/**
 * Нүүр хуудас (#1 дэлгэц).
 *
 * Серверийн компонент — интерактив хэсэг байхгүй тул клиент бандл руу юу ч
 * нэмэхгүй. Одоохондоо статик агуулгатай: курс, тэмцээний өгөгдлийн сан
 * хараахан бүрэн бэлэн болоогүй тул DB-ээс уншихгүй.
 *
 * ⚠ Хуудас бүхэлдээ ХАРАНХУЙ (`(site)/layout.tsx` үзнэ үү) тул энд
 * `text-gray-900` шиг гэрэлт горимын класс ХЭРЭГЛЭХГҮЙ — бичвэр бүр
 * цагаан/цагаан-тунгалаг байна.
 */

/** Тоглоомжуулалтын гурван багана — доорх `#progress` хэсэгт тайлбарлана */
const MECHANICS = [
  {
    Icon: Flame,
    title: "DayStreak",
    accent: "text-flame-400",
    tile: "from-flame-400 to-flame-600",
    description:
      "Өдөр бүр нэг дасгал — дараалал тасрахгүй. Хоног бүр нэмэгдэх дөл нь " +
      "хүүхдийг өөрөө сануулагчгүйгээр суудалд нь суулгадаг.",
  },
  {
    Icon: Zap,
    title: "XP оноо",
    accent: "text-xp-300",
    tile: "from-xp-400 to-xp-600",
    description:
      "Дуусгасан дасгал, ялсан тоглолт, шийдсэн бодлого бүр XP болно. " +
      "Ахиц нь тоогоор харагдана — таамаг биш.",
  },
  {
    Icon: TrendingUp,
    title: "Түвшин",
    accent: "text-brand-300",
    tile: "from-brand-400 to-brand-600",
    description:
      "XP хуримтлуулах тусам түвшин ахина. Шинэ түвшин бүр шинэ агуулга, " +
      "шинэ өрсөлдөгчийг нээнэ.",
  },
];

const TOURNAMENTS = [
  {
    title: `${BRAND_SHORT} Daily Arena`,
    detail: "Шатар · 10+0 · Өдөр бүр",
    Icon: Swords,
    tile: "from-brand-400 to-brand-600",
  },
  {
    title: "Mongolian Checkers Open",
    detail: "Даам · Round Robin · 7 хоног тутам",
    Icon: Trophy,
    tile: "from-amber-400 to-orange-600",
  },
  {
    title: "Улирлын шигшээ",
    detail: "Шатар · Бүртгэл нээлттэй",
    Icon: Medal,
    tile: "from-rose-400 to-rose-600",
  },
];

const PARENT_FEATURES = [
  {
    Icon: Link2,
    title: "Кодоор холбогдох",
    description: "Хүүхдийнхээ хувийн кодоор өөрийн дансандаа холбоно.",
  },
  {
    Icon: Trophy,
    title: "Тэмцээний явц",
    description: "Оролцсон тэмцээн, байр, чансааг цаг тухайд нь харна.",
  },
  {
    Icon: Target,
    title: "Өдрийн зорилт",
    description: "Хүүхдийнхээ өдрийн дасгалын зорилтыг өөрөө тохируулна.",
  },
  {
    Icon: ShieldCheck,
    title: "Premium удирдлага",
    description: "Хүүхдэдээ Premium багцыг өөрийн данснаас худалдаж авна.",
  },
];

/**
 * Сургуулийн текстийг санд уншдаг болсон тул хуудас нь цэвэр статик биш —
 * ISR-ээр 5 минут кэшлэнэ.
 *
 * ⚠ `force-dynamic` БИШ: маркетингийн нүүр хуудас нь хамгийн их ачаалалтай,
 * хамгийн бага өөрчлөгддөг хуудас. Хүсэлт бүрд сан цохих нь ямар ч
 * өгөөжгүй — админ нэрийг сольсны дараа 5 минутын дотор гарна.
 */
export const revalidate = 300;

export default async function HomePage() {
  const schools = await getSchools();

  return (
    <>
      <Hero schools={schools} />
      <Products schools={schools} />
      <Progress />
      <Tournaments />
      <Parents />
      <FinalCta />
    </>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero({ schools }: { schools: School[] }) {
  return (
    <section className="relative isolate overflow-hidden">
      <Aurora />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 lg:grid-cols-[1.05fr_1fr] lg:py-28">
        {/* ⚠ `min-w-0` — grid хүүхдийн анхдагч `min-width: auto` нь агуулгынхаа
            min-content өргөнөөс бага болж чаддаггүй. Үүнгүйгээр баруун талын
            жишээ самбар нарийн дэлгэц дээр баганыг тэлж, ХУУДАС БҮХЭЛДЭЭ
            хэвтээ гүйлгэдэг болдог. */}
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white/70">
            <Sparkles className="size-3.5 text-brand-300" aria-hidden />
            6 чиглэл · 1 данс
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Сур. Бод. Бүтээ.
            <br />
            <span className="text-gradient-brand">{BRAND_PROMISE}.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
            Оюун ухаан, программчлал, дижитал чадвар, бүтээлч урлаг,
            амьдралын ур чадвар, ирээдүйн бэлтгэл — зургаан чиглэлийн курс
            {" "}{BRAND_NAME} дээр нэг дор.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-xp-500 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-brand-900/50 transition-transform hover:-translate-y-0.5"
            >
              Үнэгүй эхлэх
              <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link
              href="#schools"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Swords className="size-5" aria-hidden />
              Курсуудыг үзэх
            </Link>
          </div>

          <p className="mt-6 text-sm text-white/40">
            Бүртгүүлэхэд 30 секунд · Эхний хичээл үнэгүй · Картын мэдээлэл
            шаардахгүй
          </p>
        </div>

        <HeroPreview schools={schools} />
      </div>
    </section>
  );
}

/**
 * Hero-гийн шөнийн тэнгэр — гэрлэн бөмбөлөг ба одод.
 *
 * Одыг ЖИНХЭНЭ элементээр биш, `radial-gradient`-ийн жагсаалтаар зурсан:
 * 40 ширхэг `<span>` нь DOM-ыг хэрэггүй хавдаана, харин нэг ч элемент
 * нэмэхгүй градиент нь GPU дээр шууд зурагдана.
 */
function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,#1c2a63_0%,#111838_45%,#0a0f1c_100%)]" />
      <div className="absolute -top-40 right-[-10rem] size-[36rem] rounded-full bg-brand-600/30 blur-[130px]" />
      <div className="absolute top-1/3 left-[-8rem] size-[26rem] rounded-full bg-xp-600/25 blur-[130px]" />
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 10% 20%, white, transparent), radial-gradient(1px 1px at 30% 70%, white, transparent), radial-gradient(1px 1px at 55% 15%, white, transparent), radial-gradient(1px 1px at 70% 55%, white, transparent), radial-gradient(1px 1px at 85% 30%, white, transparent), radial-gradient(1px 1px at 92% 80%, white, transparent), radial-gradient(1px 1px at 15% 85%, white, transparent), radial-gradient(1px 1px at 45% 45%, white, transparent), radial-gradient(1px 1px at 25% 45%, white, transparent), radial-gradient(1px 1px at 65% 85%, white, transparent)",
        }}
      />
    </div>
  );
}

/**
 * Аппын дүр төрхийн ЖИШЭЭ самбар.
 *
 * ⚠ Энэ бол ЗУРАГ БИШ, ЖИНХЭНЭ ӨГӨГДӨЛ Ч БИШ — аппын дэлгэцийг санагдуулах
 * загварчилсан UI. Дэлгэцийн зураг (screenshot) тавибал апп өөрчлөгдөх бүрд
 * хуучирч, монитор бүр дээр өөр өнгөтэй харагддаг. Энэ хувилбар нь брэндийн
 * өнгө, фонтоо шууд өвлөнө.
 */
function HeroPreview({ schools }: { schools: School[] }) {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-md">
      <div className="absolute inset-6 -z-10 rounded-[2.5rem] bg-brand-500/25 blur-3xl" aria-hidden />

      <div className="rounded-[1.75rem] border border-white/12 bg-white/[0.06] p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
        <div className="rounded-3xl bg-ink-900/90 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-xp-500 text-sm font-bold text-white">
              Б
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Сайн байна уу, Бат-Эрдэнэ!</p>
              <p className="text-xs text-white/45">Өнөөдөр шинэ зүйл сурцгаая</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <PreviewStat
              Icon={Flame}
              tint="text-flame-400"
              value="12"
              unit="өдөр"
              label="DayStreak"
            />
            <PreviewStat
              Icon={Zap}
              tint="text-xp-300"
              value="1,250"
              unit="XP"
              label="5-р түвшин"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {schools.map((school) => (
              <div
                key={school.slug}
                className={`flex min-w-0 flex-col items-center gap-1.5 rounded-xl bg-gradient-to-br ${school.gradient} px-2 py-3`}
              >
                <school.Icon className="size-4 text-white" aria-hidden />
                <span className="w-full truncate text-center text-[9px] font-semibold text-white/90">
                  {school.title}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white/80">Долоо хоногийн дараалал</span>
              <span className="num text-white/45">6 / 7</span>
            </div>
            <div className="mt-2.5 flex justify-between">
              {["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"].map((day, index) => (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`grid size-6 place-items-center rounded-full text-[9px] font-bold ${
                      index < 6
                        ? "bg-gradient-to-br from-flame-400 to-flame-600 text-white"
                        : "border border-white/12 text-white/25"
                    }`}
                  >
                    {index < 6 ? "✓" : ""}
                  </span>
                  <span className="text-[9px] text-white/35">{day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewStat({
  Icon,
  tint,
  value,
  unit,
  label,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  tint: string;
  value: string;
  unit: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5">
      <div className="flex items-center gap-1.5">
        <Icon className={`size-4 ${tint}`} aria-hidden />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
          {label}
        </span>
      </div>
      <p className="num mt-1.5 text-xl font-extrabold text-white">
        {value}
        <span className="ml-1 text-xs font-semibold text-white/40">{unit}</span>
      </p>
    </div>
  );
}

/* ─────────────────────── Зургаан сургууль ─────────────────────── */

function Products({ schools }: { schools: School[] }) {
  return (
    <section id="schools" className="scroll-mt-24 border-t border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Курсууд"
          title="Нэг данс, зургаан чиглэл"
          description="Хүүхэд бүр өөрийн сонирхлоороо эхэлж, дараа нь бусад чиглэл рүү тэлнэ. Дараалал, XP, түвшин нь бүх курст НИЙТЛЭГ — юу сурснаас үл хамааран нэг ахиц."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((school) => (
            <article
              key={school.slug}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
            >
              {/* Hover үед доороос гарч ирэх өнгөт туяа — картыг "амьд" болгоно */}
              <div
                className={`pointer-events-none absolute -bottom-16 left-1/2 size-40 -translate-x-1/2 rounded-full bg-gradient-to-br ${school.gradient} opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-40`}
                aria-hidden
              />

              <div className="relative flex items-start justify-between gap-3">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${school.gradient} text-white shadow-lg ${school.glow}`}
                >
                  <school.Icon className="size-6" aria-hidden />
                </span>

                <span className="num rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/60">
                  {topicCount(school)} сэдэв
                </span>
              </div>

              <h3 className="relative mt-5 text-lg font-bold text-white">
                {school.title}
              </h3>
              <p className="relative mt-0.5 text-sm font-medium text-white/45">
                {school.subtitle}
              </p>
              <p className="relative mt-3 text-sm leading-relaxed text-white/55">
                {school.description}
              </p>

              {/* Сэдвийн шошго — сургууль ЯГ ЮУГ агуулдгийг ил харуулна.
                  `mt-auto` нь картуудын доод ирмэгийг тэгшилнэ: тайлбарын
                  урт өөр өөр байсан ч шошгын мөр нэг шугам дээр зэрэгцэнэ. */}
              <ul className="relative mt-5 flex flex-wrap gap-1.5 pt-1">
                {school.groups.flatMap((group) => group.topics).slice(0, 5).map((topic) => (
                  <li
                    key={topic}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/55"
                  >
                    {topic}
                  </li>
                ))}
                {topicCount(school) > 5 && (
                  <li className="num rounded-lg px-2 py-1 text-[11px] text-white/35">
                    +{topicCount(school) - 5}
                  </li>
                )}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Ахиц / тоглоомжуулалт ─────────────────────── */

function Progress() {
  return (
    <section
      id="progress"
      className="scroll-mt-24 border-t border-white/5 bg-white/[0.02] py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Ахиц"
          title="Сурах дуртай болгодог гурван зүйл"
          description="Хүүхэд өөрийн ахицаа хараад л дахин суудаг. Гурван энгийн механик нь өдөр тутмын дадлыг барьж өгнө."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {MECHANICS.map(({ Icon, title, description, accent, tile }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-7"
            >
              <span
                className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${tile} text-white shadow-lg`}
              >
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className={`mt-5 text-lg font-bold ${accent}`}>{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Тэмцээн ─────────────────────── */

function Tournaments() {
  return (
    <section id="tournaments" className="scroll-mt-24 border-t border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Тэмцээн"
          title="Долоо хоног бүр шинэ өрсөлдөөн"
          description="Өдөр тутмын Arena-аас эхлээд улирлын шигшээ хүртэл — бэлэн бол шууд оролцоорой."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOURNAMENTS.map(({ title, detail, Icon, tile }) => (
            <div
              key={title}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5"
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${tile} text-white`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{title}</p>
                <p className="text-sm text-white/45">{detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
          >
            Тэмцээнд бүртгүүлэх
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Эцэг эх ─────────────────────── */

function Parents() {
  return (
    <section id="parents" className="scroll-mt-24 px-4 py-10">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-ink-800 to-ink-950 px-6 py-14 sm:px-12">
        <SectionHeading
          eyebrow="Эцэг эхэд"
          title="Хүүхдийнхээ явцыг хянаж, дэмжээрэй"
          description="Эцэг эхийн акаунтаас хүүхдээ холбож, суралцах замыг нь эндээс хянана."
        />

        <div className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PARENT_FEATURES.map(({ Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-brand-300">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-1 text-sm text-white/50">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────── Төгсгөлийн уриалга ─────────────────────── */

function FinalCta() {
  return (
    <section className="px-4 pb-20 pt-10">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-500 to-xp-500 px-6 py-14 text-center sm:px-12">
        <div
          className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-white/15 blur-3xl"
          aria-hidden
        />

        <h2 className="relative text-2xl font-extrabold text-white sm:text-3xl">
          Өнөөдөр анхны алхмаа хий
        </h2>
        <p className="relative mx-auto mt-3 max-w-lg text-white/80">
          Бүртгүүлэхэд 30 секунд. Эхний дасгал үнэгүй бөгөөд хэдхэн минут
          үргэлжилнэ.
        </p>
        <Link
          href="/register"
          className="relative mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-bold text-brand-700 shadow-lg transition-transform hover:-translate-y-0.5"
        >
          Үнэгүй бүртгүүлэх
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────── Хуваалцсан хэсгүүд ─────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-block rounded-full border border-brand-400/25 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-white/50">{description}</p>
    </div>
  );
}
