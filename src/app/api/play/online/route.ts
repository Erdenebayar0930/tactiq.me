import { count, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { cacheGetOrSet } from "@/lib/api/cache";
import { db } from "@/lib/db";
import { chessQueue, chessRooms } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Хайж байгаа + идэвхтэй тоглолт дунд байгаа тоглогчийн тоо (`/play` лоббид).
 *
 * ⚠ ДАРААЛАЛ мөр хэдэн секундын дараа "хуучирсан" гэж тооцогдоно —
 * таб-аа "Цуцлах"-гүйгээр хааж, эргэж ирдэггүй хэрэглэгчийн мөр хугацаагаар
 * дараалалд ХЭЗЭЭ Ч цэвэрлэгддэггүй тул шүүхгүй бол тоо болзошгүй хэтэрхий
 * өндөр гарна.
 *
 * Идэвхтэй тоглолт ХОЁУЛАА ЯМАГТ өвөрмөц хэрэглэгч тул давхардал шалгах
 * (`DISTINCT`) шаардлагагүй — дараалалд байгаа хэрэглэгч ХЭЗЭЭ Ч зэрэг
 * тоглолтод ороогүй байдаг (`/api/play/queue/join`-ийн логик үүнийг
 * баталгаажуулдаг), тиймээс энгийн НИЙЛБЭР хангалттай.
 */
const QUEUE_STALE_AFTER_MS = 30_000;

/**
 * Энэ тоо БҮХ хэрэглэгчид ЯГ ИЖИЛ — хувийн өгөгдөл огт агуулаагүй тул
 * хуваалцсан кэшэд тавихад аюулгүй (`cache.ts`-ийн анхааруулгыг үзнэ үү).
 *
 * ЯАГААД ЭНЭ ЧУХАЛ ВЭ: лоббид сууж буй хэрэглэгч бүр энэ route-ыг тогтмол
 * polling хийдэг. Кэшгүй үед 500 хүүхэд лоббид байвал секундэд олон зуун
 * `COUNT(*)` асуулга Postgres руу цохино — цөөн холболттой pool тэр
 * дарамтад хамгийн түрүүнд ханадаг. 5 секундын кэштэй бол Postgres руу
 * хандах тоо хэрэглэгчийн тооноос ҮЛ ХАМААРАН секундэд ≤2 болно
 * (Redis байвал бүх PM2 instance-д нийтдээ).
 *
 * 5 секундын хоцролт нь энэ тоонд ач холбогдолгүй — тоглогчийн тоо түүнээс
 * хурдан утга учиртай өөрчлөгддөггүй.
 */
const ONLINE_COUNT_CACHE_KEY = "play:online-count";
const ONLINE_COUNT_TTL_MS = 5_000;

export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const online = await cacheGetOrSet(
      ONLINE_COUNT_CACHE_KEY,
      ONLINE_COUNT_TTL_MS,
      async () => {
        const staleCutoff = new Date(Date.now() - QUEUE_STALE_AFTER_MS);

        const [[searching], [playing]] = await Promise.all([
          db.select({ n: count() }).from(chessQueue).where(gt(chessQueue.joinedAt, staleCutoff)),
          db.select({ n: count() }).from(chessRooms).where(eq(chessRooms.status, "active")),
        ]);

        return searching.n + playing.n * 2;
      }
    );

    return NextResponse.json({ online });
  } catch (error) {
    return serverError(error, "Онлайн тоглогчийн тоог уншихад алдаа гарлаа");
  }
}
