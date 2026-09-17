"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Repeat, Trash2 } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { gameTheme } from "@/lib/tactiq/gameTheme";
import { mnDateTime } from "@/lib/tactiq/dateMn";
import { TOURNAMENT_ACCESS, tournamentAccessLabel } from "@/lib/tactiq/tournament";
import {
  FORMAT_INFO,
  SPEED_INFO,
  TOURNAMENT_FORMATS,
  parseTournamentFormat,
  speedFromTimeControl,
  tournamentTypeLabel,
} from "@/lib/tactiq/tournamentFormat";
import { t } from "@/lib/i18n/t";

/**
 * АДМИН — ТЭМЦЭЭНИЙ ТОВ ба ДАВТАМЖТАЙ СЕРИ.
 *
 * ХОЁР ХЭСЭГ бөгөөд тэдгээр нь ӨӨР ЗҮЙЛ:
 *
 *   ТОВ  — тодорхой өдөр, цагт болох НЭГ тэмцээн («10 сарын 5-нд 14:00»).
 *          Олон хоногийн дараах ч байж болно.
 *   СЕРИ — ТӨЛӨВЛӨГӨӨ («өдөр бүр 20:00»). Тэмцээнүүд нь түүнээс 14
 *          хоногийг автоматаар үүсгэнэ (`materialiseSeries`).
 *
 * ⚠ Хоёрыг НЭГТГЭХГҮЙ: «давтагдах эсэх» гэсэн чагттай нэг форм болговол
 * админ давтамжтай товыг санамсаргүй нэг удаагийн болгож, эсрэгээр
 * нэг удаагийн тэмцээнийг өдөр бүр давтуулах эрсдэлтэй. Хоёр өөр
 * зорилготой зүйл нь хоёр өөр форм байх нь дээр.
 *
 * ⚠ ЦАГ нь UTC-ээр илгээгдэнэ: тэмцээний сервер UTC дээр ажилладаг.
 * Талбар нь `datetime-local` тул хөтөч орон нутгийн цагийг өгнө —
 * `new Date(value).toISOString()` нь хөрвүүлэлтийг өөрөө хийнэ.
 */

type Series = {
  id: string;
  name: string;
  category: string;
  game: string;
  access: string;
  durationMin: number;
  timeControl: string;
  seats: number | null;
  entryFeeMnt: number;
  startTime: string;
  weekdays: number;
  active: boolean;
  /** "arena" | "swiss" | "knockout" | "team". */
  format: string;
};

type Tournament = {
  id: string;
  name: string;
  game: string;
  access: string;
  startsAt: string;
  durationMin: number;
  timeControl: string;
  seats: number | null;
  registered: number;
  entryFeeMnt: number;
  status: string;
  format: string;
};

/** Бит 0 = Ням … 6 = Бям (`Date.getUTCDay()`-тэй ижил дараалал). */
const WEEKDAYS = ["Ням", "Дав", "Мяг", "Лха", "Пүр", "Баа", "Бям"];

const GAMES = [
  { key: "chess", label: "Шатар" },
  { key: "checkers", label: "Даам" },
];

/** Шинэ мөрийн анхдагч — хамгийн түгээмэл тохиргоо. */
const BLANK = {
  id: "",
  name: "",
  game: "chess",
  format: "arena",
  access: "open",
  timeControl: "3+2",
  durationMin: 60,
  seats: "",
  entryFeeMnt: 0,
  sponsorName: "",
  sponsorLogo: "",
  sponsorUrl: "",
  prize: "",
};

