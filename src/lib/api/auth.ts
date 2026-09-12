import "server-only";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { verifyCallerToken, verifySessionCookie } from "@/lib/firebaseAdmin";
import { SESSION_COOKIE_NAME } from "./sessionCookie";
import {
  asRole,
  hasRole,
  isAdminRole,
  isSuperRole,
} from "@/lib/permissions";
import { backfillClaimsIfStale } from "./claims";

import type { NextRequest } from "next/server";
import type { UserRow } from "@/lib/db/schema";
import type { Actor, UserStatus } from "@/lib/permissions";

export type Caller = {
  uid: string;
  email: string;
  /**
   * Firebase дээр имэйл нь баталгаажсан эсэх (`email_verified` claim).
   *
   * ⚠ Энэ нь ТОКЕН доторх ХУУЛБАР. Хэрэглэгч имэйлээ дөнгөж баталгаажуулсан
   * бол гарт байгаа токен `false` хэвээр байна: ID token цагт нэг шинэчлэгддэг,
   * session cookie нь 14 хоног ХӨЛДӨНӨ. Тиймээс үүнийг ЗӨВХӨН урамшуулал
   * шиг "хожим дахин оролдож болох" шийдвэрт ашиглана — эрх хаах, хандалт
   * таслахад ХЭРЭГЛЭХГҮЙ, эс бөгөөс баталгаажуулсан хүн 14 хоног гацна.
   * Клиент тал `EmailVerifyBanner`-аар токеноо шахаж шинэчлүүлнэ.
   *
   * Google-ээр нэвтэрсэн хүнд ҮРГЭЛЖ `true` — Google имэйлээ өөрөө баталгаажуулна.
   */
  emailVerified: boolean;
  /** Postgres дэх бүртгэл — анх бүртгүүлж буй хэрэглэгчид байхгүй байж болно */
  user: UserRow | null;
};

export { isAdminRole, isSuperRole };

/* -------------------------------------------------------------------------
 * Хэрэглэгчийн мөрийн МАШ БОГИНО хугацааны кэш
 * ---------------------------------------------------------------------- */

/**
 * API хүсэлт БҮР `users` хүснэгтээс дуудагчийн мөрийг уншдаг. Энгийн үед энэ
 * нь хямд ч, polling хийдэг дэлгэцүүд (`/play` дараалал, WebRTC signal,
 * төлбөрийн статус) хэрэглэгч тутамд секундэд хэд хэдэн хүсэлт үүсгэдэг тул
 * НИЙТ ачаалал нь хэрэглэгчийн тоотой шугаман өсөж, цөөн холболттой
 * Postgres pool-ыг хамгийн түрүүнд дүүргэдэг.
 *
 * ⚠ ЗӨВХӨН УНШИХ (GET/HEAD) хүсэлтэд кэшлэнэ. Бичих үйлдэл (POST/PATCH/
 * DELETE) нь ҮРГЭЛЖ шинэ мөр уншина — эс бөгөөс "зүрх хасах", "XP нэмэх"
 * зэрэг унших-өөрчлөх-бичих логик хуучирсан утган дээр ажиллаж, өгөгдөл
 * гажина.
 *
 * ⚠ Аюулгүй байдлын хамрах хүрээ: эрх хасах / бүртгэл хаах шийдвэр
 * ХАМГИЙН ИХДЭЭ 3 секунд хоцорч хүчинтэй болно, бас зөвхөн УНШИХ хүсэлтэд.
 * Бичих бүхэн шууд хаагдана. Токен шалгалт нь кэшлэгддэггүй — хүчингүй
 * токен ЯМАГТ шууд татгалзана.
 *
 * ⚠ Кэш нь ПРОЦЕСС ТУС БҮРД тусдаа (Redis-д хийхгүй): энэ бол хэрэглэгчийн
 * ХУВИЙН өгөгдөл бөгөөд `cache.ts` нь хэрэглэгчээс хамаарах утгыг хадгалахыг
 * зөвлөдөггүй. 3 секундын хугацаанд процессын санах ойд байх нь хамгийн
 * энгийн бөгөөд аюулгүй.
 */
const USER_CACHE_TTL_MS = 3_000;
/** Санах ой хамгаалах дээд хэмжээ — хамгийн хуучин бичлэгүүд хаягдана. */
const USER_CACHE_MAX = 5_000;

type UserCacheEntry = { user: UserRow | null; expiresAt: number };

const userCache = new Map<string, UserCacheEntry>();

function readUserCache(uid: string): UserCacheEntry | null {
  const entry = userCache.get(uid);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    userCache.delete(uid);
    return null;
  }
  return entry;
}

