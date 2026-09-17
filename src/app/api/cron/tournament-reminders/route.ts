import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { sendTournamentReminders } from "@/lib/api/tournamentReminders";
import { serverError } from "@/lib/api/auth";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ТЭМЦЭЭНИЙ САНУУЛГА ИЛГЭЭХ — ГАДНЫ ХУВААРИАС минут тутам дуудагдана.
 *
 * Жишээ (Linux):
 *   * * * * * curl -fsS -H "x-cron-secret: $CRON_SECRET" \
 *       https://daamal.org/api/cron/tournament-reminders
 *
 * ⚠ ХЭРЭГЛЭГЧИЙН НЭВТРЭЛТГҮЙ: энэ нь хүн биш, хуваарь дуудна. Тиймээс
 * НУУЦ ТҮЛХҮҮРЭЭР хамгаална — түлхүүргүй бол хэн ч дуудаж, сурагчдад
 * мэдэгдлийн шуурга илгээх боломжтой болно.
 *
 * ⚠ `timingSafeEqual` — энгийн `===` нь тэмдэгт тус бүрээр зөрөхөд
 * шууд зогсдог тул хариу ирэх ХУГАЦААГААР түлхүүрийг таах боломж
 * онолын хувьд үлдээдэг.
 *
 * ⚠ `CRON_SECRET` тохируулаагүй бол route нь ОГТ ажиллахгүй (503):
 * «түлхүүргүй бол хамгаалалтгүй нээнэ» гэдэг нь хамгийн муу анхдагч.
 */
function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || !header) return false;

  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ error: "CRON_SECRET тохируулаагүй." }, { status: 503 });
  }
  if (!authorized(request.headers.get("x-cron-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await sendTournamentReminders());
  } catch (error) {
    return serverError(error, "Сануулга илгээхэд алдаа гарлаа");
  }
}

/**
 * ⚠ GET ч зөвшөөрнө: олон хуваарийн хэрэгсэл (cron + curl, uptime
 * монитор) анхдагчаар GET илгээдэг бөгөөд «яагаад ажиллахгүй байна»
 * гэж хайх нь цаг үрнэ. Нууц түлхүүр хоёуланд нь шаардлагатай.
 */
export const GET = POST;
