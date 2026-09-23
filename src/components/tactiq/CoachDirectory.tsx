"use client";

import { useState } from "react";
import Image from "next/image";
import { CircleDot, ImagePlus, Mail, MapPin, Phone, Link as LinkIcon, Swords, UserPen } from "lucide-react";

import { apiFetch, ApiError } from "@/lib/apiClient";
import { useApiData } from "@/hooks/useApiData";
import { useCurrentUser, useUser } from "@/context/UserContext";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { hasRole } from "@/lib/permissions";
import { isAdminRole } from "@/lib/permissions";
import { uploadImage } from "@/lib/uploadImage";
import { updateMe } from "@/lib/users";
import { t } from "@/lib/i18n/t";

/**
 * ДАСГАЛЖУУЛАГЧДЫН ЛАВЛАХ — «Дасгалжуулагч» таб дээр.
 *
 * ⚠ ЖАГСААЛТ нь ЗӨВХӨН багш өөрөө нийтэд гаргасан анкетуудыг харуулна
 * (`/api/coaches`). Хуурамч өгөгдөл ХЭЗЭЭ Ч оруулаагүй: хоосон
 * жагсаалт нь «багш алга» гэдгийг ҮНЭНЭЭР хэлэх нь зохиомол хүн
 * харуулж, сурагч дуудаад хүрэхгүй байхаас дээр.
 *
 * ⚠ ЗАСАХ ХЭЛБЭР нь ЗӨВХӨН БАГШИД харагдана: сурагчид тэр товч нь
 * ойлгомжгүй, дарвал 403 буцна.
 */

type Coach = {
  uid: string;
  title: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  link: string | null;
  address: string | null;
  teachesChess: boolean;
  teachesDraughts: boolean;
  priceMnt: number | null;
  displayName: string;
  photoUrl: string;
};

type Profile = {
  title: string | null;
  bio: string | null;
  phone: string | null;
  email: string | null;
  link: string | null;
  address: string | null;
  teachesChess: boolean;
  teachesDraughts: boolean;
  priceMnt: number | null;
  visible: boolean;
};

const EMPTY: Profile = {
  title: null,
  bio: null,
  phone: null,
  email: null,
  link: null,
  address: null,
  teachesChess: true,
  teachesDraughts: false,
  priceMnt: null,
  visible: false,
};

const money = (value: number) => value.toLocaleString("en-US").replace(/,/g, " ");

