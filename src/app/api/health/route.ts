import { createHash, createPrivateKey, timingSafeEqual } from "node:crypto";

import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getCaller, isSuperRole } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rateLimit";
import { getFirebaseAdminConfig, isFirebaseClientConfigured } from "@/lib/config";
import { db } from "@/lib/db";
import { databaseUrlSource, resolveDatabaseUrl } from "@/lib/db/createPool";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Урт нь зөрсөн ч тогтмол хугацаа зарцуулж, тэмдэгт таамаглахаас сэргийлнэ. */
function secretsMatch(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Дэлгэрэнгүй оношилгоо харах эрхтэй эсэх.
 *
 * ⚠ Энэ хариулт нь Firebase project id, өгөгдлийн сангийн хост/порт, драйверийн
 * алдааны текст зэрэг халдагчид зориулсан "зураглал" агуулдаг. Нууц утга
 * (нууц үг, түлхүүр) огт гардаггүй ч, эдгээр нь дараагийн алхмыг төлөвлөхөд
 * шууд хэрэглэгддэг тул нэрээ нууцалсан хүнд үзүүлэхгүй.
 *
 * Хоёр зам: байршуулалтын скриптэд зориулсан `HEALTH_TOKEN`, эсвэл нэвтэрсэн
 * супер админ. Аль нь ч байхгүй бол зөвхөн "амьд эсэх" хариулт буцна.
 */
async function canSeeDetails(request: NextRequest): Promise<boolean> {
  const expected = process.env.HEALTH_TOKEN;
  const given =
    request.headers.get("x-health-token") ??
    new URL(request.url).searchParams.get("token");

  if (expected && given && secretsMatch(given, expected)) return true;

  try {
    const caller = await getCaller(request);
    return (
      caller?.user?.status === "active" && isSuperRole(caller.user.role)
    );
  } catch {
    // Сан унасан үед супер админыг таних боломжгүй — HEALTH_TOKEN нь яг ийм
    // тохиолдолд хэрэгтэй нөөц зам
    return false;
  }
}

/**
 * Postgres-ийн алдааны кодыг (SQLSTATE) хүн ойлгохоор тайлбар руу буулгана.
 *
 * Эдгээр нь бодит байршуулалтад хамгийн олон тааралддаг гурав-дөрөв:
 * буруу нууц үг, байхгүй сан, хаалттай порт.
 */
const POSTGRES_HINTS: Record<string, string> = {
  "28P01": "Хэрэглэгчийн нэр эсвэл нууц үг буруу.",
  "28000": "Энэ хэрэглэгчид сервер рүү холбогдох эрх олгоогүй (pg_hba.conf).",
  "3D000": "Заасан нэртэй сан байхгүй байна.",
  "42P01": "Хүснэгт байхгүй — `npm run db:push` ажиллуулаагүй байж магадгүй.",
  ECONNREFUSED: "Postgres сервер хариу өгсөнгүй — host болон порт-оо шалгана уу.",
  ENOTFOUND: "Postgres-ийн хостын нэр олдсонгүй.",
  ETIMEDOUT: "Postgres холболт хугацаа хэтэрлээ.",
  /**
   * Ачаалал ихсэхэд илэрдэг алдаа — "апп унасан" мэт харагддаг ч шалтгаан
   * нь ондоо тул зөвлөмжийг нь ялгав.
   */
  "53300":
    "Postgres-ийн холболтын хязгаар дүүрлээ. DATABASE_POOL_MAX-ыг бууруулна уу (Passenger процесс бүр өөрийн pool-той тул тоо үржинэ).",
};

/**
 * Firebase service account-ын хувийн түлхүүрийг ҮНЭХЭЭР задарч байгаа эсэхийг
 * шалгана. Зөвхөн "хоосон биш" гэж шалгах нь хангалтгүй: орлуулагч утга
 * (`-----BEGIN PRIVATE KEY-----\n…\n-----END…`) тавихад тест давчихдаг ба
 * мэдэгдэл чимээгүйхэн ажиллахгүй болдог.
 *
 * Түлхүүрийн агуулгыг ХЭЗЭЭ Ч буцаахгүй — зөвхөн задарсан эсэх, урт нь.
 */
function describePrivateKey(key: string): Record<string, unknown> {
  if (!key) return { status: "missing" };

  const body = key.replace(/-----[A-Z ]+-----/g, "").replace(/\s/g, "");

  try {
    createPrivateKey(key);
    return { status: "valid", bodyLength: body.length };
  } catch (error) {
    return {
      status: "invalid",
      bodyLength: body.length,
      // Жинхэнэ RSA-2048 түлхүүрийн их бие ~1600 тэмдэгт байдаг
      expectedBodyLength: "~1600",
      hint:
        body.length < 100
          ? "Утга нь хэтэрхий богино — орлуулагч эсвэл таслагдсан байна. Firebase Console → Project settings → Service accounts → Generate new private key."
          : "Түлхүүр задрахгүй байна. Мөр таслалт `\\n` хэлбэрээр бичигдсэн, бүхэлдээ хашилтанд байгаа эсэхийг шалгана уу.",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Драйверийн жинхэнэ алдааны кодыг олно.
 *
 * Drizzle нь `pg`-ийн алдааг өөрийн "Failed query: …" алдаагаар БООДОГ тул
 * дээд түвшний мессеж нь юу болсныг огт хэлдэггүй. Жинхэнэ шалтгаан нь
 * `cause` гинжин дотор нуугдана — түүнийг гүйлгэж олно.
 */
function findDriverCode(error: unknown): string | null {
  let current: unknown = error;

  for (let depth = 0; current && depth < 5; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }

  return null;
}

/**
 * Ажиллаж буй процесс ЯМАР тохиргоо барьж байгааг мэдээлнэ.
 *
 * Байршуулалтын үед хамгийн ойлгомжгүй асуулт нь "би hosting дээр хувьсагчаа
 * зассан — апп түүнийг үнэхээр авсан уу?" гэдэг. Хадгалсан файл зөв атлаа
 * ажиллаж буй процесс хуучин утгаа барьж байх нь элбэг тохиолддог бөгөөд
 * гаднаас нь ялгах ямар ч арга байдаггүй.
 *
 * Хэрэглэгчийн нэр, нууц үгийг ил гаргахгүй — оронд нь бүтэн мөрийн sha256-ийн
 * эхний 8 тэмдэгтийг өгнө. Серверийн файл дээр ижил хэшийг тооцоод зөрүүлж
 * харьцуулбал тохиргоо хүрсэн эсэх нь шууд мэдэгдэнэ:
 *
 *   printf "%s" "$DATABASE_URL" | sha256sum | cut -c1-8
 */
function describeDbConfig() {
  const url = resolveDatabaseUrl();
  // Аль нэрээр тохируулсныг харуулна — POSTGRES_URL нь DATABASE_URL-ыг дардаг
  const source = databaseUrlSource();

  if (!url) return { configured: false as const, source };

  const fingerprint = createHash("sha256").update(url).digest("hex").slice(0, 8);

  try {
    const parsed = new URL(url);

    return {
      configured: true as const,
      source,
      // Loopback хаяг — нууц мэдээлэл биш, харин localhost/127.0.0.1 зөрүүг
      // шууд харуулдаг тул оношилгоонд хамгийн хэрэгтэй талбар.
      host: parsed.hostname,
      port: parsed.port || "5432",
      fingerprint,
    };
  } catch {
    // URL болж задрахгүй байна — хашилт, зай, дутуу тэмдэг орсон байж болно
    return { configured: true as const, source, malformed: true, fingerprint };
  }
}

export async function GET(request: NextRequest) {
  // Нэвтрэлтгүй хүрэх боломжтой цөөн route-ийн нэг бөгөөс дуудалт бүрд
  // өгөгдлийн сан руу асуулга явуулна — хязгааргүй бол хямд DoS суваг
  const limited = await rateLimit(request, {
    name: "health",
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const detailed = await canSeeDetails(request);

  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  let dbOk = true;

  try {
    await db.execute(sql`select 1` as never);
    checks.postgres = "ok";
  } catch (error) {
    dbOk = false;
    const code = findDriverCode(error);

    /**
     * Оношилгооны дэлгэрэнгүйг ЗӨВХӨН серверийн лог руу бичнэ (HTTP хариунд
     * хэзээ ч оруулахгүй). Тохиргоо буруу үед "яг ямар утга процесст ирсэн бэ"
     * гэдгийг өөр аргаар мэдэх боломжгүй: Passenger нь процессоо тусгаарладаг
     * тул /proc-оос ч уншигдахгүй.
     *
     * Нууц үгийг бүтнээр нь хэвлэхгүй — урт болон эхний/сүүлийн 2 тэмдэгт нь
     * бичилтийн алдааг олоход хангалттай.
     */
    const raw = resolveDatabaseUrl();

    if (raw) {
      try {
        const parsed = new URL(raw);
        const pw = parsed.password;

        console.error("[health] холболтын мөрийн задаргаа:", {
          source: databaseUrlSource(),
          length: raw.length,
          user: parsed.username,
          host: parsed.hostname,
          port: parsed.port,
          database: parsed.pathname.slice(1),
          passwordLength: pw.length,
          passwordEdges: pw.length > 4 ? `${pw.slice(0, 2)}…${pw.slice(-2)}` : "?",
          percentCount: (pw.match(/%/g) ?? []).length,
        });
      } catch {
        console.error("[health] холболтын мөр URL болж задрахгүй байна");
      }
    }

    checks.postgres = {
      status: "error",
      /**
       * Драйверийн бүтэн мессеж нь хэрэглэгчийн нэр, хостыг агуулдаг (жишээ нь
       * "password authentication failed for user \"x\"") ба Drizzle-ийн
       * мессеж нь бүтэн SQL асуулгыг агуулна. Хоёул зөвхөн эрхтэй хүнд.
       */
      code: code ?? "UNKNOWN",
      hint: code ? (POSTGRES_HINTS[code] ?? null) : null,
      ...(detailed
        ? { message: error instanceof Error ? error.message : "Unknown error" }
        : {}),
    };
  }

  /**
   * Эрхгүй дуудагчид зөвхөн "амьд эсэх" — uptime хянагч, load balancer-т
   * хангалттай. Дэлгэрэнгүй тохиргоо нь `HEALTH_TOKEN` эсвэл супер админд.
   */
  if (!detailed) {
    return NextResponse.json(
      { status: dbOk ? "ok" : "error", timestamp: checks.timestamp },
      { status: dbOk ? 200 : 503 }
    );
  }

  const firebaseConfig = getFirebaseAdminConfig();
  const privateKeyStatus = describePrivateKey(firebaseConfig.privateKey);
  checks.firebase = {
    /**
     * ⚠ Утга БАЙГАА эсэхийг шалгаад зогсохгүй, ҮНЭХЭЭР задарч байгааг шалгана.
     * Өмнө нь зөвхөн хоосон эсэхийг хардаг байсан тул орлуулагч утга тавихад
     * "configured" гэж мэдээлж, мэдэгдэл огт илгээгдэхгүй байгаа шалтгааныг
     * нуучихсан байв.
     */
    status:
      !firebaseConfig.projectId || !firebaseConfig.clientEmail || !firebaseConfig.privateKey
        ? "missing-config"
        : privateKeyStatus.status === "valid"
          ? "configured"
          : "invalid-private-key",
    projectId: firebaseConfig.projectId || null,
    privateKey: privateKeyStatus,
  };

  /**
   * Client тохиргоо нь build ҮЕД кодод шигддэг тул энд харагдах утга нь
   * "сүүлийн build хийх үед NEXT_PUBLIC_* байсан уу" гэдгийг илэрхийлнэ.
   * `missing` бол env нэмсний дараа заавал ДАХИН BUILD хийх шаардлагатай —
   * зөвхөн restart хийхэд шинэ утга кодод орохгүй бөгөөд нэвтрэлт
   * ажиллахгүй хэвээр байна.
   */
  checks.firebaseClient = isFirebaseClientConfigured()
    ? "configured"
    : "missing";

  // Firebase Admin — ID token шалгах, custom claim бичихэд шаардлагатай.
  // Энэ түлхүүр буруу бол БҮХ нэвтрэлт сервер талд унана.
  checks.firebaseAdmin = { privateKey: privateKeyStatus };

  checks.dbConfig = describeDbConfig();

  return NextResponse.json(checks);
}
