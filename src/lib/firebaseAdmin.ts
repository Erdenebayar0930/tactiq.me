import "server-only";

import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getMessaging } from "firebase-admin/messaging";

import { getFirebaseAdminConfig } from "./config";

type FirebaseLookupUser = {
  localId?: string;
  email?: string | null;
  displayName?: string | null;
  /** REST хариунд camelCase — токен доторх `email_verified`-ийн эквивалент. */
  emailVerified?: boolean;
};

type FirebaseLookupResponse = {
  users?: FirebaseLookupUser[];
};

type DecodedFirebaseToken = {
  uid: string;
  email?: string | null;
  /**
   * Custom claims (`lib/api/claims.ts`-ээр бичигддэг) — токен кэшлэгдсэн ч
   * `backfillClaimsIfStale`-д ЗААВАЛ хэрэгтэй. REST fallback (`accounts:lookup`)
   * замаар ирэх утга эдгээрийг агуулдаггүй тул `undefined` хэвээр үлдэнэ —
   * энэ нь өмнөх зан төлөвтэй адил.
   */
  role?: unknown;
  status?: unknown;
  /**
   * Имэйл баталгаажсан эсэх. Admin SDK нь токеноос `email_verified` гэж
   * (snake_case) өгдөг тул нэрийг нь ХЭВЭЭР үлдээв — REST fallback замд
   * `extractFirebaseUserFromLookupResponse` нь camelCase-ээс хөрвүүлнэ.
   */
  email_verified?: boolean;
};

/**
 * Сервер талын Firebase Admin SDK.
 *
 * Аутентикацийн ID token шалгах болон FCM илгээхэд ашиглана. Апп-ын өгөгдөл
 * Postgres-д байгаа тул Firestore энд ашиглагдахгүй.
 *
 * Service account түлхүүр нь ЗӨВХӨН сервер талд байх ёстой — эдгээр хувьсагчид
 * NEXT_PUBLIC_ угтваргүй тул browser bundle-д хэзээ ч орохгүй.
 *
 * .env.local (болон Vercel → Settings → Environment Variables):
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */
function hasFirebaseAdminConfig() {
  const { projectId, clientEmail, privateKey } = getFirebaseAdminConfig();

  return Boolean(
    projectId &&
      clientEmail &&
      privateKey &&
      !privateKey.includes("YOUR_PRIVATE_KEY_HERE")
  );
}

