import { Pool } from "pg";

/**
 * Холболтын мөрийг аль env хувьсагчаас авахыг шийднэ.
 *
 * `POSTGRES_URL` нь `DATABASE_URL`-аас ДАВУУ эрхтэй. Шалтгаан нь практик:
 * hosting самбарууд `DATABASE_URL` гэдэг нэрийг өөрсдийн интеграцад
 * ашиглаж, хадгалахгүй байх эсвэл хуучин утгыг барих нь тохиолддог. Тийм
 * үед платформ хөндөхгүй өөр нэр өгөх нь цорын ганц гарц болно.
 *
 * Хоёулаа байвал `POSTGRES_URL` ялна — өөрөөр хэлбэл гацсан `DATABASE_URL`-ыг
 * устгах шаардлагагүй, зүгээр л дээрээс нь дарж бичнэ.
 */
export function resolveDatabaseUrl(): string | undefined {
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || undefined;
}

/** Холболтын мөр аль хувьсагчаас ирснийг хэлнэ — оношилгоонд хэрэгтэй */
export function databaseUrlSource(): "POSTGRES_URL" | "DATABASE_URL" | null {
  if (process.env.POSTGRES_URL) return "POSTGRES_URL";
  if (process.env.DATABASE_URL) return "DATABASE_URL";
  return null;
}

/**
 * PostgreSQL pool — апп болон CLI скриптүүд хоёулаа эндээс авна.
 *
 * `server-only`-г ЗОРИУДААР импортлохгүй: `scripts/`-ийн tsx скриптүүд ч энэ
 * файлыг ашиглана. Сервер талын хамгаалалт нь `./index.ts`-д байна.
 */
export function createDbPool(
  connectionString: string,
  /**
   * Холболтын дээд тоо. Ихэвчлэн env-ээс авна, гэвч backup зэрэг ганц
   * холболтоор УДААН ажилладаг ажилд 1 өгч, shared hosting дээрх хомс
   * холболтыг хэрэглэгчийн хүсэлтэд үлдээнэ.
   */
  connectionLimit = Number(process.env.DATABASE_POOL_MAX ?? 10)
): Pool {
  return new Pool({
    connectionString,
    max: connectionLimit,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    /**
     * ⚠ ХАМГИЙН ЧУХАЛ ХАМГААЛАЛТ ОЛОН ХАНДАЛТАД: нэг удаан асуулга pool-ийн
     * холболтыг мөнхөд барьвал (индексгүй scan, түгжээ хүлээх) үлдсэн бүх
     * хүсэлт `connectionTimeoutMillis`-д хүрч, апп бүхэлдээ "унасан" мэт
     * болдог. Postgres талд 10 секундээр таслуулснаар гэмтэл нэг л route-д
     * хязгаарлагдана.
     *
     * `statement_timeout` — сервер тал таслана (найдвартай).
     * `query_timeout`     — клиент тал (pg драйвер) таслана, сервер хариу
     *                       өгөхгүй өлгөгдсөн тохиолдолд ажиллана.
     * Хоёуланг нь тавьсан нь давхардал биш, өөр өөр гэмтлийг барина.
     *
     * ⚠ Урт ажил (backup, миграц) энэ pool-ыг ашиглавал таслагдана. Тийм
     * скриптүүд `DATABASE_STATEMENT_TIMEOUT_MS=0` (хязгааргүй) өгнө.
     */
    statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 10_000),
    query_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 10_000),
    /**
     * NAT/галт хана 5-15 минут "чимээгүй" TCP холболтыг чимээгүйхэн таслдаг.
     * Тэр үхсэн холболтыг pool мэдэхгүй тул дараагийн хэрэглэгч түүнийг авч,
     * ETIMEDOUT-оор унана. TCP keepalive нь холболтыг амьд байлгана.
     */
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    /**
     * Нэг холболтыг мөнхөд ашиглавал Postgres талд түр зуурын объект,
     * prepared statement хуримтлагдаж санах ой ургадаг. 5000 удаагийн дараа
     * шинэчилснээр тэр өсөлт тогтмол таслагдана (хэрэглэгч мэдрэхгүй —
     * pool завсарлагад солино).
     */
    maxUses: 5_000,
    /**
     * DATABASE_SSL: "require" — жинхэнэ сертификат шалгана
     *               "relaxed" — өөрийн гарын үсэгтэй сертификат зөвшөөрнө
     *               тохируулаагүй — SSL хэрэглэхгүй (нэг серверийн дотор)
     */
    ssl:
      process.env.DATABASE_SSL === "relaxed"
        ? { rejectUnauthorized: false }
        : process.env.DATABASE_SSL === "require"
          ? {}
          : undefined,
  });
}