export default function AdminTournamentsPage() {
  const [series, setSeries] = useState<Series[] | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, b] = await Promise.all([
        apiFetch<{ series: Series[] }>("/api/admin/tournament/series"),
        apiFetch<{ tournaments: Tournament[] }>("/api/admin/tournament/tov"),
      ]);
      setSeries(a.series);
      setTournaments(b.tournaments);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
      setSeries([]);
      setTournaments([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const send = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(done);
      await load();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Алдаа гарлаа."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">
          {t("Тэмцээний тов")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("Нэг удаагийн тов, эсвэл өдөр бүр давтагдах автомат тэмцээн.")}
        </p>
      </div>

      {error && <ErrorNote message={error} onRetry={() => void load()} />}
      {notice && (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {notice}
        </p>
      )}

      <OneOffSection
        tournaments={tournaments}
        busy={busy}
        onSave={(body) =>
          void send(
            () => apiFetch("/api/admin/tournament/tov", { method: "POST", body }),
            t("Тов хадгалагдлаа.")
          )
        }
        onDelete={(id) =>
          void send(
            () =>
              apiFetch(`/api/admin/tournament/tov?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
              }),
            t("Тов цуцлагдлаа.")
          )
        }
      />

      <SeriesSection
        series={series}
        busy={busy}
        onSave={(body) =>
          void send(
            () => apiFetch("/api/admin/tournament/series", { method: "POST", body }),
            t("Сери хадгалагдлаа — тэмцээнүүд автоматаар үүслээ.")
          )
        }
        onToggle={(id, active) =>
          void send(
            () =>
              apiFetch("/api/admin/tournament/series", {
                method: "PATCH",
                body: { id, active },
              }),
            active ? t("Сери асав.") : t("Сери унтарлаа.")
          )
        }
        onDelete={(id) =>
          void send(
            () =>
              apiFetch(`/api/admin/tournament/series?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
              }),
            t("Сери устгагдлаа.")
          )
        }
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// НЭГ УДААГИЙН ТОВ
// ---------------------------------------------------------------------------

function OneOffSection({
  tournaments,
  busy,
  onSave,
  onDelete,
}: {
  tournaments: Tournament[] | null;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState({ ...BLANK, startsAt: "" });

  const submit = () => {
    onSave({
      ...form,
      seats: form.seats === "" ? null : Number(form.seats),
      category: form.game,
      /*
       * ⚠ `datetime-local` нь ОРОН НУТГИЙН цагийг текстээр өгдөг;
       * `new Date()` түүнийг хөтчийн бүсээр уншаад `toISOString()` нь
       * UTC болгоно. Текстийг шууд илгээвэл сервер UTC гэж уншиж,
       * тэмцээн 8 цагаар зөрнө.
       */
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : "",
    });
  };

  return (
    <section className="surface space-y-4 p-4">
      <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
        <CalendarPlus className="size-5 shrink-0 text-brand-500" aria-hidden />
        {t("Нэг удаагийн тов")}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("ID (латинаар)")}>
          <input
            value={form.id}
            onChange={(event) => setForm({ ...form, id: event.target.value })}
            placeholder="mind-arena-oct"
            className={inputClass}
          />
        </Field>
        <Field label={t("Нэр")}>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Оюуны арена"
            className={inputClass}
          />
        </Field>
        <Field label={t("Эхлэх мөч")}>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label={t("Цагийн хяналт")}>
          <input
            value={form.timeControl}
            onChange={(event) => setForm({ ...form, timeControl: event.target.value })}
            placeholder="3+2"
            className={inputClass}
          />
          {/*
            ⚠ ХУРД нь ЭНДЭЭС тооцогдоно — админ юу бичихээ хараад мэдэх
            ёстой. «30+0» бичээд «Bullet» гэж бодох нь хамгийн түгээмэл
            андуурал.
          */}
          <span className="block text-[11px] font-semibold text-gray-400">
            {SPEED_INFO[speedFromTimeControl(form.timeControl)].emoji}{" "}
            {SPEED_INFO[speedFromTimeControl(form.timeControl)].label}
          </span>
        </Field>
        <SharedFields form={form} setForm={setForm} />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {t("Тов хадгалах")}
      </button>

      {tournaments === null ? (
        <Skeleton className="h-16 w-full" />
      ) : tournaments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("Товлогдсон тэмцээн алга.")}</p>
      ) : (
        <ul className="space-y-2">
          {tournaments.map((row) => {
            const theme = gameTheme(row.game);
            return (
              <li
                key={row.id}
                className={`flex flex-wrap items-center gap-2 rounded-xl border-l-4 bg-gray-50 p-3 dark:bg-white/5 ${theme.border}`}
              >
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${theme.chip}`}>
                  {theme.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {row.name}
                </span>
                <span className="num text-xs text-gray-500 dark:text-gray-400">
                  {mnDateTime(new Date(row.startsAt))} · {row.durationMin} {t("мин")}
                </span>
                {/*
                  ⚠ БҮРТГЭЛТЭЙ тэмцээнийг сервер УСТГАХГҮЙ, «canceled»
                  болгоно — тиймээс товч нь «Цуцлах». Хоосон тов бол
                  бүрмөсөн устгагдана.
                */}
                <span className="text-xs text-gray-400">
                  {row.registered}
                  {row.seats === null ? "" : `/${row.seats}`}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(row.id)}
                  disabled={busy}
                  className="shrink-0 rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  aria-label={t("Цуцлах")}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// ДАВТАМЖТАЙ СЕРИ
// ---------------------------------------------------------------------------

function SeriesSection({
  series,
  busy,
  onSave,
  onToggle,
  onDelete,
}: {
  series: Series[] | null;
  busy: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState({ ...BLANK, startTime: "20:00", weekdays: 127 });

  const toggleDay = (day: number) =>
    setForm({ ...form, weekdays: form.weekdays ^ (1 << day) });

  return (
    <section className="surface space-y-4 p-4">
      <h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
        <Repeat className="size-5 shrink-0 text-amber-500" aria-hidden />
        {t("Автомат давтамжтай тэмцээн")}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t("Сонгосон гарагуудад, тухайн цагт тэмцээн автоматаар үүснэ (14 хоногийг урьдчилж).")}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("ID (латинаар)")}>
          <input
            value={form.id}
            onChange={(event) => setForm({ ...form, id: event.target.value })}
            placeholder="daily-blitz"
            className={inputClass}
          />
        </Field>
        <Field label={t("Нэр")}>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Өдрийн блиц"
            className={inputClass}
          />
        </Field>
        <Field label={t("Эхлэх цаг (орон нутгийн)")}>
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => setForm({ ...form, startTime: event.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label={t("Цагийн хяналт")}>
          <input
            value={form.timeControl}
            onChange={(event) => setForm({ ...form, timeControl: event.target.value })}
            placeholder="3+2"
            className={inputClass}
          />
          {/*
            ⚠ ХУРД нь ЭНДЭЭС тооцогдоно — админ юу бичихээ хараад мэдэх
            ёстой. «30+0» бичээд «Bullet» гэж бодох нь хамгийн түгээмэл
            андуурал.
          */}
          <span className="block text-[11px] font-semibold text-gray-400">
            {SPEED_INFO[speedFromTimeControl(form.timeControl)].emoji}{" "}
            {SPEED_INFO[speedFromTimeControl(form.timeControl)].label}
          </span>
        </Field>
        <SharedFields form={form} setForm={setForm} />
      </div>

      <Field label={t("Гарагууд")}>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((label, day) => {
            const on = (form.weekdays & (1 << day)) !== 0;
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(day)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                  on
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Field>

      <button
        type="button"
        onClick={() =>
          onSave({
            ...form,
            seats: form.seats === "" ? null : Number(form.seats),
            category: form.game,
            /*
             * ⚠ ОРОН НУТГИЙН цагийг UTC болгоно: сервер `start_time`-ыг
             * UTC гэж үздэг. Хөрвүүлэхгүй бол «20:00» гэж тохируулсан
             * тэмцээн 04:00-д болно.
             */
            startTime: localTimeToUtc(form.startTime),
          })
        }
        disabled={busy}
        className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
      >
        {t("Сери хадгалах")}
      </button>

      {series === null ? (
        <Skeleton className="h-16 w-full" />
      ) : series.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t("Давтамжтай тэмцээн алга.")}</p>
      ) : (
        <ul className="space-y-2">
          {series.map((row) => {
            const theme = gameTheme(row.game);
            return (
              <li
                key={row.id}
                className={`flex flex-wrap items-center gap-2 rounded-xl border-l-4 bg-gray-50 p-3 dark:bg-white/5 ${theme.border}`}
              >
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${theme.chip}`}>
                  {theme.label}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {row.name}
                  {tournamentAccessLabel(
                    row.access === "members" || row.access === "mind" ? row.access : "open"
                  ) && (
                    <span className="ml-2 text-[10px] font-bold text-violet-600 dark:text-violet-300">
                      {tournamentAccessLabel(
                        row.access === "members" || row.access === "mind" ? row.access : "open"
                      )}
                    </span>
                  )}
                </span>
                <span className="num text-xs text-gray-500 dark:text-gray-400">
                  {utcTimeToLocal(row.startTime)} · {daysLabel(row.weekdays)}
                  {" · "}
                  {tournamentTypeLabel(parseTournamentFormat(row.format), row.timeControl)}
                </span>
                <button
                  type="button"
                  onClick={() => onToggle(row.id, !row.active)}
                  disabled={busy}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold disabled:opacity-60 ${
                    row.active
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                  }`}
                >
                  {row.active ? t("Ажиллаж байна") : t("Унтраасан")}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(row.id)}
                  disabled={busy}
                  className="shrink-0 rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  aria-label={t("Устгах")}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// ХУВААЛЦСАН ТАЛБАРУУД
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      {children}
    </label>
  );
}

/**
 * Тов, сери ХОЁУЛАНД байдаг талбарууд.
 *
 * ⚠ Хоёр форм дээр тус тусад нь бичвэл нэг талд нэмсэн талбар нөгөөд
 * хоцорч, «сери дээр оролцох эрх тохируулах боломжгүй» гэсэн эвдрэл
 * гарна.
 */
function SharedFields<T extends typeof BLANK>({
  form,
  setForm,
}: {
  form: T;
  setForm: (next: T) => void;
}) {
  return (
    <>
      <Field label={t("Тоглоом")}>
        <select
          value={form.game}
          onChange={(event) => setForm({ ...form, game: event.target.value })}
          className={inputClass}
        >
          {GAMES.map((game) => (
            <option key={game.key} value={game.key}>
              {game.label}
            </option>
          ))}
        </select>
      </Field>
      {/*
        ⚠ ХЭЛБЭР — «Arena / Швейцар / Хасагдах / Багийн». ХУРД
        (Bullet/Blitz/Rapid/Classical) нь ЭНД БАЙХГҮЙ: цагийн хяналтаас
        тооцогдоно (`lib/tactiq/tournamentFormat.ts`). Талбар болговол
        админ «Bullet» гэж сонгоод «30+0» бичих боломжтой болж, хоёр нь
        үүрд зөрнө.
      */}
      <Field label={t("Хэлбэр")}>
        <select
          value={form.format}
          onChange={(event) => setForm({ ...form, format: event.target.value })}
          className={inputClass}
        >
          {TOURNAMENT_FORMATS.map((format) => (
            <option key={format} value={format}>
              {FORMAT_INFO[format].emoji} {FORMAT_INFO[format].label}
            </option>
          ))}
        </select>
        {/* ⚠ Хэлбэр бүр ӨӨР дүрэмтэй — админ юу сонгосноо мэдэх ёстой. */}
        <span className="block text-[11px] leading-snug text-gray-400">
          {FORMAT_INFO[parseTournamentFormat(form.format)].hint}
        </span>
      </Field>
      <Field label={t("Оролцох эрх")}>
        <select
          value={form.access}
          onChange={(event) => setForm({ ...form, access: event.target.value })}
          className={inputClass}
        >
          {TOURNAMENT_ACCESS.map((access) => (
            <option key={access} value={access}>
              {access === "open" ? t("Хүн бүр") : (tournamentAccessLabel(access) ?? access)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("Үргэлжлэх (мин)")}>
        <input
          type="number"
          min={5}
          max={720}
          value={form.durationMin}
          onChange={(event) => setForm({ ...form, durationMin: Number(event.target.value) })}
          className={inputClass}
        />
      </Field>
      <Field label={t("Суудал (хоосон = хязгааргүй)")}>
        <input
          type="number"
          min={2}
          value={form.seats}
          onChange={(event) => setForm({ ...form, seats: event.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label={t("Оролцох төлбөр (₮)")}>
        <input
          type="number"
          min={0}
          value={form.entryFeeMnt}
          onChange={(event) => setForm({ ...form, entryFeeMnt: Number(event.target.value) })}
          className={inputClass}
        />
      </Field>

      {/*
        ИВЭЭН ТЭТГЭГЧ — БҮГД СОНГОМОЛ.

        ⚠ Нэр хоосон бол тууз ОГТ гарахгүй (`SponsorStrip`): лого,
        холбоос нь нэргүйгээр утгагүй тул нэрийг гол дохио болгов.
      */}
      <Field label={t("Ивээн тэтгэгч (сонгомол)")}>
        <input
          value={form.sponsorName}
          onChange={(event) => setForm({ ...form, sponsorName: event.target.value })}
          placeholder="Хаан банк"
          className={inputClass}
        />
      </Field>
      <Field label={t("Шагнал")}>
        <input
          value={form.prize}
          onChange={(event) => setForm({ ...form, prize: event.target.value })}
          placeholder="1-р шагнал: 100,000₮"
          className={inputClass}
        />
      </Field>
      <Field label={t("Логоны хаяг")}>
        <input
          value={form.sponsorLogo}
          onChange={(event) => setForm({ ...form, sponsorLogo: event.target.value })}
          placeholder="/images/sponsors/khan.webp"
          className={inputClass}
        />
        {/*
          ⚠ ХЯЗГААРЛАЛТЫГ ЭНД БИЧНЭ: аппын CSP нь дурын домэйны зургийг
          ЧИМЭЭГҮЙ хаадаг. Админд хэлэхгүй бол «яагаад лого гарахгүй
          байна» гэж хайх бөгөөд консолоос өөр газар алдаа гарахгүй.
        */}
        <span className="block text-[11px] leading-snug text-gray-400">
          {t("Зөвхөн аппын өөрийн зам (/images/…) эсвэл Firebase Storage-ийн хаяг.")}
        </span>
      </Field>
      <Field label={t("Ивээн тэтгэгчийн холбоос")}>
        <input
          value={form.sponsorUrl}
          onChange={(event) => setForm({ ...form, sponsorUrl: event.target.value })}
          placeholder="https://..."
          className={inputClass}
        />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------
// ЦАГИЙН БҮСИЙН ХӨРВҮҮЛЭЛТ
// ---------------------------------------------------------------------------

/**
 * ⚠ Сервер `start_time`-ыг UTC гэж үздэг, админ орон нутгийн цагаар
 * бичдэг. Хөрвүүлэхгүй бол «20:00» гэж тохируулсан тэмцээн
 * Улаанбаатарт 04:00-д болно.
 *
 * ⚠ ӨНӨӨДРИЙН огноогоор хөрвүүлнэ: Монголд зуны цаг байхгүй тул
 * шилжилт нь тогтмол бөгөөд аль өдөр авах нь ялгаагүй.
 */
function localTimeToUtc(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const local = new Date();
  local.setHours(hours, minutes, 0, 0);
  return `${String(local.getUTCHours()).padStart(2, "0")}:${String(local.getUTCMinutes()).padStart(2, "0")}`;
}

function utcTimeToLocal(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const at = new Date();
  at.setUTCHours(hours, minutes, 0, 0);
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/** «Өдөр бүр» эсвэл «Дав, Лха, Бям». */
function daysLabel(mask: number): string {
  if (mask === 127) return t("Өдөр бүр");
  return WEEKDAYS.filter((_, day) => (mask & (1 << day)) !== 0).join(", ");
}
