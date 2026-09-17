"use client";

import { useEffect, useState } from "react";
import { disablePush, enablePush } from "@/lib/push";
import { Camera, Laptop, Trash2 } from "lucide-react";

import { useLocale } from "@/context/LocaleContext";
import { useTheme } from "@/context/ThemeContext";
import { useCurrentUser, useUser } from "@/context/UserContext";
import MyCodeCard from "@/components/tactiq/MyCodeCard";
import { ErrorNote, Skeleton } from "@/components/tactiq/ui";
import { useApiData } from "@/hooks/useApiData";
import { apiFetch } from "@/lib/apiClient";
import { getStorageLazy } from "@/lib/firebase";
import { sendResetEmail, updateMe } from "@/lib/users";
import { isStudentRole } from "@/lib/permissions";
import { signOutCompletely } from "@/lib/session";

import type { ClientDeviceInfo } from "@/context/UserContext";
import { t } from "@/lib/i18n/t";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Firebase Storage-ийн алдааг хүн уншиж ойлгох мессеж болгоно.
 *
 * ⚠ ЯАГААД ХЭРЭГТЭЙ ВЭ: SDK-ийн ӨӨРИЙНХ нь мессеж нь шалтгааныг бараг үргэлж
 * нуудаг. Хамгийн муу тохиолдол нь bucket ОГТ ҮҮСЭЭГҮЙ үе: сервер 404
 * буцаахад SDK түүнийг тусад нь танихгүй (`sharedErrorHandler` нь зөвхөн
 * 401/402/403-ыг ялгадаг) тул "Firebase Storage: An unknown error occurred"
 * гэсэн утгагүй мөр л үлдэнэ. Хэрэглэгч "зураг ажиллахгүй байна" гэж мэдээлэх
 * боловч жинхэнэ шалтгаан нь Firebase Console дээр Storage-ыг асаагаагүйд
 * байдаг — үүнийг ил хэлж өгвөл олон цагийн эрэл хэмнэнэ.
 */
function photoUploadMessage(cause: unknown): string {
  const code = (cause as { code?: string } | null)?.code ?? "";
  const status = (cause as { status?: number } | null)?.status;

  if (code === "storage/unauthorized") {
    return t("Зураг байршуулах эрх алга. Storage-ийн дүрэм (storage.rules) байршуулагдсан эсэхийг шалгана уу.");
  }
  if (code === "storage/unauthenticated") {
    return t("Нэвтрэлт хүчингүй боллоо. Дахин нэвтэрч үзнэ үү.");
  }
  if (code === "storage/quota-exceeded") {
    return t("Storage-ийн багтаамж дүүрсэн байна.");
  }
  if (code === "storage/retry-limit-exceeded") {
    return t("Сүлжээ удаан байна. Дахин оролдоно уу.");
  }
  if (code === "storage/bucket-not-found" || status === 404) {
    return (
      t("Firebase Storage энэ төсөл дээр үүсээгүй байна. Firebase Console → ") +
      t("Build → Storage → Get started дарж идэвхжүүлээд, дараа нь ") +
      t("`firebase deploy --only storage` гүйцэтгэнэ үү.")
    );
  }

  return cause instanceof Error
    ? `Зураг байршуулахад алдаа гарлаа: ${cause.message}`
    : t("Зураг байршуулахад алдаа гарлаа.");
}

