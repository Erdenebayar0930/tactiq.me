import "server-only";

import Redis from "ioredis";

/**
 * Redis холболт — процесс хооронд ХУВААЛЦАХ ёстой төлөв (rate limit, кэш)
 * үүнээр дамжина.
 *
 * ⚠ `REDIS_URL` тохируулаагүй бол `null` буцаана — Redis ЗААВАЛ БИШ. Нэг
 * PM2 процессоор ажиллаж байгаа бол (жишээ нь локал хөгжүүлэлт) төлөвийг
 * процессын дотоод санах ойд хадгалсан ч зөв ажиллана. Redis ЗӨВХӨН олон
 * процесс (PM2 cluster mode) зэрэг ажиллаж, тэдгээр нь нэг ижил төлөвийг
 * харах ёстой үед л шаардлагатай.
 *
 * Global дээр кэшлэх шалтгаан нь `./db/client.ts`-тэй адил: Next.js dev
 * горимд модуль дахин ачаалагдахад холболт хуримтлагдахаас сэргийлнэ.
 */
const globalForRedis = globalThis as unknown as {
  __redis?: Redis | null;
};

export function getRedis(): Redis | null {
  if (globalForRedis.__redis !== undefined) return globalForRedis.__redis;

  const url = process.env.REDIS_URL;

  if (!url) {
    // `deploy/ecosystem.config.js` instance тоог CPU-гаар автоматаар
    // тохируулдаг тул production дээр cluster mode (instances > 1) байх нь
    // элбэг — тэр үед Redis-гүй бол rateLimit.ts/cache.ts instance тус
    // бүрдээ тусдаа болж, хурдны хязгаарлалт үнэндээ instance-ийн тоогоор
    // хөнгөрдөг. Энэ нь чимээгүй эвдрэл тул НЭГ удаа (энэ функц
    // `globalForRedis`-д кэшлэгддэг тул автоматаар давтагдахгүй) чанга
    // анхааруулна.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "⚠ REDIS_URL тохируулаагүй байна — PM2 cluster mode-д хурдны " +
          "хязгаарлагч (rateLimit.ts) болон унших-кэш (cache.ts) instance " +
          "бүрдээ тусдаа ажиллана. deploy/ecosystem.config.js-ийн comment-ийг үзнэ үү."
      );
    }
    globalForRedis.__redis = null;
    return null;
  }

  const client = new Redis(url, {
    // Redis унтарсан ч апп унахгүй — дуудагч тал `catch`-аар санах ой дахь
    // хувилбар руу ухарна. Хязгааргүй давтан оролдвол хүсэлт бүр удаан хугацаа
    // хүлээж эцэст нь timeout болно.
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => Math.min(times * 200, 2_000),
    lazyConnect: false,
  });

  client.on("error", (error) => {
    console.warn("Redis холболтын алдаа:", error.message);
  });

  globalForRedis.__redis = client;
  return client;
}
