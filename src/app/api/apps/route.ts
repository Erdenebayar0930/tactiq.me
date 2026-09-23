import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { apps } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * «АПП» ЦЭСЭНД ХАРАГДАХ ЖАГСААЛТ.
 *
 * ⚠ ЗӨВХӨН `visible = true`: админ мэдээллийг бүрэн бөглөж, шалгасны
 * дараа л нийтэд гаргана (`drizzle/0057_apps.sql`).
 *
 * ⚠ КЭШЛЭХГҮЙ: админ шинэ апп нэмээд шууд харагдах ёстой.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    const rows = await db
      .select({
        id: apps.id,
        name: apps.name,
        description: apps.description,
        logoUrl: apps.logoUrl,
        url: apps.url,
        kind: apps.kind,
        color: apps.color,
      })
      .from(apps)
      .where(eq(apps.visible, true))
      .orderBy(asc(apps.sortOrder), asc(apps.name))
      .limit(50);

    return NextResponse.json({ apps: rows });
  } catch (error) {
    return serverError(error, "Аппуудын жагсаалт татахад алдаа гарлаа");
  }
}
