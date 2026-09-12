export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export interface FirebaseAdminConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Firebase-ийн web түлхүүрүүд нь НУУЦ БИШ — хөтөч рүү ил очдог бөгөөд
 * хамгаалалт нь Firebase-ийн дүрэм дээр тогтдог.
 *
 * ГЭВЧ энд ХАТУУ БИЧСЭН НӨӨЦ УТГА ТАВИХГҮЙ. Урьд нь ийм нөөц утга байсан ба
 * тэр нь тохиргоо дутуугийн шинжийг НУУДАГ байв: env хувьсагч байхгүй үед
 * нэвтрэх нь ажиллаад, сервер тал нь (FIREBASE_* admin түлхүүр, DATABASE_URL)
 * ажиллахгүй үлддэг. Апп "хагас эрүүл" харагдаж, эрх шалгах дэлгэц дээр гацна.
 * Түүнээс ч дор нь: буруу төслийн түлхүүр үлдвэл өөр аппын хэрэглэгчийн сан
 * руу чимээгүйхэн холбогдоно.
 *
 * Одоо дутуу тохиргоо нь ИЛ гарна — `/api/health` мэдээлнэ, консол анхааруулна.
 */

/**
 * Client тохиргоог env-ээс бүрэн авч чадсан эсэх.
 *
 * `false` бол `NEXT_PUBLIC_FIREBASE_*` тохируулагдаагүй — эдгээр нь BUILD
 * ҮЕД шигтгэгддэг тул сервер дээр дараа нь нэмэх нь ажиллахгүй, дахин
 * build хийх шаардлагатай.
 */
export function isFirebaseClientConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
}

export function getFirebaseClientConfig(): FirebaseClientConfig {
  if (!isFirebaseClientConfigured()) {
    console.warn(
      "[config] NEXT_PUBLIC_FIREBASE_* тохируулаагүй байна. Нэвтрэлт " +
        "ажиллахгүй — .env.local-оо шалгаад дахин build хийнэ үү. " +
        "Дэлгэрэнгүйг /api/health-аас үзнэ үү."
    );
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId,
    // Bucket заагаагүй бол шинэ төслүүдийн үндсэн нэр рүү унана — хоосон
    // үлдээвэл getStorage() алдаа өгнө.
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      (projectId ? `${projectId}.firebasestorage.app` : ""),
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  };
}

/**
 * Service account-ын PEM түлхүүрийг задлана.
 *
 * Түлхүүрийг орчны хувьсагчид байрлуулах нь мөр таслалтаас болж найдваргүй:
 * hosting панелиуд утгыг ямар хэлбэрээр хадгалахаа өөрсдөө шийддэг. Бодит
 * байршуулалт дээр хоёр гажилт ЗЭРЭГ илэрсэн:
 *
 *   • хашилт нь утгын ХЭСЭГ болж үлдсэн  → `"-----BEGIN…-----\n…"`
 *   • backslash нь давхар escape хийгдсэн → `\\n` (жинхэнэ `\n`-ий оронд)
 *
 * Аль аль нь `createPrivateKey()`-г "DECODER routines::unsupported" алдаагаар
 * унагаадаг ба алдааны мессеж нь шалтгааныг огт заадаггүй. Панелийн зан үйлийг
 * бид хянах боломжгүй тул задаргааг нь энд тэвчээртэй болгов.
 *
 * base64-ийн их бие backslash агуулдаггүй тул `\\+n` → мөр таслалт гэсэн
 * хөрвүүлэлт зөв утгыг гэмтээхгүй.
 */
function normalizePrivateKey(raw: string | undefined): string {
  if (!raw) return "";

  let key = raw.trim();

  // Хашилтыг зөвхөн хос байвал хуулна — түлхүүрийн дотор хашилт байхгүй.
  // `.` нь мөр таслалтыг барихгүй тул `[\s\S]`.
  if (/^(["'])[\s\S]*\1$/.test(key)) {
    key = key.slice(1, -1);
  }

  return key.replace(/\\+n/g, "\n");
}

export function getFirebaseAdminConfig(): FirebaseAdminConfig {
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || "",
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "",
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  };
}

export function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}
