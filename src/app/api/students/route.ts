import { NextResponse } from "next/server";

import { badRequest, forbidden, requireActiveUser, serverError } from "@/lib/api/auth";
import { normalizeInviteCode } from "@/lib/api/inviteCode";
import { rateLimit } from "@/lib/api/rateLimit";
import {
  isLinkRelation,
  linkStudentByCode,
  listLinkedStudents,
} from "@/lib/api/studentLinks";
import { hasRole, isAdminRole } from "@/lib/permissions";
import { today } from "@/lib/tactiq/day";

import type { NextRequest } from "next/server";
import type { LinkRelation } from "@/lib/api/studentLinks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Эцэг эх / багшийн сурагчдын жагсаалт ба холболт.
 *
 * ⚠ `relation`-ыг КЛИЕНТ дамжуулна (`?relation=parent`), сервер нь тухайн
 * хэрэглэгч ТЭР ҮҮРГИЙГ ҮНЭХЭЭР эзэмшдэг эсэхийг `hasRole`-оор шалгана.
 * Клиентээс авч байгаа шалтгаан нь: нэг хүн эцэг эх БА багш хоёулаа байж
 * болох тул (`users.secondaryRole`) сервер өөрөө "аль жагсаалтыг хүсэв"
 * гэдгийг таамаглах боломжгүй — `/parent` ба `/teacher` хуудас өөр өөр
 * жагсаалт харуулна.
 */

/** Хүсэлтийн `relation`-ыг шалгаж, эрхийг нь баталгаажуулна. */
function resolveRelation(
  value: unknown,
  user: { role?: string | null; secondaryRole?: string | null }
): { relation: LinkRelation } | { error: NextResponse } {
  if (!isLinkRelation(value)) return { error: badRequest("Танихгүй үүрэг.") };

  // admin/super нь ХЯНАЛТЫН зорилгоор хоёуланд нь хандана — `Protected`-ийн
  // `allowedRoles`-тай ижил зарчим.
  if (!hasRole(user, value) && !isAdminRole(user.role)) {
    return { error: forbidden("Энэ жагсаалтад хандах эрх танд байхгүй.") };
  }

  return { relation: value };
}

/** GET /api/students?relation=parent|teacher — миний холбогдсон сурагчид. */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  const resolved = resolveRelation(
    request.nextUrl.searchParams.get("relation"),
    caller.user!
  );
  if ("error" in resolved) return resolved.error;

  try {
    return NextResponse.json({
      students: await listLinkedStudents(caller.uid, resolved.relation),
      /*
       * Өнөөдрийн огноог СЕРВЕР хэлнэ (`APP_TIMEZONE`-оор). Клиент өөрөө
       * бодвол хэрэглэгчийн хөтчийн цагийн бүсээр бодох ба `lastActiveDay`
       * нь өөр бүсээр бичигдсэн байдаг тул "өнөөдөр суралцсан" хүүхэд
       * "өчигдөр" гэж харагдана.
       */
      today: today(),
    });
  } catch (error) {
    return serverError(error, "Сурагчдын жагсаалт уншихад алдаа гарлаа");
  }
}

/** POST /api/students — сурагчийн хувийн кодоор холбоно. */
export async function POST(request: NextRequest) {
  /*
   * ⚠ ЭНЭ ХЯЗГААР НЬ ЗААВАЛ. Урилгын код нь 6 тэмдэгт (~1.07 тэрбум
   * хувилбар) — таамаглахад хэцүү ч БОЛОМЖГҮЙ биш, оноход нь ХҮҮХДИЙН
   * ахицын өгөгдөл нээгдэнэ. Хязгааргүй бол автомат скрипт өдөрт сая
   * код туршиж чадна.
   */
  const limited = await rateLimit(request, {
    name: "student-link",
    limit: 10,
    windowMs: 600_000,
  });
  if (limited) return limited;

  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const { caller } = result;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      code?: unknown;
      relation?: unknown;
    };

    const resolved = resolveRelation(body.relation, caller.user!);
    if ("error" in resolved) return resolved.error;

    const code = normalizeInviteCode(body.code);
    if (!code) return badRequest("Кодоо оруулна уу.");

    const outcome = await linkStudentByCode(caller.uid, code, resolved.relation);

    if (!outcome.ok) {
      if (outcome.reason === "self") {
        return badRequest("Өөрийн кодоо оруулж болохгүй.");
      }

      /*
       * "Ийм код байхгүй" ба "код зөв ч сурагч биш" хоёрыг НЭГ ижил
       * мессежээр буцаана — ялгаж хэлбэл код таамаглагчид "энэ код бодитой"
       * гэсэн мэдээлэл алдана.
       *
       * ⚠ Гэхдээ ХОЁР ДАХЬ нөхцөлийг мессежид ил ХЭЛНЭ. Энэ нь юу ч
       * алдахгүй (дүрэм нь кодод байгаа, нууц биш) ч хамгийн түгээмэл
       * бодит шалтгааныг тайлбарлана: багш/эцэг эх/админ эрхтэй дансны
       * код нь хүчинтэй ч ЭНД ажиллахгүй.
       */
      return badRequest(
        "Ийм кодтой СУРАГЧ олдсонгүй. Код зөв эсэх, тэр данс сурагч эрхтэй эсэхийг шалгана уу — багш, эцэг эх, админ эрхтэй дансыг хүүхэд болгон нэмэх боломжгүй."
      );
    }

    return NextResponse.json({
      student: outcome.student,
      alreadyLinked: outcome.alreadyLinked,
    });
  } catch (error) {
    return serverError(error, "Сурагч холбоход алдаа гарлаа");
  }
}