function writeUserCache(uid: string, user: UserRow | null) {
  // Map нь оруулсан дарааллаа хадгалдаг тул эхний түлхүүр нь хамгийн хуучин.
  if (userCache.size >= USER_CACHE_MAX) {
    const oldest = userCache.keys().next().value;
    if (oldest !== undefined) userCache.delete(oldest);
  }
  userCache.set(uid, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}

/**
 * Кэшийг ГАРААР хүчингүй болгоно.
 *
 * Хэрэглэгчийн эрх/төлөвийг өөрчилсөн route (админы эрх олгох, бүртгэл
 * хаах) үүнийг дуудвал өөрчлөлт ТЭР ДАРУЙ хүчинтэй болно — 3 секунд ч
 * хүлээхгүй. Дуудахаа мартсан ч TTL нь бүх зөрүүг өөрөө арилгана.
 */
export function invalidateCallerCache(uid: string) {
  userCache.delete(uid);
}

/** Эрхийн шалгалтад дамжуулах хэлбэрт буулгана. */
export const toActor = (caller: Caller): Actor => ({
  uid: caller.uid,
  role: asRole(caller.user?.role),
});

/**
 * Сервер талын дэд бүтэц ажиллахгүй байна — токен буруу гэсэн үг БИШ.
 *
 * Энэ ялгаа чухал: хоёуланг нь нэг дор барьж "нэвтрээгүй" гэж хариулбал
 * өгөгдлийн сан унасан үед хэрэглэгчид "та нэвтрээгүй байна" гэж ХУДАЛ
 * хэлж, жинхэнэ шалтгааныг бүрэн нуудаг.
 */
export class ServiceUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Сервер өгөгдлийн сан руу хандаж чадсангүй.");
    this.name = "ServiceUnavailableError";
    this.cause = cause;
  }
}

/**
 * Authorization: Bearer <idToken> толгойг Firebase-ээр шалгаж,
 * Postgres дэх бүртгэлтэй нь хамт буцаана.
 *
 * `null` = токен байхгүй эсвэл хүчингүй (жинхэнэ эрхийн алдаа).
 * `ServiceUnavailableError` шидэгдэнэ = токен ЗӨВ байсан ч сангаас уншиж
 * чадсангүй. Дуудагч эдгээрийг ялгаж, 401 болон 503-ыг зөв буцаана.
 */
