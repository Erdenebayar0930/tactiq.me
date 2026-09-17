"use client";

import { gameTheme } from "@/lib/tactiq/gameTheme";
import { mnDay, mnTime } from "@/lib/tactiq/dateMn";
import { t } from "@/lib/i18n/t";

/**
 * ТЭМЦЭЭНИЙ ЦАГИЙН ХУВААРЬ — lidraughts-ийн «Тэмцээнүүд» хуудасны загвар.
 *
 * ⚠ ЯАГААД ХУВААРЬ ХЭРЭГТЭЙ ВЭ: жагсаалт нь «ямар тэмцээн байна» гэдгийг
 * хэлдэг ч «ХЭЗЭЭ, хэр зэрэгцэж байна» гэдгийг хэлдэггүй. Тоглогч
 * «өнөөдөр 14:00-д нэг, 15:00-д нөгөө нь байна» гэдгийг хараад цагаа
 * төлөвлөнө. Зэрэгцээ тэмцээнүүд туузаараа давхарлан харагдана.
 *
 * ⚠ ЦАГ нь ХӨТӨЧИД форматлагдана: сервер UTC-ээр ажилладаг бөгөөд
 * хэрэглэгч Улаанбаатарын цагаар харах ёстой. Серверт форматлавал бүх
 * хүнд UTC гарна.
 */

export type ScheduleItem = {
  id: string;
  name: string;
  startsAt: string;
  durationMin: number;
  game: string;
  timeControl: string;
  registered: number;
  seats: number | null;
  isRegistered: boolean;
};

/** Нэг минут хэдэн пиксел — тууз хэт нарийн болохгүй хэмжээ. */
const PX_PER_MIN = 2.6;
/** Тэнхлэг дээр хэдэн минут тутамд цаг бичих вэ. */
const TICK_MIN = 30;

/*
 * ⚠ ОГНОО нь ГАРААР форматлагдана (`lib/tactiq/dateMn.ts`):
 * `toLocaleString("mn-MN")` нь монгол ICU байхгүй орчинд чимээгүйхэн
 * АНГЛИ руу буцдаг бөгөөд хуваарь дээр «Wed, September 16» гэж гарч
 * байв.
 */

/**
 * Хуваарийн ЭХЛЭЛ — одоогийн цагийг хамгийн сүүлийн 30 минутад бөөрөнхийлнө.
 *
 * ⚠ Хамгийн эрт тэмцээнээс эхлүүлэхгүй: тэр нь өнөөдрийн 22:00 байж
 * мэднэ, тэгвэл тэнхлэг нь «одоо» гэсэн цэггүй болж, хэрэглэгч хаана
 * байгаагаа мэдэхгүй.
 */
function timelineStart(items: ScheduleItem[], now: Date): Date {
  const earliest = items.reduce(
    (min, item) => Math.min(min, new Date(item.startsAt).getTime()),
    now.getTime()
  );
  const base = new Date(Math.min(earliest, now.getTime()));
  base.setMinutes(Math.floor(base.getMinutes() / TICK_MIN) * TICK_MIN, 0, 0);
  return base;
}

