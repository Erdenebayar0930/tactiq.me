import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { requireAdmin, serverError } from "@/lib/api/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { displayStreak } from "@/lib/tactiq/day";
import { levelFromXp } from "@/lib/tactiq/xp";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Нэг хуудсанд харуулах хэрэглэгчийн тоо */
const PAGE_SIZE = 25;

/**
 * Хэрэглэгчдийн жагсаалт — зөвхөн админ (Хяналт → Сурагчид).
 *
 * Хайлт, шүүлт, хуудаслалтыг СЕРВЕР талд хийнэ. Бүх мөрийг татаад клиент
 * дээр шүүх нь хэдэн мянган сурагчтай болмогц хөтчийг зогсооно.
 */
export async function GET(request: NextRequest) {
  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100);
  const role = url.searchParams.get("role") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);

  try {
    const filters = [];

    if (query) {
      // `like` дотор `%` ба `_` нь орлуулагч тэмдэг — хэрэглэгчийн бичсэн
      // утгыг escape хийхгүй бол "100%" гэж хайхад бүх мөр буцна.
      const safe = query.replace(/[%_\\]/g, (ch) => `\\${ch}`);
      filters.push(
        or(
          like(users.email, `%${safe}%`),
          like(users.displayName, `%${safe}%`),
          like(users.firstName, `%${safe}%`),
          like(users.lastName, `%${safe}%`)
        )
      );
    }

    if (["super", "admin", "teacher", "parent", "student"].includes(role)) {
      filters.push(eq(users.role, role));
    }
    if (["active", "pending", "blocked"].includes(status)) {
      filters.push(eq(users.status, status));
    }

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [totals]] = await Promise.all([
      db
        .select({
          uid: users.uid,
          email: users.email,
          displayName: users.displayName,
          firstName: users.firstName,
          lastName: users.lastName,
          photoUrl: users.photoUrl,
          xp: users.xp,
          gems: users.gems,
          streakDays: users.streakDays,
          lastActiveDay: users.lastActiveDay,
          streakFreezes: users.streakFreezes,
          role: users.role,
          status: users.status,
          /* ТЕСТЕР туг — админ жагсаалтаас шууд харж, дарж тохируулна. */
          tester: users.tester,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),

      db.select({ total: sql<number>`count(*)` }).from(users).where(where),
    ]);

    const total = Number(totals?.total ?? 0);

    return NextResponse.json({
      users: rows.map((row) => ({
        ...row,
        level: levelFromXp(row.xp),
        streakDays: displayStreak(row.lastActiveDay, row.streakDays, undefined, row.streakFreezes),
      })),
      page,
      pageSize: PAGE_SIZE,
      total,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    return serverError(error, "Хэрэглэгчдийг уншихад алдаа гарлаа");
  }
}