export async function getCaller(request: NextRequest): Promise<Caller | null> {
  const header = request.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;

  let decoded;
  let viaCookie = false;

  if (idToken) {
    try {
      decoded = await verifyCallerToken(idToken);
    } catch (error) {
      console.warn("ID token шалгахад алдаа гарлаа:", error);
      return null;
    }
  } else {
    /**
     * Bearer толгой байхгүй — session cookie руу шилжинэ.
     *
     * ЯАГААД ЭНЭ ДАРААЛАЛ ВЭ: толгой нь ҮРГЭЛЖ ЗӨВХӨН тухайн хүсэлтийн
     * зорилгоор ГАРААР тавигддаг тул илүү тодорхой санаа илэрхийлнэ. Cookie
     * нь хөтөч автоматаар хавсаргадаг — түүнийг дээгүүр тавибал өөр
     * хэрэглэгчийн нэрийн өмнөөс дуудахыг зорьсон дотоод хүсэлт (жишээ нь
     * админы хэрэгсэл) чимээгүйхэн cookie-ийн эзний эрхээр ажиллана.
     *
     * ⚠ Cookie нь CSRF-д ил гэдгийг санах хэрэгтэй. Одоогийн хамгаалалт нь
     * `SameSite=lax` — GET биш бүх cross-site хүсэлтэд cookie явахгүй тул
     * бичих үйлдлүүд хамгаалагдсан. Хэрэв хожим `SameSite=none` шаардлагатай
     * болбол (жинхэнэ өөр домэйн) ЗААВАЛ CSRF токен нэмнэ.
     */
    const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!cookie) return null;

    // `verifySessionCookie` нь хүчингүй үед шидэхгүй, `null` буцаана
    decoded = await verifySessionCookie(cookie);
    if (!decoded) return null;

    viaCookie = true;
  }

  // Мөр байхгүй бол ЭНД үүсгэхгүй — бүртгэлийг зөвхөн /api/auth/register
  // үүсгэнэ. Тэр route нь системийн анхны хэрэглэгчийг super болгодог.
  // Энд авто-үүсгэвэл тэр шийдвэр бүхэлдээ тойрогдож, Firebase дээр
  // бүртгүүлсэн хэн ч эзний эрх авах эрсдэлтэй.
  /**
   * Зөвхөн УНШИХ хүсэлт кэшнээс идэж болно (дээрх `USER_CACHE_TTL_MS`-ийн
   * тайлбарыг үзнэ үү). Бичих хүсэлт ҮРГЭЛЖ шинэ мөр авна.
   */
  const cacheable = request.method === "GET" || request.method === "HEAD";

  try {
    const cached = cacheable ? readUserCache(decoded.uid) : null;

    const [user] = cached
      ? [cached.user ?? undefined]
      : await db
          .select()
          .from(users)
          .where(eq(users.uid, decoded.uid))
          .limit(1);

    if (!cached && cacheable) writeUserCache(decoded.uid, user ?? null);

    // Токен доторх эрхийн хуулбарыг Postgres-тэй тааруулна. Firebase Storage-ийн
    // дүрэм ЗӨВХӨН токеныг харж чаддаг тул энэ хуулбар шинэ байх ёстой.
    // Хүлээхгүй (await хийхгүй): хэрэглэгчийн хүсэлтийг Firebase-ийн хариу
    // хүлээлгэх шалтгаан байхгүй бөгөөд амжилтгүй болсон ч API-ийн эрх нь
    // доорх Postgres мөрөөр шийдэгдэнэ.
    /**
     * ⚠ Session cookie-гээр ирсэн хүсэлтэд backfill ХИЙХГҮЙ.
     *
     * Хоёр шалтгаан:
     *   1. Ашиггүй — claim нь cookie ҮҮСЭХ мөчид хөлддөг ба cookie 14 хоног
     *      амьдардаг. Firebase дээр claim-ийг хэдэн ч удаа дарж бичсэн ГАРТ
     *      БАЙГАА cookie өөрчлөгдөхгүй тул зөрүү арилахгүй.
     *   2. Хортой — `recentlySynced`-ийн 10 минутын хөргөлт нь давталтыг
     *      хязгаарладаг ч арилгадаггүй. Эрх нь солигдсон хэрэглэгч бүрийн
     *      хувьд 14 хоногийн турш 10 минут тутам Firebase рүү дэмий бичих
     *      хүсэлт явна.
     *
     * Claim-ийн ЖИНХЭНЭ хэрэглэгч нь Firebase Storage-ийн дүрэм бөгөөд тэр нь
     * ID TOKEN-ыг л хардаг (cookie-г биш). Тиймээс Bearer замаар ирэх хүсэлт
     * нөхөлтийг хийвэл хангалттай — хэрэглэгч апп нээх бүрдээ тэр замаар
     * хүсэлт явуулдаг.
     */
    if (user && !viaCookie) {
      void backfillClaimsIfStale(decoded, {
        role: asRole(user.role),
        status: (user.status ?? "active") as UserStatus,
      });
    }

    return {
      uid: decoded.uid,
      email: decoded.email ?? user?.email ?? "",
      // `email_verified` нь заавал байх claim БИШ — байхгүйг "баталгаажаагүй"
      // гэж үзнэ (аюулгүй тал руу нь).
      emailVerified: decoded.email_verified === true,
      user: user ?? null,
    };
  } catch (error) {
    // Токен зөв байсан — буруутай нь сан. 401 буцаах нь худал мэдээлэл болно.
    throw new ServiceUnavailableError(error);
  }
}

/**
 * `getCaller`-ыг дуудаад дэд бүтцийн гэмтлийг 503 болгож хувиргана.
 *
 * Route бүр try/catch бичихээс сэргийлж нэг дор баглав.
 */
export async function getCallerOrResponse(
  request: NextRequest
): Promise<{ caller: Caller | null } | { error: NextResponse }> {
  try {
    return { caller: await getCaller(request) };
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      return { error: serviceUnavailable(error) };
    }
    throw error;
  }
}

/** Нэвтэрсэн бөгөөд идэвхтэй хэрэглэгч эсэхийг шаардана. */
export async function requireActiveUser(request: NextRequest) {
  const result = await getCallerOrResponse(request);

  if ("error" in result) return result;

  const { caller } = result;

  if (!caller) {
    return { error: unauthorized() } as const;
  }

  if (!caller.user) {
    return {
      error: forbidden("Таны бүртгэл олдсонгүй.", "no-profile"),
    } as const;
  }

  if (caller.user.status !== "active") {
    // Төлөвийг код руу оруулснаар клиент "хаагдсан" эсвэл "хүлээгдэж буй"
    // гэдгийг ялгаж, зөв тайлбартай хуудас руу гаргана
    return {
      error: forbidden(
        "Таны бүртгэл идэвхгүй байна.",
        `account-${caller.user.status}`
      ),
    } as const;
  }

  return { caller } as const;
}

