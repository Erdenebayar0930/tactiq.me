import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/api/rateLimit";
import {
  SESSION_COOKIE_NAME,
  SESSION_MARKER_COOKIE_NAME,
  clearedSessionCookieOptions,
  clearedSessionMarkerOptions,
  sessionCookieMaxAgeMs,
  sessionCookieOptions,
  sessionMarkerOptions,
} from "@/lib/api/sessionCookie";
import { badRequest, serverError, unauthorized } from "@/lib/api/auth";
import {
  canIssueSessionCookie,
  createSessionCookie,
  verifyCallerToken,
} from "@/lib/firebaseAdmin";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ID token-ыг HttpOnly session cookie болгож солино.
 *
 * Клиент (`UserContext`) нэвтэрсний дараа НЭГ УДАА дуудна. Түүнээс хойш
 * хөтөч cookie-г бүх хүсэлтэд өөрөө хавсаргах тул:
 *
 *   • ижил үндсэн домэйны БҮХ дэд сайт нэвтэрсэн хэрэглэгчийг таних
 *   • server component / route handler хүсэлтийн эхэнд эрхийг мэддэг болох
 *
 * ⚠ Энэ route нь `getCaller`-ыг ашиглахгүй — тэр нь Postgres дэх мөрийг ч
 * шаарддаг бол энд бид зөвхөн "Firebase дээр энэ токен зөв үү" гэдгийг л
 * асууна. Шинэ бүртгүүлж буй хэрэглэгч (`/api/auth/register` дуудахаас өмнө)
 * Postgres дээр байхгүй байх нь ХЭВИЙН бөгөөд түүнд ч cookie хэрэгтэй.
 */
export async function POST(request: NextRequest) {
  // Нэвтрээгүй хүн хүрч чадах route — токен таамаглах оролдлогыг хязгаарлана
  const limited = await rateLimit(request, {
    name: "session",
    limit: 20,
    windowMs: 300_000,
  });
  if (limited) return limited;

  if (!canIssueSessionCookie()) {
    /**
     * 501 — "энэ сервер дээр тохируулагдаагүй". 401/500 БИШ гэдэг нь чухал:
     * клиент үүнийг харвал ЧИМЭЭГҮЙ Bearer горимдоо үлдэх ёстой, хэрэглэгчийг
     * гаргах ч, алдаа харуулах ч ёсгүй.
     */
    return NextResponse.json(
      {
        error: "Session cookie идэвхгүй — Firebase Admin тохируулаагүй байна.",
        code: "session-cookie-unavailable",
      },
      { status: 501 }
    );
  }

  let idToken: unknown;

  try {
    ({ idToken } = (await request.json()) as { idToken?: unknown });
  } catch {
    return badRequest("Хүсэлтийн бие JSON биш байна.");
  }

  if (typeof idToken !== "string" || !idToken) {
    return badRequest("idToken шаардлагатай.");
  }

  try {
    // Эхлээд шалгана. `createSessionCookie` өөрөө ч токеныг шалгадаг боловч
    // түүний алдаа нь ялгах боломжгүй ерөнхий хэлбэртэй ирдэг — энд урьдчилж
    // шалгаснаар "буруу токен" (401) болон "сервер асуудалтай" (500) хоёрыг
    // ялган хариулна.
    await verifyCallerToken(idToken);
  } catch (error) {
    console.warn("Session cookie үүсгэх: ID token хүчингүй:", error);
    return unauthorized();
  }

  try {
    const maxAgeMs = sessionCookieMaxAgeMs();
    const cookie = await createSessionCookie(idToken, maxAgeMs);

    // `canIssueSessionCookie()` дээш шалгагдсан тул энд `null` ирэх учиргүй —
    // гэвч төрлийг нарийсгах, мөн тохиргоо хүсэлтийн явцад алдагдсан
    // тохиолдолд 500-аар унахгүйн тулд давтан шалгав.
    if (!cookie) {
      return NextResponse.json(
        {
          error: "Session cookie үүсгэж чадсангүй.",
          code: "session-cookie-unavailable",
        },
        { status: 501 }
      );
    }

    const expiresAt = Date.now() + maxAgeMs;
    const response = NextResponse.json({ ok: true, expiresAt });

    response.cookies.set(SESSION_COOKIE_NAME, cookie, sessionCookieOptions(maxAgeMs));
    // Маркерыг ХАМТ тавина — клиент дараагийн ачаалалт дээр дахин үүсгэх
    // эсэхийг үүгээр шийднэ (`lib/sessionSync.ts`).
    response.cookies.set(
      SESSION_MARKER_COOKIE_NAME,
      String(expiresAt),
      sessionMarkerOptions(maxAgeMs)
    );

    return response;
  } catch (error) {
    return serverError(error, "Session cookie үүсгэж чадсангүй.");
  }
}

/**
 * Cookie-г устгана. Гарах бүрд (`lib/session.ts` → `signOutCompletely`)
 * дуудагдана.
 *
 * ⚠ Энэ нь ЗӨВХӨН хөтчийн cookie-г устгана — Firebase дээрх сессийг
 * цуцлахгүй. Бүх төхөөрөмжөөс гаргах хэрэгтэй бол `revokeRefreshTokens`
 * дуудах ёстой ба тэр нь тусдаа админ үйлдэл.
 *
 * Эрх шалгахгүй: cookie байхгүй хүн үүнийг дуудвал ЮУ Ч болохгүй. Харин
 * шалгалт нэмбэл хугацаа нь дууссан cookie-тэй хэрэглэгч түүнийгээ УСТГАЖ
 * ЧАДАХГҮЙ болно — яг эсрэг үр дүн.
 */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(SESSION_COOKIE_NAME, "", clearedSessionCookieOptions());
  response.cookies.set(SESSION_MARKER_COOKIE_NAME, "", clearedSessionMarkerOptions());

  return response;
}