/** Тохиргоо (#12 дэлгэц). */
export default function SettingsPage() {
  const user = useCurrentUser();
  const { apply } = useUser();
  const { preference, setPreference } = useTheme();
  const { setLocale, t } = useLocale();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [dailyGoal, setDailyGoal] = useState(user.dailyGoal);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Хөтчийн зөвшөөрөл, токентой холбоотой алдаа — санд бичихээс тусдаа. */
  const [pushError, setPushError] = useState<string | null>(null);

  const initial = (user.displayName || user.email || "?").charAt(0).toUpperCase();

  /**
   * Мэдэгдлийг хэсэг хугацааны дараа арилгана.
   *
   * Үлдээвэл хэрэглэгч дараагийн талбар засахад "Хадгаллаа" гэсэн хуучин
   * мэдэгдэл харагдсаар байж, шинэ өөрчлөлт хадгалагдсан мэт төөрөгдүүлнэ.
   */
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  /**
   * МЭДЭГДЭЛ — хүслийг санд, зөвшөөрлийг хөтчид.
   *
   * ⚠ ЭХЛЭЭД ХӨТЧӨӨС асууна, дараа нь санд бичнэ: зөвшөөрөл олгогдоогүй
   * байхад «асаалттай» гэж бичвэл сурагч мэдэгдэл хүлээгээд ирэхгүй.
   * Сервер тал ч токенгүй хүнд юу ч илгээж чадахгүй
   * (`lib/api/tournamentReminders.ts`).
   */
  const toggleNotifications = async (value: boolean) => {
    setPushError(null);

    if (value) {
      const result = await enablePush();
      if (!result.ok) {
        setPushError(result.reason ?? t("Мэдэгдэл асаахад алдаа гарлаа."));
        return;
      }
    } else {
      await disablePush();
    }

    await persist({ notificationsEnabled: value });
  };

  /** Аль ч талбарыг хадгалах нэгдсэн зам */
  const persist = async (patch: Parameters<typeof updateMe>[0]) => {
    setSaving(true);
    setError(null);

    try {
      const updated = await updateMe(patch);
      apply(updated);
      setNotice(t("Хадгаллаа."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Алдаа гарлаа."));
    } finally {
      setSaving(false);
    }
  };

  /** Профайл зураг сонгоход Firebase Storage руу шууд байршуулаад URL-ыг хадгална. */
  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t("Зөвхөн зургийн файл сонгоно уу."));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(t("Зургийн хэмжээ 5MB-ээс бага байх ёстой."));
      return;
    }

    const previousUrl = user.photoUrl;
    setUploadingPhoto(true);
    setError(null);

    try {
      /*
       * ⚠ Storage SDK-г ЭНД, хэрэгцээ гарсан үед татна. Модулийн түвшинд
       * импортлобол `/settings` хуудасны эхний багцад (мөн `lib/firebase`-
       * ээр дамжин бусад хуудсанд) орно — бодит хэрэглээ нь зөвхөн энэ
       * функц. Хэрэглэгч аль хэдийн зураг сонгосон тул татах хугацаа
       * мэдрэгдэхгүй.
       */
      const [{ deleteObject, getDownloadURL, ref, uploadBytes }, storage] =
        await Promise.all([import("firebase/storage"), getStorageLazy()]);

      const extMatch = /\.[a-zA-Z0-9]+$/.exec(file.name);
      const path = `profile_photos/${user.uid}/${Date.now()}${extMatch ? extMatch[0] : ""}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      await persist({ photoUrl: url });

      if (previousUrl) {
        // Хуучин зургийг устгана — байхгүй эсвэл манай сангийнх биш байж
        // болох тул алдааг үл тоомсорлоно.
        deleteObject(ref(storage, previousUrl)).catch(() => {});
      }
    } catch (cause) {
      setError(photoUploadMessage(cause));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const resetPassword = async () => {
    setError(null);
    try {
      await sendResetEmail(user.email);
      setNotice(t("Нууц үг солих холбоосыг имэйлээр илгээлээ."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Алдаа гарлаа."));
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t("Тохиргоо")}
      </h1>

      {error && <ErrorNote message={error} />}
      {notice && (
        <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </p>
      )}

      {/*
        ⚠ Профайл дээрхтэй ДАВХАРДСАН нь санамсаргүй биш: хэрэглэгч "миний
        код хаана байна" гэж хайхдаа Профайл эсвэл Тохиргооны АЛЬ НЭГ рүү
        ордог бөгөөд аль руу нь орохыг урьдчилан таамаглах боломжгүй. Хоёр
        газарт ч НЭГ Л компонент зурагдана — үг, харагдац хэзээ ч зөрөхгүй.
      */}
      {user.studentInviteCode && (
        <MyCodeCard
          code={user.studentInviteCode}
          isStudent={isStudentRole(user.role)}
          compact
        />
      )}

      <Section title={t("Ерөнхий")}>
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 text-xl font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
            {user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              initial
            )}
          </span>

          <div className="flex flex-col items-start gap-1.5">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5">
              <Camera className="size-4" aria-hidden />
              {uploadingPhoto ? t("Байршуулж байна…") : t("Зураг солих")}
              <input
                type="file"
                accept="image/*"
                disabled={uploadingPhoto}
                onChange={(event) => void handlePhotoChange(event)}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("JPG, PNG эсвэл GIF, 5MB хүртэл")}
            </p>
          </div>
        </div>

        <Field label={t("Харагдах нэр")}>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120}
              className={inputClass}
            />
            <button
              type="button"
              disabled={saving || displayName === user.displayName}
              onClick={() => void persist({ displayName })}
              className="shrink-0 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {t("Хадгалах")}
            </button>
          </div>
        </Field>

        <Field
          label={t("Өдрийн зорилго")}
          hint={t("Өдөрт хэдэн хичээл дуусгах вэ (1–20)")}
        >
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={20}
              value={dailyGoal}
              onChange={(event) => setDailyGoal(Number(event.target.value))}
              className={`${inputClass} num`}
            />
            <button
              type="button"
              disabled={saving || dailyGoal === user.dailyGoal}
              onClick={() => void persist({ dailyGoal })}
              className="shrink-0 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {t("Хадгалах")}
            </button>
          </div>
        </Field>

        <Field
          label={t("Хэл")}
          hint={t(
            t("Аппын хэлийг сонгоно уу. Хичээлийн агуулга нь багшийн бичсэн хэлээрээ хэвээр үлдэнэ.")
          )}
        >
          <select
            value={user.language}
            onChange={(event) => {
              const next = event.target.value === "en" ? "en" : "mn";
              // Хоёр газар: `LocaleContext` нь ЭНЭ хөтөч дээр тэр дороо
              // хэрэгжүүлнэ, серверийн утга нь бусад төхөөрөмж дээр
              // сонголтыг сэргээнэ (сэдэвтэй ижил загвар).
              setLocale(next);
              void persist({ language: next });
            }}
            className={inputClass}
          >
            <option value="mn">{t("Монгол")}</option>
            <option value="en">{t("Англи")}</option>
          </select>
        </Field>
      </Section>

      <Section title={t("Харагдац")}>
        <Field label={t("Сэдэв")}>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  // Хоёр газар хадгална: `ThemeContext` нь ЭНЭ хөтөч дээр
                  // тэр дороо хэрэгжүүлнэ, сервер дэх утга нь бусад
                  // төхөөрөмж дээр сонголтыг сэргээнэ.
                  setPreference(value);
                  void persist({ theme: value });
                }}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium ${
                  preference === value
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-white/15 dark:text-gray-300 dark:hover:bg-white/5"
                }`}
              >
                {value === "light"
                  ? t("Гэрэлтэй")
                  : value === "dark"
                    ? t("Харанхуй")
                    : t("Системийн")}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section title={t("Дуу ба мэдэгдэл")}>
        <Toggle
          label={t("Дуу")}
          hint={t("Зөв хариулт, түвшин ахих үеийн дуу")}
          checked={user.soundEnabled}
          onChange={(value) => void persist({ soundEnabled: value })}
        />
        {/*
          ⚠ МЭДЭГДЭЛ нь ХОЁР зүйлийг зэрэг хийнэ: (1) хэрэглэгчийн
          хүслийг санд бичнэ, (2) хөтчийн ЗӨВШӨӨРЛИЙГ асууж, FCM
          токеныг серверт бүртгэнэ. Зөвхөн нэгийг нь хийвэл унтраалга
          «асаалттай» харагдаад мэдэгдэл ирэхгүй — хамгийн будлиантай
          хувилбар.

          ⚠ Зөвшөөрлийг ХЭРЭГЛЭГЧИЙН ҮЙЛДЛЭЭС (унтраалга дарах) асууна,
          хуудас ачаалахад БИШ: гэнэтийн зөвшөөрлийн цонхыг хөтчүүд спам
          гэж үзэж хориглодог бөгөөд хэрэглэгч ойлгохгүй «Хориглох»
          дарвал тэр сонголт удаан хадгалагдана.
        */}
        <Toggle
          label={t("Мэдэгдэл")}
          hint={t("Тэмцээн эхлэхийн 10 минутын өмнө сануулна")}
          checked={user.notificationsEnabled}
          onChange={(value) => void toggleNotifications(value)}
        />
        {pushError && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{pushError}</p>
        )}
      </Section>

      <DevicesSection />

      <Section title={t("Нууцлал")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("Нууц үг солих")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user.email} хаяг руу холбоос илгээнэ
            </p>
          </div>
          <button
            type="button"
            onClick={() => void resetPassword()}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
          >
            {t("Холбоос авах")}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-white/10">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("Гарах")}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t("Энэ төхөөрөмжөөс гарна")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void signOutCompletely()}
            className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            {t("Гарах")}
          </button>
        </div>
      </Section>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:ring-brand-500/20";

