"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SponsorStrip, hasSponsor } from "@/components/tactiq/SponsorStrip";
import { gameTheme } from "@/lib/tactiq/gameTheme";
import { mnDay, mnTime } from "@/lib/tactiq/dateMn";
import { parseTournamentFormat, tournamentTypeLabel } from "@/lib/tactiq/tournamentFormat";
import { parseTournamentAccess, tournamentAccessLabel } from "@/lib/tactiq/tournament";
import { t } from "@/lib/i18n/t";

/**
 * ТЭМЦЭЭНИЙ САРЫН ХУАНЛИ.
 *
 * ⚠ ЯАГААД ХУАНЛИ ХЭРЭГТЭЙ ВЭ: жагсаалт нь «ОДОО юу байна» гэдгийг
 * хэлдэг ч «ЭНЭ САРД ямар өдрүүдэд тэмцээн байна» гэдгийг хэлдэггүй.
 * Хүүхэд, эцэг эх хоёулаа «бямба гаригт тэмцээн байдаг уу?» гэсэн
 * асуултад хуанлиас л хариу авна.
 *
 * ⚠ БҮТЭН ТӨЛӨВЛӨГӨӨГ харуулна (`upcoming`), зөвхөн бүртгүүлж болохыг
 * БИШ: давтамжтай тэмцээн зөвхөн тухайн өдрөө нээгддэг
 * (`/api/tournament/list`) ч хуанли дээр тэр өдрүүд ХАРАГДАХ ёстой —
 * эс тэгвэл хуанли нь өнөөдрөөс бусад өдөр хоосон болж, «тэмцээн
 * байхгүй» гэсэн худал мессеж өгнө.
 *
 * ⚠ ДАРААГИЙН САР РУУ гүйлгэж болно ч өгөгдөл нь 14 хоногоор
 * хязгаарлагдана (`materialiseSeries`-ийн хүрээ). Тиймээс хоосон
 * өдрүүдийг «тэмцээнгүй» гэж БИШ, «хараахан товлоогүй» гэж уншина —
 * доорх тайлбар мөр үүнийг хэлнэ.
 */

export type CalendarItem = {
  id: string;
  name: string;
  game: string;
  format: string;
  access: string;
  startsAt: string;
  durationMin: number;
  timeControl: string;
  recurring: boolean;
  /** ОДОО бүртгүүлж болох эсэх — давтамжтай нь зөвхөн тухайн өдөр. */
  open: boolean;
  /** ИВЭЭН ТЭТГЭГЧ — хоосон бол туузыг огт зурахгүй. */
  sponsorName: string;
  sponsorLogo: string;
  sponsorUrl: string;
  prize: string;
};

/** Ням гарагаас (`getDay()` = 0) эхэлсэн гарагийн товчлол. */
const WEEKDAY_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

const MONTHS = [
  "1 дүгээр сар",
  "2 дугаар сар",
  "3 дугаар сар",
  "4 дүгээр сар",
  "5 дугаар сар",
  "6 дугаар сар",
  "7 дугаар сар",
  "8 дугаар сар",
  "9 дүгээр сар",
  "10 дугаар сар",
  "11 дүгээр сар",
  "12 дугаар сар",
];

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