export function CoachDirectory() {
  const me = useCurrentUser();
  const { data, loading, error, reload } = useApiData<{ coaches: Coach[] }>("/api/coaches");
  const [editing, setEditing] = useState(false);

  const isTeacher = hasRole(me, "teacher") || isAdminRole(me.role);

  return (
    <div className="space-y-3">
      {/*
        ⚠ `flex-wrap`: «Мэдээллээ оруулах» товч нь урт бөгөөд гарчигтай
        нэг эгнээнд 360px дэлгэцэнд багтахгүй — багтахгүй үед доош
        буух нь хагас тасрахаас дээр.
      */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-gray-900 dark:text-white">{t("Дасгалжуулагч багш нар")}</h3>

        {isTeacher && (
          <button
            type="button"
            onClick={() => setEditing((value) => !value)}
            className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
          >
            <UserPen className="size-4 shrink-0" aria-hidden />
            {editing ? t("Болих") : t("Мэдээллээ оруулах")}
          </button>
        )}
      </div>

      {editing && isTeacher && (
        <CoachEditor
          onSaved={() => {
            setEditing(false);
            void reload();
          }}
        />
      )}

      {loading && <Skeleton className="h-24 w-full" />}
      {error && <ErrorNote message={error} onRetry={() => void reload()} />}

      {data && data.coaches.length === 0 && (
        <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500 dark:bg-white/5 dark:text-gray-400">
          {isTeacher
            ? t("Нийтэд харагдах анкет хараахан алга. Та мэдээллээ оруулж эхлүүлж болно.")
            : t("Дасгалжуулагчийн мэдээлэл хараахан ороогүй байна.")}
        </p>
      )}

      {data?.coaches.map((coach) => (
        <article key={coach.uid} className="surface space-y-2 p-4">
          <header className="flex items-center gap-3">
            {coach.photoUrl ? (
              <Image
                src={coach.photoUrl}
                alt=""
                aria-hidden
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gray-200 text-sm font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {(coach.displayName || "?").charAt(0).toUpperCase()}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-gray-900 dark:text-white">
                {coach.title || coach.displayName || t("Багш")}
              </p>
              <p className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                {/*
                  ⚠ ӨНГӨ + ДҮРС + БИЧВЭР гурвуулаа: утсан дээр зөвхөн
                  өнгөөр шатар, даамыг ялгах нь хангалтгүй
                  (`lib/tactiq/gameTheme.ts`).
                */}
                {coach.teachesChess && (
                  <span className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200">
                    <Swords className="size-3" aria-hidden />
                    {t("Шатар")}
                  </span>
                )}
                {coach.teachesDraughts && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                    <CircleDot className="size-3" aria-hidden />
                    {t("Даам")}
                  </span>
                )}
                <span className="text-gray-500 dark:text-gray-400">
                  {coach.priceMnt ? `${money(coach.priceMnt)}₮ / ${t("цаг")}` : t("Тохиролцоно")}
                </span>
              </p>
            </div>
          </header>

          {coach.bio && (
            <p className="whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
              {coach.bio}
            </p>
          )}

          <ul className="space-y-1 text-sm">
            {/*
              ⚠ `tel:` ба `mailto:` холбоос: утсан дээр дугаарыг гараар
              хуулах нь бүтэн нэг бэрхшээл — дарахад шууд залгах ёстой.
            */}
            {coach.phone && (
              <li>
                <a
                  href={`tel:${coach.phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-2 font-semibold text-brand-600 hover:underline dark:text-brand-300"
                >
                  <Phone className="size-4 shrink-0" aria-hidden />
                  {coach.phone}
                </a>
              </li>
            )}
            {coach.email && (
              <li>
                <a
                  href={`mailto:${coach.email}`}
                  className="flex items-center gap-2 text-gray-600 hover:underline dark:text-gray-300"
                >
                  <Mail className="size-4 shrink-0" aria-hidden />
                  {coach.email}
                </a>
              </li>
            )}
            {coach.link && (
              <li>
                <a
                  href={coach.link}
                  target="_blank"
                  /*
                   * ⚠ `noopener noreferrer`: гадаад хуудас манай табыг
                   * `window.opener`-ээр удирдах боломжгүй байх ёстой.
                   */
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 truncate text-gray-600 hover:underline dark:text-gray-300"
                >
                  <LinkIcon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{coach.link}</span>
                </a>
              </li>
            )}
            {coach.address && (
              <li className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {coach.address}
              </li>
            )}
          </ul>
        </article>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// БАГШИЙН АНКЕТ ЗАСАХ
// ---------------------------------------------------------------------------

const field =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-400 dark:border-white/10 dark:bg-white/5 dark:text-white";


/** Профайл зураг 5MB-ээс бага — `storage.rules`-ийн хязгаартай ИЖИЛ. */
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * БАГШИЙН ЗУРАГ — анкетын хэлбэрээс шууд байршуулна.
 *
 * ⚠ ТУСДАА ТАЛБАР ҮҮСГЭХГҮЙ, ПРОФАЙЛЫН ЗУРГИЙГ солино.
 * Лавлах нь аль хэдийн `users.photoUrl`-ыг үзүүлдэг (`/api/coaches`).
 * Анкетад хоёр дахь зураг нэмвэл багш «аль нь хаана гарах юм бэ?»
 * гэж эрэгэлзэж, хоёр газар тус тусдаа хадгалах болно.
 *
 * ⚠ СТОРАЖЫН ДҮРЭМ АЛЬ ХЭДИЙН ЗӨВШӨӨРДӨГ: `profile_photos/{uid}`
 * замд ЭЗЭН нь өөрөө бичнэ. Тиймээс шинэ дүрэм, deploy хэрэггүй.
 *
 * ⚠ Storage SDK-г ХЭРЭГЦЭЭ ГАРСАН ҮЕД татна (`settings/page.tsx`-тай
 * ижил): модулийн түвшинд импортлобол тэмцээний хуудсын эхний
 * багцад орно — бодит хэрэглээ нь зөвхөн энэ товч.
 */
function CoachPhotoPicker() {
  const { user, apply } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setError(t("Зөвхөн зургийн файл сонгоно уу."));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t("Зургийн хэмжээ 5MB-ээс бага байх ёстой."));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const url = await uploadImage("profile", file);

      // ⚠ Анкеттай ХАМТ биш, ТЭР ДОР НЬ хадгална: багш зургаа
      // солихад шууд харах ёстой, «Хадгалах» дарахыг хүлээхгүй.
      apply(await updateMe({ photoUrl: url }));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Зураг байршуулахад алдаа гарлаа."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
      <span className="block text-xs font-bold text-gray-600 dark:text-gray-300">
        {t("Зураг")}
        <span className="ml-1 font-normal text-gray-400">
          {" — "}
          {t("жагсаалтад нэрийнхээ хажууд гарна")}
        </span>
      </span>

      <div className="flex items-center gap-3">
        {user.photoUrl ? (
          <Image
            src={user.photoUrl}
            alt=""
            aria-hidden
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gray-200 text-lg font-bold text-gray-600 dark:bg-white/10 dark:text-gray-300">
            {(user.displayName || "?").charAt(0).toUpperCase()}
          </span>
        )}

        <label className="cursor-pointer rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:bg-white/10 dark:text-gray-200">
          <span className="flex items-center gap-1.5">
            <ImagePlus className="size-4 shrink-0" aria-hidden />
            {busy ? t("Байршуулж байна…") : t("Файл сонгох")}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} />
        </label>
      </div>

      {error && <ErrorNote message={error} />}
    </div>
  );
}

function CoachEditor({ onSaved }: { onSaved: () => void }) {
  const { data, loading } = useApiData<{ profile: Profile | null }>("/api/coaches/me");
  const [form, setForm] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * ⚠ Сервэрийн утгыг ЗӨВХӨН эхний удаа хуулна (`form === null`):
   * `useApiData` дахин татахад бичиж байгаа текстийг дарж бичвэл
   * багшийн хөдөлмөр алга болно.
   */
  const value = form ?? data?.profile ?? (data ? EMPTY : null);

  if (loading || !value) return <Skeleton className="h-64 w-full" />;

  const set = <K extends keyof Profile>(key: K, next: Profile[K]) =>
    setForm({ ...value, [key]: next });

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      /*
       * ⚠ ОБЪЕКТЫГ ШУУД ӨГНӨ, `JSON.stringify` ХИЙХГҮЙ:
       * `apiFetch` өөрөө хөрвүүлдэг. Давхар stringify хийхэд
       * сервер рүү ОБЪЕКТ БИШ, ЦАГААН ТОЛГОЙ очих тул `body.phone`
       * гэх мэт бүгд `undefined` болно — анкет бүхэлдээ `null`-ээр
       * дарагдана. БОДИТООР ТОХИОЛДСОН: багш анкетаа бөглөөд
       * хадгалахад бүх талбар хоосон устаж байв.
       */
      await apiFetch("/api/coaches/me", { method: "PUT", body: value });
      onSaved();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : t("Хадгалахад алдаа гарлаа."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface space-y-3 p-4">
      {error && <ErrorNote message={error} />}

      {/*
        ⚠ ЗУРАГ ХАМГИЙН ДЭЭР ТАЛД: жагсаалт дээр хамгийн түрүүнд
        нүдэнд тусдаг зүйл тул хэлбэрт ч тэр дарааллаар байх нь
        «юу харагдахыг» анхнаасаа хэлнэ.
      */}
      <CoachPhotoPicker />

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {t("Нийтэд харагдах нэр, зэрэг")}
        </span>
        <input
          className={field}
          value={value.title ?? ""}
          onChange={(event) => set("title", event.target.value)}
          placeholder={t("Б. Батаа — спортын мастер")}
          maxLength={80}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {t("Танилцуулга")}
        </span>
        <textarea
          className={`${field} min-h-24`}
          value={value.bio ?? ""}
          onChange={(event) => set("bio", event.target.value)}
          placeholder={t("Туршлага, ямар насны хүүхэдтэй ажилладаг, хаана хичээллэдэг…")}
          maxLength={2000}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {t("Утас")}
          </span>
          <input
            className={field}
            value={value.phone ?? ""}
            onChange={(event) => set("phone", event.target.value)}
            inputMode="tel"
            placeholder="9911 2233"
            maxLength={32}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {t("И-мэйл")}
          </span>
          <input
            className={field}
            value={value.email ?? ""}
            onChange={(event) => set("email", event.target.value)}
            inputMode="email"
            placeholder="bataa@example.com"
            maxLength={190}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {t("Холбоос (Facebook, веб)")}
          </span>
          <input
            className={field}
            value={value.link ?? ""}
            onChange={(event) => set("link", event.target.value)}
            placeholder="https://facebook.com/…"
            maxLength={300}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {t("Хаяг")}
          </span>
          <input
            className={field}
            value={value.address ?? ""}
            onChange={(event) => set("address", event.target.value)}
            placeholder={t("Сүхбаатар дүүрэг, 1-р хороо")}
            maxLength={200}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {t("Нэг цагийн үнэ (₮) — хоосон бол «тохиролцоно»")}
          </span>
          <input
            className={field}
            value={value.priceMnt ?? ""}
            onChange={(event) => {
              const next = Number(event.target.value.replace(/\D/g, ""));
              set("priceMnt", next > 0 ? next : null);
            }}
            inputMode="numeric"
            placeholder="25000"
          />
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {t("Заадаг тоглоом")}
        </legend>
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-gray-700 dark:text-gray-200">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.teachesChess}
              onChange={(event) => set("teachesChess", event.target.checked)}
              className="size-4"
            />
            <Swords className="size-4 text-indigo-600 dark:text-indigo-300" aria-hidden />
            {t("Шатар")}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value.teachesDraughts}
              onChange={(event) => set("teachesDraughts", event.target.checked)}
              className="size-4"
            />
            <CircleDot className="size-4 text-amber-500" aria-hidden />
            {t("Даам")}
          </label>
        </div>
      </fieldset>

      {/*
        ⚠ НУУЦЛАЛЫН ТОВЧ нь ИЛ: анкет анхдагчаар НУУЦ. Багш өөрөө
        зөвшөөрөх хүртэл утас, хаяг нь хэнд ч харагдахгүй.
      */}
      <label className="flex items-start gap-2 rounded-xl bg-gray-50 p-3 text-sm dark:bg-white/5">
        <input
          type="checkbox"
          checked={value.visible}
          onChange={(event) => set("visible", event.target.checked)}
          className="mt-0.5 size-4"
        />
        <span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {t("Нийтэд харуулах")}
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {t("Сонгоогүй бол анкет зөвхөн танд харагдана.")}
          </span>
        </span>
      </label>

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className="w-full rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {busy ? t("Хадгалж байна…") : t("Хадгалах")}
      </button>
    </div>
  );
}
