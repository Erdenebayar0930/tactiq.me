"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Laptop, Trash2 } from "lucide-react";

import { useUser } from "@/context/UserContext";
import { apiFetch } from "@/lib/apiClient";
import { MAX_DEVICES } from "@/lib/deviceLimit";
import { repairProfile } from "@/lib/users";
import { signOutCompletely } from "@/lib/session";
import { asRole, hasRole, homeForRole, isAdminRole, roleLabels } from "@/lib/permissions";

import type { ClientDeviceInfo } from "@/context/UserContext";
import type { UserRole } from "@/lib/permissions";

import { Mascot } from "./Mascot";
import { ErrorNote, Skeleton } from "./ui";
import { t } from "@/lib/i18n/t";

/**
 * Нэвтрэлтийн хаалга.
 *
 * ⚠ Энэ бол ТАВ ТУХЫН хамгаалалт: хуудсыг цэвэрхэн харуулах үүрэгтэй.
 * Жинхэнэ хамгаалалт нь API route бүр дэх `requireActiveUser` /
 * `requireAdmin` — клиент талын шалгалтыг DevTools-оор тойрч болно, гэвч
 * өгөгдөл нь серверээс гарахгүй.
 */
export default function Protected({
  children,
  requireAdmin = false,
  allowedRoles,
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
  /**
   * Зөвхөн эдгээр эрхтэй хэрэглэгчид нэвтрэх хэсэг (жишээ нь `/teacher`,
   * `/parent`). admin/super нь ХЯНАЛТЫН ЗОРИЛГООР үргэлж нэвтэрч чадна.
   * Заагаагүй бол хязгаарлалтгүй (одоогийн `/(app)` бүлгийн зан төлөв).
   */
  allowedRoles?: UserRole[];
}) {
  const { user, status, error, needsRegistration, deviceLimit, refresh } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (status === "signed-out") {
      // Нэвтэрсний дараа ЯГ ЭНЭ хуудас руу буцаана (`?next=`). Найзын
      // урилга (`/play/invite/<code>`) шиг ГАДНААС ирсэн холбоосыг
      // нэвтрэлт "залгидаг" байсан — хэрэглэгч нэвтрээд профайл дээрээ
      // очиход урилга нь мөрдөх ул мөргүй алга болно.
      // ⚠ `usePathname`/`useSearchParams` БИШ, `window.location`: тэдгээр
      // hook нь БҮХ хамгаалагдсан хуудсыг статик prerender-ээс гаргаж,
      // Suspense хүрээ шаарддаг (build алдаа). Энэ утга зөвхөн эффект
      // дотор, хөтөч дээр л хэрэгтэй.
      const next = `${window.location.pathname}${window.location.search}`;
      // `replace` — буцах товч дарахад хамгаалагдсан хуудас руу эргэж
      // орохгүй байхын тулд түүхэнд мөр үлдээхгүй.
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [status, router]);

  if (status === "loading" || status === "signed-out") {
    return <LoadingScreen />;
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg p-6">
        <ErrorNote
          message={error ?? t("Профайл уншиж чадсангүй.")}
          onRetry={() => void refresh()}
        />
      </div>
    );
  }

  if (status === "device-limit") {
    return <DeviceLimitScreen devices={deviceLimit ?? []} onRetry={refresh} />;
  }

  if (needsRegistration || !user) return <RepairScreen onDone={refresh} />;

  if (user.status !== "active") {
    return <BlockedScreen status={user.status} />;
  }

  if (requireAdmin && !isAdminRole(user.role)) {
    return (
      <CenteredNotice
        title={t("Энэ хэсэг зөвхөн админд нээлттэй")}
        description={t("Хяналтын самбарт нэвтрэх эрх танд байхгүй байна.")}
        actionLabel={t("Профайл руу буцах")}
        onAction={() => router.replace("/profile")}
      />
    );
  }

  const role = asRole(user.role);

  // `hasRole` нь `allowedRoles`-ийн аль нэгийг үндсэн ЭСВЭЛ нэмэлт
  // (`secondaryRole`) эрхээр хангаж байгаа эсэхийг шалгана — эцэг эх мөн
  // багш бол хоёр хэсэгт аль алинд нь нэвтэрч чадна.
  if (
    allowedRoles &&
    !allowedRoles.some((allowed) => hasRole(user, allowed)) &&
    !isAdminRole(user.role)
  ) {
    return (
      <CenteredNotice
        title={t("Энэ хэсэг танд зориулагдаагүй")}
        description={`Энэ хэсэг зөвхөн ${allowedRoles
          .map((allowed) => roleLabels[allowed])
          .join(", ")}-д нээлттэй. Таны эрх: ${roleLabels[role]}.`}
        actionLabel={t("Миний хэсэг рүү очих")}
        onAction={() => router.replace(homeForRole(role))}
      />
    );
  }

  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