function initAdmin() {
  if (getApps().length > 0) {
    return getApp();
  }

  if (!hasFirebaseAdminConfig()) {
    return null;
  }

  const { projectId, clientEmail, privateKey } = getFirebaseAdminConfig();

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function extractFirebaseUserFromLookupResponse(
  payload: FirebaseLookupResponse
): DecodedFirebaseToken {
  const [firstUser] = payload.users ?? [];

  return {
    uid: firstUser?.localId ?? "",
    email: firstUser?.email ?? null,
    email_verified: firstUser?.emailVerified === true,
  };
}

async function verifyIdTokenWithPublicApi(idToken: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY тохируулагдаагүй байна.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  const payload = (await response.json().catch(() => ({}))) as FirebaseLookupResponse & {
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Firebase ID token шалгалт амжилтгүй боллоо.");
  }

  return extractFirebaseUserFromLookupResponse(payload);
}

/**
 * Токен баталгаажуулалтын богино хугацааны кэш.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: service account түлхүүргүй үед токен бүрийг Google-ийн
 * `identitytoolkit` руу СҮЛЖЭЭГЭЭР явуулж шалгадаг (300–1000мс). Жинхэнэ
 * service account-той (production) үед Admin SDK JWT-г ЛОКАЛААР шалгадаг тул
 * сүлжээний зардал байхгүй ч RSA гарын үсэг шалгах нь өөрөө CPU-д хямдгүй —
 * load test-ээр хэмжихэд нэвтэрсэн route (`/api/users/me`) нийтийн route-оос
 * ~30% удаан, зэрэг хүсэлт нэмэгдэхэд req/sec тогтмолжиж зөвхөн хариу
 * хугацаа уртсаж байгаа нь ЯГ ЭНЭ (нэг Node процессын CPU дээрх JWT
 * баталгаажуулалт) хязгаарлагч болохыг баталсан. Тиймээс энэ кэш ЗӨВХӨН
 * REST fallback биш, ХОЁУЛАНГ нь (бодит Admin SDK-г ч) дамжуулна.
 *
 * ⚠ Аюулгүй байдлын тэнцвэр: кэшлэсэн хугацаанд (60 сек) Firebase дээр
 * цуцлагдсан токен хүчинтэй хэвээр үзэгдэнэ. Энэ нь хүлээн зөвшөөрөгдөнө,
 * учир нь жинхэнэ хаалт нь Postgres дэх `status` багана — тэр нь хүсэлт БҮРД
 * шинээр уншигддаг (`getCaller`), кэшлэгддэггүй. Өөрөөр хэлбэл админ
 * хэрэглэгчийг хаамагц дараагийн хүсэлт дээр шууд таслагдана.
 */
const TOKEN_CACHE_MS = 60_000;
/**
 * Одоо БҮХ нэвтэрсэн хүсэлт (зөвхөн тохиргоо дутуу fallback биш) энэ кэшээр
 * дамждаг тул хуучин 500-ийн хэмжээ идэвхтэй хэрэглэгчийн тоо өсөхөд хэт
 * хурдан "hot" бичлэгүүдийг ч хаяж эхэлдэг байсан. Мөр бүр жижиг
 * (uid+email+timestamp) тул 5000 хүртэл өсгөх нь санах ойд ач холбогдолгүй.
 */
const MAX_CACHED_TOKENS = 5000;

const tokenCache = new Map<
  string,
  { at: number; user: DecodedFirebaseToken }
>();

async function verifyIdTokenCached(idToken: string) {
  const now = Date.now();
  const hit = tokenCache.get(idToken);

  if (hit && now - hit.at < TOKEN_CACHE_MS) return hit.user;

  const adminApp = initAdmin();
  const user: DecodedFirebaseToken = adminApp
    ? await getAuth(adminApp)
        .verifyIdToken(idToken)
        .then((decoded) => ({
          uid: decoded.uid,
          email: decoded.email ?? null,
          // Custom claims (role/status) нь decoded token дээр шууд талбар
          // болж ирдэг (Firebase-ийн зан төлөв) — `backfillClaimsIfStale`-д
          // дамжуулахын тулд хадгална.
          role: (decoded as { role?: unknown }).role,
          status: (decoded as { status?: unknown }).status,
          email_verified: decoded.email_verified === true,
        }))
    : await verifyIdTokenWithPublicApi(idToken);

  /**
   * Санах ой хязгааргүй өсөхөөс сэргийлнэ. Map нь оруулсан дарааллаа
   * хадгалдаг тул хамгийн эртний бичлэг эхэнд байна — түүнийг хаяна.
   * LRU биш ч энэ зорилгод хангалттай: бичлэгүүд 60 секундэд хугацаа
   * дуусдаг тул сан хэзээ ч утга учиртай хэмжээнд хүрэхгүй.
   */
  if (tokenCache.size >= MAX_CACHED_TOKENS) {
    const oldest = tokenCache.keys().next().value;
    if (oldest !== undefined) tokenCache.delete(oldest);
  }

  tokenCache.set(idToken, { at: now, user });
  return user;
}

/**
 * `getCaller()`-ийн шууд дуудах ёстой функц — `adminAuth().verifyIdToken()`-ийн
 * ОРОНД үүнийг ашиглана, учир нь энэ нь кэшлэгдсэн. `adminAuth()` өөрөө
 * өөрчлөгдөөгүй хэвээр (жинхэнэ Auth объект буцаадаг) — `claims.ts`-ийн
 * `setCustomUserClaims` үүнийг шаарддаг тул зориудаар хөндөөгүй.
 */
export const verifyCallerToken = verifyIdTokenCached;

export const adminAuth = () => {
  const adminApp = initAdmin();

  if (adminApp) {
    return getAuth(adminApp);
  }

  return { verifyIdToken: verifyIdTokenCached };
};

/**
 * ХЭРЭГЛЭГЧИЙН ӨМНӨӨС custom token үүсгэх.
 *
 * Тэмцээний систем (`lib/api/tournamentTicket.ts`) нь ТУСДАА серверт
 * ажилладаг ч ИЖИЛ Firebase төсөл дээр суудаг — энэ токеныг тэнд
 * `signInWithCustomToken` хийвэл яг ижил uid-аар нэвтэрнэ.
 *
 * ⚠ `null` буцаах нь АЛДАА БИШ: service account тохируулаагүй сервер
 * дээр custom token гарын үсэг зурах ТҮЛХҮҮР байхгүй. REST fallback-д
 * ийм үйлдэл байдаггүй тул дуудагч тал үүнийг ойлгомжтой хариу болгоно.
 */
export async function createCustomTokenFor(
  uid: string,
  claims?: Record<string, unknown>
): Promise<string | null> {
  const adminApp = initAdmin();
  if (!adminApp) return null;

  return getAuth(adminApp).createCustomToken(uid, claims);
}

export const adminMessaging = () => {
  const adminApp = initAdmin();

  if (!adminApp) {
    throw new Error(
      "Firebase Admin тохиргоо дутуу байна. FCM илгээхийн тулд бодит service account key-ийг тохируулна уу."
    );
  }

  return getMessaging(adminApp);
};

/**
 * ID token → session cookie.
 *
 * `null` буцаах нь АЛДАА БИШ: service account тохируулаагүй сервер дээр
 * (`initAdmin()` → null) session cookie үүсгэх БОЛОМЖГҮЙ, учир нь cookie-г
 * тухайн түлхүүрээр гарын үсэг зурдаг — REST fallback-д ийм үйлдэл байхгүй.
 * Тэр тохиолдолд апп Bearer токенийхоо горимд үлдэнэ. Дуудагч (`/api/auth/
 * session`) үүнийг ялгаж, клиентэд ойлгомжтой хариу өгнө.
 */
export async function createSessionCookie(
  idToken: string,
  expiresInMs: number
): Promise<string | null> {
  const adminApp = initAdmin();
  if (!adminApp) return null;

  return getAuth(adminApp).createSessionCookie(idToken, {
    expiresIn: expiresInMs,
  });
}

/**
 * Session cookie-ийн кэш. ID token-ийнхтэй ижил 60 секунд, ижил шалтгаан
 * (RSA гарын үсэг шалгах нь CPU-д хямд биш) — гэхдээ ТУСДАА Map:
 * түлхүүрийн орон зайг холилдуулбал нэг төрлийн утга нөгөөгийнхөө оронд
 * унших эрсдэл үүснэ.
 */
const sessionCookieCache = new Map<
  string,
  { at: number; user: DecodedFirebaseToken }
>();

/**
 * Session cookie-г шалгана. Хүчингүй бол `null` (шидэхгүй) — дуудагч талд
 * cookie байхгүйтэй ижил утгатай.
 *
 * ⚠ `checkRevoked: true` нь ЗААВАЛ. ID token 1 цаг амьдардаг тул түүнд
 * цуцлалт шалгах нь илүүц зардал байсан бол session cookie нь 14 ХОНОГ
 * амьдарна — админ хэрэглэгчийг Firebase дээр хаасны дараа хоёр долоо хоног
 * хүчинтэй үлдэх нь хүлээн зөвшөөрөгдөхгүй. Энэ нь Firebase рүү нэмэлт
 * дуудлага үүсгэдэг ч дээрх кэш нь давтамжийг 60 секундэд нэг болгож
 * хязгаарлана.
 */
export async function verifySessionCookie(
  cookie: string
): Promise<DecodedFirebaseToken | null> {
  const now = Date.now();
  const hit = sessionCookieCache.get(cookie);

  if (hit && now - hit.at < TOKEN_CACHE_MS) return hit.user;

  const adminApp = initAdmin();
  // Admin тохируулаагүй — cookie үүсэх ч боломжгүй байсан тул энд ирсэн
  // утга нь зөвхөн хуучирсан эсвэл хуурамч байж болно.
  if (!adminApp) return null;

  let user: DecodedFirebaseToken;

  try {
    const decoded = await getAuth(adminApp).verifySessionCookie(cookie, true);
    user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role: (decoded as { role?: unknown }).role,
      status: (decoded as { status?: unknown }).status,
      /*
       * ⚠ Cookie доторх утга нь cookie ҮҮССЭН мөчид хөлддөг (14 хоног).
       * Имэйлээ дараа нь баталгаажуулсан хүн энэ замаар `false` хэвээр
       * харагдана — тиймээс `Caller.emailVerified`-ыг зөвхөн "хожим дахин
       * оролдож болох" шийдвэрт л ашиглана (`lib/api/auth.ts` үзнэ үү).
       */
      email_verified: decoded.email_verified === true,
    };
  } catch (error) {
    // Хугацаа дууссан, цуцлагдсан, эсвэл гэмтсэн — бүгд "нэвтрээгүй".
    // Кэшлэхгүй: хэрэглэгч дахин нэвтрэхэд шинэ cookie өөр утгатай байх тул
    // хуучин нь дахин шалгагдахгүй.
    console.warn("Session cookie шалгахад алдаа гарлаа:", error);
    return null;
  }

  if (sessionCookieCache.size >= MAX_CACHED_TOKENS) {
    const oldest = sessionCookieCache.keys().next().value;
    if (oldest !== undefined) sessionCookieCache.delete(oldest);
  }

  sessionCookieCache.set(cookie, { at: now, user });
  return user;
}

/** Admin SDK бэлэн эсэх — session cookie горим боломжтой юу гэдгийг илэрхийлнэ. */
export const canIssueSessionCookie = hasFirebaseAdminConfig;