/** Идэвхтэй админ (admin | super) эсэхийг шаардана. */
export async function requireAdmin(request: NextRequest) {
  const result = await requireActiveUser(request);

  if ("error" in result) return result;

  if (!isAdminRole(result.caller.user?.role)) {
    return { error: forbidden("Зөвхөн админ хийх боломжтой үйлдэл.") } as const;
  }

  return result;
}

/**
 * Идэвхтэй багш (эсвэл хяналтад зориулж admin/super) эсэхийг шаардана.
 */
export async function requireTeacher(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result;

  const user = result.caller.user;
  // `hasRole` нь үндсэн БОЛОН нэмэлт (`secondaryRole`) эрхийг хоёуланг нь
  // шалгана — эцэг эх мөн багш байж болно.
  if (!user || (!hasRole(user, "teacher") && !isAdminRole(user.role))) {
    return { error: forbidden("Зөвхөн багш хийх боломжтой үйлдэл.") } as const;
  }

  return result;
}

/**
 * Идэвхтэй эцэг эх (эсвэл хяналтад зориулж admin/super) эсэхийг шаардана.
 */
export async function requireParent(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result;

  const user = result.caller.user;
  if (!user || (!hasRole(user, "parent") && !isAdminRole(user.role))) {
    return { error: forbidden("Зөвхөн эцэг эх хийх боломжтой үйлдэл.") } as const;
  }

  return result;
}

/** Зөвхөн супер админ — эрх олгох зэрэг шатлал өөрчлөх үйлдэлд. */
export async function requireSuper(request: NextRequest) {
  const result = await requireActiveUser(request);

  if ("error" in result) return result;

  if (!isSuperRole(result.caller.user?.role)) {
    return {
      error: forbidden("Зөвхөн супер админ хийх боломжтой үйлдэл."),
    } as const;
  }

  return result;
}

export const unauthorized = () =>
  NextResponse.json({ error: "Нэвтрээгүй байна." }, { status: 401 });

/**
 * 401 + `code: "login-required"` — туршилтын (`isTrial`) БИШ хичээлийг
 * зочин нээхийг оролдоход. `unauthorized()`-ээс ЯЛГААТАЙ нь `code` тавьдаг:
 * клиент (`LessonPlayer`) энэ кодыг танихад л `/login` руу шилжинэ, эс
 * бөгөөс ердийн алдааны мессеж харагдана.
 */
export const loginRequired = () =>
  NextResponse.json(
    { error: "Энэ хичээлийг үзэхийн тулд нэвтэрнэ үү.", code: "login-required" },
    { status: 401 }
  );

/**
 * 503 — сервер түр ажиллахгүй.
 *
 * 401 БИШ гэдэг нь чухал: apiClient нь 403-д л сессийг тасалдаг тул хэрэглэгч
 * гарахгүй, харин юу болсныг ил хэлнэ. Сан сэргэмэгц дараагийн шалгалт
 * өөрөө амжилттай болно.
 */
export const serviceUnavailable = (error: unknown) => {
  console.error("Өгөгдлийн сан руу хандаж чадсангүй:", error);

  return NextResponse.json(
    {
      error:
        "Сервер өгөгдлийн сан руу хандаж чадсангүй. Түр хүлээгээд дахин оролдоно уу.",
      code: "service-unavailable",
    },
    {
      status: 503,
      // Дахин оролдох хугацааг ил хэлнэ — хөтөч, хяналтын хэрэгслүүд хүндэтгэнэ
      headers: { "Retry-After": "5" },
    }
  );
};

/**
 * Алдаа нь ТҮР ЗУУРЫН хэт ачаалал мөн үү (кодын алдаа биш).
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: `pg` pool-ын холболт дүүрэх/цаг хэтрэхэд буцаах
 * алдааг ялгаж танихгүй бол энэ нь 500 болж буцна: клиент "апп эвдэрсэн"
 * гэж ойлгоод дахин оролдохгүй, лог нь жинхэнэ програмын алдаануудтай
 * холилдоно. Бодит байдал дээр энэ нь зүгээр л "одоо завгүй байна" гэсэн
 * үг — хэдхэн секундын дараа өөрөө засагдана.
 *
 * ⚠ Drizzle нь драйверийн жинхэнэ алдааг ГАДНА ТАЛЫН `DrizzleQueryError`-оор
 * боож, "Failed query: select …" гэсэн ӨӨР message өгдөг — жинхэнэ шалтгаан
 * нь `error.cause` дотор нуугдана. `.cause`-ыг шалгахгүй бол хамгаалалт
 * чимээгүйхэн ажиллахаа болино.
 *
 * Postgres-ийн алдааны кодууд (SQLSTATE): `53300` = too_many_connections,
 * `57014` = query_canceled. `ETIMEDOUT`/`ECONNRESET` нь `pg`-ийн сүлжээний
 * түвшний алдаа — `code` талбарт шууд ирнэ.
 */
