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
/** Курсын каталогийн кэшийн түлхүүр — `/api/courses` уншиж, админ курс/хичээл
 * засах route-ууд бичих (устгах) үед хамтдаа ашиглана. */
export const COURSES_CATALOG_CACHE_KEY = "courses:catalog";

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
