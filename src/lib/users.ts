"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";

import { apiFetch } from "./apiClient";
import { auth } from "./firebase";

import type { PublicUser } from "./api/publicUser";

export type { PublicUser };

/**
 * Бүртгэл / нэвтрэлтийн клиент тал.
 *
 * Аутентикац Firebase дээр, профайл Postgres дээр байрладаг тул бүртгэл нь
 * ХОЁР АЛХАМТАЙ: эхлээд Firebase дээр данс, дараа нь /api/auth/register
 * дээр мөр. Хоёр дахь алхам нь бүтэлгүйтвэл ЭЗЭНГҮЙ Firebase данс үлдэнэ —
 * тэр хүн дараа нь нэвтэрч чадах ч профайлгүй байх тул апп ажиллахгүй.
 * Тиймээс амжилтгүй болбол дансыг нь цэвэрлэнэ.
 */

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
  /** Бүртгэлийн формд сонгосон эрх. Заагаагүй бол сервер "student" болгоно. */
  role?: "student" | "teacher" | "parent";
  /**
   * Нэмэлт эрх — `role`-той хосолсон "teacher" | "parent". Жишээ нь эцэг эх
   * (role="parent") мөн багш бол secondaryRole="teacher".
   */
  secondaryRole?: "teacher" | "parent";
  /** Найзын хувийн код (заавал биш) — тохирвол хоёулаа бонус оноо авна. */
  referralCode?: string;
  /** Бүртгэлийн эхний алхамд сонгосон дасгалжуулагч (заавал биш). */
  coachId?: string;
};

async function completeRegistration(
  firebaseUser: FirebaseUser,
  payload: Record<string, unknown>
): Promise<PublicUser> {
  try {
    const result = await apiFetch<{ user: PublicUser }>(
      "/api/auth/register",
      { method: "POST", body: payload }
    );
    return result.user;
  } catch (error) {
    await firebaseUser.delete().catch((cleanupError) => {
      // Цэвэрлэгээ ч бүтэлгүйтвэл дор хаяж логт үлдээнэ — тэр хэрэглэгч
      // дараа нь "имэйл ашиглагдсан" гэсэн алдаа авах тул шалтгаан хэрэгтэй.
      console.error("Дутуу бүртгэлийг цэвэрлэж чадсангүй:", cleanupError);
    });
    throw error;
  }
}

/** Имэйл, нууц үгээр шинэ сурагч бүртгэнэ. */
export async function registerWithEmail(
  input: RegisterInput
): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    input.password
  );

  if (displayName) {
    // Firebase дээрх нэр нь зөвхөн тав тухын зорилготой — жинхэнэ нэр
    // Postgres-д хадгалагдана. Бичигдэхгүй байсан ч бүртгэлийг зогсоохгүй.
    await updateProfile(credential.user, { displayName }).catch(() => {});
  }

  /*
   * Баталгаажуулах имэйл. Амжилтгүй болсон ч бүртгэлийг ЗОГСООХГҮЙ —
   * хэрэглэгч аппдаа орсон хэвээр, зөвхөн найзын урамшуулал хойшилно
   * (`EmailVerifyBanner`-ээс дахин илгээж болно).
   */
  await sendEmailVerification(credential.user).catch((error) => {
    console.error("Баталгаажуулах имэйл илгээж чадсангүй:", error);
  });

  return completeRegistration(credential.user, {
    displayName,
    email,
    role: input.role,
    secondaryRole: input.secondaryRole,
    referralCode: input.referralCode,
    coachId: input.coachId,
  });
}

/** Имэйл, нууц үгээр нэвтэрнэ. */
export async function signInWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

/**
 * Google-ээр нэвтэрнэ. Анх удаа бол профайлыг нь тэр дороо үүсгэнэ.
 *
 * Google-ээр нэвтрэхэд "бүртгүүлэх" ба "нэвтрэх" нь ялгагдахгүй — хэрэглэгч
 * шинэ эсэхийг зөвхөн сервер мэднэ. Тиймээс үргэлж register рүү хандана;
 * тэр route нь давхардлыг өөрөө таньж `created: false` буцаана.
 */
export async function signInWithGoogle(
  role?: "student" | "teacher" | "parent",
  referralCode?: string,
  secondaryRole?: "teacher" | "parent",
  coachId?: string
): Promise<PublicUser> {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);

  const result = await apiFetch<{ user: PublicUser }>("/api/auth/register", {
    method: "POST",
    body: {
      displayName: credential.user.displayName ?? "",
      email: credential.user.email ?? "",
      role,
      secondaryRole,
      referralCode,
      coachId,
    },
  });

  return result.user;
}

/** Нууц үг сэргээх холбоос илгээнэ. */
export async function sendResetEmail(email: string) {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

/** Имэйл баталгаажуулах холбоосыг ДАХИН илгээнэ. */
export async function resendVerificationEmail(): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Нэвтэрсэн байх шаардлагатай.");
  await sendEmailVerification(firebaseUser);
}

/**
 * Имэйл баталгаажсан эсэхийг Firebase-ээс ДАХИН асууж, ID token-ыг
 * ХҮЧЭЭР шинэчилнэ.
 *
 * ⚠ Хоёулаа ЗААВАЛ хэрэгтэй. `reload()` нь зөвхөн локал `currentUser`
 * объектыг шинэчилнэ — токен доторх `email_verified` claim ХУУЧИН хэвээр
 * үлдэх ба сервер ЗӨВХӨН ТОКЕНЫГ хардаг. `getIdToken(true)` нь шинэ claim
 * бүхий токен авчирна. Эс бөгөөс хэрэглэгч имэйлээ баталгаажуулсан ч
 * сервер талд нэг цаг хүртэл "баталгаажаагүй" харагдана.
 *
 * @returns баталгаажсан эсэх (шинэчилсний ДАРААХ төлөв)
 */
export async function refreshEmailVerification(): Promise<boolean> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return false;

  await firebaseUser.reload();
  if (!firebaseUser.emailVerified) return false;

  await firebaseUser.getIdToken(true);
  return true;
}

/**
 * Профайл дутуу үлдсэн бол гүйцээнэ.
 *
 * Firebase дээр данстай атлаа Postgres-д мөргүй хэрэглэгч гарч болно: бүртгэл
 * дундуур сүлжээ тасарсан, эсвэл сангийн мөрийг гараар устгасан. Тэр үед
 * `UserProvider` нь `needsRegistration` тугийг өргөнө.
 */
export async function repairProfile(): Promise<PublicUser> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error("Нэвтэрсэн байх шаардлагатай.");

  const result = await apiFetch<{ user: PublicUser }>("/api/auth/register", {
    method: "POST",
    body: {
      displayName: firebaseUser.displayName ?? "",
      email: firebaseUser.email ?? "",
    },
  });

  return result.user;
}

/** Өөрийн профайл / тохиргоог шинэчилнэ. */
export async function updateMe(patch: {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  birthYear?: number;
  dailyGoal?: number;
  language?: string;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  theme?: string;
  /** "teacher" | "parent" | null — зөвхөн үндсэн эрхтэйгээ хосолсон утга зөвшөөрөгдөнө. */
  secondaryRole?: "teacher" | "parent" | null;
}): Promise<PublicUser> {
  const data = await apiFetch<{ user: PublicUser }>("/api/users/me", {
    method: "PATCH",
    body: patch,
  });
  return data.user;
}

export { roleLabels, roleDescriptions, statusLabels } from "./permissions";
export type { UserRole, UserStatus } from "./permissions";
