import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { certificatesView } from "@/lib/api/certificates";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/users/me/certificates — дуусгасан курсуудын гэрчилгээ.
 *
 * ⚠ Premium эрхгүй хэрэглэгчид ч ЖАГСААЛТ бүрэн буцна, зөвхөн `premium`
 * туг `false` болно. Дуусгасан курсаа огт харуулахгүй байх нь хийсэн
 * хөдөлмөрийг нь нуух бөгөөд юу авахаа мэдэхгүй хүн Premium авахгүй.
 */
export async function GET(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  try {
    return NextResponse.json(await certificatesView(result.caller.uid));
  } catch (error) {
    return serverError(error, "Гэрчилгээ уншихад алдаа гарлаа");
  }
}
