"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Icon } from "@/components/tactiq/Icon";
import { useUser } from "@/context/UserContext";
import { t } from "@/lib/i18n/t";
import { REFERRAL_BONUS_DAYS, TRIAL_DAYS } from "@/lib/billing";
import { asRole, homeForRole } from "@/lib/permissions";
import {
  registerWithEmail,
  sendResetEmail,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/users";


type Mode = "login" | "register";

/**
 * ⚠ ЭРХ СОНГОХ, ДАСГАЛЖУУЛАГЧ СОНГОХ ХЭСГҮҮД ХАСАГДСАН.
 *
 * Бүртгэл нь ГУРВАН талбар (нэр, имэйл, нууц үг) л байх ёстой: хүн
 * бүртгүүлэхээр шийдсэн мөчид нэмэгдэх алхам бүр хаягдалт үүсгэдэг.
 *
 *   • «Та хэн бэ?» (Сурагч / Багш / Эцэг эх) — бүх шинэ хэрэглэгч
 *     СУРАГЧ болно (`role: "student"`). Багш, эцэг эхийн эрхийг АДМИН
 *     өгнө (`/admin/users`) — тэр нь хүүхдийн өгөгдөл рүү хандах эрх
 *     тул өөрөө сонгуулах нь эхнээсээ буруу байсан: хэн ч «Багш» гэж
 *     дараад сурагчдын жагсаалт рүү ойртох гэж оролдож болно.
 *
 *   • Дасгалжуулагчийн дүр — зөвхөн ГАДААД ТӨРХ (`coachId`,
 *     `lib/tactiq/coaches.ts`). Хичээлийн агуулгад нөлөөлдөггүй тул
 *     бүртгэлийн замд байх шаардлагагүй; анхдагч дүртэй эхэлж, дараа
 *     нь тохиргооноос солино.
 */

/**
 * Нэвтрэх / бүртгүүлэх карт (#2 дэлгэц).
 *
 * Хоёр горимыг НЭГ компонентод барьсан нь зориуд: талбарууд, алдааны
 * харуулалт, Google-ийн товч, ачаалж буй төлөв бүгд ижил. Хоёр тусдаа
 * компонент байвал засвар бүр хоёр газар хийгдэх ба нэг нь мартагдана.
 */
export default function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, refresh, needsRegistration } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * `/register?ref=CODE` холбоосоор ирсэн бол найзын кодыг тэр дороо
   * бөглөнө — сурагч гараар хуулах шаардлагагүй.
   */
  useEffect(() => {
    if (mode !== "register") return;
    const ref = searchParams.get("ref")?.trim();
    if (ref) setReferralCode(ref.toUpperCase());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /**
   * Аль хэдийн нэвтэрсэн хүнийг апп руу оруулна.
   *
   * Хэрэглэгч хаягаар нь шууд /login руу орж болно (хавчуургаас, эсвэл
   * гарсны дараа буцах товчоор). Тэр үед нэвтрэх форм харуулах нь
   * төөрөгдүүлнэ — сесс амьд хэвээр байгаа.
   *
   * ⚠ `!busy` ЗААВАЛ ХЭРЭГТЭЙ: бүртгүүлэх мөчид Firebase-д данс үүсэх
   * даруйд `onAuthStateChanged` шатхан, `UserProvider`-ийн ЭХНИЙ (Postgres
   * мөр хараахан үүсээгүй үеийн) `/api/users/me` дуудлага `user: null`
   * авчирсан ч `status`-ыг ЯМАГТ "ready" болгодог (`needsRegistration`
   * тусдаа тэмдэглэгддэг). Энэ effect `!busy` шалгалтгүй бол `submit()`-ийн
   * ӨӨРИЙН, бүртгэлийг ЖИНХЭНЭ дуусгасны дараах шилжилтийг тэрхнээс НЬ ӨМНӨ
   * "давж" очиж, дутуу профайлтай "Бүртгэл дутуу үлдсэн" дэлгэц рүү
   * буруу шилждэг байсан. `!needsRegistration` нь ижил шалтгаанаар нэмэлт
   * хамгаалалт.
   */
  /**
   * Нэвтрэлтийн дараа очих хуудас. `?next=` нь `Protected`-ээс ирнэ —
   * хамгаалагдсан холбоосыг (жишээ нь найзын шатрын урилга) шууд дарсан
   * хүнийг тэр хуудас руу нь буцаана.
   *
   * ⚠ ЗӨВХӨН аппын дотоод зам зөвшөөрнө: "//evil.com" зэрэг утга нь
   * хөтөч дээр ГАДНЫ хаяг болж хувирдаг тул нээлттэй чиглүүлэлтийн (open
   * redirect) цоорхой үүсгэнэ.
   */
  const nextParam = searchParams.get("next");
  const nextPath = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  /** Нэвтрэх⇄Бүртгүүлэх хооронд шилжихэд `next` алдагдахгүй байх суффикс. */
  const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";

  useEffect(() => {
    if (status === "ready" && !needsRegistration && !busy) router.replace(nextPath ?? "/profile");
  }, [status, needsRegistration, busy, router, nextPath]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    try {
      if (mode === "register") {
        const user = await registerWithEmail({
          displayName,
          email,
          password,
          /*
           * ⚠ ЯМАГТ СУРАГЧ: багш, эцэг эхийн эрхийг админ өгнө
           * (`/admin/users`) — тэр нь хүүхдийн өгөгдөлд хүрэх эрх тул
           * өөрөө сонгуулах нь болохгүй.
           */
          role: "student",
          referralCode,
        });
        // `UserProvider` аль хэдийн НЭГ удаа /api/users/me татсан байна —
        // Firebase-д нэвтэрсэн даруйд (энэ функц Postgres мөр үүсгэхээс
        // ӨМНӨ) `onAuthStateChanged` өдөөгддөг тул тэр таталт `user: null`
        // авчирсан хэвээр кэшлэгдсэн. Дахин уншихгүй бол `Protected` мөр
        // үүссэн ч "профайл дутуу" дэлгэц харуулсаар байна.
        await refresh();
        router.replace(nextPath ?? homeForRole(asRole(user.role)));
        return;
      }

      await signInWithEmail(email, password);
      router.replace(nextPath ?? "/profile");
    } catch (cause) {
      setError(friendlyError(cause));
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);

    try {
      const user = await signInWithGoogle(
        mode === "register" ? "student" : undefined,
        mode === "register" ? referralCode : undefined,
        /* ⚠ Нэмэлт эрх, дасгалжуулагчийн дүр хоёулаа бүртгэлээс хасагдсан. */
        undefined,
        undefined
      );
      // Доорх тайлбарыг `submit()`-ийн адил зорилготой `refresh()` дуудлагаас үзнэ үү.
      await refresh();
      router.replace(nextPath ?? homeForRole(asRole(user.role)));
    } catch (cause) {
      setError(friendlyError(cause));
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) {
      setError(t("Нууц үг сэргээхийн тулд имэйлээ бичнэ үү."));
      return;
    }

    setError(null);
    try {
      await sendResetEmail(email);
      setNotice(t("Нууц үг сэргээх холбоосыг имэйлээр илгээлээ."));
    } catch (cause) {
      setError(friendlyError(cause));
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900">
      <div className="mb-6 flex border-b border-gray-200 dark:border-white/10">
        <Tab href={`/login${nextQuery}`} active={mode === "login"}>
          {t("Нэвтрэх")}
        </Tab>
        <Tab href={`/register${nextQuery}`} active={mode === "register"}>
          {t("Бүртгүүлэх")}
        </Tab>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {mode === "register" && (
          <Field label={t("Нэр")}>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={t("Батаа")}
              autoComplete="nickname"
              maxLength={120}
              className={inputClass}
            />
          </Field>
        )}

        {mode === "register" && (
          <Field label={t("Найзын код (заавал биш)")}>
            <input
              type="text"
              value={referralCode}
              onChange={(event) => setReferralCode(event.target.value)}
              placeholder={t("Жишээ нь ABC123")}
              maxLength={12}
              className={inputClass}
            />
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              {/*
                ⚠ ТООГ БИЧВЭРЭЭС ГАДНА тавина: толь нь бүтэн мөрөөр
                тааруулдаг тул `${REFERRAL_BONUS_DAYS}` тоо мөрийн дотор
                орвол бонус хоног солигдоход орчуулга АЛГА болно.
              */}
              {t("Имэйлээ баталгаажуулж, эхний хичээлээ дуусгамагц ХОЁУЛАА")}{" "}
              {REFERRAL_BONUS_DAYS} {t("хоногийн нэмэлт Premium авна.")}
            </p>
          </Field>
        )}

        <Field label={t("Имэйл хаяг")}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="email@example.com"
            autoComplete="email"
            className={inputClass}
          />
        </Field>

        <Field label={t("Нууц үг")}>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              // Firebase-ийн доод хязгаар нь 6 — үүнийг браузарт хэлснээр
              // хэрэглэгч илгээхээс ӨМНӨ мэднэ.
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              className={`${inputClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label={showPassword ? t("Нууц үг нуух") : t("Нууц үг харуулах")}
            >
              {showPassword ? (
                <EyeOff className="size-4" aria-hidden />
              ) : (
                <Eye className="size-4" aria-hidden />
              )}
            </button>
          </div>
        </Field>

        {error && (
          <p
            className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            role="alert"
          >
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 py-2.5 font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
        >
          {busy
            ? t("Түр хүлээнэ үү…")
            : mode === "register"
              ? t("Бүртгүүлэх")
              : t("Нэвтрэх")}
        </button>

        {mode === "register" && (
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            🎁 {t("Бүртгүүлмэгц")} {TRIAL_DAYS}{" "}
            {t("хоногийн Premium ҮНЭГҮЙ — карт шаардахгүй.")}
          </p>
        )}
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        {t("эсвэл")}
        <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
      </div>

      <button
        type="button"
        onClick={() => void google()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-gray-300 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/15 dark:text-gray-200 dark:hover:bg-white/5"
      >
        <GoogleMark />
        {t("Google-ээр нэвтрэх")}
      </button>

      <p className="mt-5 text-center text-sm text-gray-500 dark:text-gray-400">
        {mode === "login" ? (
          <>
            {t("Бүртгэлгүй юу?")}{" "}
            <Link
              href={`/register${nextQuery}`}
              className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {t("Бүртгүүлэх")}
            </Link>
            <br />
            <button
              type="button"
              onClick={() => void reset()}
              className="mt-2 text-xs hover:underline"
            >
              {t("Нууц үгээ мартсан уу?")}
            </button>
          </>
        ) : (
          <>
            {t("Бүртгэлтэй юу?")}{" "}
            <Link
              href={`/login${nextQuery}`}
              className="font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {t("Нэвтрэх")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:focus:ring-brand-500/20";


function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>
      {children}
    </label>
  );
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 border-b-2 pb-3 text-center text-sm font-semibold transition-colors ${
        active
          ? "border-brand-500 text-brand-600 dark:text-brand-400"
          : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      }`}
    >
      {children}
    </Link>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.1 7.1 0 0 1 0-4.6V6.6H1.4a12 12 0 0 0 0 10.8l3.9-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l3.9 3.1A7.2 7.2 0 0 1 12 4.8z"
      />
    </svg>
  );
}

/**
 * Firebase-ийн алдааны кодыг хүүхэд ойлгохоор мессеж болгоно.
 *
 * ⚠ ХЭРЭГЛЭГЧИД ХАРАГДАХ мессежүүд `t()`-ээр дамжина. Харин ТОХИРУУЛГЫН
 * алдаанууд (Firebase Console дээр юу асаах) нь ЗӨВХӨН хөгжүүлэгчид
 * зориулагдсан тул орчуулаагүй — тэднийг орчуулах нь толийг хөгжүүлэгчийн
 * заавраар дүүргэх бөгөөд хэрэглэгч тэднийг хэзээ ч харах ёсгүй.
 *
 * Түүхий код (`auth/invalid-credential`) нь юу болсныг огт хэлдэггүй.
 * Ялангуяа `invalid-credential` нь "имэйл олдсонгүй" ба "нууц үг буруу"
 * ХОЁУЛАНГ нь илэрхийлдэг — Firebase санаатайгаар нэгтгэсэн (данс байгаа
 * эсэхийг гадагш алдахгүйн тулд), тиймээс бид ч ялгаж хэлэхгүй.
 */
function friendlyError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return t("Имэйл эсвэл нууц үг буруу байна.");
    case "auth/email-already-in-use":
      return t("Энэ имэйлээр бүртгэл аль хэдийн үүссэн байна.");
    case "auth/weak-password":
      return t("Нууц үг дор хаяж 6 тэмдэгт байх ёстой.");
    case "auth/invalid-email":
      return t("Имэйл хаяг буруу байна.");
    case "auth/too-many-requests":
      return t("Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.");
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return t("Нэвтрэх цонх хаагдлаа. Дахин оролдоно уу.");
    case "auth/network-request-failed":
      return t("Сүлжээнд холбогдож чадсангүй. Интернэтээ шалгана уу.");

    /**
     * ТОХИРУУЛГЫН алдаанууд — хэрэглэгч юу ч буруу хийгээгүй.
     *
     * Эдгээрийг "алдаа гарлаа" гэж бүрхэгдүүлбэл хөгжүүлэгч Firebase
     * Console дээр юу асаах ёстойгоо мэдэхгүй хэдэн цаг алдана. Хаана
     * товших ёстойг ШУУД хэлнэ.
     */
    case "auth/operation-not-allowed":
      return (
        "Энэ нэвтрэх арга Firebase дээр идэвхжээгүй байна. " +
        "Firebase Console → Authentication → Sign-in method хэсгээс " +
        "Email/Password (эсвэл Google)-ыг Enable хийнэ үү."
      );
    case "auth/admin-restricted-operation":
      return (
        "Энэ Firebase төсөл дээр өөрөө бүртгүүлэхийг хаасан байна. " +
        "Console → Authentication → Settings → User actions хэсгээс " +
        "«Enable create (sign-up)»-г асаана уу."
      );
    case "auth/unauthorized-domain":
      return (
        "Энэ домэйнээс нэвтрэхийг зөвшөөрөөгүй байна. " +
        "Firebase Console → Authentication → Settings → " +
        "Authorized domains хэсэгт нэмнэ үү."
      );
    case "auth/invalid-api-key":
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
      return (
        "Firebase-ийн түлхүүр буруу байна. .env.local доторх " +
        "NEXT_PUBLIC_FIREBASE_* утгуудыг шалгаад дахин build хийнэ үү."
      );
    case "auth/configuration-not-found":
      return (
        "Firebase төсөл дээр Authentication идэвхжээгүй байна. " +
        "Console → Authentication → Get started дарна уу."
      );

    default:
      return error instanceof Error ? error.message : t("Алдаа гарлаа.");
  }
}