/**
 * Хэрэглэгч ХАЗААГДААГҮЙ үедээ ч гэсэн эндээс идэвхтэй төхөөрөмжөө урьдчилан
 * харж, хэрэггүй болсныг нь өөрөө хасах боломжтой — зөвхөн хязгаарт хүрч
 * гацсан үед л (`Protected`-ийн `DeviceLimitScreen`) биш.
 */
function DevicesSection() {
  const { data, loading, error, reload } = useApiData<{ devices: ClientDeviceInfo[] }>(
    "/api/devices"
  );

  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const remove = async (id: string) => {
    setBusyId(id);
    setActionError(null);

    try {
      await apiFetch(`/api/devices/${encodeURIComponent(id)}`, { method: "DELETE" });
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : t("Алдаа гарлаа."));
    } finally {
      setBusyId(null);
    }
  };

  const devices = data?.devices ?? [];

  return (
    <Section title={t("Төхөөрөмжүүд")}>
      {loading && <Skeleton className="h-16 w-full" />}
      {error && <ErrorNote message={error} onRetry={reload} />}
      {actionError && <ErrorNote message={actionError} />}

      {!loading && !error && (
        <ul className="space-y-2">
          {devices.map((device) => (
            <li
              key={device.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-white/10"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                <Laptop className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {device.label}
                  </span>
                  {device.isCurrent && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                      {t("Энэ төхөөрөмж")}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">
                  Сүүлд идэвхтэй: {new Date(device.lastSeenAt).toLocaleString("mn-MN")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void remove(device.id)}
                disabled={busyId === device.id}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-rose-500 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-500/10"
                aria-label={`${device.label} устгах`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface space-y-4 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {hint && (
        <span className="mb-1.5 block text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </span>
      )}
      {children}
    </label>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {hint && (
          <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-gray-300 dark:bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white transition-[left] ${
            checked ? "left-[1.375rem]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
