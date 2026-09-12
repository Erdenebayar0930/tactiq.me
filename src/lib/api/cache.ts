import "server-only";

import { getRedis } from "@/lib/redis";

/**
 * Хуваалцсан унших-кэш — Redis байвал бүх PM2 instance-ийн хооронд, үгүй
 * бол зөвхөн энэ процессын дотор.
 *
 * ЗӨВХӨН хэрэглэгчээс ХАМААРАХГҮЙ, ховор өөрчлөгддөг өгөгдөлд ашиглана
 * (курсын каталог гэх мэт). Хэрэглэгч тус бүрээр ялгаатай өгөгдлийг (жишээ
 * нь явц) энд хийвэл нэг хэрэглэгчийн мэдээлэл нөгөөд алдагдана.
 */
/**
 * Курсын каталогийн кэшийн түлхүүр — `/api/courses` уншина.
 *
 * ⚠ Түүнийг ХҮЧИНГҮЙ БОЛГОДОГ ГАЗАР БАЙХГҮЙ (зориуд): админ курс засахад
 * шинэ жагсаалт 60 секундын дотор өөрөө гарна. TTL нь тийм БОГИНО байгаа
 * нь яг үүний төлөө — тархсан кэшийг гараар хөөх нь мартагдвал хуучин
 * агуулга мөнхөд гацдаг тул богино TTL нь илүү найдвартай.
 */
export const COURSES_CATALOG_CACHE_KEY = "courses:catalog";

/**
 * НЭГ курсын замын бүтэц (бүлэг → хичээл) — `/api/courses/[slug]` уншина.
 *
 * ⚠ Хэрэглэгчээс ХАМААРАХГҮЙ: явц нь ТУСДАА route-оор ирдэг
 * (`/api/learn/progress`) тул энд зөвхөн агуулгын бүтэц байна. Кэшгүй
 * үед сурагч `/learn`-ийг нээх ТУТАМД 4 асуулга явдаг байв — хичээл
 * эхлэх үед хэдэн зуун сурагч зэрэг нээхэд тэр нь санг дараалалдаа
 * оруулна. Судокугийн курс 182 хичээлтэй болсноор зардал нь бүр өссөн.
 *
 * TTL нь каталогтой ижил 60 секунд — админы засвар тэр хугацаанд гарна.
 */
export const coursePathCacheKey = (slug: string) => `course:path:${slug}`;

/** Сургуулийн текстийн засвар — `lib/api/schools.ts` уншиж, админы
 * `/api/admin/schools/[slug]` бичих үед устгана. */
export const SCHOOLS_TEXT_CACHE_KEY = "schools:texts";

type MemoryEntry = { value: unknown; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();

export async function cacheGetOrSet<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached != null) return JSON.parse(cached) as T;
    } catch (error) {
      console.warn("Redis кэш уншихад алдаа гарлаа:", error);
    }
  } else {
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > Date.now()) return entry.value as T;
  }

  const value = await compute();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), "PX", ttlMs);
    } catch (error) {
      console.warn("Redis кэш бичихэд алдаа гарлаа:", error);
    }
  } else {
    memoryCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  return value;
}

/**
 * Агуулга өөрчлөгдмөгц (админ курс/хичээл засах үед) кэшийг шууд хүчингүй
 * болгоно — TTL дуустал хуучин жагсаалт харагдахаас сэргийлнэ.
 */
export async function cacheDelete(key: string): Promise<void> {
  memoryCache.delete(key);

  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.warn("Redis кэш устгахад алдаа гарлаа:", error);
  }
}
