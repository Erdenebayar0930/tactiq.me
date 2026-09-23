import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { trainingCenters } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * СУРГАЛТЫН ТӨВҮҮДИЙН НИЙТИЙН ЖАГСААЛТ.
 *
 * ⚠ ЗӨВХӨН `visible = true`: админ мэдээллийг бүрэн бөглөж, шалгасны
 * дараа л нийтэд гаргана (`drizzle/0055_training_centers.sql`).
 *
 * ⚠ НЭВТРЭЛТ ШААРДАНА — `/api/coaches`-тай ИЖИЛ шалтгаан: утас, хаягийн
 * жагсаалт нээлттэй байвал автомат хуулагч тэднийг цуглуулна.
 *
 * ⚠ КЭШЛЭХГҮЙ: админ шинэ төв нэмээд шууд харагдах ёстой.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const rows = await db
      .select({
        id: trainingCenters.id,
        name: trainingCenters.name,
        description: trainingCenters.description,
        photoUrl: trainingCenters.photoUrl,
        logoUrl: trainingCenters.logoUrl,
        city: trainingCenters.city,
        address: trainingCenters.address,
        mapUrl: trainingCenters.mapUrl,
        phone: trainingCenters.phone,
        email: trainingCenters.email,
        link: trainingCenters.link,
        teachesChess: trainingCenters.teachesChess,
        teachesDraughts: trainingCenters.teachesDraughts,
      })
      .from(trainingCenters)
      .where(eq(trainingCenters.visible, true))
      .orderBy(asc(trainingCenters.sortOrder), asc(trainingCenters.name))
      .limit(200);

    return NextResponse.json({ centers: rows });
  } catch (error) {
    return serverError(error, "Сургалтын төвүүдийг татахад алдаа гарлаа");
  }
}