export function TournamentCalendar({ items }: { items: CalendarItem[] }) {
  const today = new Date();

  /** Харагдаж байгаа сар — түүний 1-р өдрөөр тэмдэглэнэ. */
  const [month, setMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  /** Сонгосон өдөр — `null` бол өнөөдөр. */
  const [selected, setSelected] = useState<Date>(today);

  /*
   * ⚠ ӨДӨР ТУТМЫН БҮЛЭГ — рендер бүрт дахин тооцно. `useMemo` хэрэггүй:
   * 14 хоногийн хэдэн арван элемент нь микросекундын ажил бөгөөд
   * хамаарлын массивыг буруу бичих эрсдэл нь тэр хэмнэлтээс үнэтэй.
   */
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = dayKey(new Date(item.startsAt));
    const list = byDay.get(key);
    if (list) list.push(item);
    else byDay.set(key, [item]);
  }

  /*
   * ТОРНЫ НҮДНҮҮД — сарын 1-ний гарагаас эхлүүлж, 7-ийн тоонд бөглөнө.
   *
   * ⚠ ДУУНД ДАВААГААР эхлүүлнэ (`getDay()` нь Нямаас эхэлдэг): Монголд
   * долоо хоног Даваагаар эхэлдэг тул Нямаар эхлүүлбэл эцэг эх амралтын
   * өдрийг буруу баганад хайна.
   */
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)
    ),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (delta: number) =>
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  const selectedItems = (byDay.get(dayKey(selected)) ?? []).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  return (
    <section className="space-y-3">
      {/* Сарын толгой — өмнөх/дараах */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label={t("Өмнөх сар")}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>

        <p className="text-sm font-bold text-gray-900 dark:text-white">
          {month.getFullYear()} · {MONTHS[month.getMonth()]}
        </p>

        <button
          type="button"
          onClick={() => shift(1)}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10"
          aria-label={t("Дараах сар")}
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_SHORT.map((label, index) => (
          <span
            key={label}
            /*
              ⚠ Гарагийн ТОЛГОЙ нь Даваагаар эхэлнэ: массив нь Нямаас
              эхэлдэг тул индексийг нэгээр шилжүүлнэ.
            */
            className="pb-1 text-[10px] font-bold text-gray-400"
          >
            {WEEKDAY_SHORT[(index + 1) % 7]}
          </span>
        ))}

        {cells.map((date, index) => {
          if (!date) return <span key={`empty-${index}`} />;

          const dayItems = byDay.get(dayKey(date)) ?? [];
          const isToday = dayKey(date) === dayKey(today);
          const isSelected = dayKey(date) === dayKey(selected);

          /*
           * ⚠ ЦЭГҮҮД нь ТОГЛООМЫН өнгөөр, дээд тал нь 3: 8 тэмцээнтэй
           * өдөрт 8 цэг зурвал нүд нь эрээвэр болж, тоо нь ч
           * уншигдахгүй. Гурав нь «олон» гэдгийг хэлэхэд хангалттай.
           */
          const dots = [...new Set(dayItems.map((item) => item.game))].slice(0, 3);

          return (
            <button
              key={dayKey(date)}
              type="button"
              onClick={() => setSelected(date)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs font-semibold transition-colors ${
                isSelected
                  ? "bg-brand-500 text-white"
                  : isToday
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200"
                    : dayItems.length > 0
                      ? "text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                      : "text-gray-300 dark:text-gray-600"
              }`}
              aria-label={`${date.getDate()} — ${dayItems.length} ${t("тэмцээн")}`}
            >
              <span>{date.getDate()}</span>
              <span className="flex h-1.5 items-center gap-0.5">
                {dots.map((game) => (
                  <span
                    key={game}
                    className={`size-1.5 rounded-full ${
                      isSelected ? "bg-white/80" : gameTheme(game).tile.split(" ")[0]
                    }`}
                    aria-hidden
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/*
        ⚠ ХОЁР ДОЛОО ХОНОГИЙН ХЯЗГААР: давтамжтай тэмцээнүүд 14 хоногийг
        урьдчилж үүсдэг тул түүнээс хойших өдрүүд ХООСОН харагдана. Тэр
        нь «тэмцээн байхгүй» гэсэн үг БИШ — хэрэглэгчид хэлэх ёстой.
      */}
      <p className="text-[11px] leading-snug text-gray-400">
        {t("Хуанли хоёр долоо хоногийн товыг харуулна. Түүнээс хойшхи нь хожим нэмэгдэнэ.")}
      </p>

      {/* СОНГОСОН ӨДРИЙН ТЭМЦЭЭНҮҮД */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{mnDay(selected)}</p>

        {selectedItems.length === 0 ? (
          <p className="rounded-xl bg-gray-50 px-4 py-4 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
            {t("Энэ өдөр товлогдсон тэмцээн алга.")}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {selectedItems.map((item) => {
              const theme = gameTheme(item.game);
              const accessLabel = tournamentAccessLabel(parseTournamentAccess(item.access));

              return (
                <li
                  key={item.id}
                  className={`flex items-center gap-2.5 rounded-xl border-l-4 bg-gray-50 p-2.5 dark:bg-white/5 ${theme.border}`}
                >
                  <span className="num w-11 shrink-0 text-sm font-extrabold tabular-nums text-gray-900 dark:text-white">
                    {mnTime(new Date(item.startsAt))}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
                      {item.name}
                    </p>
                    <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                      {tournamentTypeLabel(parseTournamentFormat(item.format), item.timeControl)}
                      {accessLabel ? ` · ${accessLabel}` : ""}
                    </p>
                    {/* ⚠ `compact`: хуанлийн мөр нарийн тул лого жижиг, нэг мөрөнд. */}
                    {hasSponsor(item) && (
                      <div className="mt-1">
                        <SponsorStrip item={item} compact />
                      </div>
                    )}
                  </div>

                  {/*
                    ⚠ ТОВЧ БАЙХГҮЙ, зөвхөн ТӨЛӨВ: бүртгэл нь доорх
                    жагсаалтад хийгддэг (тэнд төлбөр, квот, эрхийн
                    шалгалт бүгд бий). Хуанли дээр хоёр дахь бүртгэлийн
                    зам гаргавал хоёр өөр урсгал хөгжүүлж, нэг нь
                    хоцорно.
                  */}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.open
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                        : "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                    }`}
                  >
                    {item.open ? t("Бүртгэл нээлттэй") : t("Тэр өдөр нээгдэнэ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