export function TournamentSchedule({
  items,
  onEnter,
}: {
  items: ScheduleItem[];
  /** Тэмцээн дээр дарахад — бүртгэлийн жагсаалт руу гүйлгэх зэрэг. */
  onEnter?: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
        {t("Одоогоор товлогдсон тэмцээн алга.")}
      </p>
    );
  }

  const now = new Date();
  const start = timelineStart(items, now);

  const sorted = [...items].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );

  const lastEnd = sorted.reduce((max, item) => {
    const end = new Date(item.startsAt).getTime() + item.durationMin * 60_000;
    return Math.max(max, end);
  }, start.getTime() + 2 * 60 * 60_000);

  const totalMin = Math.ceil((lastEnd - start.getTime()) / 60_000 / TICK_MIN) * TICK_MIN;
  const width = totalMin * PX_PER_MIN;

  const offsetMin = (iso: string) =>
    (new Date(iso).getTime() - start.getTime()) / 60_000;

  /*
   * ЭГНЭЭ ХУВААРИЛАЛТ — зэрэгцэх тэмцээнүүд дарагдахгүйн тулд.
   *
   * ⚠ Тууз бүрийг өөр эгнээнд тавихгүй: тэгвэл 20 тэмцээнтэй өдөр 20
   * эгнээ болж, хуудас хэт өндөр болно. Оронд нь ЗАЙ СУЛ эгнээг дахин
   * ашиглана (интервал хуваарилалт).
   */
  const rows: { endMin: number }[] = [];
  const placed = sorted.map((item) => {
    const from = offsetMin(item.startsAt);
    const to = from + item.durationMin;
    let row = rows.findIndex((r) => r.endMin <= from);
    if (row === -1) {
      rows.push({ endMin: to });
      row = rows.length - 1;
    } else {
      rows[row].endMin = to;
    }
    return { item, from, to, row };
  });

  const ticks = Array.from({ length: totalMin / TICK_MIN + 1 }, (_, index) => {
    const at = new Date(start.getTime() + index * TICK_MIN * 60_000);
    return { at, left: index * TICK_MIN * PX_PER_MIN };
  });

  const nowLeft = ((now.getTime() - start.getTime()) / 60_000) * PX_PER_MIN;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
        {mnDay(start)}
      </p>

      {/*
        ⚠ ХӨНДЛӨН ГҮЙЛГЭНЭ, багтаахгүй: цагийн тэнхлэгийг дэлгэцийн өргөнд
        шахвал 30 минутын зай нь хэдэн пиксел болж, туузан дээрх нэр
        уншигдахгүй болно. Гүйлгэх нь хуанли, хуваарийн ердийн зан.
      */}
      <div className="-mx-1 overflow-x-auto px-1 pb-2">
        <div className="relative" style={{ width, minWidth: "100%" }}>
          {/* Цагийн тэнхлэг */}
          <div className="relative mb-1 h-5">
            {ticks.map(({ at, left }) => (
              <span
                key={left}
                className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold text-gray-400"
                style={{ left }}
              >
                {mnTime(at)}
              </span>
            ))}
          </div>

          <div
            className="relative rounded-xl bg-gray-50 dark:bg-white/5"
            style={{ height: rows.length * 44 + 8 }}
          >
            {/* Хагас цаг тутмын хөндлөн зураас */}
            {ticks.map(({ left }) => (
              <span
                key={left}
                className="absolute inset-y-0 w-px bg-gray-200 dark:bg-white/10"
                style={{ left }}
                aria-hidden
              />
            ))}

            {/*
              «ОДОО» шугам — тоглогч хаана байгаагаа нэг харцад мэднэ.
              ⚠ Зөвхөн хүрээнд байвал зурна: хуваарь маргаашаас эхэлсэн
              бол шугам нь зүүн зах дээр гацаж, худал мэдээлэл болно.
            */}
            {nowLeft >= 0 && nowLeft <= width && (
              <span
                className="absolute inset-y-0 z-10 w-0.5 bg-rose-500"
                style={{ left: nowLeft }}
                aria-hidden
              />
            )}

            {placed.map(({ item, from, row }) => {
              const theme = gameTheme(item.game);
              const Icon = theme.Icon;
              const full = item.seats !== null && item.registered >= item.seats;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onEnter?.(item.id)}
                  title={`${item.name} · ${mnTime(new Date(item.startsAt))} · ${item.durationMin} ${t("мин")}`}
                  /*
                    ⚠ БҮРТГЭГДСЭН (ногоон) ба ДҮҮРСЭН (саарал) нь тоглоомын
                    өнгөнөөс ДАВУУ: тоглогчид «би орсон уу» гэдэг нь «ямар
                    тоглоом бэ» гэдгээс чухал. Тоглоомыг дүрс ба шошго
                    (дотор) хэлсээр байна.
                  */
                  className={`absolute flex items-center gap-1.5 overflow-hidden rounded-lg px-2 text-left text-white shadow-sm ${
                    item.isRegistered
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : full
                        ? "bg-gray-400 hover:bg-gray-400 dark:bg-gray-600"
                        : theme.bar
                  }`}
                  style={{
                    left: from * PX_PER_MIN,
                    // ⚠ Доод хязгаар: 20 минутын тэмцээн 52px болох тул нэр
                    // огт харагдахгүй. Тууз нь дор хаяж уншигдахуйц байх.
                    width: Math.max(item.durationMin * PX_PER_MIN, 120),
                    top: row * 44 + 4,
                    height: 36,
                  }}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-xs font-bold leading-tight">
                    {item.name}
                    {/*
                      ⚠ ТОГЛООМЫН НЭР туузан дээр БИЧИГДЭНЭ: өнгө, дүрс
                      хоёр нь гар утасны жижиг туузан дээр хангалтгүй.
                      Бичвэр нь хамгийн найдвартай дохио.
                    */}
                    <span className="block truncate text-[10px] font-semibold text-white/90">
                      {theme.label} · {item.timeControl} · {item.registered}
                      {item.seats === null ? "" : `/${item.seats}`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
