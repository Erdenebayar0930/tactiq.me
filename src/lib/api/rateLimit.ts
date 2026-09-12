import "server-only";

import { NextResponse } from "next/server";

import { getRedis } from "@/lib/redis";

import type { NextRequest } from "next/server";

/**
 * Хурдны хязгаарлагч — Redis байвал ХУВААЛЦСАН, үгүй бол процессын
 * дотоод санах ойд.
 *
 * Firebase Auth нь нэвтрэх оролдлогыг өөрөө хязгаарладаг ч, ТОКЕНТОЙ болсны
 * дараах үйлдлүүд бүрэн хязгааргүй байв. Хамгийн үнэтэй нь:
 *   • /api/export/*        — бүх хүснэгтийг санах ойд Excel болгож барина
 *   • /api/statement/*     — банкны хуулга задлан шинжилнэ
 *   • /api/notifications/send — олон зуун төхөөрөмж рүү push илгээнэ
 *   • /api/auth/register   — бүртгэлийн мөр үүсгэнэ
 * Эдгээрийг давталтаар дуудахад нэг хэрэглэгч серверийг унагаах, эсвэл бүх
 * гишүүн рүү спам мэдэгдэл цацах боломжтой байсан.
 *
 * ⚠ Redis-гүй үед хязгаар нь ПРОЦЕСС бүрд тусдаа. Нэг PM2 процесс (жишээ нь
 * локал хөгжүүлэлт) дээр энэ нь зөв ажиллана. Харин PM2 cluster mode-оор
 * олон instance зэрэг ажиллуулбал (`deploy/ecosystem.config.js`) энэ хязгаар
 * instance-ийн тоогоор үржинэ — тэр үед `REDIS_URL` заавал тохируулна.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Хаягдсан мөрийг цэвэрлэнэ.
 *
 * Түлхүүр нь IP/uid-аар үүсдэг тул цэвэрлэхгүй бол Map нь хязгааргүй ургаж,
 * удаан ажиллах процесст санах ойн алдагдал болно.
 */
function sweep(now: number) {
  if (buckets.size < 5_000) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Дуудагчийг таних түлхүүр.
 *
 * Нэвтэрсэн бол ID token-ы сүүлийн хэсгээр — ижил IP-гийн ард сууж буй хоёр
 * хэрэглэгч бие биеэ хаахгүйн тулд. Токен бүрэн задлах шаардлагагүй: нэг
 * хэрэглэгчийн токен нэг цагийн турш тогтмол байдаг тул түүний хэсэг нь
 * тогтвортой таних тэмдэг болно.
 *
 * ⚠ Прокси/CDN-ий ард x-forwarded-for-ыг хэрэглэгч хуурамчаар илгээж чадна.
 * Тиймээс энэ нь урвуулан ашиглалтыг УДААШРУУЛАХ хэрэгсэл болохоос эрхийн
 * шалгалтыг ОРЛОХГҮЙ — жинхэнэ хамгаалалт нь require* функцүүд.
 */
function callerKey(request: NextRequest): string {
  const token = request.headers.get("authorization");
  if (token?.startsWith("Bearer ")) return `t:${token.slice(-32)}`;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}

export type RateLimitOptions = {
  /** Цонхонд зөвшөөрөх хүсэлтийн тоо */
  limit: number;
  /** Цонхны урт (мс) */
  windowMs: number;
  /** Өөр route-ууд нэг хувингаас идэхээс сэргийлнэ */
  name: string;
};

/**
 * INCR + PEXPIRE-ыг НЭГ атомик алхмаар хийнэ (Lua скрипт) — эс бөгөөс хоёр
 * тусдаа команд хоорондын зайд өрсөлдсөн хүсэлт TTL-ийг дахин дахин
 * сунгаж, цонх хэзээ ч хаагдахгүй "мөнхийн хязгаарлалт" болж болзошгүй.
 * `PEXPIRE key ms NX` (Redis 7+) ашиглахгүй байгаа шалтгаан — Redis 6 дээр
 * ч ажиллах ёстой.
 */
const INCR_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {current, ttl}
`;

function rateLimitInMemory(key: string, limit: number, windowMs: number): number | null {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;

  if (bucket.count <= limit) return null;

  return Math.ceil((bucket.resetAt - now) / 1000);
}

async function rateLimitRedis(
  key: string,
  limit: number,
  windowMs: number
): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return rateLimitInMemory(key, limit, windowMs);

  try {
    const [count, ttlMs] = (await redis.eval(
      INCR_SCRIPT,
      1,
      key,
      windowMs
    )) as [number, number];

    if (count <= limit) return null;
    return Math.ceil(ttlMs / 1000);
  } catch (error) {
    // Redis унтарсан/холбогдохгүй бол хязгаарлалтгүй өнгөрүүлэхээс илүү
    // процессын дотоод санах ой руу ухрах нь аюулгүй — жинхэнэ хамгаалалт
    // тасрахгүй, зөвхөн instance хооронд хуваалцахгүй болно.
    console.warn("Redis хурдны хязгаарлагч алдаатай, санах ой руу ухарлаа:", error);
    return rateLimitInMemory(key, limit, windowMs);
  }
}

/**
 * Хязгаар хэтэрсэн бол 429 хариу, эс бөгөөс `null` буцаана.
 *
 * Хэрэглэх загвар — эрхийн шалгалтын ДАРАА тавина. Ингэснээр нэвтрээгүй
 * хүсэлт хувинг дүүргэж, жинхэнэ хэрэглэгчийг хаах боломжгүй болно:
 *
 *   const result = await requireAdmin(request);
 *   if ("error" in result) return result.error;
 *   const limited = await rateLimit(request, { name: "send", limit: 10, windowMs: 60_000 });
 *   if (limited) return limited;
 */
export async function rateLimit(
  request: NextRequest,
  { limit, windowMs, name }: RateLimitOptions
): Promise<NextResponse | null> {
  const key = `ratelimit:${name}:${callerKey(request)}`;
  const retryAfter = await rateLimitRedis(key, limit, windowMs);

  if (retryAfter === null) return null;

  return NextResponse.json(
    {
      error: `Хэт олон хүсэлт илгээлээ. ${retryAfter} секундын дараа дахин оролдоно уу.`,
      code: "rate-limited",
    },
    {
      status: 429,
      // Клиент хэзээ дахин оролдохыг таамаглахгүйн тулд стандарт толгойгоор
      headers: { "Retry-After": String(retryAfter) },
    }
  );
}
