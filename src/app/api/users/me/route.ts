import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  badRequest,
  getCallerOrResponse,
  requireActiveUser,
  serverError,
  unauthorized,
} from "@/lib/api/auth";
import { describeUserAgent, touchDevice } from "@/lib/api/devices";
import { toPublicUser } from "@/lib/api/publicUser";
import { deleteUpload, isUploadIn } from "@/lib/api/uploads";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { isSelectableCourseSlug } from "@/lib/db/courses";
import { asRole } from "@/lib/permissions";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Нэвтэрсэн хэрэглэгчийн профайл. Бүртгэл байхгүй бол `user: null`.
 *
 * ⚠ Клиентийн `X-Device-Id` толгойг ЭНД шалгана: хэрэглэгч тутамд ЗӨВХӨН
 * `MAX_DEVICES` идэвхтэй төхөөрөмж зөвшөөрнө. Хязгаар хэтэрвэл 403 + `code:
 * "device-limit"` буцаана — сессийг ТАСЛАХГҮЙ (`reasonFromCode` энэ кодыг
 * танихгүй тул `apiFetch` force-sign-out хийхгүй), клиент зөвхөн "аль нэг
 * төхөөрөмжөө хасаад дахин оролдоно уу" дэлгэц харуулна.
 */
export async function GET(request: NextRequest) {
  const result = await getCallerOrResponse(request);
  if ("error" in result) return result.error;

  const { caller } = result;
  if (!caller) return unauthorized();

  // Бүртгэл байхгүй байх нь алдаа БИШ — Firebase дээр данс үүсгээд
  // /api/auth/register рүү хараахан хүрээгүй агшин байж болно. Клиент
  // `user: null` хараад бүртгэлээ гүйцээнэ.
  if (!caller.user) {
    return NextResponse.json({ user: null });
  }

  const deviceId = request.headers.get("x-device-id");

  if (deviceId) {
    const label = describeUserAgent(request.headers.get("user-agent"));
    const touch = await touchDevice(caller.uid, deviceId, label);

    if (!touch.ok) {
      return NextResponse.json(
        {
          error: "Төхөөрөмжийн хязгаарт хүрсэн байна.",
          code: "device-limit",
          devices: touch.devices,
        },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ user: toPublicUser(caller.user) });
}

/** Тэмдэгт мөрийн талбарыг цэвэрлэж, уртаар нь таслана. */
const text = (value: unknown, max: number) =>
  String(value ?? "").trim().slice(0, max);

/**
 * `photoUrl` нь ЗӨВХӨН дуудагчийн өөрийн `profile_photos/{uid}/…` хавтсанд
 * манай серверт байршсан зураг эсэхийг шалгана (`/api/uploads`).
 *
 * Клиент энэ URL-г ХУУРАМЧААР (жишээ нь DevTools-оос PATCH явуулж) дурын
 * өөр хаяг тавьж болохгүй — эс бөгөөс аватар нь бусдын зураг эсвэл гадны
 * зурагт орлож болзошгүй.
 */
function isOwnProfilePhotoUrl(url: string, uid: string): boolean {
  return isUploadIn(url, ["profile_photos", uid]);
}

/**
 * Өөрийн профайл ба тохиргоог шинэчилнэ.
 *
 * ⚠ `role`, `status`, `xp`, `gems`, `streakDays` талбарууд ЭНД
 * ХЭЗЭЭ Ч бичигдэхгүй. Тэдгээрийг өөрөө засах боломжтой байвал хэрэглэгч
 * DevTools-оос PATCH явуулаад өөрийгөө админ болгож, оноогоо тэнгэрт хүргэнэ.
 * Оноо зөвхөн хичээл дуусгах route-оор, эрх зөвхөн админы route-оор өөрчлөгдөнө.
 */
export async function PATCH(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const body = await request.json().catch(() => ({}));
    const patch: Partial<typeof users.$inferInsert> = {};

    if (body.displayName !== undefined) {
      patch.displayName = text(body.displayName, 120);
    }
    if (body.firstName !== undefined) patch.firstName = text(body.firstName, 120);
    if (body.lastName !== undefined) patch.lastName = text(body.lastName, 120);
    if (body.photoUrl !== undefined) {
      const photoUrl = text(body.photoUrl, 1024);
      if (photoUrl && !isOwnProfilePhotoUrl(photoUrl, caller.uid)) {
        return badRequest("Зөвшөөрөгдөөгүй зургийн хаяг.");
      }
      patch.photoUrl = photoUrl;
    }

    if (body.birthYear !== undefined) {
      const year = Number(body.birthYear);
      // Утга учиртай мужаар барина — 0 нь "хэлээгүй" гэсэн үг
      patch.birthYear =
        Number.isInteger(year) && year >= 1950 && year <= 2100 ? year : 0;
    }

    if (body.dailyGoal !== undefined) {
      const goal = Number(body.dailyGoal);
      // 1..20 — өдөрт 20 хичээл гэдэг нь аль хэдийн бодит бус, түүнээс
      // дээшхийг зөвшөөрвөл зорилт хэзээ ч биелэхгүй болж урам хугална.
      patch.dailyGoal = Number.isInteger(goal) ? Math.min(20, Math.max(1, goal)) : 3;
    }

    if (body.language !== undefined) {
      patch.language = body.language === "en" ? "en" : "mn";
    }
    if (body.soundEnabled !== undefined) {
      patch.soundEnabled = Boolean(body.soundEnabled);
    }
    if (body.notificationsEnabled !== undefined) {
      patch.notificationsEnabled = Boolean(body.notificationsEnabled);
    }
    if (body.theme !== undefined) {
      const theme = String(body.theme);
      patch.theme = ["light", "dark", "system"].includes(theme) ? theme : "system";
    }

    /** Хэрэглэгч ХҮССЭН ҮЕДЭЭ курсаа сольж болно — `/courses` хуудаснаас дуудагдана. */
    if (body.activeCourseSlug !== undefined) {
      const slug = String(body.activeCourseSlug);
      if (!(await isSelectableCourseSlug(slug))) {
        return badRequest("Танихгүй эсвэл сонгох боломжгүй курс.");
      }
      patch.activeCourseSlug = slug;
    }

    /**
     * Нэмэлт эрхээ (teacher ↔ parent) ӨӨРӨӨ асаах/унтраах — ЗӨВХӨН тэр хосын
     * НӨГӨӨ тал руу, зөвхөн үндсэн `role` нь тэр хосын нэг гишүүн үед.
     * Бусад талбарын адил энд ч `role`/`status` өөрчлөгдөхгүй — админы
     * route-оор л шийдэгдэнэ (файлын толгой хэсгийн анхааруулгыг үзнэ үү).
     */
    if (body.secondaryRole !== undefined) {
      const primary = asRole(caller.user!.role);

      if (body.secondaryRole === null) {
        patch.secondaryRole = null;
      } else if (body.secondaryRole !== "teacher" && body.secondaryRole !== "parent") {
        return badRequest("Танихгүй нэмэлт эрх.");
      } else if (
        (primary === "parent" && body.secondaryRole === "teacher") ||
        (primary === "teacher" && body.secondaryRole === "parent")
      ) {
        patch.secondaryRole = body.secondaryRole;
      } else {
        return badRequest("Энэ нэмэлт эрхийг өөрөө тохируулах боломжгүй.");
      }
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ user: toPublicUser(caller.user!) });
    }

    patch.updatedAt = new Date();

    await db.update(users).set(patch).where(eq(users.uid, caller.uid));

    /*
     * Хуучин профайл зургийг дискнээс устгана — зөвхөн ӨӨРИЙН хавтсанд
     * байсан бол. Шинэ мөр хадгалагдсаны ДАРАА: бичилт унавал зураг алга
     * болсон профайл үлдэхгүй.
     */
    const previousPhoto = caller.user?.photoUrl ?? "";
    if (
      patch.photoUrl !== undefined &&
      previousPhoto !== patch.photoUrl &&
      isOwnProfilePhotoUrl(previousPhoto, caller.uid)
    ) {
      await deleteUpload(previousPhoto);
    }

    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.uid, caller.uid))
      .limit(1);

    return NextResponse.json({ user: toPublicUser(row) });
  } catch (error) {
    return serverError(error, "Профайл хадгалахад алдаа гарлаа");
  }
}
