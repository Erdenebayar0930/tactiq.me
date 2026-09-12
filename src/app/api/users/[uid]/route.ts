import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  badRequest,
  forbidden,
  notFound,
  invalidateCallerCache,
  requireAdmin,
  serverError,
  toActor,
} from "@/lib/api/auth";
import { syncUserClaims } from "@/lib/api/claims";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  asRole,
  canChangeRole,
  canChangeStatus,
  keepsLastSuper,
  type Permission,
  type Target,
  type UserRole,
  type UserStatus,
} from "@/lib/permissions";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const roles = new Set<UserRole>(["super", "admin", "teacher", "parent", "student"]);
const statuses = new Set<UserStatus>(["active", "pending", "blocked"]);

const deny = (permission: Permission) =>
  permission.allowed ? null : forbidden(permission.reason);

/**
 * Хэрэглэгчийн эрх / төлөвийг өөрчилнө (Хяналт → Сурагчид).
 *
 * Бүх шийдвэр `lib/permissions.ts`-д төвлөрсөн — UI дээрх disabled төлөв нь
 * зөвхөн тав тух, жинхэнэ хаалт нь ЭНД. Дүрмүүд:
 *   • эрх олгох — зөвхөн супер админ
 *   • төлөв солих — админ, гэхдээ зөвхөн өөрөөсөө доогуур эрхтэй дээр
 *   • сүүлийн идэвхтэй супер админыг бууруулах / хаах — хориотой
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params;

  const result = await requireAdmin(request);
  if ("error" in result) return result.error;

  const actor = toActor(result.caller);

  try {
    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (!target) return notFound("Ийм хэрэглэгч олдсонгүй.");

    const targetInfo: Target = { uid: target.uid, role: asRole(target.role) };

    const body = await request.json().catch(() => ({}));
    const patch: Partial<typeof users.$inferInsert> = {};

    let nextRole: UserRole | undefined;
    let nextStatus: UserStatus | undefined;

    if (body?.role !== undefined) {
      if (!roles.has(body.role)) return badRequest("Танихгүй эрх.");
      nextRole = body.role as UserRole;

      const blocked = deny(canChangeRole(actor, targetInfo, nextRole));
      if (blocked) return blocked;

      patch.role = nextRole;
    }

    if (body?.status !== undefined) {
      if (!statuses.has(body.status)) return badRequest("Танихгүй төлөв.");
      nextStatus = body.status as UserStatus;

      const blocked = deny(canChangeStatus(actor, targetInfo));
      if (blocked) return blocked;

      patch.status = nextStatus;
    }

    if (Object.keys(patch).length === 0) {
      return badRequest("Өөрчлөх зүйл заагаагүй байна.");
    }

    // Систем эзэнгүй үлдэхээс сэргийлнэ. Тоог өөрчлөлт хийхийн ӨМНӨ уншина.
    const [superCount] = await db
      .select({ total: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, "super"), eq(users.status, "active")));

    const guard = deny(
      keepsLastSuper(targetInfo, Number(superCount?.total ?? 0), {
        nextRole,
        nextStatus,
      })
    );
    if (guard) return guard;

    patch.updatedAt = new Date();
    await db.update(users).set(patch).where(eq(users.uid, uid));

    // Эрх/төлөв өөрчлөгдсөн тул `getCaller`-ийн богино кэш дэх хуучин мөрийг
    // шууд хаяна — эс бөгөөс тухайн хүн хэдэн секунд хуучин эрхээрээ унших
    // боломжтой хэвээр үлдэнэ (`auth.ts`-ийн USER_CACHE_TTL_MS үзнэ үү).
    invalidateCallerCache(uid);

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    // Firebase token доторх хуулбарыг тэр дор нь шинэчилнэ — Storage-ийн
    // дүрэм зөвхөн токеныг хардаг тул хоцровол эрх нь зөрнө.
    await syncUserClaims(uid, {
      role: asRole(updated.role),
      status: (updated.status ?? "active") as UserStatus,
    });

    return NextResponse.json({
      user: {
        uid: updated.uid,
        email: updated.email,
        displayName: updated.displayName,
        role: updated.role,
        status: updated.status,
      },
    });
  } catch (error) {
    return serverError(error, "Хэрэглэгчийг өөрчлөхөд алдаа гарлаа");
  }
}
