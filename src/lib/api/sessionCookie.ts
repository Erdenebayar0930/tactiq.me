import "server-only";

/**
 * Firebase session cookie — олон дэд домэйн хооронд нэвтрэлт хуваалцах суурь.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: апп нь ID token-ыг `Authorization: Bearer` толгойгоор
 * дамжуулдаг (`lib/apiClient.ts`). Тэр загвар нэг origin дээр төгс ажилладаг
 * ч ХОЁР сул талтай:
 *
 *   1. Firebase-ийн сесс IndexedDB-д хадгалагддаг ба IndexedDB нь origin
 *      тус бүрд ТУСДАА. `learn.daamal.org` дээр нэвтэрсэн хүн
 *      `admin.daamal.org` дээр нэвтрээгүй харагдана.
 *   2. Токен зөвхөн `fetch`-ийн толгойд ирдэг тул SSR (server component,
 *      middleware) хэрэглэгчийг ОГТ мэдэхгүй — бүх хамгаалалт клиент дээр л
 *      хийгддэг.
 *
 * Session cookie нь хоёуланг нь шийднэ: `Domain=.daamal.org` гэж тавибал бүх
 * дэд домэйн ижил cookie-г автоматаар илгээх ба сервер түүнийг хүсэлтийн эхэнд
 * шалгаж чадна.
 *
 * ⚠ Bearer токеныг ОРЛОХГҮЙ, ХАЖУУД нь ажиллана. `getCaller` эхлээд толгойг,
 * дараа нь cookie-г үзнэ. Admin SDK тохируулаагүй сервер дээр cookie огт
 * үүсэхгүй бөгөөд апп өмнөх шигээ Bearer-ээр ажиллана — энэ нь зориудаар
 * ийм: тохиргоо дутуу байхад нэвтрэлт бүхэлдээ унах ёсгүй.
 */

/**
 * Нэр нь `__session` байх нь ЗААВАЛ БИШ ч ач холбогдолтой: Firebase Hosting
 * болон Cloud CDN нь ЗӨВХӨН энэ нэртэй cookie-г origin руу дамжуулдаг,
 * бусдыг нь хаядаг. Хожим CDN-ий ард ороход нэр солих шаардлагагүй байхын
 * тулд эхнээс нь энэ нэрийг сонгов.
 */
export const SESSION_COOKIE_NAME = "__session";

/**
 * Firebase-ийн `createSessionCookie` нь 5 минутаас 14 хоногийн хооронд л
 * зөвшөөрдөг — түүнээс гадуур утга өгвөл алдаа шиднэ.
 */
/**
 * HttpOnly cookie-г JS уншиж чаддаггүй тул клиент "надад cookie байна уу"
 * гэдгийг мэдэх аргагүй — үүнээс болж хуудас ачаалагдах БҮРД cookie дахин
 * үүсгэх хүсэлт явуулах болно (Firebase Admin руу нэмэлт RPC бүрд).
 *
 * Тиймээс хажууд нь НУУЦ АГУУЛГАГҮЙ маркер тавина: утга нь зөвхөн дуусах
 * хугацааны timestamp. Уншигдахаас хамаагүй (нэвтэрсэн эсэхийг хөтөч
 * өөрөө мэдэж л байгаа), гэвч ЭРХ ШАЛГАХАД ХЭЗЭЭ Ч АШИГЛАХГҮЙ — түүнийг
 * хэрэглэгч гараар засаж болно. Зөвхөн "дахин үүсгэх үү" гэдгийг шийднэ.
 */
export const SESSION_MARKER_COOKIE_NAME = "__session_expires";

const MAX_DAYS = 14;
const MIN_MS = 5 * 60 * 1000;

export function sessionCookieMaxAgeMs(): number {
  const raw = Number(process.env.SESSION_COOKIE_DAYS);
  const days = Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_DAYS) : MAX_DAYS;

  return Math.max(MIN_MS, days * 24 * 60 * 60 * 1000);
}

/**
 * Cookie-г аль домэйнд тавихыг `SESSION_COOKIE_DOMAIN` шийднэ.
 *
 *   тохируулаагүй → зөвхөн ОДООГИЙН хост (localhost, нэг домэйнт байршуулалт)
 *   ".daamal.org"  → бүх дэд домэйн хуваалцана (SSO)
 *
 * ⚠ Домэйныг заавал цэгээр эхлүүлнэ. Цэггүй бол зарим хуучин хөтөч host-only
 * гэж үзэж, дэд домэйн руу дамжуулахгүй — SSO чимээгүйхэн ажиллахаа болино.
 */
function cookieDomain(): string | undefined {
  const raw = process.env.SESSION_COOKIE_DOMAIN?.trim();
  if (!raw) return undefined;

  return raw.startsWith(".") ? raw : `.${raw}`;
}

type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  domain?: string;
  maxAge: number;
};

export function sessionCookieOptions(maxAgeMs: number): CookieOptions {
  return {
    // JS-ээс уншигдахгүй — ID token нь `getIdToken()`-оор ил байдаг бол энэ
    // нь XSS-ийн үед ч гоожихгүй. Тиймээс 14 хоногийн наслалт зөвшөөрөгдөнө.
    httpOnly: true,
    // localhost нь http тул прод дээр л Secure. Дев дээр тавибал хөтөч
    // cookie-г огт хадгалахгүй бөгөөд шалтгаан нь консол дээр харагдахгүй.
    secure: process.env.NODE_ENV === "production",
    /**
     * `lax` — `strict` БИШ. Firebase-ийн `signInWithRedirect` (Google-ээр
     * нэвтрэх) нь гаднын origin-оос буцаж ирдэг ба `strict` үед тэр эхний
     * навигацид cookie ЯВАХГҮЙ. Хэрэглэгч нэвтэрсэн боловч сервер танихгүй
     * тул нэг удаа "гарсан" мэт харагдана.
     *
     * `none` хэрэггүй: бүх сайт нэг үндсэн домэйнд байх тул хүсэлт нь
     * cross-site биш.
     */
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    maxAge: Math.floor(maxAgeMs / 1000),
  };
}

/**
 * Устгах үеийн тохиргоо — `maxAge: 0`.
 *
 * ⚠ Домэйн, зам нь ҮҮСГЭХ үеийнхтэй ЯГ ТААРАХ ёстой. Зөрвөл хөтөч өөр cookie
 * гэж үзээд хуучныг нь үлдээх ба хэрэглэгч "гарсан" мөртлөө сервер талд
 * нэвтэрсэн хэвээр үлдэнэ.
 */
export function clearedSessionCookieOptions(): CookieOptions {
  return { ...sessionCookieOptions(MIN_MS), maxAge: 0 };
}

/**
 * Маркерын тохиргоо — `httpOnly` нь ЗӨВХӨН энд `false`.
 *
 * Домэйн, зам, наслалт нь үндсэн cookie-тэй ЯГ адил байх ёстой: хоёулаа
 * зэрэг үүсэж, зэрэг устах ёстой. Зөрвөл маркер нь байхгүй cookie-г
 * "байгаа" гэж хэлж, хэрэглэгч чимээгүйхэн нэвтрээгүй болно.
 */
export function sessionMarkerOptions(maxAgeMs: number) {
  const { httpOnly: _httpOnly, ...rest } = sessionCookieOptions(maxAgeMs);
  return { ...rest, httpOnly: false as const };
}

export function clearedSessionMarkerOptions() {
  return { ...sessionMarkerOptions(MIN_MS), maxAge: 0 };
}