/**
 * Firebase дээр данстай атлаа профайлгүй үлдсэн тохиолдол.
 *
 * Ховор ч бодит: бүртгэлийн хоёр дахь алхам дундуур сүлжээ тасарвал ийм
 * төлөв үүснэ. Хэрэглэгчийг "алдаа гарлаа" гэж орхихын оронд нэг товшилтоор
 * засах боломж өгнө.
 */
function RepairScreen({ onDone }: { onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const repair = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await repairProfile();
      await onDone();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Алдаа гарлаа."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <Mascot mood="think" className="size-28" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        {t("Бүртгэл чинь дутуу үлджээ")}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Нэвтрэлт амжилттай боловч профайл үүсээгүй байна. Доорх товчийг дарж
        гүйцээнэ үү.
      </p>
      {message && <ErrorNote message={message} />}
      <button
        type="button"
        onClick={() => void repair()}
        disabled={busy}
        className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
      >
        {busy ? t("Түр хүлээнэ үү…") : t("Профайл үүсгэх")}
      </button>
      <button
        type="button"
        onClick={() => void signOutCompletely()}
        className="text-sm text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
      >
        {t("Гарах")}
      </button>
    </div>
  );
}

/**
 * Хэрэглэгч аль хэдийн `MAX_DEVICES` төхөөрөмж дээр нэвтэрсэн, шинэ
 * төхөөрөмж (энэ хөтөч) зөвшөөрөгдөхгүй байгаа тохиолдол.
 *
 * Аль нэгийг нь устгамагц `onRetry` дуудаж дахин шалгана — сервер тал
 * (`/api/users/me`) слот сулармагц энэ хөтчийг өөрөө шинэ төхөөрөмж болгон
 * бүртгэнэ, тусад нь "дахин нэвтрэх" алхам шаардлагагүй.
 */
function DeviceLimitScreen({
  devices,
  onRetry,
}: {
  devices: ClientDeviceInfo[];
  onRetry: () => Promise<void>;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState(devices);

  const remove = async (id: string) => {
    setBusyId(id);
    setError(null);

    try {
      await apiFetch(`/api/devices/${encodeURIComponent(id)}`, { method: "DELETE" });
      setList((current) => current.filter((device) => device.id !== id));
      await onRetry();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("Алдаа гарлаа."));
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <Mascot mood="think" className="size-28" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">
        {t("Төхөөрөмжийн хязгаарт хүрлээ")}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Нэг дансаар зэрэг {MAX_DEVICES} хүртэл төхөөрөмж дээр нэвтрэх
        боломжтой. Энэ шинэ төхөөрөмжөөр үргэлжлүүлэхийн тулд доорх
        жагсаалтаас хуучин нэгийг нь хасна уу.
      </p>

      {error && <ErrorNote message={error} />}

      <ul className="w-full space-y-2 text-left">
        {list.map((device) => (
          <li
            key={device.id}
            className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-white/10"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
              <Laptop className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                {device.label}
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

      <button
        type="button"
        onClick={() => void signOutCompletely()}
        className="text-sm text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300"
      >
        {t("Гарах")}
      </button>
    </div>
  );
}

function BlockedScreen({ status }: { status: string }) {
  const copy =
    status === "blocked"
      ? {
          title: t("Таны бүртгэл хаагдсан байна"),
          description:
            t("Багш эсвэл админтай холбогдож бүртгэлээ сэргээлгэнэ үү."),
        }
      : {
          title: t("Бүртгэл зөвшөөрөл хүлээж байна"),
          description:
            t("Админ таны бүртгэлийг баталгаажуулмагц хичээлүүд нээгдэнэ."),
        };

  return (
    <CenteredNotice
      title={copy.title}
      description={copy.description}
      actionLabel={t("Гарах")}
      onAction={() => void signOutCompletely()}
    />
  );
}

function CenteredNotice({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-8 text-center">
      <Mascot mood="think" className="size-28" />
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="rounded-xl bg-brand-500 px-5 py-2.5 font-semibold text-white hover:bg-brand-600"
      >
        {actionLabel}
      </button>
    </div>
  );
}