const OVERLOAD_CODES = new Set([
  "53300", // too_many_connections
  "57014", // query_canceled
  "ETIMEDOUT",
  "ECONNRESET",
]);

export function isOverloadError(error: unknown): boolean {
  let current = error;

  // Drizzle ихэвчлэн НЭГ давхар боодог, гэхдээ ирээдүйд давхарлагдаж болзошгүй
  // тул хэдэн шатыг ч алгасахгүйн тулд бүхэл гинжийг дамжина.
  for (let depth = 0; current && depth < 5; depth += 1) {
    const code = (current as { code?: string }).code;
    if (code && OVERLOAD_CODES.has(code)) return true;

    const message = current instanceof Error ? current.message : String(current);
    if (message.includes("Queue limit reached")) return true;

    current = current instanceof Error ? current.cause : undefined;
  }

  return false;
}

/**
 * `code` нь клиентэд зориулсан машин уншигдах шалтгаан.
 * "account-blocked" | "account-pending" | "no-profile" гэсэн кодууд ирвэл
 * apiClient сессийг шууд таслана — эрх хаагдсан хэрэглэгч үлдэхгүй.
 */
export const forbidden = (message = "Эрх хүрэлцэхгүй.", code?: string) =>
  NextResponse.json({ error: message, code }, { status: 403 });

export const badRequest = (message: string) =>
  NextResponse.json({ error: message }, { status: 400 });

/**
 * 404 — хүссэн зүйл олдсонгүй.
 *
 * Нийтлэгдээгүй агуулгад ч ЭНЭ хариуг өгнө (403 биш): "байгаа боловч эрх
 * хүрэхгүй" гэж хэлэх нь ноорог хичээлийн нэр, тоо ширхгийг гадагш алдана.
 */
export const notFound = (message = "Олдсонгүй.") =>
  NextResponse.json({ error: message }, { status: 404 });

/**
 * 500 — дотоод алдаа. Клиентэд ЗӨВХӨН `fallback` тайлбарыг буцаана.
 *
 * ⚠ Өмнө нь `error.message`-ийг шууд буцаадаг байв. Drizzle нь SQL алдааг
 * "Failed query: select `users`.`uid` … from `users` where …" гэсэн бүтэн
 * асуулгатай нь боож шиддэг тул халдагч зориудаар алдаа үүсгээд хүснэгт,
 * баганы нэр, холболтын мэдээллийг цуглуулж, өгөгдлийн сангийн бүтцийг
 * зурж авах боломжтой байсан. Дэлгэрэнгүй нь серверийн лог руу л явна.
 */
export const serverError = (error: unknown, fallback: string) => {
  /**
   * Хэт ачааллыг 500 биш 503 болгоно. Хоёрын ялгаа хэрэглэгчид ч, лог
   * шинжлэхэд ч чухал: 500 = "энэ хүсэлт хэзээ ч ажиллахгүй", 503 = "одоо
   * завгүй, дахин оролдоорой".
   */
  if (isOverloadError(error)) return serviceUnavailable(error);

  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
};

/**
 * Хичээлийн АГУУЛГА нэмэх эрхтэй эсэх — багш, админ, супер.
 *
 * ⚠ `requireAdmin`-аас ЯЛГААТАЙ. Курс үүсгэх/устгах нь админд үлдэнэ
 * (`lib/api/contentAccess.ts` дахь дүрэм); нэгж, хичээл, дасгал нэмэхэд
 * багш ч оролцоно. Гэхдээ ЗАСАХ, УСТГАХ нь эзэмшлээр шалгагдана —
 * `canManageRow()` ЗААВАЛ дуудагдана, зөвхөн энэ шалгалтад найдаж
 * БОЛОХГҮЙ (энэ нь "нэвтрэх эрх", тэр нь "энэ мөрийг хөндөх эрх").
 */
export async function requireContentEditor(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result;

  const user = result.caller.user;

  if (!user || (!hasRole(user, "teacher") && !isAdminRole(user.role))) {
    return {
      error: forbidden("Хичээлийн агуулга нэмэх эрх танд байхгүй."),
    } as const;
  }

  return result;
}
