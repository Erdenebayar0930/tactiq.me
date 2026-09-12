import { and, desc, eq, gte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Хяналтын самбарын статистик (Хяналт → нүүр).
 *
 * ⚠ Зөвхөн `users` хүснэгтээс тооцно — курс/хичээл/дасгалын статистик
 * (идэвх, хамгийн хэцүү дасгал гэх мэт) хуучин схемтэй хамт устгагдсан.
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [[totals], [active], [blocked], [admins], [weeklyActive], recentUsers] =
      await Promise.all([
        db.select({ total: sql<number>`count(*)` }).from(users),
        db
          .select({ total: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.status, "active")),
        db
          .select({ total: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.status, "blocked")),
        db
          .select({ total: sql<number>`count(*)` })
          .from(users)
          .where(sql`${users.role} in ('admin', 'super')`),
        db
          .select({ total: sql<number>`count(*)` })
          .from(users)
          .where(and(eq(users.status, "active"), gte(users.updatedAt, weekAgo))),
        db
          .select({
            uid: users.uid,
            displayName: users.displayName,
            email: users.email,
            xp: users.xp,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(10),
      ]);

    return NextResponse.json({
      users: {
        total: Number(totals?.total ?? 0),
        active: Number(active?.total ?? 0),
        blocked: Number(blocked?.total ?? 0),
        admins: Number(admins?.total ?? 0),
        weeklyActive: Number(weeklyActive?.total ?? 0),
      },
      recentUsers,
    });
  } catch (error) {
    return serverError(error, "Статистик уншихад алдаа гарлаа");
  }
}
