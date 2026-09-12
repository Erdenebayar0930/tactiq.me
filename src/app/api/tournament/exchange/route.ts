import { createHash, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { badRequest, serverError } from "@/lib/api/auth";
import { toPublicUser } from "@/lib/api/publicUser";
import { rateLimit } from "@/lib/api/rateLimit";
import { consumeTicket, tournamentSecretConfigured } from "@/lib/api/tournamentTicket";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createCustomTokenFor } from "@/lib/firebaseAdmin";

import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ТАСАЛБАР → FIREBASE ТОКЕН (server-to-server).
 *
 * Үүнийг ХӨТӨЧ дуудахгүй — ЗӨВХӨН тэмцээний сервер (`chess.daamal.org`)
 * өөрийн нууц түлхүүрээ `x-tournament-secret` толгойд хийж дуудна.
 * Хариуд нь ижил Firebase uid дээр `signInWithCustomToken` хийх токен
 * болон хэрэглэгчийн профайл ирнэ.
 *
 * ⚠ Ингэснээр тэмцээний сервер Postgres, Firebase Admin түлхүүр рүү
 * ХАНДАХГҮЙГЭЭР ажиллана — тусдаа машин дээр, тусдаа масштабтай
 * байрлуулах боломж энэ хилээс л гарна.
 *
 * ⚠ Нууц түлхүүрийг hash-лаад `timingSafeEqual`-аар харьцуулна: түүхий
 * `===` нь эхний зөрөх тэмдэгт дээр зогсдог тул хугацааны хэмжилтээр
 * түлхүүрийг таах цонх үлдээдэг. Hash нь урт ялгаагаар ч мэдээлэл
 * алдахгүй болгоно.
 */
function secretMatches(given: string | null): boolean {
  const expected = process.env.TOURNAMENT_SHARED_SECRET?.trim() || "";
  if (!expected || !given) return false;

  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(given).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  /*
   * Хурдны хязгаарыг нэвтрэлтээс ӨМНӨ тавьлаа — энэ route нь хүчинтэй
   * нууц түлхүүргүйгээр ч дуудагдах боломжтой нээлттэй хил тул түлхүүр
   * таах оролдлогыг тоо ширхгээр нь хаах хэрэгтэй.
   */
  const limited = await rateLimit(request, {
    name: "tournament-exchange",
    limit: 60,
    windowMs: 60_000,
  });
  if (limited) return limited;

  if (!tournamentSecretConfigured()) {
    return NextResponse.json(
      { error: "Тэмцээний холболт тохируулагдаагүй байна.", code: "tournament-unconfigured" },
      { status: 503 }
    );
  }

  if (!secretMatches(request.headers.get("x-tournament-secret"))) {
    return NextResponse.json({ error: "Эрх хүрэлцэхгүй.", code: "forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const ticket = typeof body.ticket === "string" ? body.ticket.trim() : "";
    if (!ticket) return badRequest("Тасалбар алга.");

    const result = await consumeTicket(ticket);
    if ("error" in result) {
      return NextResponse.json(
        { error: "Тасалбар хүчингүй байна.", code: result.error },
        { status: 401 }
      );
    }

    const { uid } = result.payload;

    const [row] = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    if (!row) {
      return NextResponse.json(
        { error: "Бүртгэл олдсонгүй.", code: "no-profile" },
        { status: 404 }
      );
    }
    if (row.status !== "active") {
      return NextResponse.json(
        { error: "Бүртгэл идэвхгүй байна.", code: `account-${row.status}` },
        { status: 403 }
      );
    }

    /*
     * Custom token → тэмцээний сайт `signInWithCustomToken(token)` хийнэ.
     * uid нь ЭНД байгаатай ижил тул хоёр систем нэг хүнийг нэг гэж үзнэ.
     */
    const token = await createCustomTokenFor(uid, { role: row.role, source: "daamal" });

    if (!token) {
      return NextResponse.json(
        {
          error: "Firebase Admin тохиргоо дутуу байна.",
          code: "firebase-unconfigured",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ token, user: toPublicUser(row) });
  } catch (error) {
    return serverError(error, "Тасалбар солиход алдаа гарлаа.");
  }
}
