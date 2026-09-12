import { NextResponse } from "next/server";

import { requireActiveUser, serverError } from "@/lib/api/auth";
import { rateLimit } from "@/lib/api/rateLimit";
import { createTicket } from "@/lib/api/tournamentTicket";
import { tournamentBaseUrl } from "@/lib/tactiq/tournament";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ТЭМЦЭЭНИЙ САЙТ РУУ ШИЛЖИХ — нэг удаагийн тасалбар олгоно.
 *
 * Хэрэглэгч энд нэвтэрсэн байхад тэмцээний сайт дээр ДАХИН нэвтрэх
 * шаардлагагүй байх нь энэ route-ийн цорын ганц зорилго
 * (`lib/api/tournamentTicket.ts`-ийн урсгалыг үзнэ үү).
 *
 * ⚠ Хурдны хязгаартай: тасалбар бүр Firebase custom token болж хувирах
 * эрхтэй тул хязгааргүй үйлдвэрлүүлж болохгүй.
 */
export async function POST(request: NextRequest) {
  const result = await requireActiveUser(request);
  if ("error" in result) return result.error;

  const limited = await rateLimit(request, {
    name: "tournament-session",
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const base = tournamentBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "Тэмцээний систем идэвхгүй байна.", code: "tournament-disabled" },
      { status: 503 }
    );
  }

  try {
    const { caller } = result;
    const ticket = createTicket(caller.uid, caller.email);

    if (!ticket) {
      /*
       * Нууц түлхүүр тохируулаагүй. Тасалбаргүй ч сайт руу нь оруулж
       * БОЛОХГҮЙ — тэнд «та хэн бэ» гэдэг нь тодорхойгүй тул хэрэглэгч
       * хоосон дэлгэц хараад эргэж ирнэ. Тодорхой алдаа өгөх нь дээр.
       */
      return NextResponse.json(
        {
          error: "Тэмцээний холболт тохируулагдаагүй байна.",
          code: "tournament-unconfigured",
        },
        { status: 503 }
      );
    }

    const url = new URL("/auth/handoff", `${base}/`);
    url.searchParams.set("ticket", ticket);

    return NextResponse.json({ url: url.toString() });
  } catch (error) {
    return serverError(error, "Тэмцээний холбоос үүсгэж чадсангүй.");
  }
}
